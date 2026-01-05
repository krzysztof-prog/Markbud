/**
 * Completion status helpers
 * Funkcje pomocnicze do określania statusu kompletacji zlecenia
 */

import type { Order } from '@/types';
import { COMPLETION_STATUS, type CompletionStatus } from './constants';

/**
 * Informacje o statusie kompletacji
 */
export interface CompletionStatusInfo {
  status: CompletionStatus;
  label: string;
  color: string;
  missingMaterials?: string[]; // Lista brakujących materiałów (tylko dla status INCOMPLETE)
}

/**
 * Sprawdza status kompletacji zlecenia
 *
 * Logika:
 * 1. Jeśli status = 'completed' → COMPLETED (Wyprodukowane)
 * 2. Jeśli status = 'in_progress' → IN_PRODUCTION (W produkcji)
 * 3. Jeśli brak requirements lub brak materiałów → INCOMPLETE (Kompletacja)
 * 4. Jeśli wszystkie materiały dostępne → READY (Gotowe do produkcji)
 *
 * @param order - Zlecenie do sprawdzenia
 * @returns Status kompletacji
 */
export function getOrderCompletionStatus(order: Order): CompletionStatus {
  // Wyprodukowane
  if (order.status === 'completed') {
    return COMPLETION_STATUS.COMPLETED;
  }

  // W produkcji
  if (order.status === 'in_progress') {
    return COMPLETION_STATUS.IN_PRODUCTION;
  }

  // Sprawdzenie materiałów (uproszczone - w przyszłości można rozszerzyć o faktyczne zapotrzebowanie)
  // Na razie zakładamy, że wszystkie zlecenia są gotowe do produkcji
  // TODO: Zintegrować z warehouse stock check

  return COMPLETION_STATUS.READY;
}

/**
 * Pobiera szczegółowe informacje o statusie kompletacji
 *
 * @param order - Zlecenie do sprawdzenia
 * @param requirements - Opcjonalne zapotrzebowanie (do sprawdzenia dostępności materiałów)
 * @returns Pełne informacje o statusie kompletacji
 */
export function getCompletionStatusInfo(
  order: Order,
  requirements?: Array<{ profileId: number; colorId: number; quantity: number }>
): CompletionStatusInfo {
  const status = getOrderCompletionStatus(order);

  // Import labels and colors
  const { COMPLETION_STATUS_LABELS, COMPLETION_STATUS_COLORS } = require('./constants');

  const result: CompletionStatusInfo = {
    status,
    label: COMPLETION_STATUS_LABELS[status],
    color: COMPLETION_STATUS_COLORS[status],
  };

  // Jeśli status to INCOMPLETE, sprawdzamy brakujące materiały
  if (status === COMPLETION_STATUS.INCOMPLETE && requirements) {
    // TODO: Zaimplementować faktyczne sprawdzanie dostępności w magazynie
    // Na razie zwracamy przykładowe dane
    result.missingMaterials = requirements.map(
      (req) => `Profil ID: ${req.profileId}, Kolor ID: ${req.colorId}, Brak: ${req.quantity}mb`
    );
  }

  return result;
}

/**
 * Filtruje zlecenia według statusu kompletacji
 *
 * @param orders - Lista zleceń
 * @param targetStatus - Status kompletacji do filtrowania
 * @returns Zlecenia z danym statusem
 */
export function filterOrdersByCompletionStatus(
  orders: Order[],
  targetStatus: CompletionStatus
): Order[] {
  return orders.filter(order => getOrderCompletionStatus(order) === targetStatus);
}
