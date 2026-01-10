import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { CsvParser, type ParsedUzyteBele } from './parsers/csv-parser.js';
import { logger } from '../utils/logger.js';

/**
 * P1-2: Typ wariantu zlecenia
 * 'correction' - korekta oryginału (musi być w tej samej dostawie co oryginał)
 * 'additional_file' - dodatkowy plik do zamówienia (może być w innej dostawie)
 * null - nie określono (domyślnie, wymagane ustawienie dla wariantów z literką)
 */
export type VariantType = 'correction' | 'additional_file' | null;

export interface OrderVariant {
  orderNumber: string;
  baseNumber: string;
  suffix: string | null;
  id?: number;
  totalWindows?: number;
  totalSashes?: number;
  totalGlasses?: number;
  createdAt?: Date;
  variantType?: VariantType;
  deliveryAssignment?: {
    deliveryId: number;
    deliveryNumber: string;
    deliveryDate: Date;
  };
}

export interface VariantConflict {
  type: 'base_exists' | 'variant_exists' | 'multiple_variants';
  newOrder: OrderVariant;
  existingOrders: OrderVariant[];
  comparisonMetrics: {
    windowCountDiff: number;
    sashCountDiff: number;
    glassCountDiff: number;
  };
  recommendation: 'merge' | 'replace_base' | 'use_latest' | 'keep_both' | 'manual';
  reasoning: string;
}

export type VariantResolutionAction =
  | { type: 'merge'; targetOrderNumber: string }
  | { type: 'replace'; targetOrderNumber: string }
  | { type: 'use_latest'; deleteOlder: boolean }
  | { type: 'keep_both' }
  | { type: 'cancel' };

/**
 * Service for handling order variants (e.g., 52335, 52335-a, 52335-b)
 * Detects conflicts, provides recommendations, and handles resolution
 */
export class OrderVariantService {
  private csvParser: CsvParser;

  constructor(private prisma: PrismaClient) {
    this.csvParser = new CsvParser();
  }

  /**
   * Detect conflicts when importing order with variant
   */
  async detectConflicts(
    orderNumber: string,
    parsedData: ParsedUzyteBele
  ): Promise<VariantConflict | null> {
    const { base, suffix, full } = this.csvParser.parseOrderNumber(orderNumber);

    logger.info('Checking for order variants', { orderNumber: full, base, suffix });

    // Find all related orders (base + all variants)
    const existingOrders = await this.findRelatedOrders(base);

    if (existingOrders.length === 0) {
      logger.info('No existing variants found', { base });
      return null; // No conflict
    }

    logger.info('Found existing variants', {
      base,
      count: existingOrders.length,
      variants: existingOrders.map(o => o.orderNumber),
    });

    // Build conflict data
    const newOrder: OrderVariant = {
      orderNumber: full,
      baseNumber: base,
      suffix,
      totalWindows: parsedData.totals.windows,
      totalSashes: parsedData.totals.sashes,
      totalGlasses: parsedData.totals.glasses,
    };

    const comparisonMetrics = this.compareVariants(newOrder, existingOrders);
    const recommendation = this.getRecommendation(newOrder, existingOrders, comparisonMetrics);

    return {
      type: this.getConflictType(base, suffix, existingOrders),
      newOrder,
      existingOrders,
      comparisonMetrics,
      recommendation,
      reasoning: this.getReasoningText(recommendation, comparisonMetrics),
    };
  }

