/**
 * Typy dla modułu logistyki
 *
 * Moduł obsługuje parsowanie maili z listą projektów na dostawę,
 * zarządzanie wersjami list mailowych i kalendarz dostaw.
 */

// ========== Flagi pozycji ==========

/**
 * Flagi opisujące status lub wymagania pozycji
 */
export type ItemFlag =
  | 'REQUIRES_MESH'
  | 'MISSING_FILE'
  | 'UNCONFIRMED'
  | 'DIMENSIONS_UNCONFIRMED'
  | 'DRAWING_UNCONFIRMED'
  | 'EXCLUDE_FROM_PRODUCTION'
  | 'SPECIAL_HANDLE'
  | 'CUSTOM_COLOR';

/**
 * Wszystkie możliwe flagi (do iteracji w UI)
 */
export const ALL_ITEM_FLAGS: ItemFlag[] = [
  'REQUIRES_MESH',
  'MISSING_FILE',
  'UNCONFIRMED',
  'DIMENSIONS_UNCONFIRMED',
  'DRAWING_UNCONFIRMED',
  'EXCLUDE_FROM_PRODUCTION',
  'SPECIAL_HANDLE',
  'CUSTOM_COLOR',
];

/**
 * Tłumaczenia flag na polski
 */
export const ITEM_FLAG_LABELS: Record<ItemFlag, string> = {
  REQUIRES_MESH: 'Wymaga siatki',
  MISSING_FILE: 'Brak pliku',
  UNCONFIRMED: 'Niepotwierdzone',
  DIMENSIONS_UNCONFIRMED: 'Wymiary niepotwierdzone',
  DRAWING_UNCONFIRMED: 'Rysunek niepotwierdzony',
  EXCLUDE_FROM_PRODUCTION: 'Wyłączone z produkcji',
  SPECIAL_HANDLE: 'Specjalna klamka',
  CUSTOM_COLOR: 'Kolor niestandardowy',
};

// ========== Statusy ==========

/**
 * Status pozycji na liście
 * - ok: Pozycja gotowa do produkcji
 * - blocked: Pozycja zablokowana (brak pliku, niepotwierdzone)
 * - waiting: Pozycja czeka (np. na siatkę)
 * - excluded: Pozycja wyłączona z produkcji
 */
export type ItemStatus = 'ok' | 'blocked' | 'waiting' | 'excluded';

/**
 * Tłumaczenia statusów pozycji na polski
 */
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  ok: 'OK',
  blocked: 'Blokuje',
  waiting: 'Oczekuje',
  excluded: 'Wyłączone',
};

/**
 * Kolory statusów pozycji (Tailwind classes)
 */
export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  ok: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  excluded: 'bg-gray-100 text-gray-500',
};

/**
 * Status dostawy
 * - ready: Wszystkie pozycje gotowe
 * - blocked: Są pozycje blokujące
 * - conditional: Są pozycje oczekujące (np. na siatkę)
 */
export type DeliveryStatus = 'ready' | 'blocked' | 'conditional';

/**
 * Tłumaczenia statusów dostawy na polski
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  ready: 'Gotowa',
  blocked: 'Zablokowana',
  conditional: 'Warunkowa',
};

/**
 * Kolory statusów dostawy (Tailwind classes)
 */
export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  ready: 'bg-green-500',
  blocked: 'bg-red-500',
  conditional: 'bg-yellow-500',
};

// ========== Sparsowane dane (wynik parsowania) ==========

/**
 * Sparsowana pozycja z maila
 */
export interface ParsedItem {
  position: number;
  projectNumber: string;
  quantity: number;
  rawNotes: string;
  flags: ItemFlag[];
  customColor?: string;
}

/**
 * Sparsowana pozycja wzbogacona o dane z bazy
 */
export interface ParseResultItem extends ParsedItem {
  itemStatus: ItemStatus;
  matchedOrder?: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string | null;
    /** Data dostawy zlecenia - null jeśli nie ustawiona */
    deliveryDate: string | null;
  };
  orderNotFound?: boolean;
}

/**
 * Sparsowana data z maila
 */
export interface ParsedDate {
  suggested: string; // ISO date: "2026-02-16"
  source: 'parsed' | 'not_found';
  confidence: 'high' | 'low';
}

/**
 * Sparsowana dostawa (Klient nr X)
 */
export interface ParsedDelivery {
  deliveryCode: string; // np. "16.02.2026_I"
  deliveryIndex: number; // 1, 2, 3...
  clientLabel?: string; // "Klient nr 1"
  items: ParsedItem[];
}

/**
 * Sparsowana dostawa wzbogacona o dane z bazy
 */
export interface ParseResultDelivery {
  deliveryCode: string;
  deliveryIndex: number;
  clientLabel?: string;
  items: ParseResultItem[];
  deliveryStatus: DeliveryStatus;
  blockedItems: { projectNumber: string; reason: string }[];
}

