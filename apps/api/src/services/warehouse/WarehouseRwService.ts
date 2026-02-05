/**
 * WarehouseRwService - Automatyczne rozchody wewnętrzne (RW) dla profili aluminiowych
 *
 * Logika:
 * - Gdy zlecenie zostaje oznaczone jako "wyprodukowane" (status = completed),
 *   automatycznie zmniejsz stany magazynowe profili na podstawie OrderRequirement
 * - Aktualizuj status OrderRequirement na 'completed'
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { emitProfileRwProcessed, emitWarehouseStockUpdated } from '../event-emitter.js';

interface RwProcessResult {
  orderId: number;
  orderNumber: string;
  processed: number;
  skipped: number;
  errors: Array<{ profileId: number; colorId: number | null; error: string }>;
}

export class WarehouseRwService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Przetworz RW dla pojedynczego zlecenia
   * Wywołaj gdy zlecenie zmieni status na 'completed'
   */
  async processRwForOrder(orderId: number, userId?: number): Promise<RwProcessResult> {
    const result: RwProcessResult = {
      orderId,
      orderNumber: '',
      processed: 0,
      skipped: 0,
      errors: [],
    };

    // Pobierz zlecenie z requirements
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        requirements: {
          where: {
            status: { not: 'completed' }, // Tylko te które nie zostały jeszcze przetworzone
          },
          include: {
            profile: {
              select: {
                id: true,
                name: true,
                articleNumber: true,
              },
            },
            color: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for Profile RW processing', { orderId });
      return result;
    }

    result.orderNumber = order.orderNumber;

    // Sprawdz czy zlecenie ma status completed
    if (order.status !== 'completed') {
      logger.info('Order not completed, skipping Profile RW', { orderId, status: order.status });
      return result;
    }

    // Brak requirements do przetworzenia
    if (order.requirements.length === 0) {
      logger.info('No pending profile requirements for order', { orderId, orderNumber: order.orderNumber });
      return result;
    }

    logger.info('Processing Profile RW for order', {
      orderId,
      orderNumber: order.orderNumber,
      requirementsCount: order.requirements.length,
    });

    // Przetwórz każdy requirement w transakcji
    await this.prisma.$transaction(async (tx) => {
      for (const requirement of order.requirements) {
        try {
          // Znajdź stan magazynowy dla profilu i koloru
          const stock = await tx.warehouseStock.findFirst({
            where: {
              profileId: requirement.profileId,
              colorId: requirement.colorId ?? 0, // Domyślny kolor jeśli null
              deletedAt: null,
            },
          });

          if (!stock) {
            // Brak stanu magazynowego - zgłoś błąd ale kontynuuj
            result.errors.push({
              profileId: requirement.profileId,
              colorId: requirement.colorId,
              error: `Brak stanu magazynowego dla profilu ${requirement.profile.articleNumber} (${requirement.color?.name || 'brak koloru'})`,
            });
            result.skipped++;

            // Mimo braku stanu, oznacz requirement jako completed
            await tx.orderRequirement.update({
              where: { id: requirement.id },
              data: { status: 'completed' },
            });
            continue;
          }

          const previousQty = stock.currentStockBeams;
          const changeQty = -requirement.beamsCount; // Ujemna wartość = rozchód
          const newQty = Math.max(0, previousQty + changeQty); // Nie dopuszczaj do ujemnych stanów

          // Aktualizuj stan magazynowy
          await tx.warehouseStock.update({
            where: { id: stock.id },
            data: {
              currentStockBeams: newQty,
              version: { increment: 1 },
              updatedById: userId ?? null,
            },
          });

          // Oznacz requirement jako completed
          await tx.orderRequirement.update({
            where: { id: requirement.id },
            data: { status: 'completed' },
          });

          result.processed++;

          logger.debug('Processed Profile RW', {
            profileId: requirement.profileId,
            colorId: requirement.colorId,
            orderId,
            previousQty,
            changeQty,
            newQty,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          result.errors.push({
            profileId: requirement.profileId,
            colorId: requirement.colorId,
            error: errorMessage,
          });
          result.skipped++;
          logger.error('Failed to process Profile RW', {
            profileId: requirement.profileId,
            colorId: requirement.colorId,
            orderId,
            error: errorMessage,
          });
        }
      }
    });

    logger.info('Profile RW processing completed', {
      orderId,
      orderNumber: order.orderNumber,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    // Emituj event aby frontend mógł odświeżyć dane
    if (result.processed > 0) {
      emitProfileRwProcessed({
        orderId,
        orderNumber: order.orderNumber,
        processed: result.processed,
      });
      emitWarehouseStockUpdated({ source: 'rw', orderId });
    }

    return result;
  }

  /**
   * Cofnij RW dla zlecenia - przywróć stany magazynowe profili
   * Używaj gdy zlecenie wraca z completed do in_progress
   */
  async reverseRwForOrder(orderId: number, userId?: number): Promise<RwProcessResult> {
    const result: RwProcessResult = {
      orderId,
      orderNumber: '',
      processed: 0,
      skipped: 0,
      errors: [],
    };

    // Znajdź zlecenie z completed requirements
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        requirements: {
          where: { status: 'completed' },
          include: {
            profile: { select: { id: true, name: true, articleNumber: true } },
            color: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for Profile RW reversal', { orderId });
      return result;
    }

    result.orderNumber = order.orderNumber;

    if (order.requirements.length === 0) {
      logger.info('No completed profile requirements to reverse', { orderId });
      return result;
    }

    logger.info('Reversing Profile RW for order', {
      orderId,
      orderNumber: order.orderNumber,
      requirementsCount: order.requirements.length,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const requirement of order.requirements) {
        try {
          const stock = await tx.warehouseStock.findFirst({
            where: {
              profileId: requirement.profileId,
              colorId: requirement.colorId ?? 0,
              deletedAt: null,
            },
          });

          if (!stock) {
            result.errors.push({
              profileId: requirement.profileId,
              colorId: requirement.colorId,
              error: `Brak stanu magazynowego dla profilu ${requirement.profile.articleNumber}`,
            });
            result.skipped++;

            // Mimo braku stanu, cofnij status requirement
            await tx.orderRequirement.update({
              where: { id: requirement.id },
              data: { status: 'pending' },
            });
            continue;
          }

          // Cofnij zmianę (dodaj z powrotem odjęte bele)
          const reverseQty = requirement.beamsCount;
          const newQty = stock.currentStockBeams + reverseQty;

          await tx.warehouseStock.update({
            where: { id: stock.id },
            data: {
              currentStockBeams: newQty,
              version: { increment: 1 },
              updatedById: userId ?? null,
            },
          });

          // Cofnij status requirement na pending
          await tx.orderRequirement.update({
            where: { id: requirement.id },
            data: { status: 'pending' },
          });

          result.processed++;

          logger.debug('Reversed Profile RW', {
            profileId: requirement.profileId,
            colorId: requirement.colorId,
            orderId,
            reverseQty,
            newQty,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          result.errors.push({
            profileId: requirement.profileId,
            colorId: requirement.colorId,
            error: errorMessage,
          });
          result.skipped++;
        }
      }
    });

    logger.info('Profile RW reversal completed', {
      orderId,
      orderNumber: order.orderNumber,
      processed: result.processed,
      skipped: result.skipped,
    });

    if (result.processed > 0) {
      emitProfileRwProcessed({
        orderId,
        orderNumber: order.orderNumber,
        processed: result.processed,
      });
      emitWarehouseStockUpdated({ source: 'rw_reverse', orderId });
    }

    return result;
  }

  /**
   * Przetworz RW dla wielu zleceń (batch)
   * Używane przy masowej zmianie statusu
   */
  async processRwForOrders(orderIds: number[], userId?: number): Promise<RwProcessResult[]> {
    const results: RwProcessResult[] = [];

    for (const orderId of orderIds) {
      const result = await this.processRwForOrder(orderId, userId);
      results.push(result);
    }

    // Podsumowanie
    const summary = results.reduce(
      (acc, r) => ({
        totalProcessed: acc.totalProcessed + r.processed,
        totalSkipped: acc.totalSkipped + r.skipped,
        totalErrors: acc.totalErrors + r.errors.length,
      }),
      { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 }
    );

    logger.info('Batch Profile RW processing completed', {
      ordersCount: orderIds.length,
      ...summary,
    });

    return results;
  }
}
