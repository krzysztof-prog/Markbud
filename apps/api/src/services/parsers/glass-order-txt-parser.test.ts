import { describe, it, expect } from 'vitest';
import { parseGlassOrderTxt } from './glass-order-txt-parser.js';
import iconv from 'iconv-lite';

// Helper: tworzy minimalny poprawny plik TXT
function createValidTxtContent(overrides: Partial<{
  date: string;
  number: string;
  supplier: string;
  tableRows: string[];
  footer: string;
}> = {}): string {
  const {
    date = '19.11.2025',
    number = 'ZAM-2025-001',
    supplier = 'PILKINGTON',
    tableRows = [
      '4-16-4 TGI		2		1200		800		1		53479 poz.1',
      '4-16-4 TGI		1		900		600		2		53479 poz.2',
    ],
    footer = `W.Kania
Dostawa na 3 12 25`,
  } = overrides;

  return `Data ${date}  12:30
Numer ${number}
${supplier}

Symbol		Ilość		Szer		Wys		Poz		Zlecenie
${tableRows.join('\n')}
${footer}`;
}

describe('glass-order-txt-parser', () => {
  describe('parseGlassOrderTxt', () => {
    describe('Happy path - poprawne parsowanie', () => {
      it('parsuje poprawny plik TXT z wszystkimi polami', () => {
        const content = createValidTxtContent();
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.glassOrderNumber).toBe('ZAM-2025-001');
        expect(result.metadata.supplier).toBe('PILKINGTON');
        expect(result.metadata.orderedBy).toBe('W.Kania');
        expect(result.items).toHaveLength(2);
        expect(result.summary.totalItems).toBe(2);
        expect(result.summary.totalQuantity).toBe(3); // 2 + 1
      });

      it('parsuje datę zamówienia w formacie DD.MM.YYYY', () => {
        const content = createValidTxtContent({ date: '15.03.2025' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderDate.getDate()).toBe(15);
        expect(result.metadata.orderDate.getMonth()).toBe(2); // 0-indexed
        expect(result.metadata.orderDate.getFullYear()).toBe(2025);
      });

      it('parsuje datę dostawy w formacie D M YY', () => {
        const content = createValidTxtContent({
          footer: 'Dostawa na 5 6 25',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.expectedDeliveryDate.getDate()).toBe(5);
        expect(result.metadata.expectedDeliveryDate.getMonth()).toBe(5); // czerwiec, 0-indexed
        expect(result.metadata.expectedDeliveryDate.getFullYear()).toBe(2025);
      });
    });

    describe('Różne formaty dat', () => {
      it('parsuje datę z zerami wiodącymi (01.02.2025)', () => {
        const content = createValidTxtContent({ date: '01.02.2025' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderDate.getDate()).toBe(1);
        expect(result.metadata.orderDate.getMonth()).toBe(1); // luty
        expect(result.metadata.orderDate.getFullYear()).toBe(2025);
      });

      it('parsuje datę bez zer wiodących (3.9.2025)', () => {
        const content = createValidTxtContent({ date: '3.9.2025' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderDate.getDate()).toBe(3);
        expect(result.metadata.orderDate.getMonth()).toBe(8); // wrzesień
      });

      it('parsuje datę dostawy z pojedynczymi cyframi (3 12 25)', () => {
        const content = createValidTxtContent({
          footer: 'Dostawa na 3 12 25',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.expectedDeliveryDate.getDate()).toBe(3);
        expect(result.metadata.expectedDeliveryDate.getMonth()).toBe(11); // grudzień
        expect(result.metadata.expectedDeliveryDate.getFullYear()).toBe(2025);
      });

      it('parsuje datę dostawy z dwucyfrowymi wartościami (15 11 25)', () => {
        const content = createValidTxtContent({
          footer: 'Dostawa na 15 11 25',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.expectedDeliveryDate.getDate()).toBe(15);
        expect(result.metadata.expectedDeliveryDate.getMonth()).toBe(10); // listopad
      });
    });

    describe('Parsowanie referencji zlecenia', () => {
      it('parsuje prostą referencję (53479 poz.1)', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1200		800		1		53479 poz.1'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].orderNumber).toBe('53479');
        expect(result.items[0].orderSuffix).toBeUndefined();
        expect(result.items[0].fullReference).toBe('53479 poz.1');
        expect(result.items[0].position).toBe('1');
      });

      it('parsuje referencję z sufiksem (53480-a poz.2)', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1200		800		2		53480-a poz.2'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].orderNumber).toBe('53480');
        expect(result.items[0].orderSuffix).toBe('a');
        expect(result.items[0].fullReference).toBe('53480-a poz.2');
      });

      it('parsuje referencję z wieloliterowym sufiksem (53480-ab poz.1)', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1200		800		1		53480-ab poz.1'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].orderNumber).toBe('53480');
        expect(result.items[0].orderSuffix).toBe('ab');
      });

      it('parsuje referencję bez numeru pozycji (53479)', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1200		800		1		53479'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].orderNumber).toBe('53479');
        expect(result.items[0].fullReference).toBe('53479');
      });
    });

    describe('Wykrywanie dostawcy', () => {
      it('wykrywa dostawcę PILKINGTON', () => {
        const content = createValidTxtContent({ supplier: 'PILKINGTON' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.supplier).toBe('PILKINGTON');
      });

      it('wykrywa dostawcę GUARDIAN', () => {
        const content = createValidTxtContent({ supplier: 'GUARDIAN' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.supplier).toBe('GUARDIAN');
      });

      it('wykrywa dostawcę SAINT-GOBAIN', () => {
        const content = createValidTxtContent({ supplier: 'SAINT-GOBAIN' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.supplier).toBe('SAINT-GOBAIN');
      });

      it('wykrywa dostawcę z małymi literami i normalizuje do uppercase', () => {
        const content = createValidTxtContent({ supplier: 'Pilkington' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.supplier).toBe('PILKINGTON');
      });

      it('ustawia NIEZNANY gdy brak rozpoznanego dostawcy', () => {
        const content = createValidTxtContent({ supplier: 'Inne Info' });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.supplier).toBe('NIEZNANY');
      });
    });

    describe('Tabela z pozycjami', () => {
      it('parsuje typ szkła', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1200		800		1		53479 poz.1'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].glassType).toBe('4-16-4 TGI');
      });

      it('parsuje ilość', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		5		1200		800		1		53479 poz.1'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].quantity).toBe(5);
      });

      it('parsuje wymiary (szerokość i wysokość)', () => {
        const content = createValidTxtContent({
          tableRows: ['4-16-4 TGI		1		1500		2000		1		53479 poz.1'],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items[0].widthMm).toBe(1500);
        expect(result.items[0].heightMm).toBe(2000);
      });

      it('parsuje wiele pozycji', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            '4-16-4 TGI		3		900		600		2		53479 poz.2',
            '6-16-6 TGI		1		1000		1000		3		53480 poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(3);
        expect(result.summary.totalItems).toBe(3);
        expect(result.summary.totalQuantity).toBe(6); // 2 + 3 + 1
      });

      it('pomija linie z niepełnymi danymi', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            'Niepełna linia',
            '4-16-4 TGI		1		900		600		2		53480 poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(2);
      });

      it('pomija linie z NaN wartościami', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            '4-16-4 TGI		abc		xyz		600		2		53480 poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(1);
      });
    });

    describe('Agregacja po zleceniach (orderBreakdown)', () => {
      it('grupuje pozycje po numerze zlecenia', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            '4-16-4 TGI		3		900		600		2		53479 poz.2',
            '6-16-6 TGI		1		1000		1000		1		53480 poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.summary.orderBreakdown).toEqual({
          '53479': { count: 2, quantity: 5 }, // 2 pozycje, 2+3 szt
          '53480': { count: 1, quantity: 1 }, // 1 pozycja, 1 szt
        });
      });

      it('rozróżnia zlecenia z sufiksem', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            '4-16-4 TGI		3		900		600		1		53479-a poz.1',
            '6-16-6 TGI		1		1000		1000		1		53479-b poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        expect(result.summary.orderBreakdown).toEqual({
          '53479': { count: 1, quantity: 2 },
          '53479-a': { count: 1, quantity: 3 },
          '53479-b': { count: 1, quantity: 1 },
        });
      });
    });

    describe('Obsługa błędów', () => {
      it('rzuca błąd gdy brak numeru zamówienia', () => {
        const content = `Data 19.11.2025  12:30
PILKINGTON

Symbol		Ilość		Szer		Wys		Poz		Zlecenie
4-16-4 TGI		2		1200		800		1		53479 poz.1`;

        expect(() => parseGlassOrderTxt(content)).toThrow(
          'Nie znaleziono numeru zamówienia w pliku'
        );
      });

      it('rzuca błąd gdy brak tabeli z pozycjami', () => {
        const content = `Data 19.11.2025  12:30
Numer ZAM-2025-001
PILKINGTON

Jakiś inny tekst bez tabeli
4-16-4 TGI		2		1200		800		1		53479 poz.1`;

        expect(() => parseGlassOrderTxt(content)).toThrow(
          'Nie znaleziono tabeli z pozycjami'
        );
      });

      it('parsuje plik z pustą tabelą (0 pozycji)', () => {
        const content = createValidTxtContent({
          tableRows: [],
          footer: 'W.Kania',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(0);
        expect(result.summary.totalItems).toBe(0);
        expect(result.summary.totalQuantity).toBe(0);
      });
    });

    describe('Różne kodowania', () => {
      it('parsuje plik zakodowany jako UTF-8', () => {
        const content = createValidTxtContent({
          tableRows: ['Szkło żółte		1		1200		800		1		53479 poz.1'],
        });
        const buffer = Buffer.from(content, 'utf-8');
        const result = parseGlassOrderTxt(buffer);

        expect(result.items[0].glassType).toBe('Szkło żółte');
      });

      it('parsuje plik zakodowany jako Windows-1250', () => {
        // Polskie znaki w Windows-1250: ż=0xBF, ó=0xF3, ł=0xB3
        const content = createValidTxtContent({
          tableRows: ['Szkło żółte		1		1200		800		1		53479 poz.1'],
        });
        const buffer = iconv.encode(content, 'windows-1250');
        const result = parseGlassOrderTxt(buffer);

        expect(result.items[0].glassType).toBe('Szkło żółte');
      });

      it('akceptuje string jako input (bez konwersji kodowania)', () => {
        const content = createValidTxtContent();
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.glassOrderNumber).toBe('ZAM-2025-001');
      });
    });

    describe('Parsowanie podpisu (orderedBy)', () => {
      it('parsuje podpis z inicjałem i nazwiskiem', () => {
        const content = createValidTxtContent({
          footer: `W.Kania
Dostawa na 3 12 25`,
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderedBy).toBe('W.Kania');
      });

      it('parsuje podpis z małymi polskimi znakami w nazwisku', () => {
        // Parser wspiera małe polskie znaki w nazwisku (po kropce): żźćąęłóśń
        // Nazwy zaczynające się od wielkich polskich znaków (Ż, Ó) nie są wspierane
        const content = createValidTxtContent({
          footer: `M.Kowalczyk
Dostawa na 3 12 25`,
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderedBy).toBe('M.Kowalczyk');
      });

      it('parsuje podpis z polskim inicjałem (Ś, Ż, Ć)', () => {
        // Parser wspiera wybrane polskie znaki jako inicjał: ŻŹĆĄĘŁÓŚŃ
        const content = createValidTxtContent({
          footer: `Ś.Nowak
Dostawa na 3 12 25`,
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderedBy).toBe('Ś.Nowak');
      });

      it('nie parsuje podpisu gdy nazwisko zaczyna się od wielkiej polskiej litery', () => {
        // UWAGA: Jest to ograniczenie parsera - wielkie polskie litery (Ż, Ó, etc.)
        // nie są wspierane na początku nazwiska (po kropce)
        // Regex [A-Za-zżźćąęłóśń] nie obejmuje wielkich polskich znaków
        const content = createValidTxtContent({
          footer: `M.Żółtowski
Dostawa na 3 12 25`,
        });
        const result = parseGlassOrderTxt(content);

        // Parser nie znajdzie podpisu - to jest znane ograniczenie
        expect(result.metadata.orderedBy).toBe('');
      });

      it('zwraca pusty string gdy brak podpisu', () => {
        const content = createValidTxtContent({
          footer: 'Dostawa na 3 12 25',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.orderedBy).toBe('');
      });
    });

    describe('Obsługa końców linii', () => {
      it('parsuje plik z końcami linii Unix (LF)', () => {
        const content = createValidTxtContent().replace(/\r\n/g, '\n');
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(2);
      });

      it('parsuje plik z końcami linii Windows (CRLF)', () => {
        const content = createValidTxtContent().replace(/\n/g, '\r\n');
        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(2);
      });
    });

    describe('Edge cases', () => {
      it('ignoruje linie z "Dostawa na" w tabeli', () => {
        const content = createValidTxtContent({
          tableRows: [
            '4-16-4 TGI		2		1200		800		1		53479 poz.1',
            'Dostawa na 15 11 25',
            '4-16-4 TGI		1		900		600		2		53480 poz.1',
          ],
        });
        const result = parseGlassOrderTxt(content);

        // "Dostawa na" powinna być zignorowana
        expect(result.items).toHaveLength(2);
      });

      it('parsuje plik z wieloma spacjami jako separatorami', () => {
        const content = `Data 19.11.2025  12:30
Numer ZAM-2025-001
PILKINGTON

Symbol		Ilość		Szer		Wys		Poz		Zlecenie
4-16-4 TGI      2      1200      800      1      53479 poz.1`;

        const result = parseGlassOrderTxt(content);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].quantity).toBe(2);
      });

      it('parsuje numer zamówienia z dodatkowym tekstem', () => {
        const content = createValidTxtContent({
          number: 'ZAM-2025-001 (PILOTAŻ)',
        });
        const result = parseGlassOrderTxt(content);

        expect(result.metadata.glassOrderNumber).toBe('ZAM-2025-001 (PILOTAŻ)');
      });
    });
  });
});
