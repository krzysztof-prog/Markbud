/**
 * WarehouseHandler Tests
 * Tests for warehouse HTTP layer with mocked service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the service methods BEFORE importing handler
const mockGetColorWarehouseData = vi.fn();
const mockUpdateStock = vi.fn();
const mockPerformMonthlyUpdate = vi.fn();
const mockRollbackInventory = vi.fn();
const mockGetAllShortages = vi.fn();
const mockGetMonthlyUsage = vi.fn();
const mockGetHistoryByColor = vi.fn();
const mockGetAllHistory = vi.fn();
const mockFinalizeMonth = vi.fn();

// Mock WarehouseService class - note: handler imports from '../services/warehouse/index.js'
vi.mock('../services/warehouse/index.js', () => ({
  WarehouseService: class MockWarehouseService {
    getColorWarehouseData = mockGetColorWarehouseData;
    updateStock = mockUpdateStock;
    performMonthlyUpdate = mockPerformMonthlyUpdate;
    rollbackInventory = mockRollbackInventory;
    getAllShortages = mockGetAllShortages;
    getMonthlyUsage = mockGetMonthlyUsage;
    getHistoryByColor = mockGetHistoryByColor;
    getAllHistory = mockGetAllHistory;
    finalizeMonth = mockFinalizeMonth;
  }
}));

// Mock repository
vi.mock('../repositories/WarehouseRepository.js', () => ({
  WarehouseRepository: class MockWarehouseRepository {}
}));

// Mock prisma
vi.mock('../index.js', () => ({
  prisma: {}
}));

// Import handlers AFTER mocks are set up
import * as handlers from './warehouse-handler.js';

// Mock Fastify request and reply
const createMockRequest = (overrides?: Partial<FastifyRequest>): FastifyRequest => ({
  params: {},
  query: {},
  body: {},
  ...overrides
} as FastifyRequest);

const createMockReply = (): FastifyReply => ({
  send: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
  code: vi.fn().mockReturnThis()
} as any);

describe('WarehouseHandler', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset modules to clear the lazy singleton in warehouse-handler.ts
    vi.resetModules();
  });

  describe('getColorData', () => {
    it('should return warehouse data for valid colorId', async () => {
      const mockData = {
        color: {
          id: 5,
          code: 'RAL9016',
          name: 'White',
          hexColor: '#FFFFFF',
          type: 'standard'
        },
        data: []
      };
      const request = createMockRequest({ params: { colorId: '5' } });
      const reply = createMockReply();

      mockGetColorWarehouseData.mockResolvedValue(mockData);

      await handlers.getColorData(request, reply);

      expect(mockGetColorWarehouseData).toHaveBeenCalledWith(5);
      expect(reply.send).toHaveBeenCalledWith(mockData);
    });

    it('should handle validation errors', async () => {
      const request = createMockRequest({ params: { colorId: 'invalid' } });
      const reply = createMockReply();

      await expect(handlers.getColorData(request, reply)).rejects.toThrow();
    });

    it('should handle service errors', async () => {
      const request = createMockRequest({ params: { colorId: '5' } });
      const reply = createMockReply();
      const error = new Error('Service error');

      mockGetColorWarehouseData.mockRejectedValue(error);

      await expect(handlers.getColorData(request, reply)).rejects.toThrow('Service error');
    });
  });

  describe('updateStock', () => {
    it('should update stock successfully', async () => {
      const mockUpdated = {
        profileId: 1,
        colorId: 5,
        currentStockBeams: 150,
        updatedAt: new Date(),
        version: 2,
        profile: { id: 1, number: '001', name: 'Profile 1' },
        color: { id: 5, code: 'RAL9016', name: 'White' }
      };
      const request = createMockRequest({
        params: { colorId: '5', profileId: '1' },
        body: { currentStockBeams: 150, userId: 1 }
      });
      const reply = createMockReply();

      mockUpdateStock.mockResolvedValue(mockUpdated);

      await handlers.updateStock(request, reply);

      expect(mockUpdateStock).toHaveBeenCalledWith(5, 1, 150, 1);
      expect(reply.send).toHaveBeenCalledWith(mockUpdated);
    });

    it('should validate colorId parameter', async () => {
      const request = createMockRequest({
        params: { colorId: 'invalid', profileId: '1' },
        body: { currentStockBeams: 150, userId: 1 }
      });
      const reply = createMockReply();

      await expect(handlers.updateStock(request, reply)).rejects.toThrow();
    });

    it('should validate profileId parameter', async () => {
      const request = createMockRequest({
        params: { colorId: '5', profileId: 'invalid' },
        body: { currentStockBeams: 150, userId: 1 }
      });
      const reply = createMockReply();

      await expect(handlers.updateStock(request, reply)).rejects.toThrow();
    });

    it('should validate request body', async () => {
      const request = createMockRequest({
        params: { colorId: '5', profileId: '1' },
        body: { currentStockBeams: -10, userId: 1 }
      });
      const reply = createMockReply();

      await expect(handlers.updateStock(request, reply)).rejects.toThrow();
    });
  });

  describe('monthlyUpdate', () => {
    it('should perform monthly update successfully', async () => {
      const mockResult = {
        updates: [
          { profileId: 1, calculatedStock: 80, actualStock: 100, difference: 20 }
        ],
        archivedOrdersCount: 3
      };
      const request = createMockRequest({
        body: {
          colorId: 5,
          updates: [{ profileId: 1, actualStock: 100 }],
          userId: 1
        }
      });
      const reply = createMockReply();

      mockPerformMonthlyUpdate.mockResolvedValue(mockResult);

      await handlers.monthlyUpdate(request, reply);

      expect(mockPerformMonthlyUpdate).toHaveBeenCalledWith(
        5,
        [{ profileId: 1, actualStock: 100 }],
        1
      );
      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should validate empty updates array', async () => {
      const request = createMockRequest({
        body: {
          colorId: 5,
          updates: [],
          userId: 1
        }
      });
      const reply = createMockReply();

      await expect(handlers.monthlyUpdate(request, reply)).rejects.toThrow();
    });

    it('should validate actualStock field', async () => {
      const request = createMockRequest({
        body: {
          colorId: 5,
          updates: [{ profileId: 1, actualStock: -10 }],
          userId: 1
        }
      });
      const reply = createMockReply();

      await expect(handlers.monthlyUpdate(request, reply)).rejects.toThrow();
    });
  });

  describe('rollbackInventory', () => {
    it('should rollback inventory successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Cofnięto inwentaryzację',
        rolledBackRecords: [{ profileId: 1, restoredStock: 80, removedActualStock: 100 }],
        restoredOrdersCount: 3,
        inventoryDate: new Date()
      };
      const request = createMockRequest({
        body: { colorId: 5, userId: 1 }
      });
      const reply = createMockReply();

      mockRollbackInventory.mockResolvedValue(mockResult);

      await handlers.rollbackInventory(request, reply);

      expect(mockRollbackInventory).toHaveBeenCalledWith(5, 1);
      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should validate colorId', async () => {
      const request = createMockRequest({
        body: { colorId: -5, userId: 1 }
      });
      const reply = createMockReply();

      await expect(handlers.rollbackInventory(request, reply)).rejects.toThrow();
    });

    it('should validate userId', async () => {
      const request = createMockRequest({
        body: { colorId: 5, userId: 0 }
      });
      const reply = createMockReply();

      await expect(handlers.rollbackInventory(request, reply)).rejects.toThrow();
    });
  });

  describe('getShortages', () => {
    it('should return all shortages', async () => {
      const mockShortages = [
        {
          profileId: 1,
          profileNumber: '001',
          colorId: 5,
          colorCode: 'RAL9016',
          colorName: 'White',
          currentStock: 50,
          demand: 70,
          shortage: 20,
          orderedBeams: 30,
          expectedDeliveryDate: null,
          priority: 'critical' as const
        }
      ];
      const request = createMockRequest();
      const reply = createMockReply();

      mockGetAllShortages.mockResolvedValue(mockShortages);

      await handlers.getShortages(request, reply);

      expect(mockGetAllShortages).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith(mockShortages);
    });

    it('should handle service errors', async () => {
      const request = createMockRequest();
      const reply = createMockReply();
      const error = new Error('Database error');

      mockGetAllShortages.mockRejectedValue(error);

      await expect(handlers.getShortages(request, reply)).rejects.toThrow('Database error');
    });
  });

  describe('getMonthlyAverage', () => {
    it('should return monthly average with default months', async () => {
      const mockUsage = [
        {
          profileId: 1,
          profileNumber: '001',
          profileName: 'Profile 1',
          averageBeamsPerMonth: 5.5,
          monthlyData: [],
          totalBeams: 33,
          monthsWithData: 6
        }
      ];
      const request = createMockRequest({
        params: { colorId: '5' },
        query: {}
      });
      const reply = createMockReply();

      mockGetMonthlyUsage.mockResolvedValue(mockUsage);

      await handlers.getMonthlyAverage(request, reply);

      expect(mockGetMonthlyUsage).toHaveBeenCalledWith(5, 6);
      expect(reply.send).toHaveBeenCalledWith(mockUsage);
    });

    it('should accept custom months parameter', async () => {
      const mockUsage = [];
      const request = createMockRequest({
        params: { colorId: '5' },
        query: { months: '12' }
      });
      const reply = createMockReply();

      mockGetMonthlyUsage.mockResolvedValue(mockUsage);

      await handlers.getMonthlyAverage(request, reply);

      expect(mockGetMonthlyUsage).toHaveBeenCalledWith(5, 12);
    });

    it('should validate months range', async () => {
      const request = createMockRequest({
        params: { colorId: '5' },
        query: { months: '25' }
      });
      const reply = createMockReply();

      await expect(handlers.getMonthlyAverage(request, reply)).rejects.toThrow();
    });
  });

  describe('getHistoryByColor', () => {
    it('should return history for specific color', async () => {
      const mockHistory = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          calculatedStock: 80,
          actualStock: 100,
          difference: 20,
          changeType: 'monthly_inventory',
          recordedAt: new Date(),
          profile: { id: 1, number: '001', name: 'Profile 1' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        }
      ];
      const request = createMockRequest({
        params: { colorId: '5' },
        query: { limit: '50' }
      });
      const reply = createMockReply();

      mockGetHistoryByColor.mockResolvedValue(mockHistory);

      await handlers.getHistoryByColor(request, reply);

      expect(mockGetHistoryByColor).toHaveBeenCalledWith(5, 50);
      expect(reply.send).toHaveBeenCalledWith(mockHistory);
    });

    it('should use default limit', async () => {
      const request = createMockRequest({
        params: { colorId: '5' },
        query: {}
      });
      const reply = createMockReply();

      mockGetHistoryByColor.mockResolvedValue([]);

      await handlers.getHistoryByColor(request, reply);

      expect(mockGetHistoryByColor).toHaveBeenCalledWith(5, 100);
    });
  });

  describe('getAllHistory', () => {
    it('should return all history', async () => {
      const mockHistory = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          calculatedStock: 80,
          actualStock: 100,
          difference: 20,
          changeType: 'monthly_inventory',
          recordedAt: new Date(),
          profile: { id: 1, number: '001', name: 'Profile 1' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        }
      ];
      const request = createMockRequest({
        query: { limit: '200' }
      });
      const reply = createMockReply();

      mockGetAllHistory.mockResolvedValue(mockHistory);

      await handlers.getAllHistory(request, reply);

      expect(mockGetAllHistory).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(mockHistory);
    });

    it('should validate limit range', async () => {
      const request = createMockRequest({
        query: { limit: '1001' }
      });
      const reply = createMockReply();

      await expect(handlers.getAllHistory(request, reply)).rejects.toThrow();
    });
  });

  describe('finalizeMonth', () => {
    it('should finalize month in preview mode', async () => {
      const mockResult = {
        preview: true,
        ordersCount: 10,
        orderNumbers: ['ORD-001', 'ORD-002'],
        month: '2025-01'
      };
      const request = createMockRequest({
        body: {
          month: '2025-01',
          archive: false
        }
      });
      const reply = createMockReply();

      mockFinalizeMonth.mockResolvedValue(mockResult);

      await handlers.finalizeMonth(request, reply);

      expect(mockFinalizeMonth).toHaveBeenCalledWith('2025-01', false);
      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('should finalize month with archiving', async () => {
      const mockResult = {
        success: true,
        message: 'Zarchiwizowano 10 zleceń za 2025-01',
        archivedCount: 10,
        archivedOrderNumbers: ['ORD-001', 'ORD-002']
      };
      const request = createMockRequest({
        body: {
          month: '2025-01',
          archive: true
        }
      });
      const reply = createMockReply();

      mockFinalizeMonth.mockResolvedValue(mockResult);

      await handlers.finalizeMonth(request, reply);

      expect(mockFinalizeMonth).toHaveBeenCalledWith('2025-01', true);
    });

    it('should validate month format', async () => {
      const request = createMockRequest({
        body: {
          month: '2025-1',
          archive: false
        }
      });
      const reply = createMockReply();

      await expect(handlers.finalizeMonth(request, reply)).rejects.toThrow();
    });

    it('should use default archive value', async () => {
      const mockResult = {
        preview: true,
        ordersCount: 5,
        orderNumbers: [],
        month: '2025-01'
      };
      const request = createMockRequest({
        body: {
          month: '2025-01'
        }
      });
      const reply = createMockReply();

      mockFinalizeMonth.mockResolvedValue(mockResult);

      await handlers.finalizeMonth(request, reply);

      expect(mockFinalizeMonth).toHaveBeenCalledWith('2025-01', false);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from service', async () => {
      const request = createMockRequest({ params: { colorId: '5' } });
      const reply = createMockReply();
      const error = new Error('Test error');

      mockGetColorWarehouseData.mockRejectedValue(error);

      await expect(handlers.getColorData(request, reply)).rejects.toThrow('Test error');
    });
  });
});
