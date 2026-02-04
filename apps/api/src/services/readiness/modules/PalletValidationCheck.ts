/**
 * Moduł sprawdzający: Optymalizacja palet
 *
 * Sprawdza czy palety zostały zoptymalizowane dla dostawy.
 * OSTRZEGA (nie blokuje) jeśli brak optymalizacji.
 *
 * Reguły:
 * - Optymalizacja istnieje i validationStatus = 'valid' → OK
 * - Optymalizacja istnieje ale validationStatus = 'invalid' → WARNING
 * - Brak optymalizacji → WARNING (palety nie są wymagane)
 */

import type { PrismaClient } from '@prisma/client';
import { BaseReadinessCheckModule, type ReadinessCheckResult } from '../types';

export class PalletValidationCheck extends BaseReadinessCheckModule {
  name = 'pallet_validation' as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async check(deliveryId: number): Promise<ReadinessCheckResult> {
    // Znajdź optymalizację palet dla dostawy
    const optimization = await this.prisma.palletOptimization.findUnique({
      where: {
        deliveryId,
      },
      include: {
        pallets: {
          select: {
            id: true,
            palletNumber: true,
            utilizationPercent: true,
          },
        },
      },
    });

    // Brak optymalizacji - OSTRZEŻENIE (palety nie są wymagane do wysyłki)
    if (!optimization) {
      return this.warning('Brak optymalizacji palet - zalecane przed wysyłką');
    }

    // Optymalizacja w trakcie
    if (optimization.validationStatus === 'pending') {
      return this.warning('Walidacja palet w trakcie...');
    }

    // Optymalizacja nieudana
    if (optimization.validationStatus === 'invalid') {
      const errorMessage = optimization.validationErrors || 'Nieznany błąd walidacji';
      return this.warning(`Walidacja palet nieudana: ${errorMessage}`);
    }

    // Optymalizacja OK
    const palletCount = optimization.pallets.length;
    const avgUtilization =
      palletCount > 0
        ? optimization.pallets.reduce((sum, p) => sum + (p.utilizationPercent || 0), 0) / palletCount
        : 0;

    return this.ok(
      `Optymalizacja OK: ${palletCount} palet, średnie wykorzystanie ${avgUtilization.toFixed(0)}%`
    );
  }
}
