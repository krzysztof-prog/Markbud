/**
 * ProjectNumberParser - Parsowanie numerów projektów z treści maila
 *
 * Funkcjonalności:
 * 1. Wykrywanie daty dostawy z tekstu ("na DD.MM" lub "na DD/MM")
 * 2. Ekstrakcja numerów projektów (format: litera + 3-5 cyfr, np. D3455, C7814)
 * 3. Usuwanie duplikatów
 */

export interface ParsedMailContent {
  /** Wykryta data dostawy (jeśli znaleziono) */
  suggestedDate: Date | null;
  /** Surowy tekst daty (np. "22.01") */
  rawDateText: string | null;
  /** Lista unikalnych numerów projektów */
  projects: string[];
  /** Oryginalna treść maila */
  rawInput: string;
}

export interface ProjectParseResult {
  /** Numer projektu (np. "D3455") */
  projectNumber: string;
  /** Pozycja w oryginalnym tekście */
  position: number;
}

/**
 * Regex do wykrywania daty dostawy
 * Obsługiwane formaty:
 * - "na 22.01" lub "na 22/01"
 * - "na 22.1" lub "na 22/1"
 * - z rokiem: "na 22.01.2026" lub "na 22/01/2026"
 */
const DATE_PATTERNS = [
  // "na DD.MM" lub "na DD/MM" (z opcjonalnym rokiem)
  /\bna\s+(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/gi,
  // "do DD.MM" lub "do DD/MM"
  /\bdo\s+(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/gi,
  // "dostawa DD.MM"
  /\bdostaw[ay]?\s+(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/gi,
];

/**
 * Regex do wykrywania numerów projektów
 * Format: litera + 3-5 cyfr (np. D3455, C7814, A12345)
 * Granice słowa (\b) zapewniają że nie złapiemy części innych słów
 */
const PROJECT_NUMBER_REGEX = /\b([A-Z]\d{3,5})\b/g;

/**
 * Parsuje datę z dopasowania regex
 */
function parseDateFromMatch(
  match: RegExpExecArray,
  currentYear: number
): { date: Date; rawText: string } | null {
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = currentYear;

  // Jeśli podano rok
  if (match[3]) {
    year = parseInt(match[3], 10);
    // Obsłuż format 2-cyfrowy (np. 26 → 2026)
    if (year < 100) {
      year += 2000;
    }
  }

  // Walidacja
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  // Miesiące w JS są 0-indexed
  const date = new Date(year, month - 1, day);

  // Sprawdź czy data jest poprawna (np. 31.02 → niepoprawna)
  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null;
  }

  const rawText = match[3]
    ? `${match[1]}.${match[2]}.${match[3]}`
    : `${match[1]}.${match[2]}`;

  return { date, rawText };
}

/**
 * Wykrywa datę dostawy z treści maila
 */
export function extractDeliveryDate(
  text: string,
  currentYear: number = new Date().getFullYear()
): { date: Date | null; rawText: string | null } {
  for (const pattern of DATE_PATTERNS) {
    // Reset regex (bo używamy 'g' flag)
    pattern.lastIndex = 0;

    const match = pattern.exec(text);
    if (match) {
      const result = parseDateFromMatch(match, currentYear);
      if (result) {
        return { date: result.date, rawText: result.rawText };
      }
    }
  }

  return { date: null, rawText: null };
}

/**
 * Ekstraktuje numery projektów z treści maila
 */
export function extractProjectNumbers(text: string): ProjectParseResult[] {
  const results: ProjectParseResult[] = [];
  const seen = new Set<string>();

  // Reset regex
  PROJECT_NUMBER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PROJECT_NUMBER_REGEX.exec(text)) !== null) {
    const projectNumber = match[1].toUpperCase();

    // Pomijaj duplikaty
    if (!seen.has(projectNumber)) {
      seen.add(projectNumber);
      results.push({
        projectNumber,
        position: match.index,
      });
    }
  }

  return results;
}

/**
 * Główna funkcja parsująca treść maila
 */
export function parseMailContent(rawInput: string): ParsedMailContent {
  const { date, rawText } = extractDeliveryDate(rawInput);
  const projectResults = extractProjectNumbers(rawInput);

  return {
    suggestedDate: date,
    rawDateText: rawText,
    projects: projectResults.map((r) => r.projectNumber),
    rawInput,
  };
}

/**
 * Waliduje czy string jest poprawnym numerem projektu
 */
export function isValidProjectNumber(value: string): boolean {
  // Musi być litera + 3-5 cyfr
  return /^[A-Z]\d{3,5}$/i.test(value);
}

/**
 * Normalizuje numer projektu (uppercase)
 */
export function normalizeProjectNumber(value: string): string {
  return value.toUpperCase().trim();
}
