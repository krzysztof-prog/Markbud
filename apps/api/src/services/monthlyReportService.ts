/**
 * Monthly Report Service
 * Generates monthly reports based on orders with invoice numbers
 *
 * IMPORTANT: All monetary values in database are stored in grosze/centy (smallest units).
 * This service converts them to PLN/EUR for display.
 */

import { PrismaClient } from '@prisma/client';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';

export interface MonthlyReportData {
  year: number;
  month: number;
  totalOrders: number;
  totalWindows: number;
  totalSashes: number;
  totalValuePln: number;
  totalValueEur: number;
  items: MonthlyReportItemData[];
}

export interface MonthlyReportItemData {
  orderId: number;
  orderNumber: string;
  invoiceNumber: string | null;
  windowsCount: number;
  sashesCount: number;
  unitsCount: number;
  valuePln: number | null;
  valueEur: number | null;
}

export class MonthlyReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate monthly report for a specific year and month
   * Includes all orders with invoice numbers from that month
   */
  async generateReport(year: number, month: number): Promise<MonthlyReportData> {
    // Validate year and month
    if (year < 2000 || year > new Date().getFullYear() + 1) {
      throw new Error(`Invalid year: ${year}. Must be between 2000 and ${new Date().getFullYear() + 1}`);
    }
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
    }

    // Check if requested date is not too far in the future
    const requestedDate = new Date(year, month - 1, 1);
    const now = new Date();
    const maxFutureDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (requestedDate > maxFutureDate) {
      throw new Error(`Cannot generate report for future month: ${year}-${month}`);
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find all orders with invoice numbers within this month
    // Using createdAt as the basis for monthly grouping
    const orders = await this.prisma.order.findMany({
      where: {
        invoiceNumber: {
          not: null,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        invoiceNumber: true,
        totalWindows: true,
        totalSashes: true,
        valuePln: true,
        valueEur: true,
        windows: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    // Calculate totals
    // UWAGA: Wartości przechowywane są w groszach/centach (Int w bazie)
    // Konwersja na PLN/EUR następuje przy odczycie (getReport/getAllReports)
    let totalOrders = 0;
    let totalWindows = 0;
    let totalSashes = 0;
    let totalValuePln = 0;  // w groszach
    let totalValueEur = 0;  // w centach

    const items: MonthlyReportItemData[] = [];

    for (const order of orders) {
      // Calculate units count (sum of window quantities)
      const unitsCount = order.windows.reduce((sum, w) => sum + w.quantity, 0);

      items.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        windowsCount: order.totalWindows || 0,
        sashesCount: order.totalSashes || 0,
        unitsCount,
        valuePln: order.valuePln,  // w groszach - raw value
        valueEur: order.valueEur,  // w centach - raw value
      });

      totalOrders++;
      totalWindows += order.totalWindows || 0;
      totalSashes += order.totalSashes || 0;
      totalValuePln += order.valuePln || 0;
      totalValueEur += order.valueEur || 0;
    }

    return {
      year,
      month,
      totalOrders,
      totalWindows,
      totalSashes,
      totalValuePln,
      totalValueEur,
      items,
    };
  }

  /**
   * Save monthly report to database
   * Uses transaction to ensure data consistency
   */
  async saveReport(reportData: MonthlyReportData) {
    // Check if report already exists
    const existing = await this.prisma.monthlyReport.findUnique({
      where: {
        year_month: {
          year: reportData.year,
          month: reportData.month,
        },
      },
    });

    if (existing) {
      // Update existing report in a transaction to ensure atomicity
      return await this.prisma.$transaction(async (tx) => {
        // Update report summary
        await tx.monthlyReport.update({
          where: { id: existing.id },
          data: {
            totalOrders: reportData.totalOrders,
            totalWindows: reportData.totalWindows,
            totalSashes: reportData.totalSashes,
            totalValuePln: reportData.totalValuePln,
            totalValueEur: reportData.totalValueEur,
            reportDate: new Date(),
          },
        });

        // Delete old items
        await tx.monthlyReportItem.deleteMany({
          where: { reportId: existing.id },
        });

        // Create new items if any
        if (reportData.items.length > 0) {
          await tx.monthlyReportItem.createMany({
            data: reportData.items.map((item) => ({
              reportId: existing.id,
              orderId: item.orderId,
              orderNumber: item.orderNumber,
              invoiceNumber: item.invoiceNumber,
              windowsCount: item.windowsCount,
              sashesCount: item.sashesCount,
              unitsCount: item.unitsCount,
              valuePln: item.valuePln,
              valueEur: item.valueEur,
            })),
          });
        }

        return existing.id;
      });
    } else {
      // Create new report
      const report = await this.prisma.monthlyReport.create({
        data: {
          year: reportData.year,
          month: reportData.month,
          totalOrders: reportData.totalOrders,
          totalWindows: reportData.totalWindows,
          totalSashes: reportData.totalSashes,
          totalValuePln: reportData.totalValuePln,
          totalValueEur: reportData.totalValueEur,
          reportItems: {
            create: reportData.items.map((item) => ({
              orderId: item.orderId,
              orderNumber: item.orderNumber,
              invoiceNumber: item.invoiceNumber,
              windowsCount: item.windowsCount,
              sashesCount: item.sashesCount,
              unitsCount: item.unitsCount,
              valuePln: item.valuePln,
              valueEur: item.valueEur,
            })),
          },
        },
      });

      return report.id;
    }
  }

  /**
   * Get monthly report by year and month
   * Converts grosze/centy to PLN/EUR for display
   */
  async getReport(year: number, month: number) {
    const report = await this.prisma.monthlyReport.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
      include: {
        reportItems: {
          orderBy: {
            orderNumber: 'asc',
          },
        },
      },
    });

    if (!report) {
      return null;
    }

    // Konwersja groszy/centów na PLN/EUR dla wyświetlania
    return {
      ...report,
      totalValuePln: groszeToPln(report.totalValuePln as Grosze),
      totalValueEur: centyToEur(report.totalValueEur as Centy),
      reportItems: report.reportItems.map(item => ({
        ...item,
        valuePln: item.valuePln !== null ? groszeToPln(item.valuePln as Grosze) : null,
        valueEur: item.valueEur !== null ? centyToEur(item.valueEur as Centy) : null,
      })),
    };
  }

  /**
   * Get all monthly reports
   * Converts grosze/centy to PLN/EUR for display
   */
  async getAllReports(limit: number = 12) {
    const reports = await this.prisma.monthlyReport.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      take: limit,
      include: {
        _count: {
          select: { reportItems: true },
        },
      },
    });

    // Konwersja groszy/centów na PLN/EUR dla wyświetlania
    return reports.map(report => ({
      ...report,
      totalValuePln: groszeToPln(report.totalValuePln as Grosze),
      totalValueEur: centyToEur(report.totalValueEur as Centy),
    }));
  }

  /**
   * Delete monthly report
   */
  async deleteReport(year: number, month: number) {
    await this.prisma.monthlyReport.delete({
      where: {
        year_month: {
          year,
          month,
        },
      },
    });
  }

  /**
   * Generate and save report in one operation
   * Returns data with values converted to PLN/EUR for display
   */
  async generateAndSaveReport(year: number, month: number) {
    const reportData = await this.generateReport(year, month);
    const reportId = await this.saveReport(reportData);

    // Konwersja groszy/centów na PLN/EUR dla wyświetlania
    return {
      reportId,
      ...reportData,
      totalValuePln: groszeToPln(reportData.totalValuePln as Grosze),
      totalValueEur: centyToEur(reportData.totalValueEur as Centy),
      items: reportData.items.map(item => ({
        ...item,
        valuePln: item.valuePln !== null ? groszeToPln(item.valuePln as Grosze) : null,
        valueEur: item.valueEur !== null ? centyToEur(item.valueEur as Centy) : null,
      })),
    };
  }
}
