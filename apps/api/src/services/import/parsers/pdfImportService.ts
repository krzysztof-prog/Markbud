/**
 * PDF Import Service
 *
 * Handles parsing and processing of PDF price files.
 * This is a refactored version of the PdfParser class with improved:
 * - Error handling
 * - Type safety
 * - Testability
 * - Separation of concerns
 *
 * IMPORTANT: This service is behind a feature flag.
 * Enable with ENABLE_NEW_PDF_PARSER=true or ENABLE_NEW_PARSERS=true
 */

import fs from 'fs';
import pdf from 'pdf-parse';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import { plnToGrosze, eurToCenty } from '@markbud/shared';
import type {
  IPdfImportService,
  ParsedPdfCeny,
  PdfProcessResult,
  ParserServiceConfig,
} from './types.js';
import { emitOrderUpdated } from '../../event-emitter.js';

/**
 * PDF Import Service Implementation
 *
 * Provides methods for parsing and processing price PDF files.
 * Extracted from the monolithic PdfParser for better maintainability.
 */
export class PdfImportService implements IPdfImportService {
  private prisma: PrismaClient;
  private debug: boolean;

  constructor(config: ParserServiceConfig) {
    this.prisma = config.prisma;
    this.debug = config.debug ?? false;
  }

  /**
   * Preview a PDF file without saving to database
   */
  async previewCenyPdf(filepath: string): Promise<ParsedPdfCeny> {
    return this.parseCenyPdf(filepath);
  }

