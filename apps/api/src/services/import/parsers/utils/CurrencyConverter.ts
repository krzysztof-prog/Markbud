/**
 * Currency Converter
 *
 * Konwersja walut EUR/PLN dla importu zamowien Schuco.
 * Parsowanie formatow walut specyficznych dla Schuco.
 * Normalizacja kwot.
 *
 * WAZNE: Wszystkie kwoty powinny byc przechowywane w groszach/centach (integer)
 * aby uniknac problemow z precyzja zmiennoprzecinkowa.
 */

import { z } from 'zod';

/**
 * Schema walidacji kwoty EUR z formatu Schuco
 */
export const schucoEurAmountSchema = z
  .string()
  .transform((val) => {
    const result = parseSchucoEurAmount(val);
    if (result === null) {
      throw new Error(`Nieprawidlowy format kwoty EUR: "${val}"`);
    }
    return result;
  });

/**
 * Rezultat konwersji waluty
 */
export interface CurrencyConversionResult {
  originalValue: string;
  parsedValue: number;
  valueInCents: number;
  currency: 'EUR' | 'PLN';
}

/**
 * Parsuje kwote EUR z formatu Schuco
 * Konwertuje "62,30 EUR" na 62.30
 * Konwertuje "2 321,02 EUR" na 2321.02
 *
 * @param amountStr - String z kwota w formacie Schuco
 * @returns Sparsowana kwota jako liczba lub null przy bledzie
 */
export function parseSchucoEurAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  try {
    // Usun symbol waluty i spacje
    let cleaned = amountStr.replace(/€/g, '').replace(/EUR/gi, '').trim();

    // Usun separator tysiecy (spacja)
    cleaned = cleaned.replace(/\s/g, '');

    // Zamien przecinek na kropke jako separator dziesietny
    cleaned = cleaned.replace(/,/g, '.');

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch {
    return null;
  }
}

/**
 * Parsuje kwote PLN z typowych formatow polskich
 * Konwertuje "1 234,56 zl" na 1234.56
 * Konwertuje "1234,56 PLN" na 1234.56
 *
 * @param amountStr - String z kwota
 * @returns Sparsowana kwota jako liczba lub null przy bledzie
 */
export function parsePlnAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  try {
    // Usun symbol waluty i spacje
    let cleaned = amountStr
      .replace(/zł/gi, '')
      .replace(/PLN/gi, '')
      .replace(/zl/gi, '')
      .trim();

    // Usun separator tysiecy (spacja lub kropka)
    // Uwaga: w formacie polskim kropka moze byc separatorem tysiecy
    // a przecinek separatorem dziesietnym

    // Jesli jest przecinek, to jest separator dziesietny
    if (cleaned.includes(',')) {
      // Usun wszystkie spacje i kropki (separatory tysiecy)
      cleaned = cleaned.replace(/[\s.]/g, '');
      // Zamien przecinek na kropke
      cleaned = cleaned.replace(/,/g, '.');
    } else {
      // Brak przecinka - usun wszystkie spacje
      cleaned = cleaned.replace(/\s/g, '');
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch {
    return null;
  }
}

/**
 * Klasa konwertera walut
 */
export class CurrencyConverter {
  /**
   * Parsuje kwote EUR z formatu Schuco
   *
   * @param amountStr - String z kwota
   * @returns Sparsowana kwota lub null
   */
  parseEurFromSchuco(amountStr: string): number | null {
    return parseSchucoEurAmount(amountStr);
  }

  /**
   * Parsuje kwote PLN
   *
   * @param amountStr - String z kwota
   * @returns Sparsowana kwota lub null
   */
  parsePln(amountStr: string): number | null {
    return parsePlnAmount(amountStr);
  }

  /**
   * Konwertuje kwote na centy/grosze (integer)
   * ZAWSZE uzywaj tej metody przed zapisem do bazy danych!
   *
   * @param amount - Kwota jako liczba zmiennoprzecinkowa
   * @returns Kwota w centach/groszach jako integer
   */
  toCents(amount: number): number {
    // Mnozenie przez 100 i zaokraglenie do najblizszej liczby calkowitej
    // Math.round() zapobiega problemom z precyzja (np. 10.01 * 100 = 1000.9999999999999)
    return Math.round(amount * 100);
  }

  /**
   * Konwertuje centy/grosze na kwote (float)
   *
   * @param cents - Kwota w centach/groszach
   * @returns Kwota jako liczba zmiennoprzecinkowa
   */
  fromCents(cents: number): number {
    return cents / 100;
  }

  /**
   * Parsuje i konwertuje kwote EUR Schuco na centy
   *
   * @param amountStr - String z kwota
   * @returns Kwota w centach lub null
   */
  parseEurToCents(amountStr: string): number | null {
    const amount = this.parseEurFromSchuco(amountStr);
    if (amount === null) return null;
    return this.toCents(amount);
  }

  /**
   * Parsuje i konwertuje kwote PLN na grosze
   *
   * @param amountStr - String z kwota
   * @returns Kwota w groszach lub null
   */
  parsePlnToGrosze(amountStr: string): number | null {
    const amount = this.parsePln(amountStr);
    if (amount === null) return null;
    return this.toCents(amount);
  }

  /**
   * Formatuje kwote EUR do wyswietlenia
   *
   * @param amountCents - Kwota w centach
   * @returns Sformatowany string (np. "1 234,56 EUR")
   */
  formatEur(amountCents: number): string {
    const amount = this.fromCents(amountCents);
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Formatuje kwote PLN do wyswietlenia
   *
   * @param amountGrosze - Kwota w groszach
   * @returns Sformatowany string (np. "1 234,56 zl")
   */
  formatPln(amountGrosze: number): string {
    const amount = this.fromCents(amountGrosze);
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Wykrywa walute z tekstu
   *
   * @param text - Tekst do analizy
   * @returns Wykryta waluta lub null
   */
  detectCurrency(text: string): 'EUR' | 'PLN' | null {
    const lower = text.toLowerCase();

    if (lower.includes('eur') || lower.includes('€')) {
      return 'EUR';
    }

    if (lower.includes('pln') || lower.includes('zł') || lower.includes('zl')) {
      return 'PLN';
    }

    return null;
  }

  /**
   * Parsuje kwote automatycznie wykrywajac walute
   *
   * @param amountStr - String z kwota
   * @returns Rezultat konwersji lub null
   */
  parseAuto(amountStr: string): CurrencyConversionResult | null {
    const currency = this.detectCurrency(amountStr);

    if (currency === 'EUR') {
      const parsedValue = this.parseEurFromSchuco(amountStr);
      if (parsedValue === null) return null;
      return {
        originalValue: amountStr,
        parsedValue,
        valueInCents: this.toCents(parsedValue),
        currency: 'EUR',
      };
    }

    if (currency === 'PLN') {
      const parsedValue = this.parsePln(amountStr);
      if (parsedValue === null) return null;
      return {
        originalValue: amountStr,
        parsedValue,
        valueInCents: this.toCents(parsedValue),
        currency: 'PLN',
      };
    }

    // Sprobuj sparsowac jako liczbe bez waluty
    const numericStr = amountStr.replace(/[^\d,.-]/g, '').replace(/,/g, '.');
    const parsedValue = parseFloat(numericStr);

    if (!isNaN(parsedValue)) {
      return {
        originalValue: amountStr,
        parsedValue,
        valueInCents: this.toCents(parsedValue),
        currency: 'EUR', // Domyslnie EUR dla Schuco
      };
    }

    return null;
  }
}

// Export singleton instance dla wygody
export const currencyConverter = new CurrencyConverter();
