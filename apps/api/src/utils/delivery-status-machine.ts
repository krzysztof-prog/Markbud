/**
 * Delivery Status State Machine
 *
 * Defines valid status transitions to prevent illegal state changes.
 * Ensures deliveries follow proper lifecycle: planned → in_progress → completed
 *
 * CRITICAL: This prevents edge cases like:
 * - completed → planned (regression)
 * - completed → in_progress (reopening finished delivery)
 * - arbitrary status jumps
 *
 * Usage:
 * ```typescript
 * import { validateDeliveryStatusTransition } from './utils/delivery-status-machine.js';
 *
 * // Before updating status
 * validateDeliveryStatusTransition(currentStatus, newStatus); // throws ValidationError if invalid
 * ```
 */

import { ValidationError } from './errors.js';
import { logger } from './logger.js';

/**
 * Valid delivery statuses
 */
export const DELIVERY_STATUSES = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[keyof typeof DELIVERY_STATUSES];

/**
 * State machine definition
 *
 * Maps current status → allowed next statuses
 *
 * Lifecycle:
 * - planned: can move to in_progress (start loading/processing)
 * - in_progress: can move to completed OR back to planned (cancel loading)
 * - completed: TERMINAL STATE - no transitions allowed (delivery done)
 *
 * Diagram:
 * ```
 * planned ──────► in_progress ──────► completed
 *    ◄────────────────┘
 *   (można cofnąć tylko z in_progress)
 * ```
 */
const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DELIVERY_STATUSES.PLANNED]: [DELIVERY_STATUSES.IN_PROGRESS],
  [DELIVERY_STATUSES.IN_PROGRESS]: [DELIVERY_STATUSES.PLANNED, DELIVERY_STATUSES.COMPLETED],
  [DELIVERY_STATUSES.COMPLETED]: [], // Terminal state - no transitions allowed
};

/**
 * Polish labels for delivery statuses
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DELIVERY_STATUSES.PLANNED]: 'Zaplanowana',
  [DELIVERY_STATUSES.IN_PROGRESS]: 'W trakcie',
  [DELIVERY_STATUSES.COMPLETED]: 'Zrealizowana',
};

/**
 * Validate delivery status transition
 *
 * @param currentStatus - Current delivery status
 * @param newStatus - Desired new status
 * @throws ValidationError if transition is not allowed
 * @returns true if transition is valid
 *
 * @example
 * ```typescript
 * // Valid transition
 * validateDeliveryStatusTransition('planned', 'in_progress'); // returns true
 *
 * // Invalid transition
 * validateDeliveryStatusTransition('completed', 'planned'); // throws ValidationError
 * ```
 */
export function validateDeliveryStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  // Allow same status (no-op)
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if current status is known
  const allStatuses = Object.values(DELIVERY_STATUSES);
  if (!allStatuses.includes(currentStatus as DeliveryStatus)) {
    throw new ValidationError(
      `Nieprawidłowy status początkowy dostawy: "${currentStatus}". ` +
        `Dozwolone statusy: ${allStatuses.join(', ')}`
    );
  }

  // Check if new status is known
  if (!allStatuses.includes(newStatus as DeliveryStatus)) {
    throw new ValidationError(
      `Nieprawidłowy status docelowy dostawy: "${newStatus}". ` +
        `Dozwolone statusy: ${allStatuses.join(', ')}`
    );
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus as DeliveryStatus];
  if (!allowedTransitions.includes(newStatus as DeliveryStatus)) {
    const currentLabel = DELIVERY_STATUS_LABELS[currentStatus as DeliveryStatus] || currentStatus;
    const newLabel = DELIVERY_STATUS_LABELS[newStatus as DeliveryStatus] || newStatus;
    const allowedLabels = allowedTransitions.map(s => DELIVERY_STATUS_LABELS[s] || s);

    logger.warn('Invalid delivery status transition attempted', {
      currentStatus,
      newStatus,
      allowedTransitions,
    });

    throw new ValidationError(
      `Niedozwolona zmiana statusu dostawy: "${currentLabel}" → "${newLabel}". ` +
        `Dozwolone przejścia z "${currentLabel}": ${
          allowedLabels.length > 0 ? allowedLabels.join(', ') : 'brak (stan końcowy)'
        }`
    );
  }

  logger.info('Delivery status transition validated', {
    from: currentStatus,
    to: newStatus,
  });

  return true;
}

/**
 * Get allowed transitions for a delivery status
 *
 * @param status - Current delivery status
 * @returns Array of allowed next statuses
 *
 * @example
 * ```typescript
 * getAllowedDeliveryTransitions('planned'); // ['in_progress']
 * getAllowedDeliveryTransitions('completed'); // []
 * ```
 */
export function getAllowedDeliveryTransitions(status: string): DeliveryStatus[] {
  const allStatuses = Object.values(DELIVERY_STATUSES);
  if (!allStatuses.includes(status as DeliveryStatus)) {
    throw new ValidationError(
      `Nieprawidłowy status dostawy: "${status}". ` +
        `Dozwolone statusy: ${allStatuses.join(', ')}`
    );
  }

  return VALID_TRANSITIONS[status as DeliveryStatus];
}

/**
 * Check if delivery status is terminal (no further transitions allowed)
 *
 * @param status - Delivery status to check
 * @returns true if status is terminal
 *
 * @example
 * ```typescript
 * isTerminalDeliveryStatus('completed'); // true
 * isTerminalDeliveryStatus('in_progress'); // false
 * ```
 */
export function isTerminalDeliveryStatus(status: string): boolean {
  return status === DELIVERY_STATUSES.COMPLETED;
}

/**
 * Check if delivery status transition is valid without throwing
 *
 * @param currentStatus - Current delivery status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * canTransitionDelivery('planned', 'in_progress'); // true
 * canTransitionDelivery('completed', 'planned'); // false
 * ```
 */
export function canTransitionDelivery(currentStatus: string, newStatus: string): boolean {
  try {
    validateDeliveryStatusTransition(currentStatus, newStatus);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sprawdza czy wszystkie zlecenia w dostawie mają odpowiedni status
 * przed zmianą statusu dostawy na completed
 *
 * @param newDeliveryStatus - Nowy status dostawy
 * @param orderStatuses - Statusy wszystkich zleceń w dostawie
 * @throws ValidationError jeśli zlecenia nie są gotowe
 */
export function validateOrdersForDeliveryStatus(
  newDeliveryStatus: DeliveryStatus,
  orderStatuses: string[]
): void {
  // Przy completed - wszystkie zlecenia powinny być completed lub in_progress
  if (newDeliveryStatus === 'completed') {
    const invalidOrders = orderStatuses.filter(s => s === 'new' || s === 'archived');

    if (invalidOrders.length > 0) {
      throw new ValidationError(
        `Nie można oznaczyć dostawy jako zrealizowaną. ` +
          `${invalidOrders.length} zleceń ma status "Nowe" lub "Zarchiwizowane". ` +
          `Wszystkie zlecenia muszą mieć status "W produkcji" lub "Zakończone".`
      );
    }
  }
}