/**
 * Wynik parsowania maila (odpowiedź z /parse endpoint)
 */
export interface ParseResult {
  deliveryDate: ParsedDate;
  isUpdate: boolean;
  deliveries: ParseResultDelivery[];
  warnings: string[];
}

// ========== Zapisane listy mailowe ==========

/**
 * Pozycja na zapisanej liście mailowej
 */
export interface MailItem {
  id: number;
  mailListId: number;
  position: number;
  projectNumber: string;
  quantity: number;
  rawNotes: string | null;
  requiresMesh: boolean;
  missingFile: boolean;
  unconfirmed: boolean;
  dimensionsUnconfirmed: boolean;
  drawingUnconfirmed: boolean;
  excludeFromProduction: boolean;
  specialHandle: boolean;
  customColor: string | null;
  orderId: number | null;
  itemStatus: ItemStatus;
  createdAt: string;
  updatedAt: string;
  // Relacja z Order (opcjonalnie załadowana)
  order?: {
    id: number;
    orderNumber: string;
    client: string | null;
    project: string | null;
    status: string | null;
  } | null;
}

/**
 * Zapisana lista mailowa
 */
export interface MailList {
  id: number;
  deliveryDate: string; // ISO date
  deliveryIndex: number;
  deliveryCode: string;
  version: number;
  isUpdate: boolean;
  rawMailText: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Pozycje (opcjonalnie załadowane)
  items?: MailItem[];
  // Liczniki
  _count?: {
    items: number;
  };
}

/**
 * Informacja o niezgodności daty dostawy
 */
export interface DateMismatchItem {
  itemId: number;
  projectNumber: string;
  orderId: number;
  orderNumber: string;
  orderDeliveryDate: string;
  mailListDeliveryDate: string;
  reason: string;
}

/**
 * Informacja o zleceniu bez ustawionej daty dostawy
 */
export interface MissingDeliveryDateItem {
  itemId: number;
  projectNumber: string;
  orderId: number;
  orderNumber: string;
  reason: string;
}

/**
 * Lista mailowa z wyliczonym statusem dostawy
 */
export interface MailListWithStatus extends MailList {
  deliveryStatus: DeliveryStatus;
  blockedItems: { projectNumber: string; reason: string }[];
  dateMismatchItems?: DateMismatchItem[];
  hasDateMismatch?: boolean;
  missingDeliveryDateItems?: MissingDeliveryDateItem[];
  hasMissingDeliveryDate?: boolean;
}

// ========== Diff między wersjami ==========

/**
 * Dane zlecenia w diff (do wyświetlenia i akcji)
 */
export interface DiffOrderInfo {
  id: number;
  orderNumber: string;
  client: string | null;
}

/**
 * Ostrzeżenie o różnicy dat zlecenia vs listy mailowej
 */
export interface DateWarning {
  orderDeliveryDate: string;
  mailListDeliveryDate: string;
}

/**
 * Pozycja dodana w diff
 */
export interface DiffAddedItem {
  projectNumber: string;
  notes?: string;
  itemId: number; // ID pozycji w nowej wersji (do akcji)
  order?: DiffOrderInfo;
  dateWarning?: DateWarning;
}

/**
 * Pozycja usunięta w diff
 */
export interface DiffRemovedItem {
  projectNumber: string;
  notes?: string;
  itemId: number; // ID pozycji w starej wersji (do akcji)
  order?: DiffOrderInfo;
}

/**
 * Pozycja zmieniona w diff
 */
export interface DiffChangedItem {
  projectNumber: string;
  field: string;
  oldValue: string;
  newValue: string;
  itemId: number; // ID pozycji w nowej wersji (do akcji)
  order?: DiffOrderInfo;
  dateWarning?: DateWarning;
}

/**
 * Różnice między dwiema wersjami listy (rozszerzone o dane zleceń)
 */
export interface VersionDiff {
  added: DiffAddedItem[];
  removed: DiffRemovedItem[];
  changed: DiffChangedItem[];
}

/**
 * Status decyzji dla pozycji diff
 */
export type DiffDecisionStatus =
  | 'pending'      // Oczekuje na decyzję
  | 'confirmed'    // Potwierdzone (dla added)
  | 'rejected'     // Odrzucone (dla added)
  | 'removed'      // Usunięte z dostawy (dla removed)
  | 'rescheduled'  // Przeniesione na inną datę (dla removed)
  | 'ignored'      // Zignorowane (dla removed)
  | 'accepted'     // Zaakceptowana zmiana (dla changed)
  | 'restored';    // Przywrócona poprzednia wartość (dla changed)

// ========== Kalendarz dostaw ==========

/**
 * Wpis w kalendarzu dostaw
 */
