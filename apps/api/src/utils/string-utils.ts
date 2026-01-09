/**
 * String utilities for file parsing
 */

/**
 * Usuwa UTF-8 BOM (Byte Order Mark) z początku stringa.
 * Pliki eksportowane z Excela często mają BOM na początku,
 * co może powodować problemy z parsowaniem CSV.
 *
 * UTF-8 BOM: EF BB BF (jako string: \uFEFF)
 *
 * @param content - String do przetworzenia
 * @returns String bez BOM
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * Sprawdza czy string zaczyna się od UTF-8 BOM
 *
 * @param content - String do sprawdzenia
 * @returns true jeśli string zaczyna się od BOM
 */
export function hasBOM(content: string): boolean {
  return content.charCodeAt(0) === 0xFEFF;
}
