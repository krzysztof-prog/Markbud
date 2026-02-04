/**
 * Hook do grupowania zleceń
 */

import { useMemo, useCallback } from 'react';
import { formatDate } from '@/lib/utils';
import { formatDateWarsaw } from '@/lib/date-utils';
import type { ExtendedOrder, GroupBy } from '../types';

// ================================
// Funkcje pomocnicze do grupowania
// ================================

/**
 * Zwraca numer tygodnia w roku
 */
const getWeekNumber = (date: Date): string => {
  const onejan = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${week}`;
};

/**
 * Zwraca klucz miesiąca (YYYY-MM)
 */
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Zwraca klucz dnia (YYYY-MM-DD)
 */
const getDayKey = (date: Date): string => {
  return formatDateWarsaw(date);
};

/**
 * Generuje klucz grupowania dla zlecenia
 */
const getGroupKey = (order: ExtendedOrder, groupBy: GroupBy): string => {
  switch (groupBy) {
    case 'client':
      return order.client || 'Bez klienta';
    case 'system':
      return order.system || 'Bez systemu';
    case 'deadline-day':
      return order.deadline ? getDayKey(new Date(order.deadline)) : 'Bez terminu';
    case 'deadline-week':
      return order.deadline ? getWeekNumber(new Date(order.deadline)) : 'Bez terminu';
    case 'deadline-month':
      return order.deadline ? getMonthKey(new Date(order.deadline)) : 'Bez terminu';
    default:
      return '';
  }
};

/**
 * Generuje etykietę grupy dla wyświetlania
 */
const getGroupLabel = (key: string, groupBy: GroupBy): string => {
  if (key === 'Bez klienta' || key === 'Bez systemu' || key === 'Bez terminu') {
    return key;
  }

  switch (groupBy) {
    case 'deadline-day':
      return formatDate(key);
    case 'deadline-week': {
      const [year, week] = key.split('-W');
      return `Tydzień ${week}, ${year}`;
    }
    case 'deadline-month': {
      const [y, m] = key.split('-');
      const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                         'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
      return `${monthNames[parseInt(m) - 1]} ${y}`;
    }
    default:
      return key;
  }
};

// ================================
// Hook useOrderGrouping
// ================================

interface UseOrderGroupingOptions {
  filteredOrders: ExtendedOrder[];
  groupBy: GroupBy;
}

interface UseOrderGroupingReturn {
  groupedOrders: Record<string, ExtendedOrder[]>;
  getGroupLabel: (key: string) => string;
}

export function useOrderGrouping({
  filteredOrders,
  groupBy,
}: UseOrderGroupingOptions): UseOrderGroupingReturn {
  // Grupuj zlecenia
  const groupedOrders = useMemo(() => {
    if (groupBy === 'none') {
      return { 'all': filteredOrders };
    }

    const groups: Record<string, ExtendedOrder[]> = {};
    filteredOrders.forEach((order: ExtendedOrder) => {
      const key = getGroupKey(order, groupBy);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });

    return groups;
  }, [filteredOrders, groupBy]);

  // Funkcja do pobierania etykiety grupy (zamknięcie na groupBy)
  const getGroupLabelFn = useCallback((key: string) => {
    return getGroupLabel(key, groupBy);
  }, [groupBy]);

  return {
    groupedOrders,
    getGroupLabel: getGroupLabelFn,
  };
}

// Eksportuj też funkcje pomocnicze dla użycia zewnętrznego
export { getWeekNumber, getMonthKey, getDayKey, getGroupKey, getGroupLabel };