  /**
   * Process and save PDF data to database
   */
  async processCenyPdf(filepath: string): Promise<PdfProcessResult> {
    const parsed = await this.parseCenyPdf(filepath);

    // Find order by number
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: parsed.orderNumber },
    });

    if (!order) {
      throw new Error(`Zlecenie ${parsed.orderNumber} nie znalezione w bazie danych`);
    }

    // Update order with PDF data
    // WAŻNE: Konwertujemy do groszy/centów przed zapisem do bazy
    // Dla AKROBUD: windowsNetValue = valueEur (z PDF)
    const isAkrobud = (order.client ?? '').toUpperCase().includes('AKROBUD');
    const eurValue = eurToCenty(parsed.valueNetto);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        ...(parsed.currency === 'EUR'
          ? {
              valueEur: eurValue,
              ...(isAkrobud ? { windowsNetValue: eurValue } : {}),
            }
          : { valuePln: plnToGrosze(parsed.valueNetto) }),
      },
    });

    // Emit realtime update
    emitOrderUpdated({ id: order.id });

    return {
      orderId: order.id,
      updated: true,
    };
  }

  /**
   * Parse PDF file with price data
   */
  private async parseCenyPdf(filepath: string): Promise<ParsedPdfCeny> {
    const dataBuffer = await fs.promises.readFile(filepath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    if (this.debug) {
      logger.debug('PDF text:', { text: text.substring(0, 1000) });
    }

    // Extract order number (5-digit number at the start, usually after "SUMA:")
    const orderNumber = this.extractOrderNumber(text);

    // Extract reference (e.g., D3056)
    const reference = this.extractReference(text);

    // Extract currency (EUR or PLN)
    const currency = this.extractCurrency(text);

    // Extract sums
    const valueNetto = this.extractSumaNetto(text);
    const valueBrutto = this.extractSumaBrutto(text);

    // Extract dimensions
    const dimensions = this.extractDimensions(text);

    // Extract counts
    const windowsCount = this.extractWindowsCount(text);
    const glassCount = this.extractGlassCount(text);

    // Extract weight
    const weight = this.extractWeight(text);

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
   * Extract order number from text
   */
  private extractOrderNumber(text: string): string {
    // Try "SUMA: ... 5-digit" pattern first
    const orderNumberMatch = text.match(/SUMA:.*?(\d{5})/s) || text.match(/(\d{5})\s*ZAMOWIENIE/i);
    if (orderNumberMatch) {
      return orderNumberMatch[1];
    }

    // Search for 5-digit number at the beginning of text
    const lines = text.split('\n');
    for (const line of lines.slice(0, 20)) {
      const match = line.match(/^\s*(\d{5})\s*$/);
      if (match) {
        return match[1];
      }
    }

    // Alternatively, look for pattern "53375" etc.
    const fiveDigitMatch = text.match(/\b(5\d{4})\b/);
    if (fiveDigitMatch) {
      return fiveDigitMatch[1];
    }

    return 'UNKNOWN';
  }

  /**
   * Extract reference from text
   */
  private extractReference(text: string): string {
    const referenceMatch =
      text.match(/Nr Referencyjny\s*([A-Z]\d+)/i) ||
      text.match(/Referencja\s*([A-Z]\d+)/i) ||
      text.match(/\b([A-Z]\d{4})\b/);

    return referenceMatch ? referenceMatch[1] : '';
  }

  /**
   * Extract currency from text
   */
  private extractCurrency(text: string): 'EUR' | 'PLN' {
    const isEur = text.includes('\u20AC') || text.includes('EUR');
    return isEur ? 'EUR' : 'PLN';
  }

  /**
   * Extract netto sum from PDF text
   */
  private extractSumaNetto(text: string): number {
    // Pattern 1: "Towar" row - format: "Towar14 733,43    1 178,67\n15 912,10"
    // where netto and VAT are glued with "Towar", brutto is on next line
    // Works for PLN PDFs
    const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (towarMatch) {
      // towarMatch[1] is netto
      return this.parseNumber(towarMatch[1]);
    }

    // Pattern 2: EUR summary format - "1 399,74\n1 138,00261,74\n23%"
    // where brutto is before glued netto+VAT, and VAT percentage at end
    // Numbers can have spaces as thousands separator (e.g., "1 399,74")
    const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
    if (eurPodsumowanieMatch) {
      // eurPodsumowanieMatch[2] is netto (first of the glued ones)
      return this.parseNumber(eurPodsumowanieMatch[2]);
    }

    // Pattern 3: EUR format - "Suma    1 147,00    263,81    1 410,81"
    // Table: netto, VAT, brutto separated by spaces/tabs
    const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (sumaEurMatch) {
      // sumaEurMatch[1] is netto
      return this.parseNumber(sumaEurMatch[1]);
    }

    // Pattern 4: "Suma netto" directly with value (e.g., in column header)
    // This pattern is less accurate, used as fallback
    const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
    if (nettoMatch) {
      return this.parseNumber(nettoMatch[1]);
    }

    // Pattern 5: Glued values - "575,64\n468,00107,64" (brutto\nnetto+vat)
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      return this.parseNumber(sklejoneMatch[2]);
    }

    // Pattern 6: Three numbers in a row - "468,00 107,64 575,64"
    const tripleMatch = text.match(/([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})\s+([\d]+[,.][\d]{2})/);
    if (tripleMatch) {
      return this.parseNumber(tripleMatch[1]);
    }

    return 0;
  }

  /**
   * Extract brutto sum from PDF text
   */
  private extractSumaBrutto(text: string): number {
    // Pattern 1: "Towar" row with brutto on next line
    // Format: "Towar14 733,43    1 178,67\n15 912,10"
    const towarMatch = text.match(/Towar\s*[\d\s]+[,.]\d{2}\s+[\d\s]+[,.]\d{2}\s*\n\s*([\d\s]+[,.]\d{2})/i);
    if (towarMatch) {
      // towarMatch[1] is brutto (from next line)
      return this.parseNumber(towarMatch[1]);
    }

    // Pattern 2: EUR summary format - "1 399,74\n1 138,00261,74\n23%"
    // where brutto is before glued netto+VAT
    const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
    if (eurPodsumowanieMatch) {
      // eurPodsumowanieMatch[1] is brutto
      return this.parseNumber(eurPodsumowanieMatch[1]);
    }

    // Pattern 3: EUR format - "Suma    1 147,00    263,81    1 410,81"
    // Table: netto, VAT, brutto (third value)
    const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
    if (sumaEurMatch) {
      // sumaEurMatch[3] is brutto
      return this.parseNumber(sumaEurMatch[3]);
    }

    // Pattern 4: Glued values - "575,64\n468,00107,64" (brutto\nnetto+vat)
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      return this.parseNumber(sklejoneMatch[1]);
    }

    // Pattern 5: "brutto" with value
    const bruttoMatch = text.match(/brutto[:\s]*([\d\s,.]+)/i);
    if (bruttoMatch) {
      return this.parseNumber(bruttoMatch[1]);
    }

    return 0;
  }

  /**
   * Extract window dimensions from text
   */
  private extractDimensions(text: string): { width: number; height: number } | undefined {
    // Look for pattern "2690 x 1195" or "Wymiary w mm 2690 x 1195"
    const dimMatch = text.match(/(\d{3,4})\s*[xX\u00D7]\s*(\d{3,4})/);
    if (dimMatch) {
      return {
        width: parseInt(dimMatch[1]),
        height: parseInt(dimMatch[2]),
      };
    }
    return undefined;
  }

  /**
   * Extract windows count from text
   */
  private extractWindowsCount(text: string): number | undefined {
    const windowsCountMatch = text.match(/[oo]scie[zz]nic[:\s]+(\d+)/i);
    return windowsCountMatch ? parseInt(windowsCountMatch[1]) : undefined;
  }

  /**
   * Extract glass count from text
   */
  private extractGlassCount(text: string): number | undefined {
    const glassCountMatch = text.match(/szkle[nn][:\s]+(\d+)/i);
    return glassCountMatch ? parseInt(glassCountMatch[1]) : undefined;
  }

  /**
   * Extract weight from text
   */
  private extractWeight(text: string): number | undefined {
    const weightMatch = text.match(/waga[:\s]+([\d,.]+)/i);
    return weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : undefined;
  }

  /**
   * Parse number from Polish format (comma as decimal separator)
   */
  private parseNumber(str: string): number {
    // Remove spaces and replace comma with dot
    const cleaned = str.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
}

/**
 * Create a new PDF import service instance
 */
export function createPdfImportService(config: ParserServiceConfig): IPdfImportService {
  return new PdfImportService(config);
}
