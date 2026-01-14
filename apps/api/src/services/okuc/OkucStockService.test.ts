/**
 * OkucStockService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OkucStockService } from './OkucStockService.js';
import { NotFoundError } from '../../utils/errors.js';
import type { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('OkucStockService', () => {
  let service: OkucStockService;
  let mockRepository: Partial<OkucStockRepository>;

  beforeEach(() => {
    // Mock repository methods
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByArticle: vi.fn(),
      update: vi.fn(),
      adjustQuantity: vi.fn(),
      getSummary: vi.fn(),
      findBelowMinimum: vi.fn(),
      getHistory: vi.fn(),
    };

    service = new OkucStockService(mockRepository as OkucStockRepository);
  });

  describe('getAllStock', () => {
    it('should return all stock items with filters', async () => {
      const mockStock = [
        { id: 1, articleId: 1, warehouseType: 'pvc', currentQuantity: 100 },
        { id: 2, articleId: 2, warehouseType: 'alu', currentQuantity: 50 },
      ];
      (mockRepository.findAll as any).mockResolvedValue(mockStock);

      const result = await service.getAllStock({ warehouseType: 'pvc' });

      expect(result).toEqual(mockStock);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ warehouseType: 'pvc' });
    });
  });

  describe('getStockById', () => {
    it('should return stock when found', async () => {
      const mockStock = { id: 1, articleId: 1, currentQuantity: 100 };
      (mockRepository.findById as any).mockResolvedValue(mockStock);

      const result = await service.getStockById(1);

      expect(result).toEqual(mockStock);
    });

    it('should throw NotFoundError when stock not found', async () => {
      (mockRepository.findById as any).mockResolvedValue(null);

      await expect(service.getStockById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStock', () => {
    it('should update stock with optimistic locking', async () => {
      const mockUpdated = { id: 1, currentQuantity: 150, version: 1 };
      (mockRepository.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateStock(1, { quantity: 150, expectedVersion: 0 }, 1);

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(
        1,
        { currentQuantity: 150, version: 0 },
        1
      );
    });

    it('should throw NotFoundError on version mismatch', async () => {
      (mockRepository.update as any).mockResolvedValue(null);

      await expect(
        service.updateStock(1, { quantity: 150, expectedVersion: 0 }, 1)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStockSummary', () => {
    it('should return stock summary', async () => {
      const mockSummary = [
        { warehouseType: 'pvc', totalItems: 10, totalQuantity: 500 },
      ];
      (mockRepository.getSummary as any).mockResolvedValue(mockSummary);

      const result = await service.getStockSummary();

      expect(result).toEqual(mockSummary);
    });
  });
});
