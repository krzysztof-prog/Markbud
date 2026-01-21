/**
 * Hooki React Query dla modułu godzinówek
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { timesheetsApi } from '../api/timesheetsApi';
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
  SetStandardDayInput,
  SetAbsenceRangeInput,
  TimeEntryQuery,
} from '../types';

// ============================================
// QUERY KEYS
// ============================================

export const timesheetsKeys = {
  all: ['timesheets'] as const,
  workers: {
    all: ['timesheets', 'workers'] as const,
    list: (isActive?: boolean) =>
      ['timesheets', 'workers', 'list', { isActive }] as const,
    detail: (id: number) => ['timesheets', 'workers', 'detail', id] as const,
  },
  positions: {
    all: ['timesheets', 'positions'] as const,
    list: (isActive?: boolean) =>
      ['timesheets', 'positions', 'list', { isActive }] as const,
    detail: (id: number) => ['timesheets', 'positions', 'detail', id] as const,
  },
  taskTypes: {
    all: ['timesheets', 'taskTypes'] as const,
    list: (isActive?: boolean) =>
      ['timesheets', 'taskTypes', 'list', { isActive }] as const,
    detail: (id: number) => ['timesheets', 'taskTypes', 'detail', id] as const,
  },
  specialWorkTypes: {
    all: ['timesheets', 'specialWorkTypes'] as const,
    list: (isActive?: boolean) =>
      ['timesheets', 'specialWorkTypes', 'list', { isActive }] as const,
    detail: (id: number) => ['timesheets', 'specialWorkTypes', 'detail', id] as const,
  },
  entries: {
    all: ['timesheets', 'entries'] as const,
    list: (query?: TimeEntryQuery) =>
      ['timesheets', 'entries', 'list', query] as const,
    detail: (id: number) => ['timesheets', 'entries', 'detail', id] as const,
  },
  calendar: {
    all: ['timesheets', 'calendar'] as const,
    summary: (year: number, month: number) =>
      ['timesheets', 'calendar', 'summary', { year, month }] as const,
  },
  daySummary: (date: string) =>
    ['timesheets', 'daySummary', date] as const,
};

// ============================================
// WORKERS HOOKS
// ============================================

export function useWorkers(isActive?: boolean) {
  return useQuery({
    queryKey: timesheetsKeys.workers.list(isActive),
    queryFn: () => timesheetsApi.workers.getAll(isActive),
  });
}

export function useWorker(id: number) {
  return useQuery({
    queryKey: timesheetsKeys.workers.detail(id),
    queryFn: () => timesheetsApi.workers.getById(id),
    enabled: id > 0,
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkerInput) => timesheetsApi.workers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.workers.all });
      // Nowy pracownik musi pojawić się w widoku dnia
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      showSuccessToast('Pracownik dodany', 'Nowy pracownik został utworzony');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dodawania pracownika', getErrorMessage(error));
    },
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkerInput }) =>
      timesheetsApi.workers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.workers.all });
      // Zmiana danych pracownika (np. stanowisko) musi odświeżyć widok dnia
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      showSuccessToast('Pracownik zaktualizowany', 'Dane pracownika zostały zapisane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji pracownika', getErrorMessage(error));
    },
  });
}

export function useDeactivateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => timesheetsApi.workers.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.workers.all });
      // Dezaktywowany pracownik musi zniknąć z widoku dnia
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      showSuccessToast('Pracownik dezaktywowany', 'Pracownik został oznaczony jako nieaktywny');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dezaktywacji pracownika', getErrorMessage(error));
    },
  });
}

// ============================================
// POSITIONS HOOKS
// ============================================

export function usePositions(isActive?: boolean) {
  return useQuery({
    queryKey: timesheetsKeys.positions.list(isActive),
    queryFn: () => timesheetsApi.positions.getAll(isActive),
  });
}

export function usePosition(id: number) {
  return useQuery({
    queryKey: timesheetsKeys.positions.detail(id),
    queryFn: () => timesheetsApi.positions.getById(id),
    enabled: id > 0,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePositionInput) =>
      timesheetsApi.positions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.positions.all });
      showSuccessToast('Stanowisko dodane', 'Nowe stanowisko zostało utworzone');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dodawania stanowiska', getErrorMessage(error));
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePositionInput }) =>
      timesheetsApi.positions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.positions.all });
      showSuccessToast('Stanowisko zaktualizowane', 'Zmiany zostały zapisane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji stanowiska', getErrorMessage(error));
    },
  });
}

// ============================================
// TASK TYPES HOOKS
// ============================================

export function useTaskTypes(isActive?: boolean) {
  return useQuery({
    queryKey: timesheetsKeys.taskTypes.list(isActive),
    queryFn: () => timesheetsApi.taskTypes.getAll(isActive),
  });
}

export function useTaskType(id: number) {
  return useQuery({
    queryKey: timesheetsKeys.taskTypes.detail(id),
    queryFn: () => timesheetsApi.taskTypes.getById(id),
    enabled: id > 0,
  });
}

export function useCreateTaskType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNonProductiveTaskTypeInput) =>
      timesheetsApi.taskTypes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.taskTypes.all });
      showSuccessToast('Typ zadania dodany', 'Nowy typ zadania nieprodukcyjnego został utworzony');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dodawania typu zadania', getErrorMessage(error));
    },
  });
}

export function useUpdateTaskType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateNonProductiveTaskTypeInput;
    }) => timesheetsApi.taskTypes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.taskTypes.all });
      showSuccessToast('Typ zadania zaktualizowany', 'Zmiany zostały zapisane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji typu zadania', getErrorMessage(error));
    },
  });
}

// ============================================
// SPECIAL WORK TYPES HOOKS (Nietypówki)
// ============================================

export function useSpecialWorkTypes(isActive?: boolean) {
  return useQuery({
    queryKey: timesheetsKeys.specialWorkTypes.list(isActive),
    queryFn: () => timesheetsApi.specialWorkTypes.getAll(isActive),
  });
}

export function useSpecialWorkType(id: number) {
  return useQuery({
    queryKey: timesheetsKeys.specialWorkTypes.detail(id),
    queryFn: () => timesheetsApi.specialWorkTypes.getById(id),
    enabled: id > 0,
  });
}

export function useCreateSpecialWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSpecialWorkTypeInput) =>
      timesheetsApi.specialWorkTypes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.specialWorkTypes.all });
      showSuccessToast('Nietypówka dodana', 'Nowy typ pracy nietypowej został utworzony');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dodawania nietypówki', getErrorMessage(error));
    },
  });
}

export function useUpdateSpecialWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateSpecialWorkTypeInput;
    }) => timesheetsApi.specialWorkTypes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.specialWorkTypes.all });
      showSuccessToast('Nietypówka zaktualizowana', 'Zmiany zostały zapisane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji nietypówki', getErrorMessage(error));
    },
  });
}

// ============================================
// TIME ENTRIES HOOKS
// ============================================

export function useTimeEntries(query?: TimeEntryQuery) {
  return useQuery({
    queryKey: timesheetsKeys.entries.list(query),
    queryFn: () => timesheetsApi.entries.getAll(query),
  });
}

export function useTimeEntry(id: number) {
  return useQuery({
    queryKey: timesheetsKeys.entries.detail(id),
    queryFn: () => timesheetsApi.entries.getById(id),
    enabled: id > 0,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTimeEntryInput) =>
      timesheetsApi.entries.create(data),
    onSuccess: (_, variables) => {
      // Invaliduj wpisy i podsumowania
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.entries.all });
      queryClient.invalidateQueries({
        queryKey: timesheetsKeys.daySummary(variables.date),
      });
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.calendar.all });
      showSuccessToast('Wpis dodany', 'Wpis czasu pracy został zapisany');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd dodawania wpisu', getErrorMessage(error));
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTimeEntryInput }) =>
      timesheetsApi.entries.update(id, data),
    onSuccess: () => {
      // Invaliduj wszystkie powiązane dane
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.entries.all });
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.calendar.all });
      // Ważne: invaliduj też daySummary - bez tego widok dnia nie odświeży godzin nieprodukcyjnych
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      showSuccessToast('Wpis zaktualizowany', 'Zmiany zostały zapisane');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji wpisu', getErrorMessage(error));
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => timesheetsApi.entries.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.entries.all });
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.calendar.all });
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      showSuccessToast('Wpis usunięty', 'Wpis czasu pracy został usunięty');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd usuwania wpisu', getErrorMessage(error));
    },
  });
}

// ============================================
// BULK OPERATIONS HOOKS
// ============================================

export function useSetStandardDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetStandardDayInput) =>
      timesheetsApi.bulk.setStandardDay(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.entries.all });
      queryClient.invalidateQueries({
        queryKey: timesheetsKeys.daySummary(variables.date),
      });
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.calendar.all });
      showSuccessToast('Dzień standardowy ustawiony', 'Godziny pracy zostały uzupełnione');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd ustawiania dnia standardowego', getErrorMessage(error));
    },
  });
}

export function useSetAbsenceRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetAbsenceRangeInput) =>
      timesheetsApi.bulk.setAbsenceRange(data),
    onSuccess: () => {
      // Invaliduj wszystkie powiązane dane - nieobecność może dotyczyć wielu dni
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.entries.all });
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'daySummary'] });
      queryClient.invalidateQueries({ queryKey: timesheetsKeys.calendar.all });
      showSuccessToast('Nieobecność zapisana', 'Okres nieobecności został zarejestrowany');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd zapisywania nieobecności', getErrorMessage(error));
    },
  });
}

// ============================================
// CALENDAR & SUMMARY HOOKS
// ============================================

export function useCalendarSummary(year: number, month: number) {
  return useQuery({
    queryKey: timesheetsKeys.calendar.summary(year, month),
    queryFn: () => timesheetsApi.calendar.getCalendarSummary(year, month),
  });
}

export function useDaySummary(date: string, enabled = true) {
  return useQuery({
    queryKey: timesheetsKeys.daySummary(date),
    queryFn: () => timesheetsApi.calendar.getDaySummary(date),
    enabled: enabled && !!date,
  });
}
