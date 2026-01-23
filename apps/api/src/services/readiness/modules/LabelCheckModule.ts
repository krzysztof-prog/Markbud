/**
 * Moduł sprawdzający: Weryfikacja etykiet (LabelCheck)
 *
 * Sprawdza czy etykiety na zleceniach są zweryfikowane i poprawne.
 * BLOKUJE dostawę jeśli są błędy w etykietach.
 *
 * Reguły:
 * - Brak sprawdzenia etykiet → OK (sprawdzenie opcjonalne)
 * - Sprawdzenie zakończone bez błędów → OK
 * - Jakikolwiek mismatch/error → BLOCKING
 * - Sprawdzenie w trakcie → WARNING
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult, type ReadinessCheckDetail } from '../types';

export class LabelCheckModule extends BaseReadinessCheckModule {
  name = 'label_check' as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async check(deliveryId: number): Promise<ReadinessCheckResult> {
    // Znajdź najnowsze sprawdzenie etykiet dla dostawy
    const labelCheck = await this.prisma.labelCheck.findFirst({
      where: {
        deliveryId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        results: {
          where: {
            status: {
              not: 'OK',
            },
          },
          select: {
            id: true,
            orderId: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    // Brak sprawdzenia etykiet - ostrzeżenie (zalecane przed wysyłką)
    if (!labelCheck) {
      return this.warning('Etykiety nie były jeszcze sprawdzane - zalecane przed wysyłką');
    }

    // Sprawdzenie w trakcie
    if (labelCheck.status === 'pending') {
      return this.warning('Sprawdzanie etykiet w trakcie...');
    }

    // Sprawdzenie nieudane
    if (labelCheck.status === 'failed') {
      return this.blocking('Sprawdzanie etykiet nie powiodło się - wymagane ponowne sprawdzenie');
    }

    // Sprawdzenie zakończone - sprawdź wyniki
    const mismatchResults = labelCheck.results.filter(
      (r) => r.status === 'MISMATCH' || r.status === 'NO_FOLDER' || r.status === 'NO_BMP'
    );
    const errorResults = labelCheck.results.filter((r) => r.status === 'OCR_ERROR');

    // Są błędy krytyczne (mismatch, brak pliku)
    if (mismatchResults.length > 0) {
      const details: ReadinessCheckDetail[] = mismatchResults.map((r) => ({
        itemId: r.orderNumber || `Order #${r.orderId}`,
        orderId: r.orderId,
        reason: this.getLabelErrorReason(r.status),
      }));

      return this.blocking(
        `${mismatchResults.length} etykiet ma błędy`,
        details
      );
    }

    // Są błędy OCR (mniej krytyczne ale wciąż blokujące)
    if (errorResults.length > 0) {
      const details: ReadinessCheckDetail[] = errorResults.map((r) => ({
        itemId: r.orderNumber || `Order #${r.orderId}`,
        orderId: r.orderId,
        reason: 'Błąd odczytu OCR',
      }));

      return this.blocking(
        `${errorResults.length} etykiet nie udało się odczytać`,
        details
      );
    }

    // Wszystko OK
    return this.ok(
      `Etykiety zweryfikowane: ${labelCheck.okCount}/${labelCheck.totalOrders} OK`
    );
  }

  private getLabelErrorReason(status: string): string {
    switch (status) {
      case 'MISMATCH':
        return 'Niezgodność daty na etykiecie';
      case 'NO_FOLDER':
        return 'Brak folderu z etykietą';
      case 'NO_BMP':
        return 'Brak pliku BMP etykiety';
      case 'OCR_ERROR':
        return 'Błąd odczytu OCR';
      default:
        return 'Nieznany błąd';
    }
  }
}
