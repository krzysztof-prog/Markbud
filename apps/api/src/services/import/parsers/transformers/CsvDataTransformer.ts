/**
 * CSV Data Transformer
 *
 * Transformacja wierszy CSV na modele domenowe.
 * Zawiera logike mapowania pol i normalizacji danych.
 */

import type { ParsedRequirement, ParsedWindow } from '../types.js';
import { BEAM_LENGTH_MM, REST_ROUNDING_MM } from '../types.js';

/**
 * Rezultat parsowania numeru artykulu
 */
export interface ArticleNumberParsed {
  profileNumber: string;
  colorCode: string;
}

/**
 * Surowe dane wiersza requirement z CSV
 */
export interface RawRequirementRow {
  orderNumber: string;
  articleNumber: string;
  beamsCount: number;
  restMm: number;
}

/**
 * Surowe dane wiersza okna z CSV
 */
export interface RawWindowRow {
  lp: number;
  width: number;
  height: number;
  profileType: string;
  quantity: number;
  reference: string;
}

/**
 * Metadane zlecenia z CSV
 */
export interface OrderMetadata {
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
}

/**
 * Klasa transformatora danych CSV
 */
export class CsvDataTransformer {
  /**
   * Parsuje numer artykulu na numer profilu i kod koloru
   * Format: X-profil-kolor, np. 19016050 -> 9016 = profil, 050 = kolor
   * Wspiera opcjonalny suffix "p" (np. 19016000p)
   *
   * @param articleNumber - Numer artykulu do sparsowania
   * @returns Obiekt z numerem profilu i kodem koloru
   * @throws Error gdy numer artykulu jest nieprawidlowy
   */
  parseArticleNumber(articleNumber: string): ArticleNumberParsed {
    if (!articleNumber || articleNumber.length < 4) {
      throw new Error(`Nieprawidlowy numer artykulu: "${articleNumber}"`);
    }

    // Usun suffix "p" jesli istnieje (np. "19016000p" -> "19016000")
    const cleanedNumber = articleNumber.replace(/p$/i, '');

    // Usun pierwszy znak (nie ma znaczenia)
    const withoutPrefix = cleanedNumber.substring(1);

    // Ostatnie 3 znaki to kod koloru
    const colorCode = withoutPrefix.slice(-3);

    // Reszta to numer profilu
    const profileNumber = withoutPrefix.slice(0, -3);

    return { profileNumber, colorCode };
  }

  /**
   * Oblicza liczbe bel i metrow wedlug specyfikacji:
   * - Zaokraglij reszte w gore do wielokrotnosci 500mm
   * - Jesli reszta > 0, odejmij 1 od liczby bel
   * - reszta2 = 6000mm - zaokraglona reszta -> na metry
   *
   * @param originalBeams - Oryginalna liczba bel
   * @param restMm - Reszta w milimetrach
   * @returns Obiekt z obliczona liczba bel i metrow
   * @throws Error gdy dane wejsciowe sa nieprawidlowe
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
    // Walidacja danych wejsciowych
    if (!Number.isFinite(originalBeams) || !Number.isFinite(restMm)) {
      throw new Error('Wartosci musza byc liczbami skonczonym');
    }

    if (originalBeams < 0) {
      throw new Error('Liczba bel nie moze byc ujemna');
    }

    if (restMm < 0) {
      throw new Error('Reszta nie moze byc ujemna');
    }

    if (restMm > BEAM_LENGTH_MM) {
      throw new Error(`Reszta (${restMm}mm) nie moze byc wieksza niz dlugosc beli (${BEAM_LENGTH_MM}mm)`);
    }

    if (restMm === 0) {
      return { beams: originalBeams, meters: 0 };
    }

    // Sprawdz czy mozna odjac bele
    if (originalBeams < 1) {
      throw new Error('Brak bel do odjecia (oryginalna liczba < 1, ale reszta > 0)');
    }

    // Zaokraglij reszte w gore do wielokrotnosci 500mm
    const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

    // Odejmij 1 bele
    const beams = originalBeams - 1;

    // reszta2 = 6000 - zaokraglona reszta
    const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

    // Walidacja wyniku (ochrona przed bledami obliczen)
    if (reszta2Mm < 0) {
      return { beams, meters: 0 }; // Bezpieczny fallback
    }

    const meters = reszta2Mm / 1000;

    return { beams, meters };
  }

  /**
   * Transformuje surowy wiersz CSV na obiekt ParsedRequirement
   *
   * @param row - Surowe dane wiersza
   * @returns Sparsowany requirement
   */
  transformRequirementRow(row: RawRequirementRow): ParsedRequirement {
    const { profileNumber, colorCode } = this.parseArticleNumber(row.articleNumber);
    const { beams, meters } = this.calculateBeamsAndMeters(row.beamsCount, row.restMm);

    return {
      articleNumber: row.articleNumber,
      profileNumber,
      colorCode,
      originalBeams: row.beamsCount,
      originalRest: row.restMm,
      calculatedBeams: beams,
      calculatedMeters: meters,
    };
  }

  /**
   * Transformuje surowy wiersz CSV na obiekt ParsedWindow
   *
   * @param row - Surowe dane wiersza
   * @returns Sparsowane okno
   */
  transformWindowRow(row: RawWindowRow): ParsedWindow {
    return {
      lp: row.lp,
      szer: row.width,
      wys: row.height,
      typProfilu: row.profileType,
      ilosc: row.quantity || 1,
      referencja: row.reference || '',
    };
  }

