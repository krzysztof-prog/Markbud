/**
 * OkucStockService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OkucStockService } from './OkucStockService.js';
import { OkucStockRepository } from '../../repositories/okuc/OkucStockRepository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { createMockPrisma } from '../../tests/mocks/prisma.mock.js';

// Mock prisma
const mockPrisma = createMockPrisma();
vi.mock('../../utils/prisma.js', () => ({
  prisma: mockPrisma,
}));

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
  let mockRepository: any;

  beforeEach(() => {
    // Mock repository
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

    service = new OkucStockService(mockRepository);
  });

  describe('getAllStock', () => {
    it('should return all stock items with filters', async () => {
      const mockStock = [
        { id: 1, articleId: 1, warehouseType: 'pvc', currentQuantity: 100 },
        { id: 2, articleId: 2, warehouseType: 'alu', currentQuantity: 50 },
      ];
      mockRepository.findAll.mockResolvedValue(mockStock);

      const result = await service.getAllStock({ warehouseType: 'pvc' });

      expect(result).toEqual(mockStock);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ warehouseType: 'pvc' });
    });
  });

  describe('getStockById', () => {
    it('should return stock when found', async () => {
      const mockStock = { id: 1, articleId: 1, currentQuantity: 100 };
      mockRepository.findById.mockResolvedValue(mockStock);

      const result = await service.getStockById(1);

      expect(result).toEqual(mockStock);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when stock not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getStockById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStockByArticle', () => {
    it('should return stock by article and warehouse', async () => {
      const mockStock = { id: 1, articleId: 1, warehouseType: 'pvc', currentQuantity: 100 };
      mockRepository.findByArticle.mockResolvedValue(mockStock);

      const result = await service.getStockByArticle(1, 'pvc');

      expect(result).toEqual(mockStock);
      expect(mockRepository.findByArticle).toHaveBeenCalledWith(1, 'pvc', undefined);
    });

    it('should throw NotFoundError when stock not found', async () => {
      mockRepository.findByArticle.mockResolvedValue(null);

      await expect(service.getStockByArticle(999, 'pvc')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStock', () => {
    it('should update stock with optimistic locking', async () => {
      const mockUpdated = { id: 1, currentQuantity: 150, version: 1 };
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.updateStock(1, { quantity: 150, expectedVersion: 0 }, 1);

      expect(result).toEqual(mockUpdated);
      expect(mockRepository.update).toHaveBeenCalledWith(
        1,
        { currentQuantity: 150, version: 0 },
        1
      );
    });

    it('should throw NotFoundError on version mismatch', async () => {
      mockRepository.update.mockResolvedValue(null);

      await expect(
        service.updateStock(1, { quantity: 150, expectedVersion: 0 }, 1)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('adjustStockQuantity', () => {
    it('should adjust stock quantity', async () => {
      const mockAdjusted = { id: 1, currentQuantity: 110, version: 1 };
      mockRepository.adjustQuantity.mockResolvedValue(mockAdjusted);

      const result = await service.adjustStockQuantity(1, 10, 0, 1);

      expect(result).toEqual(mockAdjusted);
      expect(mockRepository.adjustQuantity).toHaveBeenCalledWith(1, 10, 0, 1);
    });

    it('should throw NotFoundError when stock not found', async () => {
      mockRepository.adjustQuantity.mockResolvedValue(null);

      await expect(service.adjustStockQuantity(999, 10, 0, 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStockSummary', () => {
    it('should return stock summary', async () => {
      const mockSummary = [
        { warehouseType: 'pvc', totalItems: 10, totalQuantity: 500 },
        { warehouseType: 'alu', totalItems: 5, totalQuantity: 250 },
      ];
      mockRepository.getSummary.mockResolvedValue(mockSummary);

      const result = await service.getStockSummary();

      expect(result).toEqual(mockSummary);
      expect(mockRepository.getSummary).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getStockBelowMinimum', () => {
    it('should return stock below minimum', async () => {
      const mockBelowMin = [
        { id: 1, articleId: 1, currentQuantity: 5, minStock: 10 },
      ];
      mockRepository.findBelowMinimum.mockResolvedValue(mockBelowMin);

      const result = await service.getStockBelowMinimum('pvc');

      expect(result).toEqual(mockBelowMin);
      expect(mockRepository.findBelowMinimum).toHaveBeenCalledWith('pvc');
    });
  });

  describe('previewImport', () => {
    it('should parse CSV and detect new stock items', async () => {
      const csvContent = `Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
A001;PVC;Produkcja;100;50;200`;

      mockPrisma.okucArticle.findFirst.mockResolvedValue({ id: 1, articleId: 'A001' });
      mockPrisma.okucStock.findFirst.mockResolvedValue(null);

      const result = await service.previewImport(csvContent);

      expect(result.new).toHaveLength(1);
      expect(result.new[0]).toMatchObject({
        articleId: 'A001',
        warehouseType: 'pvc',
        subWarehouse: 'production',
        currentQuantity: 100,
        minStock: 50,
        maxStock: 200,
      });
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect conflicts with existing stock', async () => {
      const csvContent = `Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
A001;PVC;Produkcja;100;50;200`;

      mockPrisma.okucArticle.findFirst.mockResolvedValue({ id: 1, articleId: 'A001' });
      mockPrisma.okucStock.findFirst.mockResolvedValue({
        id: 1,
        articleId: 1,
        warehouseType: 'pvc',
        subWarehouse: 'production',
        currentQuantity: 75,
        minStock: 30,
        maxStock: 150,
      });

      const result = await service.previewImport(csvContent);

      expect(result.new).toHaveLength(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        articleId: 'A001',
        warehouseType: 'pvc',
        subWarehouse: 'production',
        existingData: { currentQuantity: 75, minStock: 30, maxStock: 150 },
        newData: { currentQuantity: 100, minStock: 50, maxStock: 200 },
      });
    });

    it('should report errors for invalid warehouse type', async () => {
      const csvContent = `Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
A001;INVALID;Produkcja;100;50;200`;

      const result = await service.previewImport(csvContent);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        row: 2,
        error: expect.stringContaining('Nieprawidlowy typ magazynu'),
      });
    });

    it('should throw ValidationError for empty CSV', async () => {
      const csvContent = `Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny`;

      await expect(service.previewImport(csvContent)).rejects.toThrow(ValidationError);
    });
  });

  describe('exportStockToCsv', () => {
    it('should export stock to CSV', async () => {
      const mockStock = [
        {
          id: 1,
          articleId: 1,
          article: {
            articleId: 'A001',
            name: 'Article 1',
            location: { name: 'Magazyn 1' },
          },
          warehouseType: 'pvc',
          subWarehouse: 'production',
          currentQuantity: 100,
          reservedQty: 10,
          minStock: 50,
          maxStock: 200,
        },
      ];
      mockRepository.findAll.mockResolvedValue(mockStock);

      const csv = await service.exportStockToCsv({});

      expect(csv).toContain('Numer artykulu;Nazwa artykulu');
      expect(csv).toContain('A001;Article 1');
      expect(csv).toContain('PVC;Produkcja');
      expect(mockRepository.findAll).toHaveBeenCalledWith({});
    });
  });
});
