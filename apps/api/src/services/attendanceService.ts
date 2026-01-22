/**
 * Attendance Service - Business logic for BZ module (monthly attendance view)
 * Moduł BZ - widok miesięczny obecności pracowników
 */

import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../utils/errors.js';

// Typy dla odpowiedzi API
export type AttendanceType = 'work' | 'sick' | 'vacation' | 'absent' | null;

export interface DayAttendance {
  type: AttendanceType;
  hours?: number;
  entryId?: number;
}

export interface WorkerAttendance {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  days: Record<string, DayAttendance | null>;
  summary: {
    totalHours: number;
    workDays: number;
    sickDays: number;
    vacationDays: number;
    absentDays: number;
  };
}

export interface MonthlyAttendanceResponse {
  workers: WorkerAttendance[];
  month: {
    year: number;
    month: number;
    daysInMonth: number;
    weekends: number[]; // Numery dni które są weekendami
  };
}

export interface UpdateDayInput {
  workerId: number;
  date: string; // YYYY-MM-DD
  type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear';
}

// Mapowanie typów z bazy do wyświetlania
const ABSENCE_TYPE_MAP: Record<string, AttendanceType> = {
  SICK: 'sick',
  VACATION: 'vacation',
  ABSENT: 'absent',
};

// Mapowanie z frontendu do bazy
const TYPE_TO_DB_MAP: Record<string, string | null> = {
  sick: 'SICK',
  vacation: 'VACATION',
  absent: 'ABSENT',
  work: null,
  clear: null,
};

export class AttendanceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Pobiera dane obecności dla wszystkich pracowników na dany miesiąc
   */
  async getMonthlyAttendance(year: number, month: number): Promise<MonthlyAttendanceResponse> {
    // Oblicz zakres dat dla miesiąca
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Ostatni dzień miesiąca
    const daysInMonth = endDate.getDate();

    // Znajdź weekendy
    const weekends: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends.push(day);
      }
    }

    // Pobierz wszystkich aktywnych pracowników
    const workers = await this.prisma.worker.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Pobierz wszystkie wpisy dla danego miesiąca
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        worker: { isActive: true },
      },
      include: {
        worker: true,
      },
    });

    // Grupuj wpisy według pracownika i dnia
    const entriesByWorkerAndDay = new Map<string, typeof entries[0]>();
    for (const entry of entries) {
      const day = entry.date.getDate();
      const key = `${entry.workerId}-${day}`;
      entriesByWorkerAndDay.set(key, entry);
    }

    // Zbuduj odpowiedź
    const workersAttendance: WorkerAttendance[] = workers.map((worker) => {
      const days: Record<string, DayAttendance | null> = {};
      let totalHours = 0;
      let workDays = 0;
      let sickDays = 0;
      let vacationDays = 0;
      let absentDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${worker.id}-${day}`;
        const entry = entriesByWorkerAndDay.get(key);

        if (!entry) {
          days[day.toString()] = null;
        } else if (entry.absenceType) {
          // Nieobecność
          const type = ABSENCE_TYPE_MAP[entry.absenceType] || null;
          days[day.toString()] = { type, entryId: entry.id };

          if (entry.absenceType === 'SICK') sickDays++;
          else if (entry.absenceType === 'VACATION') vacationDays++;
          else if (entry.absenceType === 'ABSENT') absentDays++;
        } else if (entry.productiveHours > 0) {
          // Dzień pracy
          days[day.toString()] = {
            type: 'work',
            hours: 8, // Zawsze pokazujemy 8 zgodnie z decyzją
            entryId: entry.id,
          };
          totalHours += 8;
          workDays++;
        } else {
          // Wpis istnieje ale brak godzin i nieobecności
          days[day.toString()] = null;
        }
      }

      return {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName}`,
        firstName: worker.firstName,
        lastName: worker.lastName,
        days,
        summary: {
          totalHours,
          workDays,
          sickDays,
          vacationDays,
          absentDays,
        },
      };
    });

    return {
      workers: workersAttendance,
      month: {
        year,
        month,
        daysInMonth,
        weekends,
      },
    };
  }

  /**
   * Aktualizuje obecność dla pojedynczego dnia
   */
  async updateDay(input: UpdateDayInput): Promise<void> {
    const { workerId, date: dateStr, type } = input;

    // Walidacja pracownika
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!worker) {
      throw new ValidationError('Pracownik nie istnieje');
    }

    // Parsuj datę
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    // Sprawdź czy można edytować (tylko bieżący miesiąc)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();

    if (dateYear !== currentYear || dateMonth !== currentMonth) {
      throw new ValidationError('Można edytować tylko bieżący miesiąc');
    }

    // Znajdź istniejący wpis
    const existingEntry = await this.prisma.timeEntry.findUnique({
      where: {
        date_workerId: { date, workerId },
      },
    });

    if (type === 'clear') {
      // Usuń wpis jeśli istnieje
      if (existingEntry) {
        // Najpierw usuń powiązane zadania
        await this.prisma.nonProductiveTask.deleteMany({
          where: { timeEntryId: existingEntry.id },
        });
        await this.prisma.specialWork.deleteMany({
          where: { timeEntryId: existingEntry.id },
        });
        // Potem usuń wpis
        await this.prisma.timeEntry.delete({
          where: { id: existingEntry.id },
        });
      }
      return;
    }

    // Pobierz domyślne stanowisko (potrzebne dla TimeEntry)
    const defaultPosition = await this.prisma.position.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!defaultPosition) {
      throw new ValidationError('Brak stanowisk w systemie. Dodaj przynajmniej jedno stanowisko.');
    }

    // Przygotuj dane do zapisu
    const absenceType = TYPE_TO_DB_MAP[type];
    const productiveHours = type === 'work' ? 8 : 0;

    if (existingEntry) {
      // Aktualizuj istniejący wpis
      await this.prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          absenceType: absenceType,
          productiveHours,
        },
      });
    } else {
      // Stwórz nowy wpis
      await this.prisma.timeEntry.create({
        data: {
          date,
          workerId,
          positionId: defaultPosition.id,
          absenceType: absenceType,
          productiveHours,
        },
      });
    }
  }

  /**
   * Sprawdza czy miesiąc jest edytowalny (tylko bieżący miesiąc)
   */
  isMonthEditable(year: number, month: number): boolean {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }
}
