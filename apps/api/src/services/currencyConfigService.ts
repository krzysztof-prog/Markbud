/**
 * Currency Configuration Service
 * Manages EUR to PLN exchange rate configuration
 */

import { PrismaClient, CurrencyConfig } from '@prisma/client';

interface CachedConfig {
  config: CurrencyConfig | null;
  expiresAt: number;
}

export class CurrencyConfigService {
  private cache: CachedConfig | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(private prisma: PrismaClient) {}

  /**
   * Get current exchange rate configuration
   * Uses in-memory cache to reduce database load
   */
  async getCurrentRate() {
    const now = Date.now();

    // Return cached config if still valid
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.config;
    }

    // Fetch from database
    const config = await this.prisma.currencyConfig.findFirst({
      orderBy: { effectiveDate: 'desc' },
    });

    // Update cache
    this.cache = {
      config,
      expiresAt: now + this.CACHE_TTL,
    };

    return config;
  }

  /**
   * Invalidate cache (call this after updating rates)
   */
  invalidateCache() {
    this.cache = null;
  }

  /**
   * Update exchange rate
   * Invalidates cache after update
   */
  async updateRate(eurToPlnRate: number, effectiveDate?: Date) {
    const config = await this.prisma.currencyConfig.create({
      data: {
        eurToPlnRate,
        effectiveDate: effectiveDate || new Date(),
      },
    });

    // Invalidate cache so next request fetches new rate
    this.invalidateCache();

    return config;
  }

  /**
   * Get exchange rate history
   */
  async getRateHistory(limit: number = 10) {
    const configs = await this.prisma.currencyConfig.findMany({
      orderBy: { effectiveDate: 'desc' },
      take: limit,
    });

    return configs;
  }

  /**
   * Get exchange rate for a specific date
   */
  async getRateForDate(date: Date) {
    const config = await this.prisma.currencyConfig.findFirst({
      where: {
        effectiveDate: {
          lte: date,
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return config;
  }

  /**
   * Convert EUR to PLN using current rate
   */
  async convertEurToPln(eurAmount: number): Promise<number> {
    const config = await this.getCurrentRate();

    if (!config) {
      throw new Error('No currency configuration found. Please set exchange rate first.');
    }

    return eurAmount * config.eurToPlnRate;
  }

  /**
   * Convert PLN to EUR using current rate
   */
  async convertPlnToEur(plnAmount: number): Promise<number> {
    const config = await this.getCurrentRate();

    if (!config) {
      throw new Error('No currency configuration found. Please set exchange rate first.');
    }

    return plnAmount / config.eurToPlnRate;
  }
}
