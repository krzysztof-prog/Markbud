import type { PrismaClient } from '@prisma/client';
import { GlassDeliveryImportService } from './GlassDeliveryImportService.js';
import { GlassDeliveryMatchingService } from './GlassDeliveryMatchingService.js';
import { GlassDeliveryQueryService } from './GlassDeliveryQueryService.js';
import type {
  GlassDeliveryFilters,
  GlassDeliveryWithItems,
  GlassDeliveryWithItemsAndCount,
  ImportSummary,
  RematchResult,
} from './types.js';

// Re-export types
export * from './types.js';

// Re-export individual services for advanced use cases
export { GlassDeliveryImportService } from './GlassDeliveryImportService.js';
export { GlassDeliveryMatchingService } from './GlassDeliveryMatchingService.js';
export { GlassDeliveryQueryService } from './GlassDeliveryQueryService.js';

/**
 * Main facade for glass delivery operations.
 * This class provides a unified interface for all glass delivery functionality.
 *
 * For backward compatibility, this class maintains the same public API
 * as the original GlassDeliveryService.
 */
export class GlassDeliveryService {
  private importService: GlassDeliveryImportService;
  private matchingService: GlassDeliveryMatchingService;
  private queryService: GlassDeliveryQueryService;

  constructor(private prisma: PrismaClient) {
    this.importService = new GlassDeliveryImportService(prisma);
    this.matchingService = new GlassDeliveryMatchingService(prisma);
    this.queryService = new GlassDeliveryQueryService(prisma);
  }

  // ========== Import Operations ==========

  /**
   * Import glass delivery from CSV file content
   */
  async importFromCsv(
    fileContent: string,
    filename: string,
    deliveryDate?: Date
  ): Promise<GlassDeliveryWithItems> {
    return this.importService.importFromCsv(fileContent, filename, deliveryDate);
  }

  // ========== Matching Operations ==========

  /**
   * Legacy non-transaction version of match with orders
   */
  async matchWithOrders(deliveryId: number): Promise<void> {
    return this.matchingService.matchWithOrders(deliveryId);
  }

  /**
   * Re-match unmatched delivery items after orders are imported
   */
  async rematchUnmatchedForOrders(orderNumbers: string[]): Promise<RematchResult> {
    return this.matchingService.rematchUnmatchedForOrders(orderNumbers);
  }

  // ========== Query Operations ==========

  /**
   * Find all glass deliveries with optional date filtering
   */
  async findAll(filters?: GlassDeliveryFilters): Promise<GlassDeliveryWithItemsAndCount[]> {
    return this.queryService.findAll(filters);
  }

  /**
   * Find glass delivery by ID
   */
  async findById(id: number): Promise<GlassDeliveryWithItems | null> {
    return this.queryService.findById(id);
  }

  /**
   * Delete a glass delivery and update related order counts
   */
  async delete(id: number): Promise<void> {
    return this.queryService.delete(id);
  }

  /**
   * Get the latest import summary with statistics
   */
  async getLatestImportSummary(): Promise<ImportSummary | null> {
    return this.queryService.getLatestImportSummary();
  }
}
