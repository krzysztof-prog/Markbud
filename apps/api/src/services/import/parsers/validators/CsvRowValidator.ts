/**
 * CSV Row Validator
 *
 * Walidacja wierszy CSV dla importu "uzyte bele".
 * Zawiera logike sprawdzania wymaganych pol, formatow danych
 * oraz generowania komunikatow bledow.
 */

import { z } from 'zod';

/**
 * Schema walidacji numeru artykulu Schuco
 * Format: 8 cyfr + opcjonalny suffix "p" (np. 19016000, 19016000p)
 */
export const articleNumberSchema = z
  .string()
  .regex(/^\d{8}p?$/i, 'Numer artykulu musi miec 8 cyfr (+ opcjonalne "p")');

/**
 * Schema walidacji numeru zlecenia
 * Format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")
 */
export const orderNumberSchema = z
  .string()
  .min(1, 'Numer zlecenia nie moze byc pusty')
  .max(20, 'Numer zlecenia zbyt dlugi (max 20 znakow)')
  .regex(
    /^(\d+)(?:[-\s]?([a-zA-Z0-9]{1,3}))?$/,
    'Nieprawidlowy format numeru zlecenia. Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")'
  );

/**
 * Schema wiersza CSV dla requirements
 */
export const requirementRowSchema = z.object({
  orderNumber: z.string(),
  articleNumber: articleNumberSchema,
  beamsCount: z.number().int().min(0, 'Liczba bel nie moze byc ujemna'),
  restMm: z.number().int().min(0, 'Reszta nie moze byc ujemna').max(6000, 'Reszta nie moze przekraczac 6000mm'),
});

/**
 * Schema wiersza CSV dla okien
 */
export const windowRowSchema = z.object({
  lp: z.number().int().positive('Numer porzadkowy musi byc dodatni'),
  width: z.number().int().positive('Szerokosc musi byc dodatnia'),
  height: z.number().int().positive('Wysokosc musi byc dodatnia'),
  profileType: z.string(),
  quantity: z.number().int().positive('Ilosc musi byc dodatnia').default(1),
  reference: z.string().optional(),
});

/**
 * Rezultat walidacji wiersza
 */
export interface RowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Klasa walidatora wierszy CSV
 */
export class CsvRowValidator {
  /**
   * Waliduje czy wiersz zawiera dane o requirement (uzyte bele)
   * Wiersz jest uznawany za requirement jesli:
   * - Ma przynajmniej 4 kolumny
   * - Pierwsza kolumna to numer zlecenia lub pusta (kontynuacja)
   * - Druga kolumna to numer artykulu (8 cyfr + opcjonalne "p")
   */
  isRequirementRow(parts: string[]): boolean {
    if (parts.length < 4) return false;

    const articleNumber = parts[1]?.trim();
    if (!articleNumber) return false;

    // Sprawdz czy to numer artykulu Schuco (8 cyfr + opcjonalne "p")
    return /^\d{8}p?$/i.test(articleNumber);
  }

  /**
   * Waliduje czy wiersz zawiera dane o oknie
   * Wiersz jest uznawany za okno jesli:
   * - Ma przynajmniej 5 kolumn
   * - Pierwsza kolumna to liczba porzadkowa (tylko cyfry)
   */
  isWindowRow(parts: string[]): boolean {
    if (parts.length < 5) return false;

    const lp = parts[0]?.trim();
    return /^\d+$/.test(lp);
  }

  /**
   * Waliduje wiersz requirement i zwraca rezultat
   */
  validateRequirementRow(parts: string[]): RowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (parts.length < 4) {
      errors.push('Wiersz requirement musi miec przynajmniej 4 kolumny');
      return { isValid: false, errors, warnings };
    }

    const articleNumber = parts[1]?.trim();
    const beamsCount = parseInt(parts[2], 10);
    const restMm = parseInt(parts[3], 10);

    // Walidacja numeru artykulu
    const articleResult = articleNumberSchema.safeParse(articleNumber);
    if (!articleResult.success) {
      // To moze byc artykul stalowy (np. 202620) - skip z ostrzezeniem
      warnings.push(`Pominiety artykul nie-Schuco: ${articleNumber}`);
      return { isValid: false, errors, warnings };
    }

    // Walidacja liczby bel
    if (isNaN(beamsCount)) {
      errors.push(`Nieprawidlowa liczba bel: "${parts[2]}"`);
    } else if (beamsCount < 0) {
      errors.push('Liczba bel nie moze byc ujemna');
    }

    // Walidacja reszty
    if (isNaN(restMm)) {
      errors.push(`Nieprawidlowa reszta: "${parts[3]}"`);
    } else if (restMm < 0) {
      errors.push('Reszta nie moze byc ujemna');
    } else if (restMm > 6000) {
      errors.push(`Reszta (${restMm}mm) nie moze byc wieksza niz dlugosc beli (6000mm)`);
    }

    // Sprawdzenie czy reszta wymaga odjecia beli
    if (restMm > 0 && beamsCount < 1) {
      errors.push('Brak bel do odjecia (liczba bel < 1, ale reszta > 0)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Waliduje wiersz okna i zwraca rezultat
   */
  validateWindowRow(parts: string[]): RowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (parts.length < 5) {
      errors.push('Wiersz okna musi miec przynajmniej 5 kolumn');
      return { isValid: false, errors, warnings };
    }

    const lp = parseInt(parts[0], 10);
    const width = parseInt(parts[1], 10);
    const height = parseInt(parts[2], 10);
    const quantity = parseInt(parts[4], 10);

    if (isNaN(lp) || lp <= 0) {
      errors.push(`Nieprawidlowy numer porzadkowy: "${parts[0]}"`);
    }

    if (isNaN(width) || width <= 0) {
      errors.push(`Nieprawidlowa szerokosc: "${parts[1]}"`);
    }

    if (isNaN(height) || height <= 0) {
      errors.push(`Nieprawidlowa wysokosc: "${parts[2]}"`);
    }

    if (isNaN(quantity) || quantity <= 0) {
      // Domyslnie 1 jesli nie podano
      warnings.push('Brak ilosci - przyjeto 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Waliduje czy linia to naglowek sekcji requirements
   */
  isRequirementsHeader(parts: string[]): boolean {
    const firstCol = parts[0]?.toLowerCase() || '';
    return firstCol.includes('zlec') || firstCol.includes('numer');
  }

  /**
   * Waliduje czy linia to naglowek sekcji okien
   */
  isWindowsHeader(parts: string[]): boolean {
    const firstCol = parts[0]?.toLowerCase() || '';
    const secondCol = parts[1]?.toLowerCase() || '';
    return firstCol.includes('lp') || secondCol.includes('szerok');
  }

  /**
   * Waliduje czy linia oznacza poczatek sekcji okien/drzwi
   */
  isWindowsSectionStart(lineLower: string): boolean {
    return lineLower.includes('lista okien') || lineLower.includes('lista drzwi');
  }

  /**
   * Waliduje czy linia zawiera podsumowanie (laczna liczba)
   */
  isSummaryLine(lineLower: string): boolean {
    return lineLower.includes('laczna liczba') || lineLower.includes('łączna liczba');
  }
}

// Export singleton instance dla wygody
export const csvRowValidator = new CsvRowValidator();
