import { fetchApi, uploadFile } from '@/lib/api-client';
import type {
  GlassDelivery,
  GlassDeliveryFilters,
  GroupedGlassDelivery,
  ValidationDashboard,
  GlassOrderValidation,
  LatestImportSummary,
  LooseGlass,
  AluminumGlass,
  ReclamationGlass,
  AluminumGlassSummary
} from '../types';

export const glassDeliveriesApi = {
  /**
   * Pobierz wszystkie dostawy pogrupowane po customerOrderNumber + rackNumber
   * Każda unikalna kombinacja pokazuje się jako osobny wiersz w tabeli
   */
  getAll: (filters?: GlassDeliveryFilters): Promise<GroupedGlassDelivery[]> => {
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

  // Kategoryzowane szyby
  getLooseGlasses: (): Promise<LooseGlass[]> => {
    return fetchApi('/api/glass-deliveries/categorized/loose');
  },

  getAluminumGlasses: (): Promise<AluminumGlass[]> => {
    return fetchApi('/api/glass-deliveries/categorized/aluminum');
  },

  getAluminumGlassesSummary: (): Promise<AluminumGlassSummary[]> => {
    return fetchApi('/api/glass-deliveries/categorized/aluminum/summary');
  },

  getReclamationGlasses: (): Promise<ReclamationGlass[]> => {
    return fetchApi('/api/glass-deliveries/categorized/reclamation');
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

export const glassDeliveriesApi_extended = {
  getLatestImportSummary: (): Promise<LatestImportSummary> => {
    return fetchApi('/api/glass-deliveries/latest-import/summary');
  },
};
