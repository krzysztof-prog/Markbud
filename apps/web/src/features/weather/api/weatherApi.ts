/**
 * API Service dla Open-Meteo
 * Pobiera prognozę pogody dla Łomianek k/Warszawy
 */

import type { OpenMeteoResponse, DayForecast, WeatherAlert } from '../types';
import { LOMIANKI_COORDS, ALERT_THRESHOLDS, WEATHER_CODES } from '../types';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Pobiera prognozę pogody na 5 dni z Open-Meteo API
 */
export async function fetchWeatherForecast(): Promise<DayForecast[]> {
  const params = new URLSearchParams({
    latitude: LOMIANKI_COORDS.latitude.toString(),
    longitude: LOMIANKI_COORDS.longitude.toString(),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'snowfall_sum',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'Europe/Warsaw',
    forecast_days: '5',
  });

  const response = await fetch(`${OPEN_METEO_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Błąd pobierania pogody: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return parseWeatherData(data);
}

/**
 * Parsuje odpowiedź z API na format DayForecast[]
 */
function parseWeatherData(data: OpenMeteoResponse): DayForecast[] {
  const { daily } = data;
  const forecasts: DayForecast[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const tempMin = daily.temperature_2m_min[i];
    const tempMax = daily.temperature_2m_max[i];
    const precipitation = daily.precipitation_sum[i];
    const snowfall = daily.snowfall_sum[i];
    const windSpeed = daily.wind_speed_10m_max[i];
    const weatherCode = daily.weather_code[i];

    // Generuj ostrzeżenia
    const alerts = generateAlerts({
      tempMin,
      precipitation,
      snowfall,
      windSpeed,
    });

    forecasts.push({
      date,
      dayName: getDayName(date, i),
      weatherCode,
      tempMax: Math.round(tempMax),
      tempMin: Math.round(tempMin),
      precipitation,
      snowfall,
      windSpeed: Math.round(windSpeed),
      alerts,
    });
  }

  return forecasts;
}

/**
 * Generuje ostrzeżenia na podstawie danych pogodowych
 */
function generateAlerts(params: {
  tempMin: number;
  precipitation: number;
  snowfall: number;
  windSpeed: number;
}): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Deszcz
  if (params.precipitation >= ALERT_THRESHOLDS.rain) {
    alerts.push({
      type: 'rain',
      severity: params.precipitation >= 10 ? 'danger' : 'warning',
      message: `Opady deszczu: ${params.precipitation.toFixed(1)} mm`,
    });
  }

  // Śnieg
  if (params.snowfall >= ALERT_THRESHOLDS.snow) {
    alerts.push({
      type: 'snow',
      severity: params.snowfall >= 5 ? 'danger' : 'warning',
      message: `Opady śniegu: ${params.snowfall.toFixed(1)} cm`,
    });
  }

  // Mróz
  if (params.tempMin <= ALERT_THRESHOLDS.frost) {
    alerts.push({
      type: 'frost',
      severity: params.tempMin <= -15 ? 'danger' : 'warning',
      message: `Silny mróz: ${Math.round(params.tempMin)}°C`,
    });
  }

  // Wiatr
  if (params.windSpeed >= ALERT_THRESHOLDS.wind) {
    alerts.push({
      type: 'wind',
      severity: params.windSpeed >= 70 ? 'danger' : 'warning',
      message: `Silny wiatr: ${Math.round(params.windSpeed)} km/h`,
    });
  }

  return alerts;
}

/**
 * Zwraca nazwę dnia tygodnia
 */
function getDayName(date: Date, index: number): string {
  if (index === 0) return 'Dziś';
  if (index === 1) return 'Jutro';

  const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  return days[date.getDay()];
}

/**
 * Zwraca ikonę i opis dla kodu pogody
 */
export function getWeatherInfo(code: number): { icon: string; description: string } {
  return WEATHER_CODES[code] ?? { icon: '❓', description: 'Nieznany' };
}
