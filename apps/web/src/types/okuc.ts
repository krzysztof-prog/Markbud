/**
 * TypeScript types for DualStock (Okuc) Module
 *
 * Moduł zarządzania magazynem okuć PVC i ALU z systemem:
 * - Aliasów (stare numery → nowe numery)
 * - Proporcji (multiplier i split między artykułami)
 * - Dwóch magazynów: PVC (3 podmagazyny) + ALU (1 magazyn)
 * - Zapotrzebowania z CSV lub zleceń
 * - Zamówień do dostawcy (3 koszyki: typical_standard, typical_gabarat, atypical)
 * - Historii zmian (RW, korekty, transfery, przyjęcia)
 */

import type { ID, Timestamp } from './common';
import type { Grosze } from './common';

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

/** Klasyfikacja zamówienia - typowy lub atypowy */
export type OrderClass = 'typical' | 'atypical';

/** Klasa wielkości - standard lub gabarat (wielkogabarytowy) */
export type SizeClass = 'standard' | 'gabarat';

/** Jednostka zamówienia - sztuki lub paczki */
export type OrderUnit = 'piece' | 'pack';

/** Typ magazynu */
export type WarehouseType = 'pvc' | 'alu';

/** Podmagazyn PVC (dla ALU brak podmagazynów) */
export type SubWarehouse = 'production' | 'buffer' | 'gabaraty' | null;

/** Typ koszyka zamówienia do dostawcy */
export type BasketType = 'typical_standard' | 'typical_gabarat' | 'atypical';

/** Status zapotrzebowania */
export type DemandStatus = 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';

/** Źródło zapotrzebowania */
export type DemandSource = 'order' | 'csv_import' | 'manual';

/** Status zamówienia do dostawcy */
export type OkucOrderStatus =
  | 'draft'            // Projekt (można edytować)
  | 'pending_approval' // Oczekuje zatwierdzenia
  | 'approved'         // Zatwierdzone
  | 'sent'             // Wysłane do dostawcy
  | 'confirmed'        // Potwierdzone przez dostawcę
  | 'in_transit'       // W transporcie
  | 'received'         // Odebrane
  | 'cancelled';       // Anulowane

/** Typ zdarzenia w historii magazynowej */
export type HistoryEventType =
  | 'rw_consumption'     // Zużycie wg RW
  | 'manual_consumption' // Zużycie ręczne
  | 'adjustment'         // Korekta stanu (inwentaryzacja)
  | 'transfer'           // Transfer między podmagazynami (tylko PVC)
  | 'delivery'           // Dostawa do magazynu
  | 'return'             // Zwrot do magazynu
  | 'inventory'          // Remanent
  | 'order_placed'       // Złożono zamówienie
  | 'order_received'     // Przyjęto zamówienie
  | 'manual_edit';       // Ręczna edycja

/** Typ proporcji między artykułami */
export type ProportionType = 'multiplier' | 'split';

// ============================================================================
// ARTICLE (Artykuł okuciowy)
// ============================================================================

/** Artykuł okuciowy - podstawowa jednostka w systemie */
export interface OkucArticle {
  id: ID;
  articleId: string;              // Numer artykułu (np. "A123")
  name: string;                   // Nazwa artykułu
  description?: string;           // Opis opcjonalny

  // Klasyfikacja
  usedInPvc: boolean;             // Używany w PVC
  usedInAlu: boolean;             // Używany w ALU
  orderClass: OrderClass;         // Klasa zamówienia (typical/atypical)
  sizeClass: SizeClass;           // Klasa wielkości (standard/gabarat)

  // Jednostki i opakowania
  orderUnit: OrderUnit;           // Jednostka zamówienia (piece/pack)
  packagingSizes?: string;        // JSON: [50, 100, 200] - rozmiary opakowań
  preferredSize?: number;         // Preferowany rozmiar opakowania

  // Dane dostawcy
  supplierCode?: string;          // Kod u dostawcy
  leadTimeDays: number;           // Czas realizacji (dni)
  safetyDays: number;             // Dni bezpieczeństwa

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Relacje (opcjonalne dla szczegółowego widoku)
  aliases?: OkucArticleAlias[];
  stocks?: OkucStock[];
  proportionsSource?: OkucProportion[];  // Proporcje gdzie ten artykuł jest źródłem
  proportionsTarget?: OkucProportion[];  // Proporcje gdzie ten artykuł jest celem
}

