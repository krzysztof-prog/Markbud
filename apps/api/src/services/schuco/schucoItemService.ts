import { PrismaClient, SchucoDelivery, SchucoOrderItem } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { SchucoOrderItemRow } from './schucoItemParser.js';
import { SchucoItemScraper } from './schucoItemScraper.js';
import { SchucoScraper } from './schucoScraper.js';
import { eventEmitter } from '../event-emitter.js';
import { parseDeliveryWeek } from './schucoOrderMatcher.js';

// Pola które są porównywane przy change tracking
const COMPARABLE_FIELDS: (keyof SchucoOrderItemRow)[] = [
  'shippedQty',
  'orderedQty',
  'deliveryWeek',
  'tracking',
  'comment',
];

// Statusy które oznaczają że zamówienie zostało dostarczone
// Schuco CSV ma zawsze shippedQty=0, więc dla tych statusów ustawiamy shippedQty=orderedQty
const DELIVERED_STATUSES = ['Całkowicie dostarczone', 'Potwierdzona dostawa'];

// Typ dla delivery z opcjonalnym shippingStatus
interface DeliveryToFetch {
  id: number;
  orderNumber: string;
  shippingStatus?: string | null;
}

interface FetchItemsResult {
  totalDeliveries: number;
  processedDeliveries: number;
  newItems: number;
  updatedItems: number;
  unchangedItems: number;
  errors: number;
}

