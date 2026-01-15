/**
 * API dla modułu Zestawienie Miesięczne Produkcji
 *
 * WAŻNE: Backend zwraca dane w innym formacie niż oczekuje frontend.
 * API mapuje dane z backendu na format oczekiwany przez komponenty.
 */

import { fetchApi } from '@/lib/api-client';
import type {
  ProductionReport,
  ProductionReportSummary,
  ProductionReportItem,
  OrderData,
  CategorySummary,
  UpdateReportItemInput,
  UpdateInvoiceInput,
  UpdateAtypicalInput,
} from '../types';

const BASE_URL = '/api/production-reports';

// ============================================
// TYPY ODPOWIEDZI Z BACKENDU
// ============================================

/** Format danych z backendu (może się różnić od frontendu) */
interface BackendReportItem {
  orderId: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  productionDate: string;
  completedAt: string | null;
  windows: number;
  units: number;
  sashes: number;
  valuePln: number;
  valueEur: number | null;
  originalValueEur: number | null;
  hasOverride: boolean;
  rwOkucia: boolean;
  rwProfile: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  avgUnitValue: string;
}

interface BackendFullReport {
  year: number;
  month: number;
  status: 'open' | 'closed';
  closedAt: string | null;
  editedAfterClose: boolean;
  items: BackendReportItem[];
  summary: BackendReportSummary;
}

interface BackendCategorySummary {
  windows: number;
  units: number;
  sashes: number;
  valuePln: number;
}

interface BackendReportSummary {
  typowe: BackendCategorySummary;
  akrobud: BackendCategorySummary;
  reszta: BackendCategorySummary;
  atypical: BackendCategorySummary & { notes: string | null };
  razem: BackendCategorySummary;
  workingDays: number;
  avgUnitsPerDay: string;
}

// ============================================
// FUNKCJE MAPUJĄCE
// ============================================

function mapBackendReportToFrontend(backend: BackendFullReport): ProductionReport {
  const orders: OrderData[] = backend.items.map((item) => ({
    id: item.orderId,
    orderNumber: item.orderNumber,
    client: item.client || '',
    totalWindows: item.windows,
    totalSashes: item.sashes,
    valuePln: Math.round(item.valuePln * 100),
    valueEur: item.originalValueEur !== null && item.originalValueEur !== undefined
      ? Math.round(item.originalValueEur * 100)
      : (item.valueEur !== null ? Math.round(item.valueEur * 100) : null),
    deliveryId: null,
    deliveryName: undefined,
    productionDate: item.productionDate,
  }));

  const items: ProductionReportItem[] = backend.items.map((item) => {
    const hasEurOverride = item.originalValueEur !== undefined && item.originalValueEur !== null
      ? item.valueEur !== item.originalValueEur
      : false;

    return {
      id: item.orderId,
      reportId: 0,
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      client: item.client,
      productionDate: item.productionDate,
      windows: item.windows,
      units: item.units,
      sashes: item.sashes,
      valuePln: item.valuePln,
      valueEur: item.valueEur,
      currency: item.valueEur !== null ? ('EUR' as const) : ('PLN' as const),
      hasOverride: item.hasOverride,
      overrideWindows: item.hasOverride ? item.windows : null,
      overrideUnits: item.hasOverride ? item.units : null,
      overrideSashes: item.hasOverride ? item.sashes : null,
      overrideValuePln: item.hasOverride ? Math.round(item.valuePln * 100) : null,
      overrideValueEur: hasEurOverride && item.valueEur !== null
        ? Math.round(item.valueEur * 100)
        : null,
      rwOkucia: item.rwOkucia,
      rwProfile: item.rwProfile,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      deliveryId: null,
      deliveryNumber: null,
      deliveryDate: null,
      isAkrobud: item.client?.toUpperCase().includes('AKROBUD') ?? false,
    };
  });

  const atypical = backend.summary.atypical;

  return {
    id: 0,
    year: backend.year,
    month: backend.month,
    status: backend.status,
    closedAt: backend.closedAt,
    closedById: null,
    closedByName: null,
    editedAfterClose: backend.editedAfterClose,
    reopenedAt: null,
    atypicalWindows: atypical.windows,
    atypicalUnits: atypical.units,
    atypicalSashes: atypical.sashes,
    atypicalValuePln: Math.round(atypical.valuePln * 100),
    atypicalNotes: atypical.notes,
    orders,
    items,
    workingDays: backend.summary.workingDays,
  };
}

function mapBackendSummaryToFrontend(backend: BackendReportSummary): ProductionReportSummary {
  const mapCategory = (cat: BackendCategorySummary): CategorySummary => ({
    windows: cat.windows,
    units: cat.units,
    sashes: cat.sashes,
    valuePln: Math.round(cat.valuePln * 100),
    averagePerUnit: cat.units > 0 ? cat.valuePln / cat.units : null,
  });

  const razem = mapCategory(backend.razem);

  return {
    typowe: mapCategory(backend.typowe),
    akrobud: mapCategory(backend.akrobud),
    reszta: mapCategory(backend.reszta),
    nietypowki: mapCategory(backend.atypical),
    razem,
    workingDays: backend.workingDays,
    avgPerUnit: razem.units > 0 ? backend.razem.valuePln / razem.units : 0,
    avgPerDay: backend.workingDays > 0 ? backend.razem.valuePln / backend.workingDays : 0,
  };
}

// ============================================
// API
// ============================================

export const productionReportsApi = {
  getReport: async (year: number, month: number): Promise<ProductionReport> => {
    const backend = await fetchApi<BackendFullReport>(`${BASE_URL}/${year}/${month}`);
    return mapBackendReportToFrontend(backend);
  },

  getSummary: async (year: number, month: number): Promise<ProductionReportSummary> => {
    const backend = await fetchApi<BackendReportSummary>(`${BASE_URL}/${year}/${month}/summary`);
    return mapBackendSummaryToFrontend(backend);
  },

  updateReportItem: (year: number, month: number, orderId: number, data: UpdateReportItemInput) =>
    fetchApi<void>(`${BASE_URL}/${year}/${month}/items/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateInvoice: (year: number, month: number, orderId: number, data: UpdateInvoiceInput) =>
    fetchApi<void>(`${BASE_URL}/${year}/${month}/items/${orderId}/invoice`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateAtypical: (year: number, month: number, data: UpdateAtypicalInput) =>
    fetchApi<void>(`${BASE_URL}/${year}/${month}/atypical`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  closeMonth: (year: number, month: number) =>
    fetchApi<void>(`${BASE_URL}/${year}/${month}/close`, { method: 'POST' }),

  reopenMonth: (year: number, month: number) =>
    fetchApi<void>(`${BASE_URL}/${year}/${month}/reopen`, { method: 'POST' }),

  exportPdf: async (year: number, month: number, eurRate: number = 4.30): Promise<void> => {
    const token = localStorage.getItem('akrobud_auth_token');
    if (!token) {
      throw new Error('Brak tokenu autoryzacji');
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = `${apiUrl}${BASE_URL}/${year}/${month}/pdf?eurRate=${eurRate.toFixed(2)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Błąd eksportu PDF');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  },
};

export default productionReportsApi;
