/**
 * Common Validators Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  dateSchema,
  optionalDateSchema,
  nullableDateSchema,
  idParamsSchema,
  paginationQuerySchema,
  dateRangeQuerySchema,
} from './common.js';

describe('Common Validators', () => {
  describe('dateSchema', () => {
    it('should accept ISO datetime string', () => {
      const result = dateSchema.safeParse('2025-01-15T10:30:00.000Z');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('2025-01-15T10:30:00.000Z');
      }
    });

    it('should coerce Date object to ISO string', () => {
      const date = new Date('2025-01-15T10:30:00.000Z');
      const result = dateSchema.safeParse(date);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('2025-01-15T10:30:00.000Z');
      }
    });

    it('should accept date-only string and coerce to ISO', () => {
      const result = dateSchema.safeParse('2025-01-15');
      expect(result.success).toBe(true);
    });

    it('should reject invalid date string', () => {
      const result = dateSchema.safeParse('not-a-date');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = dateSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('optionalDateSchema', () => {
    it('should accept valid date', () => {
      const result = optionalDateSchema.safeParse('2025-01-15T10:30:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should accept undefined', () => {
      const result = optionalDateSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('nullableDateSchema', () => {
    it('should accept valid date', () => {
      const result = nullableDateSchema.safeParse('2025-01-15T10:30:00.000Z');
      expect(result.success).toBe(true);
    });

    it('should accept null', () => {
      const result = nullableDateSchema.safeParse(null);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should accept undefined', () => {
      const result = nullableDateSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('idParamsSchema', () => {
    it('should create schema for delivery ID', () => {
      const schema = idParamsSchema('delivery');
      const result = schema.safeParse({ id: '123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123');
      }
    });

    it('should reject non-numeric ID', () => {
      const schema = idParamsSchema('order');
      const result = schema.safeParse({ id: 'abc' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('order');
      }
    });

    it('should reject negative ID', () => {
      const schema = idParamsSchema('profile');
      const result = schema.safeParse({ id: '-5' });
      expect(result.success).toBe(false);
    });

    it('should accept zero ID', () => {
      const schema = idParamsSchema('color');
      const result = schema.safeParse({ id: '0' });
      // Note: 0 is technically valid for regex /^\d+$/, behavior depends on requirements
      expect(result.success).toBe(true);
    });
  });

  describe('paginationQuerySchema', () => {
    it('should parse skip and take as numbers', () => {
      const result = paginationQuerySchema.safeParse({ skip: '10', take: '20' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skip).toBe(10);
        expect(result.data.take).toBe(20);
      }
    });

    it('should use defaults when not provided', () => {
      const result = paginationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skip).toBe(0); // Default is 0, not undefined
        expect(result.data.take).toBe(50); // Default is 50, not undefined
      }
    });

    it('should reject non-numeric skip', () => {
      const result = paginationQuerySchema.safeParse({ skip: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeQuerySchema', () => {
    it('should parse from and to dates', () => {
      const result = dateRangeQuerySchema.safeParse({
        from: '2025-01-01',
        to: '2025-01-31',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe('2025-01-01');
        expect(result.data.to).toBe('2025-01-31');
      }
    });

    it('should accept partial range (from only)', () => {
      const result = dateRangeQuerySchema.safeParse({ from: '2025-01-01' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe('2025-01-01');
        expect(result.data.to).toBeUndefined();
      }
    });

    it('should accept empty range', () => {
      const result = dateRangeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
