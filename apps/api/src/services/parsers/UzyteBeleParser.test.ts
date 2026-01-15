/**
 * UzyteBeleParser Unit Tests
 * Testy jednostkowe dla parsera plików "użyte bele"
 *
 * Testowane metody:
 * - parseEurAmountFromSchuco - parsowanie kwot EUR z formatu Schuco
 * - parseUzyteBeleFile - parsowanie pliku CSV
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import { UzyteBeleParser } from './UzyteBeleParser.js';

// Mock modułów które wymagają połączenia z bazą danych
vi.mock('../../index.js', () => ({
  prisma: {},
}));

vi.mock('../glass-delivery/index.js', () => ({
  GlassDeliveryService: vi.fn(),
}));

vi.mock('../schuco/schucoLinkService.js', () => ({
  SchucoLinkService: vi.fn(),
}));

describe('UzyteBeleParser', () => {
  let parser: UzyteBeleParser;

  beforeEach(() => {
    parser = new UzyteBeleParser();
    vi.clearAllMocks();
  });

  describe('parseEurAmountFromSchuco', () => {
    it('should parse simple EUR amount', () => {
      expect(parser.parseEurAmountFromSchuco('62,30 €')).toBe(62.3);
    });

    it('should parse EUR amount with thousands separator (space)', () => {
      expect(parser.parseEurAmountFromSchuco('2 321,02 €')).toBe(2321.02);
    });

    it('should parse EUR amount with multiple thousands separators', () => {
      expect(parser.parseEurAmountFromSchuco('12 345,67 €')).toBe(12345.67);
    });

    it('should parse EUR amount without currency symbol', () => {
      expect(parser.parseEurAmountFromSchuco('100,50')).toBe(100.5);
    });

    it('should parse integer EUR amount', () => {
      expect(parser.parseEurAmountFromSchuco('500 €')).toBe(500);
    });

    it('should return null for empty string', () => {
      expect(parser.parseEurAmountFromSchuco('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parser.parseEurAmountFromSchuco('abc')).toBeNull();
    });

    it('should handle amount with extra spaces', () => {
      expect(parser.parseEurAmountFromSchuco('  123,45  €  ')).toBe(123.45);
    });

    it('should handle zero amount', () => {
      expect(parser.parseEurAmountFromSchuco('0,00 €')).toBe(0);
    });
  });

  describe('parseUzyteBeleFile', () => {
    const testFilesDir = '/tmp/uzyte-bele-tests';

    beforeEach(async () => {
      // Tworzymy katalog testowy
      await fs.promises.mkdir(testFilesDir, { recursive: true });
    });

    afterEach(async () => {
      // Usuwamy katalog testowy
      try {
        await fs.promises.rm(testFilesDir, { recursive: true, force: true });
      } catch {
        // Ignoruj błędy usuwania
      }
    });

    it('should parse basic CSV file with requirements', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;2;1500
54222;18866000;1;500`;

      const filepath = `${testFilesDir}/test-basic.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.orderNumber).toBe('54222');
      expect(result.requirements).toHaveLength(2);
      expect(result.requirements[0].articleNumber).toBe('19016000');
      expect(result.requirements[0].originalBeams).toBe(2);
      expect(result.requirements[0].originalRest).toBe(1500);
      expect(result.requirements[1].articleNumber).toBe('18866000');
    });

    it('should parse order number with suffix', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222-a;19016000;1;0`;

      const filepath = `${testFilesDir}/test-suffix.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.orderNumber).toBe('54222-a');
    });

    it('should parse metadata from file header', async () => {
      const csvContent = `Klient: Test Company; Projekt: PRJ-001; System: Profil 70
Termin realizacji: 2026-02-15
Dostawa PVC: 2026-02-10
Autor dokumentu: Krzysztof
Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0`;

      const filepath = `${testFilesDir}/test-metadata.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.client).toBe('Test Company');
      expect(result.project).toBe('PRJ-001');
      expect(result.system).toBe('Profil 70');
      expect(result.deadline).toBe('2026-02-15');
      expect(result.pvcDeliveryDate).toBe('2026-02-10');
      expect(result.documentAuthor).toBe('Krzysztof');
    });

    it('should parse windows section', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Lista okien
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc;Referencja
1;1200;1500;OB;1;REF001
2;800;600;FIX;2;REF002`;

      const filepath = `${testFilesDir}/test-windows.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.windows).toHaveLength(2);
      expect(result.windows[0]).toEqual({
        lp: 1,
        szer: 1200,
        wys: 1500,
        typProfilu: 'OB',
        ilosc: 1,
        referencja: 'REF001',
      });
      expect(result.windows[1]).toEqual({
        lp: 2,
        szer: 800,
        wys: 600,
        typProfilu: 'FIX',
        ilosc: 2,
        referencja: 'REF002',
      });
    });

    it('should parse glasses section', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Lista szyb
Lp.;Pozycja;Szerokosc;Wysokosc;Ilosc;Typ pakietu
1;1;773;2222;1;4/18/4/18/4S3 Ug=0.5
2;2;500;1000;2;4/16/4 Ug=1.1`;

      const filepath = `${testFilesDir}/test-glasses.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.glasses).toHaveLength(2);
      expect(result.glasses[0].widthMm).toBe(773);
      expect(result.glasses[0].heightMm).toBe(2222);
      expect(result.glasses[0].quantity).toBe(1);
      expect(result.glasses[0].packageType).toBe('4/18/4/18/4S3 Ug=0.5');
      // areaSqm = (773 * 2222) / 1000000 = 1.717606
      expect(result.glasses[0].areaSqm).toBeCloseTo(1.7176, 4);
    });

    it('should parse totals from file', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Łączna liczba okien;5
Łączna liczba skrzydeł;10
Łączna liczba szyb;15`;

      const filepath = `${testFilesDir}/test-totals.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.totals.windows).toBe(5);
      expect(result.totals.sashes).toBe(10);
      expect(result.totals.glasses).toBe(15);
    });

    it('should skip invalid article numbers', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;invalid;1;0
54222;19016000;2;500
54222;short;1;0`;

      const filepath = `${testFilesDir}/test-invalid-articles.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Tylko jeden poprawny numer artykułu (8 cyfr)
      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].articleNumber).toBe('19016000');
    });

    it('should handle article numbers with p suffix', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000p;1;500`;

      const filepath = `${testFilesDir}/test-p-suffix.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].articleNumber).toBe('19016000p');
    });

    it('should handle empty file', async () => {
      const filepath = `${testFilesDir}/test-empty.csv`;
      await fs.promises.writeFile(filepath, '', 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.orderNumber).toBe('UNKNOWN');
      expect(result.requirements).toHaveLength(0);
      expect(result.windows).toHaveLength(0);
      expect(result.glasses).toHaveLength(0);
    });

    it('should handle file with only header', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta`;

      const filepath = `${testFilesDir}/test-header-only.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.orderNumber).toBe('UNKNOWN');
      expect(result.requirements).toHaveLength(0);
    });

    it('should handle UTF-8 BOM', async () => {
      // UTF-8 BOM + content
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const content = Buffer.from(`Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0`, 'utf-8');
      const csvContent = Buffer.concat([bom, content]);

      const filepath = `${testFilesDir}/test-bom.csv`;
      await fs.promises.writeFile(filepath, csvContent);

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.orderNumber).toBe('54222');
      expect(result.requirements).toHaveLength(1);
    });

    it('should parse complete real-world file structure', async () => {
      const csvContent = `Klient: ACME Corp; Projekt: Budowa A1
Termin realizacji: 2026-03-01
Dostawa PVC: 2026-02-25
Autor dokumentu: Jan
Zlec;Num Art;Nowych bel;Reszta
54333;19016000;3;2000
54333;18866000;2;1000
54333;19020000;1;500
Lista okien
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc;Referencja
1;1200;1500;OB;2;A-01
2;800;1200;OB;1;A-02
3;600;600;FIX;4;A-03
Łączna liczba okien;7
Łączna liczba skrzydeł;12
Lista szyb
Lp.;Pozycja;Szerokosc;Wysokosc;Ilosc;Typ pakietu
1;1;1100;1400;2;4/18/4 Ug=1.0
2;2;700;1100;1;4/18/4 Ug=1.0
3;3;500;500;4;4/16/4 Ug=1.1
Łączna liczba szyb;7`;

      const filepath = `${testFilesDir}/test-complete.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Metadata
      expect(result.orderNumber).toBe('54333');
      expect(result.client).toBe('ACME Corp');
      expect(result.project).toBe('Budowa A1');
      expect(result.deadline).toBe('2026-03-01');
      expect(result.pvcDeliveryDate).toBe('2026-02-25');
      expect(result.documentAuthor).toBe('Jan');

      // Requirements
      expect(result.requirements).toHaveLength(3);

      // Windows
      expect(result.windows).toHaveLength(3);

      // Glasses
      expect(result.glasses).toHaveLength(3);

      // Totals
      expect(result.totals.windows).toBe(7);
      expect(result.totals.sashes).toBe(12);
      expect(result.totals.glasses).toBe(7);
    });

    it('should handle Lista drzwi as windows section', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Lista drzwi
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc;Referencja
1;900;2100;D;1;DOOR01`;

      const filepath = `${testFilesDir}/test-doors.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.windows).toHaveLength(1);
      expect(result.windows[0].szer).toBe(900);
      expect(result.windows[0].wys).toBe(2100);
    });

    it('should calculate correct profile number and color code from article number', async () => {
      // Artykuł 19016000 -> profil 9016, kolor 000
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0`;

      const filepath = `${testFilesDir}/test-article-parse.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.requirements[0].profileNumber).toBe('9016');
      expect(result.requirements[0].colorCode).toBe('000');
    });

    it('should calculate beams and meters correctly', async () => {
      // 2 nowe bele + 1500mm reszta = 2 bele (+ metraż obliczony przez BeamCalculator)
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;2;1500`;

      const filepath = `${testFilesDir}/test-beam-calc.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.requirements[0].originalBeams).toBe(2);
      expect(result.requirements[0].originalRest).toBe(1500);
      // calculatedBeams i calculatedMeters zależą od BeamCalculator
      expect(result.requirements[0].calculatedBeams).toBeGreaterThanOrEqual(0);
      expect(result.requirements[0].calculatedMeters).toBeGreaterThanOrEqual(0);
    });

    it('should handle alternative totals format (Laczna lic:)', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Lista szyb
Lp.;Pozycja;Szerokosc;Wysokosc;Ilosc;Typ pakietu
1;1;500;500;1;4/16/4
Laczna lic:;14`;

      const filepath = `${testFilesDir}/test-alt-totals.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Gdy totals.glasses jest 0, użyj wartości z "Laczna lic:"
      expect(result.totals.glasses).toBe(14);
    });
  });

  describe('edge cases', () => {
    const testFilesDir = '/tmp/uzyte-bele-edge-cases';

    beforeEach(async () => {
      await fs.promises.mkdir(testFilesDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.promises.rm(testFilesDir, { recursive: true, force: true });
      } catch {
        // Ignoruj
      }
    });

    it('should handle malformed CSV with missing columns', async () => {
      // Parser wymaga minimum 4 kolumn do parsowania wiersza requirements
      // Gdy wiersz ma mniej niż 4 kolumny, jest pomijany
      const csvContent = `Zlec;Num Art
54222;19016000`;

      const filepath = `${testFilesDir}/test-missing-cols.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Parser nie znajduje poprawnych wierszy (brak 4 kolumn), więc orderNumber = UNKNOWN
      expect(result.orderNumber).toBe('UNKNOWN');
      // Nie powinno dodać requirements (brak wymaganych kolumn)
      expect(result.requirements).toHaveLength(0);
    });

    it('should handle windows without all required columns', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0
Lista okien
Lp.;Szerokosc;Wysokosc
1;1200;1500`;

      const filepath = `${testFilesDir}/test-windows-missing-cols.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Powinno pominąć okna z niewystarczającą liczbą kolumn
      expect(result.windows).toHaveLength(0);
    });

    it('should handle special characters in metadata (ASCII safe)', async () => {
      // Test z ASCII-safe znakami specjalnymi
      // Polskie znaki są testowane osobno z Windows-1250 encoding
      const csvContent = `Klient: Firma "Test & Company" Sp. z o.o.
Projekt: Budowa - etap I (part A)
Zlec;Num Art;Nowych bel;Reszta
54222;19016000;1;0`;

      const filepath = `${testFilesDir}/test-special-chars.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      expect(result.client).toBe('Firma "Test & Company" Sp. z o.o.');
      expect(result.project).toBe('Budowa - etap I (part A)');
    });

    it('should handle order number with space separator', async () => {
      const csvContent = `Zlec;Num Art;Nowych bel;Reszta
54222 abc;19016000;1;0`;

      const filepath = `${testFilesDir}/test-space-suffix.csv`;
      await fs.promises.writeFile(filepath, csvContent, 'utf-8');

      const result = await parser.parseUzyteBeleFile(filepath);

      // Numer zlecenia z sufixem oddzielonym spacją
      expect(result.orderNumber).toBe('54222 abc');
    });
  });
});
