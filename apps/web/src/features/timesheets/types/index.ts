/**
 * Typy dla modułu godzinówek produkcyjnych
 */

// ============================================
// WORKER - Pracownik produkcyjny
// ============================================

export interface Worker {
  id: number;
  firstName: string;
  lastName: string;
  defaultPosition: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerInput {
  firstName: string;
  lastName: string;
  defaultPosition: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateWorkerInput {
  firstName?: string;
  lastName?: string;
  defaultPosition?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ============================================
// POSITION - Stanowisko
// ============================================

export interface Position {
  id: number;
  name: string;
  shortName: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionInput {
  name: string;
  shortName?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePositionInput {
  name?: string;
  shortName?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================
// NON-PRODUCTIVE TASK TYPE - Typ zadania nieprodukcyjnego
// ============================================

export interface NonProductiveTaskType {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonProductiveTaskTypeInput {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateNonProductiveTaskTypeInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================
// NON-PRODUCTIVE TASK - Zadanie nieprodukcyjne
// ============================================

export interface NonProductiveTask {
  id: number;
  timeEntryId: number;
  taskTypeId: number;
  hours: number;
  notes: string | null;
  createdAt: string;
  taskType?: NonProductiveTaskType;
}

export interface NonProductiveTaskInput {
  taskTypeId: number;
  hours: number;
  notes?: string | null;
}

// ============================================
// ABSENCE TYPE - Typ nieobecności
// ============================================

export type AbsenceType = 'SICK' | 'VACATION' | 'ABSENT';

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  SICK: 'Choroba',
  VACATION: 'Urlop',
  ABSENT: 'Nieobecność',
};

// ============================================
// TIME ENTRY - Wpis czasu pracy
// ============================================

export interface TimeEntry {
  id: number;
  date: string;
  workerId: number;
  positionId: number;
  productiveHours: number;
  absenceType: AbsenceType | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  worker?: Worker;
  position?: Position;
  nonProductiveTasks?: NonProductiveTask[];
  specialWorks?: SpecialWork[];
}

export interface CreateTimeEntryInput {
  date: string; // YYYY-MM-DD
  workerId: number;
  positionId: number;
  productiveHours?: number;
  absenceType?: AbsenceType | null;
  notes?: string | null;
  nonProductiveTasks?: NonProductiveTaskInput[];
  specialWorks?: SpecialWorkInput[];
}

export interface UpdateTimeEntryInput {
  positionId?: number;
  productiveHours?: number;
  absenceType?: AbsenceType | null;
  notes?: string | null;
  nonProductiveTasks?: NonProductiveTaskInput[];
  specialWorks?: SpecialWorkInput[];
}

// ============================================
// SET STANDARD DAY - Ustawienie standardowego dnia
// ============================================

export interface BulkWorkerEntry {
  workerId: number;
  positionId?: number;
  productiveHours: number;
}

export interface SetStandardDayInput {
  date: string; // YYYY-MM-DD
  defaultProductiveHours?: number;
  entries: BulkWorkerEntry[];
}

// ============================================
// CALENDAR & SUMMARY
// ============================================

// Status dnia: empty (brak wpisów), partial (część pracowników), complete (wszyscy)
export type DayStatus = 'empty' | 'partial' | 'complete';

export interface CalendarDay {
  date: string;
  status: DayStatus;
  entriesCount: number;
  totalWorkers: number;
}

export interface CalendarSummary {
  year: number;
  month: number;
  days: CalendarDay[];
  totalActiveWorkers: number;
}

export interface WorkerDaySummary {
  worker: Worker;
  entry: TimeEntry | null;
  totalHours: number;
  productiveHours: number;
  nonProductiveHours: number;
}

export interface DaySummary {
  date: string;
  status: DayStatus;
  workers: WorkerDaySummary[];
  totals: {
    entriesCount: number;
    totalWorkers: number;
    totalProductiveHours: number;
    totalNonProductiveHours: number;
    totalHours: number;
  };
}

// ============================================
// QUERY PARAMS
// ============================================

export interface TimeEntryQuery {
  date?: string;
  from?: string;
  to?: string;
  workerId?: number;
}

export interface CalendarQuery {
  year: number;
  month: number;
}

export interface DaySummaryQuery {
  date: string;
}

// ============================================
// SPECIAL WORK TYPE - Typ nietypówki (Drzwi, HS, PSK, szprosy, trapez)
// ============================================

export interface SpecialWorkType {
  id: number;
  name: string;
  shortName: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecialWorkTypeInput {
  name: string;
  shortName?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateSpecialWorkTypeInput {
  name?: string;
  shortName?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================
// SPECIAL WORK - Nietypówka przypisana do wpisu godzinowego
// ============================================

export interface SpecialWork {
  id: number;
  timeEntryId: number;
  specialTypeId: number;
  hours: number;
  notes: string | null;
  createdAt: string;
  specialType?: SpecialWorkType;
}

export interface SpecialWorkInput {
  specialTypeId: number;
  hours: number;
  notes?: string | null;
}
