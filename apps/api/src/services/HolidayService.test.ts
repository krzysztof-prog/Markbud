/**
 * HolidayService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPrisma } from '../tests/mocks/prisma.mock.js';

// Mock prisma index - musi byc przed importem
vi.mock('../index.js', () => ({
  prisma: createMockPrisma(),
}));

// Import po mockach
const { HolidayService, holidayService } = await import('./HolidayService.js');

describe('HolidayService', () => {
  let service: HolidayService;

  beforeEach(() => {
    service = new HolidayService();
    vi.clearAllMocks();
  });

  describe('getHolidays', () => {
    it('should return Polish holidays for given year', () => {
      const holidays = service.getHolidays(2024, 'PL');

      // Sprawdź swieta stale
      const newYear = holidays.find((h) => h.name === 'Nowy Rok');
      expect(newYear).toBeDefined();
      expect(newYear?.date.getMonth()).toBe(0); // Styczen
      expect(newYear?.date.getDate()).toBe(1);
      expect(newYear?.country).toBe('PL');
      expect(newYear?.isWorking).toBe(false);

      // Sprawdź czy sa swieta ruchome (zalezne od Wielkanocy)
      const easter = holidays.find((h) => h.name === 'Niedziela Wielkanocna');
      expect(easter).toBeDefined();
      expect(easter?.country).toBe('PL');

      const corpusChristi = holidays.find((h) => h.name === 'Boze Cialo');
      expect(corpusChristi).toBeDefined();
    });

    it('should return German holidays for given year', () => {
      const holidays = service.getHolidays(2024, 'DE');

      const newYear = holidays.find((h) => h.name === 'Neujahr');
      expect(newYear).toBeDefined();
      expect(newYear?.country).toBe('DE');

      const goodFriday = holidays.find((h) => h.name === 'Karfreitag');
      expect(goodFriday).toBeDefined();
      expect(goodFriday?.country).toBe('DE');
    });

    it('should return all holidays when no country specified', () => {
      const holidays = service.getHolidays(2024);

      const polishHoliday = holidays.find((h) => h.country === 'PL');
      const germanHoliday = holidays.find((h) => h.country === 'DE');

      expect(polishHoliday).toBeDefined();
      expect(germanHoliday).toBeDefined();
    });

    it('should calculate Easter correctly for different years', () => {
      // 2024: Wielkanoc 31 marca
      const holidays2024 = service.getHolidays(2024, 'PL');
      const easter2024 = holidays2024.find((h) => h.name === 'Niedziela Wielkanocna');
      expect(easter2024?.date.getMonth()).toBe(2); // Marzec (0-indexed)
      expect(easter2024?.date.getDate()).toBe(31);

      // 2025: Wielkanoc 20 kwietnia
      const holidays2025 = service.getHolidays(2025, 'PL');
      const easter2025 = holidays2025.find((h) => h.name === 'Niedziela Wielkanocna');
      expect(easter2025?.date.getMonth()).toBe(3); // Kwiecien
      expect(easter2025?.date.getDate()).toBe(20);
    });
  });

  describe('getEasterDate', () => {
    it('should return Easter date for 2024', () => {
      const easter = service.getEasterDate(2024);
      expect(easter.getFullYear()).toBe(2024);
      expect(easter.getMonth()).toBe(2); // Marzec
      expect(easter.getDate()).toBe(31);
    });

    it('should return Easter date for 2025', () => {
      const easter = service.getEasterDate(2025);
      expect(easter.getFullYear()).toBe(2025);
      expect(easter.getMonth()).toBe(3); // Kwiecien
      expect(easter.getDate()).toBe(20);
    });
  });

  describe('isHoliday', () => {
    it('should return true for New Year', () => {
      const newYear = new Date(2024, 0, 1);
      expect(service.isHoliday(newYear, 'PL')).toBe(true);
    });

    it('should return false for regular working day', () => {
      const regularDay = new Date(2024, 5, 15); // 15 czerwca - zwykly dzien
      expect(service.isHoliday(regularDay, 'PL')).toBe(false);
    });

    it('should return true for Easter Monday 2024', () => {
      const easterMonday = new Date(2024, 3, 1); // 1 kwietnia 2024
      expect(service.isHoliday(easterMonday, 'PL')).toBe(true);
    });
  });

  describe('getWorkingDays', () => {
    it('should fetch working days from database', async () => {
      const mockWorkingDays = [
        { date: new Date('2024-01-01'), isWorking: false, description: 'New Year' },
        { date: new Date('2024-01-02'), isWorking: true, description: null },
      ];
      const { prisma } = await import('../index.js');
      (prisma.workingDay.findMany as any).mockResolvedValue(mockWorkingDays);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.getWorkingDays(startDate, endDate);

      expect(result).toEqual(mockWorkingDays);
      expect(prisma.workingDay.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    });
  });

  describe('getWorkingDaysForMonth', () => {
    it('should fetch working days for specific month', async () => {
      const mockWorkingDays = [
        { date: new Date('2024-02-01'), isWorking: true, description: null },
      ];
      const { prisma } = await import('../index.js');
      (prisma.workingDay.findMany as any).mockResolvedValue(mockWorkingDays);

      const result = await service.getWorkingDaysForMonth(2024, 2);

      expect(result).toEqual(mockWorkingDays);
      expect(prisma.workingDay.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: new Date(2024, 1, 1), // 1 lutego
            lte: new Date(2024, 2, 0), // Ostatni dzien lutego
          },
        },
      });
    });
  });

  describe('setWorkingDay', () => {
    it('should create or update working day', async () => {
      const input = {
        date: '2024-01-15',
        isWorking: false,
        description: 'Special holiday',
      };
      const mockResult = {
        date: new Date('2024-01-15'),
        isWorking: false,
        description: 'Special holiday',
        isHoliday: false,
      };
      const { prisma } = await import('../index.js');
      (prisma.workingDay.upsert as any).mockResolvedValue(mockResult);

      const result = await service.setWorkingDay(input);

      expect(result).toEqual(mockResult);
      expect(prisma.workingDay.upsert).toHaveBeenCalledWith({
        where: { date: new Date('2024-01-15') },
        update: {
          isWorking: false,
          description: 'Special holiday',
        },
        create: {
          date: new Date('2024-01-15'),
          isWorking: false,
          description: 'Special holiday',
          isHoliday: false,
        },
      });
    });
  });

  describe('deleteWorkingDay', () => {
    it('should delete working day', async () => {
      const mockDeleted = {
        date: new Date('2024-01-15'),
        isWorking: false,
        description: null,
        isHoliday: false,
      };
      const { prisma } = await import('../index.js');
      (prisma.workingDay.delete as any).mockResolvedValue(mockDeleted);

      const result = await service.deleteWorkingDay('2024-01-15');

      expect(result).toEqual(mockDeleted);
      expect(prisma.workingDay.delete).toHaveBeenCalledWith({
        where: { date: new Date('2024-01-15') },
      });
    });
  });

  describe('singleton instance', () => {
    it('should export singleton holidayService', () => {
      expect(holidayService).toBeInstanceOf(HolidayService);
    });
  });
});
