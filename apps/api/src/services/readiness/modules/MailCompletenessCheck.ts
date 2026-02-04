/**
 * Moduł sprawdzający: Kompletność listy mailowej
 *
 * Sprawdza czy LogisticsMailList powiązana z dostawą ma wszystkie pozycje OK.
 * BLOKUJE dostawę jeśli jakikolwiek item ma status 'blocked'.
 *
 * Reguły:
 * - Brak listy mailowej → OK (lista opcjonalna)
 * - Wszystkie items 'ok' lub 'excluded' → OK
 * - Jakikolwiek item 'blocked' → BLOCKING
 * - Jakikolwiek item 'waiting' (bez blocked) → WARNING
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class MailCompletenessCheck extends BaseReadinessCheckModule {
  name = 'mail_completeness' as const;

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
          },
        },
      },
    });

    // Brak listy mailowej - nie blokujemy (lista opcjonalna)
    if (!mailList) {
      return this.ok('Brak listy mailowej - nie wymaga weryfikacji');
    }

    // Sprawdź statusy itemów
    const blockedItems = mailList.items.filter((item) => item.itemStatus === 'blocked');
    const waitingItems = mailList.items.filter((item) => item.itemStatus === 'waiting');

    // Jakikolwiek blocked = BLOKUJE
    if (blockedItems.length > 0) {
      const details: ReadinessCheckDetail[] = blockedItems.map((item) => ({
        itemId: item.projectNumber,
        reason: this.getBlockReason(item),
      }));

      return this.blocking(
        `${blockedItems.length} pozycji blokuje dostawę`,
        details
      );
    }

    // Jakikolwiek waiting (bez blocked) = OSTRZEŻENIE
    if (waitingItems.length > 0) {
      const details: ReadinessCheckDetail[] = waitingItems.map((item) => ({
        itemId: item.projectNumber,
        reason: 'Oczekuje na siatkę',
      }));

      return this.warning(
        `${waitingItems.length} pozycji oczekuje`,
        details
      );
    }

    // Wszystko OK
    return this.ok(`Lista mailowa v${mailList.version} - wszystkie pozycje OK`);
  }

  // Określa powód blokady na podstawie flag
  private getBlockReason(item: {
    missingFile: boolean;
    unconfirmed: boolean;
    dimensionsUnconfirmed: boolean;
    drawingUnconfirmed: boolean;
  }): string {
    const reasons: string[] = [];

    if (item.missingFile) reasons.push('brak pliku');
    if (item.unconfirmed) reasons.push('niepotwierdzone');
    if (item.dimensionsUnconfirmed) reasons.push('wymiary niepotwierdzone');
    if (item.drawingUnconfirmed) reasons.push('rysunek niepotwierdzony');

    return reasons.join(', ') || 'zablokowane';
  }
}
