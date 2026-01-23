/**
 * Moduł sprawdzający: Status zleceń
 *
 * Sprawdza czy wszystkie zlecenia w dostawie są zakończone.
 * OSTRZEGA (nie blokuje) jeśli są niezakończone zlecenia.
 *
 * Reguły:
 * - Wszystkie zlecenia mają status 'completed' → OK
 * - Jakiekolwiek zlecenie ma status 'in_progress' → WARNING
 * - Jakiekolwiek zlecenie ma status 'new' → WARNING
 * - Zlecenie ma status 'archived' lub 'cancelled' → ignorowane
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class OrdersCompletedCheck extends BaseReadinessCheckModule {
  name = 'orders_completed' as const;

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
            status: true,
          },
        },
      },
    });

    if (deliveryOrders.length === 0) {
      return this.blocking('Brak zleceń w dostawie - dostawa musi mieć przypisane zlecenia');
    }

    // Filtruj aktywne zlecenia (nie archived, nie cancelled)
    const activeOrders = deliveryOrders.filter(
      (do_) =>
        do_.order.status !== 'archived' &&
        do_.order.status !== 'cancelled'
    );

    if (activeOrders.length === 0) {
      return this.ok('Wszystkie zlecenia zarchiwizowane lub anulowane');
    }

    // Sprawdź które zlecenia nie są zakończone
    const incompleteOrders = activeOrders.filter(
      (do_) => do_.order.status !== 'completed'
    );

    if (incompleteOrders.length > 0) {
      const details: ReadinessCheckDetail[] = incompleteOrders.map((do_) => ({
        itemId: do_.order.orderNumber,
        orderId: do_.order.id,
        reason: this.getOrderStatusReason(do_.order.status),
      }));

      // OSTRZEŻENIE (nie blokada) - zgodnie z zatwierdzonymi regułami
      return this.warning(
        `${incompleteOrders.length} zleceń niezakończonych`,
        details
      );
    }

    // Wszystkie zlecenia zakończone
    const completedCount = activeOrders.filter(
      (do_) => do_.order.status === 'completed'
    ).length;

    return this.ok(`Wszystkie zlecenia zakończone: ${completedCount}/${activeOrders.length}`);
  }

  private getOrderStatusReason(status: string): string {
    switch (status) {
      case 'new':
        return 'Zlecenie nowe - nie rozpoczęte';
      case 'in_progress':
        return 'Zlecenie w trakcie realizacji';
      case 'on_hold':
        return 'Zlecenie wstrzymane';
      default:
        return `Status: ${status}`;
    }
  }
}
