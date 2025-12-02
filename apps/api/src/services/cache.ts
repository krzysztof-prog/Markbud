import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

/**
 * Cache Service - Centralized in-memory caching
 *
 * TTL Strategy:
 * - Rarely changing data (profiles, colors): 1 hour (3600s)
 * - Occasionally changing data (warehouse stats): 5 minutes (300s)
 * - Dynamic data: Not cached (or WebSocket only)
 */

interface CacheConfig {
  stdTTL: number; // Default TTL in seconds
  checkperiod: number; // Check period for expired keys
}

// Default config: 5 minute standard TTL, cleanup every 10 seconds
const DEFAULT_CONFIG: CacheConfig = {
  stdTTL: 300, // 5 minutes default
  checkperiod: 10, // Clean up expired keys every 10 seconds
};

class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;

  // Cache key constants - for easier management
  private static readonly CACHE_KEYS = {
    PROFILES: 'profiles',
    COLORS: 'colors',
    COLORS_TYPICAL: 'colors:typical',
    COLORS_ATYPICAL: 'colors:atypical',
    WORKING_DAYS: 'working_days',
    HOLIDAY_CALENDAR: 'holiday_calendar',
    CURRENCY_RATE: 'currency_rate',
    PALLET_TYPES: 'pallet_types',
  } as const;

  private constructor(config: CacheConfig = DEFAULT_CONFIG) {
    this.cache = new NodeCache(config);

    // Listen for warnings (shouldn't happen with proper TTL)
    this.cache.on('expiration', (key: string) => {
      logger.debug('Cache expired', { key });
    });

    logger.info('Cache service initialized', {
      stdTTL: config.stdTTL,
      checkperiod: config.checkperiod,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      logger.debug('Cache hit', { key });
    }
    return value;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL in seconds (overrides default)
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = ttl !== undefined
      ? this.cache.set<T>(key, value, ttl)
      : this.cache.set<T>(key, value);
    logger.debug('Cache set', { key, ttl: ttl ?? DEFAULT_CONFIG.stdTTL });
    return success;
  }

  /**
   * Get or compute value
   * @param key Cache key
   * @param compute Function to compute value if not cached
   * @param ttl Optional TTL in seconds
   * @returns Cached or computed value
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Compute value
    const value = await compute();

    // Store in cache
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Delete specific key
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Delete multiple keys
   */
  delMultiple(keys: string[]): number {
    return this.cache.del(keys);
  }

  /**
   * Clear all cache
   */
  flush(): void {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Invalidate related caches when data changes
   *
   * Example usage:
   * - After profile update: invalidateOnProfileChange()
   * - After color update: invalidateOnColorChange()
   * - After stock update: invalidateOnStockChange()
   */
  invalidateOnProfileChange(): void {
    this.del(CacheService.CACHE_KEYS.PROFILES);
    logger.info('Invalidated profiles cache');
  }

  invalidateOnColorChange(): void {
    this.delMultiple([
      CacheService.CACHE_KEYS.COLORS,
      CacheService.CACHE_KEYS.COLORS_TYPICAL,
      CacheService.CACHE_KEYS.COLORS_ATYPICAL,
    ]);
    logger.info('Invalidated colors cache');
  }

  invalidateOnWorkingDaysChange(): void {
    this.delMultiple([
      CacheService.CACHE_KEYS.WORKING_DAYS,
      CacheService.CACHE_KEYS.HOLIDAY_CALENDAR,
    ]);
    logger.info('Invalidated working days cache');
  }

  invalidateOnCurrencyChange(): void {
    this.del(CacheService.CACHE_KEYS.CURRENCY_RATE);
    logger.info('Invalidated currency cache');
  }

  invalidateOnPalletTypesChange(): void {
    this.del(CacheService.CACHE_KEYS.PALLET_TYPES);
    logger.info('Invalidated pallet types cache');
  }

  // Static cache key accessors (for use in routes)
  static KEYS = CacheService.CACHE_KEYS;
}

export const cacheService = CacheService.getInstance();
export type { CacheService };
