import { PrismaClient, SchucoDelivery } from '@prisma/client';
import { SchucoScraper } from './schucoScraper.js';
import { SchucoParser, SchucoDeliveryRow } from './schucoParser.js';
import { SchucoOrderMatcher, extractOrderNumbers, isWarehouseItem, parseDeliveryWeek } from './schucoOrderMatcher.js';
import { logger } from '../../utils/logger.js';
import { withRetry } from '../../utils/prisma.js';
import {
  emitSchucoFetchStarted,
  emitSchucoFetchProgress,
  emitSchucoFetchCompleted,
  emitSchucoFetchFailed,
} from '../event-emitter.js';

// Fields to compare for change detection (excluding metadata fields)
const COMPARABLE_FIELDS = [
  'shippingStatus',
  'deliveryWeek',
  'deliveryType',
  'tracking',
  'complaint',
  'orderType',
  'totalAmount',
] as const;

interface ChangeStats {
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
}

interface FetchResult {
  success: boolean;
  recordsCount: number;
  newRecords?: number;
  updatedRecords?: number;
  unchangedRecords?: number;
  errorMessage?: string;
  durationMs: number;
}

export class SchucoService {
  private prisma: PrismaClient;
  private parser: SchucoParser;
  private orderMatcher: SchucoOrderMatcher;

