/**
 * Wspólne typy używane w całej aplikacji
 */

export type ID = number;
export type Timestamp = string; // ISO 8601

/**
 * Nominal type for money in grosze (Polish grosz, 1/100 PLN or EUR)
 * ZAWSZE używaj z funkcjami z money.ts (groszeToPln/plnToGrosze)
 */
export type Grosze = number & { readonly __brand: 'Grosze' };

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  status?: number; // HTTP status code (alternative property name used in some error responses)
}

/**
 * Odpowiedź paginowana z API
 * Używana przez endpointy zwracające listy z paginacją
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'new' | 'in_progress' | 'completed' | 'archived';
export type DeliveryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
