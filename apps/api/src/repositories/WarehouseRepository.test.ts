/**
 * WarehouseRepository Unit Tests
 *
 * Comprehensive tests for WarehouseRepository covering:
 * - Optimistic locking
 * - Stock operations with atomic updates
 * - History tracking
 * - Monthly updates and rollbacks
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarehouseRepository } from './WarehouseRepository.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';
import { OptimisticLockError } from '../utils/optimistic-locking.js';
import { Prisma } from '@prisma/client';

// Mock logger to prevent console output during tests
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock prisma-selects to provide profile select object
vi.mock('../utils/prisma-selects.js', () => ({
  profileBasicSelect: {
    id: true,
    number: true,
    name: true,
    description: true,
  },
}));

describe('WarehouseRepository', () => {
  let repository: WarehouseRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Test fixtures
  const mockStock = {
    id: 1,
    profileId: 1,
    colorId: 1,
    currentStockBeams: 50,
    version: 1,
    profile: {
      id: 1,
      number: 'P001',
      name: 'Profile 1',
      description: 'Test profile',
    },
    color: {
      id: 1,
      code: 'RAL9016',
      name: 'White',
      hexColor: '#FFFFFF',
    },
  };

  const mockHistory = {
    id: 1,
    profileId: 1,
    colorId: 1,
    changeType: 'manual_adjustment',
    previousStock: 40,
    currentStock: 50,
    calculatedStock: 50,
    actualStock: 50,
    difference: 10,
    recordedAt: new Date(),
    recordedById: 1,
    profile: {
      id: 1,
      number: 'P001',
      name: 'Profile 1',
      description: 'Test profile',
    },
    color: {
      id: 1,
      code: 'RAL9016',
      name: 'White',
      hexColor: '#FFFFFF',
    },
  };

  const mockWarehouseOrder = {
    id: 1,
    profileId: 1,
    colorId: 1,
    orderedBeams: 20,
    createdAt: new Date(),
    status: 'pending',
    profile: {
      id: 1,
      number: 'P001',
      name: 'Profile 1',
      description: 'Test profile',
    },
    color: {
      id: 1,
      code: 'RAL9016',
      name: 'White',
      hexColor: '#FFFFFF',
    },
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new WarehouseRepository(mockPrisma);
  });

  describe('Optimistic locking', () => {
    describe('updateStock - succeeds with correct version', () => {
      it('updates stock when version matches', async () => {
        const updatedStock = { ...mockStock, currentStockBeams: 60, version: 2 };

        mockPrisma.warehouseStock.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(updatedStock);

        const result = await repository.updateStock(1, 60, 1);

        expect(result).toEqual(updatedStock);
        expect(mockPrisma.warehouseStock.updateMany).toHaveBeenCalledWith({
          where: { id: 1, version: 1 },
          data: { currentStockBeams: 60, version: { increment: 1 } },
        });
      });

      it('updates stock without version check when version not provided', async () => {
        const updatedStock = { ...mockStock, currentStockBeams: 60, version: 2 };

        mockPrisma.warehouseStock.update.mockResolvedValue(updatedStock);

        const result = await repository.updateStock(1, 60);

        expect(result).toEqual(updatedStock);
        expect(mockPrisma.warehouseStock.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { currentStockBeams: 60, version: { increment: 1 } },
        });
      });
    });

    describe('updateStock - throws on version mismatch', () => {
      it('throws OptimisticLockError when version does not match', async () => {
        mockPrisma.warehouseStock.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.warehouseStock.findUnique.mockResolvedValue({ ...mockStock, version: 3 });

        await expect(repository.updateStock(1, 60, 1)).rejects.toThrow(OptimisticLockError);
      });

      it('includes current version in error', async () => {
        mockPrisma.warehouseStock.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.warehouseStock.findUnique.mockResolvedValue({ ...mockStock, version: 5 });

        try {
          await repository.updateStock(1, 60, 1);
          expect.fail('Should have thrown OptimisticLockError');
        } catch (error) {
          expect(error).toBeInstanceOf(OptimisticLockError);
          expect((error as OptimisticLockError).currentVersion).toBe(5);
        }
      });

      it('handles deleted record (returns -1 for currentVersion)', async () => {
        mockPrisma.warehouseStock.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);

        try {
          await repository.updateStock(1, 60, 1);
          expect.fail('Should have thrown OptimisticLockError');
        } catch (error) {
          expect(error).toBeInstanceOf(OptimisticLockError);
          expect((error as OptimisticLockError).currentVersion).toBe(-1);
        }
      });
    });
  });

  describe('Stock operations', () => {
    describe('getStock', () => {
      it('returns paginated stock list', async () => {
        mockPrisma.warehouseStock.count.mockResolvedValue(10);
        mockPrisma.warehouseStock.findMany.mockResolvedValue([mockStock]);

        const result = await repository.getStock();

        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(10);
        expect(result.skip).toBe(0);
        expect(result.take).toBe(50);
      });

      it('filters by profileId', async () => {
        mockPrisma.warehouseStock.count.mockResolvedValue(1);
        mockPrisma.warehouseStock.findMany.mockResolvedValue([mockStock]);

        await repository.getStock(1);

        expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { profileId: 1, deletedAt: null },
          })
        );
      });

      it('filters by colorId', async () => {
        mockPrisma.warehouseStock.count.mockResolvedValue(1);
        mockPrisma.warehouseStock.findMany.mockResolvedValue([mockStock]);

        await repository.getStock(undefined, 1);

        expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { colorId: 1, deletedAt: null },
          })
        );
      });

      it('applies pagination', async () => {
        mockPrisma.warehouseStock.count.mockResolvedValue(100);
        mockPrisma.warehouseStock.findMany.mockResolvedValue([]);

        const result = await repository.getStock(undefined, undefined, { skip: 20, take: 10 });

        expect(result.skip).toBe(20);
        expect(result.take).toBe(10);
      });
    });

    describe('getStockByProfileColor', () => {
      it('returns stock for profile-color combination', async () => {
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);

        const result = await repository.getStockByProfileColor(1, 1);

        expect(result).toEqual(mockStock);
        expect(mockPrisma.warehouseStock.findUnique).toHaveBeenCalledWith({
          where: {
            profileId_colorId: { profileId: 1, colorId: 1 },
          },
          select: expect.any(Object),
        });
      });

      it('returns null when not found', async () => {
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);

        const result = await repository.getStockByProfileColor(999, 999);

        expect(result).toBeNull();
      });
    });

    describe('getStocksByColor', () => {
      it('returns all stocks for color', async () => {
        mockPrisma.warehouseStock.findMany.mockResolvedValue([mockStock]);

        const result = await repository.getStocksByColor(1);

        expect(result).toHaveLength(1);
        expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalledWith({
          where: { colorId: 1, deletedAt: null },
          select: expect.any(Object),
          orderBy: { profile: { number: 'asc' } },
        });
      });
    });

    describe('updateStockTransaction', () => {
      it('updates existing stock and creates history', async () => {
        const existingStock = { ...mockStock, currentStockBeams: 40 };
        const updatedStock = { ...mockStock, currentStockBeams: 50, version: 2 };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(existingStock);
        mockPrisma.warehouseStock.update.mockResolvedValue(updatedStock);
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);

        const result = await repository.updateStockTransaction(1, 1, 50, 1);

        expect(result).toEqual(updatedStock);
        expect(mockPrisma.warehouseHistory.create).toHaveBeenCalled();
      });

      it('creates new stock if not exists', async () => {
        const newStock = { ...mockStock, id: 2 };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);
        mockPrisma.warehouseStock.create.mockResolvedValue(newStock);
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);

        const result = await repository.updateStockTransaction(1, 1, 50, 1);

        expect(result).toEqual(newStock);
        expect(mockPrisma.warehouseStock.create).toHaveBeenCalled();
      });

      it('records history with correct previous stock', async () => {
        const existingStock = { ...mockStock, currentStockBeams: 40 };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(existingStock);
        mockPrisma.warehouseStock.update.mockResolvedValue({ ...existingStock, currentStockBeams: 50 });
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);

        await repository.updateStockTransaction(1, 1, 50, 1);

        expect(mockPrisma.warehouseHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            previousStock: 40,
            currentStock: 50,
            changeType: 'manual_adjustment',
          }),
        });
      });
    });
  });

  describe('Demand calculations', () => {
    describe('getDemandsByColor', () => {
      it('returns aggregated demands grouped by profile', async () => {
        const demands = [
          { profileId: 1, _sum: { beamsCount: 30 } },
          { profileId: 2, _sum: { beamsCount: 20 } },
        ];

        mockPrisma.orderRequirement.groupBy.mockResolvedValue(demands);

        const result = await repository.getDemandsByColor(1);

        expect(result).toEqual(demands);
        expect(mockPrisma.orderRequirement.groupBy).toHaveBeenCalledWith({
          by: ['profileId'],
          where: {
            colorId: 1,
            order: {
              status: { in: ['new', 'in_progress'] },
            },
          },
          _sum: { beamsCount: true },
        });
      });
    });

    describe('getAllStocksWithDemands', () => {
      it('executes raw SQL query for shortages', async () => {
        const rawResult = [
          {
            profileId: 1,
            colorId: 1,
            currentStockBeams: 10,
            totalDemand: 30,
            shortage: 20,
            profileNumber: 'P001',
            profileName: 'Profile 1',
            colorCode: 'RAL9016',
            colorName: 'White',
            hexColor: '#FFFFFF',
          },
        ];

        mockPrisma.$queryRaw.mockResolvedValue(rawResult);

        const result = await repository.getAllStocksWithDemands();

        expect(result).toHaveLength(1);
        expect(result[0].shortage).toBe(20);
      });

      it('handles null totalDemand', async () => {
        const rawResult = [
          {
            profileId: 1,
            colorId: 1,
            currentStockBeams: 10,
            totalDemand: null,
            shortage: -10,
            profileNumber: 'P001',
            profileName: 'Profile 1',
            colorCode: 'RAL9016',
            colorName: 'White',
            hexColor: null,
          },
        ];

        mockPrisma.$queryRaw.mockResolvedValue(rawResult);

        const result = await repository.getAllStocksWithDemands();

        expect(result[0].totalDemand).toBe(0);
      });
    });
  });

  describe('History tracking', () => {
    describe('getHistoryByColor', () => {
      it('returns history for color', async () => {
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([mockHistory]);

        const result = await repository.getHistoryByColor(1);

        expect(result).toHaveLength(1);
        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith({
          where: { colorId: 1 },
          select: expect.any(Object),
          orderBy: { recordedAt: 'desc' },
          take: 100,
        });
      });

      it('respects limit parameter', async () => {
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([]);

        await repository.getHistoryByColor(1, 50);

        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 50 })
        );
      });
    });

    describe('getAllHistory', () => {
      it('returns all history with default limit', async () => {
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([mockHistory]);

        const result = await repository.getAllHistory();

        expect(result).toHaveLength(1);
        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { recordedAt: 'desc' },
            take: 100,
          })
        );
      });

      it('respects custom limit', async () => {
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([]);

        await repository.getAllHistory(25);

        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 25 })
        );
      });
    });

    describe('getLatestInventoryHistory', () => {
      it('returns only monthly_update records', async () => {
        const monthlyHistory = { ...mockHistory, changeType: 'monthly_update' };
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([monthlyHistory]);

        const result = await repository.getLatestInventoryHistory(1);

        expect(result[0].changeType).toBe('monthly_update');
        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith({
          where: { colorId: 1, changeType: 'monthly_update' },
          select: expect.any(Object),
          orderBy: { recordedAt: 'desc' },
          take: 50,
        });
      });
    });

    describe('getMonthlyUsageData', () => {
      it('returns usage data for specified months back', async () => {
        const usageData = [
          { profileId: 1, difference: -10, recordedAt: new Date() },
          { profileId: 2, difference: -5, recordedAt: new Date() },
        ];

        mockPrisma.warehouseHistory.findMany.mockResolvedValue(usageData);

        const result = await repository.getMonthlyUsageData(1, 6);

        expect(result).toEqual(usageData);
      });

      it('uses default 6 months when not specified', async () => {
        mockPrisma.warehouseHistory.findMany.mockResolvedValue([]);

        await repository.getMonthlyUsageData(1);

        expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              changeType: 'monthly_update',
              recordedAt: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          })
        );
      });
    });
  });

  describe('Monthly updates', () => {
    describe('performMonthlyUpdate', () => {
      it('updates multiple stocks and creates orders', async () => {
        const updates = [
          { profileId: 1, currentStock: 30, usedBeams: 20, orderedBeams: 15 },
          { profileId: 2, currentStock: 25, usedBeams: 25, orderedBeams: 0 },
        ];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue({ ...mockStock, currentStockBeams: 50 });
        mockPrisma.warehouseStock.update.mockResolvedValue({ ...mockStock, currentStockBeams: 30 });
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseOrder.create.mockResolvedValue(mockWarehouseOrder);

        const result = await repository.performMonthlyUpdate(1, updates, 1);

        expect(result).toHaveLength(2);
        // One order created (for profileId 1 with orderedBeams > 0)
        expect(mockPrisma.warehouseOrder.create).toHaveBeenCalledTimes(1);
      });

      it('skips profiles without existing stock', async () => {
        const updates = [
          { profileId: 999, currentStock: 30, usedBeams: 20, orderedBeams: 15 },
        ];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);

        const result = await repository.performMonthlyUpdate(1, updates, 1);

        expect(result).toHaveLength(0);
        expect(mockPrisma.warehouseStock.update).not.toHaveBeenCalled();
      });

      it('creates warehouse order with 14-day expected delivery', async () => {
        const updates = [
          { profileId: 1, currentStock: 30, usedBeams: 20, orderedBeams: 15 },
        ];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.warehouseStock.update.mockResolvedValue({ ...mockStock, currentStockBeams: 30 });
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseOrder.create.mockResolvedValue(mockWarehouseOrder);

        await repository.performMonthlyUpdate(1, updates, 1);

        expect(mockPrisma.warehouseOrder.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            expectedDeliveryDate: expect.any(Date),
            orderedBeams: 15,
          }),
        });
      });
    });

    describe('getCompletedOrdersInMonth', () => {
      it('returns completed orders for month', async () => {
        const completedOrders = [
          {
            id: 1,
            orderNumber: 'O001',
            status: 'completed',
            completedAt: new Date('2024-02-15'),
            requirements: [],
          },
        ];

        mockPrisma.order.findMany.mockResolvedValue(completedOrders);

        const result = await repository.getCompletedOrdersInMonth(new Date('2024-02-01'));

        expect(result).toEqual(completedOrders);
      });
    });
  });

  describe('Warehouse orders', () => {
    describe('getWarehouseOrdersByColor', () => {
      it('returns non-archived orders for color', async () => {
        mockPrisma.warehouseOrder.findMany.mockResolvedValue([mockWarehouseOrder]);

        const result = await repository.getWarehouseOrdersByColor(1);

        expect(result).toHaveLength(1);
        expect(mockPrisma.warehouseOrder.findMany).toHaveBeenCalledWith({
          where: { colorId: 1, status: { not: 'archived' } },
          select: expect.any(Object),
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('getAllWarehouseOrders', () => {
      it('returns all non-archived orders', async () => {
        mockPrisma.warehouseOrder.findMany.mockResolvedValue([mockWarehouseOrder]);

        const result = await repository.getAllWarehouseOrders();

        expect(result).toHaveLength(1);
        expect(mockPrisma.warehouseOrder.findMany).toHaveBeenCalledWith({
          where: { status: { not: 'archived' } },
          select: expect.any(Object),
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('archiveOrders', () => {
      it('archives multiple orders', async () => {
        mockPrisma.warehouseOrder.updateMany.mockResolvedValue({ count: 3 });

        const result = await repository.archiveOrders([1, 2, 3]);

        expect(result.count).toBe(3);
        expect(mockPrisma.warehouseOrder.updateMany).toHaveBeenCalledWith({
          where: { id: { in: [1, 2, 3] } },
          data: { status: 'archived' },
        });
      });
    });

    describe('getArchivedOrdersInTimeWindow', () => {
      it('returns archived orders in time window', async () => {
        const archivedOrders = [{ ...mockWarehouseOrder, status: 'archived' }];

        mockPrisma.warehouseOrder.findMany.mockResolvedValue(archivedOrders);

        const result = await repository.getArchivedOrdersInTimeWindow(
          1,
          new Date('2024-02-01'),
          new Date('2024-02-28')
        );

        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Rollback operations', () => {
    describe('performRollback', () => {
      it('restores previous stock and unarchives orders', async () => {
        const historyRecords = [
          { id: 1, profileId: 1, previousStock: 40 },
          { id: 2, profileId: 2, previousStock: 30 },
        ];
        const orderIds = [1, 2];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue({ ...mockStock, currentStockBeams: 50 });
        mockPrisma.warehouseStock.update.mockResolvedValue({ ...mockStock, currentStockBeams: 40 });
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseHistory.deleteMany.mockResolvedValue({ count: 2 });
        mockPrisma.warehouseOrder.updateMany.mockResolvedValue({ count: 2 });

        const result = await repository.performRollback(1, historyRecords, orderIds, 1);

        expect(result).toHaveLength(2);
        expect(mockPrisma.warehouseOrder.updateMany).toHaveBeenCalledWith({
          where: { id: { in: orderIds } },
          data: { status: 'pending' },
        });
      });

      it('creates rollback history records', async () => {
        const historyRecords = [{ id: 1, profileId: 1, previousStock: 40 }];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.warehouseStock.update.mockResolvedValue({ ...mockStock, currentStockBeams: 40 });
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseHistory.deleteMany.mockResolvedValue({ count: 1 });

        await repository.performRollback(1, historyRecords, [], 1);

        expect(mockPrisma.warehouseHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            changeType: 'rollback',
          }),
        });
      });

      it('deletes original history records', async () => {
        const historyRecords = [
          { id: 1, profileId: 1, previousStock: 40 },
          { id: 2, profileId: 2, previousStock: 30 },
        ];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.warehouseStock.update.mockResolvedValue(mockStock);
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseHistory.deleteMany.mockResolvedValue({ count: 2 });

        await repository.performRollback(1, historyRecords, [], 1);

        expect(mockPrisma.warehouseHistory.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: [1, 2] } },
        });
      });

      it('handles empty order IDs array', async () => {
        const historyRecords = [{ id: 1, profileId: 1, previousStock: 40 }];

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
        mockPrisma.warehouseStock.update.mockResolvedValue(mockStock);
        mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
        mockPrisma.warehouseHistory.deleteMany.mockResolvedValue({ count: 1 });

        await repository.performRollback(1, historyRecords, [], 1);

        // Should not call updateMany for orders when array is empty
        expect(mockPrisma.warehouseOrder.updateMany).not.toHaveBeenCalled();
      });
    });
  });

  describe('Settings and color info', () => {
    describe('getSettings', () => {
      it('returns critical stock level setting', async () => {
        mockPrisma.setting.findUnique.mockResolvedValue({ value: '10' });

        const result = await repository.getSettings();

        expect(result?.value).toBe('10');
        expect(mockPrisma.setting.findUnique).toHaveBeenCalledWith({
          where: { key: 'criticalStockLevel' },
          select: { value: true },
        });
      });

      it('returns null when setting not found', async () => {
        mockPrisma.setting.findUnique.mockResolvedValue(null);

        const result = await repository.getSettings();

        expect(result).toBeNull();
      });
    });

    describe('getColorInfo', () => {
      it('returns color information', async () => {
        const colorInfo = {
          id: 1,
          code: 'RAL9016',
          name: 'White',
          hexColor: '#FFFFFF',
        };

        mockPrisma.color.findUnique.mockResolvedValue(colorInfo);

        const result = await repository.getColorInfo(1);

        expect(result).toEqual(colorInfo);
      });

      it('returns null when color not found', async () => {
        mockPrisma.color.findUnique.mockResolvedValue(null);

        const result = await repository.getColorInfo(999);

        expect(result).toBeNull();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles zero stock values', async () => {
      const zeroStock = { ...mockStock, currentStockBeams: 0 };
      mockPrisma.warehouseStock.count.mockResolvedValue(1);
      mockPrisma.warehouseStock.findMany.mockResolvedValue([zeroStock]);

      const result = await repository.getStock();

      expect(result.data[0].currentStockBeams).toBe(0);
    });

    it('handles negative stock values (edge case)', async () => {
      const negativeStock = { ...mockStock, currentStockBeams: -5 };
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(negativeStock);

      const result = await repository.getStockByProfileColor(1, 1);

      expect(result?.currentStockBeams).toBe(-5);
    });

    it('handles empty arrays in results', async () => {
      mockPrisma.warehouseStock.count.mockResolvedValue(0);
      mockPrisma.warehouseStock.findMany.mockResolvedValue([]);

      const result = await repository.getStock();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('handles concurrent updates with optimistic locking', async () => {
      // First update succeeds
      mockPrisma.warehouseStock.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.warehouseStock.findUnique.mockResolvedValueOnce({ ...mockStock, version: 2 });

      // Second update fails due to version mismatch
      mockPrisma.warehouseStock.updateMany.mockResolvedValueOnce({ count: 0 });
      mockPrisma.warehouseStock.findUnique.mockResolvedValueOnce({ ...mockStock, version: 2 });

      // First update should succeed
      const result1 = await repository.updateStock(1, 60, 1);
      expect(result1?.version).toBe(2);

      // Second update should fail
      await expect(repository.updateStock(1, 70, 1)).rejects.toThrow(OptimisticLockError);
    });

    it('handles large stock values', async () => {
      const largeStock = { ...mockStock, currentStockBeams: 999999 };
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(largeStock);

      const result = await repository.getStockByProfileColor(1, 1);

      expect(result?.currentStockBeams).toBe(999999);
    });
  });

  describe('Transaction handling', () => {
    it('updateStockTransaction uses transaction correctly', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.warehouseStock.update.mockResolvedValue({ ...mockStock, currentStockBeams: 60 });
      mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);

      await repository.updateStockTransaction(1, 1, 60, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('performMonthlyUpdate uses transaction correctly', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.warehouseStock.update.mockResolvedValue(mockStock);
      mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);

      await repository.performMonthlyUpdate(1, [{ profileId: 1, currentStock: 50, usedBeams: 0, orderedBeams: 0 }], 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('performRollback uses transaction correctly', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockStock);
      mockPrisma.warehouseStock.update.mockResolvedValue(mockStock);
      mockPrisma.warehouseHistory.create.mockResolvedValue(mockHistory);
      mockPrisma.warehouseHistory.deleteMany.mockResolvedValue({ count: 1 });

      await repository.performRollback(1, [{ id: 1, profileId: 1, previousStock: 40 }], [], 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('rolls back on transaction failure', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        repository.updateStockTransaction(1, 1, 60, 1)
      ).rejects.toThrow('Transaction failed');
    });
  });
});
