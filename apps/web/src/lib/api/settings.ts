/**
 * Settings API module
 */

import type {
  Color,
  CreateColorData,
  UpdateColorData,
  Profile,
  CreateProfileData,
  UpdateProfileData,
  PalletType,
  CreatePalletTypeData,
  UpdatePalletTypeData,
  Holiday,
  WorkingDay,
  Steel,
  SteelWithStock,
  CreateSteelData,
  UpdateSteelData,
  UpdateSteelStockData,
} from '@/types';
import { fetchApi } from '../api-client';

// Local types for DocumentAuthorMapping (not in shared types)
export interface DocumentAuthorMapping {
  id: number;
  authorName: string;
  userId: number;
  user: {
    id: number;
    email: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDocumentAuthorMappingData {
  authorName: string;
  userId: number;
}

export interface UpdateDocumentAuthorMappingData {
  authorName?: string;
  userId?: number;
}

// Kolory
export const colorsApi = {
  getAll: (params?: { type?: 'typical' | 'atypical'; isAkrobud?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.isAkrobud !== undefined) query.append('isAkrobud', String(params.isAkrobud));
    return fetchApi<Color[]>(`/api/colors${query.toString() ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchApi<Color>(`/api/colors/${id}`),
  create: (data: CreateColorData) =>
    fetchApi<Color>('/api/colors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateColorData) =>
    fetchApi<Color>(`/api/colors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/colors/${id}`, { method: 'DELETE' }),
};

// Profile
export const profilesApi = {
  getAll: () => fetchApi<Profile[]>('/api/profiles'),
  getById: (id: number) => fetchApi<Profile>(`/api/profiles/${id}`),
  create: (data: CreateProfileData) =>
    fetchApi<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateProfileData) =>
    fetchApi<Profile>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  updateOrders: (profileOrders: Array<{ id: number; sortOrder: number }>) =>
    fetchApi<void>('/api/profiles/update-orders', {
      method: 'PATCH',
      body: JSON.stringify({ profileOrders }),
    }),
};

// Dni wolne od pracy
export const workingDaysApi = {
  getAll: (params?: { from?: string; to?: string; month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.month) query.append('month', params.month.toString());
    if (params?.year) query.append('year', params.year.toString());
    return fetchApi<WorkingDay[]>(`/api/working-days${query.toString() ? `?${query}` : ''}`);
  },
  getHolidays: (year: number, country?: 'PL' | 'DE') => {
    const query = new URLSearchParams({ year: year.toString() });
    if (country) query.append('country', country);
    return fetchApi<Holiday[]>(`/api/working-days/holidays?${query}`);
  },
  setWorkingDay: (date: string, isWorking: boolean, description?: string) =>
    fetchApi<WorkingDay>('/api/working-days', {
      method: 'POST',
      body: JSON.stringify({ date, isWorking, description }),
    }),
  delete: (date: string) =>
    fetchApi<void>(`/api/working-days/${date}`, { method: 'DELETE' }),
};

// Ustawienia
export const settingsApi = {
  getAll: () => fetchApi<Record<string, string>>('/api/settings'),
  update: (settings: Record<string, string>) =>
    fetchApi<Record<string, string>>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getPalletTypes: () => fetchApi<PalletType[]>('/api/settings/pallet-types'),
  // File watcher status
  getFileWatcherStatus: () => fetchApi<{ running: boolean; watchers: string[] }>('/api/settings/file-watcher/status'),
  restartFileWatcher: () => fetchApi<{ success: boolean }>('/api/settings/file-watcher/restart', { method: 'POST' }),
  createPalletType: (data: CreatePalletTypeData) =>
    fetchApi<PalletType>('/api/settings/pallet-types', { method: 'POST', body: JSON.stringify(data) }),
  updatePalletType: (id: number, data: UpdatePalletTypeData) =>
    fetchApi<PalletType>(`/api/settings/pallet-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePalletType: (id: number) =>
    fetchApi<void>(`/api/settings/pallet-types/${id}`, { method: 'DELETE' }),
  getUserFolderPath: () => fetchApi<{ path: string }>('/api/settings/user-folder-path'),
  updateUserFolderPath: (path: string) =>
    fetchApi<{ path: string }>('/api/settings/user-folder-path', { method: 'PUT', body: JSON.stringify({ path }) }),
  validateFolder: (path: string) =>
    fetchApi<{ valid: boolean; error?: string }>('/api/settings/validate-folder', { method: 'POST', body: JSON.stringify({ path }) }),
  // Document Author Mappings
  getDocumentAuthorMappings: () => fetchApi<DocumentAuthorMapping[]>('/api/settings/document-author-mappings'),
  createDocumentAuthorMapping: (data: CreateDocumentAuthorMappingData) =>
    fetchApi<DocumentAuthorMapping>('/api/settings/document-author-mappings', { method: 'POST', body: JSON.stringify(data) }),
  updateDocumentAuthorMapping: (id: number, data: UpdateDocumentAuthorMappingData) =>
    fetchApi<DocumentAuthorMapping>(`/api/settings/document-author-mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocumentAuthorMapping: (id: number) =>
    fetchApi<void>(`/api/settings/document-author-mappings/${id}`, { method: 'DELETE' }),
};

// Konfiguracja Walut
export const currencyConfigApi = {
  /**
   * GET /api/currency-config/current
   * Pobierz aktualny kurs
   */
  getCurrent: () =>
    fetchApi<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>('/api/currency-config/current'),

  /**
   * GET /api/currency-config/history
   * Pobierz historię kursów
   */
  getHistory: (limit?: number) =>
    fetchApi<Array<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>>(`/api/currency-config/history${limit ? `?limit=${limit}` : ''}`),

  /**
   * POST /api/currency-config
   * Ustaw kurs
   */
  setRate: (eurToPlnRate: number, effectiveDate?: string) =>
    fetchApi<{
      id: number;
      eurToPlnRate: number;
      effectiveDate: string;
      createdAt: string;
      updatedAt: string;
    }>('/api/currency-config', {
      method: 'POST',
      body: JSON.stringify({ eurToPlnRate, effectiveDate }),
    }),

  /**
   * POST /api/currency-config/convert/eur-to-pln
   * Konwertuj EUR na PLN
   */
  convertEurToPln: (amount: number) =>
    fetchApi<{ eur: number; pln: number; rate: number }>(
      '/api/currency-config/convert/eur-to-pln',
      { method: 'POST', body: JSON.stringify({ amount }) }
    ),

  /**
   * POST /api/currency-config/convert/pln-to-eur
   * Konwertuj PLN na EUR
   */
  convertPlnToEur: (amount: number) =>
    fetchApi<{ pln: number; eur: number; rate: number }>(
      '/api/currency-config/convert/pln-to-eur',
      { method: 'POST', body: JSON.stringify({ amount }) }
    ),
};

// Głębokości profili
export interface ProfileDepth {
  id: number;
  profileType: string;
  depthMm: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const profileDepthsApi = {
  /**
   * GET /api/profile-depths
   * Pobierz wszystkie głębokości profili
   */
  getAll: () => fetchApi<ProfileDepth[]>('/api/profile-depths'),

  /**
   * GET /api/profile-depths/:id
   * Pobierz głębokość profilu po ID
   */
  getById: (id: number) => fetchApi<ProfileDepth>(`/api/profile-depths/${id}`),

  /**
   * POST /api/profile-depths
   * Utwórz nową głębokość profilu
   */
  create: (data: { profileType: string; depthMm: number; description?: string }) =>
    fetchApi<ProfileDepth>('/api/profile-depths', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PATCH /api/profile-depths/:id
   * Zaktualizuj głębokość profilu
   */
  update: (id: number, data: Partial<{ profileType: string; depthMm: number; description?: string }>) =>
    fetchApi<ProfileDepth>(`/api/profile-depths/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/profile-depths/:id
   * Usuń głębokość profilu
   */
  delete: (id: number) =>
    fetchApi(`/api/profile-depths/${id}`, {
      method: 'DELETE',
    }),
};

// Przeliczniki palet na bele
export interface ProfilePalletConfig {
  id: number;
  profileId: number;
  beamsPerPallet: number;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: number;
    number: string;
    name: string;
  };
}

export const profilePalletConfigApi = {
  getAll: () => fetchApi<ProfilePalletConfig[]>('/api/profile-pallet-configs'),

  create: (data: { profileId: number; beamsPerPallet: number }) =>
    fetchApi<ProfilePalletConfig>('/api/profile-pallet-configs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { beamsPerPallet: number }) =>
    fetchApi<ProfilePalletConfig>(`/api/profile-pallet-configs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi(`/api/profile-pallet-configs/${id}`, {
      method: 'DELETE',
    }),
};

// Stal (wzmocnienia stalowe)
export const steelApi = {
  /**
   * GET /api/steel
   * Pobierz wszystkie stale
   */
  getAll: () => fetchApi<Steel[]>('/api/steel'),

  /**
   * GET /api/steel/with-stock
   * Pobierz wszystkie stale ze stanem magazynowym
   */
  getAllWithStock: () => fetchApi<SteelWithStock[]>('/api/steel/with-stock'),

  /**
   * GET /api/steel/:id
   * Pobierz stal po ID
   */
  getById: (id: number) => fetchApi<Steel>(`/api/steel/${id}`),

  /**
   * POST /api/steel
   * Utwórz nową stal
   */
  create: (data: CreateSteelData) =>
    fetchApi<Steel>('/api/steel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/steel/:id
   * Zaktualizuj stal
   */
  update: (id: number, data: UpdateSteelData) =>
    fetchApi<Steel>(`/api/steel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * DELETE /api/steel/:id
   * Usuń stal
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/steel/${id}`, {
      method: 'DELETE',
    }),

  /**
   * PATCH /api/steel/update-orders
   * Zmień kolejność stali
   */
  updateOrders: (orders: Array<{ id: number; sortOrder: number }>) =>
    fetchApi<{ success: boolean }>('/api/steel/update-orders', {
      method: 'PATCH',
      body: JSON.stringify({ orders }),
    }),

  /**
   * GET /api/steel/:id/stock
   * Pobierz stan magazynowy stali
   */
  getStock: (id: number) =>
    fetchApi<{ steelId: number; currentStockBeams: number; initialStockBeams: number }>(`/api/steel/${id}/stock`),

  /**
   * PATCH /api/steel/:id/stock
   * Zaktualizuj stan magazynowy stali
   */
  updateStock: (id: number, data: UpdateSteelStockData) =>
    fetchApi<{ steelId: number; currentStockBeams: number }>(`/api/steel/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