/** Alias artykułu - mapowanie starych numerów na nowe */
export interface OkucArticleAlias {
  id: ID;
  articleId: ID;
  aliasNumber: string;            // Stary numer artykułu
  isActive: boolean;              // false gdy zapas zszedł do 0
  deactivatedAt?: Timestamp;      // Data dezaktywacji
  createdAt: Timestamp;

  // Relacje
  article?: OkucArticle;
}

/** Proporcje między artykułami (multiplier lub split) */
export interface OkucProportion {
  id: ID;
  sourceArticleId: ID;
  targetArticleId: ID;
  proportionType: ProportionType;
  ratio: number;                  // np. 2.0 = 2x target na 1x source
  splitPercent?: number;          // dla typu 'split' (0-100%)
  tolerance: number;              // tolerancja proporcji (np. 0.9 = 90%)
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Relacje
  sourceArticle?: OkucArticle;
  targetArticle?: OkucArticle;
}

// ============================================================================
// STOCK (Stan magazynowy)
// ============================================================================

/** Stan magazynowy okuć */
export interface OkucStock {
  id: ID;
  articleId: ID;
  warehouseType: WarehouseType;   // 'pvc' | 'alu'
  subWarehouse?: SubWarehouse;    // tylko dla PVC: 'production' | 'buffer' | 'gabaraty'
  currentQuantity: number;        // Aktualny stan
  reservedQty: number;            // Zarezerwowana ilość
  minStock?: number;              // Minimalny stan
  maxStock?: number;              // Maksymalny stan
  version: number;                // Optimistic locking
  updatedAt: Timestamp;
  updatedById?: ID;

  // Relacje
  article?: OkucArticle;
  updatedBy?: { id: ID; name: string; email: string };

  // Pola wyliczane (frontend)
  availableQty?: number;          // currentQuantity - reservedQty
  isCritical?: boolean;           // currentQuantity < minStock
}

// ============================================================================
// DEMAND (Zapotrzebowanie)
// ============================================================================

/** Zapotrzebowanie na okucia */
export interface OkucDemand {
  id: ID;
  demandId?: string;              // ID z CSV importu (np. "ZAP-2025-0089")
  articleId: ID;
  orderId?: ID;                   // Powiązanie ze zleceniem
  expectedWeek: string;           // Format: "2025-W08"
  quantity: number;
  status: DemandStatus;
  source: DemandSource;

  // Audit edycji ręcznej
  isManualEdit: boolean;
  editedAt?: Timestamp;
  editedById?: ID;
  editReason?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Relacje
  article?: OkucArticle;
  order?: { id: ID; orderNumber: string };
  editedBy?: { id: ID; name: string };
}

// ============================================================================
// ORDER (Zamówienie do dostawcy)
// ============================================================================

/** Zamówienie do dostawcy okuć */
export interface OkucOrder {
  id: ID;
  orderNumber: string;            // Numer zamówienia
  basketType: BasketType;         // Typ koszyka
  status: OkucOrderStatus;
  expectedDeliveryDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  notes?: string;

  // Audit edycji ręcznej
  isManualEdit: boolean;
  editedAt?: Timestamp;
  editedById?: ID;
  editReason?: string;

  // Timestamps
  createdAt: Timestamp;
  createdById?: ID;
  updatedAt: Timestamp;

  // Relacje
  items?: OkucOrderItem[];
  createdBy?: { id: ID; name: string };
  editedBy?: { id: ID; name: string };
}

/** Pozycja zamówienia okuć */
export interface OkucOrderItem {
  id: ID;
  okucOrderId: ID;
  articleId: ID;
  orderedQty: number;             // Zamówiona ilość
  receivedQty?: number;           // Odebrana ilość
  unitPrice?: Grosze;             // Cena jednostkowa w groszach

  // Relacje
  article?: OkucArticle;
  okucOrder?: OkucOrder;
}

// ============================================================================
// HISTORY (Historia zmian magazynowych)
// ============================================================================

/** Historia zmian magazynowych */
export interface OkucHistory {
  id: ID;
  articleId: ID;
  warehouseType: WarehouseType;
  subWarehouse?: SubWarehouse;
  eventType: HistoryEventType;
  previousQty: number;
  changeQty: number;              // Może być ujemna
  newQty: number;
  reason?: string;                // Wymagane dla adjustment i manual_consumption
  reference?: string;             // RW number, Order ID, itp.

