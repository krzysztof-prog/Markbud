/**
 * Parser numerów zleceń
 * Odpowiada za parsowanie i walidację numerów zleceń
 */

import type { ParsedOrderNumber } from './types.js';

/**
 * Klasa do parsowania numerów zleceń
 */
export class OrderNumberParser {
  /**
   * Parsuje numer zlecenia i wyciąga numer bazowy oraz sufiks
   * Przykłady:
   * - "54222" → { base: "54222", suffix: null }
   * - "54222-a" → { base: "54222", suffix: "a" }
   * - "54222a" → { base: "54222", suffix: "a" }
   * - "54222-abc" → { base: "54222", suffix: "abc" }
   * - "54222 xxx" → { base: "54222", suffix: "xxx" }
   * - "54222 a" → { base: "54222", suffix: "a" }
   */
  parse(orderNumber: string): ParsedOrderNumber {
    // Walidacja podstawowa
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error('Numer zlecenia nie może być pusty');
    }

    // Usuń trailing dash (np. "51737-" → "51737") - traktuj jak numer bez sufiksu
    const trimmed = orderNumber.trim().replace(/-$/, '');

    // Limit długości
    if (trimmed.length > 20) {
      throw new Error('Numer zlecenia zbyt długi (max 20 znaków)');
    }

    // Wzorce
    // Wzorzec 1: cyfry + separator (myślnik/spacja) + 1-3 znaki alfanumeryczne
    const matchWithSeparator = trimmed.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
    // Wzorzec 2: cyfry + 1-3 litery BEZ separatora (dla formatu "54222a")
    const matchWithoutSeparator = trimmed.match(/^(\d+)([a-zA-Z]{1,3})$/);
    // Wzorzec 3: same cyfry
    const matchPlain = trimmed.match(/^(\d+)$/);

    if (matchWithSeparator) {
      const [, base, suffix] = matchWithSeparator;
      return { base, suffix, full: trimmed };
    }

    if (matchWithoutSeparator) {
      const [, base, suffix] = matchWithoutSeparator;
      return { base, suffix, full: trimmed };
    }

    if (matchPlain) {
      const [, base] = matchPlain;
      return { base, suffix: null, full: trimmed };
    }

    // Nieprawidłowy format - rzuć błąd zamiast fallback
    throw new Error(
      `Nieprawidłowy format numeru zlecenia: "${trimmed}". ` +
      `Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")`
    );
  }

  /**
   * Sprawdza czy numer zlecenia ma sufiks
   */
  hasSuffix(orderNumber: string): boolean {
    try {
      const parsed = this.parse(orderNumber);
      return parsed.suffix !== null;
    } catch {
      return false;
    }
  }

  /**
   * Wyciąga bazowy numer zlecenia (bez sufiksu)
   */
  getBase(orderNumber: string): string {
    const parsed = this.parse(orderNumber);
    return parsed.base;
  }

  /**
   * Wyciąga sufiks z numeru zlecenia (lub null jeśli brak)
   */
  getSuffix(orderNumber: string): string | null {
    const parsed = this.parse(orderNumber);
    return parsed.suffix;
  }
}

// Eksport instancji singletona dla wygody
export const orderNumberParser = new OrderNumberParser();

// Eksport funkcji pomocniczych dla prostszego użycia
export function parseOrderNumber(orderNumber: string): ParsedOrderNumber {
  return orderNumberParser.parse(orderNumber);
}
