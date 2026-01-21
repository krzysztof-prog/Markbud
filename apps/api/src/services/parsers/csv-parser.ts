/**
 * CsvParser - wrapper dla wstecznej kompatybilności
 *
 * Ten plik został zrefaktorowany. Cała logika została przeniesiona do wyspecjalizowanych modułów:
 * - types.ts - interfejsy i typy
 * - OrderNumberParser.ts - parsowanie numerów zleceń
 * - ArticleNumberParser.ts - parsowanie numerów artykułów
 * - BeamCalculator.ts - obliczenia bel i metrów
 * - UzyteBeleParser.ts - parsowanie plików "użyte bele"
 *
 * Ta klasa zachowuje wsteczną kompatybilność poprzez delegowanie do nowych modułów.
 */

import { OrderNumberParser } from './OrderNumberParser.js';
import { ArticleNumberParser } from './ArticleNumberParser.js';
import { BeamCalculator } from './BeamCalculator.js';
import { UzyteBeleParser } from './UzyteBeleParser.js';
import type { ParsedUzyteBele, ParseResult, ParsedOrderNumber, ParsedArticleNumber, BeamCalculationResult } from './types.js';

// Re-eksport typów dla wstecznej kompatybilności
export type { ParseError, ParseResult, ParsedUzyteBele } from './types.js';

/**
 * CsvParser - główna klasa parsera CSV
 * Deleguje do wyspecjalizowanych modułów dla lepszej organizacji kodu
 */
export class CsvParser {
  private orderNumberParser: OrderNumberParser;
  private articleNumberParser: ArticleNumberParser;
  private beamCalculator: BeamCalculator;
  private uzyteBeleParser: UzyteBeleParser;

  constructor() {
    this.orderNumberParser = new OrderNumberParser();
    this.articleNumberParser = new ArticleNumberParser();
    this.beamCalculator = new BeamCalculator();
    this.uzyteBeleParser = new UzyteBeleParser();
  }

  /**
   * Parse EUR amount from Schuco format
   * Deleguje do UzyteBeleParser
   */
  parseEurAmountFromSchuco(amountStr: string): number | null {
    return this.uzyteBeleParser.parseEurAmountFromSchuco(amountStr);
  }

  /**
   * Parsuje numer zlecenia i wyciąga numer bazowy oraz sufiks
   * Deleguje do OrderNumberParser
   */
  parseOrderNumber(orderNumber: string): ParsedOrderNumber {
    return this.orderNumberParser.parse(orderNumber);
  }

  /**
   * Parsuje numer artykułu na numer profilu i kod koloru
   * Deleguje do ArticleNumberParser
   */
  parseArticleNumber(articleNumber: string): ParsedArticleNumber {
    return this.articleNumberParser.parse(articleNumber);
  }

  /**
   * Przelicza bele i resztę według specyfikacji
   * Deleguje do BeamCalculator
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): BeamCalculationResult {
    return this.beamCalculator.calculate(originalBeams, restMm);
  }

  /**
   * Podgląd pliku "użyte bele" przed importem
   * Deleguje do UzyteBeleParser
   */
  async previewUzyteBele(filepath: string): Promise<ParsedUzyteBele> {
    return this.uzyteBeleParser.previewUzyteBele(filepath);
  }

  /**
   * Podgląd pliku "użyte bele" z raportowaniem błędów walidacji
   * Deleguje do UzyteBeleParser
   */
  async previewUzyteBeleWithErrors(filepath: string): Promise<ParseResult<ParsedUzyteBele>> {
    return this.uzyteBeleParser.previewUzyteBeleWithErrors(filepath);
  }

  /**
   * Przetwórz plik "użyte bele" i zapisz do bazy
   * Deleguje do UzyteBeleParser
   * @param options - Opcjonalne parametry: isPrivateImport - czy to import prywatny
   */
  async processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean,
    options?: { isPrivateImport?: boolean }
  ): Promise<{ orderId: number; requirementsCount: number; windowsCount: number; glassesCount: number }> {
    return this.uzyteBeleParser.processUzyteBele(filepath, action, replaceBase, options);
  }
}