export class SchucoItemService {
  private prisma: PrismaClient;
  private isRunning = false;
  private lastAutoFetchTime: Date | null = null;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Uruchamia scheduler automatycznego pobierania co 45 minut
   */
  startAutoFetchScheduler(): void {
    if (this.schedulerInterval) {
      logger.warn('[SchucoItemService] Scheduler already running');
      return;
    }

    // Co 45 minut (45 * 60 * 1000 = 2700000 ms)
    const intervalMs = 45 * 60 * 1000;

    this.schedulerInterval = setInterval(async () => {
      try {
        await this.autoFetchChangedItems();
      } catch (error) {
        logger.error('[SchucoItemService] Auto-fetch error:', error);
      }
    }, intervalMs);

    logger.info(`[SchucoItemService] Auto-fetch scheduler started (every 45 minutes)`);

    // Uruchom pierwsze sprawdzenie za 5 minut (daj czas na start serwera)
    setTimeout(async () => {
      try {
        await this.autoFetchChangedItems();
      } catch (error) {
        logger.error('[SchucoItemService] Initial auto-fetch error:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Zatrzymuje scheduler
   */
  stopAutoFetchScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info('[SchucoItemService] Auto-fetch scheduler stopped');
    }
  }

  /**
   * Automatyczne pobieranie pozycji dla zmienionych zamówień
   * Wykrywa: nowe zamówienia, zmieniony status, zmieniona data, przypisanie do dostawy
   */
  async autoFetchChangedItems(): Promise<FetchItemsResult | null> {
    if (this.isRunning) {
      logger.info('[SchucoItemService] Skipping auto-fetch - already running');
      return null;
    }

    // CRITICAL: Ustaw flagę PRZED jakimikolwiek operacjami async
    this.isRunning = true;

    const minDate = new Date('2025-10-01');
    const now = new Date();

    logger.info('[SchucoItemService] Starting auto-fetch for changed items...');

    try {
      // 1. Nowe zamówienia (itemsFetchedAt = null)
      const newDeliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          itemsFetchedAt: null,
          archivedAt: null,
          orderDateParsed: { gte: minDate },
        },
        select: { id: true, orderNumber: true, shippingStatus: true },
        take: 50,
      });

      // 2. Zamówienia ze zmienionymi danymi (changeType = 'updated' i changedAt > itemsFetchedAt)
      const updatedDeliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: null,
          orderDateParsed: { gte: minDate },
          changeType: 'updated',
          itemsFetchedAt: { not: null },
          changedAt: { not: null },
          // changedAt > itemsFetchedAt - musimy to sprawdzić ręcznie
        },
        select: { id: true, orderNumber: true, shippingStatus: true, changedAt: true, itemsFetchedAt: true },
        take: 50,
      });

      // Filtruj tylko te gdzie changedAt > itemsFetchedAt
      const needsRefresh = updatedDeliveries.filter((d) => {
        if (!d.changedAt || !d.itemsFetchedAt) return false;
        return d.changedAt > d.itemsFetchedAt;
      });

      // 3. Nowo przypisane do zamówienia (sprawdź OrderSchucoLink)
      const recentLinks = await this.prisma.orderSchucoLink.findMany({
        where: {
          linkedAt: {
            gte: this.lastAutoFetchTime || new Date(Date.now() - 45 * 60 * 1000),
          },
        },
        select: {
          schucoDeliveryId: true,
          schucoDelivery: {
            select: { id: true, orderNumber: true, shippingStatus: true, orderDateParsed: true, archivedAt: true },
          },
        },
        take: 50,
      });

      const linkedDeliveries = recentLinks
        .filter((link) => {
          const sd = link.schucoDelivery;
          return sd && !sd.archivedAt && sd.orderDateParsed && sd.orderDateParsed >= minDate;
        })
        .map((link) => ({
          id: link.schucoDelivery.id,
          orderNumber: link.schucoDelivery.orderNumber,
          shippingStatus: link.schucoDelivery.shippingStatus,
        }));

      // Połącz wszystkie i usuń duplikaty
      const allDeliveries = [...newDeliveries, ...needsRefresh, ...linkedDeliveries];
      const uniqueDeliveries = Array.from(
        new Map(allDeliveries.map((d) => [d.id, d])).values()
      );

      if (uniqueDeliveries.length === 0) {
        logger.info('[SchucoItemService] No deliveries need item refresh');
        this.lastAutoFetchTime = now;
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      logger.info(
        `[SchucoItemService] Auto-fetch found ${uniqueDeliveries.length} deliveries: ` +
        `${newDeliveries.length} new, ${needsRefresh.length} updated, ${linkedDeliveries.length} linked`
      );

      // Pobierz pozycje (maksymalnie 50 na raz)
      const toFetch = uniqueDeliveries.slice(0, 50);
      const result = await this.fetchItemsForDeliveries(toFetch);

      this.lastAutoFetchTime = now;
      return result;
    } catch (error) {
      logger.error('[SchucoItemService] Auto-fetch error:', error);
      throw error;
    } finally {
      // CRITICAL: Zawsze zwalniaj flagę - nawet przy błędzie
      this.isRunning = false;
      logger.info('[SchucoItemService] Auto-fetch completed, isRunning reset to false');
    }
  }

  /**
   * Sprawdza czy pobieranie jest w trakcie
   */
  isItemFetchRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Pobiera pozycje dla zamówień bez itemsFetchedAt (brakujące)
   * @param limit Maksymalna liczba zamówień do przetworzenia
   */
  async fetchMissingItems(limit = 100): Promise<FetchItemsResult> {
    if (this.isRunning) {
      throw new Error('Item fetch already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Pobierz zamówienia bez pobranych pozycji, posortowane od najnowszych
      // Tylko zamówienia od 10.2025 (starsze nie mają sensu)
      const minDate = new Date('2025-10-01');

      const deliveriesWithoutItems = await this.prisma.schucoDelivery.findMany({
        where: {
          itemsFetchedAt: null,
          archivedAt: null, // Pomiń zarchiwizowane
          orderDateParsed: { gte: minDate }, // Tylko od 10.2025
        },
        orderBy: {
          orderDateParsed: 'desc',
        },
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          shippingStatus: true,
        },
      });

      if (deliveriesWithoutItems.length === 0) {
        logger.info('[SchucoItemService] No deliveries without items found');
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      logger.info(`[SchucoItemService] Found ${deliveriesWithoutItems.length} deliveries without items`);

      return await this.fetchItemsForDeliveries(
        deliveriesWithoutItems.map((d) => ({ id: d.id, orderNumber: d.orderNumber, shippingStatus: d.shippingStatus }))
      );
    } finally {
      this.isRunning = false;
      const duration = Date.now() - startTime;
      logger.info(`[SchucoItemService] fetchMissingItems completed in ${duration}ms`);
    }
  }

  /**
   * Pobiera pozycje dla konkretnych zamówień (ID)
   * @param deliveryIds Lista ID zamówień
   */
  async fetchItemsByDeliveryIds(deliveryIds: number[]): Promise<FetchItemsResult> {
    if (this.isRunning) {
      throw new Error('Item fetch already in progress');
    }

    this.isRunning = true;

    try {
      const deliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          id: { in: deliveryIds },
        },
        select: {
          id: true,
          orderNumber: true,
          shippingStatus: true,
        },
      });

      if (deliveries.length === 0) {
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      return await this.fetchItemsForDeliveries(
        deliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber, shippingStatus: d.shippingStatus }))
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Pobiera pozycje dla WSZYSTKICH zamówień (nadpisuje istniejące)
   * UWAGA: To może trwać bardzo długo! Używać tylko gdy potrzebne.
   * @param limit Maksymalna liczba zamówień do przetworzenia (domyślnie 500)
   */
  async fetchAllItems(limit = 500): Promise<FetchItemsResult> {
    if (this.isRunning) {
      throw new Error('Item fetch already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Pobierz wszystkie aktywne zamówienia od 10.2025
      const minDate = new Date('2025-10-01');

      const allDeliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: null,
          orderDateParsed: { gte: minDate },
        },
        orderBy: {
          orderDateParsed: 'desc',
        },
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          shippingStatus: true,
        },
      });

      if (allDeliveries.length === 0) {
        logger.info('[SchucoItemService] No deliveries found for fetchAllItems');
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      logger.info(`[SchucoItemService] fetchAllItems: Processing ${allDeliveries.length} deliveries`);

      return await this.fetchItemsForDeliveries(
        allDeliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber, shippingStatus: d.shippingStatus }))
      );
    } finally {
      this.isRunning = false;
      const duration = Date.now() - startTime;
      logger.info(`[SchucoItemService] fetchAllItems completed in ${duration}ms`);
    }
  }

  /**
   * Pobiera pozycje dla zamówień OD określonej daty (orderDateParsed)
   * @param fromDate Data od której pobierać (włącznie)
   * @param limit Maksymalna liczba zamówień do przetworzenia
   */
  async fetchItemsFromDate(fromDate: Date, limit = 500): Promise<FetchItemsResult> {
    if (this.isRunning) {
      throw new Error('Item fetch already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const deliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: null,
          orderDateParsed: { gte: fromDate },
        },
        orderBy: {
          orderDateParsed: 'desc',
        },
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          shippingStatus: true,
        },
      });

      if (deliveries.length === 0) {
        logger.info(`[SchucoItemService] No deliveries found from date ${fromDate.toISOString()}`);
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      logger.info(
        `[SchucoItemService] fetchItemsFromDate: Processing ${deliveries.length} deliveries from ${fromDate.toISOString()}`
      );

      return await this.fetchItemsForDeliveries(
        deliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber, shippingStatus: d.shippingStatus }))
      );
    } finally {
      this.isRunning = false;
      const duration = Date.now() - startTime;
      logger.info(`[SchucoItemService] fetchItemsFromDate completed in ${duration}ms`);
    }
  }

  /**
   * Zwraca status schedulera i ostatniego auto-fetch
   */
  getSchedulerStatus(): {
    isSchedulerRunning: boolean;
    lastAutoFetchTime: Date | null;
  } {
    return {
      isSchedulerRunning: this.schedulerInterval !== null,
      lastAutoFetchTime: this.lastAutoFetchTime,
    };
  }

  /**
   * Wewnętrzna metoda pobierania pozycji dla listy zamówień
   */
  private async fetchItemsForDeliveries(
    deliveries: DeliveryToFetch[]
  ): Promise<FetchItemsResult> {
    const result: FetchItemsResult = {
      totalDeliveries: deliveries.length,
      processedDeliveries: 0,
      newItems: 0,
      updatedItems: 0,
      unchangedItems: 0,
      errors: 0,
    };

    // Inicjalizuj scraper
    const mainScraper = new SchucoScraper();
    let itemScraper: SchucoItemScraper | null = null;

    try {
      // Emituj start
      eventEmitter.emit('schucoItemFetchStarted', {
        totalDeliveries: deliveries.length,
      });

      // Uruchom scraper i zaloguj się (bez zamykania przeglądarki)
      logger.info('[SchucoItemService] Initializing scraper and logging in...');

      // Użyj dedykowanej metody która loguje i nawiguje do listy zamówień
      // NIE zamyka przeglądarki - pozwala na ponowne użycie page dla item scrapera
      await mainScraper.loginAndNavigateToOrderList();

      // Pobierz page z scrapera (przeglądarka jest otwarta)
      const page = mainScraper.getPage();
      const downloadPath = mainScraper.getDownloadPath();

      if (!page) {
        throw new Error('Could not get page from scraper - browser may have been closed unexpectedly');
      }

      logger.info('[SchucoItemService] Browser session ready, starting item fetch...');

      itemScraper = new SchucoItemScraper(page, downloadPath);

      // Pobierz pozycje dla każdego zamówienia
      for (let i = 0; i < deliveries.length; i++) {
        const delivery = deliveries[i];

        // Emituj postęp
        eventEmitter.emit('schucoItemFetchProgress', {
          current: i + 1,
          total: deliveries.length,
          orderNumber: delivery.orderNumber,
          message: `Pobieranie ${i + 1}/${deliveries.length}: ${delivery.orderNumber}`,
        });

        logger.info(`[SchucoItemService] Processing ${i + 1}/${deliveries.length}: ${delivery.orderNumber}`);

        try {
          const items = await itemScraper.fetchItemsForOrder(delivery.orderNumber);

          if (items && items.length > 0) {
            // Zapisz pozycje z change tracking
            // Przekaż shippingStatus aby ustawić shippedQty=orderedQty dla dostarczonych zamówień
            const storeResult = await this.storeItemsWithChangeTracking(
              delivery.id,
              items,
              delivery.shippingStatus
            );
            result.newItems += storeResult.newItems;
            result.updatedItems += storeResult.updatedItems;
            result.unchangedItems += storeResult.unchangedItems;
            result.processedDeliveries++;

            // Zaktualizuj itemsFetchedAt
            await this.prisma.schucoDelivery.update({
              where: { id: delivery.id },
              data: { itemsFetchedAt: new Date() },
            });

            logger.info(
              `[SchucoItemService] Order ${delivery.orderNumber}: ${storeResult.newItems} new, ${storeResult.updatedItems} updated, ${storeResult.unchangedItems} unchanged`
            );
          } else {
            // Brak pozycji lub błąd
            result.errors++;
            logger.warn(`[SchucoItemService] No items for order ${delivery.orderNumber}`);
          }
        } catch (error) {
          result.errors++;
          logger.error(`[SchucoItemService] Error processing order ${delivery.orderNumber}:`, error);
        }

        // Opóźnienie między zamówieniami (rate limiting)
        if (i < deliveries.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Emituj zakończenie
      eventEmitter.emit('schucoItemFetchCompleted', {
        ...result,
        durationMs: Date.now(),
      });

      return result;
    } catch (error) {
      logger.error('[SchucoItemService] Error in fetchItemsForDeliveries:', error);

      eventEmitter.emit('schucoItemFetchFailed', {
        error: (error as Error).message,
      });

      throw error;
    } finally {
      // Zamknij scraper
      try {
        await mainScraper.close();
      } catch {
        // Ignoruj błąd zamykania
      }
    }
  }

  /**
   * Zapisuje pozycje zamówienia z change tracking
   * @param shippingStatus - status zamówienia, używany do określenia czy ustawić shippedQty=orderedQty
   */
  private async storeItemsWithChangeTracking(
    schucoDeliveryId: number,
    items: SchucoOrderItemRow[],
    shippingStatus?: string | null
  ): Promise<{ newItems: number; updatedItems: number; unchangedItems: number }> {
    const stats = { newItems: 0, updatedItems: 0, unchangedItems: 0 };

    // Sprawdź czy zamówienie jest dostarczone - wtedy ustawiamy shippedQty = orderedQty
    // Schuco CSV zawsze pokazuje shippedQty=0 nawet dla dostarczonych zamówień
    const isDelivered = shippingStatus && DELIVERED_STATUSES.includes(shippingStatus);

    // Pobierz istniejące pozycje
    const existingItems = await this.prisma.schucoOrderItem.findMany({
      where: { schucoDeliveryId },
    });

    const existingByPosition = new Map(existingItems.map((item) => [item.position, item]));

    for (const item of items) {
      const existing = existingByPosition.get(item.position);

      // Dla dostarczonych zamówień ustaw shippedQty = orderedQty
      const effectiveShippedQty = isDelivered ? item.orderedQty : item.shippedQty;

      if (!existing) {
        // Nowa pozycja
        // Parsuj datę dostawy z tygodnia (poniedziałek danego tygodnia)
        const deliveryDate = parseDeliveryWeek(item.deliveryWeek || null);

        await this.prisma.schucoOrderItem.create({
          data: {
            schucoDeliveryId,
            position: item.position,
            articleNumber: item.articleNumber,
            articleDescription: item.articleDescription,
            orderedQty: item.orderedQty,
            shippedQty: effectiveShippedQty,
            unit: item.unit || 'szt.',
            dimensions: item.dimensions || null,
            configuration: item.configuration || null,
            deliveryWeek: item.deliveryWeek || null,
            deliveryDate: deliveryDate,
            tracking: item.tracking || null,
            comment: item.comment || null,
            changeType: 'new',
            changedAt: new Date(),
          },
        });
        stats.newItems++;
      } else {
        // Sprawdź czy są zmiany
        const changes = this.detectChanges(existing, item);

        if (changes.hasChanges || (isDelivered && existing.shippedQty !== effectiveShippedQty)) {
          // Parsuj datę dostawy z tygodnia (poniedziałek danego tygodnia)
          const deliveryDate = parseDeliveryWeek(item.deliveryWeek || null);

          await this.prisma.schucoOrderItem.update({
            where: { id: existing.id },
            data: {
              articleNumber: item.articleNumber,
              articleDescription: item.articleDescription,
              orderedQty: item.orderedQty,
              shippedQty: effectiveShippedQty,
              unit: item.unit || 'szt.',
              dimensions: item.dimensions || null,
              configuration: item.configuration || null,
              deliveryWeek: item.deliveryWeek || null,
              deliveryDate: deliveryDate,
              tracking: item.tracking || null,
              comment: item.comment || null,
              changeType: 'updated',
              changedAt: new Date(),
              changedFields: JSON.stringify(changes.changedFields),
              previousValues: JSON.stringify(changes.previousValues),
            },
          });
          stats.updatedItems++;
        } else {
          // Bez zmian - wyczyść markery zmian jeśli są starsze niż 72h
          if (existing.changeType && existing.changedAt) {
            const hoursSinceChange = (Date.now() - existing.changedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceChange > 72) {
              await this.prisma.schucoOrderItem.update({
                where: { id: existing.id },
                data: {
                  changeType: null,
                  changedAt: null,
                  changedFields: null,
                  previousValues: null,
                },
              });
            }
          }
          stats.unchangedItems++;
        }
      }
    }

    return stats;
  }

  /**
   * Wykrywa zmiany między istniejącą a nową pozycją
   */
  private detectChanges(
    existing: SchucoOrderItem,
    newItem: SchucoOrderItemRow
  ): { hasChanges: boolean; changedFields: string[]; previousValues: Record<string, unknown> } {
    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};

    for (const field of COMPARABLE_FIELDS) {
      const existingValue = existing[field as keyof SchucoOrderItem];
      const newValue = newItem[field];

      // Porównaj wartości (z normalizacją null/undefined/empty string)
      const normalizedExisting = existingValue ?? '';
      const normalizedNew = newValue ?? '';

      if (String(normalizedExisting) !== String(normalizedNew)) {
        changedFields.push(field);
        previousValues[field] = existingValue;
      }
    }

    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      previousValues,
    };
  }

  /**
   * Pobiera pozycje dla zamówienia z bazy
   */
  async getItemsForDelivery(deliveryId: number): Promise<SchucoOrderItem[]> {
    return this.prisma.schucoOrderItem.findMany({
      where: { schucoDeliveryId: deliveryId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Statystyki - ile zamówień ma pozycje, ile brakuje
   */
  async getItemsStats(): Promise<{
    totalDeliveries: number;
    withItems: number;
    withoutItems: number;
    totalItems: number;
  }> {
    const [totalDeliveries, withItems, totalItems] = await Promise.all([
      this.prisma.schucoDelivery.count({
        where: { archivedAt: null },
      }),
      this.prisma.schucoDelivery.count({
        where: {
          archivedAt: null,
          itemsFetchedAt: { not: null },
        },
      }),
      this.prisma.schucoOrderItem.count(),
    ]);

    return {
      totalDeliveries,
      withItems,
      withoutItems: totalDeliveries - withItems,
      totalItems,
    };
  }

  /**
   * Czyści stare markery zmian (starsze niż 72h)
   */
  async clearOldChangeMarkers(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const result = await this.prisma.schucoOrderItem.updateMany({
      where: {
        changeType: { not: null },
        changedAt: { lt: cutoffDate },
      },
      data: {
        changeType: null,
        changedAt: null,
        changedFields: null,
        previousValues: null,
      },
    });

    return result.count;
  }

  /**
   * Odświeża pozycje zamówień które mają stare dane (itemsFetchedAt starsze niż X dni)
   * Używane do okresowego odświeżania - wykrywa zmiany terminów dostawy itp.
   * @param staleDays Ile dni uznajemy za "stare" (domyślnie 1 dzień)
   * @param limit Maksymalna liczba zamówień do przetworzenia
   */
  async refreshStaleItems(staleDays = 1, limit = 50): Promise<FetchItemsResult> {
    if (this.isRunning) {
      throw new Error('Item fetch already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Oblicz datę graniczną - zamówienia z itemsFetchedAt starszym niż staleDays
      const cutoffDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

      // Pobierz zamówienia ze starymi pozycjami
      // Tylko aktywne (niearchiwizowane) i z datą zamówienia od 10.2025
      const minDate = new Date('2025-10-01');

      const staleDeliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: null,
          orderDateParsed: { gte: minDate },
          itemsFetchedAt: {
            not: null,
            lt: cutoffDate,
          },
        },
        orderBy: {
          itemsFetchedAt: 'asc', // Najpierw najstarsze
        },
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          shippingStatus: true,
          itemsFetchedAt: true,
        },
      });

      if (staleDeliveries.length === 0) {
        logger.info(`[SchucoItemService] No stale deliveries found (older than ${staleDays} days)`);
        return {
          totalDeliveries: 0,
          processedDeliveries: 0,
          newItems: 0,
          updatedItems: 0,
          unchangedItems: 0,
          errors: 0,
        };
      }

      logger.info(
        `[SchucoItemService] Found ${staleDeliveries.length} stale deliveries to refresh (older than ${staleDays} days)`
      );

      return await this.fetchItemsForDeliveries(
        staleDeliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber, shippingStatus: d.shippingStatus }))
      );
    } finally {
      this.isRunning = false;
      const duration = Date.now() - startTime;
      logger.info(`[SchucoItemService] refreshStaleItems completed in ${duration}ms`);
    }
  }

  /**
   * Zwraca liczbę zamówień ze starymi pozycjami (do odświeżenia)
   * @param staleDays Ile dni uznajemy za "stare"
   */
  async getStaleItemsCount(staleDays = 1): Promise<number> {
    const cutoffDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const minDate = new Date('2025-10-01');

    return this.prisma.schucoDelivery.count({
      where: {
        archivedAt: null,
        orderDateParsed: { gte: minDate },
        itemsFetchedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
  }
}
