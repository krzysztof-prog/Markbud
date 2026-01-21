/**
 * AkrobudVerificationService - Orkiestrator weryfikacji list dostaw Akrobud
 *
 * Serwis odpowiada za:
 * - Tworzenie i zarządzanie listami weryfikacyjnymi (CRUD)
 * - Zarządzanie elementami listy
 * - Orkiestracja procesu weryfikacji
 * - Koordynacja aplikowania zmian
 * - Obsługę projektów (relacja projekt → zlecenia)
 * - Wersjonowanie list weryfikacyjnych
 *
 * Deleguje do:
 * - ProjectMatcher - dopasowywanie projektów do zleceń
 * - VerificationListComparator - porównywanie list z dostawami
 * - VerificationChangeApplier - aplikowanie zmian
 * - VersionComparator - porównywanie wersji list
 * - ProjectNumberParser - parsowanie maili z numerami projektów
 */

import type { PrismaClient } from '@prisma/client';
import { AkrobudVerificationRepository } from '../../repositories/AkrobudVerificationRepository.js';
import { CsvParser } from '../parsers/csv-parser.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import {
  VerificationListComparator,
  type MatchedItem,
  type MissingItem,
  type ExcessItem,
  type NotFoundItem,
  type DuplicateItem,
  type DeliveryOrderItem,
} from './utils/VerificationListComparator.js';
import {
  VerificationChangeApplier,
  type ApplyChangesResult,
} from './utils/VerificationChangeApplier.js';
import {
  parseMailContent,
  type ParsedMailContent,
} from '../parsers/ProjectNumberParser.js';
import {
  findOrdersByProjects,
  type ProjectMatchResult,
  type MatchedOrder,
} from './utils/ProjectMatcher.js';
import {
  compareListVersions,
  type VersionDiff,
} from './utils/VersionComparator.js';

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

// Re-eksport typów dla kompatybilności wstecznej
export type { MatchedItem, MissingItem, ExcessItem, NotFoundItem, DuplicateItem, ApplyChangesResult };

// Re-eksport typów dla projektów i wersjonowania
export type { ParsedMailContent, ProjectMatchResult, MatchedOrder, VersionDiff };

/**
 * Preview projektu - wynik wyszukiwania zleceń przed zapisem
 */
export interface ProjectPreview {
  /** Numer projektu (np. "D3455") */
  projectNumber: string;
  /** Liczba znalezionych zleceń */
  orderCount: number;
  /** Status dopasowania */
  status: 'found' | 'not_found';
  /** Znalezione zlecenia (szczegóły) */
  orders: MatchedOrder[];
}

/**
 * Wynik tworzenia wersji listy
 */
export interface CreateListVersionResult {
  /** ID utworzonej listy */
  listId: number;
  /** Numer wersji */
  version: number;
  /** Data dostawy */
  deliveryDate: Date;
  /** Liczba projektów na liście */
  projectsCount: number;
  /** Liczba powiązanych zleceń */
  ordersCount: number;
  /** ID rodzica (jeśli to nowa wersja) */
  parentId: number | null;
}

/**
 * Informacje o wersji listy
 */
export interface ListVersionInfo {
  /** ID listy */
  id: number;
  /** Numer wersji */
  version: number;
  /** Data dostawy */
  deliveryDate: Date;
  /** Status listy */
  status: string;
  /** Data utworzenia */
  createdAt: Date;
  /** ID rodzica */
  parentId: number | null;
  /** Liczba projektów */
  projectsCount: number;
  /** Liczba zleceń */
  ordersCount: number;
}

// ===================
// Service
// ===================

export class AkrobudVerificationService {
  private repository: AkrobudVerificationRepository;
  private csvParser: CsvParser;
  private listComparator: VerificationListComparator;
  private changeApplier: VerificationChangeApplier;

  constructor(private prisma: PrismaClient) {
    this.repository = new AkrobudVerificationRepository(prisma);
    this.csvParser = new CsvParser();
    this.listComparator = new VerificationListComparator(prisma);
    this.changeApplier = new VerificationChangeApplier(prisma);
  }

