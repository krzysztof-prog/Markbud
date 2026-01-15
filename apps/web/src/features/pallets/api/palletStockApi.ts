/**
 * API dla modułu paletówek produkcyjnych
 */

import { fetchApi } from '@/lib/api-client';
import type {
  PalletStockDay,
  PalletMonthSummary,
  PalletAlertConfig,
  UpdatePalletDayEntry,
  CorrectMorningStockInput,
  ProductionPalletType,
} from '../types/index';

const BASE_URL = '/api/pallet-stock';

// ============================================
// DAY OPERATIONS API
// ============================================

export const palletDayApi = {
  /**
   * Pobierz dane dnia paletowego
   */
  getDay: (date: string) =>
    fetchApi<PalletStockDay>(`${BASE_URL}/day/${date}`),

  /**
   * Aktualizuj wpisy dnia paletowego (używa PUT)
   * Wysyła: type, used
   * Backend wylicza: produced = morningStock (dziś) - morningStock (poprzedni dzień) + used
   */
  updateDay: (date: string, entries: UpdatePalletDayEntry[]) =>
    fetchApi<PalletStockDay>(`${BASE_URL}/day/${date}`, {
      method: 'PUT',
      body: JSON.stringify(entries),
    }),

  /**
   * Zamknij dzień paletowy
   */
  closeDay: (date: string) =>
    fetchApi<PalletStockDay>(`${BASE_URL}/day/${date}/close`, {
      method: 'POST',
    }),

  /**
   * Korekta stanu porannego dla danego typu palety
   */
  correctMorningStock: (
    date: string,
    type: ProductionPalletType,
    input: CorrectMorningStockInput
  ) =>
    fetchApi<PalletStockDay>(`${BASE_URL}/day/${date}/entries/${type}/correct`, {
      method: 'POST',
      body: JSON.stringify({ ...input, type }), // Dodaj type do body
    }),
};

// ============================================
// MONTH SUMMARY API
// ============================================

export const palletMonthApi = {
  /**
   * Pobierz podsumowanie miesiąca
   */
  getMonthSummary: (year: number, month: number) =>
    fetchApi<PalletMonthSummary>(`${BASE_URL}/month/${year}/${month}`),
};

// ============================================
// ALERT CONFIG API
// ============================================

export const palletAlertConfigApi = {
  /**
   * Pobierz konfigurację alertów
   */
  getConfig: () =>
    fetchApi<PalletAlertConfig[]>(`${BASE_URL}/alerts/config`),

  /**
   * Aktualizuj konfigurację alertów
   */
  updateConfig: (configs: PalletAlertConfig[]) =>
    fetchApi<PalletAlertConfig[]>(`${BASE_URL}/alerts/config`, {
      method: 'PUT',
      body: JSON.stringify({ configs }),
    }),
};

// ============================================
// UNIFIED EXPORT
// ============================================

export const palletStockApi = {
  day: palletDayApi,
  month: palletMonthApi,
  alertConfig: palletAlertConfigApi,
};
