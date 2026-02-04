/**
 * Pallet Validation Service - P0-R2
 *
 * Waliduje fizyczne wymiary palet przed wysyłką.
 * Sprawdza czy profile/okna zmieszczą się na wybranych paletach.
 */

import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { DeliveryReadinessAggregator } from './readiness/index.js';

export interface ValidationResult {
  isValid: boolean;
  errors: PalletValidationError[];
  warnings: ValidationWarning[];
}

export interface PalletValidationError {
  palletNumber: number;
  errorType: 'profile_too_long' | 'overweight' | 'height_exceeded';
  message: string;
  details: {
    itemId?: number;
    itemName?: string;
    itemDimension?: number;
    palletLimit?: number;
  };
}

export interface ValidationWarning {
  palletNumber: number;
  warningType: 'low_utilization' | 'unbalanced_weight';
  message: string;
}

export class PalletValidationService {
  private readinessAggregator: DeliveryReadinessAggregator;

  constructor(private prisma: PrismaClient) {
    this.readinessAggregator = new DeliveryReadinessAggregator(prisma);
  }

  /**
   * Waliduj optymalizację palet dla dostawy
   * Sprawdza czy wszystkie profile zmieszczą się na paletach
   */
  async validatePalletOptimization(deliveryId: number): Promise<ValidationResult> {
    const optimization = await this.prisma.palletOptimization.findUnique({
      where: { deliveryId },
      include: {
        pallets: true,
        delivery: {
          include: {
            deliveryOrders: {
              include: {
                order: {
                  include: {
                    requirements: {
                      include: { profile: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!optimization) {
      return {
        isValid: false,
        errors: [
          {
            palletNumber: 0,
            errorType: 'profile_too_long',
            message: 'Brak optymalizacji palet dla tej dostawy. Najpierw wygeneruj optymalizację.',
            details: {},
          },
        ],
        warnings: [],
      };
    }

    const errors: PalletValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Pobierz maksymalną długość profili z zamówień
    const maxProfileLengths = new Map<number, number>();

    for (const deliveryOrder of optimization.delivery.deliveryOrders) {
      for (const req of deliveryOrder.order.requirements) {
        // Zakładamy że meters to długość w metrach, konwertujemy na mm
        const lengthMm = Math.round(req.meters * 1000);
        const profileId = req.profileId;

        const current = maxProfileLengths.get(profileId) || 0;
        if (lengthMm > current) {
          maxProfileLengths.set(profileId, lengthMm);
        }
      }
    }

    // Waliduj każdą paletę
    for (const pallet of optimization.pallets) {
      // Sprawdź czy maxDepthMm jest wystarczający dla najdłuższego profilu
      const maxDepth = pallet.maxDepthMm;

      for (const [_profileId, profileLength] of maxProfileLengths) {
        if (profileLength > maxDepth) {
          errors.push({
            palletNumber: pallet.palletNumber,
            errorType: 'profile_too_long',
            message: `Profil o długości ${profileLength}mm nie zmieści się na palecie ${pallet.palletTypeName} (max ${maxDepth}mm)`,
            details: {
              itemDimension: profileLength,
              palletLimit: maxDepth,
            },
          });
        }
      }

      // Ostrzeżenie o niskim wykorzystaniu
      if (pallet.utilizationPercent < 50) {
        warnings.push({
          palletNumber: pallet.palletNumber,
          warningType: 'low_utilization',
          message: `Niska wydajność pakowania na palecie ${pallet.palletNumber}: ${pallet.utilizationPercent.toFixed(1)}%`,
        });
      }
    }

    const isValid = errors.length === 0;

    logger.info('Pallet validation completed', {
      deliveryId,
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    // Auto-recalculate readiness status po walidacji
    await this.readinessAggregator.recalculateIfNeeded(deliveryId);

    return { isValid, errors, warnings };
  }

  /**
   * Oznacz optymalizację jako zwalidowaną
   */
  async markAsValidated(
    deliveryId: number,
    status: 'valid' | 'invalid',
    errors?: PalletValidationError[]
  ): Promise<void> {
    await this.prisma.palletOptimization.update({
      where: { deliveryId },
      data: {
        validationStatus: status,
        validatedAt: new Date(),
        validationErrors: errors ? JSON.stringify(errors) : null,
      },
    });

    logger.info('Pallet optimization validation status updated', {
      deliveryId,
      status,
      errorCount: errors?.length || 0,
    });

    // Auto-recalculate readiness status po oznaczeniu jako zwalidowane
    await this.readinessAggregator.recalculateIfNeeded(deliveryId);
  }

  /**
   * Sprawdź czy dostawa może być wysłana (palet zwalidowane)
   */
  async canShipDelivery(deliveryId: number): Promise<{
    canShip: boolean;
    reason?: string;
    validationStatus?: string;
  }> {
    const optimization = await this.prisma.palletOptimization.findUnique({
      where: { deliveryId },
      select: { validationStatus: true, validationErrors: true },
    });

    // Brak optymalizacji - można wysłać (legacy behavior)
    if (!optimization) {
      return { canShip: true };
    }

    // Walidacja nie wykonana
    if (optimization.validationStatus === 'pending') {
      return {
        canShip: false,
        reason: 'Palety nie zostały zwalidowane. Wykonaj walidację przed wysyłką.',
        validationStatus: 'pending',
      };
    }

    // Walidacja nieudana
    if (optimization.validationStatus === 'invalid') {
      return {
        canShip: false,
        reason: `Walidacja palet nie powiodła się: ${optimization.validationErrors || 'Nieznany błąd'}`,
        validationStatus: 'invalid',
      };
    }

    return { canShip: true, validationStatus: 'valid' };
  }
}
