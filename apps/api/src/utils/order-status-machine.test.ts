import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES,
  validateStatusTransition,
  getAllowedTransitions,
  isTerminalStatus,
  canTransition,
} from './order-status-machine.js';
import { ValidationError } from './errors.js';

describe('Order Status State Machine', () => {
  describe('validateStatusTransition', () => {
    describe('Valid transitions', () => {
      it('should allow new → in_progress', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.IN_PROGRESS)
        ).toBe(true);
      });

      it('should allow new → archived', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.ARCHIVED)
        ).toBe(true);
      });

      it('should allow in_progress → completed', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.COMPLETED)
        ).toBe(true);
      });

      it('should allow in_progress → archived', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.ARCHIVED)
        ).toBe(true);
      });

      it('should allow completed → archived', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.ARCHIVED)
        ).toBe(true);
      });

      it('should allow same status (no-op)', () => {
        expect(
          validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.NEW)
        ).toBe(true);
        expect(
          validateStatusTransition(ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.IN_PROGRESS)
        ).toBe(true);
        expect(
          validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.COMPLETED)
        ).toBe(true);
        expect(
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.ARCHIVED)
        ).toBe(true);
      });
    });

    describe('Invalid transitions (Edge Cases)', () => {
      it('should prevent regression: completed → new', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.NEW)
        ).toThrow(ValidationError);
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.NEW)
        ).toThrow(/Niedozwolona zmiana statusu.*completed.*→.*new/);
      });

      it('should prevent regression: completed → in_progress', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.IN_PROGRESS)
        ).toThrow(ValidationError);
      });

      it('should prevent reviving archived: archived → new', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.NEW)
        ).toThrow(ValidationError);
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.NEW)
        ).toThrow(/Niedozwolona zmiana statusu.*archived.*→.*new/);
      });

      it('should prevent reviving archived: archived → in_progress', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.IN_PROGRESS)
        ).toThrow(ValidationError);
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.IN_PROGRESS)
        ).toThrow(/stan końcowy/);
      });

      it('should prevent reviving archived: archived → completed', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.COMPLETED)
        ).toThrow(ValidationError);
      });

      it('should prevent skipping states: new → completed', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.COMPLETED)
        ).toThrow(ValidationError);
      });
    });

    describe('Invalid statuses', () => {
      it('should reject unknown current status', () => {
        expect(() =>
          validateStatusTransition('invalid_status', ORDER_STATUSES.NEW)
        ).toThrow(ValidationError);
        expect(() =>
          validateStatusTransition('invalid_status', ORDER_STATUSES.NEW)
        ).toThrow(/Nieprawidłowy status początkowy.*invalid_status/);
      });

      it('should reject unknown new status', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.NEW, 'invalid_status')
        ).toThrow(ValidationError);
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.NEW, 'invalid_status')
        ).toThrow(/Nieprawidłowy status docelowy.*invalid_status/);
      });

      it('should reject deleted status (not in enum)', () => {
        expect(() =>
          validateStatusTransition('deleted', ORDER_STATUSES.NEW)
        ).toThrow(ValidationError);
      });

      it('should reject transition to deleted', () => {
        expect(() =>
          validateStatusTransition(ORDER_STATUSES.NEW, 'deleted')
        ).toThrow(ValidationError);
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for new', () => {
      const transitions = getAllowedTransitions(ORDER_STATUSES.NEW);
      expect(transitions).toEqual([ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.ARCHIVED]);
    });

    it('should return correct transitions for in_progress', () => {
      const transitions = getAllowedTransitions(ORDER_STATUSES.IN_PROGRESS);
      expect(transitions).toEqual([ORDER_STATUSES.COMPLETED, ORDER_STATUSES.ARCHIVED]);
    });

    it('should return correct transitions for completed', () => {
      const transitions = getAllowedTransitions(ORDER_STATUSES.COMPLETED);
      expect(transitions).toEqual([ORDER_STATUSES.ARCHIVED]);
    });

    it('should return empty array for archived (terminal state)', () => {
      const transitions = getAllowedTransitions(ORDER_STATUSES.ARCHIVED);
      expect(transitions).toEqual([]);
    });

    it('should throw for invalid status', () => {
      expect(() => getAllowedTransitions('invalid')).toThrow(ValidationError);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for archived', () => {
      expect(isTerminalStatus(ORDER_STATUSES.ARCHIVED)).toBe(true);
    });

    it('should return false for new', () => {
      expect(isTerminalStatus(ORDER_STATUSES.NEW)).toBe(false);
    });

    it('should return false for in_progress', () => {
      expect(isTerminalStatus(ORDER_STATUSES.IN_PROGRESS)).toBe(false);
    });

    it('should return false for completed', () => {
      expect(isTerminalStatus(ORDER_STATUSES.COMPLETED)).toBe(false);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(canTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.IN_PROGRESS)).toBe(true);
      expect(canTransition(ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.COMPLETED)).toBe(true);
      expect(canTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.ARCHIVED)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(canTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.NEW)).toBe(false);
      expect(canTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.IN_PROGRESS)).toBe(false);
      expect(canTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.COMPLETED)).toBe(false);
    });

    it('should return false for invalid statuses', () => {
      expect(canTransition('invalid', ORDER_STATUSES.NEW)).toBe(false);
      expect(canTransition(ORDER_STATUSES.NEW, 'invalid')).toBe(false);
    });

    it('should return true for same status', () => {
      expect(canTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.NEW)).toBe(true);
      expect(canTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.ARCHIVED)).toBe(true);
    });
  });

  describe('Edge Cases from EDGE_CASES_ANALYSIS.md', () => {
    it('should prevent Case 7.1: completed → new regression', () => {
      expect(() =>
        validateStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.NEW)
      ).toThrow(/Niedozwolona zmiana statusu/);
    });

    it('should prevent Case 7.1: archived → in_progress revival', () => {
      expect(() =>
        validateStatusTransition(ORDER_STATUSES.ARCHIVED, ORDER_STATUSES.IN_PROGRESS)
      ).toThrow(/Niedozwolona zmiana statusu/);
    });

    it('should prevent Case 7.1: deleted → completed impossible state', () => {
      // "deleted" is not a valid status in the state machine
      expect(() =>
        validateStatusTransition('deleted', ORDER_STATUSES.COMPLETED)
      ).toThrow(/Nieprawidłowy status początkowy/);
    });

    it('should allow new → archived (cancel before production)', () => {
      expect(validateStatusTransition(ORDER_STATUSES.NEW, ORDER_STATUSES.ARCHIVED)).toBe(true);
    });

    it('should allow in_progress → archived (cancel during production)', () => {
      expect(validateStatusTransition(ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.ARCHIVED)).toBe(true);
    });

    it('should prevent archived from transitioning anywhere (terminal state)', () => {
      const allowedTransitions = getAllowedTransitions(ORDER_STATUSES.ARCHIVED);
      expect(allowedTransitions).toHaveLength(0);
      expect(isTerminalStatus(ORDER_STATUSES.ARCHIVED)).toBe(true);
    });
  });
});
