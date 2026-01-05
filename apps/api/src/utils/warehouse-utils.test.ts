/**
 * Warehouse Utility Functions Tests
 * Tests for helper functions used in warehouse operations
 */

import { describe, it, expect } from 'vitest';
import {
  groupBy,
  calculateShortagePriority,
  createDemandMap,
  isWithin24Hours
} from './warehouse-utils.js';

describe('Warehouse Utilities', () => {

  describe('groupBy', () => {
    it('should group items by numeric key', () => {
      const items = [
        { id: 1, category: 1, name: 'Item A' },
        { id: 2, category: 1, name: 'Item B' },
        { id: 3, category: 2, name: 'Item C' }
      ];

      const result = groupBy(items, item => item.category);

      expect(result.get(1)).toHaveLength(2);
      expect(result.get(2)).toHaveLength(1);
      expect(result.get(1)?.[0].name).toBe('Item A');
      expect(result.get(1)?.[1].name).toBe('Item B');
      expect(result.get(2)?.[0].name).toBe('Item C');
    });

    it('should group items by string key', () => {
      const items = [
        { id: 1, type: 'A', value: 10 },
        { id: 2, type: 'B', value: 20 },
        { id: 3, type: 'A', value: 30 }
      ];

      const result = groupBy(items, item => item.type);

      expect(result.get('A')).toHaveLength(2);
      expect(result.get('B')).toHaveLength(1);
      expect(result.get('A')?.[0].value).toBe(10);
      expect(result.get('A')?.[1].value).toBe(30);
    });

    it('should handle empty array', () => {
      const result = groupBy([], item => item.id);
      expect(result.size).toBe(0);
    });

    it('should handle single item', () => {
      const items = [{ id: 1, category: 'A' }];
      const result = groupBy(items, item => item.category);

      expect(result.size).toBe(1);
      expect(result.get('A')).toHaveLength(1);
    });

    it('should handle all items in same group', () => {
      const items = [
        { id: 1, category: 'same' },
        { id: 2, category: 'same' },
        { id: 3, category: 'same' }
      ];

      const result = groupBy(items, item => item.category);

      expect(result.size).toBe(1);
      expect(result.get('same')).toHaveLength(3);
    });

    it('should handle each item in different group', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'C' }
      ];

      const result = groupBy(items, item => item.category);

      expect(result.size).toBe(3);
      expect(result.get('A')).toHaveLength(1);
      expect(result.get('B')).toHaveLength(1);
      expect(result.get('C')).toHaveLength(1);
    });

    it('should preserve item order within groups', () => {
      const items = [
        { id: 1, category: 'A', order: 1 },
        { id: 2, category: 'B', order: 2 },
        { id: 3, category: 'A', order: 3 }
      ];

      const result = groupBy(items, item => item.category);
      const groupA = result.get('A');

      expect(groupA?.[0].order).toBe(1);
      expect(groupA?.[1].order).toBe(3);
    });
  });

  describe('calculateShortagePriority', () => {
    describe('critical threshold (-10 or below)', () => {
      it('should return "critical" for -10', () => {
        expect(calculateShortagePriority(-10)).toBe('critical');
      });

      it('should return "critical" for -11', () => {
        expect(calculateShortagePriority(-11)).toBe('critical');
      });

      it('should return "critical" for -50', () => {
        expect(calculateShortagePriority(-50)).toBe('critical');
      });

      it('should return "critical" for -100', () => {
        expect(calculateShortagePriority(-100)).toBe('critical');
      });
    });

    describe('high threshold (-5 to -9)', () => {
      it('should return "high" for -5', () => {
        expect(calculateShortagePriority(-5)).toBe('high');
      });

      it('should return "high" for -6', () => {
        expect(calculateShortagePriority(-6)).toBe('high');
      });

      it('should return "high" for -9', () => {
        expect(calculateShortagePriority(-9)).toBe('high');
      });
    });

    describe('medium threshold (-1 to -4)', () => {
      it('should return "medium" for -1', () => {
        expect(calculateShortagePriority(-1)).toBe('medium');
      });

      it('should return "medium" for -2', () => {
        expect(calculateShortagePriority(-2)).toBe('medium');
      });

      it('should return "medium" for -4', () => {
        expect(calculateShortagePriority(-4)).toBe('medium');
      });
    });

    describe('edge cases', () => {
      it('should return "medium" for 0 (no shortage)', () => {
        expect(calculateShortagePriority(0)).toBe('medium');
      });

      it('should return "medium" for positive numbers', () => {
        expect(calculateShortagePriority(10)).toBe('medium');
        expect(calculateShortagePriority(100)).toBe('medium');
      });
    });

    describe('boundary values', () => {
      it('should correctly handle boundary between critical and high (-10 vs -11)', () => {
        expect(calculateShortagePriority(-11)).toBe('critical');
        expect(calculateShortagePriority(-10)).toBe('critical');
        expect(calculateShortagePriority(-9)).toBe('high');
      });

      it('should correctly handle boundary between high and medium (-5 vs -6)', () => {
        expect(calculateShortagePriority(-6)).toBe('high');
        expect(calculateShortagePriority(-5)).toBe('high');
        expect(calculateShortagePriority(-4)).toBe('medium');
      });
    });
  });

  describe('createDemandMap', () => {
    it('should create demand map from groupBy results', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: 10, requiredMeters: 100 }
        },
        {
          profileId: 2,
          _sum: { requiredBeams: 20, requiredMeters: 200 }
        }
      ];

      const result = createDemandMap(demands);

      expect(result.size).toBe(2);
      expect(result.get(1)).toEqual({ beams: 10, meters: 100 });
      expect(result.get(2)).toEqual({ beams: 20, meters: 200 });
    });

    it('should handle null requiredBeams', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: null, requiredMeters: 100 }
        }
      ];

      const result = createDemandMap(demands);

      expect(result.get(1)).toEqual({ beams: 0, meters: 100 });
    });

    it('should handle null requiredMeters', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: 10, requiredMeters: null }
        }
      ];

      const result = createDemandMap(demands);

      expect(result.get(1)).toEqual({ beams: 10, meters: 0 });
    });

    it('should handle both null values', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: null, requiredMeters: null }
        }
      ];

      const result = createDemandMap(demands);

      expect(result.get(1)).toEqual({ beams: 0, meters: 0 });
    });

    it('should handle empty array', () => {
      const result = createDemandMap([]);
      expect(result.size).toBe(0);
    });

    it('should handle multiple profiles with various values', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: 10, requiredMeters: 100 }
        },
        {
          profileId: 2,
          _sum: { requiredBeams: null, requiredMeters: 200 }
        },
        {
          profileId: 3,
          _sum: { requiredBeams: 30, requiredMeters: null }
        }
      ];

      const result = createDemandMap(demands);

      expect(result.size).toBe(3);
      expect(result.get(1)).toEqual({ beams: 10, meters: 100 });
      expect(result.get(2)).toEqual({ beams: 0, meters: 200 });
      expect(result.get(3)).toEqual({ beams: 30, meters: 0 });
    });

    it('should preserve correct types', () => {
      const demands = [
        {
          profileId: 1,
          _sum: { requiredBeams: 10, requiredMeters: 100 }
        }
      ];

      const result = createDemandMap(demands);
      const demand = result.get(1);

      expect(typeof demand?.beams).toBe('number');
      expect(typeof demand?.meters).toBe('number');
    });
  });

  describe('isWithin24Hours', () => {
    it('should return true for current time', () => {
      const now = new Date();
      expect(isWithin24Hours(now)).toBe(true);
    });

    it('should return true for 1 hour ago', () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      expect(isWithin24Hours(oneHourAgo)).toBe(true);
    });

    it('should return true for 12 hours ago', () => {
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
      expect(isWithin24Hours(twelveHoursAgo)).toBe(true);
    });

    it('should return true for exactly 24 hours ago', () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      expect(isWithin24Hours(twentyFourHoursAgo)).toBe(true);
    });

    it('should return false for 25 hours ago', () => {
      const twentyFiveHoursAgo = new Date();
      twentyFiveHoursAgo.setHours(twentyFiveHoursAgo.getHours() - 25);
      expect(isWithin24Hours(twentyFiveHoursAgo)).toBe(false);
    });

    it('should return false for 48 hours ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      expect(isWithin24Hours(twoDaysAgo)).toBe(false);
    });

    it('should return false for 1 week ago', () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      expect(isWithin24Hours(oneWeekAgo)).toBe(false);
    });

    it('should handle future dates (return true)', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      expect(isWithin24Hours(futureDate)).toBe(true);
    });

    it('should return true for 23 hours 59 minutes ago', () => {
      const almostOneDayAgo = new Date();
      almostOneDayAgo.setHours(almostOneDayAgo.getHours() - 23);
      almostOneDayAgo.setMinutes(almostOneDayAgo.getMinutes() - 59);
      expect(isWithin24Hours(almostOneDayAgo)).toBe(true);
    });

    it('should return false for 24 hours 1 minute ago', () => {
      const justOver24Hours = new Date();
      justOver24Hours.setHours(justOver24Hours.getHours() - 24);
      justOver24Hours.setMinutes(justOver24Hours.getMinutes() - 1);
      expect(isWithin24Hours(justOver24Hours)).toBe(false);
    });

    describe('edge cases with milliseconds', () => {
      it('should handle date with milliseconds precision', () => {
        const now = new Date();
        const almostOneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000 - 1));
        expect(isWithin24Hours(almostOneDayAgo)).toBe(true);
      });

      it('should return false for exactly 24h + 1ms ago', () => {
        const now = new Date();
        const justOver24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000 + 1));
        expect(isWithin24Hours(justOver24Hours)).toBe(false);
      });
    });
  });
});
