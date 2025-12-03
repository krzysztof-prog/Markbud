import { fetchApi } from '@/lib/api-client';
import type {
  RemanentSubmitData,
  RemanentSubmitResponse,
  RemanentHistoryEntry,
  RollbackResponse,
  AverageResponse,
  FinalizeMonthResponse,
} from '@/types/warehouse';

export const remanentApi = {
  /**
   * Wykonaj remanent (monthly-update)
   */
  submit: (data: RemanentSubmitData) =>
    fetchApi<RemanentSubmitResponse>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Pobierz historię remanentów dla koloru
   */
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(
      `/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`
    ),

  /**
   * Pobierz całą historię remanentów (wszystkie kolory)
   */
  getAllHistory: (limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(
      `/api/warehouse/history${limit ? `?limit=${limit}` : ''}`
    ),

  /**
   * Cofnij ostatni remanent
   */
  rollback: (colorId: number) =>
    fetchApi<RollbackResponse>('/api/warehouse/rollback-inventory', {
      method: 'POST',
      body: JSON.stringify({ colorId }),
    }),

  /**
   * Pobierz średnią miesięczną zużycia profili
   */
  getAverage: (colorId: number, months?: number) =>
    fetchApi<AverageResponse>(
      `/api/warehouse/${colorId}/average${months ? `?months=${months}` : ''}`
    ),

  /**
   * Finalizuj remanent miesiąca (preview lub archiwizacja)
   */
  finalizeMonth: (data: { month: string; archive?: boolean }) =>
    fetchApi<FinalizeMonthResponse>('/api/warehouse/finalize-month', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
