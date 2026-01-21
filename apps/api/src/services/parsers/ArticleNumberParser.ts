/**
 * Parser numerów artykułów
 * Odpowiada za parsowanie numerów artykułów na numer profilu i kod koloru
 */

import type { ParsedArticleNumber } from './types.js';

/**
 * Klasa do parsowania numerów artykułów
 */
export class ArticleNumberParser {
  /**
   * Parsuje numer artykułu na numer profilu i kod koloru
   * Format: X-profil-kolor, np. 19016050 → 9016 = profil, 050 = kolor
   *
   * UWAGA: Ta metoda NIE waliduje formatu - po prostu parsuje to co dostanie.
   * Walidacja powinna być wykonana osobno za pomocą isValid().
   *
   * @param articleNumber - Numer artykułu
   * @returns Obiekt z numerem profilu i kodem koloru
   */
  parse(articleNumber: string): ParsedArticleNumber {
    // Usuń sufiks "p" jeśli istnieje (np. "19016000p" → "19016000")
    const cleanedNumber = articleNumber.replace(/p$/i, '');

    // Usuń pierwszy znak (nic nie znaczy)
    const withoutPrefix = cleanedNumber.substring(1);

    // Ostatnie 3 znaki to kod koloru
    const colorCode = withoutPrefix.slice(-3);

    // Reszta to numer profilu
    const profileNumber = withoutPrefix.slice(0, -3);

    return { profileNumber, colorCode };
  }

  /**
   * Parsuje numer artykułu z walidacją
   * Rzuca błąd jeśli format jest niepoprawny
   */
  parseStrict(articleNumber: string): ParsedArticleNumber {
    if (!articleNumber || articleNumber.trim().length === 0) {
      throw new Error('Numer artykułu nie może być pusty');
    }

    const trimmed = articleNumber.trim();

    // Sprawdź czy to wygląda jak poprawny numer artykułu (8 cyfr, opcjonalnie "p" na końcu)
    if (!trimmed.match(/^\d{8}p?$/i)) {
      throw new Error(
        `Nieprawidłowy format numeru artykułu: "${trimmed}". ` +
        `Oczekiwany format: 8 cyfr, opcjonalnie z "p" na końcu (np. "19016000" lub "19016000p")`
      );
    }

    return this.parse(trimmed);
  }

  /**
   * Wyciąga numer profilu z numeru artykułu
   */
  getProfileNumber(articleNumber: string): string {
    const parsed = this.parse(articleNumber);
    return parsed.profileNumber;
  }

  /**
   * Wyciąga kod koloru z numeru artykułu
   */
  getColorCode(articleNumber: string): string {
    const parsed = this.parse(articleNumber);
    return parsed.colorCode;
  }

  /**
   * Sprawdza czy numer artykułu jest poprawny
   */
  isValid(articleNumber: string): boolean {
    try {
      this.parse(articleNumber);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sprawdza czy numer artykułu to stal (wzmocnienie stalowe)
   * Stal rozpoznawana po prefiksie: 201xxx lub 202xxx
   */
  isSteel(articleNumber: string): boolean {
    // Usuń sufiks "p" i białe znaki
    const cleaned = articleNumber.replace(/p$/i, '').trim();

    // Stal zaczyna się od 201 lub 202
    return cleaned.startsWith('201') || cleaned.startsWith('202');
  }

  /**
   * Parsuje numer stali z numeru artykułu
   * Usuwa końcowe "00" z numeru artykułu (np. "20120200" → "201202")
   */
  parseSteelNumber(articleNumber: string): string {
    // Usuń sufiks "p" i białe znaki
    const cleaned = articleNumber.replace(/p$/i, '').trim();

    // Usuń końcowe "00" (jeśli są)
    return cleaned.replace(/00$/, '');
  }
}

// Eksport instancji singletona dla wygody
export const articleNumberParser = new ArticleNumberParser();

// Eksport funkcji pomocniczych dla prostszego użycia
export function parseArticleNumber(articleNumber: string): ParsedArticleNumber {
  return articleNumberParser.parse(articleNumber);
}
