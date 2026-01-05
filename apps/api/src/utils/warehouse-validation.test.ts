import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateSufficientStock } from './warehouse-validation.js';
import { ValidationError } from './errors.js';
import type { PrismaClient } from '@prisma/client';

describe('Warehouse Validation - validateSufficientStock', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      orderRequirement: {
        findMany: vi.fn(),
      },
      warehouseStock: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  describe('Sufficient Stock Cases', () => {
    it('should pass when sufficient stock available', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
        {
          profileId: 2,
          colorId: 2,
          beamsCount: 5,
          profile: { id: 2, number: '456', name: 'Profile B' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 15, // 15 > 10 required ✓
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
        {
          profileId: 2,
          colorId: 2,
          currentStockBeams: 10, // 10 > 5 required ✓
          profile: { id: 2, number: '456' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      const result = await validateSufficientStock(mockPrisma, 123);

      expect(result).toBe(true);
    });

    it('should pass when stock exactly matches requirement', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 10, // Exact match ✓
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      const result = await validateSufficientStock(mockPrisma, 123);

      expect(result).toBe(true);
    });

    it('should pass when order has no requirements', async () => {
      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue([]);

      const result = await validateSufficientStock(mockPrisma, 123);

      expect(result).toBe(true);
    });
  });

  describe('Insufficient Stock Cases (Edge Cases)', () => {
    it('should throw when stock is less than requirement', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 5, // 5 < 10 required ✗
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        ValidationError
      );

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        /Niewystarczający stan magazynu/
      );

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        /123.*BLACK.*potrzeba 10 bel.*dostępne 5.*brakuje 5/
      );
    });

    it('should throw when stock record does not exist', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      // No stock records returned
      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue([]);

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        ValidationError
      );

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        /dostępne 0.*brakuje 10/
      );
    });

    it('should throw when multiple profiles have insufficient stock', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
        {
          profileId: 2,
          colorId: 2,
          beamsCount: 8,
          profile: { id: 2, number: '456', name: 'Profile B' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
        {
          profileId: 3,
          colorId: 3,
          beamsCount: 5,
          profile: { id: 3, number: '789', name: 'Profile C' },
          color: { id: 3, code: 'WHITE', name: 'White' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 5, // Insufficient
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
        {
          profileId: 2,
          colorId: 2,
          currentStockBeams: 3, // Insufficient
          profile: { id: 2, number: '456' },
          color: { id: 2, code: 'BLACK' },
        },
        {
          profileId: 3,
          colorId: 3,
          currentStockBeams: 10, // Sufficient
          profile: { id: 3, number: '789' },
          color: { id: 3, code: 'WHITE' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        ValidationError
      );

      // Should list all shortages
      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(/123.*BLACK/);
      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(/456.*BLACK/);
    });

    it('should prevent negative stock from production (Edge Case 7.3)', async () => {
      // Edge case from EDGE_CASES_ANALYSIS.md:
      // Rozpoczęcie produkcji z niewystarczającymi materiałami
      // Prevents: currentStock - demand < 0

      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 15, // Need 15
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 10, // Only have 10
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        ValidationError
      );

      // Should clearly indicate shortage
      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        /brakuje 5/
      );

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        /Uzupełnij magazyn lub zmień wymagania zlecenia/
      );
    });
  });

  describe('Mixed Scenarios', () => {
    it('should validate all profiles before throwing', async () => {
      // Should check ALL profiles, not fail at first shortage
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
        {
          profileId: 2,
          colorId: 2,
          beamsCount: 5,
          profile: { id: 2, number: '456', name: 'Profile B' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 5, // Insufficient
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
        {
          profileId: 2,
          colorId: 2,
          currentStockBeams: 2, // Insufficient
          profile: { id: 2, number: '456' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      await expect(validateSufficientStock(mockPrisma, 123)).rejects.toThrow(
        ValidationError
      );

      // Both shortages should be in error message
      const error = await validateSufficientStock(mockPrisma, 123).catch((e) => e);
      expect(error.message).toContain('123');
      expect(error.message).toContain('456');
    });

    it('should only fail for insufficient profiles, not all', async () => {
      const requirements = [
        {
          profileId: 1,
          colorId: 2,
          beamsCount: 10,
          profile: { id: 1, number: '123', name: 'Profile A' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
        {
          profileId: 2,
          colorId: 2,
          beamsCount: 5,
          profile: { id: 2, number: '456', name: 'Profile B' },
          color: { id: 2, code: 'BLACK', name: 'Black' },
        },
      ];

      const stocks = [
        {
          profileId: 1,
          colorId: 2,
          currentStockBeams: 15, // Sufficient
          profile: { id: 1, number: '123' },
          color: { id: 2, code: 'BLACK' },
        },
        {
          profileId: 2,
          colorId: 2,
          currentStockBeams: 2, // Insufficient
          profile: { id: 2, number: '456' },
          color: { id: 2, code: 'BLACK' },
        },
      ];

      vi.mocked(mockPrisma.orderRequirement.findMany).mockResolvedValue(
        requirements as any
      );
      vi.mocked(mockPrisma.warehouseStock.findMany).mockResolvedValue(stocks as any);

      const error = await validateSufficientStock(mockPrisma, 123).catch((e) => e);

      // Should only mention the insufficient profile
      expect(error.message).toContain('456');
      expect(error.message).not.toContain('123'); // Don't mention sufficient stock
    });
  });
});
