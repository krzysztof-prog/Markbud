/**
 * Import Settings Service
 *
 * Manages import-related settings including:
 * - Per-user folder paths
 * - Global settings fallback
 * - Settings caching for performance
 */

import type { PrismaClient, UserFolderSettings } from '@prisma/client';
import { ImportRepository } from '../../repositories/ImportRepository.js';

// Default base path for imports
const DEFAULT_IMPORTS_BASE_PATH = 'C:\\Dostawy';

// Simple in-memory cache for settings
interface SettingsCache {
  globalBasePath?: { value: string; timestamp: number };
  userSettings: Map<number, { value: UserFolderSettings | null; timestamp: number }>;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Import Settings Service
 *
 * Handles all settings-related operations for the import module.
 * Includes simple caching to reduce database queries.
 */
export class ImportSettingsService {
  private cache: SettingsCache = {
    userSettings: new Map(),
  };

  constructor(
    private prisma: PrismaClient,
    private repository: ImportRepository
  ) {}

  /**
   * Get imports base path from settings or environment
   * Supports per-user folder settings if userId is provided
   *
   * Priority:
   * 1. User-specific active settings
   * 2. Global setting from database
   * 3. Environment variable IMPORTS_BASE_PATH
   * 4. Default path (C:\Dostawy)
   */
  async getImportsBasePath(userId?: number): Promise<string> {
    // Check for user-specific settings first
    if (userId) {
      const userSettings = await this.getUserSettings(userId);
      if (userSettings && userSettings.isActive) {
        return userSettings.importsBasePath;
      }
    }

    // Fallback to global setting (with cache)
    return this.getGlobalBasePath();
  }

  /**
   * Get user-specific folder settings
   * Uses cache to avoid repeated database queries
   */
  async getUserSettings(userId: number): Promise<UserFolderSettings | null> {
    const now = Date.now();
    const cached = this.cache.userSettings.get(userId);

    // Return cached value if still valid
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    // Fetch from database
    const userSettings = await this.prisma.userFolderSettings.findUnique({
      where: { userId },
    });

    // Update cache
    this.cache.userSettings.set(userId, {
      value: userSettings,
      timestamp: now,
    });

    return userSettings;
  }

  /**
   * Get global base path setting
   * Uses cache to avoid repeated database queries
   */
  private async getGlobalBasePath(): Promise<string> {
    const now = Date.now();

    // Return cached value if still valid
    if (this.cache.globalBasePath && now - this.cache.globalBasePath.timestamp < CACHE_TTL) {
      return this.cache.globalBasePath.value;
    }

    // Fetch from database
    const settingValue = await this.repository.getSetting('importsBasePath');

    let basePath: string;
    if (settingValue) {
      basePath = settingValue;
    } else {
      basePath = process.env.IMPORTS_BASE_PATH || DEFAULT_IMPORTS_BASE_PATH;
    }

    // Update cache
    this.cache.globalBasePath = {
      value: basePath,
      timestamp: now,
    };

    return basePath;
  }

  /**
   * Set user-specific imports base path
   */
  async setUserImportsBasePath(
    userId: number,
    importsBasePath: string,
    isActive: boolean = true
  ): Promise<UserFolderSettings> {
    const result = await this.prisma.userFolderSettings.upsert({
      where: { userId },
      update: {
        importsBasePath,
        isActive,
        updatedAt: new Date(),
      },
      create: {
        userId,
        importsBasePath,
        isActive,
      },
    });

    // Invalidate cache for this user
    this.cache.userSettings.delete(userId);

    return result;
  }

  /**
   * Clear all caches
   * Useful when settings are updated externally
   */
  clearCache(): void {
    this.cache.globalBasePath = undefined;
    this.cache.userSettings.clear();
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidateUserCache(userId: number): void {
    this.cache.userSettings.delete(userId);
  }

  /**
   * Invalidate global settings cache
   */
  invalidateGlobalCache(): void {
    this.cache.globalBasePath = undefined;
  }

  /**
   * Get the default imports base path
   */
  getDefaultBasePath(): string {
    return DEFAULT_IMPORTS_BASE_PATH;
  }
}
