import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

/**
 * Wyciąga 5-cyfrowe numery zleceń z numeru zamówienia Schuco
 *
 * Formaty obsługiwane:
 * - 23/2026/54255 → ['54255']
 * - 123/2026/54255/54365 → ['54255', '54365']
 * - 456/2027/54251 5463 54855 → ['54251', '54855'] (tylko 5-cyfrowe)
 * - 789/2026/54321 54322 → ['54321', '54322']
 *
 * @param schucoOrderNumber - numer zamówienia Schuco
 * @returns tablica 5-cyfrowych numerów zleceń
 */
export function extractOrderNumbers(schucoOrderNumber: string): string[] {
  if (!schucoOrderNumber) {
    return [];
  }

  // Znajdź wszystkie 5-cyfrowe liczby w tekście
  // Regex: dokładnie 5 cyfr, nie poprzedzone ani nie następowane przez cyfrę
  const fiveDigitPattern = /(?<!\d)\d{5}(?!\d)/g;
  const matches = schucoOrderNumber.match(fiveDigitPattern);

  if (!matches) {
    return [];
  }

  // Usuń duplikaty i zwróć unikalne numery
  return [...new Set(matches)];
}

/**
 * Sprawdza czy zamówienie Schuco jest towarem magazynowym
 * Towar magazynowy = brak 5-cyfrowych numerów zleceń w orderNumber
 *
 * @param schucoOrderNumber - numer zamówienia Schuco
 * @returns true jeśli towar magazynowy
 */
export function isWarehouseItem(schucoOrderNumber: string): boolean {
  const orderNumbers = extractOrderNumbers(schucoOrderNumber);
  return orderNumbers.length === 0;
}

/**
 * Parsuje tydzień dostawy do daty (poniedziałek danego tygodnia)
 * Obsługuje formaty:
 * - "2026/5" lub "2026/05" (rok/tydzień) - główny format w bazie
 * - "KW 03/2026" lub "KW3/2026" (tydzień/rok) - alternatywny format
 *
 * @param deliveryWeek - tydzień dostawy w formacie Schuco
 * @returns Date lub null jeśli nie można sparsować
 */
export function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) {
    return null;
  }

  let week: number;
  let year: number;

  // Format 1: "2026/5" lub "2026/05" (rok/tydzień) - główny format
  const yearWeekMatch = deliveryWeek.match(/^(\d{4})\s*\/\s*(\d{1,2})$/);
  if (yearWeekMatch) {
    year = parseInt(yearWeekMatch[1], 10);
    week = parseInt(yearWeekMatch[2], 10);
  } else {
    // Format 2: "KW 03/2026" lub "KW3/2026" lub "03/2026" (tydzień/rok)
    const kwMatch = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\s*\/\s*(\d{4})/i);
    if (!kwMatch) {
      return null;
    }
    week = parseInt(kwMatch[1], 10);
    year = parseInt(kwMatch[2], 10);
  }

  if (week < 1 || week > 53 || year < 2020 || year > 2100) {
    return null;
  }

  // Oblicz datę pierwszego dnia tygodnia (poniedziałek)
  // ISO week: tydzień 1 zawiera pierwszy czwartek roku
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 0 (niedziela) → 7
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  // Dodaj liczbę tygodni
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);

  return targetDate;
}

/**
 * Agreguje statusy zamówień Schuco - zwraca "najgorszy" status
 * Priorytety (od najgorszego):
 * 1. W realizacji / Otwarte
 * 2. Wysłane / W drodze
 * 3. Dostarczone / Zakończone
 *
 * @param statuses - tablica statusów Schuco
 * @returns zagregowany status
 */
