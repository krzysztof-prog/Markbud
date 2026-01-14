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

    it('should calculate beams and meters with rest < 500mm', () => {
      // Rest: 300mm -> rounds up to 500mm
      // Beams: 10 - 1 = 9
      // Meters: (6000 - 500) / 1000 = 5.5
      const result = calculator.calculate(10, 300);

      expect(result).toEqual({
        beams: 9,
        meters: 5.5,
      });
    });

    it('should calculate beams and meters with rest = 500mm', () => {
      // Rest: 500mm -> already rounded
      // Beams: 10 - 1 = 9
      // Meters: (6000 - 500) / 1000 = 5.5
      const result = calculator.calculate(10, 500);

      expect(result).toEqual({
        beams: 9,
        meters: 5.5,
      });
    });

    it('should calculate beams and meters with rest > 500mm', () => {
      // Rest: 800mm -> rounds up to 1000mm
      // Beams: 10 - 1 = 9
      // Meters: (6000 - 1000) / 1000 = 5.0
      const result = calculator.calculate(10, 800);

      expect(result).toEqual({
        beams: 9,
        meters: 5.0,
      });
    });

    it('should calculate beams and meters with rest = 1000mm', () => {
      // Rest: 1000mm -> already rounded
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

    it('should throw error when beams < 1 but rest > 0', () => {
      expect(() => calculator.calculate(0, 100)).toThrow('Brak bel do odjęcia');
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
    it('should return only beams count', () => {
      const beams = calculator.calculateBeams(10, 300);

      expect(beams).toBe(9);
    });
  });

  describe('calculateMeters', () => {
    it('should return only meters', () => {
      const meters = calculator.calculateMeters(10, 300);

      expect(meters).toBe(5.5);
    });
  });

  describe('roundRest', () => {
    it('should round rest up to 500mm multiple', () => {
      expect(calculator.roundRest(0)).toBe(0);
      expect(calculator.roundRest(1)).toBe(500);
      expect(calculator.roundRest(300)).toBe(500);
      expect(calculator.roundRest(500)).toBe(500);
      expect(calculator.roundRest(501)).toBe(1000);
      expect(calculator.roundRest(1000)).toBe(1000);
      expect(calculator.roundRest(1200)).toBe(1500);
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
      expect(REST_ROUNDING_MM).toBe(500);
    });
  });

  describe('calculateBeamsAndMeters helper function', () => {
    it('should calculate beams and meters', () => {
      const result = calculateBeamsAndMeters(10, 300);

      expect(result).toEqual({
        beams: 9,
        meters: 5.5,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle minimum values', () => {
      const result = calculator.calculate(1, 1);
      expect(result.beams).toBe(0);
      expect(result.meters).toBe(5.5); // 6000 - 500 = 5500mm = 5.5m
    });

    it('should handle large beam counts', () => {
      const result = calculator.calculate(1000, 300);
      expect(result.beams).toBe(999);
      expect(result.meters).toBe(5.5);
    });

    it('should handle rest at rounding boundaries', () => {
      // Test multiples of 500mm
      expect(calculator.calculate(10, 500).meters).toBe(5.5);
      expect(calculator.calculate(10, 1000).meters).toBe(5.0);
      expect(calculator.calculate(10, 1500).meters).toBe(4.5);
      expect(calculator.calculate(10, 2000).meters).toBe(4.0);
    });
  });
});
