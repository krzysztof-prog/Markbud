import { describe, it, expect } from 'vitest';
import {
  extractOrderNumbers,
  parseDeliveryWeek,
  aggregateSchucoStatus,
} from './schucoOrderMatcher.js';

/**
 * Performance tests for Schuco Order Matcher
 * These tests ensure functions perform well with large datasets
 */

describe('SchucoOrderMatcher - Performance Tests', () => {
  describe('extractOrderNumbers - Performance', () => {
    it('should handle 1000 order numbers in reasonable time', () => {
      const orderNumbers = Array.from({ length: 1000 }, (_, i) => (50000 + i).toString());
      const input = orderNumbers.join('/');

      const start = performance.now();
      const result = extractOrderNumbers(input);
      const duration = performance.now() - start;

      expect(result.length).toBe(1000);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle very long strings efficiently', () => {
      // Create a 10MB string
      const input = 'X'.repeat(1000000) + '54255' + 'Y'.repeat(1000000);

      const start = performance.now();
      const result = extractOrderNumbers(input);
      const duration = performance.now() - start;

      expect(result).toEqual(['54255']);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle repeated extractions efficiently', () => {
      const input = '123/2026/54255/54365/54321';

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        extractOrderNumbers(input);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // 10k iterations in under 500ms
    });

    it('should not have memory leaks with large Set deduplication', () => {
      // Create input with 5000 duplicate numbers
      const numbers = Array(5000).fill('54255');
      const input = numbers.join('/');

      const start = performance.now();
      const result = extractOrderNumbers(input);
      const duration = performance.now() - start;

      expect(result).toEqual(['54255']); // Deduplicated to one
      expect(duration).toBeLessThan(100);
    });
  });

  describe('parseDeliveryWeek - Performance', () => {
    it('should handle 1000 date parsings efficiently', () => {
      const weeks = Array.from({ length: 1000 }, (_, i) => `KW ${(i % 52) + 1}/2026`);

      const start = performance.now();
      weeks.forEach((week) => parseDeliveryWeek(week));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // 1000 parsings in under 200ms
    });

    it('should handle repeated parsing of same date efficiently', () => {
      const input = 'KW 15/2026';

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        parseDeliveryWeek(input);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(300); // 10k parsings in under 300ms
    });

    it('should handle null/invalid inputs efficiently', () => {
      const inputs = [null, '', 'invalid', 'KW/2026', 'random'];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        inputs.forEach((input) => parseDeliveryWeek(input));
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Fast rejection of invalid inputs
    });
  });

  describe('aggregateSchucoStatus - Performance', () => {
    it('should handle 1000 statuses efficiently', () => {
      const statuses = Array(1000).fill('Dostarczone');
      statuses[500] = 'Otwarte'; // Worst status in the middle

      const start = performance.now();
      const result = aggregateSchucoStatus(statuses);
      const duration = performance.now() - start;

      expect(result.toLowerCase()).toBe('otwarte');
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle worst-case scenario (worst status at end)', () => {
      const statuses = Array(1000).fill('Dostarczone');
      statuses[999] = 'Otwarte'; // Worst status at the very end

      const start = performance.now();
      const result = aggregateSchucoStatus(statuses);
      const duration = performance.now() - start;

      expect(result.toLowerCase()).toBe('otwarte');
      expect(duration).toBeLessThan(50); // Still fast even in worst case
    });

    it('should handle best-case scenario (worst status at start)', () => {
      const statuses = Array(1000).fill('Dostarczone');
      statuses[0] = 'Otwarte'; // Worst status at the start

      const start = performance.now();
      const result = aggregateSchucoStatus(statuses);
      const duration = performance.now() - start;

      expect(result.toLowerCase()).toBe('otwarte');
      expect(duration).toBeLessThan(50); // Fast even with early exit possible
    });

    it('should handle mixed known and unknown statuses', () => {
      const statuses = [];
      for (let i = 0; i < 500; i++) {
        statuses.push('Dostarczone');
        statuses.push(`Unknown${i}`);
      }

      const start = performance.now();
      const _result = aggregateSchucoStatus(statuses);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should handle mixed efficiently
    });

    it('should handle repeated aggregations efficiently', () => {
      const statuses = ['Dostarczone', 'Otwarte', 'Wysłane', 'w realizacji'];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        aggregateSchucoStatus(statuses);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(300); // 10k aggregations in under 300ms
    });
  });

  describe('Combined operations - Realistic scenarios', () => {
    it('should handle processing 100 deliveries efficiently', () => {
      const deliveries = Array.from({ length: 100 }, (_, i) => ({
        orderNumber: `123/2026/${50000 + i}/${50100 + i}`,
        deliveryWeek: `KW ${(i % 52) + 1}/2026`,
        statuses: ['Dostarczone', 'Otwarte', 'Wysłane'],
      }));

      const start = performance.now();
      deliveries.forEach((delivery) => {
        extractOrderNumbers(delivery.orderNumber);
        parseDeliveryWeek(delivery.deliveryWeek);
        aggregateSchucoStatus(delivery.statuses);
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Full processing in under 500ms
    });

    it('should handle high-volume import scenario (1000 deliveries)', () => {
      const deliveries = Array.from({ length: 1000 }, (_, i) => ({
        orderNumber: `${i}/2026/${50000 + (i % 1000)}`,
        deliveryWeek: `KW ${(i % 52) + 1}/2026`,
        statuses: ['Dostarczone'],
      }));

      const start = performance.now();

      const results = deliveries.map((delivery) => {
        const orderNums = extractOrderNumbers(delivery.orderNumber);
        const date = parseDeliveryWeek(delivery.deliveryWeek);
        const status = aggregateSchucoStatus(delivery.statuses);

        return {
          orderNums,
          date,
          status,
          isWarehouse: orderNums.length === 0,
        };
      });

      const duration = performance.now() - start;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(2000); // 1000 deliveries in under 2 seconds
    });
  });

  describe('Memory usage tests', () => {
    it('should not leak memory with repeated Set operations', () => {
      // Run multiple times to check for memory leaks
      for (let iteration = 0; iteration < 100; iteration++) {
        const input = Array(100).fill('54255').join('/');
        const result = extractOrderNumbers(input);
        expect(result.length).toBe(1);
      }
      // If test completes without hanging, no obvious memory leak
    });

    it('should not leak memory with repeated date calculations', () => {
      for (let iteration = 0; iteration < 100; iteration++) {
        for (let week = 1; week <= 52; week++) {
          parseDeliveryWeek(`KW ${week}/2026`);
        }
      }
      // If test completes without hanging, no obvious memory leak
    });

    it('should handle large arrays without memory issues', () => {
      const largeArray = Array(10000).fill('Dostarczone');
      largeArray[5000] = 'Otwarte';

      // Run multiple times
      for (let i = 0; i < 10; i++) {
        const result = aggregateSchucoStatus(largeArray);
        expect(result.toLowerCase()).toBe('otwarte');
      }
    });
  });

  describe('Stress tests', () => {
    it('should handle pathological input - all warehouse items', () => {
      const inputs = Array(1000).fill('PALETA-MAG-WAREHOUSE-2026-001');

      const start = performance.now();
      const results = inputs.map((input) => extractOrderNumbers(input));
      const duration = performance.now() - start;

      expect(results.every((r) => r.length === 0)).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    it('should handle pathological input - maximum order numbers', () => {
      // 100 order numbers in one delivery
      const orderNums = Array.from({ length: 100 }, (_, i) => (50000 + i).toString());
      const input = orderNums.join('/');

      const start = performance.now();
      const result = extractOrderNumbers(input);
      const duration = performance.now() - start;

      expect(result.length).toBe(100);
      expect(duration).toBeLessThan(50);
    });

    it('should handle edge case - alternating valid/invalid formats', () => {
      const parts = [];
      for (let i = 0; i < 500; i++) {
        parts.push(i % 2 === 0 ? '54255' : '1234'); // Alternate 5-digit and 4-digit
      }
      const input = parts.join('/');

      const start = performance.now();
      const result = extractOrderNumbers(input);
      const duration = performance.now() - start;

      expect(result.length).toBe(1); // Only '54255' (deduplicated)
      expect(duration).toBeLessThan(100);
    });
  });
});

/**
 * Benchmark utilities for manual testing
 * Run these manually to get detailed performance metrics
 */
export function benchmarkExtractOrderNumbers(iterations = 10000) {
  const input = '123/2026/54255/54365/54321/54400/54500';
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    extractOrderNumbers(input);
  }

  const duration = performance.now() - start;
  const avgPerCall = duration / iterations;

  return {
    totalDuration: duration,
    iterations,
    avgPerCall,
    callsPerSecond: (iterations / duration) * 1000,
  };
}

export function benchmarkParseDeliveryWeek(iterations = 10000) {
  const input = 'KW 15/2026';
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    parseDeliveryWeek(input);
  }

  const duration = performance.now() - start;
  const avgPerCall = duration / iterations;

  return {
    totalDuration: duration,
    iterations,
    avgPerCall,
    callsPerSecond: (iterations / duration) * 1000,
  };
}

export function benchmarkAggregateStatus(iterations = 10000) {
  const statuses = ['Dostarczone', 'Otwarte', 'Wysłane'];
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    aggregateSchucoStatus(statuses);
  }

  const duration = performance.now() - start;
  const avgPerCall = duration / iterations;

  return {
    totalDuration: duration,
    iterations,
    avgPerCall,
    callsPerSecond: (iterations / duration) * 1000,
  };
}
