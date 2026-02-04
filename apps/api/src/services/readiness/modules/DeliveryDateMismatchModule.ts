/**
 * Moduł sprawdzający: Zgodność dat dostawy
 *
 * Sprawdza czy daty dostawy przypisane do zleceń (Order.deliveryDate)
 * zgadzają się z datą dostawy listy mailowej (LogisticsMailList.deliveryDate).
 *
 * BLOKUJE dostawę jeśli jakiekolwiek zlecenie ma inną datę niż lista mailowa.
 *
 * Reguły:
 * - Brak listy mailowej → OK (nic do porównania)
 * - Wszystkie zlecenia mają tę samą datę co lista → OK
 * - Zlecenie bez daty dostawy → OK (pomijamy)
 * - Jakiekolwiek zlecenie ma inną datę → BLOCKING
 *
 * Format detali: "D1234: data 15.02 ≠ lista 12.02"
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class DeliveryDateMismatchModule extends BaseReadinessCheckModule {
  name = 'delivery_date_mismatch' as const;

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

    // Brak listy mailowej - nie ma czego porównywać
    if (!mailList) {
      return this.ok('Brak listy mailowej - nie wymaga weryfikacji dat');
    }

    // Data dostawy z listy mailowej
    const mailListDate = mailList.deliveryDate;

    // Znajdź zlecenia z niezgodną datą
    const mismatchedItems: Array<{
      projectNumber: string;
      orderId: number;
      orderNumber: string;
      orderDeliveryDate: Date;
      mailListDeliveryDate: Date;
    }> = [];

    for (const item of mailList.items) {
      if (!item.order || !item.order.deliveryDate) {
        // Zlecenie bez daty - pomijamy
        continue;
      }

      // Porównaj daty (tylko dzień, bez godziny)
      const orderDate = this.normalizeDate(item.order.deliveryDate);
      const listDate = this.normalizeDate(mailListDate);

      if (orderDate.getTime() !== listDate.getTime()) {
        mismatchedItems.push({
          projectNumber: item.projectNumber,
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          orderDeliveryDate: item.order.deliveryDate,
          mailListDeliveryDate: mailListDate,
        });
      }
    }

    // Jeśli są niezgodności - BLOKUJ
    if (mismatchedItems.length > 0) {
      const details: ReadinessCheckDetail[] = mismatchedItems.map((item) => ({
        itemId: item.projectNumber,
        orderId: item.orderId,
        reason: this.formatMismatchReason(item.orderDeliveryDate, item.mailListDeliveryDate),
      }));

      return this.blocking(
        `${mismatchedItems.length} zleceń ma inną datę dostawy niż lista mailowa`,
        details
      );
    }

    // Policz ile zleceń zostało sprawdzonych
    const checkedCount = mailList.items.filter((i) => i.order?.deliveryDate).length;
    if (checkedCount === 0) {
      return this.ok('Brak zleceń z datą dostawy do weryfikacji');
    }

    // Wszystko OK
    return this.ok(`Wszystkie ${checkedCount} zleceń ma zgodną datę dostawy`);
  }

  /**
   * Normalizuje datę do początku dnia (00:00:00) w UTC
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Formatuje powód niezgodności: "data 15.02 ≠ lista 12.02"
   */
  private formatMismatchReason(orderDate: Date, listDate: Date): string {
    const orderDateStr = this.formatDateShort(orderDate);
    const listDateStr = this.formatDateShort(listDate);
    return `data ${orderDateStr} ≠ lista ${listDateStr}`;
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
