import { PrismaClient, SchucoDelivery } from '@prisma/client';
import { SchucoScraper } from './schucoScraper.js';
import { SchucoParser, SchucoDeliveryRow } from './schucoParser.js';
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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.parser = new SchucoParser();
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

      if (!existing) {
        // New record - use upsert to handle race conditions with duplicate orderNumbers in CSV
        await this.prisma.schucoDelivery.upsert({
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
          },
          update: {
            // If record already exists (duplicate in CSV), update it
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
            changeType: 'updated',
            changedAt: now,
            updatedAt: now,
          },
        });
        stats.newRecords++;
      } else {
        // Check for changes
        const changes = this.compareDeliveries(existing, delivery);

        if (changes) {
          // Updated record
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
              changeType: 'updated',
              changedAt: now,
              changedFields: JSON.stringify(changes.changedFields),
              previousValues: JSON.stringify(changes.previousValues),
              updatedAt: now,
            },
          });
          stats.updatedRecords++;
        } else {
          // No changes - just update fetchedAt
          await this.prisma.schucoDelivery.update({
            where: { id: existing.id },
            data: {
              fetchedAt: now,
            },
          });
          stats.unchangedRecords++;
        }
      }
    }

    logger.info('[SchucoService] Deliveries stored with change tracking');
    return stats;
  }

  /**
   * Get deliveries from database with pagination
   */
  async getDeliveries(page = 1, pageSize = 100): Promise<{
    data: any[];
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
}
