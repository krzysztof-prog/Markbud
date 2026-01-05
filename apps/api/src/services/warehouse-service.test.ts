/**
 * WarehouseService Tests
 * Tests for warehouse business logic layer with mocked Prisma client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// Mock event emitter
vi.mock('./event-emitter.js', () => ({
  emitWarehouseStockUpdated: vi.fn()
}));

// Mock prisma - create inline to avoid hoisting issues
vi.mock('../index.js', () => {
  const createMockPrisma = () => ({
    warehouseStock: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    orderRequirement: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    warehouseOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    warehouseHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    color: {
      findUnique: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    profile: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  return {
    prisma: createMockPrisma()
  };
});

// Mock WarehouseRepository
vi.mock('../repositories/WarehouseRepository.js', () => ({
  WarehouseRepository: class MockWarehouseRepository {
    constructor(public prisma: any) {}
  }
}));

// Import AFTER mocks are set up
import { WarehouseService } from './warehouse/index.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { prisma } from '../index.js';

const mockPrisma = prisma as any;

const setupTransactionMock = (prisma: any) => {
  prisma.$transaction = vi.fn((callback) => callback(prisma));
};

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repository: WarehouseRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    setupTransactionMock(mockPrisma);
    repository = new WarehouseRepository(mockPrisma);
    service = new WarehouseService(repository);
  });

  describe('getColorWarehouseData', () => {
    it('should return complete warehouse data for a color', async () => {
      const mockStocks = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          currentStockBeams: 100,
          initialStockBeams: 100,
          updatedAt: new Date(),
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016' }
        }
      ];
      const mockDemands = [
        { profileId: 1, _sum: { beamsCount: 20, meters: 200 } }
      ];
      const mockOrders: any[] = [];
      const mockColor = {
        id: 5,
        code: 'RAL9016',
        name: 'White',
        hexColor: '#FFFFFF',
        type: 'standard'
      };
      const mockSetting = { key: 'lowStockThreshold', value: '10' };

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue(mockDemands);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.color.findUnique.mockResolvedValue(mockColor);
      mockPrisma.setting.findUnique.mockResolvedValue(mockSetting);

      const result = await service.getColorWarehouseData(5);

      expect(result.color.id).toBe(5);
      expect(result.color.code).toBe('RAL9016');
      expect(result.color.name).toBe('White');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].profileId).toBe(1);
      expect(result.data[0].currentStock).toBe(100);
      expect(result.data[0].demand).toBe(20);
      expect(result.data[0].afterDemand).toBe(80);
    });

    it('should throw NotFoundError when color does not exist', async () => {
      mockPrisma.warehouseStock.findMany.mockResolvedValue([]);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue([]);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue([]);
      mockPrisma.color.findUnique.mockResolvedValue(null);
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      await expect(service.getColorWarehouseData(999))
        .rejects.toThrow(NotFoundError);
    });

    it('should calculate afterDemand correctly with shortage', async () => {
      const mockStocks = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          currentStockBeams: 50,
          initialStockBeams: 100,
          updatedAt: new Date(),
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016' }
        }
      ];
      const mockDemands = [
        { profileId: 1, _sum: { beamsCount: 70, meters: 700 } }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue(mockDemands);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue([]);
      mockPrisma.color.findUnique.mockResolvedValue({
        id: 5,
        code: 'RAL9016',
        name: 'White',
        hexColor: '#FFFFFF',
        type: 'standard'
      });
      mockPrisma.setting.findUnique.mockResolvedValue({ key: 'lowStockThreshold', value: '10' });

      const result = await service.getColorWarehouseData(5);

      expect(result.data[0].afterDemand).toBe(-20);
      expect(result.data[0].isNegative).toBe(true);
    });

    it('should mark low stock correctly', async () => {
      const mockStocks = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          currentStockBeams: 5,
          initialStockBeams: 100,
          updatedAt: new Date(),
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016' }
        }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue([]);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue([]);
      mockPrisma.color.findUnique.mockResolvedValue({
        id: 5,
        code: 'RAL9016',
        name: 'White',
        hexColor: '#FFFFFF',
        type: 'standard'
      });
      mockPrisma.setting.findUnique.mockResolvedValue({ key: 'lowStockThreshold', value: '10' });

      const result = await service.getColorWarehouseData(5);

      expect(result.data[0].isLow).toBe(true);
    });

    it('should separate pending and received orders', async () => {
      const mockStocks = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          currentStockBeams: 100,
          initialStockBeams: 100,
          updatedAt: new Date(),
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016' }
        }
      ];
      const mockOrders = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          orderedBeams: 50,
          status: 'pending',
          expectedDeliveryDate: new Date()
        },
        {
          id: 2,
          profileId: 1,
          colorId: 5,
          orderedBeams: 30,
          status: 'received',
          expectedDeliveryDate: new Date()
        }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue([]);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.color.findUnique.mockResolvedValue({
        id: 5,
        code: 'RAL9016',
        name: 'White',
        hexColor: '#FFFFFF',
        type: 'standard'
      });
      mockPrisma.setting.findUnique.mockResolvedValue({ key: 'lowStockThreshold', value: '10' });

      const result = await service.getColorWarehouseData(5);

      expect(result.data[0].pendingOrders).toHaveLength(1);
      expect(result.data[0].receivedOrders).toHaveLength(1);
      expect(result.data[0].orderedBeams).toBe(50);
    });
  });

  describe('updateStock', () => {
    it('should update stock successfully with optimistic locking', async () => {
      const mockCurrentStock = { version: 1 };
      const mockUpdated = {
        profileId: 1,
        colorId: 5,
        currentStockBeams: 150,
        updatedAt: new Date(),
        version: 2,
        profile: { id: 1, number: '001', name: 'Profile 1' },
        color: { id: 5, code: 'RAL9016', name: 'White' }
      };

      mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockCurrentStock);
      mockPrisma.warehouseStock.update.mockResolvedValue(mockUpdated);

      const result = await service.updateStock(5, 1, 150, 1);

      expect(result.currentStockBeams).toBe(150);
      expect(result.version).toBe(2);
    });

    it('should throw ValidationError for negative stock', async () => {
      await expect(service.updateStock(5, 1, -10, 1))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for infinite stock', async () => {
      await expect(service.updateStock(5, 1, Infinity, 1))
        .rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when stock record does not exist', async () => {
      mockPrisma.warehouseStock.findUnique.mockResolvedValue(null);

      await expect(service.updateStock(5, 1, 150, 1))
        .rejects.toThrow(NotFoundError);
    });

    it('should handle version conflict', async () => {
      const mockCurrentStock = { version: 2 };

      mockPrisma.warehouseStock.findUnique.mockResolvedValue(mockCurrentStock);

      await expect(service.updateStock(5, 1, 150, 1, 1))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('performMonthlyUpdate', () => {
    it('should perform monthly update and archive orders', async () => {
      const updates = [
        { profileId: 1, actualStock: 100 },
        { profileId: 2, actualStock: 50 }
      ];

      const mockCurrentStock1 = { currentStockBeams: 80 };
      const mockCurrentStock2 = { currentStockBeams: 40 };

      mockPrisma.warehouseStock.findUnique
        .mockResolvedValueOnce(mockCurrentStock1)
        .mockResolvedValueOnce(mockCurrentStock2);
      mockPrisma.warehouseHistory.create.mockResolvedValue({} as any);
      mockPrisma.warehouseStock.update.mockResolvedValue({} as any);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.performMonthlyUpdate(5, updates, 1);

      expect(result.updates).toHaveLength(2);
      expect(result.updates[0].calculatedStock).toBe(80);
      expect(result.updates[0].actualStock).toBe(100);
      expect(result.updates[0].difference).toBe(20);
      expect(result.archivedOrdersCount).toBe(3);
    });

    it('should throw ValidationError for negative actualStock', async () => {
      const updates = [{ profileId: 1, actualStock: -10 }];

      await expect(service.performMonthlyUpdate(5, updates, 1))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for infinite actualStock', async () => {
      const updates = [{ profileId: 1, actualStock: Infinity }];

      await expect(service.performMonthlyUpdate(5, updates, 1))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getAllShortages', () => {
    it('should return all shortages sorted by severity', async () => {
      const mockStocks = [
        {
          profileId: 1,
          colorId: 5,
          currentStockBeams: 50,
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        },
        {
          profileId: 2,
          colorId: 5,
          currentStockBeams: 30,
          profile: { id: 2, number: '002' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        }
      ];
      const mockDemands = [
        { profileId: 1, colorId: 5, _sum: { beamsCount: 70 } },
        { profileId: 2, colorId: 5, _sum: { beamsCount: 40 } }
      ];
      const mockOrders = [
        { profileId: 1, colorId: 5, orderedBeams: 30, status: 'pending', expectedDeliveryDate: new Date() }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue(mockDemands);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue(mockOrders);

      const result = await service.getAllShortages();

      expect(result).toHaveLength(2);
      expect(result[0].shortage).toBe(20); // Profile 1: 50 - 70 = -20
      expect(result[1].shortage).toBe(10); // Profile 2: 30 - 40 = -10
      expect(result[0].priority).toBe('critical');
    });

    it('should exclude profiles with positive afterDemand', async () => {
      const mockStocks = [
        {
          profileId: 1,
          colorId: 5,
          currentStockBeams: 100,
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        }
      ];
      const mockDemands = [
        { profileId: 1, colorId: 5, _sum: { beamsCount: 50 } }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue(mockDemands);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue([]);

      const result = await service.getAllShortages();

      expect(result).toHaveLength(0);
    });

    it('should calculate pending orders correctly', async () => {
      const mockStocks = [
        {
          profileId: 1,
          colorId: 5,
          currentStockBeams: 50,
          profile: { id: 1, number: '001' },
          color: { id: 5, code: 'RAL9016', name: 'White' }
        }
      ];
      const mockDemands = [
        { profileId: 1, colorId: 5, _sum: { beamsCount: 70 } }
      ];
      // Service queries with where: { status: 'pending' }, so only return pending orders
      const mockPendingOrders = [
        { profileId: 1, colorId: 5, orderedBeams: 30, status: 'pending', expectedDeliveryDate: new Date() },
        { profileId: 1, colorId: 5, orderedBeams: 20, status: 'pending', expectedDeliveryDate: new Date() }
      ];

      mockPrisma.warehouseStock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.orderRequirement.groupBy.mockResolvedValue(mockDemands);
      mockPrisma.warehouseOrder.findMany.mockResolvedValue(mockPendingOrders);

      const result = await service.getAllShortages();

      expect(result[0].orderedBeams).toBe(50); // Only pending orders
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

      mockPrisma.warehouseHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getHistoryByColor(5, 100);

      expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { colorId: 5 },
          take: 100
        })
      );
      expect(result).toEqual(mockHistory);
    });

    it('should use default limit when not provided', async () => {
      mockPrisma.warehouseHistory.findMany.mockResolvedValue([]);

      await service.getHistoryByColor(5);

      expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100
        })
      );
    });
  });

  describe('getAllHistory', () => {
    it('should return all warehouse history', async () => {
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

      mockPrisma.warehouseHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getAllHistory(100);

      expect(mockPrisma.warehouseHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 100
        })
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('rollbackInventory', () => {
    it('should rollback inventory within 24h window', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60);

      const mockHistory = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          calculatedStock: 80,
          actualStock: 100,
          difference: 20,
          changeType: 'monthly_inventory',
          recordedAt: oneHourAgo
        }
      ];
      const mockArchivedOrders = [
        { id: 1, orderNumber: 'ORD-001' },
        { id: 2, orderNumber: 'ORD-002' }
      ];

      mockPrisma.warehouseHistory.findMany.mockResolvedValue(mockHistory);
      mockPrisma.order.findMany.mockResolvedValue(mockArchivedOrders);
      mockPrisma.warehouseStock.update.mockResolvedValue({} as any);
      mockPrisma.warehouseHistory.delete.mockResolvedValue({} as any);
      mockPrisma.order.updateMany.mockResolvedValue({} as any);

      const result = await service.rollbackInventory(5, 1);

      expect(result.success).toBe(true);
      expect(result.rolledBackRecords).toHaveLength(1);
      expect(result.restoredOrdersCount).toBe(2);
    });

    it('should throw NotFoundError when no inventory history exists', async () => {
      mockPrisma.warehouseHistory.findMany.mockResolvedValue([]);

      await expect(service.rollbackInventory(5, 1))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when inventory is older than 24 hours', async () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 25);

      const mockHistory = [
        {
          id: 1,
          profileId: 1,
          colorId: 5,
          calculatedStock: 80,
          actualStock: 100,
          difference: 20,
          changeType: 'monthly_inventory',
          recordedAt: twentyFiveHoursAgo
        }
      ];

      mockPrisma.warehouseHistory.findMany.mockResolvedValue(mockHistory);

      await expect(service.rollbackInventory(5, 1))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getMonthlyUsage', () => {
    it('should calculate monthly average usage', async () => {
      const mockRequirements = [
        {
          profileId: 1,
          beamsCount: 10,
          orderId: 1
        },
        {
          profileId: 1,
          beamsCount: 20,
          orderId: 2
        }
      ];
      const mockOrders = [
        { id: 1, deliveryDate: new Date('2025-01-15') },
        { id: 2, deliveryDate: new Date('2025-01-20') }
      ];
      const mockProfiles = [
        { id: 1, number: '001', name: 'Profile 1' }
      ];

      mockPrisma.orderRequirement.findMany.mockResolvedValue(mockRequirements);
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles);

      const result = await service.getMonthlyUsage(5, 6);

      expect(result).toHaveLength(1);
      expect(result[0].profileId).toBe(1);
      expect(result[0].totalBeams).toBe(30);
    });
  });

  describe('finalizeMonth', () => {
    it('should return preview when archive is false', async () => {
      const mockOrders = [
        {
          id: 1,
          orderNumber: 'ORD-001',
          deliveryDate: new Date('2025-01-15')
        },
        {
          id: 2,
          orderNumber: 'ORD-002',
          deliveryDate: new Date('2025-01-20')
        }
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.finalizeMonth('2025-01', false);

      expect(result.preview).toBe(true);
      expect(result.ordersCount).toBe(2);
      expect(result.orderNumbers).toEqual(['ORD-001', 'ORD-002']);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('should archive orders when archive is true', async () => {
      const mockOrders = [
        {
          id: 1,
          orderNumber: 'ORD-001',
          deliveryDate: new Date('2025-01-15')
        }
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.updateMany.mockResolvedValue({} as any);

      const result = await service.finalizeMonth('2025-01', true);

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(1);
      expect(mockPrisma.order.updateMany).toHaveBeenCalled();
    });

    it('should handle no orders to archive', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.finalizeMonth('2025-01', true);

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(0);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });
});
