/**
 * Okuc CSV Parser Unit Tests
 *
 * Testy synchronicznych funkcji parsujących CSV dla modułu okuć.
 * NIE testuje funkcji asynchronicznych (parseOkucRwCsv, parseOkucDemandCsv)
 * ponieważ są tymczasowo wyłączone.
 */

import { describe, it, expect } from 'vitest';
import {
  parseOkucRwCsvSync,
  parseOkucDemandCsvSync,
  validateOkucCsvStructure,
} from './okuc-csv-parser.js';

describe('okuc-csv-parser', () => {
  // ============ validateOkucCsvStructure ============

  describe('validateOkucCsvStructure', () => {
    describe('RW validation', () => {
      it('should validate correct RW headers', () => {
        const headers = ['ArticleId', 'Qty', 'SubWarehouse', 'Reference'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
        expect(result.normalized).toEqual(['ArticleId', 'Qty', 'SubWarehouse', 'Reference']);
      });

      it('should validate minimal RW headers (only required)', () => {
        const headers = ['ArticleId', 'Qty'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });

      it('should detect missing ArticleId header', () => {
        const headers = ['Qty', 'SubWarehouse'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('ArticleId');
      });

      it('should detect missing Qty header', () => {
        const headers = ['ArticleId', 'SubWarehouse'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('Qty');
      });

      it('should detect all missing required headers', () => {
        const headers = ['SubWarehouse', 'Reference'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('ArticleId');
        expect(result.missing).toContain('Qty');
        expect(result.missing).toHaveLength(2);
      });
    });

    describe('Demand validation', () => {
      it('should validate correct Demand headers', () => {
        const headers = ['DemandId', 'ExpectedWeek', 'ArticleId', 'Qty', 'Status'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });

      it('should validate minimal Demand headers (only required)', () => {
        const headers = ['ExpectedWeek', 'ArticleId', 'Qty'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });

      it('should detect missing ExpectedWeek header', () => {
        const headers = ['ArticleId', 'Qty'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('ExpectedWeek');
      });

      it('should detect all missing required Demand headers', () => {
        const headers = ['Status'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('ExpectedWeek');
        expect(result.missing).toContain('ArticleId');
        expect(result.missing).toContain('Qty');
        expect(result.missing).toHaveLength(3);
      });
    });

    describe('Header aliases (Polish names)', () => {
      it('should normalize Polish ArticleId aliases', () => {
        const testCases = [
          ['Artykul', 'Qty'],
          ['NumerArtykulu', 'Qty'],
          ['Nr_artykulu', 'Qty'],
          ['NrArt', 'Qty'],
          ['Article', 'Qty'],
        ];

        testCases.forEach(([articleAlias, qty]) => {
          const result = validateOkucCsvStructure([articleAlias, qty], 'rw');
          expect(result.valid).toBe(true);
          expect(result.normalized).toContain('ArticleId');
        });
      });

      it('should normalize Polish Qty aliases', () => {
        const testCases = [
          ['ArticleId', 'Ilosc'],
          ['ArticleId', 'Ilość'],
          ['ArticleId', 'Quantity'],
          ['ArticleId', 'Sztuk'],
        ];

        testCases.forEach(([articleId, qtyAlias]) => {
          const result = validateOkucCsvStructure([articleId, qtyAlias], 'rw');
          expect(result.valid).toBe(true);
          expect(result.normalized).toContain('Qty');
        });
      });

      it('should normalize Polish ExpectedWeek aliases', () => {
        const testCases = [
          ['Tydzien', 'ArticleId', 'Qty'],
          ['Tydzień', 'ArticleId', 'Qty'],
          ['Week', 'ArticleId', 'Qty'],
          ['Expected_Week', 'ArticleId', 'Qty'],
        ];

        testCases.forEach((headers) => {
          const result = validateOkucCsvStructure(headers, 'demand');
          expect(result.valid).toBe(true);
          expect(result.normalized).toContain('ExpectedWeek');
        });
      });

      it('should normalize Polish DemandId aliases', () => {
        const headers = ['ZAP', 'ExpectedWeek', 'ArticleId', 'Qty'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(true);
        expect(result.normalized).toContain('DemandId');
      });

      it('should normalize Polish Status aliases', () => {
        const headers = ['ExpectedWeek', 'ArticleId', 'Qty', 'Stan'];
        const result = validateOkucCsvStructure(headers, 'demand');

        expect(result.valid).toBe(true);
        expect(result.normalized).toContain('Status');
      });

      it('should normalize Polish SubWarehouse aliases', () => {
        const headers = ['ArticleId', 'Qty', 'Podmagazyn'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(true);
        expect(result.normalized).toContain('SubWarehouse');
      });

      it('should normalize Polish Reference aliases', () => {
        const testCases = [
          ['ArticleId', 'Qty', 'Referencja'],
          ['ArticleId', 'Qty', 'Ref'],
          ['ArticleId', 'Qty', 'NrDokumentu'],
          ['ArticleId', 'Qty', 'Nr_RW'],
        ];

        testCases.forEach((headers) => {
          const result = validateOkucCsvStructure(headers, 'rw');
          expect(result.valid).toBe(true);
          expect(result.normalized).toContain('Reference');
        });
      });

      it('should be case-insensitive when matching aliases', () => {
        const testCases = [
          ['articleid', 'qty'],
          ['ARTICLEID', 'QTY'],
          ['ArticleID', 'QTY'],
          ['ARTYKUL', 'ILOSC'],
        ];

        testCases.forEach((headers) => {
          const result = validateOkucCsvStructure(headers, 'rw');
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle headers with whitespace', () => {
        const headers = ['  ArticleId  ', '  Qty  '];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(true);
      });

      it('should preserve unknown headers unchanged', () => {
        const headers = ['ArticleId', 'Qty', 'CustomColumn'];
        const result = validateOkucCsvStructure(headers, 'rw');

        expect(result.valid).toBe(true);
        expect(result.normalized).toContain('CustomColumn');
      });

      it('should handle empty headers array', () => {
        const result = validateOkucCsvStructure([], 'rw');

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('ArticleId');
        expect(result.missing).toContain('Qty');
      });
    });
  });

  // ============ parseOkucRwCsvSync ============

  describe('parseOkucRwCsvSync', () => {
    describe('Happy path - correct CSV parsing', () => {
      it('should parse simple RW CSV with required columns', () => {
        const csv = `ArticleId;Qty
A123;50
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ articleId: 'A123', quantity: 50 });
        expect(result[1]).toEqual({ articleId: 'B456', quantity: 100 });
      });

      it('should parse RW CSV with optional Reference column', () => {
        const csv = `ArticleId;Qty;Reference
A123;50;RW-2025-001
B456;100;RW-2025-002`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          articleId: 'A123',
          quantity: 50,
          reference: 'RW-2025-001',
        });
        expect(result[1]).toEqual({
          articleId: 'B456',
          quantity: 100,
          reference: 'RW-2025-002',
        });
      });

      it('should parse RW CSV with all columns', () => {
        const csv = `ArticleId;Qty;SubWarehouse;Reference
A123;50;production;RW-2025-001`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          articleId: 'A123',
          quantity: 50,
          reference: 'RW-2025-001',
        });
      });

      it('should handle empty Reference value', () => {
        const csv = `ArticleId;Qty;Reference
A123;50;`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].reference).toBeUndefined();
      });
    });

    describe('Polish aliases', () => {
      it('should parse CSV with Polish headers', () => {
        const csv = `Artykul;Ilosc;Referencja
A123;50;RW-001`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          articleId: 'A123',
          quantity: 50,
          reference: 'RW-001',
        });
      });

      it('should parse CSV with mixed Polish and English headers', () => {
        const csv = `NumerArtykulu;Qty;Nr_RW
A123;50;RW-001`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          articleId: 'A123',
          quantity: 50,
          reference: 'RW-001',
        });
      });
    });

    describe('UTF-8 BOM handling', () => {
      it('should handle UTF-8 BOM at the beginning of file', () => {
        // UTF-8 BOM: \uFEFF
        const csv = '\uFEFFArticleId;Qty\nA123;50';

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ articleId: 'A123', quantity: 50 });
      });

      it('should work correctly without BOM', () => {
        const csv = 'ArticleId;Qty\nA123;50';

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ articleId: 'A123', quantity: 50 });
      });
    });

    describe('Different line endings', () => {
      it('should handle Windows line endings (CRLF)', () => {
        const csv = 'ArticleId;Qty\r\nA123;50\r\nB456;100';

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
      });

      it('should handle Unix line endings (LF)', () => {
        const csv = 'ArticleId;Qty\nA123;50\nB456;100';

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
      });

      it('should handle mixed line endings', () => {
        const csv = 'ArticleId;Qty\r\nA123;50\nB456;100';

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
      });
    });

    describe('Empty rows handling', () => {
      it('should skip empty rows', () => {
        const csv = `ArticleId;Qty
A123;50

B456;100

`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
      });

      it('should skip rows with only whitespace', () => {
        const csv = `ArticleId;Qty
A123;50

B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(2);
      });
    });

    describe('Incomplete data handling', () => {
      it('should skip rows with missing ArticleId', () => {
        const csv = `ArticleId;Qty
;50
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with missing Qty', () => {
        const csv = `ArticleId;Qty
A123;
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with missing both required fields', () => {
        const csv = `ArticleId;Qty
;
A123;50`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
      });
    });

    describe('Invalid quantities', () => {
      it('should skip rows with NaN quantity', () => {
        const csv = `ArticleId;Qty
A123;abc
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with negative quantity', () => {
        const csv = `ArticleId;Qty
A123;-50
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with zero quantity', () => {
        const csv = `ArticleId;Qty
A123;0
B456;100`;

        const result = parseOkucRwCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should handle decimal quantities by parsing as integer', () => {
        const csv = `ArticleId;Qty
A123;50.5`;

        const result = parseOkucRwCsvSync(csv);

        // parseInt("50.5") = 50
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(50);
      });
    });

    describe('Error handling', () => {
      it('should throw error for empty file', () => {
        expect(() => parseOkucRwCsvSync('')).toThrow('Plik CSV jest pusty lub nieprawidłowy');
      });

      it('should throw error for file with only header', () => {
        const csv = 'ArticleId;Qty';

        expect(() => parseOkucRwCsvSync(csv)).toThrow('Plik CSV jest pusty lub nieprawidłowy');
      });

      it('should throw error for missing required headers', () => {
        const csv = `SubWarehouse;Reference
production;RW-001`;

        expect(() => parseOkucRwCsvSync(csv)).toThrow('Brak wymaganych nagłówków');
      });

      it('should include missing headers in error message', () => {
        const csv = `SubWarehouse;Reference
production;RW-001`;

        expect(() => parseOkucRwCsvSync(csv)).toThrow(/ArticleId/);
        expect(() => parseOkucRwCsvSync(csv)).toThrow(/Qty/);
      });
    });

    describe('Whitespace handling', () => {
      it('should trim whitespace from values', () => {
        const csv = `ArticleId;Qty;Reference
  A123  ;  50  ;  RW-001  `;

        const result = parseOkucRwCsvSync(csv);

        expect(result[0].articleId).toBe('A123');
        expect(result[0].quantity).toBe(50);
        expect(result[0].reference).toBe('RW-001');
      });
    });
  });

  // ============ parseOkucDemandCsvSync ============

  describe('parseOkucDemandCsvSync', () => {
    describe('Happy path - correct CSV parsing', () => {
      it('should parse simple Demand CSV with required columns', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          articleId: 'A123',
          expectedWeek: '2025-W08',
          quantity: 50,
        });
        expect(result[1]).toEqual({
          articleId: 'B456',
          expectedWeek: '2025-W09',
          quantity: 100,
        });
      });

      it('should parse Demand CSV with all columns', () => {
        const csv = `DemandId;ExpectedWeek;ArticleId;Qty;Status
ZAP-001;2025-W08;A123;50;confirmed`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          demandId: 'ZAP-001',
          expectedWeek: '2025-W08',
          articleId: 'A123',
          quantity: 50,
          status: 'confirmed',
        });
      });

      it('should handle empty optional columns', () => {
        const csv = `DemandId;ExpectedWeek;ArticleId;Qty;Status
;2025-W08;A123;50;`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].demandId).toBeUndefined();
        expect(result[0].status).toBeUndefined();
      });
    });

    describe('Week format validation (YYYY-Www)', () => {
      it('should accept valid week format 2025-W08', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;50`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].expectedWeek).toBe('2025-W08');
      });

      it('should accept valid week format with week 01', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W01;A123;50`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
      });

      it('should accept valid week format with week 52', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W52;A123;50`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
      });

      it('should skip rows with invalid week format - missing W', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-08;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with invalid week format - lowercase w', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-w08;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with invalid week format - single digit week', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W8;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with invalid week format - wrong separator', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025/W08;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with invalid week format - text', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
tydzien08;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });
    });

    describe('Polish aliases', () => {
      it('should parse CSV with Polish headers', () => {
        const csv = `Tydzien;Artykul;Ilosc
2025-W08;A123;50`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          articleId: 'A123',
          expectedWeek: '2025-W08',
          quantity: 50,
        });
      });

      it('should parse CSV with ZAP as DemandId alias', () => {
        const csv = `ZAP;Tydzien;Artykul;Ilosc;Stan
ZAP-001;2025-W08;A123;50;potwierdzone`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].demandId).toBe('ZAP-001');
        expect(result[0].status).toBe('potwierdzone');
      });
    });

    describe('UTF-8 BOM handling', () => {
      it('should handle UTF-8 BOM at the beginning of file', () => {
        const csv = '\uFEFFExpectedWeek;ArticleId;Qty\n2025-W08;A123;50';

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].expectedWeek).toBe('2025-W08');
      });
    });

    describe('Empty rows handling', () => {
      it('should skip empty rows', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;50

2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(2);
      });
    });

    describe('Incomplete data handling', () => {
      it('should skip rows with missing ExpectedWeek', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
;A123;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with missing ArticleId', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;;50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with missing Qty', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });
    });

    describe('Invalid quantities', () => {
      it('should skip rows with NaN quantity', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;abc
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with negative quantity', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;-50
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });

      it('should skip rows with zero quantity', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A123;0
2025-W09;B456;100`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(1);
        expect(result[0].articleId).toBe('B456');
      });
    });

    describe('Error handling', () => {
      it('should throw error for empty file', () => {
        expect(() => parseOkucDemandCsvSync('')).toThrow('Plik CSV jest pusty lub nieprawidłowy');
      });

      it('should throw error for file with only header', () => {
        const csv = 'ExpectedWeek;ArticleId;Qty';

        expect(() => parseOkucDemandCsvSync(csv)).toThrow('Plik CSV jest pusty lub nieprawidłowy');
      });

      it('should throw error for missing required headers', () => {
        const csv = `DemandId;Status
ZAP-001;confirmed`;

        expect(() => parseOkucDemandCsvSync(csv)).toThrow('Brak wymaganych nagłówków');
      });

      it('should include missing headers in error message', () => {
        const csv = `DemandId;Status
ZAP-001;confirmed`;

        expect(() => parseOkucDemandCsvSync(csv)).toThrow(/ExpectedWeek/);
        expect(() => parseOkucDemandCsvSync(csv)).toThrow(/ArticleId/);
        expect(() => parseOkucDemandCsvSync(csv)).toThrow(/Qty/);
      });
    });

    describe('Whitespace handling', () => {
      it('should trim whitespace from values', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
  2025-W08  ;  A123  ;  50  `;

        const result = parseOkucDemandCsvSync(csv);

        expect(result[0].expectedWeek).toBe('2025-W08');
        expect(result[0].articleId).toBe('A123');
        expect(result[0].quantity).toBe(50);
      });
    });

    describe('Multiple rows parsing', () => {
      it('should parse multiple valid rows correctly', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A001;10
2025-W08;A002;20
2025-W09;A001;15
2025-W10;A003;30`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(4);
        expect(result.map((r) => r.articleId)).toEqual(['A001', 'A002', 'A001', 'A003']);
      });

      it('should skip invalid rows and continue parsing valid ones', () => {
        const csv = `ExpectedWeek;ArticleId;Qty
2025-W08;A001;10
invalid-week;A002;20
2025-W09;;15
2025-W10;A003;30`;

        const result = parseOkucDemandCsvSync(csv);

        expect(result).toHaveLength(2);
        expect(result[0].articleId).toBe('A001');
        expect(result[1].articleId).toBe('A003');
      });
    });
  });

  // ============ Integration scenarios ============

  describe('Integration scenarios', () => {
    it('should handle real-world RW CSV data', () => {
      // Symulacja eksportu z systemu - z BOM, polskimi nagłówkami i pustymi wierszami
      const csv = `\uFEFFArtykul;Ilosc;Nr_RW
A-001-PL;150;RW/2025/0001
A-002-PL;75;RW/2025/0001

A-003-PL;200;RW/2025/0002
`;

      const result = parseOkucRwCsvSync(csv);

      expect(result).toHaveLength(3);
      expect(result[0].articleId).toBe('A-001-PL');
      expect(result[0].quantity).toBe(150);
      expect(result[0].reference).toBe('RW/2025/0001');
    });

    it('should handle real-world Demand CSV data', () => {
      // Symulacja eksportu z systemu - z BOM, polskimi nagłówkami i pustymi wierszami
      const csv = `\uFEFFZAP;Tydzien;Artykul;Ilosc;Stan
ZAP/2025/001;2025-W08;A-001-PL;150;potwierdzone
ZAP/2025/001;2025-W08;A-002-PL;75;potwierdzone

ZAP/2025/002;2025-W09;A-001-PL;200;
`;

      const result = parseOkucDemandCsvSync(csv);

      expect(result).toHaveLength(3);
      expect(result[0].demandId).toBe('ZAP/2025/001');
      expect(result[0].expectedWeek).toBe('2025-W08');
      expect(result[0].status).toBe('potwierdzone');
      expect(result[2].status).toBeUndefined();
    });
  });
});
