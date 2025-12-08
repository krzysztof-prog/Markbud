/**
 * Prisma Mock for testing
 */

import { vi } from 'vitest';

export const createMockPrisma = () => {
  return {
    profile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    color: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    delivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    deliveryOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    deliveryItem: {
      create: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    profileColor: {
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    warehouseStock: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    orderRequirement: {
      count: vi.fn(),
    },
    warehouseOrder: {
      count: vi.fn(),
    },
    warehouseHistory: {
      count: vi.fn(),
    },
    orderWindow: {
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;
};

/**
 * Setup transaction mock to pass the prisma mock as tx argument
 */
export const setupTransactionMock = (mockPrisma: ReturnType<typeof createMockPrisma>) => {
  mockPrisma.$transaction.mockImplementation(async (arg: any) => {
    // Handle both function and array forms of $transaction
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    return Promise.all(arg);
  });
};