export function aggregateSchucoStatus(statuses: string[]): string {
  if (!statuses || statuses.length === 0) {
    return '';
  }

  // Mapowanie statusów na priorytety (niższy = gorszy)
  const statusPriority: Record<string, number> = {
    // Najgorsze - w trakcie realizacji
    'otwarte': 1,
    'open': 1,
    'w realizacji': 1,
    'in progress': 1,
    'nowe': 1,
    'new': 1,
    'przyjęte': 1,
    'accepted': 1,

    // Średnie - w drodze
    'wysłane': 2,
    'shipped': 2,
    'w drodze': 2,
    'in transit': 2,
    'w dostawie': 2,
    'delivering': 2,

    // Najlepsze - dostarczone
    'dostarczone': 3,
    'delivered': 3,
    'zakończone': 3,
    'completed': 3,
    'zrealizowane': 3,
    'fulfilled': 3,
  };

  let worstStatus = statuses[0];
  if (!worstStatus) {
    return '';
  }
  let worstPriority = statusPriority[worstStatus.toLowerCase()] ?? 0;

  for (const status of statuses) {
    const priority = statusPriority[status.toLowerCase()] ?? 0;
    if (priority < worstPriority || worstPriority === 0) {
      worstPriority = priority;
      worstStatus = status;
    }
  }

  return worstStatus;
}

/**
 * Serwis do powiązywania zamówień Schuco ze zleceniami
 */
