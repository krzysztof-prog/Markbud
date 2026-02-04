/**
 * Moduł sprawdzający: Dostawa szyb
 *
 * Sprawdza czy szyby są zamówione dla zleceń w dostawie.
 * Wystarczy że zamówienie istnieje - nie muszą być dostarczone.
 *
 * Reguły:
 * - glassOrderStatus = 'complete', 'ordered', 'partial' → OK (zamówione)
 * - glassOrderStatus = null lub 'not_ordered' → OK (nie potrzebuje szyb)
 * - Inne statusy → WARNING
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
          },
        },
      },
    });

    if (deliveryOrders.length === 0) {
      return this.blocking('Brak zleceń w dostawie - dostawa musi mieć przypisane zlecenia');
    }

    // Filtruj zlecenia które potrzebują szyb (glassOrderStatus != null i != 'not_ordered')
    const ordersNeedingGlass = deliveryOrders.filter(
      (do_) =>
        do_.order.glassOrderStatus !== null &&
        do_.order.glassOrderStatus !== 'not_ordered'
    );

    if (ordersNeedingGlass.length === 0) {
      return this.ok('Żadne zlecenie nie wymaga szyb');
    }

    // Szyby zamówione (ordered/partial/complete) = OK
    const validStatuses = ['ordered', 'partial', 'complete'];
    const ordersWithGlassOrdered = ordersNeedingGlass.filter(
      (do_) => validStatuses.includes(do_.order.glassOrderStatus ?? '')
    );

    return this.ok(`Szyby zamówione: ${ordersWithGlassOrdered.length}/${ordersNeedingGlass.length}`);
  }

}
