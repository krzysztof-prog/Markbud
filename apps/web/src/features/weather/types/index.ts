/**
 * Typy dla widgetu pogodowego
 * Dane z Open-Meteo API dla Łomianek k/Warszawy
 */

// Odpowiedź z Open-Meteo API
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    precipitation_sum: string;
    snowfall_sum: string;
    wind_speed_10m_max: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    wind_speed_10m_max: number[];
  };
}

// Prognoza na jeden dzień
export interface DayForecast {
  date: Date;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitation: number; // mm
  snowfall: number; // cm
  windSpeed: number; // km/h
  alerts: WeatherAlert[];
}

// Typy ostrzeżeń
export type WeatherAlertType = 'rain' | 'snow' | 'frost' | 'wind';

export interface WeatherAlert {
  type: WeatherAlertType;
  severity: 'warning' | 'danger';
  message: string;
}

// Progi ostrzeżeń
export const ALERT_THRESHOLDS = {
  rain: 5, // mm - opady deszczu
  snow: 2, // cm - opady śniegu
  frost: -10, // °C - silny mróz
  wind: 50, // km/h - silny wiatr
} as const;

// Mapowanie kodów pogody WMO na ikony
export const WEATHER_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: '☀️', description: 'Bezchmurnie' },
  1: { icon: '🌤️', description: 'Głównie słonecznie' },
  2: { icon: '⛅', description: 'Częściowe zachmurzenie' },
  3: { icon: '☁️', description: 'Pochmurno' },
  45: { icon: '🌫️', description: 'Mgła' },
  48: { icon: '🌫️', description: 'Szadź' },
  51: { icon: '🌧️', description: 'Lekka mżawka' },
  53: { icon: '🌧️', description: 'Mżawka' },
  55: { icon: '🌧️', description: 'Gęsta mżawka' },
  56: { icon: '🌧️', description: 'Marznąca mżawka' },
  57: { icon: '🌧️', description: 'Gęsta marznąca mżawka' },
  61: { icon: '🌧️', description: 'Lekki deszcz' },
  63: { icon: '🌧️', description: 'Deszcz' },
  65: { icon: '🌧️', description: 'Silny deszcz' },
  66: { icon: '🌧️', description: 'Marznący deszcz' },
  67: { icon: '🌧️', description: 'Silny marznący deszcz' },
  71: { icon: '🌨️', description: 'Lekki śnieg' },
  73: { icon: '🌨️', description: 'Śnieg' },
  75: { icon: '🌨️', description: 'Intensywny śnieg' },
  77: { icon: '🌨️', description: 'Ziarna śniegu' },
  80: { icon: '🌧️', description: 'Przelotny deszcz' },
  81: { icon: '🌧️', description: 'Umiarkowane przelotne opady' },
  82: { icon: '🌧️', description: 'Intensywne przelotne opady' },
  85: { icon: '🌨️', description: 'Przelotny śnieg' },
  86: { icon: '🌨️', description: 'Intensywny przelotny śnieg' },
  95: { icon: '⛈️', description: 'Burza' },
  96: { icon: '⛈️', description: 'Burza z gradem' },
  99: { icon: '⛈️', description: 'Silna burza z gradem' },
};

// Współrzędne Łomianek k/Warszawy
export const LOMIANKI_COORDS = {
  latitude: 52.3347,
  longitude: 20.885,
} as const;
