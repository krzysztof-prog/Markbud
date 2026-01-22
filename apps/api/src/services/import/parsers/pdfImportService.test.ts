/**
 * PDF Import Service Tests
 *
 * Tests for the refactored PdfImportService.
 * These tests verify that the new implementation matches the legacy PdfParser behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfImportService } from './pdfImportService.js';

// Mock Prisma
const mockPrisma = {
  order: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
} as unknown as Parameters<typeof PdfImportService.prototype.processCenyPdf>[0];

// Mock fs
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: vi.fn(),
    },
  },
  promises: {
    readFile: vi.fn(),
  },
}));

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

// Importujemy zamockowane moduły
import fs from 'fs';
import pdf from 'pdf-parse';

describe('PdfImportService', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with prisma client', () => {
      expect(service).toBeInstanceOf(PdfImportService);
    });

    it('accepts debug option', () => {
      const debugService = new PdfImportService({ prisma: mockPrisma, debug: true });
      expect(debugService).toBeInstanceOf(PdfImportService);
    });
  });

  describe('interface compliance', () => {
    it('has previewCenyPdf method', () => {
      expect(typeof service.previewCenyPdf).toBe('function');
    });

    it('has processCenyPdf method', () => {
      expect(typeof service.processCenyPdf).toBe('function');
    });
  });
});

// ==============================================================================
// HELPER: Tworzenie mock PDF z tekstem
// ==============================================================================

function setupPdfMock(text: string): void {
  vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-pdf-data'));
  vi.mocked(pdf).mockResolvedValue({
    text,
    numpages: 1,
    numrender: 1,
    info: {},
    metadata: null,
    version: '1.0',
  });
}

// ==============================================================================
// TESTY PARSOWANIA NUMERU ZLECENIA (extractOrderNumber)
// ==============================================================================

describe('PdfImportService - extractOrderNumber', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Pattern: "SUMA: ... 5-digit"', () => {
    it('extracts order number after SUMA: keyword', async () => {
      setupPdfMock('Faktura\nSUMA: wartość 53375\nInne dane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53375');
    });

    it('handles SUMA: with multiple lines before number', async () => {
      setupPdfMock('Dokument\nSUMA:\nLinia1\nLinia2\n54222\nKoniec');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('54222');
    });

    it('extracts first 5-digit match after SUMA:', async () => {
      setupPdfMock('SUMA: 12345 67890');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('12345');
    });
  });

  describe('Pattern: "5-digit ZAMOWIENIE"', () => {
    it('extracts order number before ZAMOWIENIE keyword', async () => {
      setupPdfMock('Faktura\n53690 ZAMOWIENIE\nDane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53690');
    });

    it('handles ZAMOWIENIE case-insensitive', async () => {
      setupPdfMock('54123 zamowienie');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('54123');
    });

    it('handles ZAMOWIENIE with uppercase', async () => {
      setupPdfMock('54123 ZAMOWIENIE');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('54123');
    });
  });

  describe('Pattern: 5-cyfrowy numer na poczatku linii', () => {
    it('extracts standalone 5-digit number from early lines', async () => {
      setupPdfMock('Nagłówek\n53727\nDane faktury');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53727');
    });

    it('extracts 5-digit number with leading/trailing spaces', async () => {
      setupPdfMock('Nagłówek\n  54001  \nDane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('54001');
    });

    it('scans first 20 lines for standalone number', async () => {
      // 19 pustych linii + numer w linii 20
      const lines = Array(19).fill('').join('\n') + '\n53999\nDane';
      setupPdfMock(lines);
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53999');
    });
  });

  describe('Pattern: "5xxxx" w tekście', () => {
    it('extracts 5-digit number starting with 5', async () => {
      setupPdfMock('Faktura numer dokumentu ref. zlecenie 53456 klient');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53456');
    });

    it('extracts number with word boundaries', async () => {
      setupPdfMock('Tekst 53001 tekst');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53001');
    });

    it('prefers number starting with 5 over other patterns', async () => {
      // Ten test sprawdza że pattern 5xxxx działa
      setupPdfMock('Inne dane 12345 ale też 54321 w tekście');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('54321');
    });
  });

  describe('Brak numeru - zwraca UNKNOWN', () => {
    it('returns UNKNOWN when no 5-digit number found', async () => {
      setupPdfMock('Faktura bez numeru zlecenia');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('UNKNOWN');
    });

    it('returns UNKNOWN for 4-digit numbers only', async () => {
      setupPdfMock('Numer 1234 jest za krótki');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('UNKNOWN');
    });

    it('returns UNKNOWN for 6-digit numbers only', async () => {
      setupPdfMock('Numer 123456 jest za długi');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('UNKNOWN');
    });

    it('returns UNKNOWN for empty text', async () => {
      setupPdfMock('');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('UNKNOWN');
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA REFERENCJI (extractReference)
// ==============================================================================

describe('PdfImportService - extractReference', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Pattern: "Nr Referencyjny X1234"', () => {
    it('extracts reference after "Nr Referencyjny"', async () => {
      setupPdfMock('SUMA: 53375\nNr Referencyjny D3056\nInne dane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('D3056');
    });

    it('handles lowercase "nr referencyjny"', async () => {
      setupPdfMock('SUMA: 53375\nnr referencyjny A1234\n');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('A1234');
    });

    it('handles mixed case "Nr referencyjny"', async () => {
      setupPdfMock('SUMA: 53375\nNr referencyjny B9999\n');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('B9999');
    });
  });

  describe('Pattern: "Referencja X1234"', () => {
    it('extracts reference after "Referencja"', async () => {
      setupPdfMock('SUMA: 53375\nReferencja C5678\nDane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('C5678');
    });

    it('handles lowercase "referencja"', async () => {
      setupPdfMock('SUMA: 53375\nreferencja D1111\n');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('D1111');
    });
  });

  describe('Pattern: standalone "X1234"', () => {
    it('extracts standalone reference format', async () => {
      setupPdfMock('SUMA: 53375\nDane E2222 coś');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('E2222');
    });

    it('extracts reference with 4 digits', async () => {
      setupPdfMock('SUMA: 53375\nF1234');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('F1234');
    });
  });

  describe('Brak referencji - zwraca pusty string', () => {
    it('returns empty string when no reference found', async () => {
      setupPdfMock('SUMA: 53375\nFaktura bez referencji');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('');
    });

    it('returns empty string for numeric-only patterns', async () => {
      setupPdfMock('SUMA: 53375\n1234 5678');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('');
    });

    it('returns empty string for empty text', async () => {
      setupPdfMock('');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('');
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA WALUTY (extractCurrency)
// ==============================================================================

describe('PdfImportService - extractCurrency', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Znak € w tekście -> EUR', () => {
    it('detects EUR from € symbol', async () => {
      setupPdfMock('SUMA: 53375\nWartość: 1 234,56 €');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });

    it('detects EUR from € at beginning', async () => {
      setupPdfMock('SUMA: 53375\n€ 999,99');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });

    it('detects EUR from €100 (no space)', async () => {
      setupPdfMock('SUMA: 53375\n€100,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('Słowo "EUR" w tekście -> EUR', () => {
    it('detects EUR from "EUR" text', async () => {
      setupPdfMock('SUMA: 53375\nWartość: 1 234,56 EUR');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });

    it('detects EUR from "100 EUR"', async () => {
      setupPdfMock('SUMA: 53375\n100 EUR');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });

    it('detects EUR in middle of text', async () => {
      setupPdfMock('SUMA: 53375\nKwota EUR wynosi 500');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('Brak € i EUR -> PLN', () => {
    it('returns PLN when no EUR indicators', async () => {
      setupPdfMock('SUMA: 53375\nWartość: 1 234,56 zł');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('PLN');
    });

    it('returns PLN for text with PLN', async () => {
      setupPdfMock('SUMA: 53375\n1000 PLN');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('PLN');
    });

    it('returns PLN for plain numbers', async () => {
      setupPdfMock('SUMA: 53375\nKwota: 5000,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('PLN');
    });

    it('returns PLN for empty text', async () => {
      setupPdfMock('');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.currency).toBe('PLN');
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA KWOT (extractSumaNetto / extractSumaBrutto)
// ==============================================================================

describe('PdfImportService - extractSumaNetto', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Format: "Towar14 733,43 1 178,67\\n15 912,10"', () => {
    it('extracts netto from Towar row (PLN format)', async () => {
      setupPdfMock('SUMA: 53375\nTowar14 733,43 1 178,67\n15 912,10');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(14733.43, 2);
    });

    it('handles Towar with space separator', async () => {
      setupPdfMock('SUMA: 53375\nTowar 5 000,00 1 000,00\n6 000,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(5000, 2);
    });
  });

  describe('Format EUR: "1 399,74\\n1 138,00261,74\\n23%"', () => {
    it('extracts netto from EUR glued format', async () => {
      // Brutto: 1399,74, Netto: 1138,00, VAT: 261,74
      setupPdfMock('SUMA: 53375 EUR\n1 399,74\n1 138,00261,74\n23%');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(1138, 2);
    });

    it('handles EUR format with larger amounts', async () => {
      setupPdfMock('SUMA: 53375 EUR\n12 345,67\n10 000,002 345,67\n23%');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(10000, 2);
    });
  });

  describe('Format: "Suma 1 147,00 263,81 1 410,81"', () => {
    it('extracts netto from Suma row (EUR table format)', async () => {
      setupPdfMock('SUMA: 53375\nSuma 1 147,00 263,81 1 410,81');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(1147, 2);
    });

    it('handles Suma case-insensitive', async () => {
      setupPdfMock('SUMA: 53375\nsuma 2 500,00 575,00 3 075,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(2500, 2);
    });
  });

  describe('Format sklejony: "575,64\\n468,00107,64"', () => {
    it('extracts netto from glued values', async () => {
      // Brutto: 575,64, Netto: 468,00, VAT: 107,64
      setupPdfMock('SUMA: 53375\n575,64\n468,00107,64');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(468, 2);
    });
  });

  describe('Brak kwoty -> 0', () => {
    it('returns 0 when no amount found', async () => {
      setupPdfMock('SUMA: 53375\nFaktura bez kwot');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBe(0);
    });

    it('returns 0 for empty text', async () => {
      setupPdfMock('');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBe(0);
    });
  });
});

describe('PdfImportService - extractSumaBrutto', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Format: "Towar... brutto on next line"', () => {
    it('extracts brutto from line after Towar row', async () => {
      setupPdfMock('SUMA: 53375\nTowar14 733,43 1 178,67\n15 912,10');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueBrutto).toBeCloseTo(15912.10, 2);
    });
  });

  describe('Format EUR: brutto before glued values', () => {
    it('extracts brutto from EUR format', async () => {
      setupPdfMock('SUMA: 53375 EUR\n1 399,74\n1 138,00261,74\n23%');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueBrutto).toBeCloseTo(1399.74, 2);
    });
  });

  describe('Format: "Suma netto vat brutto"', () => {
    it('extracts brutto (third value) from Suma row', async () => {
      setupPdfMock('SUMA: 53375\nSuma 1 147,00 263,81 1 410,81');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueBrutto).toBeCloseTo(1410.81, 2);
    });
  });

  describe('Format sklejony', () => {
    it('extracts brutto (first value) from glued format', async () => {
      setupPdfMock('SUMA: 53375\n575,64\n468,00107,64');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueBrutto).toBeCloseTo(575.64, 2);
    });
  });

  describe('Brak kwoty -> 0', () => {
    it('returns 0 when no brutto found', async () => {
      setupPdfMock('SUMA: 53375\nBrak danych o kwocie brutto');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueBrutto).toBe(0);
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA WYMIAROW (extractDimensions)
// ==============================================================================

describe('PdfImportService - extractDimensions', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Format: "2690 x 1195"', () => {
    it('extracts dimensions with lowercase x', async () => {
      setupPdfMock('SUMA: 53375\nWymiary: 2690 x 1195 mm');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 2690, height: 1195 });
    });

    it('extracts dimensions with uppercase X', async () => {
      setupPdfMock('SUMA: 53375\n1500 X 1200');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 1500, height: 1200 });
    });

    it('handles dimensions without spaces', async () => {
      setupPdfMock('SUMA: 53375\n800x600');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 800, height: 600 });
    });
  });

  describe('Format: "2690×1195" (multiplication sign)', () => {
    it('extracts dimensions with × character', async () => {
      setupPdfMock('SUMA: 53375\n2000×1500');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 2000, height: 1500 });
    });

    it('handles × with spaces', async () => {
      setupPdfMock('SUMA: 53375\n1800 × 900');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 1800, height: 900 });
    });
  });

  describe('Różne formaty wymiarów', () => {
    it('handles 3-digit dimensions', async () => {
      setupPdfMock('SUMA: 53375\n500 x 400');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 500, height: 400 });
    });

    it('handles 4-digit dimensions', async () => {
      setupPdfMock('SUMA: 53375\n3000 x 2500');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toEqual({ width: 3000, height: 2500 });
    });
  });

  describe('Brak wymiarów -> undefined', () => {
    it('returns undefined when no dimensions found', async () => {
      setupPdfMock('SUMA: 53375\nBrak wymiarów');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toBeUndefined();
    });

    it('returns undefined for 2-digit numbers', async () => {
      setupPdfMock('SUMA: 53375\n50 x 40');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.dimensions).toBeUndefined();
    });

    it('matches 4 digits from 5-digit numbers', async () => {
      // Regex: /(\d{3,4})\s*[xX\u00D7]\s*(\d{3,4})/ dopasuje "0000 x 2000" z "10000 x 20000"
      setupPdfMock('SUMA: 53375\n10000 x 20000');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      // Parser dopasuje pierwsze 4 cyfry z każdej liczby
      expect(result.dimensions).toEqual({ width: 0, height: 2000 });
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA LICZNIKÓW (windows, glass)
// ==============================================================================

describe('PdfImportService - extractWindowsCount', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Pattern: "oscieznic: N"', () => {
    it('extracts windows count from "oscieznic: 5"', async () => {
      // Regex: /[oo]scie[zz]nic[:\s]+(\d+)/i
      setupPdfMock('SUMA: 53375\nLiczba oscieznic: 5\nDane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.windowsCount).toBe(5);
    });

    it('handles "oscieznic" with colon separator', async () => {
      setupPdfMock('SUMA: 53375\noscieznic: 10');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.windowsCount).toBe(10);
    });

    it('handles space separator after oscieznic', async () => {
      // Regex requires [:\s]+ after "nic"
      setupPdfMock('SUMA: 53375\noscieznic  15');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.windowsCount).toBe(15);
    });

    it('handles case-insensitive', async () => {
      setupPdfMock('SUMA: 53375\nOSCIEZNIC: 8');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.windowsCount).toBe(8);
    });
  });

  describe('Brak liczby ościeżnic -> undefined', () => {
    it('returns undefined when not found', async () => {
      setupPdfMock('SUMA: 53375\nBrak danych o oknach');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.windowsCount).toBeUndefined();
    });
  });
});

describe('PdfImportService - extractGlassCount', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Pattern: "szklen: N"', () => {
    it('extracts glass count from "szklen: 10"', async () => {
      // Regex: /szkle[nn][:\s]+(\d+)/i - matches "szklen" or "szklenn" (z podwójnym n)
      setupPdfMock('SUMA: 53375\nLiczba szklen: 10\nDane');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.glassCount).toBe(10);
    });

    it('handles space separator after szklen', async () => {
      // Regex: /szkle[nn][:\s]+(\d+)/i - [nn] = pojedyncze 'n', wymagane [:\s]+ po
      setupPdfMock('SUMA: 53375\nszklen  20');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.glassCount).toBe(20);
    });

    it('handles case-insensitive', async () => {
      setupPdfMock('SUMA: 53375\nSZKLEN: 25');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.glassCount).toBe(25);
    });
  });

  describe('Brak liczby szkleń -> undefined', () => {
    it('returns undefined when not found', async () => {
      setupPdfMock('SUMA: 53375\nBrak danych o szkle');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.glassCount).toBeUndefined();
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA WAGI (extractWeight)
// ==============================================================================

describe('PdfImportService - extractWeight', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Pattern: "waga: N"', () => {
    it('extracts weight from "waga: 123,45"', async () => {
      setupPdfMock('SUMA: 53375\nWaga: 123,45 kg');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.weight).toBeCloseTo(123.45, 2);
    });

    it('handles weight with dot separator', async () => {
      setupPdfMock('SUMA: 53375\nwaga: 100.50');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.weight).toBeCloseTo(100.50, 2);
    });

    it('handles integer weight', async () => {
      setupPdfMock('SUMA: 53375\nWaga: 500');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.weight).toBe(500);
    });

    it('handles case-insensitive', async () => {
      setupPdfMock('SUMA: 53375\nWAGA: 75,5');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.weight).toBeCloseTo(75.5, 2);
    });
  });

  describe('Brak wagi -> undefined', () => {
    it('returns undefined when not found', async () => {
      setupPdfMock('SUMA: 53375\nBrak danych o wadze');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.weight).toBeUndefined();
    });
  });
});

// ==============================================================================
// TESTY PARSOWANIA LICZB (parseNumber helper)
// ==============================================================================

describe('PdfImportService - parseNumber (tested via extractSumaNetto)', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Format polski: "14 733,43"', () => {
    it('parses number with space thousands separator and comma decimal', async () => {
      setupPdfMock('SUMA: 53375\nSuma 14 733,43 1 000,00 15 733,43');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(14733.43, 2);
    });

    it('parses "1138,00" without thousands separator', async () => {
      setupPdfMock('SUMA: 53375\nSuma 1138,00 100,00 1238,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBeCloseTo(1138, 2);
    });
  });

  describe('Edge cases', () => {
    it('handles multiple spaces as thousands separator', async () => {
      setupPdfMock('SUMA: 53375\nSuma 1  234,56 100,00 1 334,56');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      // Powinno usunąć wszystkie spacje
      expect(result.valueNetto).toBeCloseTo(1234.56, 2);
    });

    it('returns 0 for invalid number format', async () => {
      // Gdy brak wzorca - zwraca 0
      setupPdfMock('SUMA: 53375\nBrak liczb');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.valueNetto).toBe(0);
    });
  });
});

// ==============================================================================
// TESTY processCenyPdf flow
// ==============================================================================

describe('PdfImportService - processCenyPdf', () => {
  let service: PdfImportService;
  let mockPrismaLocal: {
    order: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrismaLocal = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new PdfImportService({ prisma: mockPrismaLocal as unknown as Parameters<typeof PdfImportService.prototype.processCenyPdf>[0] });
    vi.clearAllMocks();
  });

  describe('Pomyślne przetworzenie', () => {
    it('updates order with parsed data (PLN)', async () => {
      setupPdfMock('SUMA: 53375\nSuma 1 000,00 230,00 1 230,00');

      mockPrismaLocal.order.findUnique.mockResolvedValue({ id: 1, orderNumber: '53375' });
      mockPrismaLocal.order.update.mockResolvedValue({ id: 1 });

      const result = await service.processCenyPdf('/fake/path.pdf');

      expect(result.orderId).toBe(1);
      expect(result.updated).toBe(true);
      expect(mockPrismaLocal.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { valuePln: 1000 },
      });
    });

    it('updates order with EUR value', async () => {
      setupPdfMock('SUMA: 53375 EUR\nSuma 500,00 115,00 615,00');

      mockPrismaLocal.order.findUnique.mockResolvedValue({ id: 2, orderNumber: '53375' });
      mockPrismaLocal.order.update.mockResolvedValue({ id: 2 });

      const result = await service.processCenyPdf('/fake/path.pdf');

      expect(result.orderId).toBe(2);
      expect(result.updated).toBe(true);
      expect(mockPrismaLocal.order.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { valueEur: 500 },
      });
    });
  });

  describe('Zlecenie nie istnieje -> Error', () => {
    it('throws error when order not found', async () => {
      setupPdfMock('SUMA: 99999\nSuma 1 000,00 230,00 1 230,00');

      mockPrismaLocal.order.findUnique.mockResolvedValue(null);

      await expect(service.processCenyPdf('/fake/path.pdf')).rejects.toThrow(
        'Zlecenie 99999 nie znalezione w bazie danych'
      );
    });
  });

  describe('Waluta EUR -> aktualizuje valueEur', () => {
    it('uses valueEur field for EUR currency', async () => {
      setupPdfMock('SUMA: 53375\n€ 750,00 faktura\nSuma 750,00 172,50 922,50');

      mockPrismaLocal.order.findUnique.mockResolvedValue({ id: 3, orderNumber: '53375' });
      mockPrismaLocal.order.update.mockResolvedValue({ id: 3 });

      await service.processCenyPdf('/fake/path.pdf');

      expect(mockPrismaLocal.order.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { valueEur: 750 },
      });
    });
  });

  describe('Waluta PLN -> aktualizuje valuePln', () => {
    it('uses valuePln field for PLN currency', async () => {
      setupPdfMock('SUMA: 53375\nSuma 2 500,00 575,00 3 075,00 zł');

      mockPrismaLocal.order.findUnique.mockResolvedValue({ id: 4, orderNumber: '53375' });
      mockPrismaLocal.order.update.mockResolvedValue({ id: 4 });

      await service.processCenyPdf('/fake/path.pdf');

      expect(mockPrismaLocal.order.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { valuePln: 2500 },
      });
    });
  });
});

// ==============================================================================
// TESTY INTEGRACYJNE - Kompletne PDF
// ==============================================================================

describe('PdfImportService - Integration tests (complete PDF parsing)', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  it('parses complete PLN invoice', async () => {
    const pdfText = `
      Faktura VAT
      SUMA: zamówienie 53375
      Nr Referencyjny D3056

      Towar14 733,43 1 178,67
      15 912,10

      Wymiary w mm 2690 x 1195
      Liczba oscieznic: 5
      Liczba szklen: 10
      Waga: 250,5 kg
    `;
    setupPdfMock(pdfText);

    const result = await service.previewCenyPdf('/fake/path.pdf');

    expect(result.orderNumber).toBe('53375');
    expect(result.reference).toBe('D3056');
    expect(result.currency).toBe('PLN');
    expect(result.valueNetto).toBeCloseTo(14733.43, 2);
    expect(result.valueBrutto).toBeCloseTo(15912.10, 2);
    expect(result.dimensions).toEqual({ width: 2690, height: 1195 });
    expect(result.windowsCount).toBe(5);
    expect(result.glassCount).toBe(10);
    expect(result.weight).toBeCloseTo(250.5, 2);
  });

  it('parses complete EUR invoice', async () => {
    // EUR currency detected via € symbol or "EUR" text
    // EUR format: regex wymaga \n przed brutto i \n23% na końcu
    // Pattern: /\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/
    const pdfText = `Invoice EUR
53690 ZAMOWIENIE
Referencja E1234

1 399,74
1 138,00261,74
23%

Size: 1500 × 1200 mm
oscieznic: 3
szklen: 6
waga: 150`;
    setupPdfMock(pdfText);

    const result = await service.previewCenyPdf('/fake/path.pdf');

    expect(result.orderNumber).toBe('53690');
    expect(result.reference).toBe('E1234');
    expect(result.currency).toBe('EUR');
    expect(result.valueNetto).toBeCloseTo(1138, 2);
    expect(result.valueBrutto).toBeCloseTo(1399.74, 2);
    expect(result.dimensions).toEqual({ width: 1500, height: 1200 });
    expect(result.windowsCount).toBe(3);
    expect(result.glassCount).toBe(6);
    expect(result.weight).toBe(150);
  });

  it('handles minimal PDF with only order number', async () => {
    setupPdfMock('54001');

    const result = await service.previewCenyPdf('/fake/path.pdf');

    expect(result.orderNumber).toBe('54001');
    expect(result.reference).toBe('');
    expect(result.currency).toBe('PLN');
    expect(result.valueNetto).toBe(0);
    expect(result.valueBrutto).toBe(0);
    expect(result.dimensions).toBeUndefined();
    expect(result.windowsCount).toBeUndefined();
    expect(result.glassCount).toBeUndefined();
    expect(result.weight).toBeUndefined();
  });
});

// ==============================================================================
// TESTY EDGE CASES
// ==============================================================================

describe('PdfImportService - Edge cases', () => {
  let service: PdfImportService;

  beforeEach(() => {
    service = new PdfImportService({ prisma: mockPrisma });
    vi.clearAllMocks();
  });

  describe('Special characters in PDF', () => {
    it('handles unicode characters in text', async () => {
      setupPdfMock('SUMA: 53375\nKlient: Kowalski Łódź żółć');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53375');
    });

    it('handles newlines and tabs', async () => {
      setupPdfMock('SUMA:\t53375\n\nSuma\t1 000,00\t230,00\t1 230,00');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53375');
    });
  });

  describe('Multiple matches', () => {
    it('uses first matching order number', async () => {
      setupPdfMock('SUMA: 53375\nInne zlecenie: 53999');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53375');
    });

    it('uses first matching reference', async () => {
      setupPdfMock('SUMA: 53375\nNr Referencyjny A1111\nReferencja B2222');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.reference).toBe('A1111');
    });
  });

  describe('Corrupted/unusual data', () => {
    it('handles very long text', async () => {
      const longText = 'SUMA: 53375\n' + 'X'.repeat(100000);
      setupPdfMock(longText);
      const result = await service.previewCenyPdf('/fake/path.pdf');
      expect(result.orderNumber).toBe('53375');
    });

    it('handles text with only numbers', async () => {
      setupPdfMock('12345 67890 11111 22222 33333 44444 55555');
      const result = await service.previewCenyPdf('/fake/path.pdf');
      // Powinno znaleźć 55555 (pattern 5xxxx)
      expect(result.orderNumber).toBe('55555');
    });
  });
});
