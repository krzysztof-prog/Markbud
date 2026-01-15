/**
 * ImportRepository Unit Tests
 * Testy dla warstwy dostępu do danych importów
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportRepository } from './ImportRepository.js';
import { createMockPrisma, setupTransactionMock } from '../tests/mocks/prisma.mock.js';

describe('ImportRepository', () => {
  let repository: ImportRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);
    repository = new ImportRepository(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all imports when no filters', async () => {
      const mockImports = [
        { id: 1, filename: 'test1.csv', status: 'pending' },
        { id: 2, filename: 'test2.csv', status: 'completed' },
      ];
      (mockPrisma.fileImport as any).findMany.mockResolvedValue(mockImports);

      const result = await repository.findAll();

      expect(result).toEqual(mockImports);
      expect((mockPrisma.fileImport as any).findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      const mockImports = [{ id: 1, filename: 'test1.csv', status: 'pending' }];
      (mockPrisma.fileImport as any).findMany.mockResolvedValue(mockImports);

      const result = await repository.findAll({ status: 'pending' });

      expect(result).toEqual(mockImports);
      expect((mockPrisma.fileImport as any).findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return import when found', async () => {
      const mockImport = { id: 1, filename: 'test.csv', status: 'pending' };
      (mockPrisma.fileImport as any).findUnique.mockResolvedValue(mockImport);

      const result = await repository.findById(1);

      expect(result).toEqual(mockImport);
      expect((mockPrisma.fileImport as any).findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when not found', async () => {
      (mockPrisma.fileImport as any).findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findPending', () => {
    it('should return only pending imports', async () => {
      const mockImports = [{ id: 1, filename: 'test.csv', status: 'pending' }];
      (mockPrisma.fileImport as any).findMany.mockResolvedValue(mockImports);

      const result = await repository.findPending();

      expect(result).toEqual(mockImports);
      expect((mockPrisma.fileImport as any).findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create import with default status', async () => {
      const createData = {
        filename: 'test.csv',
        filepath: '/uploads/test.csv',
        fileType: 'uzyte_bele',
      };
      const mockCreated = { id: 1, ...createData, status: 'pending' };
      (mockPrisma.fileImport as any).create.mockResolvedValue(mockCreated);

      const result = await repository.create(createData);

      expect(result).toEqual(mockCreated);
      expect((mockPrisma.fileImport as any).create).toHaveBeenCalledWith({
        data: {
          filename: 'test.csv',
          filepath: '/uploads/test.csv',
          fileType: 'uzyte_bele',
          status: 'pending',
          metadata: undefined,
        },
      });
    });

    it('should create import with custom status', async () => {
      const createData = {
        filename: 'test.csv',
        filepath: '/uploads/test.csv',
        fileType: 'uzyte_bele',
        status: 'processing',
        metadata: '{"orderId":123}',
      };
      const mockCreated = { id: 1, ...createData };
      (mockPrisma.fileImport as any).create.mockResolvedValue(mockCreated);

      const result = await repository.create(createData);

      expect(result).toEqual(mockCreated);
      expect((mockPrisma.fileImport as any).create).toHaveBeenCalledWith({
        data: {
          filename: 'test.csv',
          filepath: '/uploads/test.csv',
          fileType: 'uzyte_bele',
          status: 'processing',
          metadata: '{"orderId":123}',
        },
      });
    });
  });

  describe('update', () => {
    it('should update import status', async () => {
      const mockUpdated = { id: 1, filename: 'test.csv', status: 'completed' };
      (mockPrisma.fileImport as any).update.mockResolvedValue(mockUpdated);

      const result = await repository.update(1, { status: 'completed' });

      expect(result).toEqual(mockUpdated);
      expect((mockPrisma.fileImport as any).update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'completed' },
      });
    });

    it('should update multiple fields', async () => {
      const updateData = {
        status: 'error',
        errorMessage: 'Import failed',
        processedAt: new Date('2026-01-15'),
      };
      const mockUpdated = { id: 1, filename: 'test.csv', ...updateData };
      (mockPrisma.fileImport as any).update.mockResolvedValue(mockUpdated);

      const result = await repository.update(1, updateData);

      expect(result).toEqual(mockUpdated);
      expect((mockPrisma.fileImport as any).update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete import by id', async () => {
      (mockPrisma.fileImport as any).delete.mockResolvedValue({});

      await repository.delete(1);

      expect((mockPrisma.fileImport as any).delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findDuplicatePdfImport', () => {
    it('should find duplicate PDF import for order', async () => {
      const mockDuplicate = {
        id: 5,
        fileType: 'ceny_pdf',
        status: 'completed',
        metadata: '{"orderId":123}',
      };
      (mockPrisma.fileImport as any).findFirst.mockResolvedValue(mockDuplicate);

      const result = await repository.findDuplicatePdfImport(123, 10);

      expect(result).toEqual(mockDuplicate);
      expect((mockPrisma.fileImport as any).findFirst).toHaveBeenCalledWith({
        where: {
          fileType: 'ceny_pdf',
          status: 'completed',
          id: { not: 10 },
          metadata: { contains: '"orderId":123' },
        },
      });
    });

    it('should return null when no duplicate found', async () => {
      (mockPrisma.fileImport as any).findFirst.mockResolvedValue(null);

      const result = await repository.findDuplicatePdfImport(123, 10);

      expect(result).toBeNull();
    });
  });

  describe('Order operations', () => {
    it('should find order by number', async () => {
      const mockOrder = { id: 1, orderNumber: '12345' };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await repository.findOrderByNumber('12345');

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { orderNumber: '12345' },
      });
    });

    it('should find order by id', async () => {
      const mockOrder = { id: 1, orderNumber: '12345' };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await repository.findOrderById(1);

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, orderNumber: true },
      });
    });

    it('should delete order by id', async () => {
      mockPrisma.order.delete.mockResolvedValue({});

      await repository.deleteOrder(1);

      expect(mockPrisma.order.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('Delivery operations', () => {
    it('should find delivery by date and number', async () => {
      const mockDelivery = { id: 1, deliveryDate: new Date('2026-01-15'), deliveryNumber: 'D001' };
      mockPrisma.delivery.findFirst.mockResolvedValue(mockDelivery);

      const result = await repository.findDeliveryByDateAndNumber(
        new Date('2026-01-15'),
        'D001'
      );

      expect(result).toEqual(mockDelivery);
      expect(mockPrisma.delivery.findFirst).toHaveBeenCalled();
    });

    it('should create new delivery', async () => {
      const mockDelivery = {
        id: 1,
        deliveryDate: new Date('2026-01-15'),
        deliveryNumber: 'D001',
        status: 'planned',
      };
      mockPrisma.delivery.create.mockResolvedValue(mockDelivery);

      const result = await repository.createDelivery(new Date('2026-01-15'), 'D001');

      expect(result).toEqual(mockDelivery);
      expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
        data: {
          deliveryDate: expect.any(Date),
          deliveryNumber: 'D001',
          status: 'planned',
        },
      });
    });

    it('should find delivery by id', async () => {
      const mockDelivery = { id: 1, deliveryNumber: 'D001' };
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      const result = await repository.findDeliveryById(1);

      expect(result).toEqual(mockDelivery);
      expect(mockPrisma.delivery.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('DeliveryOrder operations', () => {
    it('should find existing delivery order', async () => {
      const mockDeliveryOrder = { deliveryId: 1, orderId: 10, position: 1 };
      mockPrisma.deliveryOrder.findUnique.mockResolvedValue(mockDeliveryOrder);

      const result = await repository.findExistingDeliveryOrder(1, 10);

      expect(result).toEqual(mockDeliveryOrder);
      expect(mockPrisma.deliveryOrder.findUnique).toHaveBeenCalledWith({
        where: {
          deliveryId_orderId: {
            deliveryId: 1,
            orderId: 10,
          },
        },
      });
    });

    it('should get max delivery order position', async () => {
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 5 } });

      const result = await repository.getMaxDeliveryOrderPosition(1);

      expect(result).toBe(5);
      expect(mockPrisma.deliveryOrder.aggregate).toHaveBeenCalledWith({
        where: { deliveryId: 1 },
        _max: { position: true },
      });
    });

    it('should return 0 when no delivery orders exist', async () => {
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: null } });

      const result = await repository.getMaxDeliveryOrderPosition(1);

      expect(result).toBe(0);
    });

    it('should add order to delivery', async () => {
      const mockDeliveryOrder = { deliveryId: 1, orderId: 10, position: 3 };
      mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);

      const result = await repository.addOrderToDelivery(1, 10, 3);

      expect(result).toEqual(mockDeliveryOrder);
      expect(mockPrisma.deliveryOrder.create).toHaveBeenCalledWith({
        data: {
          deliveryId: 1,
          orderId: 10,
          position: 3,
        },
      });
    });
  });

  describe('addOrderToDeliveryIfNotExists', () => {
    it('should add order to delivery if not already linked', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.deliveryOrder.findUnique.mockResolvedValue(null);
      mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 2 } });
      mockPrisma.deliveryOrder.create.mockResolvedValue({ deliveryId: 1, orderId: 10, position: 3 });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await repository.addOrderToDeliveryIfNotExists(1, 10);

      expect(mockPrisma.deliveryOrder.create).toHaveBeenCalledWith({
        data: {
          deliveryId: 1,
          orderId: 10,
          position: 3,
        },
      });
      expect(consoleSpy).toHaveBeenCalledWith('   Dodano zlecenie do dostawy ID: 1');

      consoleSpy.mockRestore();
    });

    it('should not add order if already linked', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.deliveryOrder.findUnique.mockResolvedValue({ deliveryId: 1, orderId: 10 });

      await repository.addOrderToDeliveryIfNotExists(1, 10);

      expect(mockPrisma.deliveryOrder.create).not.toHaveBeenCalled();
    });

    it('should not add order if delivery does not exist', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await repository.addOrderToDeliveryIfNotExists(999, 10);

      expect(mockPrisma.deliveryOrder.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.deliveryOrder.create).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Settings', () => {
    it('should get setting value', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ key: 'imports_base_path', value: '/imports' });

      const result = await repository.getSetting('imports_base_path');

      expect(result).toBe('/imports');
      expect(mockPrisma.setting.findUnique).toHaveBeenCalledWith({
        where: { key: 'imports_base_path' },
      });
    });

    it('should return null when setting not found', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      const result = await repository.getSetting('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findOrderInOtherDelivery', () => {
    it('should find order in other delivery', async () => {
      const mockResult = {
        deliveryId: 2,
        orderId: 10,
        delivery: { id: 2, deliveryDate: new Date(), deliveryNumber: 'D002' },
      };
      mockPrisma.deliveryOrder.findFirst.mockResolvedValue(mockResult);

      const result = await repository.findOrderInOtherDelivery(10, 1);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.deliveryOrder.findFirst).toHaveBeenCalledWith({
        where: {
          orderId: 10,
          deliveryId: { not: 1 },
        },
        include: {
          delivery: {
            select: {
              id: true,
              deliveryDate: true,
              deliveryNumber: true,
            },
          },
        },
      });
    });

    it('should search without excludeDeliveryId', async () => {
      mockPrisma.deliveryOrder.findFirst.mockResolvedValue(null);

      await repository.findOrderInOtherDelivery(10);

      expect(mockPrisma.deliveryOrder.findFirst).toHaveBeenCalledWith({
        where: { orderId: 10 },
        include: expect.anything(),
      });
    });
  });

  describe('findOrderByOrderNumber', () => {
    it('should find order with deliveries', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '12345',
        deliveryOrders: [
          { delivery: { id: 1, deliveryDate: new Date(), deliveryNumber: 'D001' } },
        ],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await repository.findOrderByOrderNumber('12345');

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { orderNumber: '12345' },
        select: {
          id: true,
          orderNumber: true,
          deliveryOrders: {
            include: {
              delivery: {
                select: {
                  id: true,
                  deliveryDate: true,
                  deliveryNumber: true,
                },
              },
            },
          },
        },
      });
    });
  });

  describe('executeTransaction', () => {
    it('should execute function within transaction', async () => {
      const mockResult = { success: true };
      const transactionFn = vi.fn().mockResolvedValue(mockResult);

      const result = await repository.executeTransaction(transactionFn);

      expect(result).toEqual(mockResult);
      expect(transactionFn).toHaveBeenCalledWith(mockPrisma);
    });
  });
});
