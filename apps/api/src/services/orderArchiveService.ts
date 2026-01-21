/**
 * Order Archive Service
 *
 * Automatycznie archiwizuje zlecenia X dni po wyprodukiwaniu (completedAt)
 * Liczba dni konfigurowana w ustawieniach (klucz: archiveAfterDays)
 * Umożliwia też ręczne archiwizowanie i odarchiwizowanie zleceń
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Domyślna wartość jeśli nie ma w bazie
const DEFAULT_ARCHIVE_AFTER_DAYS = 40;

// Ile dni po ustawieniu statusu 'cancelled' archiwizować zlecenie
const CANCELLED_ARCHIVE_AFTER_DAYS = 30;

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
   * Pobiera liczbę dni do archiwizacji z ustawień
   */
  async getArchiveAfterDays(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'archiveAfterDays' },
    });

    if (setting?.value) {
      const days = parseInt(setting.value, 10);
      if (!isNaN(days) && days > 0) {
        return days;
      }
    }

    return DEFAULT_ARCHIVE_AFTER_DAYS;
  }

  /**
   * Archiwizuje zlecenia wyprodukowane ponad X dni temu
   * Liczba dni pobierana z ustawień (klucz: archiveAfterDays)
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
      // Pobierz liczbę dni z ustawień
      const archiveAfterDays = await this.getArchiveAfterDays();

      // Data graniczna: X dni temu
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);

      logger.info(`[OrderArchiveService] Szukam zleceń wyprodukowanych przed ${cutoffDate.toISOString()} (${archiveAfterDays} dni)`);

      // Znajdź zlecenia do archiwizacji:
      // - completedAt ustawione (wyprodukowane)
      // - completedAt starsze niż X dni (z ustawień)
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
   * Archiwizuje zlecenia ze statusem 'cancelled' po 30 dniach od ustawienia statusu
   * Uruchamiane automatycznie przez scheduler
   */
  async archiveCancelledOrders(): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      success: true,
      archivedCount: 0,
      archivedOrderNumbers: [],
      errors: [],
    };

    try {
      // Data graniczna: 30 dni temu
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CANCELLED_ARCHIVE_AFTER_DAYS);

      logger.info(
        `[OrderArchiveService] Szukam anulowanych zleceń starszych niż ${cutoffDate.toISOString()} (${CANCELLED_ARCHIVE_AFTER_DAYS} dni)`
      );

      // Znajdź zlecenia do archiwizacji:
      // - manualStatus = 'cancelled'
      // - manualStatusSetAt starsze niż 30 dni
      // - NIE zarchiwizowane (archivedAt = null)
      const ordersToArchive = await this.prisma.order.findMany({
        where: {
          manualStatus: 'cancelled',
          manualStatusSetAt: {
            not: null,
            lt: cutoffDate,
          },
          archivedAt: null,
        },
        select: {
          id: true,
          orderNumber: true,
          manualStatusSetAt: true,
        },
      });

      if (ordersToArchive.length === 0) {
        logger.info('[OrderArchiveService] Brak anulowanych zleceń do archiwizacji');
        return result;
      }

      logger.info(
        `[OrderArchiveService] Znaleziono ${ordersToArchive.length} anulowanych zleceń do archiwizacji`
      );

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
        `[OrderArchiveService] Zarchiwizowano ${result.archivedCount} anulowanych zleceń: ${result.archivedOrderNumbers.join(', ')}`
      );
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      result.errors.push(errorMessage);
      logger.error('[OrderArchiveService] Błąd podczas archiwizacji anulowanych:', error);
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