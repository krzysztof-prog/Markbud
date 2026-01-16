// Typy dla modułu Moja Praca

// Konflikt importu
export interface ImportConflict {
  id: number;
  orderNumber: string;
  baseOrderNumber: string;
  suffix: string;
  documentAuthor: string | null;
  filename: string;
  existingWindowsCount: number | null;
  existingGlassCount: number | null;
  newWindowsCount: number | null;
  newGlassCount: number | null;
  systemSuggestion: 'replace_base' | 'keep_both' | 'manual' | null;
  status: 'pending' | 'resolved' | 'cancelled';
  createdAt: string;
}

// Szczegóły konfliktu z danymi bazowego zlecenia
export interface ConflictDetail extends ImportConflict {
  parsedData: ParsedUzyteBeleData | null;
  baseOrder: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
    totalWindows: number | null;
    totalGlasses: number | null;
    createdAt: string;
  };
}

// Dane parsowane z CSV
export interface ParsedUzyteBeleData {
  orderNumber: string;
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  documentAuthor?: string;
  totals?: {
    windows: number;
    sashes: number;
    glasses: number;
  };
}

// Licznik konfliktów
export interface ConflictsCount {
  pending: number;
  total: number;
}

// Akcje rozwiązywania konfliktów
export type ConflictAction = 'replace_base' | 'replace_variant' | 'keep_both' | 'cancel';

// Input dla rozwiązania konfliktu
export interface ResolveConflictInput {
  action: ConflictAction;
  targetOrderNumber?: string;
  notes?: string;
}

// Wynik rozwiązania konfliktu
export interface ResolveConflictResult {
  success: boolean;
  message: string;
  orderId?: number;
  orderNumber?: string;
}

// Input dla zbiorczego rozwiązania konfliktów
export interface BulkResolveConflictsInput {
  ids: number[];
  action: ConflictAction;
}

// Wynik zbiorczego rozwiązania konfliktów
export interface BulkResolveConflictsResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  results: Array<{
    id: number;
    orderNumber: string;
    success: boolean;
    message: string;
  }>;
}

// Zlecenie użytkownika
export interface UserOrder {
  id: number;
  orderNumber: string;
  client: string | null;
  project: string | null;
  status: string;
  totalWindows: number | null;
  totalGlasses: number | null;
  valuePln: number | null;
  valueEur: number | null;
  createdAt: string;
}

// Dostawa użytkownika
export interface UserDelivery {
  id: number;
  deliveryDate: string;
  deliveryNumber: string | null;
  status: string;
  notes: string | null;
  orders: Array<{
    position: number;
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string;
    totalWindows: number | null;
  }>;
  totalOrdersInDelivery: number;
}

// Zamówienie szyb
export interface UserGlassOrder {
  id: number;
  glassOrderNumber: string;
  orderDate: string;
  supplier: string | null;
  status: string;
  items: Array<{
    id: number;
    orderNumber: string;
    position: number | null;
    glassType: string | null;
    widthMm: number | null;
    heightMm: number | null;
    quantity: number;
  }>;
  itemsCount: number;
}

// Podsumowanie dnia
export interface DaySummary {
  date: string;
  conflicts: ConflictsCount;
  ordersCount: number;
  deliveriesCount: number;
  glassOrdersCount: number;
}
