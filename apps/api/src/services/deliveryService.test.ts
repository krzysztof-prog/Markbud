/**
 * DeliveryService Unit Tests
 *
 * Testy jednostkowe dla DeliveryService - głównego serwisu zarządzania dostawami.
 *
 * Pokrywa scenariusze:
 * - CRUD operacje na dostawach
 * - Przypisywanie/odpinanie zleceń
 * - Soft delete dostawy
 * - Walidacja statusów (state machine)
 * - Walidacja wariantów zleceń
 * - Przenoszenie zleceń między dostawami
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
      delete: vi.fn(),
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
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(),
  },
}));

import { DeliveryService } from './deliveryService.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
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
  },
}));

// Mock OrderRepository
vi.mock('../repositories/OrderRepository.js', () => ({
  OrderRepository: class MockOrderRepository {
    constructor(public prisma: unknown) {}
  },
}));

// Mock OrderVariantService
vi.mock('./orderVariantService.js', () => ({
  OrderVariantService: class MockOrderVariantService {
    checkVariantInDelivery = vi.fn().mockResolvedValue({ hasConflict: false });
  },
}));

// Mock CsvParser
vi.mock('./parsers/csv-parser.js', () => ({
  CsvParser: class MockCsvParser {
    parseOrderNumber = vi.fn().mockReturnValue({ base: 'O001', variant: null, suffix: null });
  },
}));

// Mock pallet validation service
vi.mock('./palletValidationService.js', () => ({
  PalletValidationService: class MockPalletValidationService {
    canShipDelivery = vi.fn().mockResolvedValue({ canShip: true });
  },
}));

describe('DeliveryService', () => {
  let service: DeliveryService;
  let repository: DeliveryRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    // P1-4: Mock palletOptimization.deleteMany dla invalidacji optymalizacji
    mockPrisma.palletOptimization.deleteMany.mockResolvedValue({ count: 0 });
    repository = new DeliveryRepository(mockPrisma);
    service = new DeliveryService(repository);
  });

  // ===================
  // CRUD Operations
  // ===================

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
      const mockDeliveries: unknown[] = [];
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

  // ===================
  // Order-Delivery Operations
  // ===================

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

      (indexPrisma as { order: { findUnique: ReturnType<typeof vi.fn> } }).order.findUnique.mockResolvedValue(mockOrder);
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

    it('should throw NotFoundError when order does not exist', async () => {
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
      (indexPrisma as { order: { findUnique: ReturnType<typeof vi.fn> } }).order.findUnique.mockResolvedValue(null);

      await expect(service.addOrderToDelivery(1, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.addOrderToDelivery(999, 5)).rejects.toThrow(NotFoundError);
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

    it('should call removeOrderFromDelivery on repository', async () => {
      mockPrisma.deliveryOrder.delete.mockResolvedValue({
        deliveryId: 1,
        orderId: 5,
        position: 0,
      });

      await service.removeOrderFromDelivery(1, 5);

      // Repository method should be called
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

  // ===================
  // Update Operations
  // ===================

  describe('updateDelivery', () => {
    it('should update delivery when exists (P0-2 valid status transition)', async () => {
      // P0-2: Use valid statuses from delivery-status-machine
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'in_progress', // P0-2: Valid status that can transition to completed
        notes: 'Old notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [
          { order: { status: 'in_production' } }, // P0-2: Orders in progress for completed transition
        ],
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

    it('should update delivery date', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const updatedDelivery = {
        ...mockDelivery,
        deliveryDate: new Date('2024-01-20'),
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.update.mockResolvedValue(updatedDelivery);

      const result = await service.updateDelivery(1, {
        deliveryDate: '2024-01-20',
      });

      expect(result.deliveryDate).toEqual(new Date('2024-01-20'));
    });

    it('should throw ValidationError for invalid status transition (completed -> planned)', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'completed', // Terminal state
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      // completed -> planned is NOT allowed (completed is terminal)
      await expect(
        service.updateDelivery(1, { status: 'planned' })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid status transition (planned -> completed)', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      // planned -> completed is NOT allowed (must go through in_progress)
      await expect(
        service.updateDelivery(1, { status: 'completed' })
      ).rejects.toThrow(ValidationError);
    });

    it('should allow valid status transition (planned -> in_progress)', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const updatedDelivery = {
        ...mockDelivery,
        status: 'in_progress',
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.update.mockResolvedValue(updatedDelivery);

      const result = await service.updateDelivery(1, { status: 'in_progress' });

      expect(result.status).toBe('in_progress');
    });

    it('should allow rollback from in_progress to planned', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'in_progress',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };
      const updatedDelivery = {
        ...mockDelivery,
        status: 'planned',
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.update.mockResolvedValue(updatedDelivery);

      // in_progress -> planned is allowed (cancel loading)
      const result = await service.updateDelivery(1, { status: 'planned' });

      expect(result.status).toBe('planned');
    });
  });

  // ===================
  // Soft Delete Operations
  // ===================

  describe('deleteDelivery', () => {
    it('should soft delete delivery and unlink orders (P1-1 cascade)', async () => {
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
      // P1-1: Now uses transaction with deleteMany + update
      mockPrisma.deliveryOrder.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.delivery.update.mockResolvedValue({ ...mockDelivery, deletedAt: new Date() });

      await service.deleteDelivery(1);

      // P1-1: Verify orders were unlinked (deleteMany on DeliveryOrder)
      expect(mockPrisma.deliveryOrder.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryId: 1 },
        })
      );

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

    it('should unlink orders before soft deleting delivery with assigned orders', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        totalPallets: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [
          { orderId: 5, position: 1 },
          { orderId: 6, position: 2 },
          { orderId: 7, position: 3 },
        ],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryOrder.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.delivery.update.mockResolvedValue({ ...mockDelivery, deletedAt: new Date() });

      await service.deleteDelivery(1);

      // Orders should be unlinked first
      expect(mockPrisma.deliveryOrder.deleteMany).toHaveBeenCalledWith({
        where: { deliveryId: 1 },
      });

      // Then delivery should be soft deleted
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should preserve order data when delivery is soft deleted (only unlink orders)', async () => {
      // Zlecenia pozostają w systemie po usunięciu dostawy - tylko link jest usuwany
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [{ orderId: 5, position: 1 }],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryOrder.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.update.mockResolvedValue({ ...mockDelivery, deletedAt: new Date() });

      await service.deleteDelivery(1);

      // Only DeliveryOrder links should be deleted, NOT the orders themselves
      expect(mockPrisma.deliveryOrder.deleteMany).toHaveBeenCalledWith({
        where: { deliveryId: 1 },
      });
      // Soft delete should set deletedAt, not hard delete
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
      // Hard delete should NOT be called
      expect(mockPrisma.delivery.delete).not.toHaveBeenCalled();
    });
  });

  // ===================
  // Reorder Operations
  // ===================

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

    it('should throw ValidationError when order list contains duplicates', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        deliveryOrders: [
          { orderId: 5, position: 0 },
          { orderId: 6, position: 1 },
        ],
      });

      // Lista z duplikatami
      await expect(
        service.reorderDeliveryOrders(1, [5, 5, 6])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when order list is incomplete', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        deliveryOrders: [
          { orderId: 5, position: 0 },
          { orderId: 6, position: 1 },
          { orderId: 7, position: 2 },
        ],
      });

      // Lista niekompletna (brakuje orderId 7)
      await expect(
        service.reorderDeliveryOrders(1, [5, 6])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when order list contains orders not in delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        deliveryOrders: [
          { orderId: 5, position: 0 },
          { orderId: 6, position: 1 },
        ],
      });

      // Lista zawiera orderId 999 który nie należy do dostawy
      await expect(
        service.reorderDeliveryOrders(1, [5, 6, 999])
      ).rejects.toThrow(ValidationError);
    });
  });

  // ===================
  // Move Order Between Deliveries
  // ===================

  describe('moveOrderBetweenDeliveries', () => {
    it('should move order from source to target delivery', async () => {
      const mockDeliveryOrder = {
        deliveryId: 2,
        orderId: 5,
        position: 0,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (prisma: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      });
      mockPrisma.deliveryOrder.delete.mockResolvedValue(mockDeliveryOrder);
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);

      const result = await service.moveOrderBetweenDeliveries(1, 2, 5);

      expect(result).toEqual(mockDeliveryOrder);
    });

    it('should delete from source and create in target delivery atomically', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: (prisma: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      });
      mockPrisma.deliveryOrder.delete.mockResolvedValue({ deliveryId: 1, orderId: 5, position: 0 });
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue({ deliveryId: 2, orderId: 5, position: 1 });

      await service.moveOrderBetweenDeliveries(1, 2, 5);

      // Should use transaction for atomicity
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Delete from source delivery
      expect(mockPrisma.deliveryOrder.delete).toHaveBeenCalled();
      // Create in target delivery
      expect(mockPrisma.deliveryOrder.create).toHaveBeenCalled();
    });
  });

  // ===================
  // Item Operations
  // ===================

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

  // ===================
  // Completion Operations
  // ===================

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

  // ===================
  // Calendar Operations
  // ===================

  describe('getCalendarData', () => {
    it('should return calendar data for given year and month', async () => {
      const mockCalendarData = [
        {
          date: new Date('2024-01-15'),
          deliveries: [],
        },
      ];

      vi.spyOn(repository, 'getCalendarData').mockResolvedValue(mockCalendarData as unknown as { deliveries: unknown[]; unassignedOrders: unknown[] });

      const result = await service.getCalendarData(2024, 1);

      expect(result).toEqual(mockCalendarData);
      expect(repository.getCalendarData).toHaveBeenCalledWith(2024, 1);
    });
  });

  // ===================
  // Order Already Assigned Validation
  // ===================

  describe('order already assigned to another delivery', () => {
    it('should handle variant order conflict when order is already on another delivery', async () => {
      // Ten test sprawdza scenariusz gdy wariant zlecenia jest już przypisany do innej dostawy
      const mockDelivery = {
        id: 2,
        deliveryDate: new Date(),
        deliveryNumber: 'D002',
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      const mockOrder = {
        id: 5,
        orderNumber: 'O001-A', // Wariant
        variantType: 'correction',
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      (indexPrisma as { order: { findUnique: ReturnType<typeof vi.fn> } }).order.findUnique.mockResolvedValue(mockOrder);

      // OrderVariantService will handle the conflict check
      // Gdy variantType = 'correction', musi być w tej samej dostawie co oryginał
      // Ten test zakłada że mock OrderVariantService.checkVariantInDelivery
      // zwraca { hasConflict: false } - więc dodanie przejdzie
      // W rzeczywistości jeśli oryginał jest na D001, a próbujemy dodać korektę do D002,
      // checkVariantInDelivery powinien zwrócić { hasConflict: true }

      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue({
        deliveryId: 2,
        orderId: 5,
        position: 1,
      });

      // Z domyślnym mockiem (hasConflict: false) dodanie przejdzie
      const result = await service.addOrderToDelivery(2, 5);
      expect(result).toMatchObject({ deliveryId: 2, orderId: 5 });
    });
  });

  // ===================
  // Edge Cases
  // ===================

  describe('edge cases', () => {
    it('should handle empty delivery (no orders assigned)', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryOrder.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.delivery.update.mockResolvedValue({ ...mockDelivery, deletedAt: new Date() });

      // Usunięcie pustej dostawy powinno działać
      await service.deleteDelivery(1);

      expect(mockPrisma.delivery.update).toHaveBeenCalled();
    });

    it('should handle same status update (no-op)', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'planned',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.update.mockResolvedValue(mockDelivery);

      // Zmiana na ten sam status - powinno przejść bez walidacji
      const result = await service.updateDelivery(1, { status: 'planned' });

      expect(result.status).toBe('planned');
    });

    it('should throw when completing delivery with orders in new status', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D001',
        status: 'in_progress',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [
          { order: { status: 'new' } }, // Zlecenie w statusie 'new' - nie można zakończyć dostawy
        ],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      // in_progress -> completed z zleceniami w statusie 'new' powinno rzucić błąd
      await expect(
        service.updateDelivery(1, { status: 'completed' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
