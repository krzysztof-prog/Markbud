/**
 * OkucRwService - Automatyczne rozchody wewnętrzne (RW) dla okuć
 *
 * Logika:
 * - Gdy zlecenie zostaje oznaczone jako "wyprodukowane" (status = completed),
 *   automatycznie zmniejsz stany magazynowe okuć na podstawie OkucDemand
 * - Zapisz historię zmian w OkucHistory z eventType = 'rw'
 * - Aktualizuj status OkucDemand na 'completed'
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { emitOkucRwProcessed, emitOkucStockUpdated } from '../event-emitter.js';

interface RwProcessResult {
  orderId: number;
  orderNumber: string;
  processed: number;
  skipped: number;
  errors: Array<{ articleId: string; error: string }>;
}

export class OkucRwService {
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

    // Pobierz zlecenie z demandem
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        system: true, // np. "PVC" lub "ALU" - określa typ magazynu
        okucDemands: {
          where: {
            deletedAt: null,
            status: { not: 'completed' }, // Tylko te które nie zostały jeszcze przetworzone
          },
          include: {
            article: {
              select: {
                id: true,
                articleId: true,
                name: true,
                usedInPvc: true,
                usedInAlu: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for RW processing', { orderId });
      return result;
    }

    result.orderNumber = order.orderNumber;

    // Sprawdz czy zlecenie ma status completed
    if (order.status !== 'completed') {
      logger.info('Order not completed, skipping RW', { orderId, status: order.status });
      return result;
    }

    // Brak demands do przetworzenia
    if (order.okucDemands.length === 0) {
      logger.info('No pending demands for order', { orderId, orderNumber: order.orderNumber });
      return result;
    }

    // Określ typ magazynu na podstawie systemu zlecenia
    const warehouseType = this.determineWarehouseType(order.system);

    logger.info('Processing RW for order', {
      orderId,
      orderNumber: order.orderNumber,
      warehouseType,
      demandsCount: order.okucDemands.length,
    });

    // Przetwórz każdy demand w transakcji
    await this.prisma.$transaction(async (tx) => {
      for (const demand of order.okucDemands) {
        try {
          // Znajdź stan magazynowy dla artykułu
          // Używamy głównego magazynu (bez subWarehouse)
          const stock = await tx.okucStock.findFirst({
            where: {
              articleId: demand.articleId,
              warehouseType,
              // Bierzemy główny magazyn (production lub null)
              OR: [
                { subWarehouse: null },
                { subWarehouse: 'production' },
              ],
            },
            orderBy: {
              // Preferuj production nad null
              subWarehouse: 'desc',
            },
          });

          if (!stock) {
            // Brak stanu magazynowego - zgłoś błąd ale kontynuuj
            result.errors.push({
              articleId: demand.article.articleId,
              error: `Brak stanu magazynowego dla ${warehouseType.toUpperCase()}`,
            });
            result.skipped++;
            continue;
          }

          const previousQty = stock.currentQuantity;
          const changeQty = -demand.quantity; // Ujemna wartość = rozchód
          const newQty = Math.max(0, previousQty + changeQty); // Nie dopuszczaj do ujemnych stanów

          // Aktualizuj stan magazynowy
          await tx.okucStock.update({
            where: { id: stock.id },
            data: {
              currentQuantity: newQty,
              version: { increment: 1 },
              updatedById: userId ?? null,
            },
          });

          // Zapisz historię
          await tx.okucHistory.create({
            data: {
              articleId: demand.articleId,
              warehouseType,
              subWarehouse: stock.subWarehouse,
              eventType: 'rw',
              previousQty,
              changeQty,
              newQty,
              reason: `RW - Zlecenie ${order.orderNumber}`,
              reference: `ORDER:${order.id}`,
              isManualEdit: false,
              recordedById: userId ?? null,
            },
          });

          // Oznacz demand jako completed
          await tx.okucDemand.update({
            where: { id: demand.id },
            data: {
              status: 'completed',
              updatedAt: new Date(),
            },
          });

          result.processed++;

          logger.debug('Processed RW for article', {
            articleId: demand.article.articleId,
            orderId,
            previousQty,
            changeQty,
            newQty,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          result.errors.push({
            articleId: demand.article.articleId,
            error: errorMessage,
          });
          result.skipped++;
          logger.error('Failed to process RW for article', {
            articleId: demand.article.articleId,
            orderId,
            error: errorMessage,
          });
        }
      }
    });

    logger.info('RW processing completed', {
      orderId,
      orderNumber: order.orderNumber,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    // Emituj event aby frontend mógł odświeżyć dane
    if (result.processed > 0) {
      emitOkucRwProcessed({
        orderId,
        orderNumber: order.orderNumber,
        processed: result.processed,
        warehouseType,
      });
      emitOkucStockUpdated({ source: 'rw', orderId });
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

    logger.info('Batch RW processing completed', {
      ordersCount: orderIds.length,
      ...summary,
    });

    return results;
  }

  /**
   * Określ typ magazynu na podstawie systemu zlecenia
   * Domyślnie PVC jeśli nie określono
   */
  private determineWarehouseType(system: string | null): string {
    if (!system) {
      return 'pvc';
    }

    const systemLower = system.toLowerCase();

    // Sprawdź czy system zawiera ALU/ALUPROF/ALUMINIUM itp.
    if (
      systemLower.includes('alu') ||
      systemLower.includes('aluminum') ||
      systemLower.includes('aluminium')
    ) {
      return 'alu';
    }

    // Domyślnie PVC
    return 'pvc';
  }

  /**
   * Cofnij RW dla zlecenia (np. gdy zlecenie zostanie cofnięte do poprzedniego statusu)
   * Używaj ostrożnie - tylko gdy naprawdę trzeba cofnąć produkcję
   */
  async reverseRwForOrder(orderId: number, userId?: number): Promise<RwProcessResult> {
    const result: RwProcessResult = {
      orderId,
      orderNumber: '',
      processed: 0,
      skipped: 0,
      errors: [],
    };

    // Znajdź wszystkie wpisy historii RW dla tego zlecenia
    const historyEntries = await this.prisma.okucHistory.findMany({
      where: {
        reference: `ORDER:${orderId}`,
        eventType: 'rw',
      },
      include: {
        article: {
          select: {
            id: true,
            articleId: true,
            name: true,
          },
        },
      },
    });

    if (historyEntries.length === 0) {
      logger.info('No RW history to reverse for order', { orderId });
      return result;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    result.orderNumber = order?.orderNumber || '';

    await this.prisma.$transaction(async (tx) => {
      for (const entry of historyEntries) {
        try {
          // Znajdź aktualny stan magazynowy
          const stock = await tx.okucStock.findFirst({
            where: {
              articleId: entry.articleId,
              warehouseType: entry.warehouseType,
              subWarehouse: entry.subWarehouse,
            },
          });

          if (!stock) {
            result.errors.push({
              articleId: entry.article.articleId,
              error: 'Brak stanu magazynowego do cofnięcia',
            });
            result.skipped++;
            continue;
          }

          // Cofnij zmianę (dodaj to co zostało odjęte)
          const reverseQty = -entry.changeQty; // changeQty było ujemne, więc to będzie dodatnie
          const newQty = stock.currentQuantity + reverseQty;

          await tx.okucStock.update({
            where: { id: stock.id },
            data: {
              currentQuantity: newQty,
              version: { increment: 1 },
              updatedById: userId ?? null,
            },
          });

          // Zapisz historię cofnięcia
          await tx.okucHistory.create({
            data: {
              articleId: entry.articleId,
              warehouseType: entry.warehouseType,
              subWarehouse: entry.subWarehouse,
              eventType: 'return',
              previousQty: stock.currentQuantity,
              changeQty: reverseQty,
              newQty,
              reason: `Cofnięcie RW - Zlecenie ${result.orderNumber}`,
              reference: `ORDER:${orderId}:REVERSE`,
              isManualEdit: false,
              recordedById: userId ?? null,
            },
          });

          result.processed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
          result.errors.push({
            articleId: entry.article.articleId,
            error: errorMessage,
          });
          result.skipped++;
        }
      }

      // Cofnij status demands na 'pending'
      await tx.okucDemand.updateMany({
        where: {
          orderId,
          status: 'completed',
          deletedAt: null,
        },
        data: {
          status: 'pending',
        },
      });
    });

    logger.info('RW reversal completed', {
      orderId,
      orderNumber: result.orderNumber,
      processed: result.processed,
      skipped: result.skipped,
    });

    return result;
  }
}
