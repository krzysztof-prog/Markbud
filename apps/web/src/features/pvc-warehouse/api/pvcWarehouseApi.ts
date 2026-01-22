/**
 * API dla modułu PVC Warehouse
 */

import { fetchApi } from '@/lib/api-client';
import type {
  PvcWarehouseResponse,
  PvcDemandResponse,
  PvcRwResponse,
  PvcSystemsResponse,
  PvcColor,
  PvcOrdersResponse,
} from '../types';

export interface GetStockParams {
  systems?: string[];
  colorId?: number;
  search?: string;
}

export interface GetDemandParams {
  systems?: string[];
  colorId?: number;
}

export interface GetRwParams {
  systems?: string[];
  colorId?: number;
  month?: number;
  year?: number;
}

export interface GetOrdersParams {
  month?: number;
  year?: number;
  search?: string;
}

/**
 * Konwertuje tablicę systemów na string (comma-separated)
 */
function systemsToString(systems?: string[]): string | undefined {
  if (!systems || systems.length === 0) return undefined;
  return systems.join(',');
}

export const pvcWarehouseApi = {
  /**
   * Pobiera stan magazynowy profili
   */
  getStock: async (params?: GetStockParams): Promise<PvcWarehouseResponse> => {
    const query = new URLSearchParams();

    if (params?.systems?.length) {
      query.append('systems', systemsToString(params.systems) ?? '');
    }
    if (params?.colorId) {
      query.append('colorId', params.colorId.toString());
    }
    if (params?.search) {
      query.append('search', params.search);
    }

    const queryString = query.toString();
    return fetchApi<PvcWarehouseResponse>(
      `/api/pvc-warehouse${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Pobiera zapotrzebowanie na profile
   */
  getDemand: async (params?: GetDemandParams): Promise<PvcDemandResponse> => {
    const query = new URLSearchParams();

    if (params?.systems?.length) {
      query.append('systems', systemsToString(params.systems) ?? '');
    }
    if (params?.colorId) {
      query.append('colorId', params.colorId.toString());
    }

    const queryString = query.toString();
    return fetchApi<PvcDemandResponse>(
      `/api/pvc-warehouse/demand${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Pobiera RW (zużycie wewnętrzne) za miesiąc
   */
  getRw: async (params?: GetRwParams): Promise<PvcRwResponse> => {
    const query = new URLSearchParams();

    if (params?.systems?.length) {
      query.append('systems', systemsToString(params.systems) ?? '');
    }
    if (params?.colorId) {
      query.append('colorId', params.colorId.toString());
    }
    if (params?.month) {
      query.append('month', params.month.toString());
    }
    if (params?.year) {
      query.append('year', params.year.toString());
    }

    const queryString = query.toString();
    return fetchApi<PvcRwResponse>(
      `/api/pvc-warehouse/rw${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Pobiera wszystkie kolory (dla sidebara)
   */
  getColors: async (): Promise<{ colors: PvcColor[] }> => {
    return fetchApi<{ colors: PvcColor[] }>('/api/pvc-warehouse/colors');
  },

  /**
   * Pobiera statystyki systemów
   */
  getSystems: async (): Promise<PvcSystemsResponse> => {
    return fetchApi<PvcSystemsResponse>('/api/pvc-warehouse/systems');
  },

  /**
   * Pobiera zamówienia Schuco za miesiąc
   */
  getOrders: async (params?: GetOrdersParams): Promise<PvcOrdersResponse> => {
    const query = new URLSearchParams();

    if (params?.month) {
      query.append('month', params.month.toString());
    }
    if (params?.year) {
      query.append('year', params.year.toString());
    }
    if (params?.search) {
      query.append('search', params.search);
    }

    const queryString = query.toString();
    return fetchApi<PvcOrdersResponse>(
      `/api/pvc-warehouse/orders${queryString ? `?${queryString}` : ''}`
    );
  },
};
