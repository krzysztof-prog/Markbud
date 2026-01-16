import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';
import type {
  ImportConflict,
  ConflictDetail,
  ConflictsCount,
  ResolveConflictInput,
  ResolveConflictResult,
  BulkResolveConflictsInput,
  BulkResolveConflictsResult,
  UserOrder,
  UserDelivery,
  UserGlassOrder,
  DaySummary,
} from '../types';

// Query keys
export const mojaPracaKeys = {
  all: ['moja-praca'] as const,
  conflicts: () => [...mojaPracaKeys.all, 'conflicts'] as const,
  conflictsList: (status: string) => [...mojaPracaKeys.conflicts(), 'list', status] as const,
  conflictsCount: () => [...mojaPracaKeys.conflicts(), 'count'] as const,
  conflictDetail: (id: number) => [...mojaPracaKeys.conflicts(), 'detail', id] as const,
  orders: (date: string) => [...mojaPracaKeys.all, 'orders', date] as const,
  deliveries: (date: string) => [...mojaPracaKeys.all, 'deliveries', date] as const,
  glassOrders: (date: string) => [...mojaPracaKeys.all, 'glass-orders', date] as const,
  summary: (date: string) => [...mojaPracaKeys.all, 'summary', date] as const,
};

// API functions
const mojaPracaApi = {
  // Konflikty
  getConflicts: async (status: 'pending' | 'resolved' | 'all' = 'pending'): Promise<ImportConflict[]> => {
    return fetchApi<ImportConflict[]>(`/api/moja-praca/conflicts?status=${status}`);
  },

  getConflictsCount: async (): Promise<ConflictsCount> => {
    return fetchApi<ConflictsCount>('/api/moja-praca/conflicts/count');
  },

  getConflictDetail: async (id: number): Promise<ConflictDetail> => {
    return fetchApi<ConflictDetail>(`/api/moja-praca/conflicts/${id}`);
  },

  resolveConflict: async (id: number, input: ResolveConflictInput): Promise<ResolveConflictResult> => {
    return fetchApi<ResolveConflictResult>(`/api/moja-praca/conflicts/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  bulkResolveConflicts: async (input: BulkResolveConflictsInput): Promise<BulkResolveConflictsResult> => {
    return fetchApi<BulkResolveConflictsResult>('/api/moja-praca/conflicts/bulk-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  // Zlecenia
  getOrders: async (date: string): Promise<UserOrder[]> => {
    return fetchApi<UserOrder[]>(`/api/moja-praca/orders?date=${date}`);
  },

  // Dostawy
  getDeliveries: async (date: string): Promise<UserDelivery[]> => {
    return fetchApi<UserDelivery[]>(`/api/moja-praca/deliveries?date=${date}`);
  },

  // Zamówienia szyb
  getGlassOrders: async (date: string): Promise<UserGlassOrder[]> => {
    return fetchApi<UserGlassOrder[]>(`/api/moja-praca/glass-orders?date=${date}`);
  },

  // Podsumowanie dnia
  getSummary: async (date: string): Promise<DaySummary> => {
    return fetchApi<DaySummary>(`/api/moja-praca/summary?date=${date}`);
  },
};

// React Query hooks

// Pobierz listę konfliktów
export function useConflicts(status: 'pending' | 'resolved' | 'all' = 'pending') {
  return useQuery({
    queryKey: mojaPracaKeys.conflictsList(status),
    queryFn: () => mojaPracaApi.getConflicts(status),
  });
}

// Pobierz liczbę konfliktów (dla badge)
export function useConflictsCount() {
  return useQuery({
    queryKey: mojaPracaKeys.conflictsCount(),
    queryFn: mojaPracaApi.getConflictsCount,
    refetchInterval: 30000, // Odśwież co 30s
  });
}

// Pobierz szczegóły konfliktu
export function useConflictDetail(id: number) {
  return useQuery({
    queryKey: mojaPracaKeys.conflictDetail(id),
    queryFn: () => mojaPracaApi.getConflictDetail(id),
    enabled: id > 0,
  });
}

// Rozwiąż konflikt
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ResolveConflictInput }) =>
      mojaPracaApi.resolveConflict(id, input),
    onSuccess: () => {
      // Invalidate wszystkie query związane z konfliktami
      queryClient.invalidateQueries({ queryKey: mojaPracaKeys.conflicts() });
    },
  });
}

// Rozwiąż wiele konfliktów naraz (bulk)
export function useBulkResolveConflicts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkResolveConflictsInput) =>
      mojaPracaApi.bulkResolveConflicts(input),
    onSuccess: () => {
      // Invalidate wszystkie query związane z konfliktami
      queryClient.invalidateQueries({ queryKey: mojaPracaKeys.conflicts() });
    },
  });
}

// Pobierz zlecenia użytkownika
export function useUserOrders(date: string) {
  return useQuery({
    queryKey: mojaPracaKeys.orders(date),
    queryFn: () => mojaPracaApi.getOrders(date),
    enabled: !!date,
  });
}

// Pobierz dostawy użytkownika
export function useUserDeliveries(date: string) {
  return useQuery({
    queryKey: mojaPracaKeys.deliveries(date),
    queryFn: () => mojaPracaApi.getDeliveries(date),
    enabled: !!date,
  });
}

// Pobierz zamówienia szyb użytkownika
export function useUserGlassOrders(date: string) {
  return useQuery({
    queryKey: mojaPracaKeys.glassOrders(date),
    queryFn: () => mojaPracaApi.getGlassOrders(date),
    enabled: !!date,
  });
}

// Pobierz podsumowanie dnia
export function useDaySummary(date: string) {
  return useQuery({
    queryKey: mojaPracaKeys.summary(date),
    queryFn: () => mojaPracaApi.getSummary(date),
    enabled: !!date,
  });
}
