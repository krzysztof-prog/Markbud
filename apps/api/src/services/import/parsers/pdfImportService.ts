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
import type {
  IPdfImportService,
  ParsedPdfCeny,
  PdfProcessResult,
  ParserServiceConfig,
} from './types.js';

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
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        ...(parsed.currency === 'EUR'
          ? { valueEur: parsed.valueNetto }
          : { valuePln: parsed.valueNetto }),
      },
    });

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
    // PDF summary format:
    // "575,64\n468,00107,64\n23%" - brutto on top, then netto+VAT glued without space

    // Pattern 1: Look for glued netto+VAT after brutto (format: "575,64\n468,00107,64")
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      // sklejoneMatch[2] is netto (468,00)
      return this.parseNumber(sklejoneMatch[2]);
    }

    // Pattern 2: "Suma netto" directly
    const nettoMatch = text.match(/suma\s*netto[:\s]*([\d,.]+)/i);
    if (nettoMatch) {
      return this.parseNumber(nettoMatch[1]);
    }

    // Pattern 3: "Suma" with values in table (with spaces)
    const sumaMatch = text.match(/Suma\s+([\d\s,.]+)\s+([\d\s,.]+)\s+([\d\s,.]+)/i);
    if (sumaMatch) {
      return this.parseNumber(sumaMatch[1]);
    }

    // Pattern 4: "468,00 107,64 575,64" - netto, VAT, brutto with spaces
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
    // PDF format: "575,64\n468,00107,64" - brutto on top, then netto+VAT glued

    // Pattern 1: brutto before glued netto+VAT
    const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
    if (sklejoneMatch) {
      // sklejoneMatch[1] is brutto (575,64)
      return this.parseNumber(sklejoneMatch[1]);
    }

    // Pattern 2: "Suma" with values in table
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
