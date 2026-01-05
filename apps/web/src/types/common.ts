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

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'new' | 'in_progress' | 'completed' | 'archived';
export type DeliveryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
