/**
 * Working Days Routes - Endpoints for managing working days and holidays
 *
 * Route → HolidayService → Prisma
 */

import type { FastifyPluginAsync } from 'fastify';
import { holidayService } from '../services/HolidayService.js';

export const workingDaysRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/working-days - pobierz dni wolne dla zakresu dat
  fastify.get<{
    Querystring: {
      from?: string;
      to?: string;
      month?: string;
      year?: string;
    };
  }>('/', async (request) => {
    const { from, to, month, year } = request.query;

    let startDate: Date;
    let endDate: Date;

    if (month && year) {
      // Miesiąc i rok podane - pełny miesiąc
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0); // Ostatni dzień miesiąca
    } else if (from && to) {
      // Zakres dat
      startDate = new Date(from);
      endDate = new Date(to);
    } else {
      // Domyślnie: aktualny miesiąc
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const workingDays = await holidayService.getWorkingDays(startDate, endDate);

    return workingDays;
  });

  // GET /api/working-days/holidays - pobierz święta dla roku
  fastify.get<{
    Querystring: {
      year: string;
      country?: 'PL' | 'DE';
    };
  }>('/holidays', async (request) => {
    const { year, country } = request.query;
    const yearNum = parseInt(year);

    const holidays = holidayService.getHolidays(yearNum, country);

    return holidays;
  });

  // POST /api/working-days - ustaw dzień jako wolny/pracujący
  fastify.post<{
    Body: {
      date: string;
      isWorking: boolean;
      description?: string;
    };
  }>('/', async (request, reply) => {
    const { date, isWorking, description } = request.body;

    const workingDay = await holidayService.setWorkingDay({
      date,
      isWorking,
      description,
    });

    return reply.status(201).send(workingDay);
  });

  // DELETE /api/working-days/:date - usuń oznaczenie (przywróć domyślny stan)
  fastify.delete<{
    Params: { date: string };
  }>('/:date', async (request, reply) => {
    const { date } = request.params;

    await holidayService.deleteWorkingDay(date);

    return reply.status(204).send();
  });
};
