/**
 * DeliveryOptimizationService - Pallet packing and optimization algorithms wrapper
 *
 * Responsibilities:
 * - Coordinate pallet optimization for deliveries
 * - Provide dimension calculations
 * - Interface with PalletOptimizerService for actual algorithms
 * - Validate delivery readiness for optimization
 *
 * This service acts as a facade for the pallet optimization functionality,
 * exposing only what's needed by DeliveryService while delegating to
 * the specialized PalletOptimizerService for the actual algorithms.
 */

import { PalletOptimizerService, type OptimizationResult, type OptimizationOptions } from '../pallet-optimizer/PalletOptimizerService.js';
import { PalletOptimizerRepository } from '../../repositories/PalletOptimizerRepository.js';
import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Summary of delivery dimensions for optimization planning
 */
export interface DeliveryDimensionsSummary {
  deliveryId: number;
  totalWindows: number;
  windowsByProfile: Map<string, number>;
  maxWidthMm: number;
  maxHeightMm: number;
  totalEstimatedDepthMm: number;
  isReadyForOptimization: boolean;
  missingData: string[];
}

/**
 * Result of optimization validation
 */
export interface OptimizationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Optimization status for a delivery
 */
export interface OptimizationStatus {
  deliveryId: number;
  hasOptimization: boolean;
  optimizedAt?: Date;
  totalPallets?: number;
  averageUtilization?: number;
}

export class DeliveryOptimizationService {
  private palletOptimizerService: PalletOptimizerService;

  constructor(
    private deliveryRepository: DeliveryRepository,
    private palletOptimizerRepository: PalletOptimizerRepository,
    private prisma: PrismaClient
  ) {
    this.palletOptimizerService = new PalletOptimizerService(palletOptimizerRepository);
  }

  // ===================
  // Optimization Operations
  // ===================

  /**
   * Run pallet optimization for a delivery
   * This is the main entry point for optimization from DeliveryService
   */
  async optimizeDelivery(
    deliveryId: number,
    options?: Partial<OptimizationOptions>
  ): Promise<OptimizationResult> {
    logger.info(`DeliveryOptimizationService: Starting optimization for delivery ${deliveryId}`);

    // Validate before optimization
    const validation = await this.validateForOptimization(deliveryId);
    if (!validation.isValid) {
      throw new ValidationError(
        `Delivery not ready for optimization: ${validation.errors.join(', ')}`
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn(`Optimization warnings for delivery ${deliveryId}:`, validation.warnings);
    }

    // Delegate to PalletOptimizerService
    const result = await this.palletOptimizerService.optimizeDelivery(deliveryId, options);

    logger.info(`DeliveryOptimizationService: Optimization completed for delivery ${deliveryId}`, {
      totalPallets: result.totalPallets,
      totalWindows: result.summary.totalWindows,
      averageUtilization: result.summary.averageUtilization.toFixed(2),
    });

    return result;
  }

  /**
   * Get existing optimization for a delivery
   */
  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    return this.palletOptimizerService.getOptimization(deliveryId);
  }

  /**
   * Delete optimization for a delivery
   */
  async deleteOptimization(deliveryId: number): Promise<void> {
    await this.palletOptimizerService.deleteOptimization(deliveryId);
    logger.info(`DeliveryOptimizationService: Deleted optimization for delivery ${deliveryId}`);
  }

  /**
   * Check if a delivery has been optimized
   */
  async hasOptimization(deliveryId: number): Promise<boolean> {
    const optimization = await this.getOptimization(deliveryId);
    return optimization !== null;
  }

  /**
   * Get optimization status for a delivery
   */
  async getOptimizationStatus(deliveryId: number): Promise<OptimizationStatus> {
    const optimization = await this.getOptimization(deliveryId);

    if (!optimization) {
      return {
        deliveryId,
        hasOptimization: false,
      };
    }

    return {
      deliveryId,
      hasOptimization: true,
      totalPallets: optimization.totalPallets,
      averageUtilization: optimization.summary.averageUtilization,
    };
  }

  // ===================
  // Validation Operations
  // ===================

  /**
   * Validate if a delivery is ready for optimization
   */
  async validateForOptimization(deliveryId: number): Promise<OptimizationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check delivery exists
    const delivery = await this.deliveryRepository.findById(deliveryId);
    if (!delivery) {
      return {
        isValid: false,
        errors: ['Delivery not found'],
        warnings: [],
      };
    }

    // Check delivery has orders
    if (!delivery.deliveryOrders || delivery.deliveryOrders.length === 0) {
      errors.push('Delivery has no orders assigned');
    }

