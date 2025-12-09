/**
 * WarehouseHandler Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WarehouseHandler } from './warehouseHandler.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WarehouseService } from '../services/warehouseService.js';

// Mock validators
vi.mock('../validators/warehouse.js', () => ({
  warehouseStatsQuerySchema: {
    parse: vi.fn((data) => data),
  },
}));

// Mock event emitter
vi.mock('../services/event-emitter.js', () => ({
  emitWarehouseStockUpdated: vi.fn(),
}));

describe('WarehouseHandler', () => {
  let handler: WarehouseHandler;
  let mockService: {
    getStock: ReturnType<typeof vi.fn>;
    updateStock: ReturnType<typeof vi.fn>;
    getWarehouseTableByColor: ReturnType<typeof vi.fn>;
    updateStockByCompositeKey: ReturnType<typeof vi.fn>;
    monthlyUpdate: ReturnType<typeof vi.fn>;
    getHistoryByColor: ReturnType<typeof vi.fn>;
    getHistory: ReturnType<typeof vi.fn>;
    getShortages: ReturnType<typeof vi.fn>;
    rollbackInventory: ReturnType<typeof vi.fn>;
    getAverageUsage: ReturnType<typeof vi.fn>;
    finalizeMonth: ReturnType<typeof vi.fn>;
    bulkUpdateStocks: ReturnType<typeof vi.fn>;
    getAvailableProfiles: ReturnType<typeof vi.fn>;
    initializeWarehouse: ReturnType<typeof vi.fn>;
  };
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  const mockStock = {
    id: 1,
    profileId: 1,
    colorId: 3,
    currentStockBeams: 50,
    previousStockBeams: 45,
    usedBeams: 10,
    orderedBeams: 15,
    profile: { number: '12345', articleNumber: 'ART-001' },
    color: { code: '9016', name: 'White' },
  };

  beforeEach(() => {
    mockService = {
      getStock: vi.fn(),
      updateStock: vi.fn(),
      getWarehouseTableByColor: vi.fn(),
      updateStockByCompositeKey: vi.fn(),
      monthlyUpdate: vi.fn(),
      getHistoryByColor: vi.fn(),
      getHistory: vi.fn(),
      getShortages: vi.fn(),
      rollbackInventory: vi.fn(),
      getAverageUsage: vi.fn(),
      finalizeMonth: vi.fn(),
      bulkUpdateStocks: vi.fn(),
      getAvailableProfiles: vi.fn(),
      initializeWarehouse: vi.fn(),
    };

    handler = new WarehouseHandler(mockService as unknown as WarehouseService);

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStock', () => {
    it('should return all stock without filters', async () => {
      const stocks = [mockStock];
      mockService.getStock.mockResolvedValue(stocks);

      await handler.getStock(mockRequest as any, mockReply as any);

      expect(mockService.getStock).toHaveBeenCalledWith(undefined, undefined);
      expect(mockReply.send).toHaveBeenCalledWith(stocks);
    });

    it('should return stock filtered by profileId', async () => {
      mockRequest.query = { profileId: '1' };
      const stocks = [mockStock];
      mockService.getStock.mockResolvedValue(stocks);

      await handler.getStock(mockRequest as any, mockReply as any);

      expect(mockService.getStock).toHaveBeenCalledWith(1, undefined);
      expect(mockReply.send).toHaveBeenCalledWith(stocks);
    });

    it('should return stock filtered by colorId', async () => {
      mockRequest.query = { colorId: '3' };
      const stocks = [mockStock];
      mockService.getStock.mockResolvedValue(stocks);

      await handler.getStock(mockRequest as any, mockReply as any);

      expect(mockService.getStock).toHaveBeenCalledWith(undefined, 3);
      expect(mockReply.send).toHaveBeenCalledWith(stocks);
    });

    it('should return stock filtered by both profileId and colorId', async () => {
      mockRequest.query = { profileId: '1', colorId: '3' };
      const stocks = [mockStock];
      mockService.getStock.mockResolvedValue(stocks);

      await handler.getStock(mockRequest as any, mockReply as any);

      expect(mockService.getStock).toHaveBeenCalledWith(1, 3);
      expect(mockReply.send).toHaveBeenCalledWith(stocks);
    });
  });

  describe('updateStock', () => {
    it('should update stock by id', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { currentStockBeams: 60 };
      const updatedStock = { ...mockStock, currentStockBeams: 60 };
      mockService.updateStock.mockResolvedValue(updatedStock);

      await handler.updateStock(mockRequest as any, mockReply as any);

      expect(mockService.updateStock).toHaveBeenCalledWith(1, 60);
      expect(mockReply.send).toHaveBeenCalledWith(updatedStock);
    });

    it('should handle zero stock', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { currentStockBeams: 0 };
      const updatedStock = { ...mockStock, currentStockBeams: 0 };
      mockService.updateStock.mockResolvedValue(updatedStock);

      await handler.updateStock(mockRequest as any, mockReply as any);

      expect(mockService.updateStock).toHaveBeenCalledWith(1, 0);
    });
  });

  describe('getWarehouseTable', () => {
    it('should return warehouse table data by color', async () => {
      mockRequest.params = { colorId: '3' };
      const tableData = {
        profiles: [{ id: 1, number: '12345', articleNumber: 'ART-001' }],
        stocks: [mockStock],
        totals: { currentStock: 50, usedBeams: 10, orderedBeams: 15 },
      };
      mockService.getWarehouseTableByColor.mockResolvedValue(tableData);

      await handler.getWarehouseTable(mockRequest as any, mockReply as any);

      expect(mockService.getWarehouseTableByColor).toHaveBeenCalledWith(3);
      expect(mockReply.send).toHaveBeenCalledWith(tableData);
    });

    it('should return 400 for invalid colorId', async () => {
      mockRequest.params = { colorId: 'invalid' };

      await handler.getWarehouseTable(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid colorId' });
      expect(mockService.getWarehouseTableByColor).not.toHaveBeenCalled();
    });
  });

  describe('updateStockByCompositeKey', () => {
    it('should update stock by composite key and emit event', async () => {
      mockRequest.params = { colorId: '3', profileId: '1' };
      mockRequest.body = { currentStockBeams: 70 };
      const updatedStock = { ...mockStock, currentStockBeams: 70 };
      mockService.updateStockByCompositeKey.mockResolvedValue(updatedStock);

      await handler.updateStockByCompositeKey(mockRequest as any, mockReply as any);

      expect(mockService.updateStockByCompositeKey).toHaveBeenCalledWith(1, 3, 70);
      expect(mockReply.send).toHaveBeenCalledWith(updatedStock);

      const { emitWarehouseStockUpdated } = await import('../services/event-emitter.js');
      expect(emitWarehouseStockUpdated).toHaveBeenCalledWith(updatedStock);
    });

    it('should return 400 when currentStockBeams is missing', async () => {
      mockRequest.params = { colorId: '3', profileId: '1' };
      mockRequest.body = {};

      await handler.updateStockByCompositeKey(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'currentStockBeams is required',
      });
      expect(mockService.updateStockByCompositeKey).not.toHaveBeenCalled();
    });

    it('should return 400 when currentStockBeams is zero (falsy value)', async () => {
      mockRequest.params = { colorId: '3', profileId: '1' };
      mockRequest.body = { currentStockBeams: 0 };

      await handler.updateStockByCompositeKey(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'currentStockBeams is required',
      });
      expect(mockService.updateStockByCompositeKey).not.toHaveBeenCalled();
    });
  });

  describe('monthlyUpdate', () => {
    it('should perform monthly inventory update', async () => {
      mockRequest.body = {
        colorId: 3,
        updates: [
          { profileId: 1, actualStock: 50 },
          { profileId: 2, actualStock: 30 },
        ],
      };
      const result = { updated: 2, created: 0 };
      mockService.monthlyUpdate.mockResolvedValue(result);

      await handler.monthlyUpdate(mockRequest as any, mockReply as any);

      expect(mockService.monthlyUpdate).toHaveBeenCalledWith(3, [
        { profileId: 1, actualStock: 50 },
        { profileId: 2, actualStock: 30 },
      ]);
      expect(mockReply.send).toHaveBeenCalledWith(result);
    });

    it('should handle empty updates array', async () => {
      mockRequest.body = {
        colorId: 3,
        updates: [],
      };
      const result = { updated: 0, created: 0 };
      mockService.monthlyUpdate.mockResolvedValue(result);

      await handler.monthlyUpdate(mockRequest as any, mockReply as any);

      expect(mockService.monthlyUpdate).toHaveBeenCalledWith(3, []);
    });
  });

  describe('getHistoryByColor', () => {
    it('should return history for specific color', async () => {
      mockRequest.params = { colorId: '3' };
      const history = [
        {
          id: 1,
          colorId: 3,
          profileId: 1,
          previousStock: 45,
          currentStock: 50,
          difference: 5,
          createdAt: new Date('2025-12-01'),
        },
      ];
      mockService.getHistoryByColor.mockResolvedValue(history);

      await handler.getHistoryByColor(mockRequest as any, mockReply as any);

      expect(mockService.getHistoryByColor).toHaveBeenCalledWith(3, undefined);
      expect(mockReply.send).toHaveBeenCalledWith(history);
    });

    it('should return history with limit', async () => {
      mockRequest.params = { colorId: '3' };
      mockRequest.query = { limit: '10' };
      const history: any[] = [];
      mockService.getHistoryByColor.mockResolvedValue(history);

      await handler.getHistoryByColor(mockRequest as any, mockReply as any);

      expect(mockService.getHistoryByColor).toHaveBeenCalledWith(3, 10);
    });

    it('should return 400 for invalid colorId in history', async () => {
      mockRequest.params = { colorId: 'invalid' };

      await handler.getHistoryByColor(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid colorId' });
    });
  });

  describe('getHistory', () => {
    it('should return all history without limit', async () => {
      const history = [
        {
          id: 1,
          colorId: 3,
          profileId: 1,
          previousStock: 45,
          currentStock: 50,
          difference: 5,
          createdAt: new Date('2025-12-01'),
        },
      ];
      mockService.getHistory.mockResolvedValue(history);

      await handler.getHistory(mockRequest as any, mockReply as any);

      expect(mockService.getHistory).toHaveBeenCalledWith(undefined);
      expect(mockReply.send).toHaveBeenCalledWith(history);
    });

    it('should return history with limit', async () => {
      mockRequest.query = { limit: '20' };
      const history: any[] = [];
      mockService.getHistory.mockResolvedValue(history);

      await handler.getHistory(mockRequest as any, mockReply as any);

      expect(mockService.getHistory).toHaveBeenCalledWith(20);
    });
  });

  describe('getShortages', () => {
    it('should return shortages data', async () => {
      const shortages = [
        {
          profileId: 1,
          colorId: 3,
          profileNumber: '12345',
          colorCode: '9016',
          demand: 100,
          currentStock: 50,
          shortage: 50,
        },
      ];
      mockService.getShortages.mockResolvedValue(shortages);

      await handler.getShortages(mockRequest as any, mockReply as any);

      expect(mockService.getShortages).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(shortages);
    });

    it('should return empty array when no shortages', async () => {
      mockService.getShortages.mockResolvedValue([]);

      await handler.getShortages(mockRequest as any, mockReply as any);

      expect(mockReply.send).toHaveBeenCalledWith([]);
    });
  });

  describe('rollbackInventory', () => {
    it('should rollback inventory successfully', async () => {
      mockRequest.body = { colorId: 3 };
      const result = { success: true, rolledBack: 5 };
      mockService.rollbackInventory.mockResolvedValue(result);

      await handler.rollbackInventory(mockRequest as any, mockReply as any);

      expect(mockService.rollbackInventory).toHaveBeenCalledWith(3);
      expect(mockReply.send).toHaveBeenCalledWith(result);
    });

    it('should return 400 when rollback fails with error message', async () => {
      mockRequest.body = { colorId: 3 };
      mockService.rollbackInventory.mockRejectedValue(
        new Error('Cannot rollback: last update was more than 24 hours ago')
      );

      await handler.rollbackInventory(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Cannot rollback: last update was more than 24 hours ago',
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { colorId: 3 };
      mockService.rollbackInventory.mockRejectedValue('Unexpected error');

      await handler.rollbackInventory(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getAverageUsage', () => {
    it('should return average usage for color with default 6 months', async () => {
      mockRequest.params = { colorId: '3' };
      const averageUsage = [
        { profileId: 1, profileNumber: '12345', averageUsage: 20.5 },
      ];
      mockService.getAverageUsage.mockResolvedValue(averageUsage);

      await handler.getAverageUsage(mockRequest as any, mockReply as any);

      expect(mockService.getAverageUsage).toHaveBeenCalledWith(3, 6);
      expect(mockReply.send).toHaveBeenCalledWith(averageUsage);
    });

    it('should return average usage with custom months', async () => {
      mockRequest.params = { colorId: '3' };
      mockRequest.query = { months: '12' };
      const averageUsage: any[] = [];
      mockService.getAverageUsage.mockResolvedValue(averageUsage);

      await handler.getAverageUsage(mockRequest as any, mockReply as any);

      expect(mockService.getAverageUsage).toHaveBeenCalledWith(3, 12);
    });

    it('should return 400 for invalid colorId in average usage', async () => {
      mockRequest.params = { colorId: 'invalid' };

      await handler.getAverageUsage(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid colorId' });
    });
  });

  describe('finalizeMonth', () => {
    it('should finalize month without archiving', async () => {
      mockRequest.body = { month: '2025-12' };
      const result = { success: true, archived: 0 };
      mockService.finalizeMonth.mockResolvedValue(result);

      await handler.finalizeMonth(mockRequest as any, mockReply as any);

      expect(mockService.finalizeMonth).toHaveBeenCalledWith('2025-12', undefined);
      expect(mockReply.send).toHaveBeenCalledWith(result);
    });

    it('should finalize month with archiving', async () => {
      mockRequest.body = { month: '2025-12', archive: true };
      const result = { success: true, archived: 15 };
      mockService.finalizeMonth.mockResolvedValue(result);

      await handler.finalizeMonth(mockRequest as any, mockReply as any);

      expect(mockService.finalizeMonth).toHaveBeenCalledWith('2025-12', true);
    });
  });

  describe('bulkUpdateStocks', () => {
    it('should bulk update stocks', async () => {
      mockRequest.body = {
        updates: [
          { profileId: 1, colorId: 3, currentStockBeams: 50 },
          { profileId: 2, colorId: 3, currentStockBeams: 30 },
        ],
      };
      const result = { updated: 2, created: 0 };
      mockService.bulkUpdateStocks.mockResolvedValue(result);

      await handler.bulkUpdateStocks(mockRequest as any, mockReply as any);

      expect(mockService.bulkUpdateStocks).toHaveBeenCalledWith([
        { profileId: 1, colorId: 3, currentStockBeams: 50 },
        { profileId: 2, colorId: 3, currentStockBeams: 30 },
      ]);
      expect(mockReply.send).toHaveBeenCalledWith(result);
    });

    it('should handle empty bulk updates', async () => {
      mockRequest.body = { updates: [] };
      const result = { updated: 0, created: 0 };
      mockService.bulkUpdateStocks.mockResolvedValue(result);

      await handler.bulkUpdateStocks(mockRequest as any, mockReply as any);

      expect(mockService.bulkUpdateStocks).toHaveBeenCalledWith([]);
    });
  });

  describe('getAvailableProfiles', () => {
    it('should return all available profiles without filter', async () => {
      const profiles = [
        { id: 1, number: '12345', articleNumber: 'ART-001', hasStock: true },
        { id: 2, number: '67890', articleNumber: 'ART-002', hasStock: true },
      ];
      mockService.getAvailableProfiles.mockResolvedValue(profiles);

      await handler.getAvailableProfiles(mockRequest as any, mockReply as any);

      expect(mockService.getAvailableProfiles).toHaveBeenCalledWith(undefined);
      expect(mockReply.send).toHaveBeenCalledWith(profiles);
    });

    it('should return available profiles filtered by colorId', async () => {
      mockRequest.query = { colorId: '3' };
      const profiles = [
        { id: 1, number: '12345', articleNumber: 'ART-001', hasStock: true },
      ];
      mockService.getAvailableProfiles.mockResolvedValue(profiles);

      await handler.getAvailableProfiles(mockRequest as any, mockReply as any);

      expect(mockService.getAvailableProfiles).toHaveBeenCalledWith(3);
    });
  });

  describe('initializeWarehouse', () => {
    it('should initialize warehouse for all colors and profiles', async () => {
      mockRequest.body = {};
      const result = { created: 50, skipped: 5 };
      mockService.initializeWarehouse.mockResolvedValue(result);

      await handler.initializeWarehouse(mockRequest as any, mockReply as any);

      expect(mockService.initializeWarehouse).toHaveBeenCalledWith(undefined, undefined);
      expect(mockReply.send).toHaveBeenCalledWith(result);
    });

    it('should initialize warehouse for specific color', async () => {
      mockRequest.body = { colorId: 3 };
      const result = { created: 10, skipped: 2 };
      mockService.initializeWarehouse.mockResolvedValue(result);

      await handler.initializeWarehouse(mockRequest as any, mockReply as any);

      expect(mockService.initializeWarehouse).toHaveBeenCalledWith(3, undefined);
    });

    it('should initialize warehouse for specific profile', async () => {
      mockRequest.body = { profileId: 1 };
      const result = { created: 5, skipped: 1 };
      mockService.initializeWarehouse.mockResolvedValue(result);

      await handler.initializeWarehouse(mockRequest as any, mockReply as any);

      expect(mockService.initializeWarehouse).toHaveBeenCalledWith(undefined, 1);
    });

    it('should initialize warehouse for specific color and profile', async () => {
      mockRequest.body = { colorId: 3, profileId: 1 };
      const result = { created: 1, skipped: 0 };
      mockService.initializeWarehouse.mockResolvedValue(result);

      await handler.initializeWarehouse(mockRequest as any, mockReply as any);

      expect(mockService.initializeWarehouse).toHaveBeenCalledWith(3, 1);
    });
  });
});
