/**
 * AkrobudVerificationService - Logika weryfikacji list dostaw Akrobud
 *
 * Serwis odpowiada za:
 * - Tworzenie i zarządzanie listami weryfikacyjnymi
 * - Parsowanie numerów zleceń (obsługa wariantów)
 * - Porównywanie listy z dostawą
 * - Aplikowanie zmian (dodawanie/usuwanie zleceń z dostawy)
 */

import type { PrismaClient } from '@prisma/client';
import { AkrobudVerificationRepository } from '../../repositories/AkrobudVerificationRepository.js';
import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { CsvParser } from '../parsers/csv-parser.js';
import { DeliveryOrderService } from '../delivery/DeliveryOrderService.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

// ===================
// Types
// ===================

export interface VerificationItemInput {
  orderNumber: string;
}

export interface ParsedOrderNumber {
  base: string;
  suffix: string | null;
  full: string;
}

/**
 * Pojedynczy element dopasowany
 */
export interface MatchedItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
  matchStatus: 'found' | 'variant_match';
}

/**
 * Element brakujący w dostawie (jest na liście klienta, ale nie w dostawie)
 */
export interface MissingItem {
  itemId: number;
  orderNumberInput: string;
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  position: number;
}

/**
 * Element nadmiarowy w dostawie (jest w dostawie, ale nie na liście klienta)
 */
export interface ExcessItem {
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  deliveryPosition: number;
}

/**
 * Element nieznaleziony w systemie
 */
export interface NotFoundItem {
  itemId: number;
  orderNumberInput: string;
  position: number;
}

/**
 * Duplikat na liście
 */
export interface DuplicateItem {
  orderNumber: string;
  positions: number[];
}

/**
 * Wynik weryfikacji listy
 */
export interface VerificationResult {
  listId: number;
  deliveryDate: Date;

  // Dostawa
  delivery: {
    id: number;
    deliveryNumber: string | null;
    status: string;
  } | null;
  needsDeliveryCreation: boolean;

  // Wyniki
  matched: MatchedItem[];
  missing: MissingItem[];
  excess: ExcessItem[];
  notFound: NotFoundItem[];
  duplicates: DuplicateItem[];

  // Podsumowanie
  summary: {
    totalItems: number;
    matchedCount: number;
    missingCount: number;
    excessCount: number;
    notFoundCount: number;
    duplicatesCount: number;
  };
}

/**
 * Wynik aplikowania zmian
 */
export interface ApplyChangesResult {
  added: number[];
  removed: number[];
  errors: Array<{ orderId: number; reason: string }>;
}

// ===================
// Service
// ===================

export class AkrobudVerificationService {
  private repository: AkrobudVerificationRepository;
  private deliveryRepository: DeliveryRepository;
  private deliveryOrderService: DeliveryOrderService;
  private csvParser: CsvParser;

  constructor(private prisma: PrismaClient) {
    this.repository = new AkrobudVerificationRepository(prisma);
    this.deliveryRepository = new DeliveryRepository(prisma);
    this.deliveryOrderService = new DeliveryOrderService(
      this.deliveryRepository,
      prisma
    );
    this.csvParser = new CsvParser();
  }

  // ===================
  // CRUD Operations
  // ===================

  /**
   * Tworzy nową listę weryfikacyjną
   */
  async createList(
    deliveryDate: Date,
    title?: string,
    notes?: string
  ) {
    logger.info('Tworzenie nowej listy weryfikacyjnej', { deliveryDate, title });

    const list = await this.repository.create({
      deliveryDate,
      title: title ?? null,
      notes: notes ?? null,
    });

    return list;
  }