  /**
   * Parsuje tablice czesci wiersza CSV na surowe dane requirement
   *
   * @param parts - Tablica czesci wiersza (split po ';')
   * @returns Surowe dane wiersza lub null jesli nie mozna sparsowac
   */
  parseRequirementParts(parts: string[]): RawRequirementRow | null {
    if (parts.length < 4) return null;

    const orderNumber = parts[0]?.trim() || '';
    const articleNumber = parts[1]?.trim() || '';
    const beamsCount = parseInt(parts[2], 10);
    const restMm = parseInt(parts[3], 10);

    if (!articleNumber || isNaN(beamsCount) || isNaN(restMm)) {
      return null;
    }

    return { orderNumber, articleNumber, beamsCount, restMm };
  }

  /**
   * Parsuje tablice czesci wiersza CSV na surowe dane okna
   *
   * @param parts - Tablica czesci wiersza (split po ';')
   * @returns Surowe dane wiersza lub null jesli nie mozna sparsowac
   */
  parseWindowParts(parts: string[]): RawWindowRow | null {
    if (parts.length < 5) return null;

    const lp = parseInt(parts[0], 10);
    const width = parseInt(parts[1], 10);
    const height = parseInt(parts[2], 10);
    const profileType = parts[3]?.trim() || '';
    const quantity = parseInt(parts[4], 10);
    const reference = parts[5]?.trim() || '';

    if (isNaN(lp) || isNaN(width) || isNaN(height)) {
      return null;
    }

    return {
      lp,
      width,
      height,
      profileType,
      quantity: isNaN(quantity) ? 1 : quantity,
      reference,
    };
  }

  /**
   * Parsuje metadane zlecenia z linii CSV
   *
   * @param lineLower - Linia CSV w lowercase
   * @param line - Oryginalna linia CSV
   * @returns Metadane lub null jesli linia nie zawiera metadanych
   */
  parseMetadataLine(lineLower: string, line: string): Partial<OrderMetadata> | null {
    const metadata: Partial<OrderMetadata> = {};

    if (lineLower.includes('klient:')) {
      const match = line.match(/klient:\s*([^;]+)/i);
      if (match) metadata.client = match[1].trim();
    }

    if (lineLower.includes('projekt:')) {
      const match = line.match(/projekt:\s*([^;]+)/i);
      if (match) metadata.project = match[1].trim();
    }

    if (lineLower.includes('system:')) {
      const match = line.match(/system:\s*([^;]+)/i);
      if (match) metadata.system = match[1].trim();
    }

    if (lineLower.includes('termin') && lineLower.includes('realizacji')) {
      const match = line.match(/termin.*realizacji:\s*([^;]+)/i);
      if (match) metadata.deadline = match[1].trim();
    }

    if (lineLower.includes('dostawa') && lineLower.includes('pvc')) {
      const match = line.match(/dostawa\s+pvc:\s*([^;]+)/i);
      if (match) metadata.pvcDeliveryDate = match[1].trim();
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  /**
   * Parsuje wartosc podsumowania z linii CSV
   *
   * @param lineLower - Linia CSV w lowercase
   * @param parts - Tablica czesci wiersza
   * @returns Obiekt z typem i wartoscia lub null
   */
  parseSummaryLine(lineLower: string, parts: string[]): { type: 'windows' | 'sashes' | 'glasses'; value: number } | null {
    if (!lineLower.includes('laczna liczba') && !lineLower.includes('łączna liczba')) {
      return null;
    }

    const value = parseInt(parts[1], 10) || 0;

    if (lineLower.includes('okien') || lineLower.includes('drzwi')) {
      return { type: 'windows', value };
    }

    if (lineLower.includes('skrzyd')) {
      return { type: 'sashes', value };
    }

    if (lineLower.includes('szyb')) {
      return { type: 'glasses', value };
    }

    return null;
  }

  /**
   * Automatycznie uzupelnia projekt i system z danych okien
   *
   * @param windows - Tablica sparsowanych okien
   * @param currentProject - Aktualny projekt (moze byc pusty)
   * @param currentSystem - Aktualny system (moze byc pusty)
   * @returns Obiekt z uzupelnionym projektem i systemem
   */
  autoFillFromWindows(
    windows: ParsedWindow[],
    currentProject?: string,
    currentSystem?: string
  ): { project?: string; system?: string } {
    let project = currentProject;
    let system = currentSystem;

    if ((!project || project.trim() === '') && windows.length > 0) {
      // Pobierz unikalne referencje z okien
      const references = [...new Set(windows.map(w => w.referencja).filter(Boolean))];
      if (references.length > 0) {
        project = references.join(', ');
      }
    }

    if ((!system || system.trim() === '') && windows.length > 0) {
      // Pobierz unikalne typy profili z okien
      const profileTypes = [...new Set(windows.map(w => w.typProfilu).filter(Boolean))];
      if (profileTypes.length > 0) {
        system = profileTypes.join(', ');
      }
    }

    return { project, system };
  }
}

// Export singleton instance dla wygody
export const csvDataTransformer = new CsvDataTransformer();
