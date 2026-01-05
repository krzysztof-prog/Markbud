/**
 * Test Database Utilities
 *
 * Provides helper functions for database setup/teardown in integration tests.
 * Ensures clean state between tests and provides minimal seed data.
 */

import { prisma } from '../../utils/prisma.js';
import { PROFILE_FIXTURES } from '../fixtures/profiles.fixture.js';
import { COLOR_FIXTURES } from '../fixtures/colors.fixture.js';

/**
 * Reset test database to clean state
 *
 * Deletes all data from critical tables in correct order (foreign keys).
 * Also resets SQLite auto-increment sequences.
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await resetTestDatabase();
 *   await seedMinimalData();
 * });
 * ```
 */
export async function resetTestDatabase(): Promise<void> {
  // Delete in correct order to avoid FK violations
  await prisma.$transaction([
    // First: Delete join tables
    prisma.deliveryOrder.deleteMany(),
    prisma.profileColor.deleteMany(),

    // Second: Delete dependent records
    prisma.orderRequirement.deleteMany(),
    prisma.orderWindow.deleteMany(),
    prisma.warehouseHistory.deleteMany(),
    prisma.warehouseOrder.deleteMany(),
    prisma.fileImport.deleteMany(),
    prisma.importLock.deleteMany(),

    // Third: Delete main entities
    prisma.order.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.warehouseStock.deleteMany(),

    // Fourth: Delete users (FK dependencies resolved)
    prisma.user.deleteMany(),

    // Last: Delete master data (if needed for test isolation)
    // Uncomment if you want full cleanup between tests
    // prisma.profile.deleteMany(),
    // prisma.color.deleteMany(),
  ]);

  // Reset SQLite auto-increment sequences
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');
}

/**
 * Seed minimal test data
 *
 * Creates basic profiles and colors needed for most tests.
 * Also ensures system user (id=1) exists for audit fields.
 * Does NOT create orders/deliveries - tests should create those explicitly.
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await resetTestDatabase();
 *   await seedMinimalData();
 * });
 * ```
 */
export async function seedMinimalData(): Promise<void> {
  // Ensure system user exists (id = 1) for audit fields
  // Use upsert to handle case where user exists with different email (production DB)
  await prisma.user.upsert({
    where: { id: 1 },
    update: {}, // Don't change existing user
    create: {
      id: 1,
      email: 'system@akrobud.local',
      passwordHash: '$2a$10$dummy.hash.for.system.user.placeholder',
      name: 'System User',
      role: 'system',
    },
  });

  // Seed profiles (SQLite doesn't support skipDuplicates in createMany)
  // So we check first and only create if they don't exist
  const existingProfiles = await prisma.profile.findMany();
  if (existingProfiles.length === 0) {
    await prisma.profile.createMany({
      data: PROFILE_FIXTURES.map((p) => ({
        id: p.id,
        number: p.number,
        name: p.name,
        description: p.description,
      })),
    });
  }

  // Seed colors
  const existingColors = await prisma.color.findMany();
  if (existingColors.length === 0) {
    await prisma.color.createMany({
      data: COLOR_FIXTURES.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        hexColor: c.hexColor,
        type: c.type,
      })),
    });
  }
}

/**
 * Create warehouse stock for testing
 *
 * Helper to quickly setup stock records for tests.
 * Uses system user (id=1) for updatedById audit field.
 *
 * @param profileId - Profile ID
 * @param colorId - Color ID
 * @param quantity - Initial stock quantity (in beams)
 * @returns Created WarehouseStock record
 */
export async function createWarehouseStock(
  profileId: number,
  colorId: number,
  quantity: number
) {
  return await prisma.warehouseStock.create({
    data: {
      profileId,
      colorId,
      currentStockBeams: quantity,
      initialStockBeams: quantity,
      version: 1,
      updatedById: 1, // System user for tests
    },
  });
}

/**
 * Cleanup test database (use in afterAll)
 *
 * Closes Prisma connection after all tests complete.
 */
export async function cleanupTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}