  /**
   * Find all orders with same base number (including base and all variants)
   */
  async findRelatedOrders(baseNumber: string): Promise<OrderVariant[]> {
    // Find exact match and pattern match for variants
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: baseNumber }, // e.g., "53335"
          { orderNumber: { startsWith: `${baseNumber}-` } }, // e.g., "53335-a", "53335-b"
          // Also match patterns like "53335a" without dash
          {
            AND: [
              { orderNumber: { startsWith: baseNumber } },
              {
                orderNumber: {
                  // Match base + single letter
                  in: this.generateVariantPatterns(baseNumber),
                },
              },
            ],
          },
        ],
      },
      include: {
        deliveryOrders: {
          include: {
            delivery: {
              select: {
                id: true,
                deliveryNumber: true,
                deliveryDate: true,
              },
            },
          },
        },
      },
    });

    return orders.map(order => {
      const parsed = this.csvParser.parseOrderNumber(order.orderNumber);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        baseNumber: parsed.base,
        suffix: parsed.suffix,
        totalWindows: order.totalWindows || undefined,
        totalSashes: order.totalSashes || undefined,
        totalGlasses: order.totalGlasses || undefined,
        createdAt: order.createdAt,
        // P1-2: Include variantType from database
        variantType: order.variantType as VariantType,
        deliveryAssignment: order.deliveryOrders[0]?.delivery
          ? {
              deliveryId: order.deliveryOrders[0].delivery.id,
              deliveryNumber: order.deliveryOrders[0].delivery.deliveryNumber || '',
              deliveryDate: order.deliveryOrders[0].delivery.deliveryDate,
            }
          : undefined,
      };
    });
  }

  /**
   * Generate possible variant patterns for matching
   * e.g., "52335" -> ["52335a", "52335b", "52335c", ...]
   */
  private generateVariantPatterns(baseNumber: string): string[] {
    const patterns: string[] = [];
    // Generate a-z variants without dash
    for (let i = 97; i <= 122; i++) {
      // ASCII 97-122 = a-z
      patterns.push(`${baseNumber}${String.fromCharCode(i)}`);
    }
    return patterns;
  }

  /**
   * Compare window counts between variants
   */
  private compareVariants(
    newOrder: OrderVariant,
    existingOrders: OrderVariant[]
  ): {
    windowCountDiff: number;
    sashCountDiff: number;
    glassCountDiff: number;
  } {
    // Compare against most recent order
    const mostRecent = existingOrders.sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )[0];

    return {
      windowCountDiff: (newOrder.totalWindows || 0) - (mostRecent.totalWindows || 0),
      sashCountDiff: (newOrder.totalSashes || 0) - (mostRecent.totalSashes || 0),
      glassCountDiff: (newOrder.totalGlasses || 0) - (mostRecent.totalGlasses || 0),
    };
  }

  /**
   * AI-like recommendation engine based on metrics
   */
  private getRecommendation(
    newOrder: OrderVariant,
    existingOrders: OrderVariant[],
    metrics: { windowCountDiff: number; sashCountDiff: number; glassCountDiff: number }
  ): 'merge' | 'replace_base' | 'use_latest' | 'keep_both' | 'manual' {
    const hasBaseOrder = existingOrders.some(o => o.suffix === null);
    const hasVariants = existingOrders.some(o => o.suffix !== null);
    const newHasSuffix = newOrder.suffix !== null;

    logger.info('Calculating recommendation', {
      hasBaseOrder,
      hasVariants,
      newHasSuffix,
      windowDiff: metrics.windowCountDiff,
    });

    // Case 1: Base exists, importing variant - similar counts
    if (hasBaseOrder && newHasSuffix && Math.abs(metrics.windowCountDiff) <= 2) {
      return 'replace_base'; // Likely corrected version
    }

    // Case 2: Different counts - probably separate parts
    if (Math.abs(metrics.windowCountDiff) > 5) {
      return 'keep_both'; // Different orders
    }

    // Case 3: Multiple variants exist
    if (hasVariants && existingOrders.length > 2) {
      return 'manual'; // Too complex
    }

    // Case 4: Variant exists, importing newer variant
    if (hasVariants && newHasSuffix) {
      return 'use_latest'; // Use newest revision
    }

    return 'manual';
  }

  private getConflictType(
    base: string,
    suffix: string | null,
    existing: OrderVariant[]
  ): 'base_exists' | 'variant_exists' | 'multiple_variants' {
    const hasBase = existing.some(o => o.suffix === null);
    const variantCount = existing.filter(o => o.suffix !== null).length;

    if (variantCount > 1) return 'multiple_variants';
    if (hasBase) return 'base_exists';
    return 'variant_exists';
  }

  private getReasoningText(
    recommendation: string,
    metrics: { windowCountDiff: number }
  ): string {
    switch (recommendation) {
      case 'replace_base':
        return 'Zlecenie bazowe istnieje, a liczba okien jest podobna. Prawdopodobnie to poprawiona wersja.';
      case 'keep_both':
        return `Różnica w liczbie okien (${metrics.windowCountDiff}) sugeruje, że to oddzielne części zlecenia.`;
      case 'use_latest':
        return 'Istnieją już warianty. Użyj najnowszej wersji.';
      case 'merge':
        return 'Możesz połączyć wymagania z obu wariantów.';
      default:
        return 'Sytuacja wymaga ręcznej decyzji.';
    }
  }

  /**
   * P1-2: Check if any variant of this order is already in a delivery
   *
   * Logika walidacji:
   * - Jeśli nowy wariant to 'correction' → MUSI być w tej samej dostawie co oryginał
   * - Jeśli nowy wariant to 'additional_file' → MOŻE być w innej dostawie (brak konfliktu)
   * - Jeśli variantType nie jest ustawiony → zwracamy informację że wymaga wyboru
   *
   * @param baseNumber - numer bazowy zlecenia (bez sufixu)
   * @param newOrderVariantType - typ wariantu nowego zlecenia (null = nie ustawiony)
   * @returns informacja o konflikcie lub braku konfliktu
   */
  async checkVariantInDelivery(
    baseNumber: string,
    newOrderVariantType?: VariantType
  ): Promise<{
    hasConflict: boolean;
    requiresVariantTypeSelection?: boolean;
    conflictingOrder?: OrderVariant;
    originalDelivery?: {
      deliveryId: number;
      deliveryNumber: string;
    };
  }> {
    const relatedOrders = await this.findRelatedOrders(baseNumber);

    // Znajdź zlecenie (bazowe lub wariant) które jest już w dostawie
    const orderInDelivery = relatedOrders.find(o => o.deliveryAssignment);

    // Brak zlecenia w dostawie = brak konfliktu
    if (!orderInDelivery) {
      return { hasConflict: false };
    }

    // P1-2: Jeśli nowy wariant to 'additional_file' - może być w innej dostawie
    if (newOrderVariantType === 'additional_file') {
      logger.info('Order variant is additional_file - allowing different delivery', {
        baseNumber,
        existingOrderNumber: orderInDelivery.orderNumber,
      });
      return { hasConflict: false };
    }

    // P1-2: Jeśli nowy wariant to 'correction' - musi być w tej samej dostawie
    if (newOrderVariantType === 'correction') {
      logger.info('Order variant is correction - must be in same delivery as original', {
        baseNumber,
        existingOrderNumber: orderInDelivery.orderNumber,
        requiredDeliveryId: orderInDelivery.deliveryAssignment?.deliveryId,
      });

      return {
        hasConflict: true,
        conflictingOrder: orderInDelivery,
        originalDelivery: orderInDelivery.deliveryAssignment
          ? {
              deliveryId: orderInDelivery.deliveryAssignment.deliveryId,
              deliveryNumber: orderInDelivery.deliveryAssignment.deliveryNumber,
            }
          : undefined,
      };
    }

    // P1-2: Typ wariantu nie jest ustawiony - wymaga wyboru przez użytkownika
    logger.info('Variant type not specified - requires user selection', {
      baseNumber,
      existingOrderNumber: orderInDelivery.orderNumber,
    });

    return {
      hasConflict: true,
      requiresVariantTypeSelection: true,
      conflictingOrder: orderInDelivery,
      originalDelivery: orderInDelivery.deliveryAssignment
        ? {
            deliveryId: orderInDelivery.deliveryAssignment.deliveryId,
            deliveryNumber: orderInDelivery.deliveryAssignment.deliveryNumber,
          }
        : undefined,
    };
  }

  /**
   * P1-2: Set variant type for an order
   * @param orderId - ID zlecenia
   * @param variantType - typ wariantu ('correction' | 'additional_file')
   */
  async setVariantType(orderId: number, variantType: VariantType): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { variantType },
    });

    logger.info('Order variant type updated', { orderId, variantType });
  }
}