    // Check orders have windows
    const windows = await this.palletOptimizerRepository.getDeliveryWindows(deliveryId).catch(() => []);
    if (windows.length === 0) {
      errors.push('Delivery orders have no windows to optimize');
    }

    // Check profile depths are configured
    const profileDepths = await this.palletOptimizerRepository.getProfileDepths();
    if (Object.keys(profileDepths).length === 0) {
      errors.push('No profile depths configured in database');
    }

    // Check all window profile types have depths configured
    const missingProfiles = new Set<string>();
    for (const window of windows) {
      if (!profileDepths[window.profileType]) {
        missingProfiles.add(window.profileType);
      }
    }
    if (missingProfiles.size > 0) {
      errors.push(`Unknown profile types: ${Array.from(missingProfiles).join(', ')}`);
    }

    // Check pallet types are configured
    const palletTypes = await this.palletOptimizerRepository.getPalletTypes();
    if (palletTypes.length === 0) {
      errors.push('No pallet types defined in database');
    }

    // Warnings for potential issues
    const veryLargeWindows = windows.filter(
      (w) => w.widthMm > Math.max(...palletTypes.map((p) => p.lengthMm + p.maxOverhangMm))
    );
    if (veryLargeWindows.length > 0) {
      warnings.push(
        `${veryLargeWindows.length} window(s) exceed maximum pallet width including overhang`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ===================
  // Dimension Calculations
  // ===================

  /**
   * Get summary of delivery dimensions for optimization planning
   */
  async getDeliveryDimensionsSummary(deliveryId: number): Promise<DeliveryDimensionsSummary> {
    const windows = await this.palletOptimizerRepository.getDeliveryWindows(deliveryId).catch(() => []);
    const profileDepths = await this.palletOptimizerRepository.getProfileDepths();

    const windowsByProfile = new Map<string, number>();
    let maxWidthMm = 0;
    let maxHeightMm = 0;
    let totalEstimatedDepthMm = 0;
    const missingData: string[] = [];

    for (const window of windows) {
      // Count windows by profile
      const count = windowsByProfile.get(window.profileType) || 0;
      windowsByProfile.set(window.profileType, count + window.quantity);

      // Track max dimensions
      if (window.widthMm > maxWidthMm) maxWidthMm = window.widthMm;
      if (window.heightMm > maxHeightMm) maxHeightMm = window.heightMm;

      // Calculate estimated depth
      const depth = profileDepths[window.profileType];
      if (depth) {
        totalEstimatedDepthMm += depth * window.quantity;
      } else {
        missingData.push(`Missing depth for profile: ${window.profileType}`);
      }
    }

    return {
      deliveryId,
      totalWindows: windows.reduce((sum, w) => sum + w.quantity, 0),
      windowsByProfile,
      maxWidthMm,
      maxHeightMm,
      totalEstimatedDepthMm,
      isReadyForOptimization: windows.length > 0 && missingData.length === 0,
      missingData,
    };
  }

  /**
   * Estimate number of pallets needed (rough estimate for planning)
   */
  async estimatePalletCount(deliveryId: number): Promise<number> {
    const summary = await this.getDeliveryDimensionsSummary(deliveryId);
    const palletTypes = await this.palletOptimizerRepository.getPalletTypes();

    if (palletTypes.length === 0 || summary.totalWindows === 0) {
      return 0;
    }

    // Use the largest pallet type for estimation
    const largestPallet = palletTypes.reduce((max, p) =>
      p.maxLoadDepthMm > max.maxLoadDepthMm ? p : max
    );

    // Rough estimate: total depth / pallet depth, rounded up
    return Math.ceil(summary.totalEstimatedDepthMm / largestPallet.maxLoadDepthMm);
  }

  // ===================
  // Pallet Type Management (delegated)
  // ===================

  /**
   * Get all pallet types
   */
  async getAllPalletTypes() {
    return this.palletOptimizerService.getAllPalletTypes();
  }

  /**
   * Get pallet type by ID
   */
  async getPalletTypeById(id: number) {
    return this.palletOptimizerService.getPalletTypeById(id);
  }

  /**
   * Create a new pallet type
   */
  async createPalletType(data: { name: string; lengthMm: number; loadDepthMm: number }) {
    return this.palletOptimizerService.createPalletType(data);
  }

  /**
   * Update a pallet type
   */
  async updatePalletType(id: number, data: { name?: string; lengthMm?: number; loadDepthMm?: number }) {
    return this.palletOptimizerService.updatePalletType(id, data);
  }

  /**
   * Delete a pallet type
   */
  async deletePalletType(id: number) {
    return this.palletOptimizerService.deletePalletType(id);
  }
}
