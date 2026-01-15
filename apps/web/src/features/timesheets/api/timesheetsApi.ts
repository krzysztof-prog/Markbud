/**
 * API dla modułu godzinówek produkcyjnych
 */

import { fetchApi } from '@/lib/api-client';
import type {
  Worker,
  CreateWorkerInput,
  UpdateWorkerInput,
  Position,
  CreatePositionInput,
  UpdatePositionInput,
  NonProductiveTaskType,
  CreateNonProductiveTaskTypeInput,
  UpdateNonProductiveTaskTypeInput,
  SpecialWorkType,
  CreateSpecialWorkTypeInput,
  UpdateSpecialWorkTypeInput,
  TimeEntry,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  SetStandardDayInput,
  SetAbsenceRangeInput,
  CalendarSummary,
  DaySummary,
  TimeEntryQuery,
} from '../types';

const BASE_URL = '/api/timesheets';

// ============================================
// WORKERS API
// ============================================

export const workersApi = {
  /**
   * Pobierz wszystkich pracowników
   */
  getAll: (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return fetchApi<Worker[]>(`${BASE_URL}/workers${query}`);
  },

  /**
   * Pobierz pracownika po ID
   */
  getById: (id: number) => fetchApi<Worker>(`${BASE_URL}/workers/${id}`),

  /**
   * Utwórz nowego pracownika
   */
  create: (data: CreateWorkerInput) =>
    fetchApi<Worker>(`${BASE_URL}/workers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj pracownika
   */
  update: (id: number, data: UpdateWorkerInput) =>
    fetchApi<Worker>(`${BASE_URL}/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Dezaktywuj pracownika (soft delete)
   */
  deactivate: (id: number) =>
    fetchApi<Worker>(`${BASE_URL}/workers/${id}`, { method: 'DELETE' }),
};

// ============================================
// POSITIONS API
// ============================================

export const positionsApi = {
  /**
   * Pobierz wszystkie stanowiska
   */
  getAll: (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return fetchApi<Position[]>(`${BASE_URL}/positions${query}`);
  },

  /**
   * Pobierz stanowisko po ID
   */
  getById: (id: number) => fetchApi<Position>(`${BASE_URL}/positions/${id}`),

  /**
   * Utwórz nowe stanowisko
   */
  create: (data: CreatePositionInput) =>
    fetchApi<Position>(`${BASE_URL}/positions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj stanowisko
   */
  update: (id: number, data: UpdatePositionInput) =>
    fetchApi<Position>(`${BASE_URL}/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// NON-PRODUCTIVE TASK TYPES API
// ============================================

export const taskTypesApi = {
  /**
   * Pobierz wszystkie typy zadań nieprodukcyjnych
   */
  getAll: (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return fetchApi<NonProductiveTaskType[]>(`${BASE_URL}/task-types${query}`);
  },

  /**
   * Pobierz typ zadania po ID
   */
  getById: (id: number) =>
    fetchApi<NonProductiveTaskType>(`${BASE_URL}/task-types/${id}`),

  /**
   * Utwórz nowy typ zadania
   */
  create: (data: CreateNonProductiveTaskTypeInput) =>
    fetchApi<NonProductiveTaskType>(`${BASE_URL}/task-types`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj typ zadania
   */
  update: (id: number, data: UpdateNonProductiveTaskTypeInput) =>
    fetchApi<NonProductiveTaskType>(`${BASE_URL}/task-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// SPECIAL WORK TYPES API (Nietypówki)
// ============================================

export const specialWorkTypesApi = {
  /**
   * Pobierz wszystkie typy nietypówek
   */
  getAll: (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return fetchApi<SpecialWorkType[]>(`${BASE_URL}/special-work-types${query}`);
  },

  /**
   * Pobierz typ nietypówki po ID
   */
  getById: (id: number) =>
    fetchApi<SpecialWorkType>(`${BASE_URL}/special-work-types/${id}`),

  /**
   * Utwórz nowy typ nietypówki
   */
  create: (data: CreateSpecialWorkTypeInput) =>
    fetchApi<SpecialWorkType>(`${BASE_URL}/special-work-types`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj typ nietypówki
   */
  update: (id: number, data: UpdateSpecialWorkTypeInput) =>
    fetchApi<SpecialWorkType>(`${BASE_URL}/special-work-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================
// TIME ENTRIES API
// ============================================

export const timeEntriesApi = {
  /**
   * Pobierz wpisy czasu pracy
   */
  getAll: (query?: TimeEntryQuery) => {
    const params = new URLSearchParams();
    if (query?.date) params.append('date', query.date);
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.workerId) params.append('workerId', query.workerId.toString());
    const queryString = params.toString();
    return fetchApi<TimeEntry[]>(
      `${BASE_URL}/entries${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Pobierz wpis czasu po ID
   */
  getById: (id: number) => fetchApi<TimeEntry>(`${BASE_URL}/entries/${id}`),

  /**
   * Utwórz nowy wpis czasu pracy
   */
  create: (data: CreateTimeEntryInput) =>
    fetchApi<TimeEntry>(`${BASE_URL}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aktualizuj wpis czasu pracy
   */
  update: (id: number, data: UpdateTimeEntryInput) =>
    fetchApi<TimeEntry>(`${BASE_URL}/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń wpis czasu pracy
   */
  delete: (id: number) =>
    fetchApi<void>(`${BASE_URL}/entries/${id}`, { method: 'DELETE' }),
};

// ============================================
// BULK OPERATIONS API
// ============================================

export const bulkApi = {
  /**
   * Ustaw standardowy dzień dla wielu pracowników
   */
  setStandardDay: (data: SetStandardDayInput) =>
    fetchApi<TimeEntry[]>(`${BASE_URL}/set-standard-day`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Ustaw nieobecność na zakres dat (pomija weekendy)
   */
  setAbsenceRange: (data: SetAbsenceRangeInput) =>
    fetchApi<TimeEntry[]>(`${BASE_URL}/set-absence-range`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// CALENDAR & SUMMARY API
// ============================================

export const calendarApi = {
  /**
   * Pobierz podsumowanie kalendarza dla miesiąca
   */
  getCalendarSummary: (year: number, month: number) =>
    fetchApi<CalendarSummary>(`${BASE_URL}/calendar?year=${year}&month=${month}`),

  /**
   * Pobierz podsumowanie dnia
   */
  getDaySummary: (date: string) =>
    fetchApi<DaySummary>(`${BASE_URL}/day-summary?date=${date}`),
};

// ============================================
// UNIFIED EXPORT
// ============================================

export const timesheetsApi = {
  workers: workersApi,
  positions: positionsApi,
  taskTypes: taskTypesApi,
  specialWorkTypes: specialWorkTypesApi,
  entries: timeEntriesApi,
  bulk: bulkApi,
  calendar: calendarApi,
};
