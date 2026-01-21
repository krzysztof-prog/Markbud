/**
 * Hook do pobierania prognozy pogody
 * Cache na 1 godzinę (staleTime)
 */

import { useQuery } from '@tanstack/react-query';
import { fetchWeatherForecast } from '../api/weatherApi';
import type { DayForecast } from '../types';

const WEATHER_QUERY_KEY = ['weather', 'forecast'] as const;

// Cache na 1 godzinę - pogoda nie zmienia się często
const STALE_TIME = 60 * 60 * 1000; // 1h
const GC_TIME = 2 * 60 * 60 * 1000; // 2h

export function useWeather() {
  return useQuery<DayForecast[], Error>({
    queryKey: WEATHER_QUERY_KEY,
    queryFn: fetchWeatherForecast,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    refetchOnWindowFocus: false, // Nie odświeżaj przy focus
    refetchInterval: STALE_TIME, // Odświeżaj co godzinę
  });
}
