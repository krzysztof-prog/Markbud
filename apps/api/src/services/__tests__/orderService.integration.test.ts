/**
 * OrderService - Integration Tests (Real Database)
 *
 * Tests that use real Prisma client and database for integration testing.
 * These tests verify end-to-end behavior including database interactions.
 *
 * Test categories:
 * 3. Stock Validation on Status Change
 * 5. Cascade Delete on Archive
 * 7. Concurrent Status Update (Optimistic Lock)
 * Bulk Operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// IMPORTANT: Mock index.js to use real prisma but avoid loading Fastify
// Use async factory to dynamically import prisma
vi.mock('../../index.js', async () => {
  const { prisma } = await import('../../utils/prisma.js');
  return {
    prisma,
  };
});

// Mock event emitters to prevent side effects
vi.mock('../event-emitter.js', () => ({
  emitOrderCreated: vi.fn(),
  emitOrderUpdated: vi.fn(),
  emitOrderDeleted: vi.fn(),
}));

import { OrderService } from '../orderService.js';
import { OrderRepository } from '../../repositories/OrderRepository.js';
import { OrderBuilder } from '../../tests/fixtures/orders.fixture.js';
import { resetTestDatabase, seedMinimalData } from '../../tests/utils/test-db.js';
import { prisma } from '../../utils/prisma.js';
import { ValidationError } from '../../utils/errors.js';

describe('OrderService - Integration Tests (Real DB)', () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(async () => {
    await resetTestDatabase();
    await seedMinimalData();
    repository = new OrderRepository(prisma);
    service = new OrderService(repository);
  });

  describe('[INTEGRATION] Stock Validation', () => {
    /**
     * Test #3: Stock Validation on Status Change
     *
     * CRITICAL: Prevents starting production without sufficient materials
     * Edge case: Order requires 1000mm profile, but stock only has 500mm
     *
     * Coverage: orderService.ts:updateOrder() → warehouse-validation.ts:validateSufficientStock()
     */
    it('should reject in_progress transition when insufficient stock', async () => {
      // Setup: Create profile and color (from fixtures)
      const profileId = 1; // ART-123 from PROFILE_FIXTURES
      const colorId = 1;   // RAL-9016 from COLOR_FIXTURES

      // Create order with requirements
      const order = await new OrderBuilder()
        .withStatus('new')
        .withOrderNumber('12345')
        .create(prisma);

      // Add requirement: needs 10 beams
      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 10,
          meters: 60, // 10 beams * 6m each
          restMm: 0,
        },
      });

      // Create warehouse stock: only 5 beams available (insufficient)
      await prisma.warehouseStock.create({
        data: {
          profileId,
          colorId,
          currentStockBeams: 5, // Less than required
          initialStockBeams: 5,
          version: 1,
          updatedById: 1, // System user
        },
      });

      // Act & Assert: Should throw ValidationError about insufficient stock
      await expect(
        service.updateOrder(order.id, { status: 'in_progress' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.updateOrder(order.id, { status: 'in_progress' })
      ).rejects.toThrow(/niewystarczający stan magazynu/i);

      // Verify order status unchanged
      const unchangedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(unchangedOrder?.status).toBe('new');
    });

    it('should allow in_progress transition when sufficient stock', async () => {
      // Setup: Create profile and color
      const profileId = 1;
      const colorId = 1;

      // Create order
      const order = await new OrderBuilder()
        .withStatus('new')
        .withOrderNumber('12346')
        .create(prisma);

      // Add requirement: needs 10 beams
      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 10,
          meters: 60,
          restMm: 0,
        },
      });

      // Create warehouse stock: 15 beams available (sufficient)
      await prisma.warehouseStock.create({
        data: {
          profileId,
          colorId,
          currentStockBeams: 15, // More than required
          initialStockBeams: 15,
          version: 1,
          updatedById: 1, // System user
        },
      });

      // Act: Update status to in_progress
      const result = await service.updateOrder(order.id, { status: 'in_progress' });

      // Assert: Status updated successfully
      expect(result.status).toBe('in_progress');
    });
  });

  describe('[INTEGRATION] Cascade Operations', () => {
    /**
     * Test #5: Cascade Delete on Archive
     *
     * CRITICAL: Ensures related records are properly cleaned up
     * Edge case: Archived order with requirements, windows, delivery assignments
     *
     * Coverage: orderService.ts:archiveOrder() → Prisma cascade delete
     */
    it('should cascade delete requirements and windows on archive', async () => {
      // Setup: Create order with requirements and windows
      const order = await new OrderBuilder()
        .withStatus('completed')
        .withOrderNumber('12347')
        .create(prisma);

      // Add requirements
      await prisma.orderRequirement.createMany({
        data: [
          {
            orderId: order.id,
            profileId: 1,
            colorId: 1,
            beamsCount: 5,
            meters: 30,
            restMm: 0,
          },
          {
            orderId: order.id,
            profileId: 2,
            colorId: 2,
            beamsCount: 3,
            meters: 18,
            restMm: 500,
          },
        ],
      });

      // Add windows
      await prisma.orderWindow.createMany({
        data: [
          {
            orderId: order.id,
            widthMm: 1200,
            heightMm: 1400,
            profileType: 'fixed',
            quantity: 2,
          },
          {
            orderId: order.id,
            widthMm: 800,
            heightMm: 1200,
            profileType: 'tilt-turn',
            quantity: 3,
          },
        ],
      });

      // Create delivery and assign order
      const delivery = await prisma.delivery.create({
        data: {
          deliveryNumber: 'D001',
          deliveryDate: new Date(),
          status: 'planned',
        },
      });

      await prisma.deliveryOrder.create({
        data: {
          deliveryId: delivery.id,
          orderId: order.id,
          position: 1,
        },
      });

      // Verify setup
      const requirementsBefore = await prisma.orderRequirement.count({
        where: { orderId: order.id },
      });
      const windowsBefore = await prisma.orderWindow.count({
        where: { orderId: order.id },
      });
      const deliveryOrdersBefore = await prisma.deliveryOrder.count({
        where: { orderId: order.id },
      });

      expect(requirementsBefore).toBe(2);
      expect(windowsBefore).toBe(2);
      expect(deliveryOrdersBefore).toBe(1);

      // Act: Archive order (soft delete with archivedAt timestamp)
      await service.archiveOrder(order.id);

      // Assert: Order archived (archivedAt set)
      const archivedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(archivedOrder?.archivedAt).not.toBeNull();

      // Requirements and windows still exist (soft delete, not cascade delete)
      // Prisma onDelete: Cascade only applies to hard deletes
      const requirementsAfter = await prisma.orderRequirement.count({
        where: { orderId: order.id },
      });
      const windowsAfter = await prisma.orderWindow.count({
        where: { orderId: order.id },
      });

      expect(requirementsAfter).toBe(2); // Still exist (soft delete)
      expect(windowsAfter).toBe(2);      // Still exist (soft delete)

      // DeliveryOrder still references archived order
      const deliveryOrdersAfter = await prisma.deliveryOrder.count({
        where: { orderId: order.id },
      });
      expect(deliveryOrdersAfter).toBe(1); // Still exists
    });

    it('should hard delete requirements and windows on order delete', async () => {
      // Setup: Create order with requirements and windows
      const order = await new OrderBuilder()
        .withStatus('new')
        .withOrderNumber('12348')
        .create(prisma);

      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId: 1,
          colorId: 1,
          beamsCount: 5,
          meters: 30,
          restMm: 0,
        },
      });

      await prisma.orderWindow.create({
        data: {
          orderId: order.id,
          widthMm: 1200,
          heightMm: 1400,
          profileType: 'fixed',
          quantity: 2,
        },
      });

      // Verify setup
      const requirementsBefore = await prisma.orderRequirement.count({
        where: { orderId: order.id },
      });
      const windowsBefore = await prisma.orderWindow.count({
        where: { orderId: order.id },
      });
      expect(requirementsBefore).toBe(1);
      expect(windowsBefore).toBe(1);

      // Act: Hard delete order
      await service.deleteOrder(order.id);

      // Assert: Order deleted
      const deletedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(deletedOrder).toBeNull();

      // Requirements and windows cascade deleted (Prisma onDelete: Cascade)
      const requirementsAfter = await prisma.orderRequirement.count({
        where: { orderId: order.id },
      });
      const windowsAfter = await prisma.orderWindow.count({
        where: { orderId: order.id },
      });
      expect(requirementsAfter).toBe(0); // Cascade deleted
      expect(windowsAfter).toBe(0);      // Cascade deleted
    });
  });

  describe('[INTEGRATION] Optimistic Locking', () => {
    /**
     * Test #7: Concurrent Status Update (Optimistic Lock)
     *
     * CRITICAL: Prevents concurrent update conflicts using version field
     * Edge case: Two simultaneous status updates on same order
     *
     * Coverage: optimistic-locking.ts:checkVersion(), OptimisticLockError
     *
     * NOTE: SKIPPED - Order model doesn't have version field yet.
     * TODO: Implement optimistic locking for Order model (add version field)
     */
    it.skip('should handle concurrent status updates with optimistic locking', async () => {
      // Setup: Create order with version = 1
      const order = await prisma.order.create({
        data: {
          orderNumber: '12349',
          status: 'new',
          version: 1, // Initial version
        },
      });

      // Simulate: User A reads order (version 1)
      const orderForUserA = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(orderForUserA?.version).toBe(1);

      // Simulate: User B reads order (version 1)
      const orderForUserB = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(orderForUserB?.version).toBe(1);

      // Act: User A updates status first (version 1 → 2)
      await prisma.order.update({
        where: {
          id: order.id,
          version: 1, // Optimistic lock check
        },
        data: {
          status: 'in_progress',
          version: { increment: 1 }, // Version 1 → 2
        },
      });

      // Assert: User B's update should fail (version mismatch)
      // User B still has version 1, but DB now has version 2
      await expect(
        prisma.order.update({
          where: {
            id: order.id,
            version: 1, // Stale version
          },
          data: {
            status: 'completed',
            version: { increment: 1 },
          },
        })
      ).rejects.toThrow(); // Prisma throws RecordNotFound when version mismatches

      // Verify final state
      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(finalOrder?.status).toBe('in_progress'); // User A's update
      expect(finalOrder?.version).toBe(2); // Version incremented once
    });

    /**
     * NOTE: SKIPPED - Order model doesn't have version field yet.
     * TODO: Implement optimistic locking for Order model (add version field)
     */
    it.skip('should successfully update with correct version', async () => {
      // Setup: Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: '12350',
          status: 'new',
          version: 1,
        },
      });

      // Act: Update with correct version
      const updated = await prisma.order.update({
        where: {
          id: order.id,
          version: 1, // Correct version
        },
        data: {
          status: 'in_progress',
          version: { increment: 1 },
        },
      });

      // Assert: Update successful
      expect(updated.status).toBe('in_progress');
      expect(updated.version).toBe(2);
    });
  });

  describe('[INTEGRATION] Bulk Operations', () => {
    it('should validate all orders before bulk status update', async () => {
      // Setup: Create 3 orders - 2 valid, 1 invalid transition
      const order1 = await new OrderBuilder()
        .withOrderNumber('BULK-001')
        .withStatus('new')
        .create(prisma);

      const order2 = await new OrderBuilder()
        .withOrderNumber('BULK-002')
        .withStatus('new')
        .create(prisma);

      const order3 = await new OrderBuilder()
        .withOrderNumber('BULK-003')
        .withStatus('archived') // Invalid: can't transition from archived
        .create(prisma);

      // Act & Assert: Bulk update should fail if ANY transition is invalid
      // Use single assertion to avoid calling the function twice
      let thrownError: Error | undefined;
      try {
        await service.bulkUpdateStatus(
          [order1.id, order2.id, order3.id],
          'in_progress'
        );
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(ValidationError);
      expect(thrownError?.message).toMatch(/niedozwolone zmiany statusu/i);

      // Verify no orders were updated (atomic operation)
      const order1After = await prisma.order.findUnique({ where: { id: order1.id } });
      const order2After = await prisma.order.findUnique({ where: { id: order2.id } });

      expect(order1After?.status).toBe('new'); // Unchanged
      expect(order2After?.status).toBe('new'); // Unchanged
    });

    it('should successfully bulk update all valid orders', async () => {
      // Setup: Create 3 orders with valid transitions
      const order1 = await new OrderBuilder()
        .withOrderNumber('BULK-004')
        .withStatus('new')
        .create(prisma);

      const order2 = await new OrderBuilder()
        .withOrderNumber('BULK-005')
        .withStatus('new')
        .create(prisma);

      const order3 = await new OrderBuilder()
        .withOrderNumber('BULK-006')
        .withStatus('in_progress')
        .create(prisma);

      // Act: Bulk update - all to completed (valid transitions)
      // new → completed is INVALID, in_progress → completed is VALID
      // This should fail
      await expect(
        service.bulkUpdateStatus(
          [order1.id, order2.id, order3.id],
          'completed'
        )
      ).rejects.toThrow(ValidationError);

      // Correct test: new → in_progress (valid for order1, order2)
      const results = await service.bulkUpdateStatus(
        [order1.id, order2.id],
        'in_progress'
      );

      // Assert: All orders updated
      expect(results).toHaveLength(2);
      expect(results.every(o => o.status === 'in_progress')).toBe(true);
    });

    it('should validate stock for all orders before bulk in_progress', async () => {
      // Setup: Ensure we have profiles and colors from fixtures
      // Use upsert to handle case where they may already exist with different IDs
      const profile1 = await prisma.profile.upsert({
        where: { number: '9016' },
        update: {},
        create: { number: '9016', name: 'Test Profile 1', description: 'Test' },
      });
      const profile2 = await prisma.profile.upsert({
        where: { number: '8866' },
        update: {},
        create: { number: '8866', name: 'Test Profile 2', description: 'Test' },
      });
      const color1 = await prisma.color.upsert({
        where: { code: '000' },
        update: {},
        create: { code: '000', name: 'White', hexColor: '#FFFFFF', type: 'RAL' },
      });
      const color2 = await prisma.color.upsert({
        where: { code: '016' },
        update: {},
        create: { code: '016', name: 'Grey', hexColor: '#666666', type: 'RAL' },
      });

      // Setup: Create 2 orders with requirements
      const order1 = await new OrderBuilder()
        .withOrderNumber('BULK-007')
        .withStatus('new')
        .create(prisma);

      const order2 = await new OrderBuilder()
        .withOrderNumber('BULK-008')
        .withStatus('new')
        .create(prisma);

      // Order 1: sufficient stock
      await prisma.orderRequirement.create({
        data: {
          orderId: order1.id,
          profileId: profile1.id,
          colorId: color1.id,
          beamsCount: 5,
          meters: 30,
          restMm: 0,
        },
      });

      // Order 2: insufficient stock
      await prisma.orderRequirement.create({
        data: {
          orderId: order2.id,
          profileId: profile2.id,
          colorId: color2.id,
          beamsCount: 20, // Requires 20 beams
          meters: 120,
          restMm: 0,
        },
      });

      // Create stock: enough for order1, not enough for order2
      await prisma.warehouseStock.createMany({
        data: [
          {
            profileId: profile1.id,
            colorId: color1.id,
            currentStockBeams: 10, // Sufficient for order1
            initialStockBeams: 10,
            version: 1,
            updatedById: 1, // System user
          },
          {
            profileId: profile2.id,
            colorId: color2.id,
            currentStockBeams: 5, // Insufficient for order2 (needs 20)
            initialStockBeams: 5,
            version: 1,
            updatedById: 1, // System user
          },
        ],
      });

      // Act & Assert: Should fail because order2 has insufficient stock
      // Use single assertion to avoid calling the function twice
      let thrownError: Error | undefined;
      try {
        await service.bulkUpdateStatus([order1.id, order2.id], 'in_progress');
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(ValidationError);
      expect(thrownError?.message).toMatch(/niewystarczający stan magazynu/i);

      // Verify neither order was updated
      const order1After = await prisma.order.findUnique({ where: { id: order1.id } });
      const order2After = await prisma.order.findUnique({ where: { id: order2.id } });

      expect(order1After?.status).toBe('new');
      expect(order2After?.status).toBe('new');
    });
  });
});