  // Audit edycji ręcznej
  isManualEdit: boolean;
  editedAt?: Timestamp;
  editedById?: ID;

  // Timestamps
  recordedAt: Timestamp;
  recordedById?: ID;

  // Relacje
  article?: OkucArticle;
  recordedBy?: { id: ID; name: string };
  editedBy?: { id: ID; name: string };
}

// ============================================================================
// INPUT TYPES (dla API requests)
// ============================================================================

/** Dane do tworzenia artykułu */
export interface CreateArticleInput {
  articleId: string;
  name: string;
  description?: string;
  usedInPvc?: boolean;
  usedInAlu?: boolean;
  orderClass?: OrderClass;
  sizeClass?: SizeClass;
  orderUnit?: OrderUnit;
  packagingSizes?: string;        // JSON string
  preferredSize?: number;
  supplierCode?: string;
  leadTimeDays?: number;
  safetyDays?: number;
}

/** Dane do aktualizacji artykułu */
export interface UpdateArticleInput {
  name?: string;
  description?: string;
  usedInPvc?: boolean;
  usedInAlu?: boolean;
  orderClass?: OrderClass;
  sizeClass?: SizeClass;
  orderUnit?: OrderUnit;
  packagingSizes?: string;
  preferredSize?: number;
  supplierCode?: string;
  leadTimeDays?: number;
  safetyDays?: number;
}

/** Dane do dodania aliasu */
export interface AddAliasInput {
  aliasNumber: string;
}

/** Dane do aktualizacji stanu magazynowego */
export interface UpdateStockInput {
  quantity: number;
  reason?: string;
  expectedVersion?: number;       // Optimistic locking
}

/** Dane do korekty stanu magazynowego (delta) */
export interface AdjustStockInput {
  delta: number;                  // Może być ujemna
  reason: string;                 // Wymagane
  expectedVersion?: number;
}

/** Dane do transferu między podmagazynami (tylko PVC) */
export interface TransferStockInput {
  articleId: number;
  fromSubWarehouse: SubWarehouse;
  toSubWarehouse: SubWarehouse;
  quantity: number;
  reason?: string;
}

/** Dane do tworzenia stanu magazynowego */
export interface CreateStockInput {
  articleId: number;
  warehouseType: WarehouseType;
  subWarehouse?: SubWarehouse;
  currentQuantity?: number;
  minStock?: number;
  maxStock?: number;
}

/** Dane do tworzenia zapotrzebowania */
export interface CreateDemandInput {
  demandId?: string;
  articleId: number;
  orderId?: number;
  expectedWeek: string;           // Format: "2025-W08"
  quantity: number;
  status?: DemandStatus;
  source?: DemandSource;
}

/** Dane do aktualizacji zapotrzebowania */
export interface UpdateDemandInput {
  quantity?: number;
  status?: DemandStatus;
  expectedWeek?: string;
  editReason: string;             // Wymagane dla edycji ręcznej
}

/** Dane do tworzenia zamówienia */
export interface CreateOkucOrderInput {
  basketType: BasketType;
  items: Array<{
    articleId: number;
    orderedQty: number;
    unitPrice?: number;           // w groszach
  }>;
  notes?: string;
}

/** Dane do aktualizacji zamówienia */
export interface UpdateOkucOrderInput {
  status?: OkucOrderStatus;
  items?: Array<{
    articleId: number;
    orderedQty: number;
    receivedQty?: number;
    unitPrice?: number;
  }>;
  editReason?: string;
}

/** Dane do przyjęcia zamówienia */
export interface ReceiveOrderInput {
  items: Array<{
    articleId: number;
    receivedQty: number;
  }>;
  notes?: string;
}

/** Dane do tworzenia proporcji */
export interface CreateProportionInput {
  sourceArticleId: number;
  targetArticleId: number;
  proportionType: ProportionType;
  ratio?: number;
  splitPercent?: number;
  tolerance?: number;
  isActive?: boolean;
}

/** Dane do aktualizacji proporcji */
export interface UpdateProportionInput {
  proportionType?: ProportionType;
  ratio?: number;
  splitPercent?: number;
  tolerance?: number;
  isActive?: boolean;
}