export class SchucoOrderMatcher {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Przetwarza zamówienie Schuco i tworzy powiązania ze zleceniami
   * Uses batch operations to avoid N+1 queries
   *
   * @param schucoDeliveryId - ID zamówienia Schuco
   * @returns liczba utworzonych powiązań
   */
  async processSchucoDelivery(schucoDeliveryId: number): Promise<number> {
    const delivery = await this.prisma.schucoDelivery.findUnique({
      where: { id: schucoDeliveryId },
    });

    if (!delivery) {
      logger.warn(`[SchucoOrderMatcher] Delivery ${schucoDeliveryId} not found`);
      return 0;
    }

    const orderNumbers = extractOrderNumbers(delivery.orderNumber);
    const isWarehouse = orderNumbers.length === 0;

    // Aktualizuj zamówienie Schuco
    await this.prisma.schucoDelivery.update({
      where: { id: schucoDeliveryId },
      data: {
        isWarehouseItem: isWarehouse,
        extractedOrderNums: orderNumbers.length > 0 ? JSON.stringify(orderNumbers) : null,
      },
    });

    if (isWarehouse) {
      logger.info(`[SchucoOrderMatcher] Delivery ${delivery.orderNumber} marked as warehouse item`);
      return 0;
    }

    // Batch lookup: znajdź wszystkie zlecenia pasujące do numerów
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: {
          in: orderNumbers,
        },
      },
      select: { id: true, orderNumber: true },
    });

    if (orders.length === 0) {
      logger.info(
        `[SchucoOrderMatcher] No matching orders found for ${delivery.orderNumber} (extracted: ${orderNumbers.join(', ')})`
      );
      return 0;
    }

    // Batch lookup: znajdź istniejące linki aby uniknąć duplikatów
    const existingLinks = await this.prisma.orderSchucoLink.findMany({
      where: {
        schucoDeliveryId: schucoDeliveryId,
        orderId: { in: orders.map((o) => o.id) },
      },
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingLinks.map((l) => l.orderId));

    // Filtruj zamówienia które potrzebują nowych linków
    const ordersNeedingLinks = orders.filter((o) => !existingOrderIds.has(o.id));

    if (ordersNeedingLinks.length === 0) {
      logger.info(
        `[SchucoOrderMatcher] All links already exist for delivery ${delivery.orderNumber}`
      );
      return 0;
    }

    // Batch create: utwórz wszystkie nowe powiązania jednocześnie
    // SQLite nie wspiera skipDuplicates, więc filtrujemy przed insertem
    try {
      await this.prisma.orderSchucoLink.createMany({
        data: ordersNeedingLinks.map((order) => ({
          orderId: order.id,
          schucoDeliveryId: schucoDeliveryId,
          linkedBy: 'auto',
        })),
      });
    } catch (error) {
      logger.error(
        `[SchucoOrderMatcher] Error creating links for delivery ${delivery.orderNumber}: ${error}`
      );
      return 0;
    }

    logger.info(
      `[SchucoOrderMatcher] Created ${ordersNeedingLinks.length} links for delivery ${delivery.orderNumber}`
    );
    return ordersNeedingLinks.length;
  }

  /**
   * Przetwarza wszystkie zamówienia Schuco i tworzy powiązania
   * Używane do początkowej synchronizacji lub naprawy
   * Uses batch operations where possible
   *
   * @returns statystyki przetwarzania
   */
  async processAllDeliveries(): Promise<{
    total: number;
    processed: number;
    linksCreated: number;
    warehouseItems: number;
  }> {
    logger.info('[SchucoOrderMatcher] Processing all Schuco deliveries...');

    // Pobierz wszystkie deliveries z orderNumber (potrzebne do ekstrakcji numerow)
    const deliveries = await this.prisma.schucoDelivery.findMany({
      select: { id: true, orderNumber: true },
    });

    let processed = 0;
    let linksCreated = 0;
    let warehouseItems = 0;

    for (const delivery of deliveries) {
      // Sprawdz czy warehouse item bez dodatkowego query
      const extractedNums = extractOrderNumbers(delivery.orderNumber);
      const isWarehouse = extractedNums.length === 0;

      if (isWarehouse) {
        // Aktualizuj jako warehouse item
        await this.prisma.schucoDelivery.update({
          where: { id: delivery.id },
          data: {
            isWarehouseItem: true,
            extractedOrderNums: null,
          },
        });
        warehouseItems++;
      } else {
        const links = await this.processSchucoDelivery(delivery.id);
        linksCreated += links;
      }
      processed++;
    }

    logger.info(
      `[SchucoOrderMatcher] Processed ${processed} deliveries, created ${linksCreated} links, ${warehouseItems} warehouse items`
    );

    return {
      total: deliveries.length,
      processed,
      linksCreated,
      warehouseItems,
    };
  }

  /**
   * Pobiera powiązane zamówienia Schuco dla zlecenia
   *
   * @param orderId - ID zlecenia
   * @returns lista zamówień Schuco
   */
  async getSchucoDeliveriesForOrder(orderId: number) {
    const links = await this.prisma.orderSchucoLink.findMany({
      where: { orderId },
      include: {
        schucoDelivery: true,
      },
      orderBy: {
        linkedAt: 'desc',
      },
    });

    return links.map((link) => ({
      ...link.schucoDelivery,
      linkedAt: link.linkedAt,
      linkedBy: link.linkedBy,
    }));
  }

  /**
   * Pobiera zagregowany status i datę dostawy dla zlecenia
   *
   * @param orderId - ID zlecenia
   * @returns status i data dostawy
   */
  async getSchucoStatusForOrder(
    orderId: number
  ): Promise<{ status: string | null; deliveryDate: Date | null }> {
    const deliveries = await this.getSchucoDeliveriesForOrder(orderId);

    if (deliveries.length === 0) {
      return { status: null, deliveryDate: null };
    }

    // Agreguj status
    const statuses = deliveries.map((d) => d.shippingStatus);
    const status = aggregateSchucoStatus(statuses);

    // Znajdź najbliższą datę dostawy
    let earliestDate: Date | null = null;
    for (const delivery of deliveries) {
      const date = parseDeliveryWeek(delivery.deliveryWeek);
      if (date && (!earliestDate || date < earliestDate)) {
        earliestDate = date;
      }
    }

    return { status, deliveryDate: earliestDate };
  }

  /**
   * Ręcznie tworzy powiązanie między zleceniem a zamówieniem Schuco
   *
   * @param orderId - ID zlecenia
   * @param schucoDeliveryId - ID zamówienia Schuco
   * @returns utworzone powiązanie
   */
  async createManualLink(orderId: number, schucoDeliveryId: number) {
    return this.prisma.orderSchucoLink.create({
      data: {
        orderId,
        schucoDeliveryId,
        linkedBy: 'manual',
      },
      include: {
        schucoDelivery: true,
        order: true,
      },
    });
  }

  /**
   * Usuwa powiązanie między zleceniem a zamówieniem Schuco
   *
   * @param linkId - ID powiązania
   */
  async deleteLink(linkId: number) {
    return this.prisma.orderSchucoLink.delete({
      where: { id: linkId },
    });
  }

  /**
   * Pobiera zamówienia Schuco bez powiązań (do ręcznego przypisania)
   *
   * @param limit - limit wyników
   * @returns lista niepowiązanych zamówień Schuco
   */
  async getUnlinkedDeliveries(limit = 100) {
    return this.prisma.schucoDelivery.findMany({
      where: {
        isWarehouseItem: false,
        orderLinks: {
          none: {},
        },
      },
      orderBy: {
        orderDateParsed: 'desc',
      },
      take: limit,
    });
  }
}
