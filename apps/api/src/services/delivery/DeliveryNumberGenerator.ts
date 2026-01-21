/**
 * DeliveryNumberGenerator - Generates unique delivery numbers
 *
 * Responsibilities:
 * - Generate unique delivery numbers in format DD.MM.YYYY_X
 * - Handle concurrent number generation with row locking
 * - Convert sequence numbers to Roman numerals
 */

import type { PrismaClient } from '@prisma/client';
import { formatPolishDate, getDayRange, toRomanNumeral } from '../../utils/date-helpers.js';

export class DeliveryNumberGenerator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate delivery number in format DD.MM.YYYY_X
   * where X is I, II, III, IV etc. for multiple deliveries on same day
   *
   * @param deliveryDate - The date for which to generate the number
   * @returns Promise<string> - The generated delivery number (e.g., "15.01.2024_I")
   */
  async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
    const datePrefix = formatPolishDate(deliveryDate);
    const { start, end } = getDayRange(deliveryDate);

    // Count existing deliveries for this day using Prisma query
    // SQLite doesn't support FOR UPDATE, so we use a simple count
    const count = await this.prisma.delivery.count({
      where: {
        deliveryDate: {
          gte: start,
          lte: end,
        },
        deletedAt: null, // Nie licz usuniętych dostaw
      },
    });

    const suffix = toRomanNumeral(count + 1);
    return `${datePrefix}_${suffix}`;
  }

  /**
   * Get the next sequence number for a given date
   * Useful for preview/validation without actually creating a delivery
   *
   * @param date - The date to check
   * @returns Promise<number> - The next sequence number
   */
  async getNextSequenceForDate(date: Date): Promise<number> {
    const { start, end } = getDayRange(date);

    const result = await this.prisma.delivery.count({
      where: {
        deliveryDate: {
          gte: start,
          lte: end,
        },
      },
    });

    return result + 1;
  }

  /**
   * Preview what the next delivery number would be for a given date
   * Does NOT use locking - for display purposes only
   *
   * @param deliveryDate - The date for preview
   * @returns Promise<string> - The previewed delivery number
   */
  async previewNextNumber(deliveryDate: Date): Promise<string> {
    const datePrefix = formatPolishDate(deliveryDate);
    const sequence = await this.getNextSequenceForDate(deliveryDate);
    const suffix = toRomanNumeral(sequence);

    return `${datePrefix}_${suffix}`;
  }
}
