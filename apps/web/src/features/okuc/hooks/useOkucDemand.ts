/**
 * React Query hooks for OKUC Demand (Zapotrzebowanie)
 *
 * Hooks for managing hardware demand with React Query.
 * Handles CRUD operations, filtering, and cache management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { fetchApi } from '@/lib/api-client';
import type {
  OkucDemand,
  CreateDemandInput,
  UpdateDemandInput,
  DemandFilters,
  WeeklyDemandSummary,
} from '@/types/okuc';

// ============================================================================
// API CLIENT - używa fetchApi z autoryzacją
// ============================================================================

const API_BASE = '/api/okuc/demand';

const okucDemandApi = {
  /** GET /api/okuc/demand - List all demands with optional filters */
  async getAll(filters?: DemandFilters): Promise<OkucDemand[]> {
    const params = new URLSearchParams();
    if (filters?.articleId) params.set('articleId', filters.articleId.toString());
    if (filters?.orderId) params.set('orderId', filters.orderId.toString());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.expectedWeek) params.set('expectedWeek', filters.expectedWeek);
    if (filters?.fromWeek) params.set('fromWeek', filters.fromWeek);
    if (filters?.toWeek) params.set('toWeek', filters.toWeek);
    if (filters?.isManualEdit !== undefined) params.set('isManualEdit', filters.isManualEdit.toString());

    const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
    return fetchApi<OkucDemand[]>(url);
  },

  /** GET /api/okuc/demand/summary - Get demand summary grouped by week */
  async getSummary(fromWeek?: string, toWeek?: string): Promise<WeeklyDemandSummary[]> {
    const params = new URLSearchParams();
    if (fromWeek) params.set('fromWeek', fromWeek);
    if (toWeek) params.set('toWeek', toWeek);

    const url = params.toString() ? `${API_BASE}/summary?${params}` : `${API_BASE}/summary`;
    return fetchApi<WeeklyDemandSummary[]>(url);
  },

  /** GET /api/okuc/demand/:id - Get demand by ID */
  async getById(id: number): Promise<OkucDemand> {
    return fetchApi<OkucDemand>(`${API_BASE}/${id}`);
  },

  /** POST /api/okuc/demand - Create a new demand */
  async create(data: CreateDemandInput): Promise<OkucDemand> {
    return fetchApi<OkucDemand>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** PUT /api/okuc/demand/:id - Update demand */
  async update(id: number, data: UpdateDemandInput): Promise<OkucDemand> {
    return fetchApi<OkucDemand>(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** DELETE /api/okuc/demand/:id - Delete demand */
  async delete(id: number): Promise<void> {
    return fetchApi<void>(`${API_BASE}/${id}`, { method: 'DELETE' });
  },
};

// ============================================================================
// QUERY KEYS
// ============================================================================

export const okucDemandKeys = {
  all: ['okuc-demand'] as const,
  lists: () => [...okucDemandKeys.all, 'list'] as const,
  list: (filters?: DemandFilters) => [...okucDemandKeys.lists(), { filters }] as const,
  summaries: () => [...okucDemandKeys.all, 'summary'] as const,
  summary: (fromWeek?: string, toWeek?: string) =>
    [...okucDemandKeys.summaries(), { fromWeek, toWeek }] as const,
  details: () => [...okucDemandKeys.all, 'detail'] as const,
  detail: (id: number) => [...okucDemandKeys.details(), id] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook: useOkucDemands
 * Fetch all demands with optional filters
 */
export function useOkucDemands(filters?: DemandFilters) {
  return useQuery({
    queryKey: okucDemandKeys.list(filters),
    queryFn: () => okucDemandApi.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook: useOkucDemandSummary
 * Fetch demand summary grouped by week
 */
export function useOkucDemandSummary(fromWeek?: string, toWeek?: string) {
  return useQuery({
    queryKey: okucDemandKeys.summary(fromWeek, toWeek),
    queryFn: () => okucDemandApi.getSummary(fromWeek, toWeek),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: useOkucDemandById
 * Fetch a single demand by ID
 */
export function useOkucDemandById(id: number) {
  return useQuery({
    queryKey: okucDemandKeys.detail(id),
    queryFn: () => okucDemandApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook: useCreateOkucDemand
 * Create a new demand
 */
export function useCreateOkucDemand(callbacks?: {
  onSuccess?: (demand: OkucDemand) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDemandInput) => okucDemandApi.create(data),
    onSuccess: (demand) => {
      // Invalidate all demand lists and summaries
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.lists() });
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.summaries() });

      toast({
        title: 'Zapotrzebowanie utworzone',
        description: `Dodano zapotrzebowanie na ${demand.quantity} szt.`,
        variant: 'default',
      });

      callbacks?.onSuccess?.(demand);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd tworzenia zapotrzebowania',
        description: error.message || 'Nie udało się utworzyć zapotrzebowania.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook: useUpdateOkucDemand
 * Update an existing demand
 */
export function useUpdateOkucDemand(callbacks?: {
  onSuccess?: (demand: OkucDemand) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDemandInput }) =>
      okucDemandApi.update(id, data),
    onSuccess: (demand) => {
      // Invalidate lists, summaries, and specific detail
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.lists() });
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.detail(demand.id) });

      toast({
        title: 'Zapotrzebowanie zaktualizowane',
        description: 'Zmiany zostały zapisane.',
        variant: 'default',
      });

      callbacks?.onSuccess?.(demand);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji zapotrzebowania',
        description: error.message || 'Nie udało się zaktualizować zapotrzebowania.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}

/**
 * Hook: useDeleteOkucDemand
 * Delete a demand
 */
export function useDeleteOkucDemand(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => okucDemandApi.delete(id),
    onSuccess: () => {
      // Invalidate lists and summaries
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.lists() });
      queryClient.invalidateQueries({ queryKey: okucDemandKeys.summaries() });

      toast({
        title: 'Zapotrzebowanie usunięte',
        description: 'Zapotrzebowanie zostało pomyślnie usunięte.',
        variant: 'default',
      });

      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd usuwania zapotrzebowania',
        description: error.message || 'Nie udało się usunąć zapotrzebowania.',
        variant: 'destructive',
      });

      callbacks?.onError?.(error);
    },
  });
}
