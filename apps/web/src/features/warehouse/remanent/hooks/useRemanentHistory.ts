import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remanentApi } from '../api/remanentApi';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import type { RemanentHistoryEntry, RemanentHistoryGroup } from '@/types/warehouse';

/**
 * Hook do pobierania historii dla koloru
 */
export function useRemanentHistory(colorId: number | null, limit?: number) {
  return useQuery({
    queryKey: ['remanent-history', colorId, limit],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- enabled check guarantees colorId is not null
    queryFn: () => remanentApi.getHistory(colorId!, limit),
    enabled: !!colorId,
  });
}

/**
 * Hook do pobierania całej historii (wszystkie kolory)
 */
export function useAllRemanentHistory(limit?: number) {
  return useQuery({
    queryKey: ['remanent-history', 'all', limit],
    queryFn: () => remanentApi.getAllHistory(limit),
  });
}

/**
 * Helper do grupowania historii po dacie + kolorze
 */
export function groupRemanentHistory(entries: RemanentHistoryEntry[]): RemanentHistoryGroup[] {
  const groups = new Map<string, RemanentHistoryGroup>();

  entries.forEach((entry) => {
    // Grupuj po dacie (z dokładnością do minuty) i kolorze
    const dateKey = new Date(entry.recordedAt).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const key = `${dateKey}-${entry.colorId}`;

    if (!groups.has(key)) {
      groups.set(key, {
        date: entry.recordedAt,
        colorId: entry.colorId,
        colorCode: entry.color.code,
        colorName: entry.color.name,
        entries: [],
        totalProfiles: 0,
        differencesCount: 0,
        canRollback: false,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- groups.has check guarantees the key exists
    const group = groups.get(key)!;
    group.entries.push(entry);
    group.totalProfiles++;
    if (entry.difference !== 0) {
      group.differencesCount++;
    }
  });

  // Convert to array and sort by date desc
  const groupsArray = Array.from(groups.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Mark most recent as rollbackable (if < 24h)
  if (groupsArray.length > 0) {
    const mostRecent = groupsArray[0];
    const hoursSince = (Date.now() - new Date(mostRecent.date).getTime()) / (1000 * 60 * 60);
    mostRecent.canRollback = hoursSince < 24;
  }

  return groupsArray;
}

/**
 * Hook do cofania remanentu
 */
export function useRollback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (colorId: number) => remanentApi.rollback(colorId),
    onSuccess: (response) => {
      showSuccessToast('Remanent cofnięty', response.message);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['remanent-history'] });
    },
    onError: (error) => {
      showErrorToast('Błąd cofania remanentu', getErrorMessage(error));
    },
  });
}
