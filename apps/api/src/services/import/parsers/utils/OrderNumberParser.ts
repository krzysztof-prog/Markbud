/**
 * Order Number Parser
 *
 * Parsowanie numerow zlecen z obsluga wariantow (sufiksow A, B, C).
 * Walidacja formatu i ekstrakcja bazy oraz sufiksu.
 */

import { z } from 'zod';
import type { OrderNumberParsed } from '../types.js';

/**
 * Schema walidacji numeru zlecenia
 * Wspierane formaty:
 * - "54222" - samo cyfry
 * - "54222-a" - cyfry + separator (myslnik) + sufiks 1-3 znakow
 * - "54222a" - cyfry + sufiks literowy bez separatora
 * - "54222 xxx" - cyfry + spacja + sufiks
 */
export const orderNumberValidationSchema = z
  .string()
  .min(1, 'Numer zlecenia nie moze byc pusty')
  .max(20, 'Numer zlecenia zbyt dlugi (max 20 znakow)')
  .trim();

/**
 * Wynik walidacji numeru zlecenia
 */
export interface OrderNumberValidationResult {
  isValid: boolean;
  error?: string;
  parsed?: OrderNumberParsed;
}

/**
 * Klasa parsera numerow zlecen
 */
export class OrderNumberParser {
  /**
   * Parsuje numer zlecenia na skladowe: baza i sufiks
   *
   * Przyklady:
   * - "54222" -> { base: "54222", suffix: null }
   * - "54222-a" -> { base: "54222", suffix: "a" }
   * - "54222a" -> { base: "54222", suffix: "a" }
   * - "54222-abc" -> { base: "54222", suffix: "abc" }
   * - "54222 xxx" -> { base: "54222", suffix: "xxx" }
   *
   * @param orderNumber - Numer zlecenia do sparsowania
   * @returns Sparsowany numer zlecenia
   * @throws Error gdy format jest nieprawidlowy
   */
  parse(orderNumber: string): OrderNumberParsed {
    // Podstawowa walidacja
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error('Numer zlecenia nie moze byc pusty');
    }

    const trimmed = orderNumber.trim();

    // Limit dlugosci
    if (trimmed.length > 20) {
      throw new Error('Numer zlecenia zbyt dlugi (max 20 znakow)');
    }

    // Wzorzec 1: cyfry + separator (myslnik/spacja) + 1-3 znakow alfanumerycznych
    const matchWithSeparator = trimmed.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);

    // Wzorzec 2: cyfry + 1-3 litery BEZ separatora (format "54222a")
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

    // Nieprawidlowy format - rzuc blad
    throw new Error(
      `Nieprawidlowy format numeru zlecenia: "${trimmed}". ` +
      `Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")`
    );
  }

  /**
   * Waliduje numer zlecenia i zwraca rezultat (bez rzucania wyjatku)
   *
   * @param orderNumber - Numer zlecenia do walidacji
   * @returns Rezultat walidacji
   */
  validate(orderNumber: string): OrderNumberValidationResult {
    try {
      const parsed = this.parse(orderNumber);
      return { isValid: true, parsed };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Nieznany blad',
      };
    }
  }

  /**
   * Sprawdza czy numer zlecenia zawiera sufiks (wariant)
   *
   * @param orderNumber - Numer zlecenia
   * @returns true jesli numer ma sufiks
   */
  hasVariant(orderNumber: string): boolean {
    try {
      const parsed = this.parse(orderNumber);
      return parsed.suffix !== null;
    } catch {
      return false;
    }
  }

  /**
   * Pobiera bazowy numer zlecenia (bez sufiksu)
   *
   * @param orderNumber - Numer zlecenia
   * @returns Bazowy numer zlecenia
   */
  getBase(orderNumber: string): string {
    const parsed = this.parse(orderNumber);
    return parsed.base;
  }

  /**
   * Pobiera sufiks numeru zlecenia (lub null)
   *
   * @param orderNumber - Numer zlecenia
   * @returns Sufiks lub null
   */
  getSuffix(orderNumber: string): string | null {
    const parsed = this.parse(orderNumber);
    return parsed.suffix;
  }

  /**
   * Normalizuje numer zlecenia do standardowego formatu
   * (z myslnikiem jako separatorem jesli jest sufiks)
   *
   * @param orderNumber - Numer zlecenia
   * @returns Znormalizowany numer zlecenia
   */
  normalize(orderNumber: string): string {
    const parsed = this.parse(orderNumber);
    if (parsed.suffix) {
      return `${parsed.base}-${parsed.suffix.toLowerCase()}`;
    }
    return parsed.base;
  }

  /**
   * Porownuje dwa numery zlecen
   * Zwraca true jesli oba numery maja ta sama baze
   *
   * @param orderNumber1 - Pierwszy numer zlecenia
   * @param orderNumber2 - Drugi numer zlecenia
   * @returns true jesli bazy sa identyczne
   */
  compareBase(orderNumber1: string, orderNumber2: string): boolean {
    try {
      const parsed1 = this.parse(orderNumber1);
      const parsed2 = this.parse(orderNumber2);
      return parsed1.base === parsed2.base;
    } catch {
      return false;
    }
  }

  /**
   * Sprawdza czy dany numer pasuje do wzorca wyszukiwania
   * Wspiera wyszukiwanie po bazie lub pelnym numerze
   *
   * @param orderNumber - Numer zlecenia
   * @param searchPattern - Wzorzec wyszukiwania
   * @returns true jesli numer pasuje
   */
  matches(orderNumber: string, searchPattern: string): boolean {
    try {
      const parsed = this.parse(orderNumber);
      const pattern = searchPattern.toLowerCase().trim();

      // Dopasowanie po bazie
      if (parsed.base.includes(pattern)) {
        return true;
      }

      // Dopasowanie po pelnym numerze
      if (parsed.full.toLowerCase().includes(pattern)) {
        return true;
      }

      return false;
    } catch {
      // Jesli nie mozna sparsowac, sprawdz prosty match
      return orderNumber.toLowerCase().includes(searchPattern.toLowerCase());
    }
  }
}

// Export singleton instance dla wygody
export const orderNumberParser = new OrderNumberParser();
