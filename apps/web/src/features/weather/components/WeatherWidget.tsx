'use client';

import React from 'react';
import { Cloud, Droplets, Snowflake, Thermometer, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeather } from '../hooks/useWeather';
import { getWeatherInfo } from '../api/weatherApi';
import type { DayForecast, WeatherAlert, WeatherAlertType } from '../types';

interface WeatherWidgetProps {
  collapsed?: boolean;
}

/**
 * Kompaktowy widget pogodowy dla sidebara
 * Pokazuje prognozę na 5 dni z ostrzeżeniami
 */
export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ collapsed = false }) => {
  const { data: forecast, isLoading, error } = useWeather();

  // Zbierz wszystkie unikalne ostrzeżenia z najbliższych 3 dni
  const upcomingAlerts = React.useMemo(() => {
    if (!forecast) return [];

    const alertsMap = new Map<string, WeatherAlert>();

    // Sprawdź tylko najbliższe 3 dni
    forecast.slice(0, 3).forEach((day) => {
      day.alerts.forEach((alert) => {
        // Klucz unikalny na podstawie typu
        const key = alert.type;
        const existing = alertsMap.get(key);

        // Zachowaj najpoważniejsze ostrzeżenie
        if (!existing || (alert.severity === 'danger' && existing.severity === 'warning')) {
          alertsMap.set(key, alert);
        }
      });
    });

    return Array.from(alertsMap.values());
  }, [forecast]);

  // Gdy sidebar zwinięty - pokaż tylko ikonę z badge
  if (collapsed) {
    const hasAlerts = upcomingAlerts.length > 0;
    const hasDanger = upcomingAlerts.some((a) => a.severity === 'danger');

    return (
      <div className="relative flex items-center justify-center py-2">
        <Cloud className="h-5 w-5 text-slate-400" />
        {hasAlerts && (
          <span
            className={cn(
              'absolute -top-1 -right-1 w-2 h-2 rounded-full',
              hasDanger ? 'bg-red-500' : 'bg-yellow-500'
            )}
          />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-20 bg-slate-700 rounded" />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-10 bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-slate-500">Brak danych pogodowych</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Nagłówek */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Cloud className="h-3.5 w-3.5" />
        <span>Łomianki</span>
      </div>

      {/* Ostrzeżenia */}
      {upcomingAlerts.length > 0 && (
        <div className="space-y-1">
          {upcomingAlerts.map((alert, idx) => (
            <AlertBadge key={idx} alert={alert} />
          ))}
        </div>
      )}

      {/* Prognoza 5 dni */}
      <div className="flex justify-between gap-0.5">
        {forecast.map((day, idx) => (
          <DayCard key={idx} day={day} isToday={idx === 0} />
        ))}
      </div>
    </div>
  );
};

/**
 * Karta pojedynczego dnia
 */
const DayCard: React.FC<{ day: DayForecast; isToday: boolean }> = ({ day, isToday }) => {
  const weatherInfo = getWeatherInfo(day.weatherCode);
  const hasAlert = day.alerts.length > 0;
  const hasDanger = day.alerts.some((a) => a.severity === 'danger');

  return (
    <div
      className={cn(
        'flex flex-col items-center px-1.5 py-1 rounded text-center min-w-[36px]',
        isToday ? 'bg-slate-800' : 'bg-transparent',
        hasAlert && hasDanger && 'ring-1 ring-red-500/50',
        hasAlert && !hasDanger && 'ring-1 ring-yellow-500/50'
      )}
      title={`${weatherInfo.description}\n${day.alerts.map((a) => a.message).join('\n')}`}
    >
      {/* Dzień tygodnia */}
      <span className={cn('text-[10px]', isToday ? 'text-white font-medium' : 'text-slate-400')}>
        {day.dayName}
      </span>

      {/* Ikona pogody */}
      <span className="text-base leading-none my-0.5">{weatherInfo.icon}</span>

      {/* Temperatury */}
      <div className="flex flex-col text-[10px] leading-tight">
        <span className="text-slate-200 font-medium">{day.tempMax}°</span>
        <span className="text-slate-500">{day.tempMin}°</span>
      </div>
    </div>
  );
};

/**
 * Badge ostrzeżenia
 */
const AlertBadge: React.FC<{ alert: WeatherAlert }> = ({ alert }) => {
  const iconMap: Record<WeatherAlertType, React.ReactNode> = {
    rain: <Droplets className="h-3 w-3" />,
    snow: <Snowflake className="h-3 w-3" />,
    frost: <Thermometer className="h-3 w-3" />,
    wind: <Wind className="h-3 w-3" />,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
        alert.severity === 'danger'
          ? 'bg-red-500/20 text-red-400'
          : 'bg-yellow-500/20 text-yellow-400'
      )}
      title={alert.message}
    >
      {iconMap[alert.type]}
      <span className="truncate">{alert.message}</span>
    </div>
  );
};

export default WeatherWidget;
