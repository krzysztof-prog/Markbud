/**
 * OkucOrderStatusScheduler - Automatyczna zmiana statusu zamówień OKUC
 *
 * Codziennie o 6:00 rano sprawdza zamówienia z expectedDeliveryDate w przeszłości
 * i zmienia ich status na 'received', dodając okucia na magazyn.
 *
 * Wzór: SoftDeleteCleanupScheduler (node-cron, singleton, start/stop)
 */

import cron, { ScheduledTask } from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { emitOkucOrderUpdated, emitOkucStockUpdated } from '../event-emitter.js';

export class OkucOrderStatusScheduler {
  private prisma: PrismaClient;
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Uruchom scheduler - codziennie o 6:00 rano (Europe/Warsaw)
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[OkucOrderStatusScheduler] Scheduler już działa');
      return;
    }

    logger.info('[OkucOrderStatusScheduler] Uruchamianie schedulera...');

    // Cron: "0 6 * * *" = codziennie o 6:00
    this.task = cron.schedule('0 6 * * *', () => this.processOverdueOrders(), {
      timezone: 'Europe/Warsaw',
    });

    this.isRunning = true;
    logger.info('[OkucOrderStatusScheduler] Scheduler uruchomiony. Sprawdzanie codziennie o 6:00 (Europe/Warsaw)');
  }

  /**
   * Zatrzymaj scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[OkucOrderStatusScheduler] Scheduler nie działa');
      return;
    }

    logger.info('[OkucOrderStatusScheduler] Zatrzymywanie schedulera...');

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;
    logger.info('[OkucOrderStatusScheduler] Scheduler zatrzymany');
  }

  /**
   * Główna logika: znajdź zamówienia z przeszłą datą dostawy i zmień status na 'received'
   */
  async processOverdueOrders(): Promise<{ updatedCount: number; errors: string[] }> {
    logger.info('[OkucOrderStatusScheduler] Rozpoczynam sprawdzanie zamówień...');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const errors: string[] = [];
    let updatedCount = 0;

    try {
      // Znajdź zamówienia: status w trakcie realizacji + data dostawy w przeszłości
      const overdueOrders = await this.prisma.okucOrder.findMany({
        where: {
          status: { in: ['sent', 'confirmed', 'in_transit'] },
          expectedDeliveryDate: { lt: today },
          deletedAt: null,
        },
        include: {
          items: {
            select: {
              articleId: true,
              orderedQty: true,
            },
          },
        },
      });

      if (overdueOrders.length === 0) {
        logger.debug('[OkucOrderStatusScheduler] Brak zamówień do aktualizacji');
        return { updatedCount: 0, errors: [] };
      }

      logger.info(`[OkucOrderStatusScheduler] Znaleziono ${overdueOrders.length} zamówień do aktualizacji`);

      // Przetwarzaj każde zamówienie w osobnej transakcji (żeby błąd jednego nie blokował reszty)
      for (const order of overdueOrders) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Ustaw status = 'received' i actualDeliveryDate = expectedDeliveryDate
            await tx.okucOrder.update({
              where: { id: order.id },
              data: {
                status: 'received',
                actualDeliveryDate: order.expectedDeliveryDate,
                updatedAt: new Date(),
              },
            });

            // Dla każdego itemu: receivedQty = orderedQty + aktualizacja stocku
            for (const item of order.items) {
              // Ustaw receivedQty
              await tx.okucOrderItem.updateMany({
                where: { okucOrderId: order.id, articleId: item.articleId },
                data: { receivedQty: item.orderedQty },
              });

              // Zaktualizuj stock
              const updateResult = await tx.okucStock.updateMany({
                where: { articleId: item.articleId },
                data: {
                  currentQuantity: { increment: item.orderedQty },
                  updatedAt: new Date(),
                },
              });

              // Stwórz wpis historii
              const stock = await tx.okucStock.findFirst({
                where: { articleId: item.articleId },
              });

              if (stock) {
                await tx.okucHistory.create({
                  data: {
                    articleId: item.articleId,
                    warehouseType: stock.warehouseType,
                    subWarehouse: stock.subWarehouse,
                    eventType: 'order_received',
                    previousQty: stock.currentQuantity - item.orderedQty,
                    changeQty: item.orderedQty,
                    newQty: stock.currentQuantity,
                    reference: order.orderNumber,
                  },
                });
              } else if (updateResult.count === 0) {
                logger.warn('[OkucOrderStatusScheduler] Brak rekordu OkucStock dla artykułu', {
                  articleId: item.articleId,
                  orderNumber: order.orderNumber,
                });
              }
            }
          });

          updatedCount++;

          // Emituj WebSocket event (poza transakcją)
          emitOkucOrderUpdated({
            id: order.id,
            orderNumber: order.orderNumber,
            status: 'received',
            autoReceived: true,
          });

        } catch (error) {
          const errMsg = `Błąd przy aktualizacji zamówienia ${order.orderNumber}: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(`[OkucOrderStatusScheduler] ${errMsg}`);
          errors.push(errMsg);
        }
      }

      // Emituj zbiorczy event o aktualizacji stocku (jeśli coś się zmieniło)
      if (updatedCount > 0) {
        emitOkucStockUpdated({ schedulerUpdated: updatedCount });
      }

      logger.info(`[OkucOrderStatusScheduler] Zakończono. Zaktualizowano ${updatedCount}/${overdueOrders.length} zamówień`, {
        errors: errors.length > 0 ? errors : undefined,
      });

    } catch (error) {
      const errMsg = `Błąd ogólny schedulera: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`[OkucOrderStatusScheduler] ${errMsg}`);
      errors.push(errMsg);
    }

    return { updatedCount, errors };
  }

  /**
   * Status schedulera
   */
  getStatus(): { isRunning: boolean; scheduledTime: string | null } {
    return {
      isRunning: this.isRunning,
      scheduledTime: this.isRunning ? 'Codziennie o 6:00 (Europe/Warsaw)' : null,
    };
  }
}

// Singleton
let schedulerInstance: OkucOrderStatusScheduler | null = null;

export function getOkucOrderStatusScheduler(prisma: PrismaClient): OkucOrderStatusScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new OkucOrderStatusScheduler(prisma);
  }
  return schedulerInstance;
}

export function startOkucOrderStatusScheduler(prisma: PrismaClient): void {
  const scheduler = getOkucOrderStatusScheduler(prisma);
  scheduler.start();
}

export function stopOkucOrderStatusScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
