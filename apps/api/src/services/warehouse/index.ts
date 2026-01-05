/**
 * Warehouse Service - Main service composition
 *
 * This service handles all warehouse-related business logic including:
 * - Stock management and updates
 * - Monthly inventory operations
 * - Shortage calculations
 * - Usage statistics and averages
 * - Inventory rollback operations
 * - Month finalization
 */

import { WarehouseRepository } from '../../repositories/WarehouseRepository.js';
import { WarehouseStockService } from './WarehouseStockService.js';
import { WarehouseInventoryService } from './WarehouseInventoryService.js';
import { WarehouseShortageService } from './WarehouseShortageService.js';
import { WarehouseUsageService } from './WarehouseUsageService.js';

export * from './types.js';

/**
 * WarehouseService - Facade that composes all warehouse sub-services
 */
export class WarehouseService {
  private stockService: WarehouseStockService;
  private inventoryService: WarehouseInventoryService;
  private shortageService: WarehouseShortageService;
  private usageService: WarehouseUsageService;

  constructor(private repository: WarehouseRepository) {
    this.stockService = new WarehouseStockService(repository);
    this.inventoryService = new WarehouseInventoryService(repository);
    this.shortageService = new WarehouseShortageService(repository);
    this.usageService = new WarehouseUsageService(repository);
  }

  // Stock Service methods
  getColorWarehouseData(colorId: number) {
    return this.stockService.getColorWarehouseData(colorId);
  }

  updateStock(
    colorId: number,
    profileId: number,
    currentStockBeams: number,
    userId?: number,
    expectedVersion?: number
  ) {
    return this.stockService.updateStock(colorId, profileId, currentStockBeams, userId, expectedVersion);
  }

  // Inventory Service methods
  performMonthlyUpdate(
    colorId: number,
    updates: import('./types.js').MonthlyUpdateInput[],
    userId?: number
  ) {
    return this.inventoryService.performMonthlyUpdate(colorId, updates, userId);
  }

  rollbackInventory(colorId: number, userId?: number) {
    return this.inventoryService.rollbackInventory(colorId, userId);
  }

  finalizeMonth(month: string, archive: boolean = false) {
    return this.inventoryService.finalizeMonth(month, archive);
  }

  // Shortage Service methods
  getAllShortages() {
    return this.shortageService.getAllShortages();
  }

  // Usage Service methods
  getMonthlyUsage(colorId: number, monthsBack: number = 6) {
    return this.usageService.getMonthlyUsage(colorId, monthsBack);
  }

  getHistoryByColor(colorId?: number, limit: number = 100) {
    return this.usageService.getHistoryByColor(colorId, limit);
  }

  getAllHistory(limit: number = 100) {
    return this.usageService.getAllHistory(limit);
  }
}
