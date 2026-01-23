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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
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
        deliveriesWithoutItems.map((d) => ({ id: d.id, orderNumber: d.orderNumber }))
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
        deliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber }))
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Wewnętrzna metoda pobierania pozycji dla listy zamówień
   */
  private async fetchItemsForDeliveries(
    deliveries: { id: number; orderNumber: string }[]
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
            const storeResult = await this.storeItemsWithChangeTracking(delivery.id, items);
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
   */
  private async storeItemsWithChangeTracking(
    schucoDeliveryId: number,
    items: SchucoOrderItemRow[]
  ): Promise<{ newItems: number; updatedItems: number; unchangedItems: number }> {
    const stats = { newItems: 0, updatedItems: 0, unchangedItems: 0 };

    // Pobierz istniejące pozycje
    const existingItems = await this.prisma.schucoOrderItem.findMany({
      where: { schucoDeliveryId },
    });

    const existingByPosition = new Map(existingItems.map((item) => [item.position, item]));

    for (const item of items) {
      const existing = existingByPosition.get(item.position);

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
            shippedQty: item.shippedQty,
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

        if (changes.hasChanges) {
          // Parsuj datę dostawy z tygodnia (poniedziałek danego tygodnia)
          const deliveryDate = parseDeliveryWeek(item.deliveryWeek || null);

          await this.prisma.schucoOrderItem.update({
            where: { id: existing.id },
            data: {
              articleNumber: item.articleNumber,
              articleDescription: item.articleDescription,
              orderedQty: item.orderedQty,
              shippedQty: item.shippedQty,
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
        staleDeliveries.map((d) => ({ id: d.id, orderNumber: d.orderNumber }))
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
