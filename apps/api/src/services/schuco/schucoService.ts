import { PrismaClient, SchucoDelivery } from '@prisma/client';
import { SchucoScraper } from './schucoScraper.js';
import { SchucoParser, SchucoDeliveryRow } from './schucoParser.js';
import { SchucoOrderMatcher, extractOrderNumbers, isWarehouseItem } from './schucoOrderMatcher.js';
import { logger } from '../../utils/logger.js';

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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.parser = new SchucoParser();
    this.orderMatcher = new SchucoOrderMatcher(prisma);
  }

  /**
   * Fetch and store Schuco deliveries with change tracking
   */
  async fetchAndStoreDeliveries(
    headless: boolean = true,
    triggerType: 'manual' | 'scheduled' = 'manual'
  ): Promise<FetchResult> {
    const startTime = Date.now();
    const logId = await this.createFetchLog('pending', triggerType);

    try {
      logger.info(`[SchucoService] Starting fetch process (trigger: ${triggerType}, headless: ${headless})...`);

      // Step 1: Clear old change markers (older than 24 hours)
      await this.clearOldChangeMarkers();

      // Step 2: Scrape website and download CSV - create scraper with headless setting
      const scraper = new SchucoScraper({ headless });
      const csvFilePath = await scraper.scrapeDeliveries();

      // Step 3: Parse CSV file
      const deliveries = await this.parser.parseCSV(csvFilePath);
      logger.info(`[SchucoService] Parsed ${deliveries.length} deliveries`);

      // Step 4: Store in database with change tracking
      const changeStats = await this.storeDeliveriesWithChangeTracking(deliveries);

      // Step 5: Update log with stats
      const durationMs = Date.now() - startTime;
      await this.updateFetchLog(logId, 'success', deliveries.length, null, durationMs, changeStats);

      logger.info(
        `[SchucoService] Fetch completed. Records: ${deliveries.length}, ` +
          `New: ${changeStats.newRecords}, Updated: ${changeStats.updatedRecords}, ` +
          `Unchanged: ${changeStats.unchangedRecords}`
      );

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

      await this.updateFetchLog(logId, 'error', 0, errorMessage, durationMs);

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
   * Store deliveries with change tracking
   */
  private async storeDeliveriesWithChangeTracking(deliveries: SchucoDeliveryRow[]): Promise<ChangeStats> {
    logger.info(`[SchucoService] Storing ${deliveries.length} deliveries with change tracking...`);

    const stats: ChangeStats = {
      newRecords: 0,
      updatedRecords: 0,
      unchangedRecords: 0,
    };

    // Get all existing deliveries by order number for comparison
    const orderNumbers = deliveries.map((d) => d.orderNumber);
    const existingDeliveries = await this.prisma.schucoDelivery.findMany({
      where: {
        orderNumber: {
          in: orderNumbers,
        },
      },
    });

    const existingMap = new Map(existingDeliveries.map((d) => [d.orderNumber, d]));
    const now = new Date();

    // Process each delivery
    for (const delivery of deliveries) {
      const existing = existingMap.get(delivery.orderNumber);
      const orderDateParsed = this.parser.parseDate(delivery.orderDate);

      // Extract order numbers for linking
      const extractedNums = extractOrderNumbers(delivery.orderNumber);
      const isWarehouse = isWarehouseItem(delivery.orderNumber);

      if (!existing) {
        // New record - use upsert to handle race conditions with duplicate orderNumbers in CSV
        const created = await this.prisma.schucoDelivery.upsert({
          where: { orderNumber: delivery.orderNumber },
          create: {
            orderDate: delivery.orderDate,
            orderDateParsed: orderDateParsed,
            orderNumber: delivery.orderNumber,
            projectNumber: delivery.projectNumber,
            orderName: delivery.orderName,
            shippingStatus: delivery.shippingStatus,
            deliveryWeek: delivery.deliveryWeek || null,
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
            // If record already exists (duplicate in CSV), keep it as 'new' (don't change to 'updated')
            orderDate: delivery.orderDate,
            orderDateParsed: orderDateParsed,
            projectNumber: delivery.projectNumber,
            orderName: delivery.orderName,
            shippingStatus: delivery.shippingStatus,
            deliveryWeek: delivery.deliveryWeek || null,
            deliveryType: delivery.deliveryType || null,
            tracking: delivery.tracking || null,
            complaint: delivery.complaint || null,
            orderType: delivery.orderType || null,
            totalAmount: delivery.totalAmount || null,
            rawData: JSON.stringify(delivery.rawData),
            // Keep 'new' status - don't override to 'updated' for duplicates in same CSV
            updatedAt: now,
            isWarehouseItem: isWarehouse,
            extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
          },
        });

        // Create order links for new deliveries
        if (!isWarehouse && extractedNums.length > 0) {
          await this.createOrderLinks(created.id, extractedNums);
        }

        stats.newRecords++;
      } else {
        // Check for changes
        const changes = this.compareDeliveries(existing, delivery);

        if (changes) {
          // Updated record - but preserve 'new' status if record is still marked as new
          // (new records should stay 'new' until 72h passes, even if they have changes)
          const shouldKeepNewStatus = existing.changeType === 'new';

          await this.prisma.schucoDelivery.update({
            where: { id: existing.id },
            data: {
              orderDate: delivery.orderDate,
              orderDateParsed: orderDateParsed,
              projectNumber: delivery.projectNumber,
              orderName: delivery.orderName,
              shippingStatus: delivery.shippingStatus,
              deliveryWeek: delivery.deliveryWeek || null,
              deliveryType: delivery.deliveryType || null,
              tracking: delivery.tracking || null,
              complaint: delivery.complaint || null,
              orderType: delivery.orderType || null,
              totalAmount: delivery.totalAmount || null,
              rawData: JSON.stringify(delivery.rawData),
              // Preserve 'new' status - only mark as 'updated' if it wasn't 'new' before
              changeType: shouldKeepNewStatus ? 'new' : 'updated',
              changedAt: shouldKeepNewStatus ? existing.changedAt : now,
              changedFields: shouldKeepNewStatus ? existing.changedFields : JSON.stringify(changes.changedFields),
              previousValues: shouldKeepNewStatus ? existing.previousValues : JSON.stringify(changes.previousValues),
              updatedAt: now,
              isWarehouseItem: isWarehouse,
              extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
            },
          });

          // Update order links if needed
          if (!isWarehouse && extractedNums.length > 0) {
            await this.createOrderLinks(existing.id, extractedNums);
          }

          // Count based on actual status change
          if (shouldKeepNewStatus) {
            stats.newRecords++; // Still counts as new
          } else {
            stats.updatedRecords++;
          }
        } else {
          // No changes - just update fetchedAt and ensure links exist
          await this.prisma.schucoDelivery.update({
            where: { id: existing.id },
            data: {
              fetchedAt: now,
              isWarehouseItem: isWarehouse,
              extractedOrderNums: extractedNums.length > 0 ? JSON.stringify(extractedNums) : null,
            },
          });

          // Ensure order links exist
          if (!isWarehouse && extractedNums.length > 0) {
            await this.createOrderLinks(existing.id, extractedNums);
          }

          stats.unchangedRecords++;
        }
      }
    }

    logger.info('[SchucoService] Deliveries stored with change tracking');
    return stats;
  }

  /**
   * Create order links for a Schuco delivery
   * Also updates order value from Schuco delivery if available
   */
  private async createOrderLinks(schucoDeliveryId: number, orderNumbers: string[]): Promise<number> {
    if (orderNumbers.length === 0) {
      return 0;
    }

    // Get Schuco delivery with totalAmount
    const schucoDelivery = await this.prisma.schucoDelivery.findUnique({
      where: { id: schucoDeliveryId },
      select: { totalAmount: true },
    });

    // Parse EUR amount from Schuco if available
    let eurValue: number | null = null;
    if (schucoDelivery?.totalAmount) {
      eurValue = this.parser.parseEurAmount(schucoDelivery.totalAmount);
    }

    // Find matching orders
    const orders = await this.prisma.order.findMany({
      where: {
        orderNumber: {
          in: orderNumbers,
        },
      },
      select: { id: true, orderNumber: true, valueEur: true },
    });

    if (orders.length === 0) {
      return 0;
    }

    let linksCreated = 0;
    for (const order of orders) {
      try {
        // Create/update order link
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
            // Link already exists, no update needed
          },
        });

        // Update order value if EUR value is available and order doesn't have a value yet
        if (eurValue !== null && order.valueEur === null) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { valueEur: eurValue },
          });
          logger.info(`[SchucoService] Updated order ${order.orderNumber} with EUR value: ${eurValue}`);
        }

        linksCreated++;
      } catch (error) {
        logger.error(`[SchucoService] Error creating link for order ${order.orderNumber}:`, error);
      }
    }

    return linksCreated;
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
    const [deliveries, total] = await Promise.all([
      this.prisma.schucoDelivery.findMany({
        orderBy: [
          { orderDateParsed: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.schucoDelivery.count(),
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
    await this.prisma.schucoFetchLog.update({
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
    });
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
}
