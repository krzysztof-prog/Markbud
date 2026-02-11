import fs from 'fs';
import pdf from 'pdf-parse';
import { prisma } from '../../index.js';
import { logger } from '../../utils/logger.js';

export interface ParsedPdfCeny {
  orderNumber: string;
  reference: string;
  currency: 'EUR' | 'PLN';
  valueNetto: number;
  valueBrutto: number;
  dimensions?: {
    width: number;
    height: number;
  };
  windowsCount?: number;
  glassCount?: number;
  weight?: number;
}

export class PdfParser {
  /**
   * Podgląd pliku PDF z ceną przed importem
   */
  async previewCenyPdf(filepath: string): Promise<ParsedPdfCeny> {
    return this.parseCenyPdf(filepath);
  }

  /**
   * Przetwarza plik PDF i aktualizuje zlecenie
   * Używa transakcji i oznacza pending prices jako applied
   */
  async processCenyPdf(filepath: string): Promise<{ orderId: number; updated: boolean }> {
    const parsed = await this.parseCenyPdf(filepath);

    // Użyj transakcji aby atomowo zaktualizować zlecenie i oznaczyć pending price
    return prisma.$transaction(async (tx) => {
      // Znajdź zlecenie po numerze (z fallbackiem na prefix match np. 53614 -> 53614-a)
      let order = await tx.order.findUnique({
        where: { orderNumber: parsed.orderNumber },
      });

      if (!order) {
        // Fallback: prefix match
        order = await tx.order.findFirst({
          where: { orderNumber: { startsWith: parsed.orderNumber } },
          orderBy: { orderNumber: 'asc' },
        });
      }

      if (!order) {
        throw new Error(`Zlecenie ${parsed.orderNumber} nie znalezione w bazie danych`);
      }

      // Zaktualizuj zlecenie o dane z PDF
      // WAŻNE: Wartości w bazie są przechowywane w groszach/centach
      const valueInSmallestUnit = Math.round(parsed.valueNetto * 100);

      // Dla AKROBUD: windowsNetValue = valueEur (z PDF)
      const isAkrobud = (order.client ?? '').toUpperCase().includes('AKROBUD');
      const eurUpdateData = parsed.currency === 'EUR'
        ? {
            valueEur: valueInSmallestUnit,
            ...(isAkrobud ? { windowsNetValue: valueInSmallestUnit } : {}),
          }
        : { valuePln: valueInSmallestUnit };

      await tx.order.update({
        where: { id: order.id },
        data: eurUpdateData,
      });

      // Oznacz powiązane pending prices jako applied
      await tx.pendingOrderPrice.updateMany({
        where: {
          orderNumber: parsed.orderNumber,
          status: 'pending',
        },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          appliedToOrderId: order.id,
        },
      });

      return {
        orderId: order.id,
        updated: true,
      };
    });
  }

  /**
   * Parsuj plik PDF z ceną
   */
  private async parseCenyPdf(filepath: string): Promise<ParsedPdfCeny> {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Wyciągnij numer zlecenia Akrobud (5-cyfrowy) - kilka strategii
    // Przekaż też nazwę pliku jako fallback (np. "ZAM 53810.pdf")
    const filename = filepath.split(/[\\/]/).pop() || '';
    const orderNumber = this.extractAkrobudOrderNumber(text, filename);

    // Wyciągnij referencję (np. D3056)
    const referenceMatch = text.match(/Nr Referencyjny\s*([A-Z]\d+)/i) ||
                          text.match(/Referencja\s*([A-Z]\d+)/i) ||
                          text.match(/\b([A-Z]\d{4})\b/);
    const reference = referenceMatch ? referenceMatch[1] : '';

    // Wyciągnij walutę (€ lub PLN)
    const isEur = text.includes('€') || text.includes('EUR');
    const _isPln = text.includes('PLN') || text.includes('zł');
    const currency: 'EUR' | 'PLN' = isEur ? 'EUR' : 'PLN';

    // Wyciągnij sumę netto - szukaj w sekcji podsumowania
    const valueNetto = this.extractSumaNetto(text);

    // Wyciągnij sumę brutto
    const valueBrutto = this.extractSumaBrutto(text);

    // Wyciągnij wymiary
    const dimensions = this.extractDimensions(text);

    // Wyciągnij liczbę ościeżnic i szkleń
    const windowsCountMatch = text.match(/[oó]ście[zż]nic[:\s]+(\d+)/i);
    const glassCountMatch = text.match(/szkle[nń][:\s]+(\d+)/i);

    const windowsCount = windowsCountMatch ? parseInt(windowsCountMatch[1]) : undefined;
    const glassCount = glassCountMatch ? parseInt(glassCountMatch[1]) : undefined;

    // Waga
    const weightMatch = text.match(/waga[:\s]+([\d,.]+)/i);
    const weight = weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : undefined;

    return {
      orderNumber,
      reference,
      currency,
      valueNetto,
      valueBrutto,
      dimensions,
      windowsCount,
      glassCount,
      weight,
    };
  }

  /**
   * Wyciąga numer zlecenia Akrobud (5-cyfrowy) z tekstu PDF
   * Używa wielu strategii w kolejności od najdokładniejszej do fallbacku
   */
  private extractAkrobudOrderNumber(text: string, filename?: string): string {
    // Strategia 1: Po "SUMA:" (format Schuco/POLY)
    const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
    if (sumaMatch) {
      logger.debug(`PDF parser: numer zlecenia z wzorca SUMA: ${sumaMatch[1]}`);
      return sumaMatch[1];
    }

    // Strategia 2: 5 cyfr + ZAMÓWIENIE (format Schuco)
    const beforeZamMatch = text.match(/(\d{5})\s*ZAMÓWIENIE/);
    if (beforeZamMatch) {
      logger.debug(`PDF parser: numer zlecenia z wzorca przed-ZAMÓWIENIE: ${beforeZamMatch[1]}`);
      return beforeZamMatch[1];
    }

    // Strategia 3: ZAMÓWIENIE + numer zewnętrzny, numer Akrobud na osobnej linii niżej
    // Format BEENEN: "ZAMÓWIENIE   2512150419" a dalej "53672" jako standalone
    const lines = text.split('\n');

    // Strategia 4: 5-cyfrowy numer na osobnej linii (w pierwszych 40 liniach)
    for (const line of lines.slice(0, 40)) {
      const match = line.match(/^\s*(\d{5})\s*$/);
      if (match) {
        logger.debug(`PDF parser: numer zlecenia ze standalone linii: ${match[1]}`);
        return match[1];
      }
    }

    // Strategia 5: Dokładnie 5-cyfrowy numer nie będący częścią dłuższego numeru
    // Używamy lookahead/lookbehind aby uniknąć wyciągania "41017" z "241017"
    const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
    if (allFiveDigit) {
      for (const num of allFiveDigit) {
        const n = parseInt(num);
        // Numery zleceń Akrobud są w zakresie 40000-99999
        if (n >= 40000 && n <= 99999) {
          logger.debug(`PDF parser: numer zlecenia z generic 5-digit match: ${num}`);
          return num;
        }
      }
    }

    // Strategia 6: Numer zlecenia z nazwy pliku (np. "ZAM 53810.pdf", "ZAM 53839.pdf")
    if (filename) {
      const zamMatch = filename.match(/ZAM\s+(\d{5})/i);
      if (zamMatch) {
        logger.debug(`PDF parser: numer zlecenia z nazwy pliku ZAM: ${zamMatch[1]}`);
        return zamMatch[1];
      }
      // Fallback: dowolny 5-cyfrowy numer w nazwie pliku
      const fiveDigitMatch = filename.match(/(?<!\d)(\d{5})(?!\d)/);
      if (fiveDigitMatch) {
        const n = parseInt(fiveDigitMatch[1]);
        if (n >= 40000 && n <= 99999) {
          logger.debug(`PDF parser: numer zlecenia z nazwy pliku (5-digit): ${fiveDigitMatch[1]}`);
          return fiveDigitMatch[1];
        }
      }
    }

    logger.warn('PDF parser: nie udało się wyciągnąć numeru zlecenia - zwracam UNKNOWN');
    return 'UNKNOWN';
  }

  /**
   * Wyciąga sumę netto z tekstu PDF
   */
  private extractSumaNetto(text: string): number {
    // Wzorzec 1: Wiersz "Towar" - format: "Towar14 733,43    1 178,67\n15 912,10"
    // gdzie netto i VAT są sklejone z "Towar", a brutto jest w następnej linii
    // Działa dla PDF-ów PLN
    const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (towarMatch) {
      // towarMatch[1] to netto
      return this.parseNumber(towarMatch[1]);
    }

    // Wzorzec 2: Format EUR z Podsumowania - "1 399,74\n1 138,00261,74\n23%"
    // gdzie brutto jest przed sklejonym netto+VAT, a na końcu procent VAT
    // Wzorzec wymaga że liczba zaczyna się od cyfry i może mieć spacje wewnątrz
    // (ale nie newline - użyj [^\S\n] zamiast \s dla spacji bez newline)
    // Format: \nliczba_brutto\nliczba_netto+liczba_vat\nprocent%
    const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
    if (eurPodsumowanieMatch) {
      // eurPodsumowanieMatch[2] to netto (pierwszy z sklejonych)
      return this.parseNumber(eurPodsumowanieMatch[2]);
    }

    // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
    // Tabela: netto, VAT, brutto oddzielone spacjami/tabulatorami
    const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (sumaEurMatch) {
      // sumaEurMatch[1] to netto
      return this.parseNumber(sumaEurMatch[1]);
    }

    // Wzorzec 4: "Suma netto" bezpośrednio z wartością (np. w nagłówku kolumny)
    // Ten wzorzec jest mniej dokładny, używamy jako fallback
    const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
    if (nettoMatch) {
      return this.parseNumber(nettoMatch[1]);
    }

    // Wzorzec 5: Sklejone wartości - "575,64\n468,00107,64" (brutto\nnetto+vat)
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      return this.parseNumber(sklejoneMatch[2]);
    }

    // Wzorzec 6: Trzy liczby w wierszu - "468,00 107,64 575,64"
    const tripleMatch = text.match(/([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})/);
    if (tripleMatch) {
      return this.parseNumber(tripleMatch[1]);
    }

    return 0;
  }

  /**
   * Wyciąga sumę brutto z tekstu PDF
   */
  private extractSumaBrutto(text: string): number {
    // Wzorzec 1: Wiersz "Towar" z brutto w następnej linii
    // Format: "Towar14 733,43    1 178,67\n15 912,10"
    const towarMatch = text.match(/Towar\s*[\d\s]+[,.]\d{2}\s+[\d\s]+[,.]\d{2}\s*\n\s*([\d\s]+[,.]\d{2})/i);
    if (towarMatch) {
      // towarMatch[1] to brutto (z następnej linii)
      return this.parseNumber(towarMatch[1]);
    }

    // Wzorzec 2: Format EUR z Podsumowania - "1 399,74\n1 138,00261,74\n23%"
    // gdzie brutto jest przed sklejonym netto+VAT
    const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
    if (eurPodsumowanieMatch) {
      // eurPodsumowanieMatch[1] to brutto
      return this.parseNumber(eurPodsumowanieMatch[1]);
    }

    // Wzorzec 3: Format z EUR - "Suma    1 147,00    263,81    1 410,81"
    // Tabela: netto, VAT, brutto (trzecia wartość)
    const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (sumaEurMatch) {
      // sumaEurMatch[3] to brutto
      return this.parseNumber(sumaEurMatch[3]);
    }

    // Wzorzec 4: Sklejone wartości - "575,64\n468,00107,64" (brutto\nnetto+vat)
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      return this.parseNumber(sklejoneMatch[1]);
    }

    // Wzorzec 5: "brutto" z wartością
    const bruttoMatch = text.match(/brutto[:\s]*([\d\s,.]+)/i);
    if (bruttoMatch) {
      return this.parseNumber(bruttoMatch[1]);
    }

    return 0;
  }

  /**
   * Wyciąga wymiary okna z tekstu
   */
  private extractDimensions(text: string): { width: number; height: number } | undefined {
    // Szukaj wzorca "2690 x 1195" lub "Wymiary w mm 2690 x 1195"
    const dimMatch = text.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
    if (dimMatch) {
      return {
        width: parseInt(dimMatch[1]),
        height: parseInt(dimMatch[2]),
      };
    }
    return undefined;
  }

  /**
   * Parsuje liczbę z formatu polskiego (przecinek jako separator dziesiętny)
   */
  private parseNumber(str: string): number {
    // Usuń spacje i zamień przecinek na kropkę
    const cleaned = str.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
}