/** Dane importu RW (Rozchód Wewnętrzny) */
export interface ImportRwInput {
  items: Array<{
    articleId: string;
    quantity: number;
    subWarehouse?: SubWarehouse;
    reference?: string;           // Numer RW
  }>;
}

/** Dane importu zapotrzebowania z CSV */
export interface ImportDemandInput {
  items: Array<{
    demandId?: string;
    articleId: string;
    expectedWeek: string;
    quantity: number;
    status?: DemandStatus;
  }>;
  overwriteExisting?: boolean;    // CSV ma priorytet nad istniejącymi danymi
}

// ============================================================================
// FILTER TYPES (dla API queries)
// ============================================================================

/** Filtry dla artykułów */
export interface ArticleFilters {
  usedInPvc?: boolean;
  usedInAlu?: boolean;
  orderClass?: OrderClass;
  sizeClass?: SizeClass;
  search?: string;                // Wyszukiwanie po nazwie lub articleId
}

/** Filtry dla stanów magazynowych */
export interface StockFilters {
  articleId?: number;
  warehouseType?: WarehouseType;
  subWarehouse?: SubWarehouse;
  minQuantity?: number;
  maxQuantity?: number;
  isCritical?: boolean;           // Tylko krytyczne stany
}

/** Filtry dla zapotrzebowania */
export interface DemandFilters {
  articleId?: number;
  orderId?: number;
  status?: DemandStatus;
  source?: DemandSource;
  expectedWeek?: string;
  fromWeek?: string;
  toWeek?: string;
  isManualEdit?: boolean;
}

/** Filtry dla historii */
export interface HistoryFilters {
  articleId?: number;
  warehouseType?: WarehouseType;
  subWarehouse?: string;
  eventType?: HistoryEventType;
  isManualEdit?: boolean;
  fromDate?: Date;
  toDate?: Date;
  recordedById?: number;
}

// ============================================================================
// RESPONSE TYPES (agregaty, statystyki, podsumowania)
// ============================================================================

/** Odpowiedź z importu artykułów */
export interface ImportArticlesResponse {
  success: boolean;
  imported: number;               // Liczba zaimportowanych
  updated: number;                // Liczba zaktualizowanych
  skipped: number;                // Liczba pominiętych
  errors: Array<{
    row: number;
    articleId: string;
    error: string;
  }>;
}

/** Podsumowanie stanów magazynowych */
export interface StockSummary {
  warehouseType: WarehouseType;
  subWarehouse?: SubWarehouse;
  totalArticles: number;          // Liczba artykułów
  totalQuantity: number;          // Suma ilości
  criticalCount: number;          // Liczba krytycznych stanów
  availableCount: number;         // Liczba dostępnych
  reservedTotal: number;          // Suma zarezerwowanych
}

/** Statystyki modułu OKUC */
export interface OkucStats {
  articlesTotal: number;          // Łącznie artykułów
  articlesPvc: number;            // Artykuły PVC
  articlesAlu: number;            // Artykuły ALU
  stockSummary: {
    pvc: StockSummary[];          // Dla każdego podmagazynu
    alu: StockSummary;
  };
  pendingDemands: number;         // Oczekujące zapotrzebowania
  activeOrders: number;           // Aktywne zamówienia
  criticalArticles: number;       // Artykuły z krytycznym stanem
}

/** Krytyczny stan magazynowy (dla alertów) */
export interface CriticalStock extends OkucStock {
  article: OkucArticle;
  shortage: number;               // Ile brakuje do minStock
  pendingOrders?: number;         // Zamówione (w drodze)
  estimatedDelivery?: Timestamp;  // Przewidywana dostawa
}

/** Podsumowanie zapotrzebowania na dany tydzień */
export interface WeeklyDemandSummary {
  week: string;                   // Format: "2025-W08"
  totalArticles: number;
  totalQuantity: number;
  byStatus: Record<DemandStatus, number>;
  bySource: Record<DemandSource, number>;
}

/** Podsumowanie zamówienia (agregat) */
export interface OrderSummary {
  order: OkucOrder;
  totalItems: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  completionPercent: number;
  estimatedValue?: number;        // Szacowana wartość w groszach
}

/** Dashboard modułu OKUC */
export interface OkucDashboard {
  stats: OkucStats;
  criticalStocks: CriticalStock[];
  upcomingDemands: WeeklyDemandSummary[];
  activeOrders: OrderSummary[];
  recentHistory: OkucHistory[];
}
