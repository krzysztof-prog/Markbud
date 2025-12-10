import { fetchApi, uploadFile } from '@/lib/api-client';
import type { GlassDelivery, GlassDeliveryFilters, ValidationDashboard, GlassOrderValidation } from '../types';

export const glassDeliveriesApi = {
  getAll: (filters?: GlassDeliveryFilters): Promise<GlassDelivery[]> => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const query = params.toString();
    return fetchApi(`/api/glass-deliveries${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<GlassDelivery> => {
    return fetchApi(`/api/glass-deliveries/${id}`);
  },

  importFromCsv: (file: File): Promise<GlassDelivery> => {
    return uploadFile('/api/glass-deliveries/import', file);
  },

  delete: (id: number): Promise<void> => {
    return fetchApi(`/api/glass-deliveries/${id}`, { method: 'DELETE' });
  },
};

export const glassValidationsApi = {
  getDashboard: (): Promise<ValidationDashboard> => {
    return fetchApi('/api/glass-validations/dashboard');
  },

  getByOrderNumber: (orderNumber: string): Promise<GlassOrderValidation[]> => {
    return fetchApi(`/api/glass-validations/order/${orderNumber}`);
  },

  resolve: (id: number, resolvedBy: string, notes?: string): Promise<GlassOrderValidation> => {
    return fetchApi(`/api/glass-validations/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolvedBy, notes }),
    });
  },
};
