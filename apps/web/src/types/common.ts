/**
 * Wspólne typy używane w całej aplikacji
 */

export type ID = number;
export type Timestamp = string; // ISO 8601

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'active' | 'archived' | 'pending' | 'completed';
export type DeliveryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
