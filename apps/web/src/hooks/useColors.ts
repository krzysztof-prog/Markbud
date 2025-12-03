import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { colorsApi } from '@/lib/api';
import type { Color } from '@/types';

/**
 * Hook do pobierania kolorów z cache i grupowania
 */
export function useColors() {
  const { data: colors, isLoading, error } = useQuery({
    queryKey: ['colors'],
    queryFn: () => colorsApi.getAll(),
  });

  const grouped = useMemo(() => {
    if (!colors) {
      return { typical: [], atypical: [], all: [] };
    }

    return {
      typical: colors.filter((c: Color) => c.type === 'typical'),
      atypical: colors.filter((c: Color) => c.type === 'atypical'),
      all: colors,
    };
  }, [colors]);

  return {
    colors: grouped.all,
    typicalColors: grouped.typical,
    atypicalColors: grouped.atypical,
    isLoading,
    error,
  };
}
