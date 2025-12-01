/**
 * Warehouse API Service
 */

import { fetchApi } from '@/lib/api-client';
import type {
  WarehouseStock,
  WarehouseStockWithCalculations,
  UpdateStockData,
  Shortage,
  WarehouseHistory,
  WarehouseOrder,
  CreateWarehouseOrderData,
  UpdateWarehouseOrderData,
  MonthlyStockUpdate,
} from '@/types';

export const warehouseApi = {
  /**
   * Pobierz stan magazynu dla koloru
   */
  getByColor: (colorId: number) =>
    fetchApi<WarehouseStockWithCalculations[]>(`/api/warehouse/${colorId}`),

  /**
   * Zaktualizuj stan magazynu
   */
  updateStock: (colorId: number, profileId: number, data: UpdateStockData) =>
    fetchApi<WarehouseStock>(`/api/warehouse/${colorId}/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Miesięczna aktualizacja magazynu
   */
  monthlyUpdate: (data: MonthlyStockUpdate) =>
    fetchApi<WarehouseStock[]>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Pobierz niedobory w magazynie
   */
  getShortages: () =>
    fetchApi<Shortage[]>('/api/warehouse/shortages'),

  /**
   * Pobierz historię zmian w magazynie
   */
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<WarehouseHistory[]>(
      `/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`
    ),
};

export const warehouseOrdersApi = {
  /**
   * Pobierz zamówienia magazynowe
   */
  getAll: (params?: { colorId?: number; profileId?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.colorId) query.append('colorId', params.colorId.toString());
    if (params?.profileId) query.append('profileId', params.profileId.toString());
    if (params?.status) query.append('status', params.status);
    return fetchApi<WarehouseOrder[]>(
      `/api/warehouse-orders${query.toString() ? `?${query}` : ''}`
    );
  },

  /**
   * Pobierz zamówienie po ID
   */
  getById: (id: number) =>
    fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`),

  /**
   * Utwórz zamówienie magazynowe
   */
  create: (data: CreateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>('/api/warehouse-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj zamówienie magazynowe
   */
  update: (id: number, data: UpdateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń zamówienie magazynowe
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/warehouse-orders/${id}`, { method: 'DELETE' }),
};