  // ===================
  // CRUD Operations
  // ===================

  /**
   * Tworzy nową listę weryfikacyjną
   */
  async createList(deliveryDate: Date, title?: string, notes?: string) {
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
    _inputMode: 'textarea' | 'single'
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
    let nextPosition =
      existingItems.length > 0
        ? Math.max(...existingItems.map((i) => i.position)) + 1
        : 1;

    const itemsToAdd: Array<{
      listId: number;
      orderNumberInput: string;
      orderNumberBase: string | null;
      orderNumberSuffix: string | null;
      position: number;
    }> = [];

    const errors: Array<{ orderNumber: string; reason: string }> = [];

    // Wykryj duplikaty w danych wejściowych
    const duplicates = this.listComparator.findDuplicatesInInput(
      items.map((i, idx) => ({ orderNumber: i.orderNumber, position: idx + 1 }))
    );

    // Przygotuj items do dodania (bez duplikatów - tylko pierwsze wystąpienie)
    const processedOrderNumbers = new Set<string>();

    for (const item of items) {
      const orderNumber = item.orderNumber.trim();

      // Pomiń duplikaty (dodajemy tylko pierwsze wystąpienie)
      if (processedOrderNumbers.has(orderNumber)) {
        continue;
      }
      processedOrderNumbers.add(orderNumber);

      // Pomiń jeśli już istnieje na liście
      const existsOnList = existingItems.some(
        (existingItem) => existingItem.orderNumberInput === orderNumber
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

    const item = list.items.find((i) => i.id === itemId);
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

    // 3. Porównaj listy - delegacja do VerificationListComparator
    const comparisonResult = await this.listComparator.compareListWithDelivery(
      list.items.map((item) => ({
        id: item.id,
        orderNumberInput: item.orderNumberInput,
        orderNumberBase: item.orderNumberBase,
        position: item.position,
      })),
      deliveryOrders
    );

    // 4. Zaktualizuj statusy dopasowania w bazie
    await this.updateMatchStatuses(comparisonResult);

    // 5. Połącz listę z dostawą (jeśli istnieje)
    if (delivery && !list.deliveryId) {
      await this.repository.linkToDelivery(listId, delivery.id);
    }

    // 6. Zaktualizuj status listy
    await this.repository.update(listId, { status: 'verified' });

    // Zbuduj wynik weryfikacji
    const result: VerificationResult = {
      listId: list.id,
      deliveryDate: list.deliveryDate,
      delivery: delivery
        ? {
            id: delivery.id,
            deliveryNumber: delivery.deliveryNumber,
            status: delivery.status,
          }
        : null,
      needsDeliveryCreation,
      matched: comparisonResult.matched,
      missing: comparisonResult.missing,
      excess: comparisonResult.excess,
      notFound: comparisonResult.notFound,
      duplicates: comparisonResult.duplicates,
      summary: comparisonResult.summary,
    };

    return result;
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
      throw new ValidationError(
        'Lista nie jest połączona z dostawą. Najpierw uruchom weryfikację.'
      );
    }

    const deliveryId = list.deliveryId;
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundError('Dostawa');
    }

    logger.info('Aplikowanie zmian weryfikacji', {
      listId,
      deliveryId,
      addMissing,
      removeExcess,
    });

    // Delegacja do VerificationChangeApplier
    const result = await this.changeApplier.applyChanges(
      deliveryId,
      addMissing,
      removeExcess,
      delivery.deliveryNumber ?? undefined,
      { continueOnError: true, verbose: true }
    );

    // Zaktualizuj status listy
    if (result.added.length > 0 || result.removed.length > 0) {
      await this.repository.update(listId, { status: 'applied' });
    }

    logger.info('Zmiany weryfikacji zastosowane', {
      listId,
      added: result.added.length,
      removed: result.removed.length,
      errors: result.errors.length,
    });

    return result;
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
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

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

  // ===================
  // Project-based Operations
  // ===================

  /**
   * Parsuje treść maila i wykrywa datę dostawy oraz numery projektów
   * Deleguje do ProjectNumberParser
   */
  parseMailContentForProjects(rawInput: string): ParsedMailContent {
    logger.debug('Parsowanie treści maila', { inputLength: rawInput.length });
    return parseMailContent(rawInput);
  }

  /**
   * Preview projektów przed zapisem - wyszukuje zlecenia dla każdego projektu
   * Używa ProjectMatcher do optymalizacji (jedno zapytanie do bazy)
   */
  async previewProjects(projects: string[]): Promise<ProjectPreview[]> {
    if (projects.length === 0) {
      return [];
    }

    logger.info('Preview projektów', { count: projects.length });

    // Znajdź zlecenia dla wszystkich projektów naraz
    const matchResults = await findOrdersByProjects(this.prisma, projects, {
      excludeArchived: true,
    });

    // Przekształć wyniki na format ProjectPreview
    const previews: ProjectPreview[] = [];
    for (const project of projects) {
      const result = matchResults.get(project.toUpperCase());
      if (result) {
        previews.push({
          projectNumber: result.projectNumber,
          orderCount: result.orderCount,
          status: result.matchStatus,
          orders: result.matchedOrders,
        });
      } else {
        // Projekt nie znaleziony (nie powinno się zdarzyć, ale dla bezpieczeństwa)
        previews.push({
          projectNumber: project.toUpperCase(),
          orderCount: 0,
          status: 'not_found',
          orders: [],
        });
      }
    }

    logger.info('Preview projektów zakończony', {
      total: previews.length,
      found: previews.filter((p) => p.status === 'found').length,
      notFound: previews.filter((p) => p.status === 'not_found').length,
    });

    return previews;
  }

  /**
   * Tworzy nową wersję listy weryfikacyjnej opartej na projektach
   *
   * Jeśli podano parentId - to jest aktualizacja istniejącej listy,
   * wersja zostanie ustawiona na parent.version + 1
   *
   * Dla każdego projektu:
   * 1. Tworzy AkrobudVerificationItem z projectNumber
   * 2. Zapisuje powiązane zlecenia do VerificationItemOrder
   */
  async createListVersion(
    deliveryDate: Date,
    rawInput: string,
    projects: string[],
    parentId?: number
  ): Promise<CreateListVersionResult> {
    logger.info('Tworzenie nowej wersji listy', {
      deliveryDate,
      projectsCount: projects.length,
      hasParent: !!parentId,
    });

    // Określ numer wersji
    let version = 1;
    if (parentId) {
      const parent = await this.prisma.akrobudVerificationList.findUnique({
        where: { id: parentId },
        select: { version: true },
      });
      if (!parent) {
        throw new NotFoundError('Lista rodzica');
      }
      version = parent.version + 1;
    }

    // Pobierz zlecenia dla wszystkich projektów (przed transakcją)
    const matchResults = await findOrdersByProjects(this.prisma, projects, {
      excludeArchived: true,
    });

    // Transakcja: utwórz listę i wszystkie powiązania
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Utwórz listę
      const list = await tx.akrobudVerificationList.create({
        data: {
          deliveryDate,
          rawInput,
          version,
          parentId: parentId ?? null,
          status: 'draft',
        },
      });

      let totalOrdersCount = 0;

      // 2. Dla każdego projektu utwórz item i powiązania z zleceniami
      for (let position = 0; position < projects.length; position++) {
        const projectNumber = projects[position].toUpperCase();
        const matchResult = matchResults.get(projectNumber);

        // Utwórz item z projectNumber
        const item = await tx.akrobudVerificationItem.create({
          data: {
            listId: list.id,
            orderNumberInput: projectNumber, // Dla kompatybilności wstecznej
            projectNumber,
            position: position + 1,
            matchStatus: matchResult?.matchStatus === 'found' ? 'found' : 'not_found',
          },
        });

        // Jeśli znaleziono zlecenia - utwórz powiązania
        if (matchResult && matchResult.matchedOrders.length > 0) {
          for (const order of matchResult.matchedOrders) {
            await tx.verificationItemOrder.create({
              data: {
                itemId: item.id,
                orderId: order.id,
              },
            });
            totalOrdersCount++;
          }
        }
      }

      return {
        listId: list.id,
        version: list.version,
        deliveryDate: list.deliveryDate,
        projectsCount: projects.length,
        ordersCount: totalOrdersCount,
        parentId: list.parentId,
      };
    });

