/**
 * Soft Delete Cleanup Service
 *
 * Trwale usuwa rekordy z deletedAt starszym niż 2 lata.
 * Uruchamiany raz w tygodniu (niedziela) przez scheduler.
 *
 * NIE usuwa archiwum zleceń (archivedAt) - to jest zachowywane!
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Domyślnie 2 lata (730 dni)
const DEFAULT_RETENTION_DAYS = 730;

export interface CleanupResult {
  success: boolean;
  deletedCounts: Record<string, number>;
  totalDeleted: number;
  errors: string[];
  dryRun: boolean;
}

export interface CleanupStats {
  model: string;
  toDeleteCount: number;
  oldestDeletedAt: Date | null;
}

export class SoftDeleteCleanupService {
  private prisma: PrismaClient;
  private retentionDays: number;

  constructor(prisma: PrismaClient, retentionDays: number = DEFAULT_RETENTION_DAYS) {
    this.prisma = prisma;
    this.retentionDays = retentionDays;
  }

  /**
   * Data graniczna - rekordy z deletedAt starszym niż ta data będą usunięte
   */
  private getCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);
    return cutoff;
  }

  /**
   * Sprawdza ile rekordów zostanie usuniętych (dry run)
   */
  async getCleanupStats(): Promise<CleanupStats[]> {
    const cutoffDate = this.getCutoffDate();
    const stats: CleanupStats[] = [];

    // Lista modeli z deletedAt
    const models = [
      { name: 'User', model: this.prisma.user },
      { name: 'Delivery', model: this.prisma.delivery },
      { name: 'FileImport', model: this.prisma.fileImport },
      { name: 'WarehouseStock', model: this.prisma.warehouseStock },
      { name: 'GlassOrder', model: this.prisma.glassOrder },
      { name: 'OkucLocation', model: this.prisma.okucLocation },
      { name: 'OkucArticle', model: this.prisma.okucArticle },
      { name: 'OkucProportion', model: this.prisma.okucProportion },
      { name: 'OkucDemand', model: this.prisma.okucDemand },
      { name: 'OkucOrder', model: this.prisma.okucOrder },
      { name: 'SteelStock', model: this.prisma.steelStock },
      { name: 'LabelCheck', model: this.prisma.labelCheck },
      { name: 'AkrobudVerificationList', model: this.prisma.akrobudVerificationList },
    ];

    for (const { name, model } of models) {
      try {
        // @ts-expect-error - dynamiczny dostęp do modeli Prisma
        const count = await model.count({
          where: {
            deletedAt: {
              not: null,
              lt: cutoffDate,
            },
          },
        });

        // @ts-expect-error - dynamiczny dostęp do modeli Prisma
        const oldest = await model.findFirst({
          where: {
            deletedAt: {
              not: null,
              lt: cutoffDate,
            },
          },
          orderBy: { deletedAt: 'asc' },
          select: { deletedAt: true },
        });

        stats.push({
          model: name,
          toDeleteCount: count,
          oldestDeletedAt: oldest?.deletedAt || null,
        });
      } catch (error) {
        logger.warn(`[SoftDeleteCleanup] Nie można sprawdzić modelu ${name}:`, error instanceof Error ? { message: error.message } : undefined);
      }
    }

    return stats;
  }

  /**
   * Wykonuje cleanup - trwale usuwa rekordy
   * @param dryRun - jeśli true, tylko loguje co zostałoby usunięte
   */
  async cleanup(dryRun: boolean = false): Promise<CleanupResult> {
    const cutoffDate = this.getCutoffDate();
    const result: CleanupResult = {
      success: true,
      deletedCounts: {},
      totalDeleted: 0,
      errors: [],
      dryRun,
    };

    logger.info(
      `[SoftDeleteCleanup] ${dryRun ? 'DRY RUN - ' : ''}Rozpoczynam cleanup rekordów usuniętych przed ${cutoffDate.toISOString()}`
    );

    // Kolejność ważna! Najpierw child records, potem parent
    // Delivery ma kaskadowe usuwanie (DeliveryItem, DeliveryOrder)
    // GlassOrder ma kaskadowe usuwanie (GlassOrderItem, GlassOrderValidation)
    // OkucOrder ma kaskadowe usuwanie (OkucOrderItem)
    // AkrobudVerificationList ma kaskadowe usuwanie (AkrobudVerificationItem)
    // LabelCheck ma kaskadowe usuwanie (LabelCheckResult)

    const modelsToClean = [
      // Modele bez zależności lub z CASCADE
      { name: 'FileImport', model: this.prisma.fileImport },
      { name: 'WarehouseStock', model: this.prisma.warehouseStock },
      { name: 'SteelStock', model: this.prisma.steelStock },
      { name: 'OkucProportion', model: this.prisma.okucProportion },
      { name: 'OkucDemand', model: this.prisma.okucDemand },
      { name: 'OkucOrder', model: this.prisma.okucOrder }, // CASCADE usuwa OkucOrderItem
      { name: 'OkucArticle', model: this.prisma.okucArticle },
      { name: 'OkucLocation', model: this.prisma.okucLocation },
      { name: 'GlassOrder', model: this.prisma.glassOrder }, // CASCADE usuwa GlassOrderItem, GlassOrderValidation
      { name: 'LabelCheck', model: this.prisma.labelCheck }, // CASCADE usuwa LabelCheckResult
      { name: 'AkrobudVerificationList', model: this.prisma.akrobudVerificationList }, // CASCADE usuwa items
      { name: 'Delivery', model: this.prisma.delivery }, // CASCADE usuwa DeliveryItem, DeliveryOrder
      { name: 'User', model: this.prisma.user }, // Na końcu - może mieć FK
    ];

    for (const { name, model } of modelsToClean) {
      try {
        // @ts-expect-error - dynamiczny dostęp
        const count = await model.count({
          where: {
            deletedAt: {
              not: null,
              lt: cutoffDate,
            },
          },
        });

        if (count === 0) {
          result.deletedCounts[name] = 0;
          continue;
        }

        if (dryRun) {
          logger.info(`[SoftDeleteCleanup] DRY RUN: Usunąłbym ${count} rekordów z ${name}`);
          result.deletedCounts[name] = count;
          result.totalDeleted += count;
        } else {
          // @ts-expect-error - dynamiczny dostęp
          const deleted = await model.deleteMany({
            where: {
              deletedAt: {
                not: null,
                lt: cutoffDate,
              },
            },
          });

          result.deletedCounts[name] = deleted.count;
          result.totalDeleted += deleted.count;
          logger.info(`[SoftDeleteCleanup] Usunięto ${deleted.count} rekordów z ${name}`);
        }
      } catch (error) {
        const errorMsg = `Błąd podczas czyszczenia ${name}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
        result.errors.push(errorMsg);
        logger.error(`[SoftDeleteCleanup] ${errorMsg}`);
        // Kontynuuj z innymi modelami
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    logger.info(
      `[SoftDeleteCleanup] ${dryRun ? 'DRY RUN ' : ''}Zakończono. Usunięto łącznie: ${result.totalDeleted} rekordów`
    );

    return result;
  }

  /**
   * Pobiera ustawienie retencji z bazy (jeśli istnieje)
   */
  async getRetentionDaysFromSettings(): Promise<number> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'softDeleteRetentionDays' },
      });

      if (setting?.value) {
        const days = parseInt(setting.value, 10);
        if (!isNaN(days) && days > 0) {
          return days;
        }
      }
    } catch {
      // Brak ustawienia - użyj domyślnej
    }

    return DEFAULT_RETENTION_DAYS;
  }
}
