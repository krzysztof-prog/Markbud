/**
 * Timesheets Service - Business logic for production timesheets
 * Moduł godzinówek produkcyjnych
 */

import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import type {
  CreateWorkerInput,
  UpdateWorkerInput,
  CreatePositionInput,
  UpdatePositionInput,
  CreateNonProductiveTaskTypeInput,
  UpdateNonProductiveTaskTypeInput,
  CreateSpecialWorkTypeInput,
  UpdateSpecialWorkTypeInput,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  TimeEntryQuery,
  SetStandardDayInput,
  CalendarQuery,
} from '../validators/timesheets.js';

export class TimesheetsService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // WORKERS
  // ============================================

  async getAllWorkers(onlyActive = false) {
    return this.prisma.worker.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getWorkerById(id: number) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
    });
    if (!worker) {
      throw new NotFoundError('Pracownik nie został znaleziony');
    }
    return worker;
  }

  async createWorker(data: CreateWorkerInput) {
    return this.prisma.worker.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        defaultPosition: data.defaultPosition,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateWorker(id: number, data: UpdateWorkerInput) {
    await this.getWorkerById(id);
    return this.prisma.worker.update({
      where: { id },
      data,
    });
  }

  async deactivateWorker(id: number) {
    await this.getWorkerById(id);
    return this.prisma.worker.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // POSITIONS
  // ============================================

  async getAllPositions(onlyActive = false) {
    return this.prisma.position.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getPositionById(id: number) {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });
    if (!position) {
      throw new NotFoundError('Stanowisko nie zostało znalezione');
    }
    return position;
  }

  async createPosition(data: CreatePositionInput) {
    const existing = await this.prisma.position.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ValidationError('Stanowisko o tej nazwie już istnieje');
    }

    return this.prisma.position.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updatePosition(id: number, data: UpdatePositionInput) {
    await this.getPositionById(id);

    if (data.name) {
      const existing = await this.prisma.position.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new ValidationError('Stanowisko o tej nazwie już istnieje');
      }
    }

    return this.prisma.position.update({
      where: { id },
      data,
    });
  }

  // ============================================
  // NON-PRODUCTIVE TASK TYPES
  // ============================================

  async getAllNonProductiveTaskTypes(onlyActive = false) {
    return this.prisma.nonProductiveTaskType.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getNonProductiveTaskTypeById(id: number) {
    const taskType = await this.prisma.nonProductiveTaskType.findUnique({
      where: { id },
    });
    if (!taskType) {
      throw new NotFoundError('Typ zadania nie został znaleziony');
    }
    return taskType;
  }

  async createNonProductiveTaskType(data: CreateNonProductiveTaskTypeInput) {
    const existing = await this.prisma.nonProductiveTaskType.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ValidationError('Typ zadania o tej nazwie już istnieje');
    }

    return this.prisma.nonProductiveTaskType.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateNonProductiveTaskType(id: number, data: UpdateNonProductiveTaskTypeInput) {
    await this.getNonProductiveTaskTypeById(id);

    if (data.name) {
      const existing = await this.prisma.nonProductiveTaskType.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new ValidationError('Typ zadania o tej nazwie już istnieje');
      }
    }

    return this.prisma.nonProductiveTaskType.update({
      where: { id },
      data,
    });
  }

  // ============================================
  // SPECIAL WORK TYPES (Nietypówki)
  // ============================================

  async getAllSpecialWorkTypes(onlyActive = false) {
    return this.prisma.specialWorkType.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getSpecialWorkTypeById(id: number) {
    const specialType = await this.prisma.specialWorkType.findUnique({
      where: { id },
    });
    if (!specialType) {
      throw new NotFoundError('Typ nietypówki nie został znaleziony');
    }
    return specialType;
  }

  async createSpecialWorkType(data: CreateSpecialWorkTypeInput) {
    const existing = await this.prisma.specialWorkType.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ValidationError('Typ nietypówki o tej nazwie już istnieje');
    }

    return this.prisma.specialWorkType.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateSpecialWorkType(id: number, data: UpdateSpecialWorkTypeInput) {
    await this.getSpecialWorkTypeById(id);

    if (data.name) {
      const existing = await this.prisma.specialWorkType.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new ValidationError('Typ nietypówki o tej nazwie już istnieje');
      }
    }

    return this.prisma.specialWorkType.update({
      where: { id },
      data,
    });
  }

  async toggleSpecialWorkType(id: number) {
    const specialType = await this.getSpecialWorkTypeById(id);
    return this.prisma.specialWorkType.update({
      where: { id },
      data: { isActive: !specialType.isActive },
    });
  }

  // ============================================
  // TIME ENTRIES
  // ============================================

  async getTimeEntries(query: TimeEntryQuery) {
    const where: Record<string, unknown> = {};

    if (query.date) {
      const date = new Date(query.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: date, lt: nextDay };
    } else if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        const from = new Date(query.from);
        from.setHours(0, 0, 0, 0);
        (where.date as Record<string, Date>).gte = from;
      }
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        (where.date as Record<string, Date>).lte = to;
      }
    }

    if (query.workerId) {
      where.workerId = query.workerId;
    }

    return this.prisma.timeEntry.findMany({
      where,
      include: {
        worker: true,
        position: true,
        nonProductiveTasks: {
          include: {
            taskType: true,
          },
        },
        specialWorks: {
          include: {
            specialType: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { worker: { lastName: 'asc' } }],
    });
  }

  async getTimeEntryById(id: number) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        worker: true,
        position: true,
        nonProductiveTasks: {
          include: {
            taskType: true,
          },
        },
        specialWorks: {
          include: {
            specialType: true,
          },
        },
      },
    });
    if (!entry) {
      throw new NotFoundError('Wpis godzinowy nie został znaleziony');
    }
    return entry;
  }

  async createTimeEntry(data: CreateTimeEntryInput) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: data.workerId },
    });
    if (!worker) {
      throw new ValidationError('Pracownik nie istnieje');
    }

    const position = await this.prisma.position.findUnique({
      where: { id: data.positionId },
    });
    if (!position) {
      throw new ValidationError('Stanowisko nie istnieje');
    }

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.timeEntry.findUnique({
      where: {
        date_workerId: { date, workerId: data.workerId },
      },
    });
    if (existing) {
      throw new ValidationError('Wpis dla tego pracownika w tym dniu już istnieje');
    }

    if (data.nonProductiveTasks && data.nonProductiveTasks.length > 0) {
      const taskTypeIds = data.nonProductiveTasks.map((t) => t.taskTypeId);
      const taskTypes = await this.prisma.nonProductiveTaskType.findMany({
        where: { id: { in: taskTypeIds } },
      });
      if (taskTypes.length !== taskTypeIds.length) {
        throw new ValidationError('Niektóre typy zadań nie istnieją');
      }
    }

    // Walidacja typów nietypówek
    if (data.specialWorks && data.specialWorks.length > 0) {
      const specialTypeIds = data.specialWorks.map((sw) => sw.specialTypeId);
      const specialTypes = await this.prisma.specialWorkType.findMany({
        where: { id: { in: specialTypeIds } },
      });
      if (specialTypes.length !== specialTypeIds.length) {
        throw new ValidationError('Niektóre typy nietypówek nie istnieją');
      }
    }

    return this.prisma.timeEntry.create({
      data: {
        date,
        workerId: data.workerId,
        positionId: data.positionId,
        productiveHours: data.productiveHours ?? 0,
        notes: data.notes,
        nonProductiveTasks: {
          create: data.nonProductiveTasks?.map((task) => ({
            taskTypeId: task.taskTypeId,
            hours: task.hours,
            notes: task.notes,
          })) ?? [],
        },
        specialWorks: {
          create: data.specialWorks?.map((sw) => ({
            specialTypeId: sw.specialTypeId,
            hours: sw.hours,
            notes: sw.notes,
          })) ?? [],
        },
      },
      include: {
        worker: true,
        position: true,
        nonProductiveTasks: {
          include: {
            taskType: true,
          },
        },
        specialWorks: {
          include: {
            specialType: true,
          },
        },
      },
    });
  }

  async updateTimeEntry(id: number, data: UpdateTimeEntryInput) {
    await this.getTimeEntryById(id);

    if (data.positionId) {
      const position = await this.prisma.position.findUnique({
        where: { id: data.positionId },
      });
      if (!position) {
        throw new ValidationError('Stanowisko nie istnieje');
      }
    }

    // Walidacja typów zadań nieprodukcyjnych
    if (data.nonProductiveTasks !== undefined && data.nonProductiveTasks.length > 0) {
      const taskTypeIds = data.nonProductiveTasks.map((t) => t.taskTypeId);
      const taskTypes = await this.prisma.nonProductiveTaskType.findMany({
        where: { id: { in: taskTypeIds } },
      });
      if (taskTypes.length !== taskTypeIds.length) {
        throw new ValidationError('Niektóre typy zadań nie istnieją');
      }
    }

    // Walidacja typów nietypówek
    if (data.specialWorks !== undefined && data.specialWorks.length > 0) {
      const specialTypeIds = data.specialWorks.map((sw) => sw.specialTypeId);
      const specialTypes = await this.prisma.specialWorkType.findMany({
        where: { id: { in: specialTypeIds } },
      });
      if (specialTypes.length !== specialTypeIds.length) {
        throw new ValidationError('Niektóre typy nietypówek nie istnieją');
      }
    }

    // Jeśli aktualizujemy zadania lub nietypówki, używamy transakcji
    const needsTransaction = data.nonProductiveTasks !== undefined || data.specialWorks !== undefined;

    if (needsTransaction) {
      return this.prisma.$transaction(async (tx) => {
        // Usuń stare zadania nieprodukcyjne jeśli przekazano nowe
        if (data.nonProductiveTasks !== undefined) {
          await tx.nonProductiveTask.deleteMany({
            where: { timeEntryId: id },
          });
        }

        // Usuń stare nietypówki jeśli przekazano nowe
        if (data.specialWorks !== undefined) {
          await tx.specialWork.deleteMany({
            where: { timeEntryId: id },
          });
        }

        return tx.timeEntry.update({
          where: { id },
          data: {
            positionId: data.positionId,
            productiveHours: data.productiveHours,
            notes: data.notes,
            ...(data.nonProductiveTasks !== undefined && {
              nonProductiveTasks: {
                create: data.nonProductiveTasks.map((task) => ({
                  taskTypeId: task.taskTypeId,
                  hours: task.hours,
                  notes: task.notes,
                })),
              },
            }),
            ...(data.specialWorks !== undefined && {
              specialWorks: {
                create: data.specialWorks.map((sw) => ({
                  specialTypeId: sw.specialTypeId,
                  hours: sw.hours,
                  notes: sw.notes,
                })),
              },
            }),
          },
          include: {
            worker: true,
            position: true,
            nonProductiveTasks: {
              include: {
                taskType: true,
              },
            },
            specialWorks: {
              include: {
                specialType: true,
              },
            },
          },
        });
      });
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        positionId: data.positionId,
        productiveHours: data.productiveHours,
        notes: data.notes,
      },
      include: {
        worker: true,
        position: true,
        nonProductiveTasks: {
          include: {
            taskType: true,
          },
        },
        specialWorks: {
          include: {
            specialType: true,
          },
        },
      },
    });
  }

  async deleteTimeEntry(id: number) {
    await this.getTimeEntryById(id);
    return this.prisma.timeEntry.delete({
      where: { id },
    });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async setStandardDay(data: SetStandardDayInput) {
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const workerIds = data.entries.map((e) => e.workerId);
    const workers = await this.prisma.worker.findMany({
      where: { id: { in: workerIds } },
    });

    const workerMap = new Map(workers.map((w) => [w.id, w]));

    const defaultPositionNames = [...new Set(workers.map((w) => w.defaultPosition))];
    const positions = await this.prisma.position.findMany({
      where: { name: { in: defaultPositionNames } },
    });
    const positionMap = new Map(positions.map((p) => [p.name, p]));

    const entries = data.entries.map((entry) => {
      const worker = workerMap.get(entry.workerId);
      if (!worker) {
        throw new ValidationError(`Pracownik o ID ${entry.workerId} nie istnieje`);
      }

      let positionId = entry.positionId;
      if (!positionId) {
        const position = positionMap.get(worker.defaultPosition);
        if (!position) {
          throw new ValidationError(`Brak stanowiska "${worker.defaultPosition}" dla pracownika ${worker.firstName} ${worker.lastName}`);
        }
        positionId = position.id;
      }

      return {
        date,
        workerId: entry.workerId,
        positionId,
        productiveHours: entry.productiveHours ?? data.defaultProductiveHours,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const entry of entries) {
        const result = await tx.timeEntry.upsert({
          where: {
            date_workerId: { date: entry.date, workerId: entry.workerId },
          },
          update: {
            positionId: entry.positionId,
            productiveHours: entry.productiveHours,
          },
          create: entry,
          include: {
            worker: true,
            position: true,
          },
        });
        results.push(result);
      }

      return results;
    });
  }

  // ============================================
  // CALENDAR & SUMMARY
  // ============================================

  async getCalendarSummary(query: CalendarQuery) {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0, 23, 59, 59, 999);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        nonProductiveTasks: true,
      },
    });

    const activeWorkersCount = await this.prisma.worker.count({
      where: { isActive: true },
    });

    const dayMap = new Map<string, {
      date: string;
      entriesCount: number;
      totalProductiveHours: number;
      totalNonProductiveHours: number;
      status: 'empty' | 'partial' | 'complete';
    }>();

    for (const entry of entries) {
      // Używamy lokalnej daty zamiast UTC aby uniknąć przesunięcia strefy czasowej
      const d = entry.date;
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          entriesCount: 0,
          totalProductiveHours: 0,
          totalNonProductiveHours: 0,
          status: 'empty',
        });
      }

      const day = dayMap.get(dateKey)!;
      day.entriesCount++;
      day.totalProductiveHours += entry.productiveHours;
      day.totalNonProductiveHours += entry.nonProductiveTasks.reduce(
        (sum, task) => sum + task.hours,
        0
      );
    }

    for (const day of dayMap.values()) {
      if (day.entriesCount === 0) {
        day.status = 'empty';
      } else if (day.entriesCount >= activeWorkersCount) {
        day.status = 'complete';
      } else {
        day.status = 'partial';
      }
    }

    return {
      year: query.year,
      month: query.month,
      totalActiveWorkers: activeWorkersCount,
      days: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getDaySummary(date: string) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    // Pobierz wpisy dla dnia
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        date: { gte: dateObj, lt: nextDay },
      },
      include: {
        worker: true,
        position: true,
        nonProductiveTasks: {
          include: {
            taskType: true,
          },
        },
        specialWorks: {
          include: {
            specialType: true,
          },
        },
      },
      orderBy: [{ worker: { lastName: 'asc' } }, { worker: { firstName: 'asc' } }],
    });

    // Pobierz aktywnych pracowników
    const activeWorkers = await this.prisma.worker.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Mapa wpisów po workerId
    const entryMap = new Map(entries.map((e) => [e.workerId, e]));

    // Oblicz podsumowanie
    const totalProductiveHours = entries.reduce((sum, e) => sum + e.productiveHours, 0);
    const totalNonProductiveHours = entries.reduce(
      (sum, e) => sum + e.nonProductiveTasks.reduce((s, t) => s + t.hours, 0),
      0
    );

    // Określ status dnia
    let status: 'empty' | 'partial' | 'complete' = 'empty';
    if (entries.length > 0) {
      status = entries.length >= activeWorkers.length ? 'complete' : 'partial';
    }

    // Zbuduj listę pracowników z danymi wpisów (format WorkerDaySummary)
    const workers = activeWorkers.map((worker) => {
      const entry = entryMap.get(worker.id);
      const nonProductiveHours = entry?.nonProductiveTasks.reduce((s, t) => s + t.hours, 0) ?? 0;
      const productiveHours = entry?.productiveHours ?? 0;

      return {
        worker,
        entry: entry ?? null,
        hasEntry: !!entry,
        productiveHours,
        nonProductiveHours,
        totalHours: productiveHours + nonProductiveHours,
      };
    });

    return {
      date,
      status,
      workers,
      totals: {
        totalWorkers: activeWorkers.length,
        entriesCount: entries.length,
        totalProductiveHours,
        totalNonProductiveHours,
      },
    };
  }
}
