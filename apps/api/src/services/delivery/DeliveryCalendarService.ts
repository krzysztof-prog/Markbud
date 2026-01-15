/**
 * DeliveryCalendarService - Calendar data aggregation for deliveries
 *
 * Responsibilities:
 * - Fetch calendar data for single month
 * - Batch fetch calendar data for multiple months
 * - Combine deliveries, working days, and holidays
 */

import { DeliveryRepository } from '../../repositories/DeliveryRepository.js';
import { CalendarService } from '../calendar/CalendarService.js';

export interface CalendarMonth {
  month: number;
  year: number;
}

export interface CalendarDataResult {
  deliveries: unknown[];
  unassignedOrders: unknown[];
  workingDays: unknown[];
  holidays: unknown[];
}

export class DeliveryCalendarService {
  constructor(
    private repository: DeliveryRepository,
    private calendarService: CalendarService
  ) {}

  /**
   * Get calendar data for a specific month/year
   *
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Calendar data with deliveries
   */
  async getCalendarData(year: number, month: number) {
    return this.repository.getCalendarData(year, month);
  }

  /**
   * Get batched calendar data for multiple months
   * Combines deliveries, working days, and holidays into optimized queries
   *
   * @param months - Array of month/year pairs to fetch
   * @returns Combined calendar data for all requested months
   */
  async getCalendarDataBatch(months: CalendarMonth[]): Promise<CalendarDataResult> {
    // Fetch all calendar data in parallel
    const calendarPromises = months.map(({ month, year }) =>
      this.repository.getCalendarData(year, month)
    );

    const calendarResults = await Promise.all(calendarPromises);

    // Combine deliveries and unassigned orders
    const allDeliveries = calendarResults.flatMap((r) => r.deliveries || []);
    const unassignedOrders = calendarResults[0]?.unassignedOrders || [];

    // Get working days for all months in parallel
    const workingDays = await this.fetchWorkingDaysForMonths(months);

    // Get holidays for all unique years
    const holidays = await this.fetchHolidaysForYears(months);

    return {
      deliveries: allDeliveries,
      unassignedOrders,
      workingDays,
      holidays,
    };
  }

  /**
   * Fetch working days for multiple months
   */
  private async fetchWorkingDaysForMonths(months: CalendarMonth[]): Promise<unknown[]> {
    const workingDaysPromises = months.map(({ month, year }) =>
      this.repository.getWorkingDays(month, year)
    );
    const workingDaysResults = await Promise.all(workingDaysPromises);
    return workingDaysResults.flat();
  }

  /**
   * Fetch holidays for all unique years in the month list
   * Używa CalendarService do pobierania świąt (logika biznesowa, nie DB)
   */
  private fetchHolidaysForYears(months: CalendarMonth[]): unknown[] {
    const uniqueYears = Array.from(new Set(months.map((m) => m.year)));
    const allHolidays = uniqueYears.flatMap((year) => this.calendarService.getHolidays(year));
    return allHolidays;
  }
}