export interface CalendarEntry {
  id: number;
  deliveryDate: string; // ISO date
  deliveryIndex: number;
  deliveryCode: string;
  version: number;
  isUpdate: boolean;
  createdAt: string;
  // Status wyliczony ze statusów pozycji
  deliveryStatus: DeliveryStatus;
  // Pozycje blokujące
  blockedItems: { projectNumber: string; reason: string }[];
  // Licznik pozycji
  _count: {
    items: number;
  };
  // Uproszczone pozycje (tylko do wyliczenia statusu)
  items: {
    itemStatus: ItemStatus;
    projectNumber: string;
    rawNotes: string | null;
  }[];
}

/**
 * Kalendarz dostaw pogrupowany po datach
 */
export interface DeliveryCalendar {
  [date: string]: CalendarEntry[];
}

// ========== Filtry i zapytania ==========

/**
 * Filtry dla list mailowych
 */
export interface MailListFilters {
  deliveryCode?: string;
  deliveryDateFrom?: string; // ISO date
  deliveryDateTo?: string; // ISO date
  includeDeleted?: boolean;
}

/**
 * Dane do zapisania listy mailowej
 */
export interface SaveMailListInput {
  deliveryDate: string; // ISO date
  deliveryIndex: number;
  deliveryCode: string;
  isUpdate: boolean;
  rawMailText: string;
  items: {
    position: number;
    projectNumber: string;
    quantity: number;
    rawNotes?: string;
    flags: ItemFlag[];
    customColor?: string;
    orderId?: number;
  }[];
}

/**
 * Dane do aktualizacji pozycji
 */
export interface UpdateMailItemInput {
  orderId?: number | null;
  flags?: ItemFlag[];
}

// ========== Odpowiedzi API ==========

/**
 * Odpowiedź z listy list mailowych
 */
export interface MailListsResponse {
  items: MailListWithStatus[];
  total: number;
}

/**
 * Odpowiedź z kalendarza dostaw
 */
export interface CalendarResponse {
  entries: CalendarEntry[];
  dateFrom: string;
  dateTo: string;
}

/**
 * Odpowiedź z diff między wersjami
 */
export interface VersionDiffResponse {
  deliveryCode: string;
  versionFrom: number;
  versionTo: number;
  diff: VersionDiff;
}

// ========== Wejście/Wyjście dla parsowania ==========

/**
 * Dane wejściowe do parsowania emaila
 * @deprecated - użyj string bezpośrednio w useParseEmail
 */
export interface ParseEmailInput {
  emailText: string;
}

/**
 * Wynik parsowania emaila (alias dla ParseResult)
 * @deprecated - użyj ParseResult
 */
export type ParseEmailResult = ParseResult;

// ========== Informacje o wersji ==========

/**
 * Informacja o wersji listy mailowej
 */
export interface VersionInfo {
  id: number;
  version: number;
  createdAt: string;
  isUpdate: boolean;
  itemCount: number;
}

// ========== Helpers ==========

/**
 * Konwertuje flagi boolean z MailItem na tablicę ItemFlag
 */
export function mailItemToFlags(item: MailItem): ItemFlag[] {
  const flags: ItemFlag[] = [];

  if (item.requiresMesh) flags.push('REQUIRES_MESH');
  if (item.missingFile) flags.push('MISSING_FILE');
  if (item.unconfirmed) flags.push('UNCONFIRMED');
  if (item.dimensionsUnconfirmed) flags.push('DIMENSIONS_UNCONFIRMED');
  if (item.drawingUnconfirmed) flags.push('DRAWING_UNCONFIRMED');
  if (item.excludeFromProduction) flags.push('EXCLUDE_FROM_PRODUCTION');
  if (item.specialHandle) flags.push('SPECIAL_HANDLE');
  if (item.customColor) flags.push('CUSTOM_COLOR');

  return flags;
}

/**
 * Formatuje kod dostawy do czytelnej formy
 * "16.02.2026_I" -> "16 lut 2026 (I)"
 */
export function formatDeliveryCode(deliveryCode: string): string {
  const match = deliveryCode.match(/^(\d{2})\.(\d{2})\.(\d{4})_(.+)$/);
  if (!match) return deliveryCode;

  const [, day, month, year, index] = match;
  const monthNames = [
    'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
    'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
  ];
  const monthName = monthNames[parseInt(month, 10) - 1] || month;

  return `${day} ${monthName} ${year} (${index})`;
}

/**
 * Parsuje kod dostawy na składowe
 */
export function parseDeliveryCode(deliveryCode: string): {
  date: string;
  index: string;
} | null {
  const match = deliveryCode.match(/^(\d{2})\.(\d{2})\.(\d{4})_(.+)$/);
  if (!match) return null;

  const [, day, month, year, index] = match;
  return {
    date: `${year}-${month}-${day}`,
    index,
  };
}
