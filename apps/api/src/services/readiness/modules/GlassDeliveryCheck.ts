/**
 * Moduł sprawdzający: Dostawa szyb
 *
 * Sprawdza czy szyby są zamówione dla zleceń w dostawie.
 * Wystarczy że zamówienie istnieje - nie muszą być dostarczone.
 *
 * Reguły:
 * - Wszystkie zlecenia mają glassOrderStatus = 'complete', 'ordered', 'partial' → OK
 * - Nie wszystkie zlecenia mają zamówione szyby → WARNING
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult } from '../types';

export class GlassDeliveryCheck extends BaseReadinessCheckModule {
  name = 'glass_delivery' as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async check(deliveryId: number): Promise<ReadinessCheckResult> {
    // Pobierz wszystkie zlecenia przypisane do dostawy
    const deliveryOrders = await this.prisma.deliveryOrder.findMany({
      where: {
        deliveryId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            glassOrderStatus: true,
            status: true,
            totalGlasses: true,
          },
        },
      },
    });

    if (deliveryOrders.length === 0) {
      return this.blocking('Brak zleceń w dostawie - dostawa musi mieć przypisane zlecenia');
    }

    // Wyklucz zlecenia które nie potrzebują szyb (totalGlasses = 0, np. tylko wypełnienia/panele)
    const ordersNeedingGlass = deliveryOrders.filter(
      (do_) => (do_.order.totalGlasses ?? 0) > 0
    );
    const totalOrders = deliveryOrders.length;
    const ordersWithoutGlass = totalOrders - ordersNeedingGlass.length;

    if (ordersNeedingGlass.length === 0) {
      return this.ok('Żadne zlecenie nie wymaga szyb');
    }

    // Szyby zamówione (ordered/partial/complete) = OK
    const validStatuses = ['ordered', 'partial', 'complete'];
    const ordersWithGlassOrdered = ordersNeedingGlass.filter(
      (do_) => validStatuses.includes(do_.order.glassOrderStatus ?? '')
    );

    // Pobierz daty dostaw szyb dla zleceń w tej dostawie
    const orderNumbers = deliveryOrders.map((do_) => do_.order.orderNumber);
    const glassDeliveries = await this.prisma.glassDelivery.findMany({
      where: {
        items: {
          some: {
            orderNumber: {
              in: orderNumbers,
            },
          },
        },
      },
      select: {
        deliveryDate: true,
      },
      distinct: ['deliveryDate'],
      orderBy: {
        deliveryDate: 'asc',
      },
    });

    // Formatuj daty do stringa (YYYY-MM-DD format dla łatwego parsowania w frontend)
    const dates = glassDeliveries.map((gd) => gd.deliveryDate.toISOString().split('T')[0]);

    let message = `Szyby zamówione: ${ordersWithGlassOrdered.length}/${ordersNeedingGlass.length}`;
    if (ordersWithoutGlass > 0) {
      message += ` (${ordersWithoutGlass} bez szyb)`;
    }
    if (dates.length > 0) {
      message += ` | DATES:${dates.join(',')}`;
    }

    if (ordersWithGlassOrdered.length < ordersNeedingGlass.length) {
      return this.warning(message);
    }

    return this.ok(message);
  }

}