  // Aktywny scraper do możliwości anulowania
  private activeScraper: SchucoScraper | null = null;
  private activeLogId: number | null = null;
  private isCancelling: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.parser = new SchucoParser();
    this.orderMatcher = new SchucoOrderMatcher(prisma);
  }

  /**
   * Anuluj aktywne pobieranie danych
   * Zamyka przeglądarkę i oznacza log jako error
   */
  async cancelFetch(): Promise<{ cancelled: boolean; message: string }> {
    if (!this.activeScraper || !this.activeLogId) {
      return { cancelled: false, message: 'Brak aktywnego importu do anulowania' };
    }

    if (this.isCancelling) {
      return { cancelled: false, message: 'Anulowanie już w toku' };
    }

    try {
      this.isCancelling = true;
      logger.info('[SchucoService] Cancelling active fetch...');

      // Zamknij przeglądarkę
      await this.activeScraper.close();

      // Oznacz log jako error z informacją o anulowaniu
      await this.prisma.schucoFetchLog.update({
        where: { id: this.activeLogId },
        data: {
          status: 'error',
          errorMessage: 'Import anulowany przez użytkownika',
          completedAt: new Date(),
        },
      });

      // Emit event o anulowaniu
      emitSchucoFetchFailed({
        logId: this.activeLogId,
        errorMessage: 'Import anulowany przez użytkownika',
        durationMs: 0,
        message: 'Import został anulowany',
      });

      logger.info('[SchucoService] Fetch cancelled successfully');

      // Reset state
      this.activeScraper = null;
      this.activeLogId = null;
      this.isCancelling = false;

      return { cancelled: true, message: 'Import został anulowany' };
    } catch (error) {
      logger.error('[SchucoService] Error cancelling fetch:', error);
      this.isCancelling = false;
      return { cancelled: false, message: `Błąd anulowania: ${(error as Error).message}` };
    }
  }

  /**
   * Sprawdź czy jest aktywny import
   */
  isImportRunning(): boolean {
    return this.activeScraper !== null && !this.isCancelling;
  }

  /**
   * Pobierz ustawienie liczby dni dla filtra Schuco z bazy
   * Domyślnie 15 dni (zmniejszono z 90 - zbyt dużo danych do pobrania)
   */
  private async getFilterDaysSetting(): Promise<number> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'schuco_filter_days' },
      });
      if (setting?.value) {
        const days = parseInt(setting.value, 10);
        if (!isNaN(days) && days > 0) {
          return days;
        }
      }
    } catch {
      logger.warn('[SchucoService] Failed to get schuco_filter_days setting, using default');
    }
    return 15; // Domyślna wartość (zmniejszono z 90 - zbyt dużo danych)
  }

  /**
   * Pobierz ustawienie konkretnej daty filtra Schuco z bazy
   * Zwraca null jeśli nie ustawiono (wtedy użyjemy filterDays)
   */
  private async getFilterDateSetting(): Promise<string | null> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'schuco_filter_date' },
      });
      if (setting?.value) {
        // Walidacja formatu YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(setting.value)) {
          return setting.value;
        }
      }
    } catch {
      logger.warn('[SchucoService] Failed to get schuco_filter_date setting');
    }
    return null;
  }

  /**
   * Fetch and store Schuco deliveries with change tracking
   */
  async fetchAndStoreDeliveries(
    headless: boolean = true,
    triggerType: 'manual' | 'scheduled' = 'manual'
  ): Promise<FetchResult> {
    // Sprawdź czy nie ma już aktywnego importu
    if (this.isImportRunning()) {
      return {
        success: false,
        recordsCount: 0,
        errorMessage: 'Import już w toku. Anuluj poprzedni import lub poczekaj na jego zakończenie.',
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const logId = await this.createFetchLog('pending', triggerType);
    this.activeLogId = logId;

    try {
      // Pobierz ustawienia filtra z bazy - filterDate ma priorytet nad filterDays
      const filterDays = await this.getFilterDaysSetting();
      const filterDate = await this.getFilterDateSetting();

      const filterInfo = filterDate
        ? `filterDate: ${filterDate}`
        : `filterDays: ${filterDays}`;
      logger.info(`[SchucoService] Starting fetch process (trigger: ${triggerType}, headless: ${headless}, ${filterInfo})...`);

      // Emit start event - frontend może zaktualizować UI
      emitSchucoFetchStarted({
        logId,
        triggerType,
        filterDays,
        filterDate: filterDate || undefined,
        step: 'started',
        message: 'Rozpoczęto pobieranie danych Schuco',
      });

      // Step 1: Clear old change markers (older than 24 hours)
      await this.clearOldChangeMarkers();

      // Step 2: Scrape website and download CSV - create scraper with headless setting and filter
      emitSchucoFetchProgress({
        logId,
        step: 'scraping',
        message: 'Pobieranie danych ze strony Schuco...',
        progress: 10,
      });

      // filterDate ma priorytet nad filterDays
      const scraper = new SchucoScraper({
        headless,
        filterDays,
        filterDate: filterDate || undefined,
      });
      this.activeScraper = scraper; // Zapisz referencję do możliwości anulowania
      const csvFilePath = await scraper.scrapeDeliveries();

      // Step 3: Parse CSV file
      emitSchucoFetchProgress({
        logId,
        step: 'parsing',
        message: 'Parsowanie pliku CSV...',
        progress: 50,
      });

      const deliveries = await this.parser.parseCSV(csvFilePath);
      logger.info(`[SchucoService] Parsed ${deliveries.length} deliveries`);

      // Step 4: Store in database with change tracking
      emitSchucoFetchProgress({
        logId,
        step: 'storing',
        message: `Zapisywanie ${deliveries.length} rekordów do bazy...`,
        progress: 70,
        recordsCount: deliveries.length,
      });

      const changeStats = await this.storeDeliveriesWithChangeTracking(deliveries);

      // Step 5: Update log with stats
      const durationMs = Date.now() - startTime;
      await this.updateFetchLog(logId, 'success', deliveries.length, null, durationMs, changeStats);

      logger.info(
        `[SchucoService] Fetch completed. Records: ${deliveries.length}, ` +
          `New: ${changeStats.newRecords}, Updated: ${changeStats.updatedRecords}, ` +
          `Unchanged: ${changeStats.unchangedRecords}`
      );

      // Emit completion event
      emitSchucoFetchCompleted({
        logId,
        recordsCount: deliveries.length,
        newRecords: changeStats.newRecords,
        updatedRecords: changeStats.updatedRecords,
        unchangedRecords: changeStats.unchangedRecords,
        durationMs,
        message: `Pobrano ${deliveries.length} rekordów (nowe: ${changeStats.newRecords}, zmienione: ${changeStats.updatedRecords})`,
      });

      // Reset state po zakończeniu
      this.activeScraper = null;
      this.activeLogId = null;

      return {
        success: true,
        recordsCount: deliveries.length,
        newRecords: changeStats.newRecords,
        updatedRecords: changeStats.updatedRecords,
        unchangedRecords: changeStats.unchangedRecords,
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const durationMs = Date.now() - startTime;

      logger.error('[SchucoService] Fetch failed:', error);

      // Emit failure event
      emitSchucoFetchFailed({
        logId,
        errorMessage,
        durationMs,
        message: `Błąd pobierania: ${errorMessage}`,
      });

      await this.updateFetchLog(logId, 'error', 0, errorMessage, durationMs);

      // Reset state po błędzie
      this.activeScraper = null;
      this.activeLogId = null;

      return {
        success: false,
        recordsCount: 0,
        errorMessage,
        durationMs,
      };
    }
  }

  /**
   * Clear change markers older than 72 hours
   */
  private async clearOldChangeMarkers(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);

    const result = await this.prisma.schucoDelivery.updateMany({
      where: {
        changedAt: {
          lt: threeDaysAgo,
        },
        changeType: {
          not: null,
        },
      },
      data: {
        changeType: null,
        changedAt: null,
        changedFields: null,
        previousValues: null,
      },
    });

    if (result.count > 0) {
      logger.info(`[SchucoService] Cleared ${result.count} old change markers (>72h)`);
    }
  }

  /**
   * Compare two delivery records and return changed fields
   */
  private compareDeliveries(
    existing: SchucoDelivery,
    newData: SchucoDeliveryRow
  ): { changedFields: string[]; previousValues: Record<string, string | null> } | null {
    const changedFields: string[] = [];
    const previousValues: Record<string, string | null> = {};

    for (const field of COMPARABLE_FIELDS) {
      const existingValue = existing[field];
      const newValue = newData[field] || null;

      // Normalize empty strings to null for comparison
      const normalizedExisting = existingValue === '' ? null : existingValue;
      const normalizedNew = newValue === '' ? null : newValue;

      if (normalizedExisting !== normalizedNew) {
        changedFields.push(field);
        previousValues[field] = normalizedExisting;
      }
    }

    return changedFields.length > 0 ? { changedFields, previousValues } : null;
  }

  /**
   * Store deliveries with change tracking - OPTIMIZED with batches
   * Używa transakcji i batch operations dla znacznego przyspieszenia
   */
  private async storeDeliveriesWithChangeTracking(deliveries: SchucoDeliveryRow[]): Promise<ChangeStats> {
    const totalCount = deliveries.length;
    logger.info(`[SchucoService] Storing ${totalCount} deliveries with change tracking (batch mode)...`);

    const stats: ChangeStats = {
      newRecords: 0,
      updatedRecords: 0,
      unchangedRecords: 0,
    };

    // Step 1: Get all existing deliveries by order number for comparison
    const orderNumbers = deliveries.map((d) => d.orderNumber);
    const existingDeliveries = await this.prisma.schucoDelivery.findMany({
      where: {
        orderNumber: { in: orderNumbers },
      },
    });
    const existingMap = new Map(existingDeliveries.map((d) => [d.orderNumber, d]));
    logger.info(`[SchucoService] Found ${existingDeliveries.length} existing records to compare`);

    const now = new Date();

    // Step 2: Categorize deliveries into new, updated, unchanged
    interface ProcessedDelivery {
      delivery: SchucoDeliveryRow;
      orderDateParsed: Date | null;
      extractedNums: string[];
      isWarehouse: boolean;
      existing?: typeof existingDeliveries[0];
      changes?: { changedFields: string[]; previousValues: Record<string, string | null> } | null;
      shouldKeepNewStatus?: boolean;
    }

    const newDeliveries: ProcessedDelivery[] = [];
    const updatedDeliveries: ProcessedDelivery[] = [];
    const unchangedDeliveries: ProcessedDelivery[] = [];

    for (const delivery of deliveries) {
      const existing = existingMap.get(delivery.orderNumber);
      const orderDateParsed = this.parser.parseDate(delivery.orderDate);
      const extractedNums = extractOrderNumbers(delivery.orderNumber);
      const isWarehouse = isWarehouseItem(delivery.orderNumber);

      const processed: ProcessedDelivery = {
        delivery,
        orderDateParsed,
        extractedNums,
        isWarehouse,
        existing,
      };

      if (!existing) {
        newDeliveries.push(processed);
      } else {
        const changes = this.compareDeliveries(existing, delivery);
        processed.changes = changes;
        processed.shouldKeepNewStatus = existing.changeType === 'new';

        if (changes) {
          updatedDeliveries.push(processed);
        } else {
          unchangedDeliveries.push(processed);
        }
      }
    }

    logger.info(`[SchucoService] Categorized: ${newDeliveries.length} new, ${updatedDeliveries.length} updated, ${unchangedDeliveries.length} unchanged`);

    // Step 3: Process in batches using transaction
    const BATCH_SIZE = 50; // SQLite works better with smaller batches

    // Process NEW deliveries in batches
    if (newDeliveries.length > 0) {
      logger.info(`[SchucoService] Processing ${newDeliveries.length} new deliveries...`);

      for (let i = 0; i < newDeliveries.length; i += BATCH_SIZE) {
        const batch = newDeliveries.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(async (tx) => {
          for (const item of batch) {
            const { delivery, orderDateParsed, extractedNums, isWarehouse } = item;

            // Parsuj datę dostawy z tygodnia (poniedziałek danego tygodnia)
            const deliveryDate = parseDeliveryWeek(delivery.deliveryWeek || null);

            const created = await tx.schucoDelivery.upsert({
              where: { orderNumber: delivery.orderNumber },
              create: {
                orderDate: delivery.orderDate,
                orderDateParsed: orderDateParsed,
                orderNumber: delivery.orderNumber,
                projectNumber: delivery.projectNumber,
                orderName: delivery.orderName,
                shippingStatus: delivery.shippingStatus,
                deliveryWeek: delivery.deliveryWeek || null,
                deliveryDate: deliveryDate,
                deliveryType: delivery.deliveryType || null,
                tracking: delivery.tracking || null,
                complaint: delivery.complaint || null,
                orderType: delivery.orderType || null,
                totalAmount: delivery.totalAmount || null,
                rawData: JSON.stringify(delivery.rawData),
                changeType: 'new',
                changedAt: now,
                changedFields: null,
                previousValues: null,
                isWarehouseItem: isWarehouse,
                extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
              },
              update: {
                orderDate: delivery.orderDate,
                orderDateParsed: orderDateParsed,
                projectNumber: delivery.projectNumber,
                orderName: delivery.orderName,
                shippingStatus: delivery.shippingStatus,
                deliveryWeek: delivery.deliveryWeek || null,
                deliveryDate: deliveryDate,
                deliveryType: delivery.deliveryType || null,
                tracking: delivery.tracking || null,
                complaint: delivery.complaint || null,
                orderType: delivery.orderType || null,
                totalAmount: delivery.totalAmount || null,
                rawData: JSON.stringify(delivery.rawData),
                updatedAt: now,
                isWarehouseItem: isWarehouse,
                extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
              },
            });

            // Store ID for order links creation
            item.existing = created as typeof existingDeliveries[0];
          }
        }, { timeout: 120000 }); // 120s timeout dla batch operacji (SQLite może być wolny)

        // Log progress
        const processed = Math.min(i + BATCH_SIZE, newDeliveries.length);
        logger.info(`[SchucoService] New: ${processed}/${newDeliveries.length} (${Math.round(processed/newDeliveries.length*100)}%)`);
      }
      stats.newRecords = newDeliveries.length;
    }

    // Process UPDATED deliveries in batches
    if (updatedDeliveries.length > 0) {
      logger.info(`[SchucoService] Processing ${updatedDeliveries.length} updated deliveries...`);

      for (let i = 0; i < updatedDeliveries.length; i += BATCH_SIZE) {
        const batch = updatedDeliveries.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(async (tx) => {
          for (const item of batch) {
            const { delivery, orderDateParsed, extractedNums, isWarehouse, existing, changes, shouldKeepNewStatus } = item;

            // Parsuj datę dostawy z tygodnia (poniedziałek danego tygodnia)
            const deliveryDate = parseDeliveryWeek(delivery.deliveryWeek || null);

            await tx.schucoDelivery.update({
              where: { id: existing!.id },
              data: {
                orderDate: delivery.orderDate,
                orderDateParsed: orderDateParsed,
                projectNumber: delivery.projectNumber,
                orderName: delivery.orderName,
                shippingStatus: delivery.shippingStatus,
                deliveryWeek: delivery.deliveryWeek || null,
                deliveryDate: deliveryDate,
                deliveryType: delivery.deliveryType || null,
                tracking: delivery.tracking || null,
                complaint: delivery.complaint || null,
                orderType: delivery.orderType || null,
                totalAmount: delivery.totalAmount || null,
                rawData: JSON.stringify(delivery.rawData),
                changeType: shouldKeepNewStatus ? 'new' : 'updated',
                changedAt: shouldKeepNewStatus ? existing!.changedAt : now,
                changedFields: shouldKeepNewStatus ? existing!.changedFields : JSON.stringify(changes!.changedFields),
                previousValues: shouldKeepNewStatus ? existing!.previousValues : JSON.stringify(changes!.previousValues),
                updatedAt: now,
                isWarehouseItem: isWarehouse,
                extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
              },
            });

            if (shouldKeepNewStatus) {
              stats.newRecords++;
            } else {
              stats.updatedRecords++;
            }
          }
        }, { timeout: 120000 }); // 120s timeout dla batch operacji (SQLite może być wolny)

        // Log progress
        const processed = Math.min(i + BATCH_SIZE, updatedDeliveries.length);
        logger.info(`[SchucoService] Updated: ${processed}/${updatedDeliveries.length} (${Math.round(processed/updatedDeliveries.length*100)}%)`);
      }
    }

    // Process UNCHANGED deliveries in batches (just update fetchedAt)
    if (unchangedDeliveries.length > 0) {
      logger.info(`[SchucoService] Processing ${unchangedDeliveries.length} unchanged deliveries...`);

      // For unchanged, we can use updateMany which is much faster
      const unchangedIds = unchangedDeliveries.map(d => d.existing!.id);

      // Update in batches of 10 (bardzo male - SQLite timeout issues z duzymi importami)
      const UNCHANGED_BATCH_SIZE = 10;
      for (let i = 0; i < unchangedIds.length; i += UNCHANGED_BATCH_SIZE) {
        const batchIds = unchangedIds.slice(i, i + UNCHANGED_BATCH_SIZE);
        const batchNum = Math.floor(i / UNCHANGED_BATCH_SIZE) + 1;

        // Uzyj withRetry helper z exponential backoff
        await withRetry(
          () => this.prisma.schucoDelivery.updateMany({
            where: { id: { in: batchIds } },
            data: { fetchedAt: now },
          }),
          { maxRetries: 5, delayMs: 2000, operationName: `updateMany batch ${batchNum}` }
        ).catch(error => {
          // Kontynuuj z nastepnym batch zamiast failowac calosc
          logger.error(`[SchucoService] Batch ${batchNum} failed permanently: ${(error as Error).message}`);
        });

        // Maly delay miedzy batchami zeby dac SQLite odetchnac
        await new Promise(resolve => setTimeout(resolve, 100));

        // Log progress co 50 rekordow
        if ((i + UNCHANGED_BATCH_SIZE) % 50 === 0 || i + UNCHANGED_BATCH_SIZE >= unchangedIds.length) {
          const processed = Math.min(i + UNCHANGED_BATCH_SIZE, unchangedIds.length);
          logger.info(`[SchucoService] Unchanged progress: ${processed}/${unchangedIds.length}`);
        }
      }

      stats.unchangedRecords = unchangedDeliveries.length;
      logger.info(`[SchucoService] Unchanged: ${unchangedDeliveries.length} records updated`);
    }

    // Step 4: Create order links in batch
    logger.info('[SchucoService] Creating order links...');
    await withRetry(
      () => this.createOrderLinksBatch([...newDeliveries, ...updatedDeliveries, ...unchangedDeliveries]),
      { maxRetries: 3, delayMs: 3000, operationName: 'createOrderLinksBatch' }
    );

    logger.info(`[SchucoService] Deliveries stored: new=${stats.newRecords}, updated=${stats.updatedRecords}, unchanged=${stats.unchangedRecords}`);
    return stats;
  }

  /**
   * Create order links for multiple Schuco deliveries in batch
   * Znacznie szybsze niż pojedyncze wywołania createOrderLinks
   */
  private async createOrderLinksBatch(items: Array<{
    existing?: { id: number };
    extractedNums: string[];
    isWarehouse: boolean;
  }>): Promise<void> {
    // Collect all order numbers that need links
    const allOrderNumbers = new Set<string>();
    const deliveryOrderMap = new Map<number, string[]>(); // deliveryId -> orderNumbers

    for (const item of items) {
      if (!item.existing || item.isWarehouse || item.extractedNums.length === 0) continue;

      deliveryOrderMap.set(item.existing.id, item.extractedNums);
      item.extractedNums.forEach(num => allOrderNumbers.add(num));
    }

    if (allOrderNumbers.size === 0) return;

    // Batch lookup: find all matching orders at once
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: { in: Array.from(allOrderNumbers) },
      },
      select: { id: true, orderNumber: true },
    });

    if (orders.length === 0) return;

    const orderIdByNumber = new Map(orders.map(o => [o.orderNumber, o.id]));

    // Get all existing links to avoid duplicates
    const deliveryIds = Array.from(deliveryOrderMap.keys());
    const existingLinks = await this.prisma.orderSchucoLink.findMany({
      where: {
        schucoDeliveryId: { in: deliveryIds },
      },
      select: { schucoDeliveryId: true, orderId: true },
    });

    const existingLinkSet = new Set(
      existingLinks.map(l => `${l.schucoDeliveryId}-${l.orderId}`)
    );

    // Prepare new links to create
    const newLinks: Array<{ orderId: number; schucoDeliveryId: number; linkedBy: string }> = [];

    for (const [deliveryId, orderNums] of deliveryOrderMap) {
      for (const orderNum of orderNums) {
        const orderId = orderIdByNumber.get(orderNum);
        if (!orderId) continue;

        const linkKey = `${deliveryId}-${orderId}`;
        if (existingLinkSet.has(linkKey)) continue;

        newLinks.push({
          orderId,
          schucoDeliveryId: deliveryId,
          linkedBy: 'auto',
        });
      }
    }

    // Create all new links in batches
    if (newLinks.length > 0) {
      const LINK_BATCH_SIZE = 100;
      for (let i = 0; i < newLinks.length; i += LINK_BATCH_SIZE) {
        const batch = newLinks.slice(i, i + LINK_BATCH_SIZE);
        await this.prisma.orderSchucoLink.createMany({
          data: batch,
        });
      }
      logger.info(`[SchucoService] Created ${newLinks.length} new order links`);
    }
  }

  /**
   * Create order links for a Schuco delivery
   * Uses batch operations to avoid N+1 queries
   *
   * UWAGA: Wartości EUR/PLN zleceń NIE są aktualizowane z danych Schuco.
   * Ceny powinny pochodzić TYLKO z importu plików cen (folder 'ceny').
   */
  private async createOrderLinks(schucoDeliveryId: number, orderNumbers: string[]): Promise<number> {
    if (orderNumbers.length === 0) {
      return 0;
    }

    // Batch lookup: find all matching orders at once
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: {
          in: orderNumbers,
        },
      },
      select: { id: true, orderNumber: true },
    });

    if (orders.length === 0) {
      return 0;
    }

    // Get existing links to avoid duplicates (batch lookup)
    const existingLinks = await this.prisma.orderSchucoLink.findMany({
      where: {
        schucoDeliveryId: schucoDeliveryId,
        orderId: { in: orders.map((o) => o.id) },
      },
      select: { orderId: true },
    });
    const existingOrderIds = new Set(existingLinks.map((l) => l.orderId));

    // Filter orders that need new links
    const ordersNeedingLinks = orders.filter((o) => !existingOrderIds.has(o.id));

    // Batch create: create all new links at once
    // SQLite nie wspiera skipDuplicates, wiec filtrujemy przed insertem
    if (ordersNeedingLinks.length > 0) {
      await this.prisma.orderSchucoLink.createMany({
        data: ordersNeedingLinks.map((order) => ({
          orderId: order.id,
          schucoDeliveryId: schucoDeliveryId,
          linkedBy: 'auto',
        })),
      });
    }

    return ordersNeedingLinks.length;
  }

  /**
   * Get deliveries from database with pagination
   */
  async getDeliveries(page = 1, pageSize = 100): Promise<{
    data: Array<Record<string, unknown>>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    logger.info(`[SchucoService] Fetching deliveries (page: ${page}, pageSize: ${pageSize})...`);

    const skip = (page - 1) * pageSize;

    // Use Prisma findMany with manual sorting
    // Sort: new first, updated second, regular last, then by date
    // Filtruj tylko niezarchiwizowane dostawy
    const [deliveries, total] = await Promise.all([
      this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: null, // Tylko niezarchiwizowane
        },
        orderBy: [
          { orderDateParsed: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.schucoDelivery.count({
        where: {
          archivedAt: null, // Tylko niezarchiwizowane
        },
      }),
    ]);

    // Sort deliveries in memory: new first, updated second, then by date
    const sortedDeliveries = deliveries.sort((a, b) => {
      // Priority: new=1, updated=2, null=3
      const getPriority = (changeType: string | null) => {
        if (changeType === 'new') return 1;
        if (changeType === 'updated') return 2;
        return 3;
      };

      const priorityA = getPriority(a.changeType);
      const priorityB = getPriority(b.changeType);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Same priority - sort by date
      if (a.orderDateParsed && b.orderDateParsed) {
        return b.orderDateParsed.getTime() - a.orderDateParsed.getTime();
      }

      return b.id - a.id;
    });

    return {
      data: sortedDeliveries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get recent deliveries from database (legacy method for compatibility)
   */
  async getRecentDeliveries(limit = 50): Promise<any[]> {
    const result = await this.getDeliveries(1, limit);
    return result.data;
  }

  /**
   * Get fetch logs (history)
   */
  async getFetchLogs(limit = 10): Promise<any[]> {
    logger.info(`[SchucoService] Fetching logs (limit: ${limit})...`);

    const logs = await this.prisma.schucoFetchLog.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });

    return logs;
  }

  /**
   * Get last fetch status
   */
  async getLastFetchStatus(): Promise<any | null> {
    logger.info('[SchucoService] Getting last fetch status...');

    const lastLog = await this.prisma.schucoFetchLog.findFirst({
      orderBy: {
        startedAt: 'desc',
      },
    });

    return lastLog;
  }

  /**
   * Get statistics about deliveries by changeType
   */
  async getStatistics(): Promise<{
    total: number;
    new: number;
    updated: number;
    unchanged: number;
  }> {
    logger.info('[SchucoService] Getting delivery statistics...');

    const [total, newCount, updatedCount] = await Promise.all([
      this.prisma.schucoDelivery.count(),
      this.prisma.schucoDelivery.count({ where: { changeType: 'new' } }),
      this.prisma.schucoDelivery.count({ where: { changeType: 'updated' } }),
    ]);

    const unchanged = total - newCount - updatedCount;

    return {
      total,
      new: newCount,
      updated: updatedCount,
      unchanged,
    };
  }

  /**
   * Create fetch log entry
   */
  private async createFetchLog(status: string, triggerType: 'manual' | 'scheduled' = 'manual'): Promise<number> {
    const log = await this.prisma.schucoFetchLog.create({
      data: {
        status,
        triggerType,
      },
    });

    return log.id;
  }

  /**
   * Update fetch log entry
   */
  private async updateFetchLog(
    id: number,
    status: string,
    recordsCount: number,
    errorMessage: string | null,
    durationMs: number,
    changeStats?: ChangeStats
  ): Promise<void> {
    // Uzyj withRetry - ta operacja czesto failuje przy duzym obciazeniu
    await withRetry(
      () => this.prisma.schucoFetchLog.update({
        where: { id },
        data: {
          status,
          recordsCount,
          errorMessage,
          durationMs,
          completedAt: new Date(),
          newRecords: changeStats?.newRecords ?? null,
          updatedRecords: changeStats?.updatedRecords ?? null,
          unchangedRecords: changeStats?.unchangedRecords ?? null,
        },
      }),
      { maxRetries: 5, delayMs: 2000, operationName: 'updateFetchLog' }
    );
  }

  /**
   * Get the order matcher instance
   */
  getOrderMatcher(): SchucoOrderMatcher {
    return this.orderMatcher;
  }

  /**
   * Synchronize all existing Schuco deliveries with orders
   * Creates links for deliveries that don't have them yet
   */
  async syncAllOrderLinks(): Promise<{
    total: number;
    processed: number;
    linksCreated: number;
    warehouseItems: number;
  }> {
    logger.info('[SchucoService] Synchronizing all order links...');

    const deliveries = await this.prisma.schucoDelivery.findMany({
      select: { id: true, orderNumber: true },
    });

    let processed = 0;
    let linksCreated = 0;
    let warehouseItems = 0;

    for (const delivery of deliveries) {
      const extractedNums = extractOrderNumbers(delivery.orderNumber);
      const isWarehouse = extractedNums.length === 0;

      // Update delivery flags
      await this.prisma.schucoDelivery.update({
        where: { id: delivery.id },
        data: {
          isWarehouseItem: isWarehouse,
          extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
        },
      });

      if (isWarehouse) {
        warehouseItems++;
      } else {
        const links = await this.createOrderLinks(delivery.id, extractedNums);
        linksCreated += links;
      }

      processed++;
    }

    logger.info(
      `[SchucoService] Sync completed. Processed: ${processed}, Links: ${linksCreated}, Warehouse: ${warehouseItems}`
    );

    return {
      total: deliveries.length,
      processed,
      linksCreated,
      warehouseItems,
    };
  }

  /**
   * Get deliveries for a specific order
   */
  async getDeliveriesForOrder(orderId: number) {
    return this.orderMatcher.getSchucoDeliveriesForOrder(orderId);
  }

  /**
   * Get aggregated Schuco status for an order
   */
  async getSchucoStatusForOrder(orderId: number) {
    return this.orderMatcher.getSchucoStatusForOrder(orderId);
  }

  /**
   * Get unlinked deliveries (for manual linking)
   */
  async getUnlinkedDeliveries(limit = 100) {
    return this.orderMatcher.getUnlinkedDeliveries(limit);
  }

  /**
   * Get deliveries grouped by delivery week
   * Returns upcoming and recent weeks with their deliveries
   */
  async getDeliveriesByWeek(): Promise<{
    weeks: Array<{
      week: string;
      weekStart: Date | null;
      count: number;
      deliveries: Array<{
        id: number;
        orderNumber: string;
        orderName: string;
        shippingStatus: string;
        totalAmount: string | null;
        extractedOrderNums: string | null;
        changeType: string | null;
        changedFields: string | null;
      }>;
    }>;
  }> {
    logger.info('[SchucoService] Getting deliveries by week...');

    // Pobierz wszystkie dostawy z deliveryWeek
    const deliveries = await this.prisma.schucoDelivery.findMany({
      where: {
        deliveryWeek: {
          not: null,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        orderName: true,
        shippingStatus: true,
        deliveryWeek: true,
        totalAmount: true,
        extractedOrderNums: true,
        changeType: true,
        changedFields: true,
      },
      orderBy: [
        { deliveryWeek: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    // Grupuj po tygodniu dostawy
    const weekMap = new Map<string, typeof deliveries>();

    for (const delivery of deliveries) {
      const week = delivery.deliveryWeek!;
      if (!weekMap.has(week)) {
        weekMap.set(week, []);
      }
      weekMap.get(week)!.push(delivery);
    }

    // Parsuj tydzień na datę dla sortowania
    const parseWeekToDate = (week: string): Date | null => {
      // Format: "2026/3" lub "2025/50" (rok/tydzień)
      const match = week.match(/(\d{4})\/(\d{1,2})/);
      if (!match) return null;

      const year = parseInt(match[1], 10);
      const weekNum = parseInt(match[2], 10);

      // Oblicz datę poniedziałku tygodnia ISO
      // ISO tydzień 1 to tydzień zawierający 4 stycznia
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7; // Niedziela = 7
      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);

      return monday;
    };

    // Konwertuj na tablicę i posortuj
    const weeks = Array.from(weekMap.entries()).map(([week, weekDeliveries]) => ({
      week,
      weekStart: parseWeekToDate(week),
      count: weekDeliveries.length,
      deliveries: weekDeliveries.map(d => ({
        id: d.id,
        orderNumber: d.orderNumber,
        orderName: d.orderName,
        shippingStatus: d.shippingStatus,
        totalAmount: d.totalAmount,
        extractedOrderNums: d.extractedOrderNums,
        changeType: d.changeType,
        changedFields: d.changedFields,
      })),
    }));

    // Sortuj po dacie tygodnia (od najwcześniejszego)
    weeks.sort((a, b) => {
      if (!a.weekStart && !b.weekStart) return 0;
      if (!a.weekStart) return 1;
      if (!b.weekStart) return -1;
      return a.weekStart.getTime() - b.weekStart.getTime();
    });

    return { weeks };
  }

  /**
   * Clean up stale pending logs (older than 10 minutes)
   * Marks them as 'error' with timeout message
   */
  async cleanupStalePendingLogs(): Promise<number> {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const result = await this.prisma.schucoFetchLog.updateMany({
      where: {
        status: 'pending',
        startedAt: {
          lt: tenMinutesAgo,
        },
      },
      data: {
        status: 'error',
        errorMessage: 'Timeout - operacja nie zakończyła się w ciągu 10 minut',
        completedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info(`[SchucoService] Cleaned up ${result.count} stale pending logs`);
    }

    return result.count;
  }

  /**
   * Archiwizuj zrealizowane zamówienia starsze niż 3 miesiące
   * Zamówienia ze statusem "Potwierdzona dostawa" są przenoszone do archiwum
   */
  async archiveOldDeliveries(): Promise<{ archivedCount: number }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    logger.info(`[SchucoService] Archiving deliveries older than ${threeMonthsAgo.toISOString()}...`);

    // Znajdź i zarchiwizuj zamówienia:
    // - Status "Potwierdzona dostawa" (zrealizowane)
    // - Data zamówienia starsza niż 3 miesiące
    // - Jeszcze nie zarchiwizowane
    const result = await this.prisma.schucoDelivery.updateMany({
      where: {
        shippingStatus: 'Potwierdzona dostawa',
        archivedAt: null,
        orderDateParsed: {
          lt: threeMonthsAgo,
        },
      },
      data: {
        archivedAt: new Date(),
      },
    });

    logger.info(`[SchucoService] Archived ${result.count} deliveries`);

    return { archivedCount: result.count };
  }

  /**
   * Pobierz zarchiwizowane dostawy z paginacją
   */
  async getArchivedDeliveries(page = 1, pageSize = 50): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    logger.info(`[SchucoService] Fetching archived deliveries (page: ${page}, pageSize: ${pageSize})...`);

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.schucoDelivery.findMany({
        where: {
          archivedAt: { not: null },
        },
        orderBy: { orderDateParsed: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.schucoDelivery.count({
        where: {
          archivedAt: { not: null },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Pobierz statystyki archiwum
   */
  async getArchiveStats(): Promise<{
    totalArchived: number;
    oldestArchived: Date | null;
    newestArchived: Date | null;
  }> {
    const [totalArchived, oldest, newest] = await Promise.all([
      this.prisma.schucoDelivery.count({
        where: { archivedAt: { not: null } },
      }),
      this.prisma.schucoDelivery.findFirst({
        where: { archivedAt: { not: null } },
        orderBy: { orderDateParsed: 'asc' },
        select: { orderDateParsed: true },
      }),
      this.prisma.schucoDelivery.findFirst({
        where: { archivedAt: { not: null } },
        orderBy: { orderDateParsed: 'desc' },
        select: { orderDateParsed: true },
      }),
    ]);

    return {
      totalArchived,
      oldestArchived: oldest?.orderDateParsed || null,
      newestArchived: newest?.orderDateParsed || null,
    };
  }
}