  /**
   * Pobiera listę po ID
   */
  async getList(id: number) {
    const list = await this.repository.findById(id);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }
    return list;
  }

  /**
   * Pobiera wszystkie listy z filtrami
   */
  async getAllLists(filters: { deliveryDate?: Date; status?: string } = {}) {
    return this.repository.findAll(filters);
  }

  /**
   * Aktualizuje listę
   */
  async updateList(
    id: number,
    data: {
      deliveryDate?: Date;
      title?: string | null;
      notes?: string | null;
    }
  ) {
    const list = await this.repository.findById(id);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    return this.repository.update(id, data);
  }

  /**
   * Usuwa listę (soft delete)
   */
  async deleteList(id: number) {
    const list = await this.repository.findById(id);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    return this.repository.softDelete(id);
  }

  // ===================
  // Items Management
  // ===================

  /**
   * Dodaje elementy do listy
   * Parsuje numery zleceń i wykrywa duplikaty
   */
  async addItems(
    listId: number,
    items: VerificationItemInput[],
    inputMode: 'textarea' | 'single'
  ): Promise<{
    added: number;
    duplicates: DuplicateItem[];
    errors: Array<{ orderNumber: string; reason: string }>;
  }> {
    const list = await this.repository.findById(listId);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    // Pobierz istniejące pozycje aby ustalić następną
    const existingItems = await this.repository.getItemsWithOrders(listId);
    let nextPosition = existingItems.length > 0
      ? Math.max(...existingItems.map(i => i.position)) + 1
      : 1;

    const itemsToAdd: Array<{
      listId: number;
      orderNumberInput: string;
      orderNumberBase: string | null;
      orderNumberSuffix: string | null;
      position: number;
    }> = [];

    const duplicates: DuplicateItem[] = [];
    const errors: Array<{ orderNumber: string; reason: string }> = [];

    // Wykryj duplikaty na wejściu
    const orderNumberCounts = new Map<string, number[]>();

    for (let i = 0; i < items.length; i++) {
      const orderNumber = items[i].orderNumber.trim();
      if (!orderNumberCounts.has(orderNumber)) {
        orderNumberCounts.set(orderNumber, []);
      }
      orderNumberCounts.get(orderNumber)!.push(i + 1); // 1-indexed pozycja
    }

    // Znajdź duplikaty
    for (const [orderNumber, positions] of orderNumberCounts.entries()) {
      if (positions.length > 1) {
        duplicates.push({ orderNumber, positions });
      }
    }

    // Przygotuj items do dodania (bez duplikatów - tylko pierwsze wystąpienie)
    const processedOrderNumbers = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const orderNumber = items[i].orderNumber.trim();

      // Pomiń duplikaty (dodajemy tylko pierwsze wystąpienie)
      if (processedOrderNumbers.has(orderNumber)) {
        continue;
      }
      processedOrderNumbers.add(orderNumber);

      // Pomiń jeśli już istnieje na liście
      const existsOnList = existingItems.some(
        item => item.orderNumberInput === orderNumber
      );
      if (existsOnList) {
        errors.push({
          orderNumber,
          reason: 'Już istnieje na liście',
        });
        continue;
      }

      // Parsuj numer zlecenia
      try {
        const parsed = this.csvParser.parseOrderNumber(orderNumber);

        itemsToAdd.push({
          listId,
          orderNumberInput: orderNumber,
          orderNumberBase: parsed.base,
          orderNumberSuffix: parsed.suffix,
          position: nextPosition++,
        });
      } catch (error) {
        errors.push({
          orderNumber,
          reason: error instanceof Error ? error.message : 'Błąd parsowania',
        });
      }
    }

    // Dodaj do bazy
    if (itemsToAdd.length > 0) {
      await this.repository.addItems(itemsToAdd);
    }

    logger.info('Dodano elementy do listy weryfikacyjnej', {
      listId,
      added: itemsToAdd.length,
      duplicates: duplicates.length,
      errors: errors.length,
    });

    return {
      added: itemsToAdd.length,
      duplicates,
      errors,
    };
  }

  /**
   * Usuwa element z listy
   */
  async deleteItem(listId: number, itemId: number) {
    const list = await this.repository.findById(listId);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    const item = list.items.find(i => i.id === itemId);
    if (!item) {
      throw new NotFoundError('Element listy');
    }

    return this.repository.deleteItem(itemId);
  }

  /**
   * Czyści wszystkie elementy z listy
   */
  async clearItems(listId: number) {
    const list = await this.repository.findById(listId);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    return this.repository.clearItems(listId);
  }

  // ===================
  // Verification Logic
  // ===================

  /**
   * Weryfikuje listę - porównuje z dostawą na dany dzień
   */
  async verify(
    listId: number,
    createDeliveryIfMissing: boolean = false
  ): Promise<VerificationResult> {
    const list = await this.repository.findById(listId);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    logger.info('Rozpoczynam weryfikację listy', {
      listId,
      deliveryDate: list.deliveryDate,
      itemsCount: list.items.length,
    });

    // 1. Znajdź dostawę na ten dzień
    let delivery = await this.findDeliveryForDate(list.deliveryDate);
    let needsDeliveryCreation = false;

    if (!delivery && createDeliveryIfMissing) {
      // Utwórz nową dostawę
      delivery = await this.createDeliveryForDate(list.deliveryDate);
      logger.info('Utworzono nową dostawę', { deliveryId: delivery.id });
    } else if (!delivery) {
      needsDeliveryCreation = true;
    }

    // 2. Pobierz zlecenia z dostawy (jeśli istnieje)
    const deliveryOrders = delivery
      ? await this.getDeliveryOrders(delivery.id)
      : [];

    // 3. Porównaj listy
    const result = await this.compareListWithDelivery(
      list,
      delivery,
      deliveryOrders,
      needsDeliveryCreation
    );

    // 4. Zaktualizuj statusy dopasowania w bazie
    await this.updateMatchStatuses(result);

    // 5. Połącz listę z dostawą (jeśli istnieje)
    if (delivery && !list.deliveryId) {
      await this.repository.linkToDelivery(listId, delivery.id);
    }

    // 6. Zaktualizuj status listy
    await this.repository.update(listId, { status: 'verified' });

    return result;
  }

  /**
   * Znajduje dostawę dla daty (z tolerancją na cały dzień)
   */
  private async findDeliveryForDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Zwróć pierwszą (najnowszą) dostawę na ten dzień
    return deliveries[0] ?? null;
  }

  /**
   * Tworzy nową dostawę dla daty
   */
  private async createDeliveryForDate(date: Date) {
    // Generuj numer dostawy
    const deliveryNumber = await this.generateDeliveryNumber(date);

    return this.prisma.delivery.create({
      data: {
        deliveryDate: date,
        deliveryNumber,
        status: 'planned',
      },
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  /**
   * Generuje numer dostawy w formacie D-YYYYMMDD-NNN
   */
  private async generateDeliveryNumber(date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Znajdź ostatni numer na ten dzień
    const lastDelivery = await this.prisma.delivery.findFirst({
      where: {
        deliveryNumber: {
          startsWith: `D-${dateStr}-`,
        },
      },
      orderBy: { deliveryNumber: 'desc' },
    });

    let sequence = 1;
    if (lastDelivery?.deliveryNumber) {
      const match = lastDelivery.deliveryNumber.match(/-(\d{3})$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `D-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Pobiera zlecenia z dostawy
   */
  private async getDeliveryOrders(deliveryId: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryOrders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                client: true,
                project: true,
                status: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    return delivery?.deliveryOrders ?? [];
  }

  /**
   * Porównuje listę weryfikacyjną z dostawą
   */
  private async compareListWithDelivery(
    list: Awaited<ReturnType<typeof this.repository.findById>>,
    delivery: { id: number; deliveryNumber: string | null; status: string } | null,
    deliveryOrders: Array<{
      orderId: number;
      position: number;
      order: {
        id: number;
        orderNumber: string;
        client: string | null;
        project: string | null;
        status: string;
      };
    }>,
    needsDeliveryCreation: boolean
  ): Promise<VerificationResult> {
    const matched: MatchedItem[] = [];
    const missing: MissingItem[] = [];
    const notFound: NotFoundItem[] = [];

    // Zbiór orderIds z dostawy
    const deliveryOrderIds = new Set(deliveryOrders.map(d => d.orderId));
    const deliveryOrderNumbersNormalized = new Map<string, typeof deliveryOrders[0]>();

    for (const d of deliveryOrders) {
      // Normalizuj numer do porównania (bez sufiksu)
      const parsed = this.csvParser.parseOrderNumber(d.order.orderNumber);
      deliveryOrderNumbersNormalized.set(parsed.base, d);
      deliveryOrderNumbersNormalized.set(d.order.orderNumber, d);
    }

    // Zbiór orderIds dopasowanych z listy (do wykrywania excess)
    const matchedOrderIds = new Set<number>();

    // Przetwórz każdy element listy
    for (const item of list!.items) {
      const orderNumberInput = item.orderNumberInput;
      const orderNumberBase = item.orderNumberBase ?? orderNumberInput;

      // Szukaj zlecenia w bazie
      const matchResult = await this.findMatchingOrder(orderNumberInput, orderNumberBase);

      if (!matchResult) {
        // Nie znaleziono w systemie
        notFound.push({
          itemId: item.id,
          orderNumberInput,
          position: item.position,
        });
        continue;
      }

      const { order, matchStatus } = matchResult;
      matchedOrderIds.add(order.id);

      // Sprawdź czy jest w dostawie
      const isInDelivery = deliveryOrderIds.has(order.id);

      if (isInDelivery) {
        // Dopasowane - jest na liście i w dostawie
        matched.push({
          itemId: item.id,
          orderNumberInput,
          orderId: order.id,
          orderNumber: order.orderNumber,
          client: order.client,
          project: order.project,
          position: item.position,
          matchStatus,
        });
      } else {
        // Brakuje w dostawie - jest na liście, ale nie w dostawie
        missing.push({
          itemId: item.id,
          orderNumberInput,
          orderId: order.id,
          orderNumber: order.orderNumber,
          client: order.client,
          project: order.project,
          position: item.position,
        });
      }
    }

    // Znajdź nadmiarowe (są w dostawie, ale nie na liście)
    const excess: ExcessItem[] = [];
    for (const d of deliveryOrders) {
      if (!matchedOrderIds.has(d.orderId)) {
        excess.push({
          orderId: d.orderId,
          orderNumber: d.order.orderNumber,
          client: d.order.client,
          project: d.order.project,
          deliveryPosition: d.position,
        });
      }
    }

    // Wykryj duplikaty na liście (bazując na orderNumberBase)
    const duplicates = this.findDuplicatesOnList(list!.items);

    return {
      listId: list!.id,
      deliveryDate: list!.deliveryDate,
      delivery: delivery
        ? {
            id: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            status: delivery.status,
          }
        : null,
      needsDeliveryCreation,
      matched,
      missing,
      excess,
      notFound,
      duplicates,
      summary: {
        totalItems: list!.items.length,
        matchedCount: matched.length,
        missingCount: missing.length,
        excessCount: excess.length,
        notFoundCount: notFound.length,
        duplicatesCount: duplicates.length,
      },
    };
  }

  /**
   * Szuka dopasowanego zlecenia w bazie
   * Najpierw dokładne dopasowanie, potem po base
   */
  private async findMatchingOrder(
    orderNumberInput: string,
    orderNumberBase: string
  ): Promise<{
    order: { id: number; orderNumber: string; client: string | null; project: string | null };
    matchStatus: 'found' | 'variant_match';
  } | null> {
    // 1. Szukaj dokładnego dopasowania
    const exactMatch = await this.prisma.order.findUnique({
      where: { orderNumber: orderNumberInput },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
    });

    if (exactMatch) {
      return { order: exactMatch, matchStatus: 'found' };
    }

    // 2. Szukaj po bazie (bez sufiksu)
    if (orderNumberBase !== orderNumberInput) {
      const baseMatch = await this.prisma.order.findUnique({
        where: { orderNumber: orderNumberBase },
        select: {
          id: true,
          orderNumber: true,
          client: true,
          project: true,
        },
      });

      if (baseMatch) {
        return { order: baseMatch, matchStatus: 'variant_match' };
      }
    }

    // 3. Szukaj wariantów (np. input="52341" szuka "52341-a", "52341a" itd.)
    const variants = await this.prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { startsWith: `${orderNumberBase}-` } },
          { orderNumber: { startsWith: orderNumberBase, contains: orderNumberBase } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        client: true,
        project: true,
      },
      take: 1,
    });

    if (variants.length > 0) {
      return { order: variants[0], matchStatus: 'variant_match' };
    }

    return null;
  }

  /**
   * Wykrywa duplikaty na liście (po orderNumberBase)
   */
  private findDuplicatesOnList(
    items: Array<{ orderNumberInput: string; orderNumberBase: string | null; position: number }>
  ): DuplicateItem[] {
    const baseToPositions = new Map<string, number[]>();

    for (const item of items) {
      const base = item.orderNumberBase ?? item.orderNumberInput;
      if (!baseToPositions.has(base)) {
        baseToPositions.set(base, []);
      }
      baseToPositions.get(base)!.push(item.position);
    }

    const duplicates: DuplicateItem[] = [];
    for (const [orderNumber, positions] of baseToPositions.entries()) {
      if (positions.length > 1) {
        duplicates.push({ orderNumber, positions });
      }
    }

    return duplicates;
  }

  /**
   * Aktualizuje statusy dopasowania w bazie
   */
  private async updateMatchStatuses(result: VerificationResult) {
    const updates: Array<{
      itemId: number;
      matchStatus: string;
      matchedOrderId: number | null;
    }> = [];

    // Dopasowane
    for (const item of result.matched) {
      updates.push({
        itemId: item.itemId,
        matchStatus: item.matchStatus,
        matchedOrderId: item.orderId,
      });
    }

    // Brakujące (też są dopasowane do zlecenia, tylko nie ma ich w dostawie)
    for (const item of result.missing) {
      updates.push({
        itemId: item.itemId,
        matchStatus: 'found',
        matchedOrderId: item.orderId,
      });
    }

    // Nieznalezione
    for (const item of result.notFound) {
      updates.push({
        itemId: item.itemId,
        matchStatus: 'not_found',
        matchedOrderId: null,
      });
    }

    if (updates.length > 0) {
      await this.repository.batchUpdateMatchStatus(updates);
    }
  }

  // ===================
  // Apply Changes
  // ===================

  /**
   * Aplikuje zmiany - dodaje brakujące i/lub usuwa nadmiarowe zlecenia z dostawy
   */
  async applyChanges(
    listId: number,
    addMissing: number[],
    removeExcess: number[]
  ): Promise<ApplyChangesResult> {
    const list = await this.repository.findById(listId);
    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    if (!list.deliveryId) {
      throw new ValidationError('Lista nie jest połączona z dostawą. Najpierw uruchom weryfikację.');
    }

    const deliveryId = list.deliveryId;
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundError('Dostawa');
    }

    const added: number[] = [];
    const removed: number[] = [];
    const errors: Array<{ orderId: number; reason: string }> = [];

    logger.info('Aplikowanie zmian weryfikacji', {
      listId,
      deliveryId,
      addMissing,
      removeExcess,
    });

    // Dodaj brakujące
    for (const orderId of addMissing) {
      try {
        await this.deliveryOrderService.addOrderToDelivery(
          deliveryId,
          orderId,
          delivery.deliveryNumber ?? undefined
        );
        added.push(orderId);
      } catch (error) {
        errors.push({
          orderId,
          reason: error instanceof Error ? error.message : 'Nieznany błąd',
        });
      }
    }

    // Usuń nadmiarowe
    for (const orderId of removeExcess) {
      try {
        await this.deliveryOrderService.removeOrderFromDelivery(deliveryId, orderId);
        removed.push(orderId);
      } catch (error) {
        errors.push({
          orderId,
          reason: error instanceof Error ? error.message : 'Nieznany błąd',
        });
      }
    }

    // Zaktualizuj status listy
    if (added.length > 0 || removed.length > 0) {
      await this.repository.update(listId, { status: 'applied' });
    }

    logger.info('Zmiany weryfikacji zastosowane', {
      listId,
      added: added.length,
      removed: removed.length,
      errors: errors.length,
    });

    return { added, removed, errors };
  }

  // ===================
  // Text Parsing
  // ===================

  /**
   * Parsuje tekst z textarea na listę numerów zleceń
   * Obsługuje różne separatory: nowa linia, przecinek, średnik, tab
   */
  parseTextareaInput(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Podziel po różnych separatorach
    const parts = text
      .split(/[\n\r,;\t]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Usuń duplikaty zachowując kolejność
    const seen = new Set<string>();
    const result: string[] = [];

    for (const part of parts) {
      if (!seen.has(part)) {
        seen.add(part);
        result.push(part);
      }
    }

    return result;
  }
}
