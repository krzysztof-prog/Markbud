/**
 * Import Conflict Service
 *
 * Handles variant conflict detection and resolution for order imports.
 * Responsibilities:
 * - Detect variant conflicts (e.g., 53335 vs 53335-a)
 * - Provide resolution recommendations
 * - Execute resolution strategies
 * - Handle user decisions on conflicts
 */

import type { PrismaClient } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';
import {
  OrderVariantService,
  type VariantConflict,
  type VariantResolutionAction,
  type OrderVariant,
} from '../orderVariantService.js';
import { CsvParser, type ParsedUzyteBele } from '../parsers/csv-parser.js';
import { ImportTransactionService, type TransactionClient } from './importTransactionService.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Result of conflict detection
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict?: VariantConflict;
  canProceedWithoutResolution: boolean;
}

/**
 * Result of conflict resolution execution
 */
export interface ConflictResolutionResult {
  success: boolean;
  action: string;
  deletedOrders?: string[];
  mergedInto?: string;
  message: string;
}

/**
 * Import Conflict Service
 *
 * Centralizes all conflict-related operations for imports.
 * Works with OrderVariantService for detection and provides
 * resolution execution through ImportTransactionService.
 */
export class ImportConflictService {
  private variantService: OrderVariantService;
  private csvParser: CsvParser;

  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository,
    private transactionService: ImportTransactionService
  ) {
    this.variantService = new OrderVariantService(prisma);
    this.csvParser = new CsvParser();
  }

  // ============================================================
  // CONFLICT DETECTION
  // ============================================================

  /**
   * Detect variant conflicts for an order number
   */
  async detectConflicts(
    orderNumber: string,
    parsedData: ParsedUzyteBele
  ): Promise<ConflictDetectionResult> {
    try {
      const conflict = await this.variantService.detectConflicts(
        orderNumber,
        parsedData
      );

      if (!conflict) {
        return {
          hasConflict: false,
          canProceedWithoutResolution: true,
        };
      }

      return {
        hasConflict: true,
        conflict,
        canProceedWithoutResolution: false,
      };
    } catch (error) {
      logger.error('Conflict detection failed', {
        orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // On detection error, allow proceeding (fail-open for UX)
      return {
        hasConflict: false,
        canProceedWithoutResolution: true,
      };
    }
  }

  /**
   * Find all related orders for a base order number
   */
  async findRelatedOrders(baseNumber: string): Promise<OrderVariant[]> {
    return this.variantService.findRelatedOrders(baseNumber);
  }

  /**
   * Parse order number into components
   */
  parseOrderNumber(orderNumber: string): { base: string; suffix: string | null; full: string } {
    return this.csvParser.parseOrderNumber(orderNumber);
  }

  /**
   * Check if any variant of this order is already in a delivery
   */
  async checkVariantInDelivery(baseNumber: string): Promise<{
    hasConflict: boolean;
    conflictingOrder?: OrderVariant;
  }> {
    return this.variantService.checkVariantInDelivery(baseNumber);
  }

  // ============================================================
  // CONFLICT RESOLUTION EXECUTION
  // ============================================================

  /**
   * Execute a conflict resolution action
   * This is the main entry point for resolution handling
   */
  async executeResolution(
    resolution: VariantResolutionAction,
    orderNumber: string,
    _parsedData: ParsedUzyteBele
  ): Promise<ConflictResolutionResult> {
    const { base } = this.csvParser.parseOrderNumber(orderNumber);

    logger.info('Executing conflict resolution', {
      orderNumber,
      resolutionType: resolution.type,
    });

    switch (resolution.type) {
      case 'cancel':
        return this.handleCancelResolution();

      case 'replace':
        return this.handleReplaceResolution(base, resolution.targetOrderNumber);

      case 'keep_both':
        return this.handleKeepBothResolution(orderNumber);

      case 'use_latest':
        return this.handleUseLatestResolution(base, resolution.deleteOlder);

      case 'merge':
        return this.handleMergeResolution(base, resolution.targetOrderNumber);

      default:
        throw new ValidationError('Nieznany typ rozwiazania konfliktu');
    }
  }

  /**
   * Handle cancel resolution - user decided not to import
   */
  private async handleCancelResolution(): Promise<ConflictResolutionResult> {
    logger.info('Import cancelled by user');

    return {
      success: true,
      action: 'cancel',
      message: 'Import anulowany przez uzytkownika',
    };
  }

  /**
   * Handle replace resolution - replace existing order with new one
   */
  private async handleReplaceResolution(
    baseNumber: string,
    targetOrderNumber: string
  ): Promise<ConflictResolutionResult> {
    // Find the target order to replace
    const targetOrder = await this.repository.findOrderByNumber(targetOrderNumber);

    if (!targetOrder) {
      throw new ValidationError(`Nie znaleziono zlecenia do zastapienia: ${targetOrderNumber}`);
    }

    logger.info('Replacing existing order', {
      baseNumber,
      targetOrderNumber,
      targetOrderId: targetOrder.id,
    });

    // The actual replacement will happen in processUzyteBele with replaceBase=true
    return {
      success: true,
      action: 'replace',
      deletedOrders: [targetOrderNumber],
      message: `Zlecenie ${targetOrderNumber} zostanie zastapione`,
    };
  }

  /**
   * Handle keep_both resolution - import as new variant
   */
  private async handleKeepBothResolution(
    orderNumber: string
  ): Promise<ConflictResolutionResult> {
    logger.info('Keeping both variants', { orderNumber });

    return {
      success: true,
      action: 'keep_both',
      message: `Zlecenie ${orderNumber} zostanie zaimportowane jako nowy wariant`,
    };
  }

  /**
   * Handle use_latest resolution - delete older variants and import new
   */
  private async handleUseLatestResolution(
    baseNumber: string,
    deleteOlder: boolean
  ): Promise<ConflictResolutionResult> {
    if (!deleteOlder) {
      return {
        success: true,
        action: 'use_latest',
        message: 'Nowy wariant zostanie uzyty (bez usuwania starszych)',
      };
    }

    // Find all related orders to delete
    const relatedOrders = await this.variantService.findRelatedOrders(baseNumber);
    const ordersToDelete = relatedOrders.filter((o) => o.id !== undefined);

    if (ordersToDelete.length === 0) {
      return {
        success: true,
        action: 'use_latest',
        deletedOrders: [],
        message: 'Brak starszych wariantow do usuniecia',
      };
    }

    const orderNumbers = ordersToDelete.map((o) => o.orderNumber);
    const orderIds = ordersToDelete.map((o) => o.id!).filter((id) => id !== undefined);

    logger.info('Deleting older variants', {
      baseNumber,
      count: orderIds.length,
      orders: orderNumbers,
    });

    // Delete all related orders in transaction
    const result = await this.transactionService.deleteMultipleOrdersWithDependencies(orderIds);

    if (!result.success) {
      throw new ValidationError(`Blad usuwania starszych wariantow: ${result.error}`);
    }

    return {
      success: true,
      action: 'use_latest',
      deletedOrders: orderNumbers,
      message: `Usunieto ${orderNumbers.length} starszych wariantow: ${orderNumbers.join(', ')}`,
    };
  }

  /**
   * Handle merge resolution - merge with existing order
   * Note: Full merge is complex, currently treats as keep_both
   */
  private async handleMergeResolution(
    baseNumber: string,
    targetOrderNumber: string
  ): Promise<ConflictResolutionResult> {
    logger.warn('Merge resolution not fully implemented, using keep_both behavior', {
      baseNumber,
      targetOrderNumber,
    });

    // For now, merge is not fully implemented
    // A full merge would combine requirements and windows from both orders
    return {
      success: true,
      action: 'merge',
      mergedInto: targetOrderNumber,
      message: `Polaczono z ${targetOrderNumber} (zachowano oba warianty)`,
    };
  }

  // ============================================================
  // RESOLUTION IN TRANSACTION
  // ============================================================

  /**
   * Delete older variants within a transaction
   * Used when resolution requires deletion before import
   */
  async deleteOlderVariantsInTransaction(
    tx: TransactionClient,
    baseNumber: string,
    excludeOrderNumber?: string
  ): Promise<string[]> {
    const relatedOrders = await this.variantService.findRelatedOrders(baseNumber);
    const deletedNumbers: string[] = [];

    for (const order of relatedOrders) {
      // Skip the order we're importing (if specified)
      if (excludeOrderNumber && order.orderNumber === excludeOrderNumber) {
        continue;
      }

      if (order.id) {
        await this.transactionService.deleteOrderWithDependencies(tx, order.id);
        deletedNumbers.push(order.orderNumber);
        logger.info(`Deleted variant ${order.orderNumber} in transaction`);
      }
    }

    return deletedNumbers;
  }

  // ============================================================
  // CONFLICT SUMMARY FOR UI
  // ============================================================

  /**
   * Get a summary of conflict for display in UI
   */
  formatConflictSummary(conflict: VariantConflict): {
    title: string;
    description: string;
    existingOrders: string[];
    recommendation: string;
    options: Array<{ type: string; label: string; description: string }>;
  } {
    const existingOrdersList = conflict.existingOrders.map((o) => {
      const deliveryInfo = o.deliveryAssignment
        ? ` (dostawa ${o.deliveryAssignment.deliveryNumber} ${new Date(o.deliveryAssignment.deliveryDate).toLocaleDateString('pl-PL')})`
        : '';
      return `${o.orderNumber}${deliveryInfo}`;
    });

    const options = [
      {
        type: 'replace',
        label: 'Zastap istniejace',
        description: 'Usun stare zlecenie i zaimportuj nowe',
      },
      {
        type: 'keep_both',
        label: 'Zachowaj oba',
        description: 'Zaimportuj jako nowy wariant (np. -a, -b)',
      },
      {
        type: 'use_latest',
        label: 'Uzyj najnowszego',
        description: 'Usun wszystkie starsze wersje i zaimportuj nowa',
      },
      {
        type: 'cancel',
        label: 'Anuluj import',
        description: 'Nie importuj tego pliku',
      },
    ];

    return {
      title: this.getConflictTitle(conflict.type),
      description: conflict.reasoning,
      existingOrders: existingOrdersList,
      recommendation: this.getRecommendationLabel(conflict.recommendation),
      options,
    };
  }

  /**
   * Get conflict type title
   */
  private getConflictTitle(type: VariantConflict['type']): string {
    switch (type) {
      case 'base_exists':
        return 'Zlecenie bazowe juz istnieje';
      case 'variant_exists':
        return 'Wariant zlecenia juz istnieje';
      case 'multiple_variants':
        return 'Istnieje wiele wariantow tego zlecenia';
      default:
        return 'Konflikt wariantow zlecenia';
    }
  }

  /**
   * Get recommendation label
   */
  private getRecommendationLabel(recommendation: VariantConflict['recommendation']): string {
    switch (recommendation) {
      case 'replace_base':
        return 'Zalecane: Zastap istniejace zlecenie';
      case 'keep_both':
        return 'Zalecane: Zachowaj oba warianty';
      case 'use_latest':
        return 'Zalecane: Uzyj najnowszej wersji';
      case 'merge':
        return 'Zalecane: Polacz z istniejacym';
      case 'manual':
        return 'Wymagana reczna decyzja';
      default:
        return 'Brak rekomendacji';
    }
  }
}
