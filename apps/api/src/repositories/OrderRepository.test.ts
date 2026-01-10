/**
 * OrderRepository Unit Tests
 *
 * Comprehensive tests for OrderRepository covering:
 * - CRUD operations
 * - Complex queries with filters and pagination
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrderRepository } from './OrderRepository.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';
import { Prisma } from '@prisma/client';

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // Test fixtures
  const mockOrder = {
    id: 1,
    orderNumber: 'O001',
    status: 'new',
    client: 'Test Client',
    project: 'Test Project',
    system: 'AWS 75',
    deadline: new Date('2024-02-15'),
    pvcDeliveryDate: new Date('2024-02-10'),
    glassDeliveryDate: null,
    valuePln: 15000,
    valueEur: 3500,
    totalWindows: 10,
    totalSashes: 20,
    totalGlasses: 20,
    orderedGlassCount: 10,
    deliveredGlassCount: 5,
    glassOrderStatus: 'partial',
    invoiceNumber: 'INV-001',
    deliveryDate: null,
    productionDate: null,
    notes: 'Test notes',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    archivedAt: null,
    windows: [],
    requirements: [],
    deliveryOrders: [],
    orderNotes: [],
    schucoLinks: [],
    glassOrderItems: [],
    _count: { windows: 0, requirements: 0 },
  };

  const mockOrderWithRelations = {
    ...mockOrder,
    requirements: [
      {
        id: 1,
        profileId: 1,
        colorId: 1,
        beamsCount: 5,
        meters: 30,
        restMm: 500,
        profile: { id: 1, number: 'P001', name: 'Profile 1', description: null },
        color: { id: 1, code: 'RAL9016', name: 'White', hexColor: '#FFFFFF' },
      },
    ],
    windows: [
      {
        id: 1,
        widthMm: 1000,
        heightMm: 1200,
        profileType: 'standard',
        quantity: 2,
        reference: 'W1',
      },
    ],
    deliveryOrders: [
      {
        id: 1,
        deliveryId: 1,
        delivery: {
          id: 1,
          deliveryDate: new Date('2024-02-15'),
          deliveryNumber: 'D001',
          status: 'pending',
        },
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new OrderRepository(mockPrisma);
  });

  describe('CRUD operations', () => {
    describe('findById', () => {
      it('returns order when exists', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(mockOrderWithRelations);

        const result = await repository.findById(1);

        expect(result).toEqual(mockOrderWithRelations);
        expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
          select: expect.objectContaining({
            id: true,
            orderNumber: true,
            status: true,
          }),
        });
      });

      it('returns null when not exists', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null);

        const result = await repository.findById(999);

        expect(result).toBeNull();
      });

      it('includes relations when requested', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(mockOrderWithRelations);

        const result = await repository.findById(1);

        expect(result).toHaveProperty('requirements');
        expect(result).toHaveProperty('windows');
        expect(result).toHaveProperty('deliveryOrders');
        expect(result).toHaveProperty('orderNotes');
        expect(result).toHaveProperty('schucoLinks');
      });
    });

    describe('findByOrderNumber', () => {
      it('returns order when found', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(mockOrderWithRelations);

        const result = await repository.findByOrderNumber('O001');

        expect(result).toEqual(mockOrderWithRelations);
        expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
          where: { orderNumber: 'O001' },
          select: expect.any(Object),
        });
      });

      it('returns null when not found', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null);

        const result = await repository.findByOrderNumber('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('creates order with valid data', async () => {
        const createData = {
          orderNumber: 'O002',
          status: 'new',
          valuePln: 10000,
          valueEur: 2500,
        };
        const createdOrder = { id: 2, ...createData, createdAt: new Date(), updatedAt: new Date() };

        mockPrisma.order.create.mockResolvedValue(createdOrder);

        const result = await repository.create(createData);

        expect(result).toEqual(createdOrder);
        expect(mockPrisma.order.create).toHaveBeenCalledWith({ data: createData });
      });

      it('throws on duplicate order number', async () => {
        const createData = { orderNumber: 'O001' };

        mockPrisma.order.create.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`orderNumber`)', {
            code: 'P2002',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.create(createData)).rejects.toThrow();
      });
    });

    describe('update', () => {
      it('updates order successfully', async () => {
        const updateData = { status: 'in_progress', notes: 'Updated notes' };
        const updatedOrder = { ...mockOrder, ...updateData };

        mockPrisma.order.update.mockResolvedValue(updatedOrder);

        const result = await repository.update(1, updateData);

        expect(result.status).toBe('in_progress');
        expect(result.notes).toBe('Updated notes');
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: updateData,
        });
      });

      it('throws when order not found', async () => {
        mockPrisma.order.update.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.update(999, { status: 'completed' })).rejects.toThrow();
      });
    });

    describe('delete', () => {
      it('deletes order successfully', async () => {
        mockPrisma.order.delete.mockResolvedValue(mockOrder);

        await repository.delete(1);

        expect(mockPrisma.order.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });

      it('throws when order not found', async () => {
        mockPrisma.order.delete.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: '5.0.0',
          })
        );

        await expect(repository.delete(999)).rejects.toThrow();
      });
    });

    describe('archive', () => {
      it('archives order by setting archivedAt', async () => {
        const archivedOrder = { ...mockOrder, archivedAt: new Date() };
        mockPrisma.order.update.mockResolvedValue(archivedOrder);

        const result = await repository.archive(1);

        expect(result.archivedAt).not.toBeNull();
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { archivedAt: expect.any(Date) },
        });
      });
    });

    describe('unarchive', () => {
      it('unarchives order by setting archivedAt to null', async () => {
        const unarchivedOrder = { ...mockOrder, archivedAt: null };
        mockPrisma.order.update.mockResolvedValue(unarchivedOrder);

        const result = await repository.unarchive(1);

        expect(result.archivedAt).toBeNull();
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { archivedAt: null },
        });
      });
    });
  });

  describe('Complex queries', () => {
    describe('findAll - filters by multiple criteria', () => {
      it('filters by status', async () => {
        const mockOrders = [{ ...mockOrder, status: 'in_progress' }];
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue(mockOrders);

        const result = await repository.findAll({ status: 'in_progress' });

        expect(result.data[0].status).toBe('in_progress');
        expect(mockPrisma.order.findMany).toHaveBeenCalled();
      });

      it('filters by archived=true', async () => {
        const archivedOrder = { ...mockOrder, archivedAt: new Date() };
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue([archivedOrder]);

        await repository.findAll({ archived: 'true' });

        expect(mockPrisma.order.findMany).toHaveBeenCalled();
      });

      it('filters by archived=false', async () => {
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        await repository.findAll({ archived: 'false' });

        expect(mockPrisma.order.findMany).toHaveBeenCalled();
      });

      it('filters by colorId', async () => {
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        await repository.findAll({ colorId: '1' });

        expect(mockPrisma.order.findMany).toHaveBeenCalled();
      });

      it('combines multiple filters', async () => {
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        await repository.findAll({
          status: 'new',
          archived: 'false',
          colorId: '1',
        });

        expect(mockPrisma.order.findMany).toHaveBeenCalled();
        expect(mockPrisma.order.count).toHaveBeenCalled();
      });
    });

    describe('findAll - paginates correctly', () => {
      it('applies default pagination', async () => {
        mockPrisma.order.count.mockResolvedValue(100);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        const result = await repository.findAll({});

        expect(result.skip).toBe(0);
        expect(result.take).toBe(50);
      });

      it('applies custom pagination', async () => {
        mockPrisma.order.count.mockResolvedValue(100);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        const result = await repository.findAll({}, { skip: 20, take: 10 });

        expect(result.skip).toBe(20);
        expect(result.take).toBe(10);
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 20,
            take: 10,
          })
        );
      });

      it('returns correct total count', async () => {
        mockPrisma.order.count.mockResolvedValue(150);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        const result = await repository.findAll({});

        expect(result.total).toBe(150);
      });
    });

    describe('findAll - sorts by multiple fields', () => {
      it('sorts by createdAt descending by default', async () => {
        mockPrisma.order.count.mockResolvedValue(1);
        mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

        await repository.findAll({});

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        );
      });
    });

    describe('getOrderDeliveries', () => {
      it('returns deliveries for order', async () => {
        const deliveryOrders = [
          {
            deliveryId: 1,
            orderId: 1,
            delivery: {
              id: 1,
              status: 'pending',
              deliveryDate: new Date('2024-02-15'),
              deliveryNumber: 'D001',
            },
          },
        ];

        mockPrisma.deliveryOrder.findMany.mockResolvedValue(deliveryOrders);

        const result = await repository.getOrderDeliveries(1);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('id', 1);
        expect(result[0]).toHaveProperty('deliveryNumber', 'D001');
      });

      it('returns empty array when no deliveries', async () => {
        mockPrisma.deliveryOrder.findMany.mockResolvedValue([]);

        const result = await repository.getOrderDeliveries(999);

        expect(result).toEqual([]);
      });
    });

    describe('bulkUpdateStatus', () => {
      it('updates multiple orders status', async () => {
        const orderIds = [1, 2, 3];
        const updatedOrders = orderIds.map((id) => ({
          id,
          orderNumber: `O00${id}`,
          status: 'completed',
          productionDate: null,
          updatedAt: new Date(),
        }));

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });
        mockPrisma.order.findMany.mockResolvedValue(updatedOrders);

        const result = await repository.bulkUpdateStatus(orderIds, 'completed');

        expect(result).toHaveLength(3);
        expect(result.every((o: any) => o.status === 'completed')).toBe(true);
      });

      it('sets productionDate when status is completed', async () => {
        const orderIds = [1];
        const productionDate = '2024-02-15';
        const updatedOrder = {
          id: 1,
          orderNumber: 'O001',
          status: 'completed',
          productionDate: new Date(productionDate),
          updatedAt: new Date(),
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
        mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.order.findMany.mockResolvedValue([updatedOrder]);

        const result = await repository.bulkUpdateStatus(orderIds, 'completed', productionDate);

        expect(result[0].productionDate).toEqual(new Date(productionDate));
      });
    });

    describe('findForProduction', () => {
      it('returns orders matching criteria', async () => {
        const productionOrders = [
          {
            id: 1,
            orderNumber: 'O001',
            status: 'new',
            client: 'Client 1',
            project: 'Project 1',
            deadline: new Date('2024-02-15'),
            valuePln: 15000,
            valueEur: 3500,
            totalWindows: 10,
            createdAt: new Date(),
          },
        ];

        mockPrisma.order.findMany.mockResolvedValue(productionOrders);

        const result = await repository.findForProduction({ status: 'new' });

        expect(result).toEqual(productionOrders);
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'new' },
            orderBy: { deadline: 'asc' },
          })
        );
      });
    });

    describe('findPrivateOrders', () => {
      it('returns private orders (non-AKROBUD clients)', async () => {
        const privateOrders = [mockOrder];
        mockPrisma.order.findMany.mockResolvedValue(privateOrders);

        const result = await repository.findPrivateOrders({ archivedAt: null });

        expect(result).toEqual(privateOrders);
        // Sprawdza że query filtruje po kliencie różnym od AKROBUD
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              archivedAt: null,
              client: expect.objectContaining({
                notIn: expect.arrayContaining(['AKROBUD SOKOŁOWSKI SPÓŁKA KOMANDYTOWA']),
              }),
            }),
          })
        );
      });
    });

    describe('findUpcomingDeliveries', () => {
      it('returns upcoming deliveries with orders', async () => {
        const upcomingDeliveries = [
          {
            id: 1,
            deliveryDate: new Date('2024-02-15'),
            deliveryNumber: 'D001',
            status: 'pending',
            notes: null,
            deliveryOrders: [
              {
                id: 1,
                position: 1,
                order: {
                  id: 1,
                  orderNumber: 'O001',
                  status: 'new',
                  client: 'Client 1',
                  project: 'Project 1',
                  totalWindows: 10,
                },
              },
            ],
          },
        ];

        mockPrisma.delivery.findMany.mockResolvedValue(upcomingDeliveries);

        const result = await repository.findUpcomingDeliveries({
          deliveryDate: { gte: new Date() },
          status: { not: 'delivered' },
          limit: 5,
        });

        expect(result).toEqual(upcomingDeliveries);
        expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 5,
            orderBy: { deliveryDate: 'asc' },
          })
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('handles null values correctly in findAll', async () => {
      const orderWithNulls = {
        ...mockOrder,
        client: null,
        project: null,
        notes: null,
        deadline: null,
        glassDeliveryDate: null,
      };

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([orderWithNulls]);

      const result = await repository.findAll({});

      expect(result.data[0].client).toBeNull();
      expect(result.data[0].project).toBeNull();
      expect(result.data[0].notes).toBeNull();
    });

    it('handles empty arrays in response', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await repository.findAll({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('handles empty filters object', async () => {
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await repository.findAll({});

      expect(result.data).toHaveLength(1);
    });

    it('handles glassDeliveryDate from glassOrderItems when order glassDeliveryDate is null', async () => {
      const orderWithGlassOrderItems = {
        ...mockOrder,
        glassDeliveryDate: null,
        glassOrderItems: [
          {
            glassOrder: {
              expectedDeliveryDate: new Date('2024-02-20'),
              actualDeliveryDate: null,
            },
          },
        ],
      };

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([orderWithGlassOrderItems]);

      const result = await repository.findAll({});

      expect(result.data[0].glassDeliveryDate).toEqual(new Date('2024-02-20'));
    });

    it('prefers order glassDeliveryDate over glassOrderItems', async () => {
      const directGlassDate = new Date('2024-02-15');
      const orderWithBothDates = {
        ...mockOrder,
        glassDeliveryDate: directGlassDate,
        glassOrderItems: [
          {
            glassOrder: {
              expectedDeliveryDate: new Date('2024-02-20'),
              actualDeliveryDate: null,
            },
          },
        ],
      };

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([orderWithBothDates]);

      const result = await repository.findAll({});

      expect(result.data[0].glassDeliveryDate).toEqual(directGlassDate);
    });

    it('handles concurrent updates gracefully', async () => {
      // First call succeeds
      mockPrisma.order.update
        .mockResolvedValueOnce({ ...mockOrder, status: 'in_progress' })
        // Second call throws conflict
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Concurrent update detected', {
            code: 'P2034',
            clientVersion: '5.0.0',
          })
        );

      const result1 = await repository.update(1, { status: 'in_progress' });
      expect(result1.status).toBe('in_progress');

      await expect(repository.update(1, { status: 'completed' })).rejects.toThrow();
    });

    it('handles large pagination values', async () => {
      mockPrisma.order.count.mockResolvedValue(1000);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await repository.findAll({}, { skip: 900, take: 100 });

      expect(result.skip).toBe(900);
      expect(result.take).toBe(100);
    });

    it('handles special characters in filter values', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      // This should not throw
      await expect(
        repository.findAll({ status: "test'injection" })
      ).resolves.toBeDefined();
    });
  });

  describe('Transaction handling', () => {
    it('bulkUpdateStatus uses transaction correctly', async () => {
      const orderIds = [1, 2];

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 1, orderNumber: 'O001', status: 'completed', productionDate: null, updatedAt: new Date() },
        { id: 2, orderNumber: 'O002', status: 'completed', productionDate: null, updatedAt: new Date() },
      ]);

      await repository.bulkUpdateStatus(orderIds, 'completed');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('bulkUpdateStatus rolls back on error', async () => {
      const orderIds = [1, 2];

      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(repository.bulkUpdateStatus(orderIds, 'completed')).rejects.toThrow('Transaction failed');
    });
  });
});
