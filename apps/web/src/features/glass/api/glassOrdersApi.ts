import { fetchApi, uploadFile } from '@/lib/api-client';
import type {
  GlassOrder,
  GlassOrderFilters,
  GlassOrderSummary,
  GlassOrderValidation,
} from '../types';

export const glassOrdersApi = {
  getAll: (filters?: GlassOrderFilters): Promise<GlassOrder[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.orderNumber) params.append('orderNumber', filters.orderNumber);

    const query = params.toString();
    return fetchApi(`/api/glass-orders${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<GlassOrder> => {
    return fetchApi(`/api/glass-orders/${id}`);
  },

  importFromTxt: (file: File): Promise<GlassOrder> => {
    return uploadFile('/api/glass-orders/import', file);
  },

  delete: (id: number): Promise<void> => {
    return fetchApi(`/api/glass-orders/${id}`, { method: 'DELETE' });
  },

  getSummary: (id: number): Promise<GlassOrderSummary> => {
    return fetchApi(`/api/glass-orders/${id}/summary`);
  },

  getValidations: (id: number): Promise<GlassOrderValidation[]> => {
    return fetchApi(`/api/glass-orders/${id}/validations`);
  },

  updateStatus: (id: number, status: string): Promise<GlassOrder> => {
    return fetchApi(`/api/glass-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
