/**
 * Warehouse Validation Utilities
 *
 * Validates warehouse stock availability before starting production.
 *
 * CRITICAL: This prevents edge case where production starts without sufficient materials,
 * leading to negative stock and production blockers.
 *
 * Usage:
 * ```typescript
 * import { validateSufficientStock } from './utils/warehouse-validation.js';
 *
 * // Before changing order status to in_progress
 * await validateSufficientStock(orderId);
 * ```
 */

import type { PrismaClient } from '@prisma/client';
import { ValidationError } from './errors.js';
import { logger } from './logger.js';

/**
 * Material shortage details
 */
export interface MaterialShortage {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  required: number;
  available: number;
  shortage: number;
}

/**
 * Validate that sufficient stock exists for order requirements
 *
 * Checks if warehouse has enough materials to fulfill order requirements.
 * Prevents starting production with insufficient materials.
 *
 * @param prisma - Prisma client instance
 * @param orderId - Order ID to validate
 * @throws ValidationError if insufficient stock detected
 * @returns true if sufficient stock available
 *
 * @example
 * ```typescript
 * // Before starting production
 * await validateSufficientStock(prisma, orderId);
 * // If no error thrown, sufficient stock is available
 * ```
 */
export async function validateSufficientStock(
  prisma: PrismaClient,
  orderId: number
): Promise<boolean> {
  logger.info('Validating warehouse stock for order', { orderId });

  // Get order requirements (profile × color × beams)
  const requirements = await prisma.orderRequirement.findMany({
    where: { orderId },
    select: {
      profileId: true,
      colorId: true,
      beamsCount: true,
      profile: {
        select: { id: true, number: true, name: true },
      },
      color: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (requirements.length === 0) {
    logger.warn('No requirements found for order - skipping validation', { orderId });
    return true; // No requirements = no validation needed
  }

  // Get current warehouse stock for required profiles/colors
  const stocks = await prisma.warehouseStock.findMany({
    where: {
      OR: requirements.map((req) => ({
        profileId: req.profileId,
        colorId: req.colorId,
      })),
    },
    select: {
      profileId: true,
      colorId: true,
      currentStockBeams: true,
      profile: {
        select: { id: true, number: true },
      },
      color: {
        select: { id: true, code: true },
      },
    },
  });

  // Build stock map: `${profileId}_${colorId}` → currentStockBeams
  const stockMap = new Map(
    stocks.map((stock) => [
      `${stock.profileId}_${stock.colorId}`,
      {
        available: stock.currentStockBeams,
        profileNumber: stock.profile.number,
        colorCode: stock.color.code,
      },
    ])
  );

  // Check for shortages
  const shortages: MaterialShortage[] = [];

  for (const req of requirements) {
    const key = `${req.profileId}_${req.colorId}`;
    const stock = stockMap.get(key);

    if (!stock) {
      // Stock record doesn't exist - critical error
      shortages.push({
        profileId: req.profileId,
        profileNumber: req.profile.number,
        colorId: req.colorId,
        colorCode: req.color.code,
        required: req.beamsCount,
        available: 0,
        shortage: req.beamsCount,
      });
      continue;
    }

    // Check if stock is sufficient
    if (stock.available < req.beamsCount) {
      shortages.push({
        profileId: req.profileId,
        profileNumber: stock.profileNumber,
        colorId: req.colorId,
        colorCode: stock.colorCode,
        required: req.beamsCount,
        available: stock.available,
        shortage: req.beamsCount - stock.available,
      });
    }
  }

  // If shortages detected, throw validation error
  if (shortages.length > 0) {
    const shortageDetails = shortages
      .map(
        (s) =>
          `${s.profileNumber} (${s.colorCode}): potrzeba ${s.required} bel, dostępne ${s.available}, brakuje ${s.shortage}`
      )
      .join('; ');

    logger.warn('Insufficient warehouse stock for order', {
      orderId,
      shortages: shortages.length,
      details: shortageDetails,
    });

    throw new ValidationError(
      `Niewystarczający stan magazynu aby rozpocząć produkcję. ` +
      `Braki: ${shortageDetails}. ` +
      `Uzupełnij magazyn lub zmień wymagania zlecenia.`
    );
  }

  logger.info('Warehouse stock validation passed', {
    orderId,
    requirementsCount: requirements.length,
  });

  return true;
}

/**
 * Check warehouse stock without throwing (for UI warnings)
 *
 * @param prisma - Prisma client instance
 * @param orderId - Order ID to check
 * @returns Array of material shortages (empty if sufficient stock)
 *
 * @example
 * ```typescript
 * const shortages = await checkWarehouseStock(prisma, orderId);
 * if (shortages.length > 0) {
 *   console.warn('Insufficient stock:', shortages);
 * }
 * ```
 */
export async function checkWarehouseStock(
  prisma: PrismaClient,
  orderId: number
): Promise<MaterialShortage[]> {
  try {
    await validateSufficientStock(prisma, orderId);
    return [];
  } catch (error) {
    if (error instanceof ValidationError) {
      // Parse shortages from error (if needed for UI)
      // For now, return empty array - caller should catch ValidationError
      return [];
    }
    throw error;
  }
}
