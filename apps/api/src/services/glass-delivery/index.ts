import type { PrismaClient } from '@prisma/client';
import { GlassDeliveryImportService } from './GlassDeliveryImportService.js';
import { GlassDeliveryMatchingService } from './GlassDeliveryMatchingService.js';
import { GlassDeliveryQueryService } from './GlassDeliveryQueryService.js';
import type {
  GlassDeliveryFilters,
  GlassDeliveryWithItems,
  GlassDeliveryWithItemsAndCount,
  GroupedGlassDelivery,
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
   * Akceptuje string (UTF-8) lub Buffer (CP1250 - automatycznie konwertowany)
   */
  async importFromCsv(
    fileContent: string | Buffer,
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
   * Find all glass deliveries grouped by customerOrderNumber + rackNumber
   * Każdy unikalny customerOrderNumber pokazuje się jako osobny wiersz w tabeli
   */
  async findAll(filters?: GlassDeliveryFilters): Promise<GroupedGlassDelivery[]> {
    return this.queryService.findAllGrouped(filters);
  }

  /**
   * Find all glass deliveries (legacy - not grouped)
   * @deprecated Use findAll for proper grouping by customerOrderNumber
   */
  async findAllLegacy(filters?: GlassDeliveryFilters): Promise<GlassDeliveryWithItemsAndCount[]> {
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

  // ========== Categorized Glass Operations ==========

  /**
   * Get all loose glasses (szyby luzem)
   */
  async getLooseGlasses() {
    return this.prisma.looseGlass.findMany({
      include: {
        glassDelivery: {
          select: {
            deliveryDate: true,
            rackNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all aluminum glasses (szyby aluminiowe)
   */
  async getAluminumGlasses() {
    return this.prisma.aluminumGlass.findMany({
      include: {
        glassDelivery: {
          select: {
            deliveryDate: true,
            rackNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get aluminum glasses grouped by order (summary)
   */
  async getAluminumGlassesSummary() {
    const glasses = await this.prisma.aluminumGlass.findMany({
      select: {
        customerOrderNumber: true,
        clientName: true,
        quantity: true
      }
    });

    // Grupuj po customerOrderNumber
    const summaryMap = new Map<string, { customerOrderNumber: string; clientName: string | null; totalQuantity: number }>();

    for (const glass of glasses) {
      const key = glass.customerOrderNumber;
      const existing = summaryMap.get(key);
      if (existing) {
        existing.totalQuantity += glass.quantity;
      } else {
        summaryMap.set(key, {
          customerOrderNumber: glass.customerOrderNumber,
          clientName: glass.clientName,
          totalQuantity: glass.quantity
        });
      }
    }

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.customerOrderNumber.localeCompare(b.customerOrderNumber)
    );
  }

  /**
   * Get all reclamation glasses (szyby reklamacyjne)
   */
  async getReclamationGlasses() {
    return this.prisma.reclamationGlass.findMany({
      include: {
        glassDelivery: {
          select: {
            deliveryDate: true,
            rackNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
