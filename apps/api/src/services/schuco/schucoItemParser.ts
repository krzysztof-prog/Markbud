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
   * Format Schüco - specjalny format z metadanymi na początku:
   * - Wiersz 1: "Data zamówienia";"YYYY-MM-DDTHH:mm"
   * - Wiersz 2: "Nr zamówienia";"XX/YYYY/NNNNN"
   * - Wiersz 3: "Zlecenie";"NNNNNNNNN"
   * - Wiersz 4: "Obiekt";"";""
   * - Wiersz 5: Nagłówki: "Pozycja";"Artykuł";"";"Wysłany";...
   * - Wiersze 6+: Dane pozycji
   */
  async parseCSV(filePath: string): Promise<SchucoOrderItemRow[]> {
    logger.info(`[SchucoItemParser] Parsing CSV file: ${filePath}`);

    const results: SchucoOrderItemRow[] = [];

    // Wczytaj cały plik jako string
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    // Usuń BOM jeśli jest
    if (fileContent.charCodeAt(0) === 0xfeff) {
      fileContent = fileContent.substring(1);
    }

    // Podziel na wiersze
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 6) {
      logger.warn(`[SchucoItemParser] File has too few lines: ${lines.length}`);
      return results;
    }

    // Parsuj metadane z pierwszych wierszy
    const parseMetaLine = (line: string): string => {
      // Format: "Label";"Value" lub "Label";"Value";""
      const match = line.match(/^"[^"]*";"([^"]*)"/);
      return match ? match[1] : '';
    };

    const orderDate = parseMetaLine(lines[0]);
    const orderNumber = parseMetaLine(lines[1]);
    const orderName = parseMetaLine(lines[2]); // Zlecenie
    const object = parseMetaLine(lines[3]);

    logger.info(`[SchucoItemParser] Metadata - Date: ${orderDate}, Order: ${orderNumber}, Zlecenie: ${orderName}`);

    // Wiersz 5 (index 4) to nagłówki - pomijamy
    // Wiersze od 6 (index 5) to dane pozycji

    for (let i = 5; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;

      try {
        // Parsuj wiersz CSV (separator: ;, quote: ")
        const values = this.parseCSVLine(line);

        if (values.length < 6) {
          logger.warn(`[SchucoItemParser] Line ${i + 1} has too few columns: ${values.length}`);
          continue;
        }

        // Kolumny według screenshota i analizy:
        // 0: Pozycja (np. "1")
        // 1: Artykuł (nr, np. "18866201")
        // 2: Opis artykułu (np. "8866 Skrzydło 70/83 KMAT")
        // 3: Wysłany (np. "0/2")
        // 4: Jednostka (np. "szt.")
        // 5: Wymiary (np. "6000 mm")
        // 6: Konfiguracja
        // 7: Tydzień dostawy
        // 8: Śledzenie
        // 9: Komentarz
        // 10-11: Puste kolumny

        const position = parseInt(values[0] || '0', 10);
        if (position === 0 || isNaN(position)) {
          logger.warn(`[SchucoItemParser] Line ${i + 1} invalid position: ${values[0]}`);
          continue;
        }

        const { shipped, ordered } = this.parseQuantity(values[3] || '');

        const itemRow: SchucoOrderItemRow = {
          orderDate: this.cleanField(orderDate),
          orderNumber: this.cleanField(orderNumber),
          orderName: this.cleanField(orderName),
          object: this.cleanField(object),
          position: position,
          articleNumber: this.cleanField(values[1] || ''),
          articleDescription: this.cleanField(values[2] || ''),
          shippedQty: shipped,
          orderedQty: ordered,
          unit: this.cleanField(values[4] || 'szt.'),
          dimensions: this.cleanField(values[5] || ''),
          configuration: this.cleanField(values[6] || ''),
          deliveryWeek: this.cleanField(values[7] || ''),
          tracking: this.cleanField(values[8] || ''),
          comment: this.cleanField(values[9] || ''),
          rawData: { line: line },
        };

        // Waliduj wymagane pola
        if (this.isValidRow(itemRow)) {
          results.push(itemRow);
          logger.info(`[SchucoItemParser] Parsed item: Pos ${position}, Article ${itemRow.articleNumber}`);
        } else {
          logger.warn(`[SchucoItemParser] Skipping invalid row at line ${i + 1}:`, {
            position,
            articleNumber: itemRow.articleNumber,
          });
        }
      } catch (error) {
        logger.error(`[SchucoItemParser] Error parsing line ${i + 1}:`, error);
      }
    }

    logger.info(`[SchucoItemParser] Parsed ${results.length} item rows`);
    return results;
  }

  /**
   * Parsuje pojedynczą linię CSV (separator: ;, quote: ")
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ';') {
          // Field separator
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Don't forget the last field
    result.push(current);

    return result;
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
