/**
 * Warehouse API module
 */

import type {
  WarehouseStock,
  UpdateStockData,
  WarehouseOrder,
  CreateWarehouseOrderData,
  UpdateWarehouseOrderData,
  MonthlyStockUpdate,
  RemanentHistoryEntry,
  WarehouseDataResponse,
  Shortage,
} from '@/types';
import { fetchApi } from '../api-client';

// Magazyn
export const warehouseApi = {
  getByColor: (colorId: number) => fetchApi<WarehouseDataResponse>(`/api/warehouse/${colorId}`),
  updateStock: (colorId: number, profileId: number, data: UpdateStockData) =>
    fetchApi<WarehouseStock>(`/api/warehouse/${colorId}/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  monthlyUpdate: (data: MonthlyStockUpdate) =>
    fetchApi<void>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getShortages: () => fetchApi<Shortage[]>('/api/warehouse/shortages'),
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(`/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`),
};

// Zamówienia magazynowe
export const warehouseOrdersApi = {
  getAll: (params?: { colorId?: number; profileId?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.colorId) query.append('colorId', params.colorId.toString());
    if (params?.profileId) query.append('profileId', params.profileId.toString());
    if (params?.status) query.append('status', params.status);
    return fetchApi<WarehouseOrder[]>(`/api/warehouse-orders${query.toString() ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`),
  create: (data: CreateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>('/api/warehouse-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateWarehouseOrderData) =>
    fetchApi<WarehouseOrder>(`/api/warehouse-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi<void>(`/api/warehouse-orders/${id}`, { method: 'DELETE' }),
};

// Remanent magazynu
export { remanentApi } from '@/features/warehouse/remanent/api/remanentApi';

// OKUC (DualStock) - Moduł zarządzania magazynem okuć PVC i ALU
export {
  okucArticlesApi,
  okucStockApi,
  okucDemandApi,
  okucOrdersApi,
  okucProportionsApi,
} from '@/features/okuc/api';