    logger.info('Utworzono nową wersję listy', {
      listId: result.listId,
      version: result.version,
      projectsCount: result.projectsCount,
      ordersCount: result.ordersCount,
    });

    return result;
  }

  /**
   * Pobiera wszystkie wersje list dla danej daty dostawy
   * Sortowane po version DESC (najnowsze pierwsze)
   */
  async getListVersions(deliveryDate: Date): Promise<ListVersionInfo[]> {
    const startOfDay = new Date(deliveryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(deliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const lists = await this.prisma.akrobudVerificationList.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            matchedOrders: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    return lists.map((list) => ({
      id: list.id,
      version: list.version,
      deliveryDate: list.deliveryDate,
      status: list.status,
      createdAt: list.createdAt,
      parentId: list.parentId,
      projectsCount: list.items.length,
      ordersCount: list.items.reduce(
        (sum, item) => sum + item.matchedOrders.length,
        0
      ),
    }));
  }

  /**
   * Pobiera wszystkie wersje listy na podstawie jej historii (parentId chain)
   */
  async getListVersionHistory(listId: number): Promise<ListVersionInfo[]> {
    // Znajdź wszystkie listy w tej samej "rodzinie" (przez parentId)
    const targetList = await this.prisma.akrobudVerificationList.findUnique({
      where: { id: listId },
      select: { deliveryDate: true },
    });

    if (!targetList) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    // Pobierz wszystkie wersje dla tej daty
    return this.getListVersions(targetList.deliveryDate);
  }

  /**
   * Porównuje dwie wersje listy i zwraca różnice
   */
  async compareVersions(listId1: number, listId2: number): Promise<VersionDiff> {
    // Pobierz obie listy z items
    const [list1, list2] = await Promise.all([
      this.prisma.akrobudVerificationList.findUnique({
        where: { id: listId1 },
        include: {
          items: {
            select: {
              projectNumber: true,
            },
          },
        },
      }),
      this.prisma.akrobudVerificationList.findUnique({
        where: { id: listId2 },
        include: {
          items: {
            select: {
              projectNumber: true,
            },
          },
        },
      }),
    ]);

    if (!list1) {
      throw new NotFoundError('Lista weryfikacyjna 1');
    }
    if (!list2) {
      throw new NotFoundError('Lista weryfikacyjna 2');
    }

    // Konwertuj items na format wymagany przez VersionComparator
    // Filtruj null projectNumbers (starsze listy mogą mieć tylko orderNumberInput)
    const list1Input = {
      version: list1.version,
      items: list1.items
        .filter((item) => item.projectNumber !== null)
        .map((item) => ({
          projectNumber: item.projectNumber!,
        })),
    };

    const list2Input = {
      version: list2.version,
      items: list2.items
        .filter((item) => item.projectNumber !== null)
        .map((item) => ({
          projectNumber: item.projectNumber!,
        })),
    };

    // Zawsze porównuj starszą z nowszą (oldList pierwszy argument)
    const [oldList, newList] = list1.version < list2.version
      ? [list1Input, list2Input]
      : [list2Input, list1Input];

    return compareListVersions(oldList, newList);
  }

  /**
   * Weryfikuje listę opartą na projektach - porównuje z dostawą
   * Dla każdego projektu sprawdza które zlecenia są w dostawie
   */
  async verifyProjectList(
    listId: number,
    createDeliveryIfMissing: boolean = false
  ): Promise<VerificationResult> {
    const list = await this.prisma.akrobudVerificationList.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            matchedOrders: {
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
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundError('Lista weryfikacyjna');
    }

    logger.info('Rozpoczynam weryfikację listy projektów', {
      listId,
      deliveryDate: list.deliveryDate,
      itemsCount: list.items.length,
    });

    // 1. Znajdź dostawę na ten dzień
    let delivery = await this.findDeliveryForDate(list.deliveryDate);
    let needsDeliveryCreation = false;

    if (!delivery && createDeliveryIfMissing) {
      delivery = await this.createDeliveryForDate(list.deliveryDate);
      logger.info('Utworzono nową dostawę', { deliveryId: delivery.id });
    } else if (!delivery) {
      needsDeliveryCreation = true;
    }

    // 2. Pobierz zlecenia z dostawy (jeśli istnieje)
    const deliveryOrders = delivery
      ? await this.getDeliveryOrders(delivery.id)
      : [];

    // Zbiór ID zleceń w dostawie
    const deliveryOrderIds = new Set(deliveryOrders.map((o) => o.order.id));

    // 3. Analiza projektów - które zlecenia są/nie są w dostawie
    const matched: MatchedItem[] = [];
    const missing: MissingItem[] = [];
    const notFound: NotFoundItem[] = [];

    for (const item of list.items) {
      if (item.matchedOrders.length === 0) {
        // Projekt bez zleceń - NotFoundItem nie ma pola 'reason'
        notFound.push({
          itemId: item.id,
          orderNumberInput: item.projectNumber ?? item.orderNumberInput,
          position: item.position,
        });
        continue;
      }

      // Sprawdź każde zlecenie projektu
      for (const orderLink of item.matchedOrders) {
        const order = orderLink.order;
        const isInDelivery = deliveryOrderIds.has(order.id);

        if (isInDelivery) {
          matched.push({
            itemId: item.id,
            orderNumberInput: item.projectNumber ?? item.orderNumberInput,
            orderId: order.id,
            orderNumber: order.orderNumber,
            client: order.client,
            project: order.project,
            position: item.position,
            matchStatus: 'found',
          });
        } else {
          missing.push({
            itemId: item.id,
            orderNumberInput: item.projectNumber ?? item.orderNumberInput,
            orderId: order.id,
            orderNumber: order.orderNumber,
            client: order.client,
            project: order.project,
            position: item.position,
          });
        }
      }
    }

    // 4. Znajdź nadmiarowe zlecenia (są w dostawie, nie ma na liście)
    const listOrderIds = new Set(
      list.items.flatMap((item) =>
        item.matchedOrders.map((o) => o.order.id)
      )
    );

    const excess: ExcessItem[] = deliveryOrders
      .filter((o) => !listOrderIds.has(o.order.id))
      .map((o) => ({
        orderId: o.order.id,
        orderNumber: o.order.orderNumber,
        client: o.order.client,
        project: o.order.project,
        deliveryPosition: o.position,
      }));

    // 5. Połącz listę z dostawą (jeśli istnieje)
    if (delivery && !list.deliveryId) {
      await this.repository.linkToDelivery(listId, delivery.id);
    }

    // 6. Zaktualizuj status listy
    await this.repository.update(listId, { status: 'verified' });

    const result: VerificationResult = {
      listId: list.id,
      deliveryDate: list.deliveryDate,
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
      duplicates: [], // Projekty nie mają duplikatów w tym sensie
      summary: {
        totalItems: list.items.length,
        matchedCount: matched.length,
        missingCount: missing.length,
        excessCount: excess.length,
        notFoundCount: notFound.length,
        duplicatesCount: 0,
      },
    };

    logger.info('Weryfikacja listy projektów zakończona', {
      listId,
      matched: matched.length,
      missing: missing.length,
      excess: excess.length,
      notFound: notFound.length,
    });

    return result;
  }

  // ===================
  // Private Methods - Delivery Operations
  // ===================

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
   * Pobiera zlecenia z dostawy w formacie dla komparatora
   */
  private async getDeliveryOrders(deliveryId: number): Promise<DeliveryOrderItem[]> {
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

  // ===================
  // Private Methods - Match Status Updates
  // ===================

  /**
   * Aktualizuje statusy dopasowania w bazie
   */
  private async updateMatchStatuses(result: {
    matched: MatchedItem[];
    missing: MissingItem[];
    notFound: NotFoundItem[];
  }) {
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
}
