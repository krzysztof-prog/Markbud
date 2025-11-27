import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';

// Polskie święta stałe
const POLISH_HOLIDAYS = [
  { month: 1, day: 1, name: 'Nowy Rok' },
  { month: 1, day: 6, name: 'Trzech Króli' },
  { month: 5, day: 1, name: 'Święto Pracy' },
  { month: 5, day: 3, name: 'Święto Konstytucji 3 Maja' },
  { month: 8, day: 15, name: 'Wniebowzięcie NMP' },
  { month: 11, day: 1, name: 'Wszystkich Świętych' },
  { month: 11, day: 11, name: 'Narodowe Święto Niepodległości' },
  { month: 12, day: 25, name: 'Boże Narodzenie' },
  { month: 12, day: 26, name: 'Drugi dzień Bożego Narodzenia' },
];

// Niemieckie święta stałe (federalne)
const GERMAN_HOLIDAYS = [
  { month: 1, day: 1, name: 'Neujahr' },
  { month: 5, day: 1, name: 'Tag der Arbeit' },
  { month: 10, day: 3, name: 'Tag der Deutschen Einheit' },
  { month: 12, day: 25, name: 'Erster Weihnachtstag' },
  { month: 12, day: 26, name: 'Zweiter Weihnachtstag' },
];

// Oblicz datę Wielkanocy (algorytm Meeusa)
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

// Oblicz polskie święta ruchome
function getPolishMovableHolidays(year: number) {
  const easter = calculateEaster(year);
  const holidays = [];

  // Wielkanoc
  holidays.push({
    date: new Date(easter),
    name: 'Niedziela Wielkanocna',
  });

  // Poniedziałek Wielkanocny
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    date: easterMonday,
    name: 'Poniedziałek Wielkanocny',
  });

  // Zielone Świątki (49 dni po Wielkanocy)
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  holidays.push({
    date: pentecost,
    name: 'Zielone Świątki',
  });

  // Boże Ciało (60 dni po Wielkanocy)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    date: corpusChristi,
    name: 'Boże Ciało',
  });

  return holidays;
}

// Oblicz niemieckie święta ruchome
function getGermanMovableHolidays(year: number) {
  const easter = calculateEaster(year);
  const holidays = [];

  // Karfreitag (Wielki Piątek)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: goodFriday,
    name: 'Karfreitag',
  });

  // Ostermontag (Poniedziałek Wielkanocny)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    date: easterMonday,
    name: 'Ostermontag',
  });

  // Christi Himmelfahrt (Wniebowstąpienie - 39 dni po Wielkanocy)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  holidays.push({
    date: ascension,
    name: 'Christi Himmelfahrt',
  });

  // Pfingstmontag (Poniedziałek Zielonych Świątek - 50 dni po Wielkanocy)
  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50);
  holidays.push({
    date: pentecostMonday,
    name: 'Pfingstmontag',
  });

  return holidays;
}

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
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0);
    } else if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else {
      // Domyślnie: aktualny miesiąc
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const workingDays = await prisma.workingDay.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return workingDays;
  });

  // GET /api/working-days/holidays - pobierz święta dla roku
  fastify.get<{
    Querystring: {
      year: string;
      country?: string;
    };
  }>('/holidays', async (request) => {
    const { year, country } = request.query;
    const yearNum = parseInt(year);
    const holidays = [];

    // Dodaj polskie święta
    if (!country || country === 'PL') {
      // Stałe święta
      for (const holiday of POLISH_HOLIDAYS) {
        holidays.push({
          date: new Date(yearNum, holiday.month - 1, holiday.day),
          name: holiday.name,
          country: 'PL',
          isHoliday: true,
        });
      }

      // Ruchome święta
      const movableHolidays = getPolishMovableHolidays(yearNum);
      for (const holiday of movableHolidays) {
        holidays.push({
          date: holiday.date,
          name: holiday.name,
          country: 'PL',
          isHoliday: true,
        });
      }
    }

    // Dodaj niemieckie święta
    if (!country || country === 'DE') {
      // Stałe święta
      for (const holiday of GERMAN_HOLIDAYS) {
        holidays.push({
          date: new Date(yearNum, holiday.month - 1, holiday.day),
          name: holiday.name,
          country: 'DE',
          isHoliday: true,
        });
      }

      // Ruchome święta
      const movableHolidays = getGermanMovableHolidays(yearNum);
      for (const holiday of movableHolidays) {
        holidays.push({
          date: holiday.date,
          name: holiday.name,
          country: 'DE',
          isHoliday: true,
        });
      }
    }

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

    const workingDay = await prisma.workingDay.upsert({
      where: { date: new Date(date) },
      update: {
        isWorking,
        description,
      },
      create: {
        date: new Date(date),
        isWorking,
        description,
        isHoliday: false,
      },
    });

    return reply.status(201).send(workingDay);
  });

  // DELETE /api/working-days/:date - usuń oznaczenie (przywróć domyślny stan)
  fastify.delete<{
    Params: { date: string };
  }>('/:date', async (request, reply) => {
    const { date } = request.params;

    await prisma.workingDay.delete({
      where: { date: new Date(date) },
    });

    return reply.status(204).send();
  });
};
