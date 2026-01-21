/**
 * Typy i interfejsy używane przez parsery CSV
 * Wydzielone z csv-parser.ts dla lepszej organizacji kodu
 */

// Interfejs wiersza z pliku "użyte bele" - reprezentuje jeden wiersz danych surowych
export interface UzyteBeleRow {
  numZlec: string;
  numArt: string;
  nowychBel: number;
  reszta: number;
}

// Interfejs okna z pliku "użyte bele"
export interface UzyteBeleWindow {
  lp: number;
  szer: number;
  wys: number;
  typProfilu: string;
  ilosc: number;
  referencja: string;
}

// Interfejs szyby z pliku "użyte bele"
export interface UzyteBeleGlass {
  lp: number;           // Lp. z pliku CSV
  position: number;     // Pozycja (odpowiada Lp. z listy okien)
  widthMm: number;      // Szerokość w mm
  heightMm: number;     // Wysokość w mm
  quantity: number;     // Ilość sztuk
  packageType: string;  // Typ pakietu np. "4/18/4/18/4S3 Ug=0.5"
  areaSqm: number;      // Obliczona powierzchnia w m²
}

// Kategoria pozycji materiałówki
export type MaterialCategory = 'okno' | 'montaz' | 'dodatki' | 'inne';

// Interfejs pozycji materiałówki z pliku "użyte bele"
export interface UzytebeleMaterial {
  position: number;             // Numer pozycji
  category: MaterialCategory;   // Kategoria pozycji
  glazing: number;              // Szklenia w groszach
  fittings: number;             // Okucia w groszach
  parts: number;                // Części w groszach
  glassQuantity: number;        // Ilość szkła
  material: number;             // Materiał w groszach
  assemblyValueBeforeDiscount: number;  // Wartość netto montażu przed rabatem w groszach
  assemblyValueAfterDiscount: number;   // Wartość netto montażu po rabacie w groszach
  netValue: number;             // Wartość netto w groszach
  totalNet: number;             // Suma netto w groszach
  quantity: number;             // Sztuk
  coefficient: number | null;   // Współczynnik
  unit: number | null;          // Jednostka
}

/**
 * Informacja o błędzie parsowania
 */
export interface ParseError {
  row: number;
  field?: string;
  reason: string;
  rawData: any;
}

/**
 * Wynik parsowania z informacjami o błędach
 */
export interface ParseResult<T> {
  data: T;
  errors: ParseError[];
  summary: {
    totalRows: number;
    successRows: number;
    failedRows: number;
    skippedRows: number;
  };
}

/**
 * Sparsowane dane z pliku "użyte bele"
 */
export interface ParsedUzyteBele {
  orderNumber: string;
  orderNumberParsed?: {
    base: string;
    suffix: string | null;
    full: string;
  };
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
  documentAuthor?: string; // Autor dokumentu z CSV
  requirements: Array<{
    articleNumber: string;
    profileNumber: string;
    colorCode: string;
    originalBeams: number;
    originalRest: number;
    calculatedBeams: number;
    calculatedMeters: number;
  }>;
  windows: UzyteBeleWindow[];
  glasses: UzyteBeleGlass[];
  materials: UzytebeleMaterial[]; // Pozycje materiałówki
  totals: {
    windows: number;
    sashes: number;
    glasses: number;
  };
  conflict?: {
    baseOrderExists: boolean;
    baseOrderId?: number;
    baseOrderNumber?: string;
  };
}

/**
 * Sparsowany numer zlecenia
 */
export interface ParsedOrderNumber {
  base: string;
  suffix: string | null;
  full: string;
}

/**
 * Sparsowany numer artykułu
 */
export interface ParsedArticleNumber {
  profileNumber: string;
  colorCode: string;
}

/**
 * Wynik obliczenia bel i metrów
 */
export interface BeamCalculationResult {
  beams: number;
  meters: number;
}
