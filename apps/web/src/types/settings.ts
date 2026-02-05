import type { ID, Timestamp } from './common';

/**
 * Ustawienia aplikacji
 */
export type Settings = Record<string, string>;

/**
 * Typ palety
 */
export interface PalletType {
  id: ID;
  name: string;
  lengthMm: number;
  widthMm: number;       // Szerokość palety (np. 4000, 3500, 3000)
  heightMm: number;
  loadWidthMm: number;   // Szerokość załadunku
  loadDepthMm: number;   // Głębokość załadunku
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePalletTypeData {
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
}

export interface UpdatePalletTypeData {
  name?: string;
  widthMm?: number;
  loadWidthMm?: number;
}

/**
 * Dzień roboczy / wolny
 */
export interface WorkingDay {
  date: string; // YYYY-MM-DD
  isWorking: boolean;
  description?: string;
  country?: 'PL' | 'DE';
}

export interface Holiday {
  date: string;
  name: string;
  country: 'PL' | 'DE';
  isWorking: boolean;
}

export interface SetWorkingDayData {
  date: string;
  isWorking: boolean;
  description?: string;
}
