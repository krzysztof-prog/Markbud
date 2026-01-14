/**
 * Hook do obliczania statystyk zleceń
 */

import { useMemo } from 'react';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '@/lib/money';
import type { ExtendedOrder, OrdersStats, FilteredSummary } from '../types';

// ================================
// Hook useOrdersStats
// ================================

interface UseOrdersStatsOptions {
  allOrders: ExtendedOrder[];
  filteredOrders: ExtendedOrder[];
}

interface UseOrdersStatsReturn {
  stats: OrdersStats;
  filteredSummary: FilteredSummary;
}

export function useOrdersStats({
  allOrders,
  filteredOrders,
}: UseOrdersStatsOptions): UseOrdersStatsReturn {
  // Oblicz statystyki dla wszystkich zleceń
  // Wartości w bazie są przechowywane jako grosze/centy (integer)
  // Stats są przekazywane do OrdersStatsModal w jednostkach złotych/euro
  const stats = useMemo<OrdersStats>(() => {
    return allOrders.reduce(
      (acc, order: ExtendedOrder) => {
        acc.totalOrders++;
        // Konwertuj grosze na PLN i centy na EUR
        acc.totalValuePln += typeof order.valuePln === 'number' ? groszeToPln(order.valuePln as Grosze) : 0;
        acc.totalValueEur += typeof order.valueEur === 'number' ? centyToEur(order.valueEur as Centy) : 0;
        acc.totalWindows += order.totalWindows || order._count?.windows || 0;
        acc.totalSashes += order.totalSashes || 0;
        acc.totalGlasses += order.totalGlasses || 0;
        return acc;
      },
      {
        totalOrders: 0,
        totalValuePln: 0,
        totalValueEur: 0,
        totalWindows: 0,
        totalSashes: 0,
        totalGlasses: 0,
      }
    );
  }, [allOrders]);

  // Oblicz sumę dla przefiltrowanych zleceń (okna, skrzydła, szklenia)
  const filteredSummary = useMemo<FilteredSummary>(() => {
    return filteredOrders.reduce(
      (acc, order: ExtendedOrder) => {
        acc.totalWindows += order.totalWindows || order._count?.windows || 0;
        acc.totalSashes += order.totalSashes || 0;
        acc.totalGlasses += order.totalGlasses || 0;
        return acc;
      },
      { totalWindows: 0, totalSashes: 0, totalGlasses: 0 }
    );
  }, [filteredOrders]);

  return {
    stats,
    filteredSummary,
  };
}
