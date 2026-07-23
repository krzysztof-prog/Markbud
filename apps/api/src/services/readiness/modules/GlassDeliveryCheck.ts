/**
 * Moduł sprawdzający: Dostawa szyb
 *
 * Sprawdza czy szyby są zamówione/dostarczone dla zleceń w dostawie.
 *
 * Reguły:
 * - Zlecenie ma deliveredGlassCount >= totalGlasses → szyby dostarczone (OK)
 * - Zlecenie ma glassOrderStatus = 'complete', 'ordered', 'partial' → szyby zamówione (OK)
 * - Nie wszystkie zlecenia mają zamówione/dostarczone szyby → WARNING
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
            glassDeliveryDate: true,
            status: true,
            totalGlasses: true,
            deliveredGlassCount: true,
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

    // Szyby dostarczone lub zamówione = OK
    const validStatuses = ['ordered', 'partial', 'complete'];
    const ordersWithGlassOrdered = ordersNeedingGlass.filter(
      (do_) => {
        // Szyby już dostarczone — zawsze OK
        const delivered = do_.order.deliveredGlassCount ?? 0;
        const total = do_.order.totalGlasses ?? 0;
        if (delivered >= total && total > 0) return true;
        // Szyby zamówione (status)
        return validStatuses.includes(do_.order.glassOrderStatus ?? '');
      }
    );

    // Sprawdź czy WSZYSTKIE szyby już dostarczone
    const allDelivered = ordersNeedingGlass.every((do_) => {
      const delivered = do_.order.deliveredGlassCount ?? 0;
      const total = do_.order.totalGlasses ?? 0;
      return delivered >= total && total > 0;
    });

    // Zbierz oczekiwane daty dostaw tylko z zleceń które jeszcze czekają na szyby
    const pendingDates = ordersNeedingGlass
      .filter((do_) => {
        const delivered = do_.order.deliveredGlassCount ?? 0;
        const total = do_.order.totalGlasses ?? 0;
        return !(delivered >= total && total > 0);
      })
      .map((do_) => do_.order.glassDeliveryDate)
      .filter((d): d is Date => d != null);

    // Unikalne daty posortowane rosnąco
    const uniqueDates = [...new Set(pendingDates.map((d) => d.toISOString().split('T')[0]))]
      .sort();

    let message = `Szyby zamówione: ${ordersWithGlassOrdered.length}/${ordersNeedingGlass.length}`;
    if (ordersWithoutGlass > 0) {
      message += ` (${ordersWithoutGlass} bez szyb)`;
    }
    // Daty tylko gdy są zlecenia czekające na dostawę szyb
    if (!allDelivered && uniqueDates.length > 0) {
      message += ` | DATES:${uniqueDates.join(',')}`;
    }

    if (ordersWithGlassOrdered.length < ordersNeedingGlass.length) {
      return this.warning(message);
    }

    return this.ok(message);
  }

}
