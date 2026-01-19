import fs from 'fs';
import pdf from 'pdf-parse';
import { prisma } from '../../index.js';

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
   */
  async processCenyPdf(filepath: string): Promise<{ orderId: number; updated: boolean }> {
    const parsed = await this.parseCenyPdf(filepath);

    // Znajdź zlecenie po numerze
    const order = await prisma.order.findUnique({
      where: { orderNumber: parsed.orderNumber },
    });

    if (!order) {
      throw new Error(`Zlecenie ${parsed.orderNumber} nie znalezione w bazie danych`);
    }

    // Zaktualizuj zlecenie o dane z PDF
    // WAŻNE: Wartości w bazie są przechowywane w groszach/centach
    // parsed.valueNetto to wartość w EUR/PLN (np. 590.00), trzeba pomnożyć przez 100
    const valueInSmallestUnit = Math.round(parsed.valueNetto * 100);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        ...(parsed.currency === 'EUR' ? { valueEur: valueInSmallestUnit } : { valuePln: valueInSmallestUnit }),
      },
    });

    return {
      orderId: order.id,
      updated: true,
    };
  }

  /**
   * Parsuj plik PDF z ceną
   */
  private async parseCenyPdf(filepath: string): Promise<ParsedPdfCeny> {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Debug: tekst PDF jest dostepny w zmiennej 'text' do debugowania

    // Wyciągnij numer zlecenia (5-cyfrowy numer na początku, zwykle po "SUMA:")
    const orderNumberMatch = text.match(/SUMA:.*?(\d{5})/s) || text.match(/(\d{5})\s*ZAMÓWIENIE/);
    const orderNumber = orderNumberMatch ? orderNumberMatch[1] : this.extractOrderNumber(text);

    // Wyciągnij referencję (np. D3056)
    const referenceMatch = text.match(/Nr Referencyjny\s*([A-Z]\d+)/i) ||
                          text.match(/Referencja\s*([A-Z]\d+)/i) ||
                          text.match(/\b([A-Z]\d{4})\b/);
    const reference = referenceMatch ? referenceMatch[1] : '';

    // Wyciągnij walutę (€ lub PLN)
    const isEur = text.includes('€') || text.includes('EUR');
    const isPln = text.includes('PLN') || text.includes('zł');
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
   * Wyciąga numer zlecenia z tekstu
   */
  private extractOrderNumber(text: string): string {
    // Szukaj 5-cyfrowego numeru na początku tekstu (numer zlecenia Akrobud)
    const lines = text.split('\n');
    for (const line of lines.slice(0, 20)) {
      const match = line.match(/^\s*(\d{5})\s*$/);
      if (match) {
        return match[1];
      }
    }

    // Alternatywnie szukaj wzorca "53375" itp.
    const fiveDigitMatch = text.match(/\b(5\d{4})\b/);
    if (fiveDigitMatch) {
      return fiveDigitMatch[1];
    }

    return 'UNKNOWN';
  }

  /**
   * Wyciąga sumę netto z tekstu PDF
   */
  private extractSumaNetto(text: string): number {
    // Format PDF z podsumowania:
    // "575,64\n468,00107,64\n23%" - brutto na górze, potem netto+VAT sklejone bez spacji

    // Wzorzec 1: Szukaj sklejonego netto+VAT po brutto (format: "575,64\n468,00107,64")
    // brutto\nnetto+vat - gdzie netto i vat są sklejone
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      // sklejoneMatch[2] to netto (468,00)
      return this.parseNumber(sklejoneMatch[2]);
    }

    // Wzorzec 2: "Suma netto" bezpośrednio
    const nettoMatch = text.match(/suma\s*netto[:\s]*([\d,.]+)/i);
    if (nettoMatch) {
      return this.parseNumber(nettoMatch[1]);
    }

    // Wzorzec 3: "Suma" z wartościami w tabeli (ze spacjami)
    const sumaMatch = text.match(/Suma\s+([\d\s,.]+)\s+([\d\s,.]+)\s+([\d\s,.]+)/i);
    if (sumaMatch) {
      return this.parseNumber(sumaMatch[1]);
    }

    // Wzorzec 4: "468,00 107,64 575,64" - netto, VAT, brutto ze spacjami
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
    // Format PDF: "575,64\n468,00107,64" - brutto na górze, potem netto+VAT sklejone

    // Wzorzec 1: brutto przed sklejonym netto+VAT
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      // sklejoneMatch[1] to brutto (575,64)
      return this.parseNumber(sklejoneMatch[1]);
    }

    // Wzorzec 2: "Suma" z wartościami w tabeli
    const sumaMatch = text.match(/Suma\s+([\d\s,.]+)\s+([\d\s,.]+)\s+([\d\s,.]+)/i);
    if (sumaMatch) {
      return this.parseNumber(sumaMatch[3]);
    }

    const bruttoMatch = text.match(/brutto[:\s]*([\d,.]+)/i);
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
