import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SchucoOrderMatcher } from './schucoOrderMatcher.js';

/**
 * Integration tests for SchucoOrderMatcher class
 * These tests use mocked Prisma client to test the full service logic
 */

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SchucoOrderMatcher - Integration Tests', () => {
  let matcher: SchucoOrderMatcher;
  let prismaMock: any;

  beforeEach(() => {
    // Create mock Prisma client
    prismaMock = {
      schucoDelivery: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
      },
      orderSchucoLink: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    matcher = new SchucoOrderMatcher(prismaMock as unknown as PrismaClient);
  });

  describe('processSchucoDelivery', () => {
    it('should return 0 when delivery not found', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue(null);

      const result = await matcher.processSchucoDelivery(999);

      expect(result).toBe(0);
      expect(prismaMock.schucoDelivery.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should mark delivery as warehouse item when no order numbers found', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: 'PALETA-2026-001',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: true,
        extractedOrderNums: null,
      });

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(0);
      expect(prismaMock.schucoDelivery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isWarehouseItem: true,
          extractedOrderNums: null,
        },
      });
    });

    it('should extract order numbers and create links', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: '123/2026/54255/54365',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255', '54365']),
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 100, orderNumber: '54255' },
        { id: 101, orderNumber: '54365' },
      ]);

      // Mock batch operations
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);
      prismaMock.orderSchucoLink.createMany.mockResolvedValue({ count: 2 });

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(2);
      expect(prismaMock.schucoDelivery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isWarehouseItem: false,
          extractedOrderNums: JSON.stringify(['54255', '54365']),
        },
      });
      expect(prismaMock.order.findMany).toHaveBeenCalledWith({
        where: {
          orderNumber: {
            in: ['54255', '54365'],
          },
        },
        select: { id: true, orderNumber: true },
      });
      expect(prismaMock.orderSchucoLink.createMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.orderSchucoLink.createMany).toHaveBeenCalledWith({
        data: [
          { orderId: 100, schucoDeliveryId: 1, linkedBy: 'auto' },
          { orderId: 101, schucoDeliveryId: 1, linkedBy: 'auto' },
        ],
      });
    });

    it('should return 0 when no matching orders found', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: '123/2026/54255',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255']),
      });

      prismaMock.order.findMany.mockResolvedValue([]);

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(0);
    });

    it('should handle errors during link creation', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: '123/2026/54255',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255']),
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 100, orderNumber: '54255' },
      ]);

      // Mock batch operations - error during createMany
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);
      prismaMock.orderSchucoLink.createMany.mockRejectedValue(new Error('DB error'));

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(0);
    });
  });

  describe('processAllDeliveries', () => {
    it('should process all deliveries and return statistics', async () => {
      // processAllDeliveries first calls findMany with select: { id, orderNumber }
      // The orderNumber is used to extract order numbers and determine warehouse items
      prismaMock.schucoDelivery.findMany.mockResolvedValue([
        { id: 1, orderNumber: '123/2026/54255' }, // Has 5-digit order number -> not warehouse
        { id: 2, orderNumber: 'PALETA-2026-001' }, // No 5-digit number -> warehouse item
        { id: 3, orderNumber: '456/2026/54365' }, // Has 5-digit order number -> not warehouse
      ]);

      // For non-warehouse items, processSchucoDelivery is called which does findUnique
      prismaMock.schucoDelivery.findUnique
        .mockResolvedValueOnce({
          id: 1,
          orderNumber: '123/2026/54255',
          shippingStatus: 'Otwarte',
        })
        .mockResolvedValueOnce({
          id: 3,
          orderNumber: '456/2026/54365',
          shippingStatus: 'Wysłane',
        });

      prismaMock.schucoDelivery.update.mockResolvedValue({});

      // order.findMany is called for each non-warehouse delivery to find matching orders
      prismaMock.order.findMany
        .mockResolvedValueOnce([{ id: 100, orderNumber: '54255' }]) // Match for delivery 1
        .mockResolvedValueOnce([{ id: 101, orderNumber: '54365' }]); // Match for delivery 3

      // Mock batch operations - no existing links, so new ones will be created
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);
      prismaMock.orderSchucoLink.createMany.mockResolvedValue({ count: 1 });

      const result = await matcher.processAllDeliveries();

      expect(result.total).toBe(3);
      expect(result.processed).toBe(3);
      expect(result.linksCreated).toBe(2); // Two deliveries with matching orders
      expect(result.warehouseItems).toBe(1); // One warehouse item (PALETA-2026-001)
    });

    it('should handle empty database', async () => {
      prismaMock.schucoDelivery.findMany.mockResolvedValue([]);

      const result = await matcher.processAllDeliveries();

      expect(result).toEqual({
        total: 0,
        processed: 0,
        linksCreated: 0,
        warehouseItems: 0,
      });
    });
  });

  describe('getSchucoDeliveriesForOrder', () => {
    it('should return linked deliveries for an order', async () => {
      const mockLinks = [
        {
          id: 1,
          orderId: 100,
          schucoDeliveryId: 1,
          linkedAt: new Date('2026-01-15'),
          linkedBy: 'auto',
          schucoDelivery: {
            id: 1,
            orderNumber: '123/2026/54255',
            shippingStatus: 'Otwarte',
            deliveryWeek: 'KW 03/2026',
          },
        },
      ];

      prismaMock.orderSchucoLink.findMany.mockResolvedValue(mockLinks);

      const result = await matcher.getSchucoDeliveriesForOrder(100);

      expect(result).toHaveLength(1);
      expect(result[0].orderNumber).toBe('123/2026/54255');
      expect(result[0].linkedBy).toBe('auto');
      expect(prismaMock.orderSchucoLink.findMany).toHaveBeenCalledWith({
        where: { orderId: 100 },
        include: { schucoDelivery: true },
        orderBy: { linkedAt: 'desc' },
      });
    });

    it('should return empty array when no links found', async () => {
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);

      const result = await matcher.getSchucoDeliveriesForOrder(999);

      expect(result).toEqual([]);
    });
  });

  describe('getSchucoStatusForOrder', () => {
    it('should return aggregated status and earliest delivery date', async () => {
      const mockDeliveries = [
        {
          id: 1,
          orderNumber: '123/2026/54255',
          shippingStatus: 'Dostarczone',
          deliveryWeek: 'KW 10/2026',
          linkedAt: new Date(),
          linkedBy: 'auto',
        },
        {
          id: 2,
          orderNumber: '456/2026/54365',
          shippingStatus: 'Otwarte',
          deliveryWeek: 'KW 05/2026',
          linkedAt: new Date(),
          linkedBy: 'auto',
        },
      ];

      vi.spyOn(matcher, 'getSchucoDeliveriesForOrder').mockResolvedValue(mockDeliveries as any);

      const result = await matcher.getSchucoStatusForOrder(100);

      expect(result.status).toBe('Otwarte'); // Worst status
      expect(result.deliveryDate).not.toBeNull();
      // Week 5 should be earlier than week 10
      expect(result.deliveryDate?.getMonth()).toBeLessThanOrEqual(2); // Early in year
    });

    it('should return null when no deliveries linked', async () => {
      vi.spyOn(matcher, 'getSchucoDeliveriesForOrder').mockResolvedValue([]);

      const result = await matcher.getSchucoStatusForOrder(100);

      expect(result.status).toBeNull();
      expect(result.deliveryDate).toBeNull();
    });

    it('should handle deliveries without delivery week', async () => {
      const mockDeliveries = [
        {
          id: 1,
          orderNumber: '123/2026/54255',
          shippingStatus: 'Otwarte',
          deliveryWeek: null,
          linkedAt: new Date(),
          linkedBy: 'auto',
        },
      ];

      vi.spyOn(matcher, 'getSchucoDeliveriesForOrder').mockResolvedValue(mockDeliveries as any);

      const result = await matcher.getSchucoStatusForOrder(100);

      expect(result.status).toBe('Otwarte');
      expect(result.deliveryDate).toBeNull();
    });
  });

  describe('createManualLink', () => {
    it('should create manual link between order and delivery', async () => {
      const mockLink = {
        id: 1,
        orderId: 100,
        schucoDeliveryId: 50,
        linkedBy: 'manual',
        linkedAt: new Date(),
        schucoDelivery: {
          id: 50,
          orderNumber: '123/2026/54255',
        },
        order: {
          id: 100,
          orderNumber: '54255',
        },
      };

      prismaMock.orderSchucoLink.create.mockResolvedValue(mockLink);

      const result = await matcher.createManualLink(100, 50);

      expect(result).toEqual(mockLink);
      expect(prismaMock.orderSchucoLink.create).toHaveBeenCalledWith({
        data: {
          orderId: 100,
          schucoDeliveryId: 50,
          linkedBy: 'manual',
        },
        include: {
          schucoDelivery: true,
          order: true,
        },
      });
    });
  });

  describe('deleteLink', () => {
    it('should delete a link by id', async () => {
      prismaMock.orderSchucoLink.delete.mockResolvedValue({ id: 1 });

      const result = await matcher.deleteLink(1);

      expect(result).toEqual({ id: 1 });
      expect(prismaMock.orderSchucoLink.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('getUnlinkedDeliveries', () => {
    it('should return unlinked non-warehouse deliveries', async () => {
      const mockDeliveries = [
        {
          id: 1,
          orderNumber: '123/2026/54255',
          isWarehouseItem: false,
          orderDateParsed: new Date('2026-01-15'),
        },
        {
          id: 2,
          orderNumber: '456/2026/54365',
          isWarehouseItem: false,
          orderDateParsed: new Date('2026-01-14'),
        },
      ];

      prismaMock.schucoDelivery.findMany.mockResolvedValue(mockDeliveries);

      const result = await matcher.getUnlinkedDeliveries();

      expect(result).toHaveLength(2);
      expect(prismaMock.schucoDelivery.findMany).toHaveBeenCalledWith({
        where: {
          isWarehouseItem: false,
          orderLinks: {
            none: {},
          },
        },
        orderBy: {
          orderDateParsed: 'desc',
        },
        take: 100,
      });
    });

    it('should respect custom limit', async () => {
      prismaMock.schucoDelivery.findMany.mockResolvedValue([]);

      await matcher.getUnlinkedDeliveries(50);

      expect(prismaMock.schucoDelivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle duplicate order numbers in delivery', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: '123/2026/54255/54255',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255']), // Deduplicated
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 100, orderNumber: '54255' },
      ]);

      // Mock batch operations (new API - uses findMany + createMany instead of upsert)
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]); // No existing links
      prismaMock.orderSchucoLink.createMany.mockResolvedValue({ count: 1 });

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(1); // Only one link created (deduplicated)
    });

    it('should handle mixed warehouse and order items', async () => {
      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: 'PALETA-2026-001 54255',
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255']),
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 100, orderNumber: '54255' },
      ]);

      // Mock batch operations
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);
      prismaMock.orderSchucoLink.createMany.mockResolvedValue({ count: 1 });

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(1);
    });

    it('should handle very long order number strings', async () => {
      const longOrderNumber = '123/2026/' + Array(50).fill('54255').join('/');

      prismaMock.schucoDelivery.findUnique.mockResolvedValue({
        id: 1,
        orderNumber: longOrderNumber,
        shippingStatus: 'Otwarte',
      });

      prismaMock.schucoDelivery.update.mockResolvedValue({
        id: 1,
        isWarehouseItem: false,
        extractedOrderNums: JSON.stringify(['54255']),
      });

      prismaMock.order.findMany.mockResolvedValue([
        { id: 100, orderNumber: '54255' },
      ]);

      // Mock batch operations
      prismaMock.orderSchucoLink.findMany.mockResolvedValue([]);
      prismaMock.orderSchucoLink.createMany.mockResolvedValue({ count: 1 });

      const result = await matcher.processSchucoDelivery(1);

      expect(result).toBe(1);
    });
  });
});
