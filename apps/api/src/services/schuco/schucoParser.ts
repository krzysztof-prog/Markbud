import fs from 'fs';
import csvParser from 'csv-parser';
import stripBomStream from 'strip-bom-stream';
import { logger } from '../../utils/logger.js';

export interface SchucoDeliveryRow {
  orderDate: string;        // Kolumna 1: Data zamówienia
  orderNumber: string;      // Kolumna 2: Nr zamówienia
  projectNumber: string;    // Kolumna 3: Numer projektu
  orderName: string;        // Kolumna 4: Zlecenie
  shippingStatus: string;   // Kolumna 5: Status wysyłki
  deliveryWeek: string;     // Kolumna 6: Tydzień dostawy
  deliveryType: string;     // Kolumna 7: Rodzaj dostawy
  tracking: string;         // Kolumna 8: Śledzenie
  complaint: string;        // Kolumna 9: Reklamacja
  orderType: string;        // Kolumna 10: rodzaj zamówienia
  totalAmount: string;      // Kolumna 11: Suma
  rawData: Record<string, string>; // Cały wiersz
}

export class SchucoParser {
  /**
   * Parse Schuco CSV file
   * Format: semicolon (;) separated, DD.MM.YYYY date format
   */
  async parseCSV(filePath: string): Promise<SchucoDeliveryRow[]> {
    logger.info(`[SchucoParser] Parsing CSV file: ${filePath}`);

    return new Promise((resolve, reject) => {
      const results: SchucoDeliveryRow[] = [];
      const stream = fs.createReadStream(filePath);

      stream
        .pipe(stripBomStream()) // Remove UTF-8 BOM if present
        .pipe(
          csvParser({
            separator: ';',
            quote: '"',
            escape: '"',
          })
        )
        .on('data', (row: Record<string, string>) => {
          try {
            // Skip empty rows
            const values = Object.values(row);
            if (values.every((v) => !v || v.trim() === '')) {
              return;
            }

            // Map columns based on position
            // Headers: "Data zamówienia";"Nr zamówienia";"Numer projektu";"Zlecenie";"Status wysyłki";"Tydzień dostawy";"Rodzaj dostawy";"Śledzenie";"Reklamacja";"rodzaj zamówienia";"Suma"
            const columns = Object.keys(row);

            const deliveryRow: SchucoDeliveryRow = {
              orderDate: row[columns[0]] || '',
              orderNumber: row[columns[1]] || '',
              projectNumber: row[columns[2]] || '',
              orderName: row[columns[3]] || '',
              shippingStatus: row[columns[4]] || '',
              deliveryWeek: row[columns[5]] || '',
              deliveryType: row[columns[6]] || '',
              tracking: row[columns[7]] || '',
              complaint: row[columns[8]] || '',
              orderType: row[columns[9]] || '',
              totalAmount: row[columns[10]] || '',
              rawData: row,
            };

            // Clean up data - remove newlines and extra whitespace
            deliveryRow.orderDate = this.cleanField(deliveryRow.orderDate);
            deliveryRow.orderNumber = this.cleanField(deliveryRow.orderNumber);
            deliveryRow.projectNumber = this.cleanField(deliveryRow.projectNumber);
            deliveryRow.orderName = this.cleanField(deliveryRow.orderName);
            deliveryRow.shippingStatus = this.cleanField(deliveryRow.shippingStatus);
            deliveryRow.deliveryWeek = this.cleanField(deliveryRow.deliveryWeek);
            deliveryRow.deliveryType = this.cleanField(deliveryRow.deliveryType);
            deliveryRow.tracking = this.cleanField(deliveryRow.tracking);
            deliveryRow.complaint = this.cleanField(deliveryRow.complaint);
            deliveryRow.orderType = this.cleanField(deliveryRow.orderType);
            deliveryRow.totalAmount = this.cleanField(deliveryRow.totalAmount);

            // Validate essential fields
            if (this.isValidRow(deliveryRow)) {
              results.push(deliveryRow);
            } else {
              logger.warn('[SchucoParser] Skipping invalid row:', deliveryRow);
            }
          } catch (error) {
            logger.error('[SchucoParser] Error parsing row:', error, row);
          }
        })
        .on('end', () => {
          logger.info(`[SchucoParser] Parsed ${results.length} rows`);
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('[SchucoParser] CSV parsing error:', error);
          reject(error);
        });
    });
  }

  /**
   * Clean field - remove newlines, extra spaces, etc.
   */
  private cleanField(value: string): string {
    if (!value) return '';
    return value
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate if row has essential data
   */
  private isValidRow(row: SchucoDeliveryRow): boolean {
    // Must have at least order date and order number
    return !!(row.orderDate && row.orderNumber);
  }

  /**
   * Parse date from DD.MM.YYYY format
   */
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format date to ISO string for database
   */
  formatDateForDB(dateStr: string): string | null {
    const date = this.parseDate(dateStr);
    return date ? date.toISOString() : null;
  }
}
