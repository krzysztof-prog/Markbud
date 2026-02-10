/**
 * BeamCalculator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  BeamCalculator,
  calculateBeamsAndMeters,
  BEAM_LENGTH_MM,
  REST_ROUNDING_MM,
} from './BeamCalculator.js';

describe('BeamCalculator', () => {
  let calculator: BeamCalculator;

  beforeEach(() => {
    calculator = new BeamCalculator();
  });

  describe('calculate', () => {
    it('should return original beams when rest is 0', () => {
      const result = calculator.calculate(10, 0);

      expect(result).toEqual({
        beams: 10,
        meters: 0,
      });
    });

    it('should NOT subtract beam when rest < 1000mm (rounds to 0)', () => {
      // Rest: 300mm -> rounds DOWN to 0mm -> NO beam subtraction
      // Beams: 10 (bez zmian)
      // Meters: 0
      const result = calculator.calculate(10, 300);

      expect(result).toEqual({
        beams: 10,
        meters: 0,
      });
    });

    it('should NOT subtract beam when rest = 500mm (rounds to 0)', () => {
      // Rest: 500mm -> rounds DOWN to 0mm -> NO beam subtraction
      // Beams: 10 (bez zmian)
      // Meters: 0
      const result = calculator.calculate(10, 500);

      expect(result).toEqual({
        beams: 10,
        meters: 0,
      });
    });

    it('should NOT subtract beam when rest = 999mm (rounds to 0)', () => {
      // Rest: 999mm -> rounds DOWN to 0mm -> NO beam subtraction
      // Beams: 10 (bez zmian)
      // Meters: 0
      const result = calculator.calculate(10, 999);

      expect(result).toEqual({
        beams: 10,
        meters: 0,
      });
    });

    it('should subtract beam when rest = 1000mm', () => {
      // Rest: 1000mm -> rounds to 1000mm -> subtract 1 beam
      // Beams: 10 - 1 = 9
      // Meters: (6000 - 1000) / 1000 = 5.0
      const result = calculator.calculate(10, 1000);

      expect(result).toEqual({
        beams: 9,
        meters: 5.0,
      });
    });

    it('should handle rest exactly at 6000mm', () => {
      // Rest: 6000mm -> beam length
      // Beams: 5 - 1 = 4
      // Meters: (6000 - 6000) / 1000 = 0
      const result = calculator.calculate(5, 6000);

      expect(result).toEqual({
        beams: 4,
        meters: 0,
      });
    });

    it('should throw error for negative beams', () => {
      expect(() => calculator.calculate(-1, 100)).toThrow('Liczba bel nie może być ujemna');
    });

    it('should throw error for negative rest', () => {
      expect(() => calculator.calculate(10, -100)).toThrow('Reszta nie może być ujemna');
    });

    it('should throw error when rest > beam length', () => {
      expect(() => calculator.calculate(10, 7000)).toThrow(
        'Reszta (7000mm) nie może być większa niż długość beli (6000mm)'
      );
    });

    it('should NOT throw error when beams = 0 and rest < 1000mm (roundedRest = 0)', () => {
      // roundedRest = 0 -> brak odejmowania beli -> OK
      const result = calculator.calculate(0, 100);
      expect(result).toEqual({ beams: 0, meters: 0 });
    });

    it('should throw error when beams < 1 but roundedRest > 0', () => {
      // roundedRest = 1000mm -> trzeba odjąć belę, ale nie ma bel
      expect(() => calculator.calculate(0, 1000)).toThrow('Brak bel do odjęcia');
    });

    it('should throw error for non-finite values', () => {
      expect(() => calculator.calculate(NaN, 100)).toThrow(
        'Wartości muszą być liczbami skończonymi'
      );
      expect(() => calculator.calculate(10, NaN)).toThrow(
        'Wartości muszą być liczbami skończonymi'
      );
      expect(() => calculator.calculate(Infinity, 100)).toThrow(
        'Wartości muszą być liczbami skończonymi'
      );
    });
  });

  describe('calculateBeams', () => {
    it('should NOT subtract beam when rest < 1000mm', () => {
      const beams = calculator.calculateBeams(10, 300);

      expect(beams).toBe(10); // roundedRest = 0 -> brak odejmowania
    });

    it('should subtract beam when rest >= 1000mm', () => {
      const beams = calculator.calculateBeams(10, 1500);

      expect(beams).toBe(9); // roundedRest = 1000mm -> odjęcie 1 beli
    });
  });

  describe('calculateMeters', () => {
    it('should return 0 meters when rest < 1000mm', () => {
      const meters = calculator.calculateMeters(10, 300);

      expect(meters).toBe(0); // roundedRest = 0 -> brak odejmowania beli, meters = 0
    });

    it('should return meters when rest >= 1000mm', () => {
      const meters = calculator.calculateMeters(10, 1500);

      expect(meters).toBe(5.0); // roundedRest = 1000mm -> (6000-1000)/1000 = 5.0m
    });
  });

  describe('roundRest', () => {
    it('should round rest DOWN to 1000mm multiple', () => {
      expect(calculator.roundRest(0)).toBe(0);
      expect(calculator.roundRest(1)).toBe(0);
      expect(calculator.roundRest(300)).toBe(0);
      expect(calculator.roundRest(500)).toBe(0);
      expect(calculator.roundRest(999)).toBe(0);
      expect(calculator.roundRest(1000)).toBe(1000);
      expect(calculator.roundRest(1001)).toBe(1000);
      expect(calculator.roundRest(1500)).toBe(1000);
      expect(calculator.roundRest(1999)).toBe(1000);
      expect(calculator.roundRest(2000)).toBe(2000);
    });

    it('should throw error for negative rest', () => {
      expect(() => calculator.roundRest(-1)).toThrow('Reszta nie może być ujemna');
    });
  });

  describe('constants', () => {
    it('should have correct beam length', () => {
      expect(BEAM_LENGTH_MM).toBe(6000);
    });

    it('should have correct rounding value', () => {
      expect(REST_ROUNDING_MM).toBe(1000);
    });
  });

  describe('calculateBeamsAndMeters helper function', () => {
    it('should NOT subtract beam when rest < 1000mm', () => {
      const result = calculateBeamsAndMeters(10, 300);

      expect(result).toEqual({
        beams: 10, // bez zmian - roundedRest = 0
        meters: 0,
      });
    });

    it('should subtract beam when rest >= 1000mm', () => {
      const result = calculateBeamsAndMeters(10, 1500);

      expect(result).toEqual({
        beams: 9,
        meters: 5.0,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle minimum rest (no beam subtraction)', () => {
      const result = calculator.calculate(1, 1);
      expect(result.beams).toBe(1); // bez zmian - roundedRest = 0
      expect(result.meters).toBe(0);
    });

    it('should handle large beam counts with small rest', () => {
      const result = calculator.calculate(1000, 300);
      expect(result.beams).toBe(1000); // bez zmian - roundedRest = 0
      expect(result.meters).toBe(0);
    });

    it('should handle rest at rounding boundaries (round DOWN)', () => {
      // rest < 1000mm -> roundedRest = 0 -> NO beam subtraction, meters = 0
      expect(calculator.calculate(10, 500).beams).toBe(10);
      expect(calculator.calculate(10, 500).meters).toBe(0);
      expect(calculator.calculate(10, 999).beams).toBe(10);
      expect(calculator.calculate(10, 999).meters).toBe(0);

      // rest >= 1000mm -> subtract beam, calculate meters
      expect(calculator.calculate(10, 1000).beams).toBe(9);
      expect(calculator.calculate(10, 1000).meters).toBe(5.0); // 6000 - 1000 = 5000mm = 5.0m
      expect(calculator.calculate(10, 1500).beams).toBe(9);
      expect(calculator.calculate(10, 1500).meters).toBe(5.0); // rounds to 1000mm -> 5.0m
      expect(calculator.calculate(10, 2000).beams).toBe(9);
      expect(calculator.calculate(10, 2000).meters).toBe(4.0); // 6000 - 2000 = 4000mm = 4.0m
    });
  });
});
