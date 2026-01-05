/**
 * Order Status State Machine
 *
 * Defines valid status transitions to prevent illegal state changes.
 * Ensures orders follow proper lifecycle: new → in_progress → completed → archived
 *
 * CRITICAL: This prevents edge cases like:
 * - completed → new (regression)
 * - archived → in_progress (reviving old orders)
 * - deleted → completed (impossible state)
 *
 * Usage:
 * ```typescript
 * import { validateStatusTransition } from './utils/order-status-machine.js';
 *
 * // Before updating status
 * validateStatusTransition(currentStatus, newStatus); // throws ValidationError if invalid
 * ```
 */

import { ValidationError } from './errors.js';

/**
 * Valid order statuses
 */
export const ORDER_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

/**
 * State machine definition
 *
 * Maps current status → allowed next statuses
 *
 * Lifecycle:
 * - new: can move to in_progress or archived (cancel before production)
 * - in_progress: can move to completed or archived (cancel during production)
 * - completed: can only move to archived (finish lifecycle)
 * - archived: TERMINAL STATE - no transitions allowed
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUSES.NEW]: [ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.ARCHIVED],
  [ORDER_STATUSES.IN_PROGRESS]: [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.ARCHIVED],
  [ORDER_STATUSES.COMPLETED]: [ORDER_STATUSES.ARCHIVED],
  [ORDER_STATUSES.ARCHIVED]: [], // Terminal state - no transitions allowed
};

/**
 * Validate status transition
 *
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @throws ValidationError if transition is not allowed
 * @returns true if transition is valid
 *
 * @example
 * ```typescript
 * // Valid transition
 * validateStatusTransition('new', 'in_progress'); // returns true
 *
 * // Invalid transition
 * validateStatusTransition('completed', 'new'); // throws ValidationError
 * ```
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  // Allow same status (no-op)
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if current status is known
  if (!(currentStatus in VALID_TRANSITIONS)) {
    throw new ValidationError(
      `Nieprawidłowy status początkowy: "${currentStatus}". ` +
      `Dozwolone statusy: ${Object.values(ORDER_STATUSES).join(', ')}`
    );
  }

  // Check if new status is known
  const allStatuses = Object.values(ORDER_STATUSES);
  if (!allStatuses.includes(newStatus as OrderStatus)) {
    throw new ValidationError(
      `Nieprawidłowy status docelowy: "${newStatus}". ` +
      `Dozwolone statusy: ${allStatuses.join(', ')}`
    );
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(
      `Niedozwolona zmiana statusu: "${currentStatus}" → "${newStatus}". ` +
      `Dozwolone przejścia z "${currentStatus}": ${
        allowedTransitions.length > 0
          ? allowedTransitions.join(', ')
          : 'brak (stan końcowy)'
      }`
    );
  }

  return true;
}

/**
 * Get allowed transitions for a status
 *
 * @param status - Current order status
 * @returns Array of allowed next statuses
 *
 * @example
 * ```typescript
 * getAllowedTransitions('new'); // ['in_progress', 'archived']
 * getAllowedTransitions('archived'); // []
 * ```
 */
export function getAllowedTransitions(status: string): string[] {
  if (!(status in VALID_TRANSITIONS)) {
    throw new ValidationError(
      `Nieprawidłowy status: "${status}". ` +
      `Dozwolone statusy: ${Object.values(ORDER_STATUSES).join(', ')}`
    );
  }

  return VALID_TRANSITIONS[status];
}

/**
 * Check if status is terminal (no further transitions allowed)
 *
 * @param status - Order status to check
 * @returns true if status is terminal
 *
 * @example
 * ```typescript
 * isTerminalStatus('archived'); // true
 * isTerminalStatus('completed'); // false
 * ```
 */
export function isTerminalStatus(status: string): boolean {
  return status === ORDER_STATUSES.ARCHIVED;
}

/**
 * Check if transition is valid without throwing
 *
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * canTransition('new', 'in_progress'); // true
 * canTransition('completed', 'new'); // false
 * ```
 */
export function canTransition(currentStatus: string, newStatus: string): boolean {
  try {
    validateStatusTransition(currentStatus, newStatus);
    return true;
  } catch {
    return false;
  }
}
