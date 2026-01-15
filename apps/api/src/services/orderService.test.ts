import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock index.js to avoid loading Fastify app (OrderService imports prisma from index.js)
vi.mock('../index.js', async () => {
  const { prisma } = await import('../utils/prisma.js');
  return { prisma };
});

// Mock event emitter
vi.mock('./event-emitter.js', () => ({
  emitOrderCreated: vi.fn(),
  emitOrderUpdated: vi.fn(),
  emitOrderDeleted: vi.fn(),
}));

// Mock warehouse validation to avoid database calls in unit tests
vi.mock('../utils/warehouse-validation.js', () => ({
  validateSufficientStock: vi.fn().mockResolvedValue(undefined),
}));

// Mock ReadinessOrchestrator for production readiness checks
vi.mock('./readinessOrchestrator.js', () => ({
  ReadinessOrchestrator: class MockReadinessOrchestrator {
    canStartProduction = vi.fn().mockResolvedValue({ ready: true, blocking: [], warnings: [] });
  },
}));

import { OrderService } from './orderService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { ORDER_STATUSES } from '../utils/order-status-machine.js';

describe('OrderService - Status Transition Validation', () => {
  let orderService: OrderService;
  let mockRepository: OrderRepository;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: vi.fn(),
      update: vi.fn(),
      bulkUpdateStatus: vi.fn(),
    } as unknown as OrderRepository;

    orderService = new OrderService(mockRepository);
  });

  describe('updateOrder - Status Transition Validation', () => {
    it('should allow valid status transition: new → in_progress', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.NEW,
      };

      const updatedOrder = {
        ...mockOrder,
        status: ORDER_STATUSES.IN_PROGRESS,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedOrder as any);

      const result = await orderService.updateOrder(1, {
        status: ORDER_STATUSES.IN_PROGRESS,
      });

      expect(result.status).toBe(ORDER_STATUSES.IN_PROGRESS);
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: ORDER_STATUSES.IN_PROGRESS,
      });
    });

    it('should allow valid status transition: in_progress → completed', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.IN_PROGRESS,
      };

      const updatedOrder = {
        ...mockOrder,
        status: ORDER_STATUSES.COMPLETED,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedOrder as any);

      const result = await orderService.updateOrder(1, {
        status: ORDER_STATUSES.COMPLETED,
      });

      expect(result.status).toBe(ORDER_STATUSES.COMPLETED);
    });

    it('should prevent invalid transition: completed → new', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.COMPLETED,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.NEW })
      ).rejects.toThrow(ValidationError);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.NEW })
      ).rejects.toThrow(/Niedozwolona zmiana statusu.*completed.*→.*new/);

      // Should not call update
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should prevent invalid transition: archived → in_progress', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.ARCHIVED,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.IN_PROGRESS })
      ).rejects.toThrow(ValidationError);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.IN_PROGRESS })
      ).rejects.toThrow(/Niedozwolona zmiana statusu.*archived.*→.*in_progress/);

      // Should not call update
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updates without status change', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.IN_PROGRESS,
        notes: 'Old notes',
      };

      const updatedOrder = {
        ...mockOrder,
        notes: 'New notes',
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedOrder as any);

      const result = await orderService.updateOrder(1, {
        notes: 'New notes',
      });

      expect(result.notes).toBe('New notes');
      expect(result.status).toBe(ORDER_STATUSES.IN_PROGRESS); // Status unchanged
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should allow same status update (no-op)', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.IN_PROGRESS,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(mockRepository.update).mockResolvedValue(mockOrder as any);

      const result = await orderService.updateOrder(1, {
        status: ORDER_STATUSES.IN_PROGRESS,
      });

      expect(result.status).toBe(ORDER_STATUSES.IN_PROGRESS);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus - Status Transition Validation', () => {
    it('should allow bulk update when all transitions are valid', async () => {
      const mockOrders = [
        { id: 1, orderNumber: '54222', status: ORDER_STATUSES.NEW },
        { id: 2, orderNumber: '54223', status: ORDER_STATUSES.NEW },
        { id: 3, orderNumber: '54224', status: ORDER_STATUSES.NEW },
      ];

      const updatedOrders = mockOrders.map((order) => ({
        ...order,
        status: ORDER_STATUSES.IN_PROGRESS,
      }));

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const order = mockOrders.find((o) => o.id === id);
        return order as any;
      });

      vi.mocked(mockRepository.bulkUpdateStatus).mockResolvedValue(updatedOrders as any);

      const result = await orderService.bulkUpdateStatus(
        [1, 2, 3],
        ORDER_STATUSES.IN_PROGRESS
      );

      expect(result).toHaveLength(3);
      expect(result.every((order) => order.status === ORDER_STATUSES.IN_PROGRESS)).toBe(true);
      expect(mockRepository.bulkUpdateStatus).toHaveBeenCalledWith(
        [1, 2, 3],
        ORDER_STATUSES.IN_PROGRESS,
        undefined
      );
    });

    it('should reject bulk update if ANY transition is invalid', async () => {
      const mockOrders = [
        { id: 1, orderNumber: '54222', status: ORDER_STATUSES.NEW },
        { id: 2, orderNumber: '54223', status: ORDER_STATUSES.COMPLETED }, // Invalid transition
        { id: 3, orderNumber: '54224', status: ORDER_STATUSES.NEW },
      ];

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const order = mockOrders.find((o) => o.id === id);
        return order as any;
      });

      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(ValidationError);

      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(/Niedozwolone zmiany statusu.*54223.*completed.*→.*new/);

      // Should not call bulkUpdateStatus - fail fast
      expect(mockRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should reject bulk update if multiple transitions are invalid', async () => {
      const mockOrders = [
        { id: 1, orderNumber: '54222', status: ORDER_STATUSES.COMPLETED },
        { id: 2, orderNumber: '54223', status: ORDER_STATUSES.ARCHIVED },
        { id: 3, orderNumber: '54224', status: ORDER_STATUSES.NEW },
      ];

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const order = mockOrders.find((o) => o.id === id);
        return order as any;
      });

      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(ValidationError);

      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(/Niedozwolone zmiany statusu dla 2 zlecenia\/zleceń/);

      // Should include details for both invalid orders
      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(/54222.*completed.*→.*new/);

      await expect(
        orderService.bulkUpdateStatus([1, 2, 3], ORDER_STATUSES.NEW)
      ).rejects.toThrow(/54223.*archived.*→.*new/);

      // Should not call bulkUpdateStatus
      expect(mockRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should allow bulk update to archived from mixed statuses', async () => {
      const mockOrders = [
        { id: 1, orderNumber: '54222', status: ORDER_STATUSES.NEW },
        { id: 2, orderNumber: '54223', status: ORDER_STATUSES.IN_PROGRESS },
        { id: 3, orderNumber: '54224', status: ORDER_STATUSES.COMPLETED },
      ];

      const updatedOrders = mockOrders.map((order) => ({
        ...order,
        status: ORDER_STATUSES.ARCHIVED,
      }));

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const order = mockOrders.find((o) => o.id === id);
        return order as any;
      });

      vi.mocked(mockRepository.bulkUpdateStatus).mockResolvedValue(updatedOrders as any);

      const result = await orderService.bulkUpdateStatus(
        [1, 2, 3],
        ORDER_STATUSES.ARCHIVED
      );

      expect(result).toHaveLength(3);
      expect(result.every((order) => order.status === ORDER_STATUSES.ARCHIVED)).toBe(true);
      expect(mockRepository.bulkUpdateStatus).toHaveBeenCalled();
    });

    it('should validate transitions BEFORE starting transaction', async () => {
      const mockOrders = [
        { id: 1, orderNumber: '54222', status: ORDER_STATUSES.ARCHIVED }, // Invalid
      ];

      vi.mocked(mockRepository.findById).mockImplementation(async (id) => {
        const order = mockOrders.find((o) => o.id === id);
        return order as any;
      });

      await expect(
        orderService.bulkUpdateStatus([1], ORDER_STATUSES.NEW)
      ).rejects.toThrow(ValidationError);

      // bulkUpdateStatus (which starts transaction) should never be called
      expect(mockRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases from EDGE_CASES_ANALYSIS.md', () => {
    it('should prevent Case 7.1: regression from completed to new', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.COMPLETED,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.NEW })
      ).rejects.toThrow(/Niedozwolona zmiana statusu/);
    });

    it('should prevent Case 7.1: reviving archived order', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.ARCHIVED,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.IN_PROGRESS })
      ).rejects.toThrow(/Niedozwolona zmiana statusu/);
    });

    it('should prevent Case 7.1: skipping status (new → completed)', async () => {
      const mockOrder = {
        id: 1,
        orderNumber: '54222',
        status: ORDER_STATUSES.NEW,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.updateOrder(1, { status: ORDER_STATUSES.COMPLETED })
      ).rejects.toThrow(/Niedozwolona zmiana statusu/);
    });
  });
});
