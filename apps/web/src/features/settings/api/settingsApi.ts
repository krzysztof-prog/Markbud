/**
 * Settings API Service
 */

import { fetchApi } from '@/lib/api-client';
import type {
  Settings,
  PalletType,
  CreatePalletTypeData,
  UpdatePalletTypeData,
  WorkingDay,
  Holiday,
  SetWorkingDayData,
} from '@/types';

export const settingsApi = {
  /**
   * Pobierz wszystkie ustawienia
   */
  getAll: () =>
    fetchApi<Settings>('/api/settings'),

  /**
   * Zaktualizuj ustawienia
   */
  update: (settings: Settings) =>
    fetchApi<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  /**
   * Pobierz typy palet
   */
  getPalletTypes: () =>
    fetchApi<PalletType[]>('/api/settings/pallet-types'),

  /**
   * Utwórz typ palety
   */
  createPalletType: (data: CreatePalletTypeData) =>
    fetchApi<PalletType>('/api/settings/pallet-types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj typ palety
   */
  updatePalletType: (id: number, data: UpdatePalletTypeData) =>
    fetchApi<PalletType>(`/api/settings/pallet-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń typ palety
   */
  deletePalletType: (id: number) =>
    fetchApi<void>(`/api/settings/pallet-types/${id}`, { method: 'DELETE' }),
};

export const workingDaysApi = {
  /**
   * Pobierz dni robocze
   */
  getAll: (params?: { from?: string; to?: string; month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.month) query.append('month', params.month.toString());
    if (params?.year) query.append('year', params.year.toString());
    return fetchApi<WorkingDay[]>(
      `/api/working-days${query.toString() ? `?${query}` : ''}`
    );
  },

  /**
   * Pobierz święta dla roku i kraju
   */
  getHolidays: (year: number, country?: 'PL' | 'DE') => {
    const query = new URLSearchParams({ year: year.toString() });
    if (country) query.append('country', country);
    return fetchApi<Holiday[]>(`/api/working-days/holidays?${query}`);
  },

  /**
   * Ustaw dzień jako roboczy/wolny
   */
  setWorkingDay: (data: SetWorkingDayData) =>
    fetchApi<WorkingDay>('/api/working-days', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń ustawienie dnia roboczego
   */
  delete: (date: string) =>
    fetchApi<void>(`/api/working-days/${date}`, { method: 'DELETE' }),
};
