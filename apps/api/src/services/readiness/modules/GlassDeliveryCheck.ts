/**
 * Moduł sprawdzający: Dostawa szyb
 *
 * Sprawdza czy wszystkie zlecenia w dostawie mają dostarczone szyby.
 * BLOKUJE dostawę jeśli jakiekolwiek zlecenie nie ma szyb.
 *
 * Reguły:
 * - Wszystkie zlecenia mają glassOrderStatus = 'complete' → OK
 * - Jakiekolwiek zlecenie ma 'ordered' lub 'partial' → BLOCKING
 * - Zlecenie nie potrzebuje szyb (glassOrderStatus = null) → OK
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

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

    // Sprawdź które zlecenia nie mają dostarczonych szyb
    const ordersWithoutGlass = ordersNeedingGlass.filter(
      (do_) => do_.order.glassOrderStatus !== 'complete'
    );

    if (ordersWithoutGlass.length > 0) {
      const details: ReadinessCheckDetail[] = ordersWithoutGlass.map((do_) => ({
        itemId: do_.order.orderNumber,
        orderId: do_.order.id,
        reason: this.getGlassStatusReason(do_.order.glassOrderStatus),
      }));

      return this.blocking(
        `${ordersWithoutGlass.length} zleceń bez dostarczonych szyb`,
        details
      );
    }

    // Wszystkie szyby dostarczone
    const completedCount = ordersNeedingGlass.filter(
      (do_) => do_.order.glassOrderStatus === 'complete'
    ).length;

    return this.ok(`Szyby dostarczone: ${completedCount}/${ordersNeedingGlass.length}`);
  }

  private getGlassStatusReason(status: string | null): string {
    switch (status) {
      case 'ordered':
        return 'Szyby zamówione - oczekuje na dostawę';
      case 'partial':
        return 'Częściowa dostawa szyb';
      case 'not_ordered':
        return 'Szyby nie zamówione';
      default:
        return 'Brak informacji o szybach';
    }
  }
}
