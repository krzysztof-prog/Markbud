/**
 * Label Check Validator Tests (TDD)
 *
 * Testy jednostkowe dla walidatorów Zod modulu label-check.
 * Pisane w stylu TDD - testy FAIL dopoki nie zaimplementujemy walidatorow.
 *
 * Statusy sprawdzania etykiet:
 * - OK: Etykieta zgodna z zamowieniem
 * - MISMATCH: Etykieta niezgodna z zamowieniem
 * - NO_FOLDER: Brak folderu z etykietami
 * - NO_BMP: Brak pliku BMP etykiety
 * - OCR_ERROR: Blad rozpoznawania tekstu
 */

import { describe, it, expect } from 'vitest';
import {
  createLabelCheckSchema,
  labelCheckIdSchema,
  labelCheckQuerySchema,
  labelCheckResultStatusSchema,
} from './label-check.js';

describe('Label Check Validators', () => {

  // =========================================================================
  // createLabelCheckSchema - walidacja tworzenia nowego sprawdzenia etykiety
  // =========================================================================
  describe('createLabelCheckSchema', () => {

    describe('deliveryId validation', () => {
      it('should accept valid deliveryId (positive number)', () => {
        const result = createLabelCheckSchema.parse({ deliveryId: 1 });
        expect(result.deliveryId).toBe(1);
      });

      it('should accept large deliveryId', () => {
        const result = createLabelCheckSchema.parse({ deliveryId: 99999 });
        expect(result.deliveryId).toBe(99999);
      });

      it('should reject deliveryId = 0', () => {
        expect(() => createLabelCheckSchema.parse({ deliveryId: 0 }))
          .toThrow();
      });

      it('should reject negative deliveryId', () => {
        expect(() => createLabelCheckSchema.parse({ deliveryId: -1 }))
          .toThrow();
      });

      it('should reject missing deliveryId', () => {
        expect(() => createLabelCheckSchema.parse({}))
          .toThrow();
      });

      it('should reject null deliveryId', () => {
        expect(() => createLabelCheckSchema.parse({ deliveryId: null }))
          .toThrow();
      });

      it('should reject string deliveryId', () => {
        expect(() => createLabelCheckSchema.parse({ deliveryId: 'abc' }))
          .toThrow();
      });

      it('should reject decimal deliveryId', () => {
        expect(() => createLabelCheckSchema.parse({ deliveryId: 1.5 }))
          .toThrow();
      });
    });

    describe('type inference', () => {
      it('should have correct type for deliveryId', () => {
        const result = createLabelCheckSchema.parse({ deliveryId: 42 });
        const deliveryId: number = result.deliveryId;
        expect(deliveryId).toBe(42);
      });
    });
  });

  // =========================================================================
  // labelCheckIdSchema - walidacja ID sprawdzenia etykiety (params)
  // =========================================================================
  describe('labelCheckIdSchema', () => {

    describe('id validation', () => {
      it('should accept valid id (positive number)', () => {
        const result = labelCheckIdSchema.parse({ id: 1 });
        expect(result.id).toBe(1);
      });

      it('should coerce string to number', () => {
        const result = labelCheckIdSchema.parse({ id: '123' });
        expect(result.id).toBe(123);
        expect(typeof result.id).toBe('number');
      });

      it('should accept large id', () => {
        const result = labelCheckIdSchema.parse({ id: '999999' });
        expect(result.id).toBe(999999);
      });

      it('should reject id = 0', () => {
        expect(() => labelCheckIdSchema.parse({ id: '0' }))
          .toThrow();
      });

      it('should reject negative id', () => {
        expect(() => labelCheckIdSchema.parse({ id: '-5' }))
          .toThrow();
      });

      it('should reject non-numeric string', () => {
        expect(() => labelCheckIdSchema.parse({ id: 'abc' }))
          .toThrow();
      });

      it('should reject missing id', () => {
        expect(() => labelCheckIdSchema.parse({}))
          .toThrow();
      });

      it('should reject decimal string', () => {
        expect(() => labelCheckIdSchema.parse({ id: '5.5' }))
          .toThrow();
      });
    });

    describe('type inference', () => {
      it('should have correct type for id', () => {
        const result = labelCheckIdSchema.parse({ id: '42' });
        const id: number = result.id;
        expect(id).toBe(42);
      });
    });
  });

  // =========================================================================
  // labelCheckQuerySchema - walidacja query parameters dla listy sprawdzen
  // =========================================================================
  describe('labelCheckQuerySchema', () => {

    describe('empty query (all filters optional)', () => {
      it('should accept empty object', () => {
        const result = labelCheckQuerySchema.parse({});
        expect(result).toBeDefined();
      });
    });

    describe('status filter', () => {
      it('should accept status = "pending"', () => {
        const result = labelCheckQuerySchema.parse({ status: 'pending' });
        expect(result.status).toBe('pending');
      });

      it('should accept status = "completed"', () => {
        const result = labelCheckQuerySchema.parse({ status: 'completed' });
        expect(result.status).toBe('completed');
      });

      it('should accept status = "failed"', () => {
        const result = labelCheckQuerySchema.parse({ status: 'failed' });
        expect(result.status).toBe('failed');
      });

      it('should reject invalid status', () => {
        expect(() => labelCheckQuerySchema.parse({ status: 'unknown' }))
          .toThrow();
      });

      it('should reject empty status string', () => {
        expect(() => labelCheckQuerySchema.parse({ status: '' }))
          .toThrow();
      });
    });

    describe('deliveryId filter', () => {
      it('should accept valid deliveryId', () => {
        const result = labelCheckQuerySchema.parse({ deliveryId: '5' });
        expect(result.deliveryId).toBe(5);
      });

      it('should coerce deliveryId string to number', () => {
        const result = labelCheckQuerySchema.parse({ deliveryId: '123' });
        expect(typeof result.deliveryId).toBe('number');
      });

      it('should reject negative deliveryId', () => {
        expect(() => labelCheckQuerySchema.parse({ deliveryId: '-1' }))
          .toThrow();
      });

      it('should reject zero deliveryId', () => {
        expect(() => labelCheckQuerySchema.parse({ deliveryId: '0' }))
          .toThrow();
      });
    });

    describe('date filters (from/to)', () => {
      it('should accept valid from date (ISO format)', () => {
        const result = labelCheckQuerySchema.parse({ from: '2025-01-15' });
        expect(result.from).toBe('2025-01-15');
      });

      it('should accept valid to date (ISO format)', () => {
        const result = labelCheckQuerySchema.parse({ to: '2025-12-31' });
        expect(result.to).toBe('2025-12-31');
      });

      it('should accept both from and to dates', () => {
        const result = labelCheckQuerySchema.parse({
          from: '2025-01-01',
          to: '2025-01-31'
        });
        expect(result.from).toBe('2025-01-01');
        expect(result.to).toBe('2025-01-31');
      });

      it('should accept ISO datetime format', () => {
        const result = labelCheckQuerySchema.parse({
          from: '2025-01-15T10:30:00Z'
        });
        expect(result.from).toBe('2025-01-15T10:30:00Z');
      });

      it('should reject invalid date format', () => {
        expect(() => labelCheckQuerySchema.parse({ from: '15-01-2025' }))
          .toThrow();
      });

      it('should reject invalid date string', () => {
        expect(() => labelCheckQuerySchema.parse({ from: 'not-a-date' }))
          .toThrow();
      });
    });

    describe('pagination (page, limit)', () => {
      it('should accept valid page number', () => {
        const result = labelCheckQuerySchema.parse({ page: '1' });
        expect(result.page).toBe(1);
      });

      it('should accept valid limit', () => {
        const result = labelCheckQuerySchema.parse({ limit: '50' });
        expect(result.limit).toBe(50);
      });

      it('should accept both page and limit', () => {
        const result = labelCheckQuerySchema.parse({ page: '2', limit: '25' });
        expect(result.page).toBe(2);
        expect(result.limit).toBe(25);
      });

      it('should have default page value', () => {
        const result = labelCheckQuerySchema.parse({});
        expect(result.page).toBe(1);
      });

      it('should have default limit value', () => {
        const result = labelCheckQuerySchema.parse({});
        expect(result.limit).toBe(20);
      });

      it('should reject page = 0', () => {
        expect(() => labelCheckQuerySchema.parse({ page: '0' }))
          .toThrow();
      });

      it('should reject negative page', () => {
        expect(() => labelCheckQuerySchema.parse({ page: '-1' }))
          .toThrow();
      });

      it('should reject limit = 0', () => {
        expect(() => labelCheckQuerySchema.parse({ limit: '0' }))
          .toThrow();
      });

      it('should reject limit > 100', () => {
        expect(() => labelCheckQuerySchema.parse({ limit: '101' }))
          .toThrow();
      });
    });

    describe('combined filters', () => {
      it('should accept all filters together', () => {
        const result = labelCheckQuerySchema.parse({
          status: 'completed',
          deliveryId: '10',
          from: '2025-01-01',
          to: '2025-01-31',
          page: '1',
          limit: '20'
        });
        expect(result.status).toBe('completed');
        expect(result.deliveryId).toBe(10);
        expect(result.from).toBe('2025-01-01');
        expect(result.to).toBe('2025-01-31');
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
      });
    });
  });

  // =========================================================================
  // labelCheckResultStatusSchema - walidacja statusu wyniku sprawdzenia
  // =========================================================================
  describe('labelCheckResultStatusSchema', () => {

    describe('valid statuses', () => {
      it('should accept "OK"', () => {
        const result = labelCheckResultStatusSchema.parse('OK');
        expect(result).toBe('OK');
      });

      it('should accept "MISMATCH"', () => {
        const result = labelCheckResultStatusSchema.parse('MISMATCH');
        expect(result).toBe('MISMATCH');
      });

      it('should accept "NO_FOLDER"', () => {
        const result = labelCheckResultStatusSchema.parse('NO_FOLDER');
        expect(result).toBe('NO_FOLDER');
      });

      it('should accept "NO_BMP"', () => {
        const result = labelCheckResultStatusSchema.parse('NO_BMP');
        expect(result).toBe('NO_BMP');
      });

      it('should accept "OCR_ERROR"', () => {
        const result = labelCheckResultStatusSchema.parse('OCR_ERROR');
        expect(result).toBe('OCR_ERROR');
      });
    });

    describe('invalid statuses', () => {
      it('should reject lowercase "ok"', () => {
        expect(() => labelCheckResultStatusSchema.parse('ok'))
          .toThrow();
      });

      it('should reject lowercase "mismatch"', () => {
        expect(() => labelCheckResultStatusSchema.parse('mismatch'))
          .toThrow();
      });

      it('should reject unknown status', () => {
        expect(() => labelCheckResultStatusSchema.parse('UNKNOWN'))
          .toThrow();
      });

      it('should reject empty string', () => {
        expect(() => labelCheckResultStatusSchema.parse(''))
          .toThrow();
      });

      it('should reject null', () => {
        expect(() => labelCheckResultStatusSchema.parse(null))
          .toThrow();
      });

      it('should reject undefined', () => {
        expect(() => labelCheckResultStatusSchema.parse(undefined))
          .toThrow();
      });

      it('should reject number', () => {
        expect(() => labelCheckResultStatusSchema.parse(1))
          .toThrow();
      });

      it('should reject status with extra whitespace', () => {
        expect(() => labelCheckResultStatusSchema.parse(' OK '))
          .toThrow();
      });

      it('should reject partial match', () => {
        expect(() => labelCheckResultStatusSchema.parse('OK_PARTIAL'))
          .toThrow();
      });
    });

    describe('type inference', () => {
      it('should have correct union type', () => {
        const result = labelCheckResultStatusSchema.parse('OK');
        // TypeScript: result should be 'OK' | 'MISMATCH' | 'NO_FOLDER' | 'NO_BMP' | 'OCR_ERROR'
        const status: 'OK' | 'MISMATCH' | 'NO_FOLDER' | 'NO_BMP' | 'OCR_ERROR' = result;
        expect(status).toBe('OK');
      });
    });
  });

  // =========================================================================
  // Type exports validation
  // =========================================================================
  describe('Type exports validation', () => {
    it('should correctly infer CreateLabelCheck type', () => {
      const input = { deliveryId: 1 };
      const result = createLabelCheckSchema.parse(input);

      // Sprawdzamy ze typ jest poprawnie inferowany
      expect(result.deliveryId).toBeTypeOf('number');
    });

    it('should correctly infer LabelCheckQuery type', () => {
      const query = {
        status: 'completed',
        deliveryId: '5',
        page: '1',
        limit: '20'
      };
      const result = labelCheckQuerySchema.parse(query);

      expect(result.status).toBeTypeOf('string');
      expect(result.deliveryId).toBeTypeOf('number');
      expect(result.page).toBeTypeOf('number');
      expect(result.limit).toBeTypeOf('number');
    });
  });

});
