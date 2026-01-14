/**
 * Kalkulator bel i metrów
 * Odpowiada za przeliczanie ilości bel i reszty na końcowe wartości
 */

import type { BeamCalculationResult } from './types.js';

// Stałe z specyfikacji
export const BEAM_LENGTH_MM = 6000;
export const REST_ROUNDING_MM = 500;

/**
 * Klasa do obliczania bel i metrów
 */
export class BeamCalculator {
  /**
   * Przelicza bele i resztę według specyfikacji
   * - zaokrąglić resztę w górę do wielokrotności 500mm
   * - jeśli reszta > 0 → od nowych bel odjąć 1
   * - reszta2 = 6000mm - zaokrąglona reszta → na metry
   *
   * @param originalBeams - Oryginalna liczba bel
   * @param restMm - Reszta w milimetrach
   * @returns Obiekt z przeliczoną liczbą bel i metrami
   */
  calculate(originalBeams: number, restMm: number): BeamCalculationResult {
    // Walidacja inputów
    if (!Number.isFinite(originalBeams) || !Number.isFinite(restMm)) {
      throw new Error('Wartości muszą być liczbami skończonymi');
    }

    if (originalBeams < 0) {
      throw new Error('Liczba bel nie może być ujemna');
    }

    if (restMm < 0) {
      throw new Error('Reszta nie może być ujemna');
    }

    if (restMm > BEAM_LENGTH_MM) {
      throw new Error(`Reszta (${restMm}mm) nie może być większa niż długość beli (${BEAM_LENGTH_MM}mm)`);
    }

    if (restMm === 0) {
      return { beams: originalBeams, meters: 0 };
    }

    // Sprawdź czy można odjąć belę
    if (originalBeams < 1) {
      throw new Error('Brak bel do odjęcia (oryginalna liczba < 1, ale reszta > 0)');
    }

    // Zaokrąglij resztę w górę do wielokrotności 500mm
    const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

    // Odjąć 1 belę
    const beams = originalBeams - 1;

    // reszta2 = 6000 - roundedRest
    const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

    // Walidacja wyniku (ochrona przed błędami obliczeniowymi)
    if (reszta2Mm < 0) {
      console.warn(`Negative reszta2Mm: ${reszta2Mm}, roundedRest: ${roundedRest}`);
      return { beams, meters: 0 }; // Bezpieczny fallback
    }

    const meters = reszta2Mm / 1000;

    return { beams, meters };
  }

  /**
   * Oblicza tylko liczbę bel
   */
  calculateBeams(originalBeams: number, restMm: number): number {
    const result = this.calculate(originalBeams, restMm);
    return result.beams;
  }

  /**
   * Oblicza tylko metry
   */
  calculateMeters(originalBeams: number, restMm: number): number {
    const result = this.calculate(originalBeams, restMm);
    return result.meters;
  }

  /**
   * Zaokrągla resztę w górę do wielokrotności 500mm
   */
  roundRest(restMm: number): number {
    if (restMm < 0) {
      throw new Error('Reszta nie może być ujemna');
    }
    return Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;
  }
}

// Eksport instancji singletona dla wygody
export const beamCalculator = new BeamCalculator();

// Eksport funkcji pomocniczych dla prostszego użycia
export function calculateBeamsAndMeters(originalBeams: number, restMm: number): BeamCalculationResult {
  return beamCalculator.calculate(originalBeams, restMm);
}
