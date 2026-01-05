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
 * Parsuje tydzień dostawy z formatu Schuco na datę
 * Format: "KW 03/2026" → Date (poniedziałek tego tygodnia)
 *
 * @param deliveryWeek - tydzień dostawy w formacie Schuco
 * @returns Date lub null jeśli nie można sparsować
 */
export function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) {
    return null;
  }

  // Format: "KW 03/2026" lub "KW3/2026" lub "03/2026" lub "KW  03 / 2026" (extra spaces)
  const match = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\s*\/\s*(\d{4})/i);

  if (!match) {
    return null;
  }

  const week = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

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

    // Znajdź zlecenia pasujące do numerów
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: {
          in: orderNumbers,
        },
      },
    });

    if (orders.length === 0) {
      logger.info(
        `[SchucoOrderMatcher] No matching orders found for ${delivery.orderNumber} (extracted: ${orderNumbers.join(', ')})`
      );
      return 0;
    }

    // Utwórz powiązania
    let linksCreated = 0;
    for (const order of orders) {
      try {
        await this.prisma.orderSchucoLink.upsert({
          where: {
            orderId_schucoDeliveryId: {
              orderId: order.id,
              schucoDeliveryId: schucoDeliveryId,
            },
          },
          create: {
            orderId: order.id,
            schucoDeliveryId: schucoDeliveryId,
            linkedBy: 'auto',
          },
          update: {
            linkedAt: new Date(),
          },
        });
        linksCreated++;
      } catch (error) {
        logger.error(`[SchucoOrderMatcher] Error linking order ${order.orderNumber}:`, error);
      }
    }

    logger.info(
      `[SchucoOrderMatcher] Created ${linksCreated} links for delivery ${delivery.orderNumber}`
    );
    return linksCreated;
  }

  /**
   * Przetwarza wszystkie zamówienia Schuco i tworzy powiązania
   * Używane do początkowej synchronizacji lub naprawy
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

    const deliveries = await this.prisma.schucoDelivery.findMany({
      select: { id: true },
    });

    let processed = 0;
    let linksCreated = 0;
    let warehouseItems = 0;

    for (const delivery of deliveries) {
      const links = await this.processSchucoDelivery(delivery.id);
      processed++;

      if (links > 0) {
        linksCreated += links;
      } else {
        // Sprawdź czy to towar magazynowy
        const updated = await this.prisma.schucoDelivery.findUnique({
          where: { id: delivery.id },
          select: { isWarehouseItem: true },
        });
        if (updated?.isWarehouseItem) {
          warehouseItems++;
        }
      }
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
