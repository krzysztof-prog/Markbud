/**
 * DeliveryRepository Unit Tests
 *
 * Comprehensive tests for DeliveryRepository covering:
 * - CRUD operations
 * - Calendar queries with date ranges
 * - Statistics and aggregations
 * - Batch operations
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryRepository, DeliveryFilters } from './DeliveryRepository.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';
import { Prisma } from '@prisma/client';

describe('DeliveryRepository', () => {
  let repository: DeliveryRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Test fixtures
  const mockDelivery = {
    id: 1,
    deliveryDate: new Date('2024-02-15'),
    deliveryNumber: 'D001',
    status: 'pending',
    notes: 'Test delivery notes',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    deliveryOrders: [],
    deliveryItems: [],
    _count: { deliveryOrders: 0 },
  };

  const mockDeliveryWithOrders = {
    ...mockDelivery,
    deliveryOrders: [
      {
        deliveryId: 1,
        orderId: 1,
        position: 1,
        order: {
          id: 1,
          orderNumber: 'O001',
          valuePln: 15000,
          valueEur: 3500,
          totalWindows: 10,
          totalSashes: 20,
          totalGlasses: 20,
          status: 'new',
          windows: [{ reference: 'W1' }],
          requirements: [
            {
              id: 1,
              profileId: 1,
              colorId: 1,
              beamsCount: 5,
              meters: 30,
              profile: { id: 1, number: 'P001', name: 'Profile 1' },
              color: { id: 1, code: 'RAL9016', name: 'White' },
            },
          ],
        },
      },
      {
        deliveryId: 1,
        orderId: 2,
        position: 2,
        order: {
          id: 2,
          orderNumber: 'O002',
          valuePln: 20000,
          valueEur: 4500,
          totalWindows: 15,
          totalSashes: 30,
          totalGlasses: 30,
          status: 'in_progress',
          windows: [{ reference: 'W2' }],
          requirements: [],
        },
      },
    ],
    _count: { deliveryOrders: 2 },
  };

  const mockDeliveryItem = {
    id: 1,
    deliveryId: 1,
    itemType: 'Hardware',
    description: 'Door handles',
    quantity: 10,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new DeliveryRepository(mockPrisma);
  });

  describe('CRUD operations', () => {
    describe('findById', () => {
      it('returns delivery when exists', async () => {
        mockPrisma.delivery.findUnique.mockResolvedValue(mockDeliveryWithOrders);

        const result = await repository.findById(1);

        expect(result).toEqual(mockDeliveryWithOrders);
        expect(mockPrisma.delivery.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
          select: expect.objectContaining({
            id: true,
            deliveryDate: true,
            deliveryNumber: true,
            status: true,
          }),
        });
      });

      it('returns null when not exists', async () => {
        mockPrisma.delivery.findUnique.mockResolvedValue(null);

        const result = await repository.findById(999);

        expect(result).toBeNull();
      });

      it('includes deliveryOrders with order details', async () => {
        mockPrisma.delivery.findUnique.mockResolvedValue(mockDeliveryWithOrders);

        const result = await repository.findById(1);

        expect(result?.deliveryOrders).toHaveLength(2);
        expect(result?.deliveryOrders[0].order).toHaveProperty('orderNumber', 'O001');
      });

      it('includes deliveryItems', async () => {
        const deliveryWithItems = {
          ...mockDelivery,
          deliveryItems: [mockDeliveryItem],
        };
        mockPrisma.delivery.findUnique.mockResolvedValue(deliveryWithItems);

        const result = await repository.findById(1);

        expect(result?.deliveryItems).toHaveLength(1);
        expect(result?.deliveryItems[0]).toHaveProperty('itemType', 'Hardware');
      });
    });

    describe('create', () => {
      it('creates delivery with valid data', async () => {
        const createData = {
          deliveryDate: new Date('2024-02-20'),
          deliveryNumber: 'D002',
          notes: 'New delivery',
        };
        const createdDelivery = { id: 2, ...createData, status: 'pending', createdAt: new Date(), updatedAt: new Date() };

        mockPrisma.delivery.create.mockResolvedValue(createdDelivery);

        const result = await repository.create(createData);

        expect(result).toEqual(createdDelivery);
        expect(mockPrisma.delivery.create).toHaveBeenCalledWith({ data: createData });
      });

      it('creates delivery without optional fields', async () => {
        const createData = {
          deliveryDate: new Date('2024-02-20'),
        };
        const createdDelivery = { id: 2, ...createData, deliveryNumber: null, notes: null, status: 'pending', createdAt: new Date(), updatedAt: new Date() };

        mockPrisma.delivery.create.mockResolvedValue(createdDelivery);

        const result = await repository.create(createData);

        expect(result.deliveryNumber).toBeNull();
        expect(result.notes).toBeNull();
      });
    });

    describe('update', () => {
      it('updates delivery successfully', async () => {
        const updateData = { status: 'shipped', notes: 'Updated notes' };
        const updatedDelivery = { ...mockDelivery, ...updateData };

        mockPrisma.delivery.update.mockResolvedValue(updatedDelivery);

        const result = await repository.update(1, updateData);

        expect(result.status).toBe('shipped');
        expect(result.notes).toBe('Updated notes');
        expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updateData,
        });
      });

      it('throws when delivery not found', async () => {
        mockPrisma.delivery.update.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.update(999, { status: 'delivered' })).rejects.toThrow();
      });
    });

    describe('delete', () => {
      it('soft deletes delivery successfully', async () => {
        // Soft delete: uses update with deletedAt instead of hard delete
        mockPrisma.delivery.update.mockResolvedValue({
          ...mockDelivery,
          deletedAt: new Date(),
        });

        await repository.delete(1);

        expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        });
      });

      it('throws when delivery not found', async () => {
        mockPrisma.delivery.update.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.delete(999)).rejects.toThrow();
      });
    });
  });

  describe('Calendar queries', () => {
    describe('findAll - date range filtering', () => {
      it('filters deliveries in date range', async () => {
        const from = new Date('2024-02-01');
        const to = new Date('2024-02-28');

        mockPrisma.delivery.count.mockResolvedValue(1);
        mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

        await repository.findAll({ from, to });

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
        expect(mockPrisma.delivery.count).toHaveBeenCalled();
      });

      it('filters by from date only', async () => {
        const from = new Date('2024-02-01');

        mockPrisma.delivery.count.mockResolvedValue(1);
        mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

        await repository.findAll({ from });

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });

      it('filters by to date only', async () => {
        const to = new Date('2024-02-28');

        mockPrisma.delivery.count.mockResolvedValue(1);
        mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

        await repository.findAll({ to });

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });

      it('filters by status', async () => {
        mockPrisma.delivery.count.mockResolvedValue(1);
        mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

        await repository.findAll({ status: 'pending' });

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });

      it('combines date range and status filters', async () => {
        mockPrisma.delivery.count.mockResolvedValue(1);
        mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

        await repository.findAll({
          from: new Date('2024-02-01'),
          to: new Date('2024-02-28'),
          status: 'pending',
        });

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
        expect(mockPrisma.delivery.count).toHaveBeenCalled();
      });
    });

    describe('getCalendarData', () => {
      it('returns deliveries and unassigned orders for month', async () => {
        const deliveries = [mockDeliveryWithOrders];
        const unassignedOrders = [
          {
            id: 3,
            orderNumber: 'O003',
            status: 'new',
            deliveryDate: null,
            totalWindows: 5,
            totalSashes: 10,
            totalGlasses: 10,
          },
        ];

        mockPrisma.delivery.findMany.mockResolvedValue(deliveries);
        mockPrisma.order.findMany.mockResolvedValue(unassignedOrders);

        const result = await repository.getCalendarData(2024, 2);

        expect(result.deliveries).toEqual(deliveries);
        expect(result.unassignedOrders).toEqual(unassignedOrders);
      });

      it('handles month boundaries correctly', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([]);
        mockPrisma.order.findMany.mockResolvedValue([]);

        await repository.getCalendarData(2024, 2);

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });

      it('handles December to January transition', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([]);
        mockPrisma.order.findMany.mockResolvedValue([]);

        await repository.getCalendarData(2024, 12);

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });
    });

    describe('getWorkingDays', () => {
      it('returns working days for month', async () => {
        const workingDays = [
          { id: 1, date: new Date('2024-02-05'), isWorking: true, note: null },
          { id: 2, date: new Date('2024-02-12'), isWorking: false, note: 'Holiday' },
        ];

        mockPrisma.workingDay.findMany.mockResolvedValue(workingDays);

        const result = await repository.getWorkingDays(2, 2024);

        expect(result).toEqual(workingDays);
        expect(mockPrisma.workingDay.findMany).toHaveBeenCalled();
      });
    });

    describe('getHolidays', () => {
      it('returns Polish holidays for year', async () => {
        const result = await repository.getHolidays(2024);

        expect(result.length).toBeGreaterThan(0);
        // Check for some fixed holidays
        expect(result.some((h) => h.name === 'Nowy Rok')).toBe(true);
        expect(result.some((h) => h.name === 'Boze Narodzenie' || h.name === 'Boże Narodzenie')).toBe(true);
      });

      it('calculates Easter and movable holidays', async () => {
        const result = await repository.getHolidays(2024);

        expect(result.some((h) => h.name === 'Niedziela Wielkanocna')).toBe(true);
        expect(result.some((h) => h.name.includes('Wielkanocny') || h.name === 'Poniedziałek Wielkanocny')).toBe(true);
      });

      it('returns correct number of holidays', async () => {
        const result = await repository.getHolidays(2024);

        // 9 fixed + 4 movable (Easter Sunday, Easter Monday, Pentecost, Corpus Christi)
        expect(result.length).toBe(13);
      });
    });
  });

  describe('Order management', () => {
    describe('addOrderToDelivery', () => {
      it('adds order with specified position', async () => {
        const deliveryOrder = {
          deliveryId: 1,
          orderId: 3,
          position: 3,
          order: {
            id: 3,
            orderNumber: 'O003',
            status: 'new',
            valuePln: 10000,
          },
        };

        mockPrisma.deliveryOrder.create.mockResolvedValue(deliveryOrder);

        const result = await repository.addOrderToDelivery(1, 3, 3);

        expect(result).toEqual(deliveryOrder);
        expect(mockPrisma.deliveryOrder.create).toHaveBeenCalledWith({
          data: { deliveryId: 1, orderId: 3, position: 3 },
          select: expect.any(Object),
        });
      });
    });

    describe('addOrderToDeliveryAtomic', () => {
      it('adds order with auto-calculated position', async () => {
        const deliveryOrder = {
          deliveryId: 1,
          orderId: 3,
          position: 3,
          order: {
            id: 3,
            orderNumber: 'O003',
            status: 'new',
            valuePln: 10000,
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 2 } });
        mockPrisma.deliveryOrder.create.mockResolvedValue(deliveryOrder);

        const result = await repository.addOrderToDeliveryAtomic(1, 3);

        expect(result.position).toBe(3);
      });

      it('handles empty delivery (position 1)', async () => {
        const deliveryOrder = {
          deliveryId: 1,
          orderId: 1,
          position: 1,
          order: {
            id: 1,
            orderNumber: 'O001',
            status: 'new',
            valuePln: 10000,
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: null } });
        mockPrisma.deliveryOrder.create.mockResolvedValue(deliveryOrder);

        const result = await repository.addOrderToDeliveryAtomic(1, 1);

        expect(result.position).toBe(1);
      });
    });

    describe('removeOrderFromDelivery', () => {
      it('removes order from delivery', async () => {
        mockPrisma.deliveryOrder.delete.mockResolvedValue({
          deliveryId: 1,
          orderId: 2,
          position: 2,
        });

        await repository.removeOrderFromDelivery(1, 2);

        expect(mockPrisma.deliveryOrder.delete).toHaveBeenCalledWith({
          where: {
            deliveryId_orderId: {
              deliveryId: 1,
              orderId: 2,
            },
          },
        });
      });
    });

    describe('getMaxOrderPosition', () => {
      it('returns max position', async () => {
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 5 } });

        const result = await repository.getMaxOrderPosition(1);

        expect(result).toBe(5);
      });

      it('returns 0 for empty delivery', async () => {
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: null } });

        const result = await repository.getMaxOrderPosition(1);

        expect(result).toBe(0);
      });
    });

    describe('reorderDeliveryOrders', () => {
      it('reorders delivery orders in transaction', async () => {
        const orderIds = [3, 1, 2];

        mockPrisma.$transaction.mockResolvedValue([
          { deliveryId: 1, orderId: 3, position: 1 },
          { deliveryId: 1, orderId: 1, position: 2 },
          { deliveryId: 1, orderId: 2, position: 3 },
        ]);

        await repository.reorderDeliveryOrders(1, orderIds);

        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('throws on reorder failure', async () => {
        mockPrisma.$transaction.mockRejectedValue(new Error('Update failed'));

        await expect(repository.reorderDeliveryOrders(1, [1, 2, 3])).rejects.toThrow('Failed to reorder delivery orders');
      });
    });

    describe('moveOrderBetweenDeliveries', () => {
      it('moves order from source to target delivery', async () => {
        const movedOrder = {
          deliveryId: 2,
          orderId: 1,
          position: 1,
          order: {
            id: 1,
            orderNumber: 'O001',
            status: 'new',
            valuePln: 15000,
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.deliveryOrder.delete.mockResolvedValue({ deliveryId: 1, orderId: 1, position: 1 });
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
        mockPrisma.deliveryOrder.create.mockResolvedValue(movedOrder);

        const result = await repository.moveOrderBetweenDeliveries(1, 2, 1);

        expect(result.deliveryId).toBe(2);
        expect(result.position).toBe(1);
      });

      it('calculates correct position in target with existing orders', async () => {
        const movedOrder = {
          deliveryId: 2,
          orderId: 1,
          position: 4,
          order: {
            id: 1,
            orderNumber: 'O001',
            status: 'new',
            valuePln: 15000,
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.deliveryOrder.delete.mockResolvedValue({ deliveryId: 1, orderId: 1, position: 1 });
        mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 3 } });
        mockPrisma.deliveryOrder.create.mockResolvedValue(movedOrder);

        const result = await repository.moveOrderBetweenDeliveries(1, 2, 1);

        expect(result.position).toBe(4);
      });
    });
  });

  describe('Delivery items', () => {
    describe('addItem', () => {
      it('adds item to delivery', async () => {
        mockPrisma.deliveryItem.create.mockResolvedValue(mockDeliveryItem);

        const result = await repository.addItem(1, {
          itemType: 'Hardware',
          description: 'Door handles',
          quantity: 10,
        });

        expect(result).toEqual(mockDeliveryItem);
        expect(mockPrisma.deliveryItem.create).toHaveBeenCalledWith({
          data: {
            deliveryId: 1,
            itemType: 'Hardware',
            description: 'Door handles',
            quantity: 10,
          },
        });
      });
    });

    describe('removeItem', () => {
      it('removes item from delivery', async () => {
        mockPrisma.deliveryItem.delete.mockResolvedValue(mockDeliveryItem);

        await repository.removeItem(1);

        expect(mockPrisma.deliveryItem.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });
    });
  });

  describe('Statistics and aggregations', () => {
    describe('getDeliveriesWithRequirements', () => {
      it('returns deliveries with profile requirements', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([mockDeliveryWithOrders]);

        const result = await repository.getDeliveriesWithRequirements();

        expect(result).toHaveLength(1);
        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });

      it('filters by from date when provided', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([]);

        await repository.getDeliveriesWithRequirements(new Date('2024-02-01'));

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });
    });

    describe('getDeliveriesWithWindows', () => {
      it('returns deliveries with window stats', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([mockDeliveryWithOrders]);

        const result = await repository.getDeliveriesWithWindows(new Date('2024-02-01'));

        expect(result).toHaveLength(1);
      });

      it('supports end date range', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([]);

        await repository.getDeliveriesWithWindows(
          new Date('2024-02-01'),
          new Date('2024-02-28')
        );

        expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
      });
    });

    describe('getDeliveriesWithProfileStats', () => {
      it('returns deliveries with profile statistics', async () => {
        mockPrisma.delivery.findMany.mockResolvedValue([mockDeliveryWithOrders]);

        const result = await repository.getDeliveriesWithProfileStats(
          new Date('2024-02-01'),
          new Date('2024-02-28')
        );

        expect(result).toHaveLength(1);
      });
    });

    describe('getDeliveryForProtocol', () => {
      it('returns delivery data for protocol generation', async () => {
        const protocolDelivery = {
          id: 1,
          deliveryDate: new Date('2024-02-15'),
          deliveryOrders: [
            {
              orderId: 1,
              position: 1,
              order: {
                id: 1,
                orderNumber: 'O001',
                valuePln: 15000,
                windows: [{ id: 1, quantity: 5 }],
              },
            },
          ],
        };

        mockPrisma.delivery.findUnique.mockResolvedValue(protocolDelivery);

        const result = await repository.getDeliveryForProtocol(1);

        expect(result).toEqual(protocolDelivery);
        expect(result?.deliveryOrders[0].order).toHaveProperty('valuePln');
        expect(result?.deliveryOrders[0].order).toHaveProperty('windows');
      });

      it('returns null when delivery not found', async () => {
        mockPrisma.delivery.findUnique.mockResolvedValue(null);

        const result = await repository.getDeliveryForProtocol(999);

        expect(result).toBeNull();
      });
    });

    describe('getDeliveryOrders', () => {
      it('returns delivery with order IDs', async () => {
        const deliveryOrders = {
          id: 1,
          deliveryOrders: [{ orderId: 1 }, { orderId: 2 }, { orderId: 3 }],
        };

        mockPrisma.delivery.findUnique.mockResolvedValue(deliveryOrders);

        const result = await repository.getDeliveryOrders(1);

        expect(result?.deliveryOrders).toHaveLength(3);
      });
    });
  });

  describe('Batch operations', () => {
    describe('updateOrdersBatch', () => {
      it('updates multiple orders with production date and status', async () => {
        mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

        const result = await repository.updateOrdersBatch([1, 2, 3], {
          productionDate: new Date('2024-02-15'),
          status: 'completed',
        });

        expect(result.count).toBe(3);
        expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
          where: { id: { in: [1, 2, 3] } },
          data: {
            productionDate: expect.any(Date),
            status: 'completed',
          },
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('handles null values in delivery data', async () => {
      const deliveryWithNulls = {
        ...mockDelivery,
        deliveryNumber: null,
        notes: null,
      };

      mockPrisma.delivery.findUnique.mockResolvedValue(deliveryWithNulls);

      const result = await repository.findById(1);

      expect(result?.deliveryNumber).toBeNull();
      expect(result?.notes).toBeNull();
    });

    it('handles empty delivery orders array', async () => {
      const emptyDelivery = {
        ...mockDelivery,
        deliveryOrders: [],
        _count: { deliveryOrders: 0 },
      };

      mockPrisma.delivery.count.mockResolvedValue(1);
      mockPrisma.delivery.findMany.mockResolvedValue([emptyDelivery]);

      const result = await repository.findAll({});

      expect(result.data[0].deliveryOrders).toEqual([]);
    });

    it('handles empty filters object', async () => {
      mockPrisma.delivery.count.mockResolvedValue(1);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

      const result = await repository.findAll({});

      expect(result.data).toHaveLength(1);
    });

    it('handles pagination with large skip values', async () => {
      mockPrisma.delivery.count.mockResolvedValue(1000);
      mockPrisma.delivery.findMany.mockResolvedValue([]);

      const result = await repository.findAll({}, { skip: 900, take: 100 });

      expect(result.skip).toBe(900);
      expect(result.take).toBe(100);
      expect(result.total).toBe(1000);
    });

    it('handles concurrent order additions gracefully', async () => {
      // First call succeeds
      mockPrisma.deliveryOrder.create.mockResolvedValueOnce({
        deliveryId: 1,
        orderId: 1,
        position: 1,
        order: { id: 1, orderNumber: 'O001', status: 'new', valuePln: 10000 },
      });

      // Second call throws unique constraint violation
      mockPrisma.deliveryOrder.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        })
      );

      const result1 = await repository.addOrderToDelivery(1, 1, 1);
      expect(result1.orderId).toBe(1);

      await expect(repository.addOrderToDelivery(1, 1, 1)).rejects.toThrow();
    });

    it('handles leap year February correctly in calendar', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      // 2024 is a leap year
      await repository.getCalendarData(2024, 2);

      expect(mockPrisma.delivery.findMany).toHaveBeenCalled();
    });

    it('calculates Easter correctly for different years', async () => {
      const holidays2024 = await repository.getHolidays(2024);
      const holidays2025 = await repository.getHolidays(2025);

      const easter2024 = holidays2024.find((h) => h.name === 'Niedziela Wielkanocna');
      const easter2025 = holidays2025.find((h) => h.name === 'Niedziela Wielkanocna');

      expect(easter2024).toBeDefined();
      expect(easter2025).toBeDefined();
      // Easter dates should be different
      expect(easter2024?.date.getTime()).not.toBe(easter2025?.date.getTime());
    });
  });

  describe('Pagination', () => {
    it('applies default pagination', async () => {
      mockPrisma.delivery.count.mockResolvedValue(100);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

      const result = await repository.findAll({});

      expect(result.skip).toBe(0);
      expect(result.take).toBe(50);
    });

    it('applies custom pagination', async () => {
      mockPrisma.delivery.count.mockResolvedValue(100);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

      const result = await repository.findAll({}, { skip: 20, take: 10 });

      expect(result.skip).toBe(20);
      expect(result.take).toBe(10);
      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('returns correct total count', async () => {
      mockPrisma.delivery.count.mockResolvedValue(250);
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);

      const result = await repository.findAll({});

      expect(result.total).toBe(250);
    });
  });

  describe('Transaction handling', () => {
    it('moveOrderBetweenDeliveries uses transaction correctly', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
      mockPrisma.deliveryOrder.delete.mockResolvedValue({ deliveryId: 1, orderId: 1, position: 1 });
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue({
        deliveryId: 2,
        orderId: 1,
        position: 1,
        order: { id: 1, orderNumber: 'O001', status: 'new', valuePln: 10000 },
      });

      await repository.moveOrderBetweenDeliveries(1, 2, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('moveOrderBetweenDeliveries rolls back on error', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(repository.moveOrderBetweenDeliveries(1, 2, 1)).rejects.toThrow('Transaction failed');
    });

    it('addOrderToDeliveryAtomic uses transaction correctly', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue({
        deliveryId: 1,
        orderId: 1,
        position: 1,
        order: { id: 1, orderNumber: 'O001', status: 'new', valuePln: 10000 },
      });

      await repository.addOrderToDeliveryAtomic(1, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
