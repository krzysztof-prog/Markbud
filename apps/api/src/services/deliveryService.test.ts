/**
 * DeliveryService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// IMPORTANT: Mock the app index to prevent loading Fastify routes during test
// Create inline mock to avoid hoisting issues
vi.mock('../index.js', () => ({
  prisma: {
    delivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    deliveryOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    palletOptimization: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

import { DeliveryService } from './deliveryService.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';
import { prisma as indexPrisma } from '../index.js';

// Mock event emitters - used by DeliveryEventEmitter internally
vi.mock('./event-emitter.js', () => ({
  emitDeliveryCreated: vi.fn(),
  emitDeliveryUpdated: vi.fn(),
  emitDeliveryDeleted: vi.fn(),
  emitOrderUpdated: vi.fn(),
}));

// Mock delivery totals service
vi.mock('./deliveryTotalsService.js', () => ({
  deliveryTotalsService: {
    getDeliveryTotals: vi.fn().mockResolvedValue({
      totalWindows: 0,
      totalGlass: 0,
      totalPallets: 0,
      totalValue: 0,
    }),
    getTotalPallets: vi.fn().mockResolvedValue(0),
  },
}));

// Mock order service for completeAllOrders
vi.mock('./orderService.js', () => ({
  OrderService: class MockOrderService {
    bulkUpdateStatus = vi.fn().mockResolvedValue({ count: 0 });
  }
}));

// Mock OrderRepository
vi.mock('../repositories/OrderRepository.js', () => ({
  OrderRepository: class MockOrderRepository {
    constructor(public prisma: any) {}
  }
}));

// Mock OrderVariantService
vi.mock('./orderVariantService.js', () => ({
  OrderVariantService: class MockOrderVariantService {
    checkVariantInDelivery = vi.fn().mockResolvedValue({ hasConflict: false });
  }
}));

// Mock CsvParser
vi.mock('./parsers/csv-parser.js', () => ({
  CsvParser: class MockCsvParser {
    parseOrderNumber = vi.fn().mockReturnValue({ base: 'O001', variant: null });
  }
}));

describe('DeliveryService', () => {
  let service: DeliveryService;
  let repository: DeliveryRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new DeliveryRepository(mockPrisma);
    service = new DeliveryService(repository);
  });

  describe('getAllDeliveries', () => {
    it('should return all deliveries', async () => {
      const mockDeliveries = [
        {
          id: 1,
          deliveryDate: new Date('2024-01-15'),
          deliveryNumber: 'D001',
          status: 'pending',
          notes: null,
          totalPallets: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          deliveryOrders: [],
          _count: { deliveryOrders: 0 },
        },
      ];

      mockPrisma.delivery.count.mockResolvedValue(1);
      mockPrisma.delivery.findMany.mockResolvedValue(mockDeliveries);

      const result = await service.getAllDeliveries({});

      expect(result.data).toEqual(mockDeliveries);
      expect(result.total).toBe(1);
    });

    it('should filter deliveries by date range', async () => {
      const mockDeliveries: any[] = [];
      mockPrisma.delivery.count.mockResolvedValue(0);
      mockPrisma.delivery.findMany.mockResolvedValue(mockDeliveries);

      await service.getAllDeliveries({ from: '2024-01-01', to: '2024-01-31' });

      expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      expect(mockPrisma.delivery.count).toHaveBeenCalled();
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery when found with calculated totals', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      const result = await service.getDeliveryById(1);

      // Result includes delivery data plus calculated totals from deliveryTotalsService
      expect(result).toMatchObject({
        id: 1,
        deliveryNumber: 'D001',
        status: 'pending',
        // Totals from mocked deliveryTotalsService
        totalWindows: 0,
        totalGlass: 0,
        totalPallets: 0,
        totalValue: 0,
      });
    });

    it('should throw NotFoundError when delivery not found', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.getDeliveryById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createDelivery', () => {
    it('should create delivery and emit event', async () => {
      const input = {
        deliveryDate: '2024-01-15',
        deliveryNumber: 'D001',
        notes: 'Test delivery',
      };
      const mockCreated = {
        id: 1,
        deliveryDate: new Date(input.deliveryDate),
        deliveryNumber: input.deliveryNumber,
        notes: input.notes,
        status: 'pending',
        totalPallets: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.delivery.create.mockResolvedValue(mockCreated);

      const result = await service.createDelivery(input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
        data: {
          deliveryDate: expect.any(Date),
          deliveryNumber: input.deliveryNumber,
          notes: input.notes,
        },
      });
    });
  });

  describe('addOrderToDelivery', () => {
    it('should add order to delivery', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const mockOrder = {
        id: 5,
        orderNumber: 'O001',
      };
      const mockDeliveryOrder = {
        deliveryId: 1,
        orderId: 5,
        position: 1,
        order: {
          id: 5,
          orderNumber: 'O001',
          status: 'new',
          valuePln: 1000,
        },
      };

      (indexPrisma as any).order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);

      const result = await service.addOrderToDelivery(1, 5);

      expect(result).toMatchObject({
        deliveryId: 1,
        orderId: 5,
        position: 1,
      });
    });
  });

  describe('updateDelivery', () => {
    it('should update delivery when exists', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: 'Old notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const updatedDelivery = {
        ...mockDelivery,
        status: 'completed',
        notes: 'Updated notes',
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.update.mockResolvedValue(updatedDelivery);

      const result = await service.updateDelivery(1, {
        status: 'completed',
        notes: 'Updated notes',
      });

      expect(result.status).toBe('completed');
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundError when delivery not found', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.updateDelivery(999, { status: 'completed' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteDelivery', () => {
    it('should delete delivery when exists', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        totalPallets: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      // Soft delete uses update instead of delete
      mockPrisma.delivery.update.mockResolvedValue({ ...mockDelivery, deletedAt: new Date() });

      await service.deleteDelivery(1);

      // Verify soft delete was performed (update with deletedAt)
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.deleteDelivery(999)).rejects.toThrow(NotFoundError);
      expect(mockPrisma.delivery.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeOrderFromDelivery', () => {
    it('should remove order from delivery', async () => {
      mockPrisma.deliveryOrder.delete.mockResolvedValue({
        deliveryId: 1,
        orderId: 5,
        position: 0,
      });

      await service.removeOrderFromDelivery(1, 5);

      expect(mockPrisma.deliveryOrder.delete).toHaveBeenCalledWith({
        where: {
          deliveryId_orderId: {
            deliveryId: 1,
            orderId: 5,
          },
        },
      });
    });
  });

  describe('reorderDeliveryOrders', () => {
    it('should reorder delivery orders', async () => {
      // Mock getDeliveryById to return delivery with orders
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        deliveryOrders: [
          { id: 1, deliveryId: 1, orderId: 5, position: 0 },
          { id: 2, deliveryId: 1, orderId: 6, position: 1 },
          { id: 3, deliveryId: 1, orderId: 7, position: 2 },
        ],
      });

      mockPrisma.deliveryOrder.update.mockResolvedValue({
        deliveryId: 1,
        orderId: 5,
        position: 0,
      });

      const result = await service.reorderDeliveryOrders(1, [5, 6, 7]);

      expect(result).toEqual({ success: true });
    });
  });

  describe('addItemToDelivery', () => {
    it('should add item to delivery', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const mockItem = {
        id: 1,
        deliveryId: 1,
        itemType: 'Hardware',
        description: 'Door handles',
        quantity: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryItem.create.mockResolvedValue(mockItem);

      const result = await service.addItemToDelivery(1, {
        itemType: 'Hardware',
        description: 'Door handles',
        quantity: 10,
      });

      expect(result).toEqual(mockItem);
    });
  });

  describe('removeItemFromDelivery', () => {
    it('should remove item from delivery', async () => {
      mockPrisma.deliveryItem.delete.mockResolvedValue({
        id: 1,
        deliveryId: 1,
        itemType: 'Hardware',
        description: 'Door handles',
        quantity: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.removeItemFromDelivery(1, 1);

      expect(mockPrisma.deliveryItem.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('completeDelivery', () => {
    it('should complete delivery and update orders', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [
          { deliveryId: 1, orderId: 5, position: 0 },
          { deliveryId: 1, orderId: 6, position: 1 },
        ],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.completeDelivery(1, '2024-01-15');

      expect(result).toEqual({
        success: true,
        updatedOrders: 2,
      });
    });

    it('should throw NotFoundError when delivery not found', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.completeDelivery(999, '2024-01-15')).rejects.toThrow(NotFoundError);
    });
  });

  describe('moveOrderBetweenDeliveries', () => {
    it('should move order from source to target delivery', async () => {
      const mockDeliveryOrder = {
        deliveryId: 2,
        orderId: 5,
        position: 0,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
      mockPrisma.deliveryOrder.delete.mockResolvedValue(mockDeliveryOrder);
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);

      const result = await service.moveOrderBetweenDeliveries(1, 2, 5);

      expect(result).toEqual(mockDeliveryOrder);
    });
  });

  describe('getCalendarData', () => {
    it('should return calendar data for given year and month', async () => {
      const mockCalendarData = [
        {
          date: new Date('2024-01-15'),
          deliveries: [],
        },
      ];

      vi.spyOn(repository, 'getCalendarData').mockResolvedValue(mockCalendarData as any);

      const result = await service.getCalendarData(2024, 1);

      expect(result).toEqual(mockCalendarData);
      expect(repository.getCalendarData).toHaveBeenCalledWith(2024, 1);
    });
  });
});
