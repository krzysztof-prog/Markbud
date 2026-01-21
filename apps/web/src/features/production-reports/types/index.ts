/**
 * Typy dla modułu Zestawienie Miesięczne Produkcji
 */

// Status raportu
export type ReportStatus = 'open' | 'closed';

// Role użytkowników
export type UserRole = 'admin' | 'manager' | 'accountant' | 'user';

// Pozycja raportu (zlecenie)
export interface ProductionReportItem {
  id: number;
  reportId: number;
  orderId: number;

  // Dane zlecenia (z Order)
  orderNumber: string;
  client: string | null;
  productionDate: string;

  // Wartości do wyświetlenia (override lub z Order)
  windows: number;
  units: number;
  sashes: number;
  valuePln: number; // w PLN (po konwersji z groszy)
  valueEur: number | null;
  currency: 'PLN' | 'EUR';

  // Czy wartości są nadpisane
  hasOverride: boolean;
  overrideWindows: number | null;
  overrideUnits: number | null;
  overrideSashes: number | null;
  overrideValuePln: number | null;
  overrideValueEur: number | null;

  // Checkboxy RW
  rwOkucia: boolean;
  rwProfile: boolean;

  // Dane FV
  invoiceNumber: string | null;
  invoiceDate: string | null;

  // Dostawa (dla grupowania AKROBUD)
  deliveryId: number | null;
  deliveryNumber: string | null;
  deliveryDate: string | null;

  // Czy to zlecenie AKROBUD
  isAkrobud: boolean;

  // Nowe kolumny - wartości dla zestawienia miesięcznego
  materialValue: number; // wartość materiału w PLN
  coefficient: string; // współczynnik PLN/materiał (formatowany lub '—')
  unitValue: string; // jednostka (PLN - materiał) / szkła (formatowany lub '—')
  totalGlassQuantity: number; // suma ilości szkła z materiałówki
}

// Dane zlecenia (uproszczone, z backendu)
export interface OrderData {
  id: number;
  orderNumber: string;
  client: string;
  totalWindows: number;
  totalSashes: number;
  valuePln: number | null; // w groszach
  valueEur: number | null; // w centach
  deliveryId: number | null;
  deliveryName?: string;
  productionDate?: string | null; // Data wyprodukowania
}

// Główny raport
export interface ProductionReport {
  id: number;
  year: number;
  month: number;
  status: ReportStatus;
  closedAt: string | null;
  closedById: number | null;
  closedByName: string | null;
  editedAfterClose: boolean;
  reopenedAt: string | null;

  // Nietypówki
  atypicalWindows: number;
  atypicalUnits: number;
  atypicalSashes: number;
  atypicalValuePln: number; // w groszach
  atypicalNotes: string | null;

  // Zlecenia (completed orders z productionDate w tym miesiącu)
  orders: OrderData[];

  // Pozycje raportu (nadpisania)
  items: ProductionReportItem[];

  // Dni robocze
  workingDays: number;
}

// Podsumowanie kategorii
export interface CategorySummary {
  windows: number;
  units: number;
  sashes: number;
  valuePln: number;
  averagePerUnit: number | null; // null gdy units = 0
}

// Podsumowania raportu
export interface ProductionReportSummary {
  typowe: CategorySummary;     // Wszystkie zlecenia (AKROBUD + RESZTA)
  akrobud: CategorySummary;    // Tylko AKROBUD
  reszta: CategorySummary;     // TYPOWE - AKROBUD
  nietypowki: CategorySummary; // Nietypówki
  razem: CategorySummary;      // RAZEM (typowe + nietypówki)

  workingDays: number;
  avgPerUnit: number;  // Średnia wartość na jednostkę (PLN)
  avgPerDay: number;   // Średnia wartość na dzień roboczy (PLN)
}

// Grupowanie po dostawie (dla AKROBUD)
export interface DeliveryGroup {
  deliveryId: number;
  deliveryNumber: string;
  deliveryDate: string;
  items: ProductionReportItem[];
  totals: {
    windows: number;
    units: number;
    sashes: number;
    valuePln: number;
  };
}

// Input dla aktualizacji pozycji
export interface UpdateReportItemInput {
  overrideWindows?: number | null;
  overrideUnits?: number | null;
  overrideSashes?: number | null;
  overrideValuePln?: number | null;
  overrideValueEur?: number | null;
  rwOkucia?: boolean;
  rwProfile?: boolean;
}

// Input dla aktualizacji FV
export interface UpdateInvoiceInput {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
}

// Input dla aktualizacji nietypówek
export interface UpdateAtypicalInput {
  atypicalWindows: number;
  atypicalUnits: number;
  atypicalSashes: number;
  atypicalValuePln: number;
  atypicalNotes?: string | null;
}

// Uprawnienia per rola
export const ROLE_PERMISSIONS = {
  admin: {
    canEditQuantities: true,
    canEditRW: true,
    canEditAtypical: true,
    canEditInvoice: true,
    canCloseMonth: true,
    canReopenMonth: true,
  },
  manager: {
    canEditQuantities: true,
    canEditRW: true,
    canEditAtypical: true,
    canEditInvoice: true,
    canCloseMonth: true,
    canReopenMonth: true,
  },
  accountant: {
    canEditQuantities: false,
    canEditRW: false,
    canEditAtypical: false,
    canEditInvoice: true, // Nawet po zamknięciu
    canCloseMonth: false,
    canReopenMonth: false,
  },
  user: {
    canEditQuantities: false,
    canEditRW: false,
    canEditAtypical: false,
    canEditInvoice: false,
    canCloseMonth: false,
    canReopenMonth: false,
  },
} as const;
