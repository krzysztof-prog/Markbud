/**
 * SteelRwService - Automatyczne rozchody wewnętrzne (RW) dla stali
 *
 * Logika:
 * - Gdy zlecenie zostaje oznaczone jako "wyprodukowane" (status = completed),
 *   automatycznie zmniejsz stany magazynowe stali na podstawie OrderSteelRequirement
 * - Aktualizuj status OrderSteelRequirement na 'completed'
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { emitSteelRwProcessed, emitSteelStockUpdated } from './event-emitter.js';

interface RwProcessResult {
  orderId: number;
  orderNumber: string;
  processed: number;
  skipped: number;
  errors: Array<{ steelId: number; error: string }>;
}

export class SteelRwService {
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

    // Pobierz zlecenie z steel requirements
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        steelRequirements: {
          where: {
            status: { not: 'completed' }, // Tylko te które nie zostały jeszcze przetworzone
          },
          include: {
            steel: {
              select: {
                id: true,
                name: true,
                articleNumber: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for Steel RW processing', { orderId });
      return result;
    }

    result.orderNumber = order.orderNumber;

    // Sprawdz czy zlecenie ma status completed
    if (order.status !== 'completed') {
      logger.info('Order not completed, skipping Steel RW', { orderId, status: order.status });
      return result;
    }

    // Brak steel requirements do przetworzenia
    if (order.steelRequirements.length === 0) {
      logger.info('No pending steel requirements for order', { orderId, orderNumber: order.orderNumber });
      return result;
    }

    logger.info('Processing Steel RW for order', {
      orderId,
      orderNumber: order.orderNumber,
      requirementsCount: order.steelRequirements.length,
    });

    // Przetwórz każdy requirement w transakcji
    await this.prisma.$transaction(async (tx) => {
      for (const requirement of order.steelRequirements) {
        try {
          // Znajdź stan magazynowy dla stali
          const stock = await tx.steelStock.findFirst({
            where: {
              steelId: requirement.steelId,
              deletedAt: null,
            },
          });

          if (!stock) {
            // Brak stanu magazynowego - zgłoś błąd ale kontynuuj
            result.errors.push({
              steelId: requirement.steelId,
              error: `Brak stanu magazynowego dla stali ${requirement.steel.articleNumber}`,
            });
            result.skipped++;

            // Mimo braku stanu, oznacz requirement jako completed
            await tx.orderSteelRequirement.update({
              where: { id: requirement.id },
              data: { status: 'completed' },
            });
            continue;
          }

          const previousQty = stock.currentStockBeams;
          const changeQty = -requirement.beamsCount; // Ujemna wartość = rozchód
          const newQty = Math.max(0, previousQty + changeQty); // Nie dopuszczaj do ujemnych stanów

          // Aktualizuj stan magazynowy
          await tx.steelStock.update({
            where: { id: stock.id },
            data: {
              currentStockBeams: newQty,
              version: { increment: 1 },
              updatedById: userId ?? null,
            },
          });

          // Zapisz historię w SteelHistory
          await tx.steelHistory.create({
            data: {
              steelId: requirement.steelId,
              calculatedStock: newQty,
              actualStock: newQty,
              difference: 0,
              previousStock: previousQty,
              currentStock: newQty,
              changeType: 'rw',
              notes: `RW - Zlecenie ${order.orderNumber}, zmiana: ${changeQty}`,
              recordedById: userId ?? null,
            },
          });

          // Oznacz requirement jako completed
          await tx.orderSteelRequirement.update({
            where: { id: requirement.id },
            data: { status: 'completed' },
          });

          result.processed++;

          logger.debug('Processed Steel RW', {
            steelId: requirement.steelId,
            orderId,
            previousQty,
            changeQty,
            newQty,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          result.errors.push({
            steelId: requirement.steelId,
            error: errorMessage,
          });
          result.skipped++;
          logger.error('Failed to process Steel RW', {
            steelId: requirement.steelId,
            orderId,
            error: errorMessage,
          });
        }
      }
    });

    logger.info('Steel RW processing completed', {
      orderId,
      orderNumber: order.orderNumber,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    // Emituj event aby frontend mógł odświeżyć dane
    if (result.processed > 0) {
      emitSteelRwProcessed({
        orderId,
        orderNumber: order.orderNumber,
        processed: result.processed,
      });
      emitSteelStockUpdated({ source: 'rw', orderId });
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

    logger.info('Batch Steel RW processing completed', {
      ordersCount: orderIds.length,
      ...summary,
    });

    return results;
  }
}
