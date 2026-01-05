/**
 * Constants for manager feature
 */

/** Number of days for "upcoming orders" timeframe */
export const UPCOMING_ORDERS_DAYS = 14;

/** Number of weeks for "upcoming orders" (derived from days) */
export const UPCOMING_ORDERS_WEEKS = UPCOMING_ORDERS_DAYS / 7;

/** Label for upcoming orders section */
export const UPCOMING_ORDERS_LABEL = `Zlecenia na najbliższe ${UPCOMING_ORDERS_WEEKS} tygodnie`;

/** Status colors mapping */
export const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

/** Status labels mapping (Polish) */
export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planowana',
  in_progress: 'W trakcie',
  completed: 'Zakończona',
  new: 'Nowe',
  archived: 'Zarchiwizowane',
};

/** Default status color for unknown statuses */
export const DEFAULT_STATUS_COLOR = 'bg-gray-100 text-gray-800';

/**
 * Completion status enum
 * Reprezentuje stan kompletacji zlecenia względem materiałów
 */
export const COMPLETION_STATUS = {
  INCOMPLETE: 'incomplete', // Brak wszystkich materiałów
  READY: 'ready', // Wszystkie materiały dostępne, gotowe do produkcji
  IN_PRODUCTION: 'in_production', // W trakcie produkcji (kierownik oznaczył)
  COMPLETED: 'completed', // Wyprodukowane (kierownik oznaczył)
} as const;

export type CompletionStatus = typeof COMPLETION_STATUS[keyof typeof COMPLETION_STATUS];

/** Completion status colors */
export const COMPLETION_STATUS_COLORS: Record<CompletionStatus, string> = {
  [COMPLETION_STATUS.INCOMPLETE]: 'bg-red-100 text-red-800 border-red-200',
  [COMPLETION_STATUS.READY]: 'bg-green-100 text-green-800 border-green-200',
  [COMPLETION_STATUS.IN_PRODUCTION]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [COMPLETION_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
};

/** Completion status labels (Polish) */
export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  [COMPLETION_STATUS.INCOMPLETE]: 'Kompletacja',
  [COMPLETION_STATUS.READY]: 'Gotowe do produkcji',
  [COMPLETION_STATUS.IN_PRODUCTION]: 'W produkcji',
  [COMPLETION_STATUS.COMPLETED]: 'Wyprodukowane',
};
