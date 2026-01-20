/**
 * Order Archive Service
 *
 * Automatycznie archiwizuje zlecenia 60 dni po wyprodukiwaniu (completedAt)
 * Umożliwia też ręczne archiwizowanie i odarchiwizowanie zleceń
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// 60 dni w milisekundach
const ARCHIVE_AFTER_DAYS = 60;

export interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  archivedOrderNumbers: string[];
  errors: string[];
}

export interface ArchiveYearStats {
  year: number;
  count: number;
}

export class OrderArchiveService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Archiwizuje zlecenia wyprodukowane ponad 60 dni temu
   * Uruchamiane automatycznie przez scheduler
   */
  async archiveOldCompletedOrders(): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      success: true,
      archivedCount: 0,
      archivedOrderNumbers: [],
      errors: [],
    };

    try {
      // Data graniczna: 60 dni temu
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

      logger.info(`[OrderArchiveService] Szukam zleceń wyprodukowanych przed ${cutoffDate.toISOString()}`);

      // Znajdź zlecenia do archiwizacji:
      // - completedAt ustawione (wyprodukowane)
      // - completedAt starsze niż 60 dni
      // - NIE zarchiwizowane (archivedAt = null)
      const ordersToArchive = await this.prisma.order.findMany({
        where: {
          completedAt: {
            not: null,
            lt: cutoffDate,
          },
          archivedAt: null,
        },
        select: {
          id: true,
          orderNumber: true,
          completedAt: true,
        },
      });

      if (ordersToArchive.length === 0) {
        logger.info('[OrderArchiveService] Brak zleceń do archiwizacji');
        return result;
      }

      logger.info(`[OrderArchiveService] Znaleziono ${ordersToArchive.length} zleceń do archiwizacji`);

      // Archiwizuj wszystkie znalezione zlecenia
      const now = new Date();
      const orderIds = ordersToArchive.map((o) => o.id);

      await this.prisma.order.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          archivedAt: now,
          status: 'archived',
        },
      });

      result.archivedCount = ordersToArchive.length;
      result.archivedOrderNumbers = ordersToArchive.map((o) => o.orderNumber);

      logger.info(
        `[OrderArchiveService] Zarchiwizowano ${result.archivedCount} zleceń: ${result.archivedOrderNumbers.join(', ')}`
      );
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      result.errors.push(errorMessage);
      logger.error('[OrderArchiveService] Błąd podczas archiwizacji:', error);
    }

    return result;
  }

  /**
   * Ręczna archiwizacja zlecenia
   */
  async archiveOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, archivedAt: true },
      });

      if (!order) {
        return { success: false, error: 'Zlecenie nie istnieje' };
      }

      if (order.archivedAt) {
        return { success: false, error: 'Zlecenie jest już zarchiwizowane' };
      }

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          archivedAt: new Date(),
          status: 'archived',
        },
      });

      logger.info(`[OrderArchiveService] Ręcznie zarchiwizowano zlecenie ${order.orderNumber}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error(`[OrderArchiveService] Błąd ręcznej archiwizacji:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Odarchiwizowanie zlecenia (przywrócenie do aktywnych)
   */
  async unarchiveOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, archivedAt: true, completedAt: true },
      });

      if (!order) {
        return { success: false, error: 'Zlecenie nie istnieje' };
      }

      if (!order.archivedAt) {
        return { success: false, error: 'Zlecenie nie jest zarchiwizowane' };
      }

      // Przywróć status na podstawie completedAt
      const newStatus = order.completedAt ? 'completed' : 'new';

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          archivedAt: null,
          status: newStatus,
        },
      });

      logger.info(`[OrderArchiveService] Odarchiwizowano zlecenie ${order.orderNumber}, nowy status: ${newStatus}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error(`[OrderArchiveService] Błąd odarchiwizacji:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Pobierz statystyki archiwum (ile zleceń w każdym roku)
   * Rok = rok completedAt (data wyprodukowania)
   */
  async getArchiveYearStats(): Promise<ArchiveYearStats[]> {
    // SQLite nie ma EXTRACT, używamy strftime
    const stats = await this.prisma.$queryRaw<{ year: number; count: bigint }[]>`
      SELECT
        CAST(strftime('%Y', completed_at) AS INTEGER) as year,
        COUNT(*) as count
      FROM orders
      WHERE archived_at IS NOT NULL
        AND completed_at IS NOT NULL
      GROUP BY strftime('%Y', completed_at)
      ORDER BY year DESC
    `;

    return stats.map((s) => ({
      year: s.year,
      count: Number(s.count),
    }));
  }

  /**
   * Pobierz zarchiwizowane zlecenia dla danego roku
   * Rok = rok completedAt (data wyprodukowania)
   */
  async getArchivedOrdersByYear(year: number, options?: { limit?: number; offset?: number }) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          archivedAt: { not: null },
          completedAt: {
            gte: startOfYear,
            lt: endOfYear,
          },
        },
        orderBy: { completedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          deliveryOrders: {
            include: {
              delivery: {
                select: {
                  id: true,
                  deliveryNumber: true,
                  deliveryDate: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({
        where: {
          archivedAt: { not: null },
          completedAt: {
            gte: startOfYear,
            lt: endOfYear,
          },
        },
      }),
    ]);

    return { orders, total };
  }

  /**
   * Pobierz dostępne lata w archiwum
   */
  async getAvailableYears(): Promise<number[]> {
    const stats = await this.getArchiveYearStats();
    return stats.map((s) => s.year);
  }
}