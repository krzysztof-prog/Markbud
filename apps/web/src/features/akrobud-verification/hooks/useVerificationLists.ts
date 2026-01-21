/**
 * Verification Lists hooks - data fetching
 */

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { verificationApi } from '../api/verificationApi';
import type { VerificationListFilters } from '@/types';

// Query keys
export const VERIFICATION_LIST_KEYS = {
  all: ['akrobud-verification'] as const,
  lists: () => [...VERIFICATION_LIST_KEYS.all, 'lists'] as const,
  list: (id: number) => [...VERIFICATION_LIST_KEYS.all, 'list', id] as const,
  filtered: (filters: VerificationListFilters) =>
    [...VERIFICATION_LIST_KEYS.lists(), filters] as const,
};

/**
 * Hook do pobierania wszystkich list weryfikacyjnych
 */
export function useVerificationLists(filters?: VerificationListFilters) {
  return useQuery({
    queryKey: VERIFICATION_LIST_KEYS.filtered(filters ?? {}),
    queryFn: () => verificationApi.getAll(filters),
    staleTime: 30 * 1000, // 30 sekund
  });
}

/**
 * Hook do pobierania wszystkich list weryfikacyjnych (Suspense)
 */
export function useSuspenseVerificationLists(filters?: VerificationListFilters) {
  return useSuspenseQuery({
    queryKey: VERIFICATION_LIST_KEYS.filtered(filters ?? {}),
    queryFn: () => verificationApi.getAll(filters),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook do pobierania pojedynczej listy weryfikacyjnej
 */
export function useVerificationList(id: number | null) {
  return useQuery({
    queryKey: VERIFICATION_LIST_KEYS.list(id ?? 0),
    queryFn: () => id !== null ? verificationApi.getById(id) : Promise.reject(new Error('No id')),
    enabled: id !== null && id > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook do pobierania pojedynczej listy weryfikacyjnej (Suspense)
 */
export function useSuspenseVerificationList(id: number) {
  return useSuspenseQuery({
    queryKey: VERIFICATION_LIST_KEYS.list(id),
    queryFn: () => verificationApi.getById(id),
    staleTime: 30 * 1000,
  });
}
