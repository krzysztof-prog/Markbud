/**
 * Eksporty modułów parserów CSV
 * Centralny punkt dostępu do wszystkich parserów
 */

// Typy i interfejsy
export type {
  UzyteBeleRow,
  UzyteBeleWindow,
  UzyteBeleGlass,
  ParseError,
  ParseResult,
  ParsedUzyteBele,
  ParsedOrderNumber,
  ParsedArticleNumber,
  BeamCalculationResult,
} from './types.js';

// Parser numerów zleceń
export {
  OrderNumberParser,
  orderNumberParser,
  parseOrderNumber,
} from './OrderNumberParser.js';

// Parser numerów artykułów
export {
  ArticleNumberParser,
  articleNumberParser,
  parseArticleNumber,
} from './ArticleNumberParser.js';

// Kalkulator bel
export {
  BeamCalculator,
  beamCalculator,
  calculateBeamsAndMeters,
  BEAM_LENGTH_MM,
  REST_ROUNDING_MM,
} from './BeamCalculator.js';

// Parser plików "użyte bele"
export {
  UzyteBeleParser,
  uzyteBeleParser,
} from './UzyteBeleParser.js';

// Dla wstecznej kompatybilności - eksportuj CsvParser z csv-parser.ts
export { CsvParser } from './csv-parser.js';
