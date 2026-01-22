import fs from 'fs';
import csvParser from 'csv-parser';
import stripBomStream from 'strip-bom-stream';
import { logger } from '../../utils/logger.js';

/**
 * Interfejs pozycji zamówienia z CSV Schüco
 * Kolumny CSV:
 * A: Data zamówienia (np. 2026-01-20T00:00)
 * B: Nr zamówienia (np. 49/2026/53859)
 * C: Zlecenie (np. 136781674)
 * D: Obiekt (pusty)
 * E: Pozycja (1, 2, 3...)
 * F: Artykuł (nr artykułu np. 19411460)
 * G: Opis artykułu (np. "9411 Ościeżnica 82/70 wąs swą NB")
 * H: Wysłany (np. 0/6 - wysłane/zamówione)
 * I: Jednostka (szt.)
 * J: Wymiary (np. 6000 mm)
 * K: Konfiguracja
 * L: Tydzień dostawy (np. 2026/7)
 * M: Śledzenie
 * N: Komentarz
 */
export interface SchucoOrderItemRow {
  orderDate: string;
  orderNumber: string;
  orderName: string; // Zlecenie (numer Schüco)
  object: string;
  position: number;
  articleNumber: string;
  articleDescription: string;
  shippedQty: number;
  orderedQty: number;
  unit: string;
  dimensions: string;
  configuration: string;
  deliveryWeek: string;
  tracking: string;
  comment: string;
  rawData: Record<string, string>;
}

export class SchucoItemParser {
  /**
   * Parsuje CSV z pozycjami zamówienia
   * Format: średnik (;) jako separator, UTF-8
   */
  async parseCSV(filePath: string): Promise<SchucoOrderItemRow[]> {
    logger.info(`[SchucoItemParser] Parsing CSV file: ${filePath}`);

    return new Promise((resolve, reject) => {
      const results: SchucoOrderItemRow[] = [];
      const stream = fs.createReadStream(filePath);

      stream
        .pipe(stripBomStream()) // Usuń UTF-8 BOM jeśli jest
        .pipe(
          csvParser({
            separator: ';',
            quote: '"',
            escape: '"',
          })
        )
        .on('data', (row: Record<string, string>) => {
          try {
            // Pomiń puste wiersze
            const values = Object.values(row);
            if (values.every((v) => !v || v.trim() === '')) {
              return;
            }

            // Mapuj kolumny według pozycji
            const columns = Object.keys(row);

            // Parsuj ilość z formatu "0/6" -> shippedQty=0, orderedQty=6
            const { shipped, ordered } = this.parseQuantity(row[columns[7]] || '');

            const position = parseInt(row[columns[4]] || '0', 10);
            if (position === 0 || isNaN(position)) {
              // Pomiń nagłówek lub nieprawidłowy wiersz
              return;
            }

            const itemRow: SchucoOrderItemRow = {
              orderDate: this.cleanField(row[columns[0]] || ''),
              orderNumber: this.cleanField(row[columns[1]] || ''),
              orderName: this.cleanField(row[columns[2]] || ''),
              object: this.cleanField(row[columns[3]] || ''),
              position: position,
              articleNumber: this.cleanField(row[columns[5]] || ''),
              articleDescription: this.cleanField(row[columns[6]] || ''),
              shippedQty: shipped,
              orderedQty: ordered,
              unit: this.cleanField(row[columns[8]] || 'szt.'),
              dimensions: this.cleanField(row[columns[9]] || ''),
              configuration: this.cleanField(row[columns[10]] || ''),
              deliveryWeek: this.cleanField(row[columns[11]] || ''),
              tracking: this.cleanField(row[columns[12]] || ''),
              comment: this.cleanField(row[columns[13]] || ''),
              rawData: row,
            };

            // Waliduj wymagane pola
            if (this.isValidRow(itemRow)) {
              results.push(itemRow);
            } else {
              logger.warn('[SchucoItemParser] Skipping invalid row:', { position, articleNumber: itemRow.articleNumber });
            }
          } catch (error) {
            logger.error('[SchucoItemParser] Error parsing row:', error, row);
          }
        })
        .on('end', () => {
          logger.info(`[SchucoItemParser] Parsed ${results.length} item rows`);
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('[SchucoItemParser] CSV parsing error:', error);
          stream.destroy();
          reject(error);
        });
    });
  }

  /**
   * Parsuje ilość z formatu "X/Y" gdzie X=wysłane, Y=zamówione
   * np. "0/6" -> { shipped: 0, ordered: 6 }
   * np. "3/6" -> { shipped: 3, ordered: 6 }
   */
  private parseQuantity(quantityStr: string): { shipped: number; ordered: number } {
    if (!quantityStr) {
      return { shipped: 0, ordered: 0 };
    }

    const parts = quantityStr.split('/');
    if (parts.length !== 2) {
      // Może być tylko liczba bez "/"
      const num = parseInt(quantityStr.trim(), 10);
      return { shipped: 0, ordered: isNaN(num) ? 0 : num };
    }

    const shipped = parseInt(parts[0].trim(), 10);
    const ordered = parseInt(parts[1].trim(), 10);

    return {
      shipped: isNaN(shipped) ? 0 : shipped,
      ordered: isNaN(ordered) ? 0 : ordered,
    };
  }

  /**
   * Czyści pole - usuwa znaki nowej linii, dodatkowe spacje
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
   * Waliduje czy wiersz ma wymagane dane
   */
  private isValidRow(row: SchucoOrderItemRow): boolean {
    // Musi mieć pozycję i numer artykułu
    return !!(row.position > 0 && row.articleNumber);
  }

  /**
   * Parsuje tydzień dostawy z formatu "YYYY/W" (np. "2026/7")
   * Zwraca datę poniedziałku danego tygodnia
   */
  parseDeliveryWeek(weekStr: string): Date | null {
    if (!weekStr) return null;

    // Format: "2026/7" lub "2026/07"
    const parts = weekStr.split('/');
    if (parts.length !== 2) return null;

    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);

    if (isNaN(year) || isNaN(week) || week < 1 || week > 53) return null;

    // Znajdź poniedziałek danego tygodnia ISO
    // Tydzień 1 to tydzień zawierający 4 stycznia
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Niedziela = 7
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

    const targetDate = new Date(firstMonday);
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);

    return targetDate;
  }
}
