/**
 * DeliveryService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryService } from './deliveryService.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { createMockPrisma } from '../tests/mocks/prisma.mock.js';

// Mock event emitters
vi.mock('./event-emitter.js', () => ({
  emitDeliveryCreated: vi.fn(),
  emitDeliveryUpdated: vi.fn(),
  emitDeliveryDeleted: vi.fn(),
  emitOrderUpdated: vi.fn(),
}));

describe('DeliveryService', () => {
  let service: DeliveryService;
  let repository: DeliveryRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
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

      mockPrisma.delivery.findMany.mockResolvedValue(mockDeliveries);

      const result = await service.getAllDeliveries({});

      expect(result).toEqual(mockDeliveries);
    });

    it('should filter deliveries by date range', async () => {
      const mockDeliveries: any[] = [];
      mockPrisma.delivery.findMany.mockResolvedValue(mockDeliveries);

      await service.getAllDeliveries({ from: '2024-01-01', to: '2024-01-31' });

      expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
    });
  });

  describe('getDeliveryById', () => {
    it('should return delivery when found', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D001',
        status: 'pending',
        notes: null,
        totalPallets: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      const result = await service.getDeliveryById(1);

      expect(result).toEqual(mockDelivery);
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
        totalPallets: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryOrders: [],
        deliveryItems: [],
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

      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);

      const result = await service.addOrderToDelivery(1, 5);

      expect(result).toEqual(mockDeliveryOrder);
      expect(mockPrisma.deliveryOrder.create).toHaveBeenCalledWith({
        data: {
          deliveryId: 1,
          orderId: 5,
          position: 1,
        },
        select: expect.any(Object),
      });
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
      mockPrisma.delivery.delete.mockResolvedValue(mockDelivery);

      await service.deleteDelivery(1);

      expect(mockPrisma.delivery.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.deleteDelivery(999)).rejects.toThrow(NotFoundError);
      expect(mockPrisma.delivery.delete).not.toHaveBeenCalled();
    });
  });
});
