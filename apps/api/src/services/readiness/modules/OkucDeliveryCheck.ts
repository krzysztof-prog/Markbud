/**
 * Moduł sprawdzający: Dostawa okuć
 *
 * Sprawdza czy wszystkie zlecenia w dostawie mają dostarczone okucia.
 * OSTRZEGA (nie blokuje) jeśli okucia nie są dostarczone.
 *
 * Reguły:
 * - Wszystkie zlecenia mają okucDemandStatus odpowiedni → OK
 * - Jakiekolwiek zlecenie ma 'pending' lub 'has_atypical' → WARNING
 * - Zlecenie nie potrzebuje okuć (okucDemandStatus = 'none') → OK
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class OkucDeliveryCheck extends BaseReadinessCheckModule {
  name = 'okuc_delivery' as const;

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
            okucDemandStatus: true,
            status: true,
          },
        },
      },
    });

    if (deliveryOrders.length === 0) {
      return this.blocking('Brak zleceń w dostawie - dostawa musi mieć przypisane zlecenia');
    }

    // Filtruj zlecenia które potrzebują okuć (okucDemandStatus != 'none' i != null)
    const ordersNeedingOkuc = deliveryOrders.filter(
      (do_) =>
        do_.order.okucDemandStatus !== null &&
        do_.order.okucDemandStatus !== 'none'
    );

    if (ordersNeedingOkuc.length === 0) {
      return this.ok('Żadne zlecenie nie wymaga okuć');
    }

    // Sprawdź które zlecenia mają problemy z okuciami
    const ordersWithOkucIssues = ordersNeedingOkuc.filter(
      (do_) =>
        do_.order.okucDemandStatus === 'pending' ||
        do_.order.okucDemandStatus === 'has_atypical'
    );

    if (ordersWithOkucIssues.length > 0) {
      const details: ReadinessCheckDetail[] = ordersWithOkucIssues.map((do_) => ({
        itemId: do_.order.orderNumber,
        orderId: do_.order.id,
        reason: this.getOkucStatusReason(do_.order.okucDemandStatus),
      }));

      // OSTRZEŻENIE (nie blokada) - zgodnie z zatwierdzonymi regułami
      return this.warning(
        `${ordersWithOkucIssues.length} zleceń z problemami z okuciami`,
        details
      );
    }

    // Wszystkie okucia OK
    const importedCount = ordersNeedingOkuc.filter(
      (do_) => do_.order.okucDemandStatus === 'imported'
    ).length;

    return this.ok(`Okucia zaimportowane: ${importedCount}/${ordersNeedingOkuc.length}`);
  }

  private getOkucStatusReason(status: string | null): string {
    switch (status) {
      case 'pending':
        return 'Okucia oczekują na import';
      case 'has_atypical':
        return 'Zawiera atypowe okucia';
      case 'imported':
        return 'Okucia zaimportowane';
      default:
        return 'Brak informacji o okuciach';
    }
  }
}
