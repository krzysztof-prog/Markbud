/**
 * Moduł sprawdzający: Brakująca data dostawy
 *
 * Sprawdza czy zlecenia przypisane do pozycji na liście mailowej
 * mają ustawioną datę dostawy (Order.deliveryDate).
 *
 * BLOKUJE dostawę jeśli jakiekolwiek zlecenie nie ma ustawionej daty dostawy.
 *
 * Reguły:
 * - Brak listy mailowej → OK (nic do sprawdzenia)
 * - Wszystkie zlecenia mają datę → OK
 * - Jakiekolwiek zlecenie bez daty → BLOCKING
 *
 * Format detali: "D1234: brak daty dostawy - ustaw DD.MM"
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class MissingDeliveryDateModule extends BaseReadinessCheckModule {
  name = 'missing_delivery_date' as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async check(deliveryId: number): Promise<ReadinessCheckResult> {
    // Znajdź najnowszą listę mailową powiązaną z dostawą
    const mailList = await this.prisma.logisticsMailList.findFirst({
      where: {
        deliveryId,
        deletedAt: null,
      },
      orderBy: {
        version: 'desc',
      },
      include: {
        items: {
          where: {
            deletedAt: null,
            orderId: { not: null }, // Tylko pozycje z przypisanym zleceniem
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                deliveryDate: true,
              },
            },
          },
        },
      },
    });

    // Brak listy mailowej - nie ma czego sprawdzać
    if (!mailList) {
      return this.ok('Brak listy mailowej - nie wymaga weryfikacji');
    }

    // Data dostawy z listy mailowej (do sugestii)
    const suggestedDate = this.formatDateShort(mailList.deliveryDate);

    // Znajdź zlecenia bez daty dostawy
    const missingDateItems: Array<{
      projectNumber: string;
      orderId: number;
      orderNumber: string;
    }> = [];

    for (const item of mailList.items) {
      if (!item.order) {
        continue;
      }

      // Sprawdź czy zlecenie ma datę dostawy
      if (!item.order.deliveryDate) {
        missingDateItems.push({
          projectNumber: item.projectNumber,
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
        });
      }
    }

    // Jeśli są zlecenia bez daty - BLOKUJ
    if (missingDateItems.length > 0) {
      const details: ReadinessCheckDetail[] = missingDateItems.map((item) => ({
        itemId: item.projectNumber,
        orderId: item.orderId,
        reason: `Brak daty dostawy - ustaw ${suggestedDate}`,
      }));

      return this.blocking(
        `${missingDateItems.length} zleceń nie ma ustawionej daty dostawy`,
        details
      );
    }

    // Policz ile zleceń zostało sprawdzonych
    const checkedCount = mailList.items.filter((i) => i.order).length;
    if (checkedCount === 0) {
      return this.ok('Brak zleceń do weryfikacji');
    }

    // Wszystko OK
    return this.ok(`Wszystkie ${checkedCount} zleceń ma datę dostawy`);
  }

  /**
   * Formatuje datę do krótkiej formy: "15.02"
   */
  private formatDateShort(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }
}
