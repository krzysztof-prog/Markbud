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
}

// ==================== PALETA ====================

/**
 * Typ palety (konfiguracja z bazy danych)
 */
export interface PalletType {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Definicja palety (używana w algorytmie)
 */
export interface PalletDefinition {
  name: string;
  widthMm: number;
  loadWidthMm: number;
}

/**
 * Zoptymalizowana paleta (wynik algorytmu)
 */
export interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletWidthMm: number;
  maxDepthMm: number;
  usedDepthMm: number;
  utilizationPercent: number;
  windows: OptimizedWindow[];
}

// ==================== WYNIK OPTYMALIZACJI ====================

/**
 * Podsumowanie optymalizacji
 */
export interface OptimizationSummary {
  totalWindows: number;
  totalQuantity: number;
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
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
}

/**
 * Response z POST /api/pallets/types
 */
export interface CreatePalletTypeResponse {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request do PATCH /api/pallets/types/:id
 */
export interface UpdatePalletTypeRequest {
  name?: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  loadWidthMm?: number;
}

/**
 * Response z PATCH /api/pallets/types/:id
 */
export interface UpdatePalletTypeResponse {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
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
