const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError extends Error {
  status?: number;
  data?: any;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
      const error: ApiError = new Error(data.error || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź internetu.');
      networkError.status = 0;
      throw networkError;
    }
    throw error;
  }
}

// Dashboard
export const dashboardApi = {
  getDashboard: () => fetchApi<any>('/api/dashboard'),
  getAlerts: () => fetchApi<any[]>('/api/dashboard/alerts'),
};

// Kolory
export const colorsApi = {
  getAll: (type?: 'typical' | 'atypical') =>
    fetchApi<any[]>(`/api/colors${type ? `?type=${type}` : ''}`),
  getById: (id: number) => fetchApi<any>(`/api/colors/${id}`),
  create: (data: any) =>
    fetchApi<any>('/api/colors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/api/colors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/colors/${id}`, { method: 'DELETE' }),
};

// Profile
export const profilesApi = {
  getAll: () => fetchApi<any[]>('/api/profiles'),
  getById: (id: number) => fetchApi<any>(`/api/profiles/${id}`),
  create: (data: any) =>
    fetchApi<any>('/api/profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
};

// Zlecenia
export const ordersApi = {
  getAll: (params?: { status?: string; archived?: string; colorId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<any[]>(`/api/orders${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchApi<any>(`/api/orders/${id}`),
  getTable: (colorId: number) => fetchApi<any>(`/api/orders/table/${colorId}`),
  getRequirementsTotals: () => fetchApi<any[]>('/api/orders/requirements/totals'),
  getPdf: async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${id}/pdf`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  },
  create: (data: any) =>
    fetchApi<any>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archive: (id: number) =>
    fetchApi<any>(`/api/orders/${id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
  unarchive: (id: number) =>
    fetchApi<any>(`/api/orders/${id}/unarchive`, { method: 'POST', body: JSON.stringify({}) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/orders/${id}`, { method: 'DELETE' }),
};

// Magazyn
export const warehouseApi = {
  getByColor: (colorId: number) => fetchApi<any[]>(`/api/warehouse/${colorId}`),
  updateStock: (colorId: number, profileId: number, data: any) =>
    fetchApi<any>(`/api/warehouse/${colorId}/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  monthlyUpdate: (data: { colorId: number; updates: any[] }) =>
    fetchApi<any>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getShortages: () => fetchApi<any[]>('/api/warehouse/shortages'),
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<any[]>(`/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`),
};

// Zamówienia magazynowe
export const warehouseOrdersApi = {
  getAll: (params?: { colorId?: number; profileId?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.colorId) query.append('colorId', params.colorId.toString());
    if (params?.profileId) query.append('profileId', params.profileId.toString());
    if (params?.status) query.append('status', params.status);
    return fetchApi<any[]>(`/api/warehouse-orders${query.toString() ? `?${query}` : ''}`);
  },
  getById: (id: number) => fetchApi<any>(`/api/warehouse-orders/${id}`),
  create: (data: {
    profileId: number;
    colorId: number;
    orderedBeams: number;
    expectedDeliveryDate: string;
    notes?: string;
  }) =>
    fetchApi<any>('/api/warehouse-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: number,
    data: {
      orderedBeams?: number;
      expectedDeliveryDate?: string;
      status?: 'pending' | 'received' | 'cancelled';
      notes?: string;
    }
  ) =>
    fetchApi<any>(`/api/warehouse-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi<void>(`/api/warehouse-orders/${id}`, { method: 'DELETE' }),
};

// Dostawy
export const deliveriesApi = {
  getAll: (params?: { from?: string; to?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<any[]>(`/api/deliveries${query ? `?${query}` : ''}`);
  },
  getCalendar: (month: number, year: number) =>
    fetchApi<any>(`/api/deliveries/calendar?month=${month}&year=${year}`),
  getById: (id: number) => fetchApi<any>(`/api/deliveries/${id}`),
  create: (data: { deliveryDate: string; deliveryNumber?: string; notes?: string }) =>
    fetchApi<any>('/api/deliveries', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchApi<any>(`/api/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/deliveries/${id}`, { method: 'DELETE' }),
  addOrder: (deliveryId: number, orderId: number) =>
    fetchApi<any>(`/api/deliveries/${deliveryId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  removeOrder: (deliveryId: number, orderId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/orders/${orderId}`, { method: 'DELETE' }),
  moveOrder: (deliveryId: number, orderId: number, targetDeliveryId: number) =>
    fetchApi<any>(`/api/deliveries/${deliveryId}/move-order`, {
      method: 'POST',
      body: JSON.stringify({ orderId, targetDeliveryId }),
    }),
  getProtocol: (id: number) => fetchApi<any>(`/api/deliveries/${id}/protocol`),
  addItem: (deliveryId: number, data: { itemType: string; description: string; quantity: number }) =>
    fetchApi<any>(`/api/deliveries/${deliveryId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteItem: (deliveryId: number, itemId: number) =>
    fetchApi<void>(`/api/deliveries/${deliveryId}/items/${itemId}`, { method: 'DELETE' }),
  completeOrders: (deliveryId: number, productionDate: string) =>
    fetchApi<any>(`/api/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ productionDate }),
    }),
};

// Importy
export const importsApi = {
  getPending: () => fetchApi<any[]>('/api/imports/pending'),
  getAll: (status?: string) =>
    fetchApi<any[]>(`/api/imports${status ? `?status=${status}` : ''}`),
  getPreview: (id: number) => fetchApi<any>(`/api/imports/${id}/preview`),
  approve: (id: number, action?: 'overwrite' | 'add_new') =>
    fetchApi<any>(`/api/imports/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  reject: (id: number) =>
    fetchApi<any>(`/api/imports/${id}/reject`, { method: 'POST', body: JSON.stringify({}) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/imports/${id}`, { method: 'DELETE' }),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/imports/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Nieznany błąd' }));
        const error: ApiError = new Error(data.error || `HTTP Error: ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        const networkError: ApiError = new Error('Błąd połączenia sieciowego. Sprawdź internetu.');
        networkError.status = 0;
        throw networkError;
      }
      throw error;
    }
  },
};

// Ustawienia
export const settingsApi = {
  getAll: () => fetchApi<Record<string, string>>('/api/settings'),
  update: (settings: Record<string, string>) =>
    fetchApi<any>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getPalletTypes: () => fetchApi<any[]>('/api/settings/pallet-types'),
  createPalletType: (data: any) =>
    fetchApi<any>('/api/settings/pallet-types', { method: 'POST', body: JSON.stringify(data) }),
  updatePalletType: (id: number, data: any) =>
    fetchApi<any>(`/api/settings/pallet-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePalletType: (id: number) =>
    fetchApi<void>(`/api/settings/pallet-types/${id}`, { method: 'DELETE' }),
};

// Dni wolne od pracy
export const workingDaysApi = {
  getAll: (params?: { from?: string; to?: string; month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.month) query.append('month', params.month.toString());
    if (params?.year) query.append('year', params.year.toString());
    return fetchApi<any[]>(`/api/working-days${query.toString() ? `?${query}` : ''}`);
  },
  getHolidays: (year: number, country?: 'PL' | 'DE') => {
    const query = new URLSearchParams({ year: year.toString() });
    if (country) query.append('country', country);
    return fetchApi<any[]>(`/api/working-days/holidays?${query}`);
  },
  setWorkingDay: (date: string, isWorking: boolean, description?: string) =>
    fetchApi<any>('/api/working-days', {
      method: 'POST',
      body: JSON.stringify({ date, isWorking, description }),
    }),
  delete: (date: string) =>
    fetchApi<void>(`/api/working-days/${date}`, { method: 'DELETE' }),
};
