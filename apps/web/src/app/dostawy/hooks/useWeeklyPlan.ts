'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';

/**
 * Oblicza poniedziałek bieżącego tygodnia
 */
function getCurrentMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Oblicza offset tygodnia (ile tygodni od bieżącego) na podstawie daty poniedziałku
 */
function calcWeekOffset(targetMondayStr: string): number {
  const currentMonday = getCurrentMonday();
  const targetMonday = new Date(targetMondayStr + 'T00:00:00');
  const diffMs = targetMonday.getTime() - currentMonday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Hook do zarządzania widokiem tygodniowego planu szkleń (Tygodniówka).
 * Domyślnie pokazuje tydzień z pierwszą dostawą in_progress.
 */
export function useWeeklyPlan() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [initialOffsetApplied, setInitialOffsetApplied] = useState(false);

  // Pobierz tydzień z pierwszą dostawą in_progress (jednorazowo)
  const { data: initialWeek } = useQuery({
    queryKey: ['first-in-progress-week'],
    queryFn: () => deliveriesApi.getFirstInProgressWeek(),
    staleTime: Infinity,
  });

  // Ustaw domyślny offset gdy dane przyjdą
  useEffect(() => {
    if (initialWeek && !initialOffsetApplied) {
      const offset = calcWeekOffset(initialWeek.weekStart);
      setWeekOffset(offset);
      setInitialOffsetApplied(true);
    }
  }, [initialWeek, initialOffsetApplied]);

  // Oblicz poniedziałek bieżącego tygodnia + offset
  const weekStart = useMemo(() => {
    const monday = getCurrentMonday();
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  // Format YYYY-MM-DD
  const weekStartStr = useMemo(() => {
    const y = weekStart.getFullYear();
    const m = String(weekStart.getMonth() + 1).padStart(2, '0');
    const d = String(weekStart.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [weekStart]);

  // Piątek tego tygodnia
  const weekEnd = useMemo(() => {
    const friday = new Date(weekStart);
    friday.setDate(weekStart.getDate() + 4);
    return friday;
  }, [weekStart]);

  // Pobierz dane tygodnia
  const { data, isLoading, error } = useQuery({
    queryKey: ['weekly-plan', weekStartStr],
    queryFn: () => deliveriesApi.getWeeklyPlan(weekStartStr),
  });

  const goToPrevious = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const goToNext = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const goToThisWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  return {
    weekOffset,
    weekStart,
    weekEnd,
    weekStartStr,
    data,
    isLoading,
    error,
    goToPrevious,
    goToNext,
    goToThisWeek,
  };
}
