/**
 * Pallet Optimization - TypeScript Types
 * Typy dla frontendu zgodne z backendem
 */

// ==================== OKNO (WINDOW) ====================

/**
 * Okno wejściowe (z bazy danych)
 */
export interface WindowInput {
  id: number;
  widthMm: number;
  heightMm: number;
  profileType: string;
  quantity: number;
  orderNumber: string;
}

/**
 * Okno zoptymalizowane (z przypisaną głębokością)
 */
export interface OptimizedWindow {
  id: number;
  widthMm: number;
  heightMm: number;
  profileType: string;
  depthMm: number;
  quantity: number;
  orderNumber: string;
  sideBySideGroupId?: number; // ID grupy okien ułożonych obok siebie (undefined = pojedyncze okno)
}

// ==================== PALETA ====================

/**
 * Typ palety (konfiguracja z bazy danych)
 */
export interface PalletType {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;       // Szerokość palety (np. 4000, 3500, 3000)
  heightMm: number;
  loadWidthMm: number;   // Szerokość załadunku
  loadDepthMm: number;   // Głębokość załadunku
  createdAt: string;
  updatedAt: string;
}

/**
 * Definicja palety (używana w algorytmie)
 */
export interface PalletDefinition {
  name: string;
  lengthMm: number;        // Długość palety (odpowiada szerokości okien)
  maxLoadDepthMm: number;  // Głębokość załadunku
}

/**
 * Zoptymalizowana paleta (wynik algorytmu)
 */
export interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletLengthMm: number;  // Długość palety (odpowiada szerokości okien)
  maxDepthMm: number;
  usedDepthMm: number;
  utilizationPercent: number;
  windows: OptimizedWindow[];
}

// ==================== OPCJE OPTYMALIZACJI ====================

/**
 * Opcje optymalizacji - checkboxy z parametrami sortowania
 */
export interface OptimizationOptions {
  // Sortowanie
  sortByHeightWhenWidthSimilar: boolean;  // Gdy szerokości podobne (±15%), sortuj po wysokości
  widthSimilarityThreshold: number;       // Próg podobieństwa szerokości (domyślnie 0.15 = 15%)

  // Palety
  preferStandardPallets: boolean;         // Preferuj standardowe palety nad małe
  minimizeOverhang: boolean;              // Minimalizuj wystawanie okien poza paletę
  maxOverhangMm: number;                  // Maksymalne wystawanie (domyślnie 700mm)
  maximizeUtilization: boolean;           // Preferuj jak najmniej wolnego miejsca na paletach

  // Układanie
  allowSideBySide: boolean;               // Pozwól układać dwa okna obok siebie (suma szerokości)
  sideBySideMaxGap: number;               // Maksymalny gap między oknami obok siebie (mm)
}

/**
 * Domyślne opcje optymalizacji
 */
export const DEFAULT_OPTIMIZATION_OPTIONS: OptimizationOptions = {
  sortByHeightWhenWidthSimilar: true,
  widthSimilarityThreshold: 0.15,
  preferStandardPallets: true,
  minimizeOverhang: true,
  maxOverhangMm: 700,
  maximizeUtilization: true,
  allowSideBySide: true,
  sideBySideMaxGap: 100,
};

// ==================== WYNIK OPTYMALIZACJI ====================

/**
 * Podsumowanie optymalizacji
 */
export interface OptimizationSummary {
  totalWindows: number;
  totalQuantity?: number;
  averageUtilization: number;
}

/**
 * Kompletny wynik optymalizacji
 */
export interface OptimizationResult {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: OptimizationSummary;
  options?: OptimizationOptions;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== API REQUESTS/RESPONSES ====================

/**
 * Parametry do POST /api/pallets/optimize/:deliveryId
 */
export interface OptimizeDeliveryParams {
  deliveryId: number;
}

/**
 * Response z POST /api/pallets/optimize/:deliveryId
 */
export interface OptimizeDeliveryResponse {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: OptimizationSummary;
}

/**
 * Parametry do GET /api/pallets/optimization/:deliveryId
 */
export interface GetOptimizationParams {
  deliveryId: number;
}

/**
 * Response z GET /api/pallets/optimization/:deliveryId
 */
export interface GetOptimizationResponse {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: OptimizationSummary;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parametry do DELETE /api/pallets/optimization/:deliveryId
 */
export interface DeleteOptimizationParams {
  deliveryId: number;
}

/**
 * Response z DELETE /api/pallets/optimization/:deliveryId
 */
export interface DeleteOptimizationResponse {
  success: boolean;
  message: string;
}

// ==================== CRUD TYPÓW PALET ====================

/**
 * Request do POST /api/pallets/types
 */
export interface CreatePalletTypeRequest {
  name: string;
  lengthMm: number;
  loadDepthMm: number;
}

/**
 * Response z POST /api/pallets/types
 */
export interface CreatePalletTypeResponse {
  id: number;
  name: string;
  lengthMm: number;
  loadDepthMm: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request do PATCH /api/pallets/types/:id
 */
export interface UpdatePalletTypeRequest {
  name?: string;
  lengthMm?: number;
  loadDepthMm?: number;
}

/**
 * Response z PATCH /api/pallets/types/:id
 */
export interface UpdatePalletTypeResponse {
  id: number;
  name: string;
  lengthMm: number;
  loadDepthMm: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response z GET /api/pallets/types
 */
export interface GetPalletTypesResponse {
  types: PalletType[];
}

/**
 * Response z DELETE /api/pallets/types/:id
 */
export interface DeletePalletTypeResponse {
  success: boolean;
  message: string;
}

// ==================== PDF EXPORT ====================

/**
 * Parametry do GET /api/pallets/export/:deliveryId
 */
export interface ExportToPdfParams {
  deliveryId: number;
}

// Note: PDF export zwraca binary data (Blob), nie JSON
