/**
 * Schuco Link Service
 * Automatyczne powiązywanie zleceń z dostawami Schuco
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

export class SchucoLinkService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Automatycznie powiąż zlecenie z czekającymi dostawami Schuco
   * Wywołuje się po utworzeniu lub aktualizacji zlecenia
   *
   * @param orderNumber - numer zlecenia (np. "53714")
   * @returns liczba utworzonych linków
   */
  async linkOrderToWaitingDeliveries(orderNumber: string): Promise<number> {
    logger.info(`[SchucoLinkService] Checking for waiting Schuco deliveries for order ${orderNumber}`);

    try {
      // Znajdź zlecenie w bazie
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true, orderNumber: true },
      });

      if (!order) {
        logger.warn(`[SchucoLinkService] Order ${orderNumber} not found in database`);
        return 0;
      }

      // Znajdź dostawy Schuco zawierające ten numer zlecenia w extractedOrderNums
      const deliveries = await this.prisma.schucoDelivery.findMany({
        where: {
          extractedOrderNums: {
            contains: `"${orderNumber}"`, // JSON array contains check
          },
          isWarehouseItem: false, // Tylko dostawy projektowe
        },
        select: {
          id: true,
          orderNumber: true,
          deliveryWeek: true,
          shippingStatus: true,
        },
      });

      if (deliveries.length === 0) {
        logger.info(`[SchucoLinkService] No waiting Schuco deliveries found for order ${orderNumber}`);
        return 0;
      }

      logger.info(`[SchucoLinkService] Found ${deliveries.length} waiting deliveries for order ${orderNumber}`);

      let linksCreated = 0;

      for (const delivery of deliveries) {
        try {
          // Sprawdź czy link już istnieje
          const existingLink = await this.prisma.orderSchucoLink.findFirst({
            where: {
              orderId: order.id,
              schucoDeliveryId: delivery.id,
            },
          });

          if (existingLink) {
            logger.debug(`[SchucoLinkService] Link already exists: Order ${orderNumber} <-> Delivery ${delivery.id}`);
            continue;
          }

          // Utwórz link
          await this.prisma.orderSchucoLink.create({
            data: {
              orderId: order.id,
              schucoDeliveryId: delivery.id,
              linkedBy: 'auto',
            },
          });

          linksCreated++;
          logger.info(
            `[SchucoLinkService] Created link: Order ${orderNumber} (id=${order.id}) <-> ` +
            `Delivery ${delivery.orderNumber} (id=${delivery.id}, status=${delivery.shippingStatus}, week=${delivery.deliveryWeek})`
          );
        } catch (error) {
          logger.error(
            `[SchucoLinkService] Failed to create link for Order ${orderNumber} <-> Delivery ${delivery.id}:`,
            error
          );
        }
      }

      if (linksCreated > 0) {
        logger.info(`[SchucoLinkService] Successfully created ${linksCreated} link(s) for order ${orderNumber}`);
      }

      return linksCreated;
    } catch (error) {
      logger.error(`[SchucoLinkService] Error linking order ${orderNumber}:`, error);
      return 0;
    }
  }

  /**
   * Powiąż wiele zleceń z czekającymi dostawami Schuco (batch operation)
   *
   * @param orderNumbers - tablica numerów zleceń
   * @returns liczba utworzonych linków
   */
  async linkMultipleOrdersToWaitingDeliveries(orderNumbers: string[]): Promise<number> {
    logger.info(`[SchucoLinkService] Batch linking ${orderNumbers.length} orders to waiting deliveries`);

    let totalLinksCreated = 0;

    for (const orderNumber of orderNumbers) {
      const links = await this.linkOrderToWaitingDeliveries(orderNumber);
      totalLinksCreated += links;
    }

    logger.info(`[SchucoLinkService] Batch operation complete: ${totalLinksCreated} total links created`);
    return totalLinksCreated;
  }
}
