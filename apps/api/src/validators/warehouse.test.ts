/**
 * Warehouse Validator Tests
 * Tests for all Zod validation schemas used in warehouse endpoints
 */

import { describe, it, expect } from 'vitest';
import {
  colorIdParamSchema,
  profileColorParamsSchema,
  updateStockBodySchema,
  monthlyUpdateBodySchema,
  rollbackInventoryBodySchema,
  finalizeMonthBodySchema,
  historyQuerySchema,
  averageQuerySchema
} from './warehouse.js';

describe('Warehouse Validators', () => {

  describe('colorIdParamSchema', () => {
    it('should validate valid colorId', () => {
      const result = colorIdParamSchema.parse({ colorId: '5' });
      expect(result.colorId).toBe(5);
    });

    it('should coerce string to number', () => {
      const result = colorIdParamSchema.parse({ colorId: '123' });
      expect(result.colorId).toBe(123);
      expect(typeof result.colorId).toBe('number');
    });

    it('should reject negative numbers', () => {
      expect(() => colorIdParamSchema.parse({ colorId: '-1' }))
        .toThrow();
    });

    it('should reject zero', () => {
      expect(() => colorIdParamSchema.parse({ colorId: '0' }))
        .toThrow();
    });

    it('should reject non-numeric strings', () => {
      expect(() => colorIdParamSchema.parse({ colorId: 'abc' }))
        .toThrow();
    });

    it('should reject decimal numbers', () => {
      expect(() => colorIdParamSchema.parse({ colorId: '5.5' }))
        .toThrow();
    });

    it('should reject missing colorId', () => {
      expect(() => colorIdParamSchema.parse({}))
        .toThrow();
    });
  });

  describe('profileColorParamsSchema', () => {
    it('should validate valid profileId and colorId', () => {
      const result = profileColorParamsSchema.parse({
        profileId: '10',
        colorId: '5'
      });
      expect(result.profileId).toBe(10);
      expect(result.colorId).toBe(5);
    });

    it('should coerce both params to numbers', () => {
      const result = profileColorParamsSchema.parse({
        profileId: '123',
        colorId: '456'
      });
      expect(typeof result.profileId).toBe('number');
      expect(typeof result.colorId).toBe('number');
    });

    it('should reject negative profileId', () => {
      expect(() => profileColorParamsSchema.parse({
        profileId: '-1',
        colorId: '5'
      })).toThrow();
    });

    it('should reject negative colorId', () => {
      expect(() => profileColorParamsSchema.parse({
        profileId: '10',
        colorId: '-5'
      })).toThrow();
    });

    it('should reject missing profileId', () => {
      expect(() => profileColorParamsSchema.parse({ colorId: '5' }))
        .toThrow();
    });

    it('should reject missing colorId', () => {
      expect(() => profileColorParamsSchema.parse({ profileId: '10' }))
        .toThrow();
    });
  });

  describe('updateStockBodySchema', () => {
    it('should validate valid update stock body', () => {
      const result = updateStockBodySchema.parse({
        currentStockBeams: 100,
        userId: 1
      });
      expect(result.currentStockBeams).toBe(100);
      expect(result.userId).toBe(1);
    });

    it('should accept zero stock', () => {
      const result = updateStockBodySchema.parse({
        currentStockBeams: 0,
        userId: 1
      });
      expect(result.currentStockBeams).toBe(0);
    });

    it('should reject negative stock', () => {
      expect(() => updateStockBodySchema.parse({
        currentStockBeams: -10,
        userId: 1
      })).toThrow();
    });

    it('should reject decimal stock', () => {
      expect(() => updateStockBodySchema.parse({
        currentStockBeams: 10.5,
        userId: 1
      })).toThrow();
    });

    it('should reject negative userId', () => {
      expect(() => updateStockBodySchema.parse({
        currentStockBeams: 100,
        userId: -1
      })).toThrow();
    });

    it('should reject zero userId', () => {
      expect(() => updateStockBodySchema.parse({
        currentStockBeams: 100,
        userId: 0
      })).toThrow();
    });

    it('should reject missing currentStockBeams', () => {
      expect(() => updateStockBodySchema.parse({ userId: 1 }))
        .toThrow();
    });

    it('should reject missing userId', () => {
      expect(() => updateStockBodySchema.parse({ currentStockBeams: 100 }))
        .toThrow();
    });
  });

  describe('monthlyUpdateBodySchema', () => {
    it('should validate valid monthly update', () => {
      const result = monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [
          { profileId: 10, actualStock: 100 },
          { profileId: 20, actualStock: 50 }
        ],
        userId: 1
      });
      expect(result.colorId).toBe(5);
      expect(result.updates).toHaveLength(2);
      expect(result.userId).toBe(1);
    });

    it('should accept single update', () => {
      const result = monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: 10, actualStock: 100 }],
        userId: 1
      });
      expect(result.updates).toHaveLength(1);
    });

    it('should accept zero actualStock', () => {
      const result = monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: 10, actualStock: 0 }],
        userId: 1
      });
      expect(result.updates[0].actualStock).toBe(0);
    });

    it('should reject empty updates array', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [],
        userId: 1
      })).toThrow();
    });

    it('should reject negative actualStock', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: 10, actualStock: -10 }],
        userId: 1
      })).toThrow();
    });

    it('should reject negative profileId in updates', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: -10, actualStock: 100 }],
        userId: 1
      })).toThrow();
    });

    it('should reject negative colorId', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: -5,
        updates: [{ profileId: 10, actualStock: 100 }],
        userId: 1
      })).toThrow();
    });

    it('should reject missing updates array', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: 5,
        userId: 1
      })).toThrow();
    });

    it('should reject decimal values', () => {
      expect(() => monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: 10, actualStock: 100.5 }],
        userId: 1
      })).toThrow();
    });
  });

  describe('rollbackInventoryBodySchema', () => {
    it('should validate valid rollback request', () => {
      const result = rollbackInventoryBodySchema.parse({
        colorId: 5,
        userId: 1
      });
      expect(result.colorId).toBe(5);
      expect(result.userId).toBe(1);
    });

    it('should reject negative colorId', () => {
      expect(() => rollbackInventoryBodySchema.parse({
        colorId: -5,
        userId: 1
      })).toThrow();
    });

    it('should reject zero colorId', () => {
      expect(() => rollbackInventoryBodySchema.parse({
        colorId: 0,
        userId: 1
      })).toThrow();
    });

    it('should reject negative userId', () => {
      expect(() => rollbackInventoryBodySchema.parse({
        colorId: 5,
        userId: -1
      })).toThrow();
    });

    it('should reject missing colorId', () => {
      expect(() => rollbackInventoryBodySchema.parse({ userId: 1 }))
        .toThrow();
    });

    it('should reject missing userId', () => {
      expect(() => rollbackInventoryBodySchema.parse({ colorId: 5 }))
        .toThrow();
    });
  });

  describe('finalizeMonthBodySchema', () => {
    it('should validate valid month format', () => {
      const result = finalizeMonthBodySchema.parse({
        month: '2025-01',
        archive: true
      });
      expect(result.month).toBe('2025-01');
      expect(result.archive).toBe(true);
    });

    it('should default archive to false', () => {
      const result = finalizeMonthBodySchema.parse({
        month: '2025-12'
      });
      expect(result.archive).toBe(false);
    });

    it('should accept archive as false', () => {
      const result = finalizeMonthBodySchema.parse({
        month: '2025-06',
        archive: false
      });
      expect(result.archive).toBe(false);
    });

    it('should reject invalid month format (YYYY-M)', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '2025-1',
        archive: true
      })).toThrow();
    });

    it('should reject invalid month format (YYYY/MM)', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '2025/01',
        archive: true
      })).toThrow();
    });

    it('should reject invalid month format (DD-MM-YYYY)', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '01-01-2025',
        archive: true
      })).toThrow();
    });

    it('should reject invalid month number (13)', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '2025-13',
        archive: true
      })).toThrow();
    });

    it('should reject invalid month number (00)', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '2025-00',
        archive: true
      })).toThrow();
    });

    it('should reject missing month', () => {
      expect(() => finalizeMonthBodySchema.parse({ archive: true }))
        .toThrow();
    });

    it('should reject non-boolean archive', () => {
      expect(() => finalizeMonthBodySchema.parse({
        month: '2025-01',
        archive: 'yes'
      })).toThrow();
    });
  });

  describe('historyQuerySchema', () => {
    it('should validate valid limit', () => {
      const result = historyQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('should default limit to 100', () => {
      const result = historyQuerySchema.parse({});
      expect(result.limit).toBe(100);
    });

    it('should coerce string to number', () => {
      const result = historyQuerySchema.parse({ limit: '200' });
      expect(typeof result.limit).toBe('number');
      expect(result.limit).toBe(200);
    });

    it('should accept minimum limit (1)', () => {
      const result = historyQuerySchema.parse({ limit: '1' });
      expect(result.limit).toBe(1);
    });

    it('should accept maximum limit (1000)', () => {
      const result = historyQuerySchema.parse({ limit: '1000' });
      expect(result.limit).toBe(1000);
    });

    it('should reject limit below minimum (0)', () => {
      expect(() => historyQuerySchema.parse({ limit: '0' }))
        .toThrow();
    });

    it('should reject limit above maximum (1001)', () => {
      expect(() => historyQuerySchema.parse({ limit: '1001' }))
        .toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => historyQuerySchema.parse({ limit: '-10' }))
        .toThrow();
    });

    it('should reject decimal limit', () => {
      expect(() => historyQuerySchema.parse({ limit: '50.5' }))
        .toThrow();
    });
  });

  describe('averageQuerySchema', () => {
    it('should validate valid months', () => {
      const result = averageQuerySchema.parse({ months: '6' });
      expect(result.months).toBe(6);
    });

    it('should default months to 6', () => {
      const result = averageQuerySchema.parse({});
      expect(result.months).toBe(6);
    });

    it('should coerce string to number', () => {
      const result = averageQuerySchema.parse({ months: '12' });
      expect(typeof result.months).toBe('number');
      expect(result.months).toBe(12);
    });

    it('should accept minimum months (1)', () => {
      const result = averageQuerySchema.parse({ months: '1' });
      expect(result.months).toBe(1);
    });

    it('should accept maximum months (24)', () => {
      const result = averageQuerySchema.parse({ months: '24' });
      expect(result.months).toBe(24);
    });

    it('should reject months below minimum (0)', () => {
      expect(() => averageQuerySchema.parse({ months: '0' }))
        .toThrow();
    });

    it('should reject months above maximum (25)', () => {
      expect(() => averageQuerySchema.parse({ months: '25' }))
        .toThrow();
    });

    it('should reject negative months', () => {
      expect(() => averageQuerySchema.parse({ months: '-5' }))
        .toThrow();
    });

    it('should reject decimal months', () => {
      expect(() => averageQuerySchema.parse({ months: '6.5' }))
        .toThrow();
    });
  });

  describe('Type exports validation', () => {
    it('should have correct type inference for colorIdParamSchema', () => {
      const result = colorIdParamSchema.parse({ colorId: '5' });
      const colorId: number = result.colorId;
      expect(colorId).toBe(5);
    });

    it('should have correct type inference for monthlyUpdateBodySchema', () => {
      const result = monthlyUpdateBodySchema.parse({
        colorId: 5,
        updates: [{ profileId: 10, actualStock: 100 }],
        userId: 1
      });
      const colorId: number = result.colorId;
      const userId: number = result.userId;
      const updates: Array<{ profileId: number; actualStock: number }> = result.updates;
      expect(colorId).toBe(5);
      expect(userId).toBe(1);
      expect(updates).toHaveLength(1);
    });
  });
});
