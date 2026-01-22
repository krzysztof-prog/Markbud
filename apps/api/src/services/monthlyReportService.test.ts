import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonthlyReportService, MonthlyReportData } from './monthlyReportService.js';
import { PrismaClient } from '@prisma/client';

// =============================================================================
// Mock Setup
// =============================================================================

const mockPrisma = {
  order: {
    findMany: vi.fn(),
  },
  monthlyReport: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  monthlyReportItem: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
} as unknown as PrismaClient;

describe('MonthlyReportService', () => {
  let service: MonthlyReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MonthlyReportService(mockPrisma);
  });

  // ===========================================================================
  // generateReport - Generowanie raportu
  // ===========================================================================
  describe('generateReport', () => {
    describe('walidacja parametrów', () => {
      it('rzuca błąd dla roku < 2000', async () => {
        await expect(service.generateReport(1999, 1)).rejects.toThrow(/Invalid year/);
      });

      it('rzuca błąd dla roku za daleko w przyszłości', async () => {
        const futureYear = new Date().getFullYear() + 2;
        await expect(service.generateReport(futureYear, 1)).rejects.toThrow(/Invalid year/);
      });

      it('rzuca błąd dla miesiąca < 1', async () => {
        await expect(service.generateReport(2024, 0)).rejects.toThrow(/Invalid month/);
      });

      it('rzuca błąd dla miesiąca > 12', async () => {
        await expect(service.generateReport(2024, 13)).rejects.toThrow(/Invalid month/);
      });

      it('rzuca błąd dla przyszłego miesiąca', async () => {
        const now = new Date();
        const futureMonth = now.getMonth() + 3; // 2 miesiące w przód
        const year = futureMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
        const month = futureMonth > 12 ? futureMonth - 12 : futureMonth;

        await expect(service.generateReport(year, month)).rejects.toThrow(/future month/);
      });
    });

    describe('happy path', () => {
      it('generuje pusty raport dla miesiąca bez zleceń', async () => {
        vi.mocked(mockPrisma.order.findMany).mockResolvedValue([]);

        const report = await service.generateReport(2024, 1);

        expect(report).toEqual({
          year: 2024,
          month: 1,
          totalOrders: 0,
          totalWindows: 0,
          totalSashes: 0,
          totalValuePln: 0,
          totalValueEur: 0,
          items: [],
        });
      });

      it('generuje raport z jednym zleceniem', async () => {
        vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
          {
            id: 1,
            orderNumber: '54001',
            invoiceNumber: 'FV/2024/001',
            totalWindows: 10,
            totalSashes: 15,
            valuePln: 500000, // 5000.00 PLN w groszach
            valueEur: 120000, // 1200.00 EUR w centach
            windows: [
              { quantity: 5 },
              { quantity: 5 },
            ],
          },
        ] as any);

        const report = await service.generateReport(2024, 1);

        expect(report.totalOrders).toBe(1);
        expect(report.totalWindows).toBe(10);
        expect(report.totalSashes).toBe(15);
        expect(report.totalValuePln).toBe(500000); // w groszach
        expect(report.totalValueEur).toBe(120000); // w centach
        expect(report.items).toHaveLength(1);
        expect(report.items[0].unitsCount).toBe(10); // 5 + 5
      });

      it('generuje raport z wieloma zleceniami i sumuje wartości', async () => {
        vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
          {
            id: 1,
            orderNumber: '54001',
            invoiceNumber: 'FV/2024/001',
            totalWindows: 10,
            totalSashes: 15,
            valuePln: 100000, // 1000.00 PLN
            valueEur: 25000,  // 250.00 EUR
            windows: [{ quantity: 10 }],
          },
          {
            id: 2,
            orderNumber: '54002',
            invoiceNumber: 'FV/2024/002',
            totalWindows: 5,
            totalSashes: 8,
            valuePln: 50000,  // 500.00 PLN
            valueEur: 12500,  // 125.00 EUR
            windows: [{ quantity: 5 }],
          },
          {
            id: 3,
            orderNumber: '54003',
            invoiceNumber: 'FV/2024/003',
            totalWindows: 20,
            totalSashes: 25,
            valuePln: 200000, // 2000.00 PLN
            valueEur: 50000,  // 500.00 EUR
            windows: [{ quantity: 12 }, { quantity: 8 }],
          },
        ] as any);

        const report = await service.generateReport(2024, 1);

        expect(report.totalOrders).toBe(3);
        expect(report.totalWindows).toBe(35); // 10 + 5 + 20
        expect(report.totalSashes).toBe(48);  // 15 + 8 + 25
        expect(report.totalValuePln).toBe(350000); // 100000 + 50000 + 200000
        expect(report.totalValueEur).toBe(87500);  // 25000 + 12500 + 50000
        expect(report.items).toHaveLength(3);
      });

      it('obsługuje zlecenia z null valuePln/valueEur', async () => {
        vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
          {
            id: 1,
            orderNumber: '54001',
            invoiceNumber: 'FV/2024/001',
            totalWindows: 10,
            totalSashes: 15,
            valuePln: null,
            valueEur: null,
            windows: [{ quantity: 10 }],
          },
          {
            id: 2,
            orderNumber: '54002',
            invoiceNumber: 'FV/2024/002',
            totalWindows: 5,
            totalSashes: 8,
            valuePln: 50000,
            valueEur: 12500,
            windows: [{ quantity: 5 }],
          },
        ] as any);

        const report = await service.generateReport(2024, 1);

        expect(report.totalValuePln).toBe(50000); // null + 50000 = 50000
        expect(report.totalValueEur).toBe(12500); // null + 12500 = 12500
        expect(report.items[0].valuePln).toBeNull();
        expect(report.items[0].valueEur).toBeNull();
        expect(report.items[1].valuePln).toBe(50000);
      });

      it('obsługuje zlecenia z pustą tablicą windows', async () => {
        vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
          {
            id: 1,
            orderNumber: '54001',
            invoiceNumber: 'FV/2024/001',
            totalWindows: 0,
            totalSashes: 0,
            valuePln: 10000,
            valueEur: 2500,
            windows: [], // pusta tablica
          },
        ] as any);

        const report = await service.generateReport(2024, 1);

        expect(report.items[0].unitsCount).toBe(0);
      });
    });
  });

  // ===========================================================================
  // getReport - Pobieranie raportu z konwersją walut
  // ===========================================================================
  describe('getReport', () => {
    it('zwraca null gdy raport nie istnieje', async () => {
      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue(null);

      const result = await service.getReport(2024, 1);

      expect(result).toBeNull();
    });

    it('konwertuje grosze na PLN i centy na EUR', async () => {
      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue({
        id: 1,
        year: 2024,
        month: 1,
        totalOrders: 2,
        totalWindows: 15,
        totalSashes: 20,
        totalValuePln: 350000, // 3500.00 PLN w groszach
        totalValueEur: 87500,  // 875.00 EUR w centach
        reportDate: new Date(),
        reportItems: [
          {
            id: 1,
            orderId: 1,
            orderNumber: '54001',
            invoiceNumber: 'FV/2024/001',
            windowsCount: 10,
            sashesCount: 15,
            unitsCount: 10,
            valuePln: 200000, // 2000.00 PLN
            valueEur: 50000,  // 500.00 EUR
          },
          {
            id: 2,
            orderId: 2,
            orderNumber: '54002',
            invoiceNumber: 'FV/2024/002',
            windowsCount: 5,
            sashesCount: 5,
            unitsCount: 5,
            valuePln: 150000, // 1500.00 PLN
            valueEur: 37500,  // 375.00 EUR
          },
        ],
      } as any);

      const result = await service.getReport(2024, 1);

      // Sprawdź konwersję sum
      expect(result!.totalValuePln).toBe(3500.00); // 350000 groszy → 3500.00 PLN
      expect(result!.totalValueEur).toBe(875.00);  // 87500 centów → 875.00 EUR

      // Sprawdź konwersję pozycji
      expect(result!.reportItems[0].valuePln).toBe(2000.00);
      expect(result!.reportItems[0].valueEur).toBe(500.00);
      expect(result!.reportItems[1].valuePln).toBe(1500.00);
      expect(result!.reportItems[1].valueEur).toBe(375.00);
    });

    it('obsługuje null wartości w pozycjach', async () => {
      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue({
        id: 1,
        year: 2024,
        month: 1,
        totalOrders: 1,
        totalWindows: 10,
        totalSashes: 15,
        totalValuePln: 0,
        totalValueEur: 0,
        reportDate: new Date(),
        reportItems: [
          {
            id: 1,
            orderId: 1,
            orderNumber: '54001',
            invoiceNumber: null,
            windowsCount: 10,
            sashesCount: 15,
            unitsCount: 10,
            valuePln: null,
            valueEur: null,
          },
        ],
      } as any);

      const result = await service.getReport(2024, 1);

      expect(result!.reportItems[0].valuePln).toBeNull();
      expect(result!.reportItems[0].valueEur).toBeNull();
    });
  });

  // ===========================================================================
  // getAllReports - Lista raportów
  // ===========================================================================
  describe('getAllReports', () => {
    it('zwraca pustą listę gdy brak raportów', async () => {
      vi.mocked(mockPrisma.monthlyReport.findMany).mockResolvedValue([]);

      const result = await service.getAllReports();

      expect(result).toEqual([]);
    });

    it('konwertuje wartości na PLN/EUR dla każdego raportu', async () => {
      vi.mocked(mockPrisma.monthlyReport.findMany).mockResolvedValue([
        {
          id: 1,
          year: 2024,
          month: 2,
          totalOrders: 10,
          totalWindows: 100,
          totalSashes: 150,
          totalValuePln: 1000000, // 10000.00 PLN
          totalValueEur: 250000,  // 2500.00 EUR
          _count: { reportItems: 10 },
        },
        {
          id: 2,
          year: 2024,
          month: 1,
          totalOrders: 8,
          totalWindows: 80,
          totalSashes: 120,
          totalValuePln: 800000,  // 8000.00 PLN
          totalValueEur: 200000,  // 2000.00 EUR
          _count: { reportItems: 8 },
        },
      ] as any);

      const result = await service.getAllReports();

      expect(result).toHaveLength(2);
      expect(result[0].totalValuePln).toBe(10000.00);
      expect(result[0].totalValueEur).toBe(2500.00);
      expect(result[1].totalValuePln).toBe(8000.00);
      expect(result[1].totalValueEur).toBe(2000.00);
    });

    it('respektuje parametr limit', async () => {
      vi.mocked(mockPrisma.monthlyReport.findMany).mockResolvedValue([]);

      await service.getAllReports(5);

      expect(mockPrisma.monthlyReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  // ===========================================================================
  // saveReport - Zapisywanie raportu
  // ===========================================================================
  describe('saveReport', () => {
    const reportData: MonthlyReportData = {
      year: 2024,
      month: 1,
      totalOrders: 2,
      totalWindows: 15,
      totalSashes: 20,
      totalValuePln: 350000,
      totalValueEur: 87500,
      items: [
        {
          orderId: 1,
          orderNumber: '54001',
          invoiceNumber: 'FV/2024/001',
          windowsCount: 10,
          sashesCount: 15,
          unitsCount: 10,
          valuePln: 200000,
          valueEur: 50000,
        },
        {
          orderId: 2,
          orderNumber: '54002',
          invoiceNumber: 'FV/2024/002',
          windowsCount: 5,
          sashesCount: 5,
          unitsCount: 5,
          valuePln: 150000,
          valueEur: 37500,
        },
      ],
    };

    it('tworzy nowy raport gdy nie istnieje', async () => {
      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.monthlyReport.create).mockResolvedValue({ id: 1 } as any);

      const result = await service.saveReport(reportData);

      expect(result).toBe(1);
      expect(mockPrisma.monthlyReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            year: 2024,
            month: 1,
            totalOrders: 2,
            totalValuePln: 350000,
            totalValueEur: 87500,
          }),
        })
      );
    });

    it('aktualizuje istniejący raport', async () => {
      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue({ id: 5 } as any);
      vi.mocked(mockPrisma.monthlyReport.update).mockResolvedValue({ id: 5 } as any);
      vi.mocked(mockPrisma.monthlyReportItem.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(mockPrisma.monthlyReportItem.createMany).mockResolvedValue({ count: 2 });

      const result = await service.saveReport(reportData);

      expect(result).toBe(5);
      expect(mockPrisma.monthlyReport.update).toHaveBeenCalled();
      expect(mockPrisma.monthlyReportItem.deleteMany).toHaveBeenCalledWith({
        where: { reportId: 5 },
      });
      expect(mockPrisma.monthlyReportItem.createMany).toHaveBeenCalled();
    });

    it('nie tworzy pozycji dla pustego raportu', async () => {
      const emptyReport: MonthlyReportData = {
        ...reportData,
        items: [],
      };

      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue({ id: 5 } as any);
      vi.mocked(mockPrisma.monthlyReport.update).mockResolvedValue({ id: 5 } as any);
      vi.mocked(mockPrisma.monthlyReportItem.deleteMany).mockResolvedValue({ count: 0 });

      await service.saveReport(emptyReport);

      // createMany nie powinno być wywołane dla pustych items
      expect(mockPrisma.monthlyReportItem.createMany).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // deleteReport - Usuwanie raportu
  // ===========================================================================
  describe('deleteReport', () => {
    it('usuwa raport po roku i miesiącu', async () => {
      vi.mocked(mockPrisma.monthlyReport.delete).mockResolvedValue({ id: 1 } as any);

      await service.deleteReport(2024, 1);

      expect(mockPrisma.monthlyReport.delete).toHaveBeenCalledWith({
        where: {
          year_month: {
            year: 2024,
            month: 1,
          },
        },
      });
    });
  });

  // ===========================================================================
  // generateAndSaveReport - Generowanie i zapisywanie
  // ===========================================================================
  describe('generateAndSaveReport', () => {
    it('generuje, zapisuje i zwraca raport z konwersją walut', async () => {
      vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
        {
          id: 1,
          orderNumber: '54001',
          invoiceNumber: 'FV/2024/001',
          totalWindows: 10,
          totalSashes: 15,
          valuePln: 200000, // 2000.00 PLN
          valueEur: 50000,  // 500.00 EUR
          windows: [{ quantity: 10 }],
        },
      ] as any);

      vi.mocked(mockPrisma.monthlyReport.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.monthlyReport.create).mockResolvedValue({ id: 1 } as any);

      const result = await service.generateAndSaveReport(2024, 1);

      expect(result.reportId).toBe(1);
      expect(result.totalValuePln).toBe(2000.00); // Skonwertowane
      expect(result.totalValueEur).toBe(500.00);  // Skonwertowane
      expect(result.items[0].valuePln).toBe(2000.00);
      expect(result.items[0].valueEur).toBe(500.00);
    });
  });

  // ===========================================================================
  // Edge cases - Precyzja i duże liczby
  // ===========================================================================
  describe('edge cases: precyzja i duże liczby', () => {
    it('poprawnie sumuje duże kwoty bez utraty precyzji', async () => {
      // 10 zleceń po 999999.99 PLN = 9999999.90 PLN
      const orders = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        orderNumber: `5400${i}`,
        invoiceNumber: `FV/2024/00${i}`,
        totalWindows: 100,
        totalSashes: 150,
        valuePln: 99999999, // 999999.99 PLN w groszach
        valueEur: 25000000, // 250000.00 EUR w centach
        windows: [{ quantity: 100 }],
      }));

      vi.mocked(mockPrisma.order.findMany).mockResolvedValue(orders as any);

      const report = await service.generateReport(2024, 1);

      expect(report.totalValuePln).toBe(999999990); // 9999999.90 PLN w groszach
      expect(report.totalValueEur).toBe(250000000); // 2500000.00 EUR w centach
    });

    it('poprawnie obsługuje wartość 0.01 PLN (1 grosz)', async () => {
      vi.mocked(mockPrisma.order.findMany).mockResolvedValue([
        {
          id: 1,
          orderNumber: '54001',
          invoiceNumber: 'FV/2024/001',
          totalWindows: 1,
          totalSashes: 1,
          valuePln: 1, // 0.01 PLN
          valueEur: 1, // 0.01 EUR
          windows: [{ quantity: 1 }],
        },
      ] as any);

      const report = await service.generateReport(2024, 1);

      expect(report.totalValuePln).toBe(1);
      expect(report.totalValueEur).toBe(1);
    });
  });
});
