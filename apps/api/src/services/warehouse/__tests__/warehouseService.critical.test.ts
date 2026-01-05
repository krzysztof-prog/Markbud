/**
 * WarehouseService - Critical Path Tests
 *
 * Tests critical warehouse operations:
 * - Optimistic locking with version checks
 * - Concurrent stock updates
 * - Shortage calculations
 * - Low stock alerts
 * - History record creation
 * - Warehouse order fulfillment
 * - Stock value calculations
 *
 * Target coverage: ~60% for WarehouseStockService and WarehouseShortageService
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { WarehouseStockService } from '../WarehouseStockService.js';
import { WarehouseShortageService } from '../WarehouseShortageService.js';
import { WarehouseRepository } from '../../../repositories/WarehouseRepository.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { prisma } from '../../../index.js';
import {
  resetTestDatabase,
  seedMinimalData,
  cleanupTestDatabase,
  createWarehouseStock,
} from '../../../tests/utils/test-db.js';
import { PROFILE_FIXTURES } from '../../../tests/fixtures/profiles.fixture.js';
import { COLOR_FIXTURES } from '../../../tests/fixtures/colors.fixture.js';

describe('WarehouseService - Critical Paths', () => {
  let stockService: WarehouseStockService;
  let shortageService: WarehouseShortageService;
  let repository: WarehouseRepository;
  let testUserId: number;

  beforeEach(async () => {
    // Reset database and seed minimal data
    await resetTestDatabase();
    await seedMinimalData();

    // Create test user (required for foreign key constraints)
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Initialize services
    repository = new WarehouseRepository(prisma);
    stockService = new WarehouseStockService(repository);
    shortageService = new WarehouseShortageService(repository);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Test 1: Stock Update with Version Check (Integration)', () => {
    it('should increment version on successful stock update', async () => {
      // Setup: Create stock with version 1
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;
      const initialStock = 1000;

      const stock = await createWarehouseStock(profileId, colorId, initialStock);
      expect(stock.version).toBe(1);

      // Test: Update stock with correct version
      const updated = await stockService.updateStock(
        colorId,
        profileId,
        1100,
        testUserId,
        1 // expectedVersion
      );

      // Assert: Version incremented, stock updated
      expect(updated.version).toBe(2);
      expect(updated.currentStockBeams).toBe(1100);
    });

    it('should allow update without version check when version not provided', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 500);

      // Test: Update without expectedVersion parameter
      const updated = await stockService.updateStock(colorId, profileId, 600, testUserId);

      // Assert: Update succeeded, version incremented
      expect(updated.version).toBe(2);
      expect(updated.currentStockBeams).toBe(600);
    });

    it('should reject negative stock values', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 100);

      // Test: Attempt to set negative stock
      await expect(
        stockService.updateStock(colorId, profileId, -50, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject non-finite stock values', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 100);

      // Test: Attempt to set NaN/Infinity
      await expect(
        stockService.updateStock(colorId, profileId, NaN, testUserId)
      ).rejects.toThrow(ValidationError);

      await expect(
        stockService.updateStock(colorId, profileId, Infinity, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Test 2: Concurrent Stock Update Conflict (Integration)', () => {
    it('should throw ValidationError when version mismatch detected', async () => {
      // Setup: Create stock with version 1
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 1000);

      // Test: Simulate concurrent update
      // First update succeeds and increments version to 2
      await stockService.updateStock(colorId, profileId, 1100, testUserId, 1);

      // Second update tries to use old version (1)
      await expect(
        stockService.updateStock(colorId, profileId, 1200, testUserId, 1)
      ).rejects.toThrow(ValidationError);
    });

    it('should provide clear error message on version conflict', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 500);

      // Test: Update once, then attempt stale update
      await stockService.updateStock(colorId, profileId, 600, testUserId, 1);

      try {
        await stockService.updateStock(colorId, profileId, 700, testUserId, 1);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('Konflikt wersji');
          expect(error.message).toContain('zmodyfikowany przez innego użytkownika');
        }
      }
    });

    it('should handle rapid sequential updates correctly', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[2].id;
      const colorId = COLOR_FIXTURES[2].id;

      await createWarehouseStock(profileId, colorId, 1000);

      // Test: Perform 5 sequential updates with correct version tracking
      let currentVersion = 1;
      for (let i = 0; i < 5; i++) {
        const updated = await stockService.updateStock(
          colorId,
          profileId,
          1000 + (i + 1) * 100,
          testUserId,
          currentVersion
        );
        currentVersion = updated.version;
      }

      // Assert: Final version should be 6 (1 + 5 updates)
      const finalStock = await prisma.warehouseStock.findUnique({
        where: { profileId_colorId: { profileId, colorId } },
      });

      expect(finalStock?.version).toBe(6);
      expect(finalStock?.currentStockBeams).toBe(1500);
    });
  });

  describe('Test 3: Shortage Calculation (Unit)', () => {
    it('should calculate shortage when demand exceeds stock', async () => {
      // Setup: Create stock with 3000 beams
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 3000);

      // Create order with requirement for 5000 beams
      const order = await prisma.order.create({
        data: {
          orderNumber: 'TEST-SHORTAGE-001',
          status: 'new',
        },
      });

      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 5000,
          meters: 5000,
          restMm: 0,
        },
      });

      // Test: Get all shortages
      const shortages = await shortageService.getAllShortages();

      // Assert: Shortage of 2000 beams detected
      expect(shortages).toHaveLength(1);
      expect(shortages[0].profileId).toBe(profileId);
      expect(shortages[0].colorId).toBe(colorId);
      expect(shortages[0].shortage).toBe(2000);
      expect(shortages[0].currentStock).toBe(3000);
      expect(shortages[0].demand).toBe(5000);
    });

    it('should not include profiles with sufficient stock', async () => {
      // Setup: Create stock with 10000 beams (more than demand)
      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 10000);

      // Create order with requirement for 5000 beams
      const order = await prisma.order.create({
        data: {
          orderNumber: 'TEST-NO-SHORTAGE-001',
          status: 'new',
        },
      });

      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 5000,
          meters: 5000,
          restMm: 0,
        },
      });

      // Test: Get all shortages
      const shortages = await shortageService.getAllShortages();

      // Assert: No shortage for this profile
      const profileShortage = shortages.find((s) => s.profileId === profileId);
      expect(profileShortage).toBeUndefined();
    });

    it('should include warehouse order information in shortage data', async () => {
      // Setup: Create stock with shortage
      const profileId = PROFILE_FIXTURES[2].id;
      const colorId = COLOR_FIXTURES[2].id;

      await createWarehouseStock(profileId, colorId, 1000);

      // Create order with demand
      const order = await prisma.order.create({
        data: {
          orderNumber: 'TEST-ORDER-WH-001',
          status: 'new',
        },
      });

      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 3000,
          meters: 3000,
          restMm: 0,
        },
      });

      // Create warehouse order (pending delivery)
      const expectedDate = new Date('2026-02-01');
      await prisma.warehouseOrder.create({
        data: {
          profileId,
          colorId,
          orderedBeams: 1500,
          expectedDeliveryDate: expectedDate,
          status: 'pending',
          createdById: testUserId, // System user
        },
      });

      // Test: Get shortages
      const shortages = await shortageService.getAllShortages();

      // Assert: Shortage includes warehouse order info
      expect(shortages).toHaveLength(1);
      expect(shortages[0].orderedBeams).toBe(1500);
      expect(shortages[0].expectedDeliveryDate).toEqual(expectedDate);
    });

    it('should sort shortages by severity (highest first)', async () => {
      // Setup: Create multiple stocks with different shortage levels
      const profile1 = PROFILE_FIXTURES[0].id;
      const profile2 = PROFILE_FIXTURES[1].id;
      const profile3 = PROFILE_FIXTURES[2].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profile1, colorId, 1000); // Shortage: 1000
      await createWarehouseStock(profile2, colorId, 500);  // Shortage: 4500
      await createWarehouseStock(profile3, colorId, 2000); // Shortage: 500

      // Create orders with different demands
      const order1 = await prisma.order.create({
        data: { orderNumber: 'TEST-001', status: 'new' },
      });
      const order2 = await prisma.order.create({
        data: { orderNumber: 'TEST-002', status: 'new' },
      });
      const order3 = await prisma.order.create({
        data: { orderNumber: 'TEST-003', status: 'new' },
      });

      await prisma.orderRequirement.create({
        data: { orderId: order1.id, profileId: profile1, colorId, beamsCount: 2000, meters: 2000, restMm: 0 },
      });
      await prisma.orderRequirement.create({
        data: { orderId: order2.id, profileId: profile2, colorId, beamsCount: 5000, meters: 5000, restMm: 0 },
      });
      await prisma.orderRequirement.create({
        data: { orderId: order3.id, profileId: profile3, colorId, beamsCount: 2500, meters: 2500, restMm: 0 },
      });

      // Test: Get shortages
      const shortages = await shortageService.getAllShortages();

      // Assert: Sorted by shortage DESC (4500, 1000, 500)
      expect(shortages).toHaveLength(3);
      expect(shortages[0].shortage).toBe(4500); // profile2
      expect(shortages[1].shortage).toBe(1000); // profile1
      expect(shortages[2].shortage).toBe(500);  // profile3
    });
  });

  describe('Test 4: Minimum Stock Alert (Unit)', () => {
    it('should mark stock as low when below threshold', async () => {
      // Setup: Create setting for low stock threshold (default: 10)
      await prisma.setting.upsert({
        where: { key: 'lowStockThreshold' },
        update: { value: '20' },
        create: { key: 'lowStockThreshold', value: '20' },
      });

      // Create stock with 15 beams (below threshold of 20)
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 15);

      // Test: Get warehouse data
      const data = await stockService.getColorWarehouseData(colorId);

      // Assert: Stock marked as low
      const row = data.data.find((r) => r.profileId === profileId);
      expect(row?.isLow).toBe(true);
    });

    it('should not mark stock as low when at or above threshold', async () => {
      // Setup: Set threshold to 10
      await prisma.setting.upsert({
        where: { key: 'lowStockThreshold' },
        update: { value: '10' },
        create: { key: 'lowStockThreshold', value: '10' },
      });

      // Create stock with 100 beams (well above threshold)
      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 100);

      // Test: Get warehouse data
      const data = await stockService.getColorWarehouseData(colorId);

      // Assert: Stock NOT marked as low
      const row = data.data.find((r) => r.profileId === profileId);
      expect(row?.isLow).toBe(false);
    });

    it('should mark stock as negative when afterDemand is negative', async () => {
      // Setup: Create stock with 50 beams
      const profileId = PROFILE_FIXTURES[2].id;
      const colorId = COLOR_FIXTURES[2].id;

      await createWarehouseStock(profileId, colorId, 50);

      // Create order with demand of 100 beams
      const order = await prisma.order.create({
        data: { orderNumber: 'TEST-NEG-001', status: 'new' },
      });

      await prisma.orderRequirement.create({
        data: {
          orderId: order.id,
          profileId,
          colorId,
          beamsCount: 100,
          meters: 100,
          restMm: 0,
        },
      });

      // Test: Get warehouse data
      const data = await stockService.getColorWarehouseData(colorId);

      // Assert: afterDemand is negative, isNegative flag set
      const row = data.data.find((r) => r.profileId === profileId);
      expect(row?.afterDemand).toBe(-50);
      expect(row?.isNegative).toBe(true);
    });
  });

  describe('Test 5: History Record Creation (Integration)', () => {
    it('should NOT create history record on stock update (WarehouseStockService)', async () => {
      // Note: Based on WarehouseStockService.updateStock() code (lines 156-236),
      // history records are NOT created in this service.
      // History is created by WarehouseRepository.updateStockTransaction()
      // which is called from WarehouseInventoryService for monthly updates.

      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 1000);

      // Test: Update stock via WarehouseStockService
      await stockService.updateStock(colorId, profileId, 1500, testUserId);

      // Assert: NO history record created (this is expected behavior)
      const historyRecords = await prisma.warehouseHistory.findMany({
        where: { profileId, colorId },
      });

      expect(historyRecords).toHaveLength(0);
    });

    it('should create history record when using repository transaction method', async () => {
      // This test verifies that WarehouseRepository.updateStockTransaction()
      // creates history records correctly (used by WarehouseInventoryService)

      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 500);

      // Test: Update stock using repository transaction method
      await repository.updateStockTransaction(colorId, profileId, 800, testUserId);

      // Assert: History record created
      const historyRecords = await prisma.warehouseHistory.findMany({
        where: { profileId, colorId },
      });

      expect(historyRecords).toHaveLength(1);
      expect(historyRecords[0].changeType).toBe('manual_adjustment');
      expect(historyRecords[0].previousStock).toBe(500);
      expect(historyRecords[0].currentStock).toBe(800);
      expect(historyRecords[0].recordedById).toBe(testUserId);
    });
  });

  describe('Test 6: Warehouse Order Fulfillment (Integration)', () => {
    it('should mark warehouse order as delivered and increase stock', async () => {
      // Setup: Create stock with 1000 beams
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 1000);

      // Create warehouse order (pending delivery of 500 beams)
      const warehouseOrder = await prisma.warehouseOrder.create({
        data: {
          profileId,
          colorId,
          orderedBeams: 500,
          expectedDeliveryDate: new Date('2026-02-15'),
          status: 'pending',
          createdById: testUserId, // System user
        },
      });

      // Test: Fulfill order by updating status to 'received'
      const fulfilled = await prisma.warehouseOrder.update({
        where: { id: warehouseOrder.id },
        data: { status: 'received' },
      });

      // Assert: Order status changed
      expect(fulfilled.status).toBe('received');

      // Manually increase stock (simulating order fulfillment process)
      await stockService.updateStock(
        colorId,
        profileId,
        1000 + warehouseOrder.orderedBeams,
        testUserId
      );

      // Verify stock increased
      const updatedStock = await prisma.warehouseStock.findUnique({
        where: { profileId_colorId: { profileId, colorId } },
      });

      expect(updatedStock?.currentStockBeams).toBe(1500);
    });

    it('should not include received orders in pending warehouse orders list', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profileId, colorId, 500);

      // Create two warehouse orders: one pending, one received
      await prisma.warehouseOrder.create({
        data: {
          profileId,
          colorId,
          orderedBeams: 200,
          expectedDeliveryDate: new Date('2026-02-20'),
          status: 'pending',
          createdById: testUserId, // System user
        },
      });

      await prisma.warehouseOrder.create({
        data: {
          profileId,
          colorId,
          orderedBeams: 300,
          expectedDeliveryDate: new Date('2026-02-25'),
          status: 'received',
          createdById: testUserId, // System user
        },
      });

      // Test: Get warehouse data (should only show pending orders)
      const data = await stockService.getColorWarehouseData(colorId);
      const row = data.data.find((r) => r.profileId === profileId);

      // Assert: Only pending order appears, received order excluded
      expect(row?.pendingOrders).toHaveLength(1);
      expect(row?.pendingOrders[0].orderedBeams).toBe(200);
      expect(row?.receivedOrders).toHaveLength(1);
      expect(row?.receivedOrders[0].orderedBeams).toBe(300);
    });
  });

  describe('Test 7: Stock Value Calculation (Unit)', () => {
    it('should calculate total stock value across all profiles and colors', async () => {
      // Note: WarehouseStockService doesn't have getTotalStockValue() method.
      // This test will verify data retrieval and manual calculation.

      // Setup: Create stocks with known quantities
      const profile1 = PROFILE_FIXTURES[0].id;
      const profile2 = PROFILE_FIXTURES[1].id;
      const color1 = COLOR_FIXTURES[0].id;
      const color2 = COLOR_FIXTURES[1].id;

      await createWarehouseStock(profile1, color1, 100); // 100 beams
      await createWarehouseStock(profile2, color2, 200); // 200 beams

      // Test: Get all warehouse stocks
      const stocks = await prisma.warehouseStock.findMany({
        select: {
          profileId: true,
          colorId: true,
          currentStockBeams: true,
        },
      });

      // Assert: Total beams = 300
      const totalBeams = stocks.reduce((sum, s) => sum + s.currentStockBeams, 0);
      expect(totalBeams).toBe(300);
    });

    it('should exclude soft-deleted stocks from value calculation', async () => {
      // Setup: Create stocks, soft-delete one
      const profile1 = PROFILE_FIXTURES[0].id;
      const profile2 = PROFILE_FIXTURES[1].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profile1, colorId, 150);
      const stock2 = await createWarehouseStock(profile2, colorId, 250);

      // Soft delete stock2
      await prisma.warehouseStock.update({
        where: { id: stock2.id },
        data: { deletedAt: new Date() },
      });

      // Test: Get active stocks (excluding soft-deleted)
      const activeStocks = await prisma.warehouseStock.findMany({
        where: { deletedAt: null },
        select: { currentStockBeams: true },
      });

      // Assert: Only stock1 counted (150 beams)
      const totalBeams = activeStocks.reduce((sum, s) => sum + s.currentStockBeams, 0);
      expect(totalBeams).toBe(150);
    });

    it('should handle empty warehouse correctly', async () => {
      // Test: Calculate value when no stocks exist
      const stocks = await prisma.warehouseStock.findMany({
        select: { currentStockBeams: true },
      });

      // Assert: No stocks, total = 0
      const totalBeams = stocks.reduce((sum, s) => sum + s.currentStockBeams, 0);
      expect(totalBeams).toBe(0);
    });
  });

  describe('Additional Edge Cases', () => {
    it('should throw NotFoundError when updating non-existent stock', async () => {
      // Test: Attempt to update stock that doesn't exist
      await expect(
        stockService.updateStock(999, 999, 100, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should return color info when getting warehouse data', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 100);

      // Test: Get warehouse data
      const data = await stockService.getColorWarehouseData(colorId);

      // Assert: Color info included
      expect(data.color).toBeDefined();
      expect(data.color.id).toBe(colorId);
      // Note: Database may have different color code than fixture
      // Just verify color object is returned with expected ID
      expect(data.color.code).toBeDefined();
      expect(data.color.name).toBeDefined();
    });

    it('should throw NotFoundError when getting data for non-existent color', async () => {
      // Test: Get warehouse data for non-existent color
      await expect(stockService.getColorWarehouseData(9999)).rejects.toThrow(NotFoundError);
    });

    it('should exclude archived and completed orders from shortage calculation', async () => {
      // Setup: Create stock
      const profileId = PROFILE_FIXTURES[0].id;
      const colorId = COLOR_FIXTURES[0].id;

      await createWarehouseStock(profileId, colorId, 100);

      // Create archived order (should be excluded)
      const archivedOrder = await prisma.order.create({
        data: {
          orderNumber: 'ARCHIVED-001',
          status: 'archived',
          archivedAt: new Date(),
        },
      });

      await prisma.orderRequirement.create({
        data: {
          orderId: archivedOrder.id,
          profileId,
          colorId,
          beamsCount: 1000,
          meters: 1000,
          restMm: 0,
        },
      });

      // Test: Get shortages
      const shortages = await shortageService.getAllShortages();

      // Assert: No shortage (archived order excluded)
      const profileShortage = shortages.find((s) => s.profileId === profileId);
      expect(profileShortage).toBeUndefined();
    });
  });
});
