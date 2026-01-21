/**
 * Production Report PDF Service - Generowanie PDF zestawienia miesięcznego
 *
 * Generuje raport PDF zawierający:
 * - Nagłówek z miesiącem, rokiem i kursem EUR/PLN
 * - Tabelę zleceń z kolumnami (A4 landscape):
 *   Dostawa, Nr prod., Klient, Data prod., Okna, Jedn., Skrzyd., PLN, EUR,
 *   Materiał, Wsp., Jedn.zł, Nr FV
 * - Sekcję nietypówek
 * - Podsumowanie z przeliczeniem EUR na PLN
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import type { FullReport, ReportItem, ReportSummary } from './productionReportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nazwy miesięcy po polsku
const MONTH_NAMES = [
  '', 'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// Domyślny kurs EUR/PLN
const DEFAULT_EUR_RATE = 4.30;

export class ProductionReportPdfService {
  // Ścieżki do fontów wspierających polskie znaki
  private readonly FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
  private readonly BOLD_FONT = path.join(this.FONT_DIR, 'Roboto-Bold.ttf');
  private readonly REGULAR_FONT = path.join(this.FONT_DIR, 'Roboto-Regular.ttf');

  // Marginesy i stałe layoutu (landscape A4)
  private readonly PAGE_MARGIN = 30;
  private readonly TABLE_TOP = 100;

  // Szerokości kolumn tabeli (suma = ~757 dla A4 landscape z marginesami 30)
  // Kolumny bez RW Ok., RW Pr. i Dostawa
  private readonly COL_WIDTHS = {
    orderNumber: 70,     // Nr prod. (zwiększone)
    client: 130,         // Klient (znacznie więcej miejsca)
    productionDate: 55,  // Data prod.
    windows: 40,         // Okna
    units: 40,           // Jedn.
    sashes: 40,          // Skrzyd.
    valuePln: 80,        // PLN (zwiększone)
    valueEur: 70,        // EUR (zwiększone)
    materialValue: 75,   // Materiał (zwiększone)
    coefficient: 45,     // Wsp.
    unitValue: 55,       // Jedn.zł
    invoiceNumber: 80,   // Nr FV (zwiększone)
  };

  /**
   * Generuj PDF raportu produkcji
   */
  async generatePdf(report: FullReport, eurRate: number = DEFAULT_EUR_RATE): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Utwórz dokument PDF A4 poziomo (landscape) aby zmieścić wszystkie kolumny
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: {
            top: this.PAGE_MARGIN,
            bottom: this.PAGE_MARGIN,
            left: this.PAGE_MARGIN,
            right: this.PAGE_MARGIN,
          },
          bufferPages: true,
          compress: true,
        });

        // Buffer do przechowywania PDF
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Rejestracja fontów wspierających polskie znaki
        doc.registerFont('Roboto', this.REGULAR_FONT);
        doc.registerFont('Roboto-Bold', this.BOLD_FONT);

        // ==================== NAGŁÓWEK ====================
        this.drawHeader(doc, report.year, report.month, eurRate);

        // ==================== TABELA ZLECEŃ ====================
        this.drawOrdersTable(doc, report.items);

        // ==================== NIETYPÓWKI ====================
        this.drawAtypicalSection(doc, report.summary.atypical);

        // ==================== PODSUMOWANIE ====================
        this.drawSummarySection(doc, report.summary, report.items, eurRate);

        // ==================== STOPKI ====================
        this.addPageFooters(doc);

        // Zakończ dokument
        doc.end();

        logger.info(`Generated production report PDF for ${report.year}-${report.month}`);
      } catch (error) {
        logger.error('Error generating production report PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Rysuj nagłówek dokumentu
   */
  private drawHeader(doc: PDFKit.PDFDocument, year: number, month: number, eurRate: number): void {
    doc
      .fontSize(18)
      .font('Roboto-Bold')
      .text('Zestawienie Miesięczne Produkcji', { align: 'center' });

    doc.moveDown(0.3);

    doc
      .fontSize(14)
      .font('Roboto')
      .text(`${MONTH_NAMES[month]} ${year}`, { align: 'center' });

    doc.moveDown(0.2);

    // Wyświetl kurs EUR/PLN
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text(`Kurs EUR/PLN: ${eurRate.toFixed(2)}`, { align: 'center' });

    doc.fillColor('#000000');
    doc.moveDown(0.8);
  }

  /**
   * Rysuj tabelę zleceń
   */
  private drawOrdersTable(doc: PDFKit.PDFDocument, items: ReportItem[]): void {
    const startX = this.PAGE_MARGIN;
    let currentY = doc.y;

    // Nagłówki tabeli
    this.drawTableHeader(doc, startX, currentY);
    currentY = doc.y + 5;

    // Linia pod nagłówkami
    const totalWidth = Object.values(this.COL_WIDTHS).reduce((a, b) => a + b, 0);
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(startX, currentY)
      .lineTo(startX + totalWidth, currentY)
      .stroke();

    currentY += 5;

    // Wiersze z danymi (mniejsza czcionka dla landscape)
    doc.fontSize(7).font('Roboto').fillColor('#000000');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Sprawdź czy jest miejsce na wiersz (landscape ma mniej wysokości)
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = this.PAGE_MARGIN;
        this.drawTableHeader(doc, startX, currentY);
        currentY = doc.y + 10;
        doc.fontSize(7).font('Roboto').fillColor('#000000');
      }

      // Zebra striping - co drugi wiersz ciemniejszy
      if (i % 2 === 1) {
        doc
          .rect(startX, currentY - 2, totalWidth, 14)
          .fillOpacity(0.1)
          .fill('#6B7280')
          .fillOpacity(1)
          .fillColor('#000000');
      }

      this.drawTableRow(doc, item, startX, currentY);
      currentY += 14;
    }

    // Linia zamykająca tabelę
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(startX, currentY)
      .lineTo(startX + totalWidth, currentY)
      .stroke();

    doc.y = currentY + 15;
  }

  /**
   * Rysuj nagłówek tabeli z wszystkimi kolumnami (bez kolumny Dostawa)
   */
  private drawTableHeader(doc: PDFKit.PDFDocument, startX: number, startY: number): void {
    doc.fontSize(7).font('Roboto-Bold').fillColor('#374151');

    let x = startX;

    doc.text('Nr prod.', x, startY, { width: this.COL_WIDTHS.orderNumber, align: 'left' });
    x += this.COL_WIDTHS.orderNumber;

    doc.text('Klient', x, startY, { width: this.COL_WIDTHS.client, align: 'left' });
    x += this.COL_WIDTHS.client;

    doc.text('Data prod.', x, startY, { width: this.COL_WIDTHS.productionDate, align: 'center' });
    x += this.COL_WIDTHS.productionDate;

    doc.text('Okna', x, startY, { width: this.COL_WIDTHS.windows, align: 'center' });
    x += this.COL_WIDTHS.windows;

    doc.text('Jedn.', x, startY, { width: this.COL_WIDTHS.units, align: 'center' });
    x += this.COL_WIDTHS.units;

    doc.text('Skrzyd.', x, startY, { width: this.COL_WIDTHS.sashes, align: 'center' });
    x += this.COL_WIDTHS.sashes;

    doc.text('PLN', x, startY, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    x += this.COL_WIDTHS.valuePln;

    doc.text('EUR', x, startY, { width: this.COL_WIDTHS.valueEur, align: 'right' });
    x += this.COL_WIDTHS.valueEur;

    doc.text('Materiał', x, startY, { width: this.COL_WIDTHS.materialValue, align: 'right' });
    x += this.COL_WIDTHS.materialValue;

    doc.text('Wsp.', x, startY, { width: this.COL_WIDTHS.coefficient, align: 'right' });
    x += this.COL_WIDTHS.coefficient;

    doc.text('Jedn.zł', x, startY, { width: this.COL_WIDTHS.unitValue, align: 'right' });
    x += this.COL_WIDTHS.unitValue;

    doc.text('Nr FV', x, startY, { width: this.COL_WIDTHS.invoiceNumber, align: 'center' });

    doc.moveDown(0.5);
  }

  /**
   * Formatuj liczbę z separatorem tysięcy (spacja) i przecinkiem dziesiętnym
   */
  private formatNumber(value: number, decimals: number = 2): string {
    // Formatuj z polskim locale (spacja jako separator tysięcy, przecinek dziesiętny)
    return value.toLocaleString('pl-PL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
  }

  /**
   * Rysuj wiersz tabeli z wszystkimi kolumnami (bez kolumny Dostawa)
   */
  private drawTableRow(doc: PDFKit.PDFDocument, item: ReportItem, startX: number, y: number): void {
    let x = startX;

    // Nr produkcyjny
    doc.text(item.orderNumber, x, y, { width: this.COL_WIDTHS.orderNumber, align: 'left' });
    x += this.COL_WIDTHS.orderNumber;

    // Klient (obcinamy jeśli za długi - zwiększamy limit bo kolumna szersza)
    const client = item.client || '-';
    const truncatedClient = client.length > 18 ? client.substring(0, 17) + '…' : client;
    doc.text(truncatedClient, x, y, { width: this.COL_WIDTHS.client, align: 'left' });
    x += this.COL_WIDTHS.client;

    // Data produkcji
    const prodDate = item.productionDate
      ? new Date(item.productionDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
      : '-';
    doc.text(prodDate, x, y, { width: this.COL_WIDTHS.productionDate, align: 'center' });
    x += this.COL_WIDTHS.productionDate;

    // Okna
    doc.text(item.windows.toString(), x, y, { width: this.COL_WIDTHS.windows, align: 'center' });
    x += this.COL_WIDTHS.windows;

    // Jednostki
    doc.text(item.units.toString(), x, y, { width: this.COL_WIDTHS.units, align: 'center' });
    x += this.COL_WIDTHS.units;

    // Skrzydła
    doc.text(item.sashes.toString(), x, y, { width: this.COL_WIDTHS.sashes, align: 'center' });
    x += this.COL_WIDTHS.sashes;

    // Wartość PLN (pokazuj "-" dla 0)
    if (item.valuePln > 0) {
      doc.text(this.formatNumber(item.valuePln), x, y, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    }
    x += this.COL_WIDTHS.valuePln;

    // Wartość EUR (pokazuj "-" dla 0 lub null)
    if (item.valueEur !== null && item.valueEur > 0) {
      doc.text(this.formatNumber(item.valueEur), x, y, { width: this.COL_WIDTHS.valueEur, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.valueEur, align: 'right' });
    }
    x += this.COL_WIDTHS.valueEur;

    // Wartość materiału
    if (item.materialValue > 0) {
      doc.text(this.formatNumber(item.materialValue), x, y, { width: this.COL_WIDTHS.materialValue, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.materialValue, align: 'right' });
    }
    x += this.COL_WIDTHS.materialValue;

    // Współczynnik
    doc.text(item.coefficient || '—', x, y, { width: this.COL_WIDTHS.coefficient, align: 'right' });
    x += this.COL_WIDTHS.coefficient;

    // Jednostka wartości
    doc.text(item.unitValue || '—', x, y, { width: this.COL_WIDTHS.unitValue, align: 'right' });
    x += this.COL_WIDTHS.unitValue;

    // Nr FV (zwiększamy limit bo kolumna szersza)
    const invoice = item.invoiceNumber || '';
    const truncatedInvoice = invoice.length > 12 ? invoice.substring(0, 11) + '…' : invoice;
    doc.text(truncatedInvoice, x, y, { width: this.COL_WIDTHS.invoiceNumber, align: 'center' });
  }

  /**
   * Rysuj sekcję nietypówek
   */
  private drawAtypicalSection(
    doc: PDFKit.PDFDocument,
    atypical: ReportSummary['atypical']
  ): void {
    // Sprawdź czy są nietypówki
    if (atypical.windows === 0 && atypical.units === 0 && atypical.valuePln === 0) {
      return; // Nie rysuj sekcji jeśli puste
    }

    // Sprawdź czy jest miejsce
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    doc.moveDown(0.5);

    doc.fontSize(12).font('Roboto-Bold').fillColor('#B45309').text('Nietypówki');

    doc.moveDown(0.3);

    doc.fontSize(10).font('Roboto').fillColor('#000000');

    const atypicalData = [
      `Okna: ${atypical.windows}`,
      `Jednostki: ${atypical.units}`,
      `Skrzydła: ${atypical.sashes}`,
      `Wartość: ${this.formatNumber(atypical.valuePln)} PLN`,
    ].join('   |   ');

    doc.text(atypicalData);

    if (atypical.notes) {
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#6B7280').text(`Uwagi: ${atypical.notes}`);
    }

    doc.moveDown(1);
  }

  /**
   * Rysuj sekcję podsumowania
   */
  private drawSummarySection(
    doc: PDFKit.PDFDocument,
    summary: ReportSummary,
    items: ReportItem[],
    eurRate: number
  ): void {
    // Sprawdź czy jest miejsce
    if (doc.y > doc.page.height - 180) {
      doc.addPage();
    }

    // Reset pozycji X do lewego marginesu przed rysowaniem nagłówka
    doc.x = this.PAGE_MARGIN;
    doc.fontSize(12).font('Roboto-Bold').fillColor('#1F2937').text('Podsumowanie', this.PAGE_MARGIN, doc.y);

    doc.moveDown(0.3);

    // Tabela podsumowania
    const startX = this.PAGE_MARGIN;
    const colWidths = { label: 100, windows: 60, units: 60, sashes: 60, value: 90 };
    let y = doc.y;

    // Nagłówki
    doc.fontSize(9).font('Roboto-Bold').fillColor('#374151');
    let x = startX;
    doc.text('Kategoria', x, y, { width: colWidths.label });
    x += colWidths.label;
    doc.text('Okna', x, y, { width: colWidths.windows, align: 'right' });
    x += colWidths.windows;
    doc.text('Jednostki', x, y, { width: colWidths.units, align: 'right' });
    x += colWidths.units;
    doc.text('Skrzydła', x, y, { width: colWidths.sashes, align: 'right' });
    x += colWidths.sashes;
    doc.text('Wartość PLN', x, y, { width: colWidths.value, align: 'right' });

    y += 15;

    // Oblicz sumę EUR dla AKROBUD (zlecenia z klientem zawierającym 'AKROBUD')
    const akrobudEurTotal = items
      .filter(item => (item.client ?? '').toUpperCase().includes('AKROBUD'))
      .reduce((sum, item) => sum + (item.valueEur ?? 0), 0);
    const akrobudEurInPln = akrobudEurTotal * eurRate;

    // Wiersze podsumowania
    const rows = [
      { label: 'TYPOWE', data: summary.typowe, bg: null, isAkrobud: false },
      { label: 'AKROBUD', data: summary.akrobud, bg: '#DBEAFE', isAkrobud: true },
      { label: 'RESZTA', data: summary.reszta, bg: null, isAkrobud: false },
      { label: 'NIETYPÓWKI', data: summary.atypical, bg: '#FEF3C7', isAkrobud: false },
      { label: 'RAZEM PLN', data: summary.razem, bg: '#F3F4F6', bold: true, isAkrobud: false },
    ];

    for (const row of rows) {
      // Tło wiersza
      if (row.bg) {
        const totalRowWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
        doc.rect(startX - 2, y - 2, totalRowWidth + 4, 14).fill(row.bg);
      }

      doc.fontSize(9).font(row.bold ? 'Roboto-Bold' : 'Roboto').fillColor('#000000');
      x = startX;

      doc.text(row.label, x, y, { width: colWidths.label });
      x += colWidths.label;

      // Wyświetl "-" dla wartości 0
      const windowsText = row.data.windows > 0 ? row.data.windows.toString() : '—';
      doc.text(windowsText, x, y, { width: colWidths.windows, align: 'right' });
      x += colWidths.windows;

      const unitsText = row.data.units > 0 ? row.data.units.toString() : '—';
      doc.text(unitsText, x, y, { width: colWidths.units, align: 'right' });
      x += colWidths.units;

      const sashesText = row.data.sashes > 0 ? row.data.sashes.toString() : '—';
      doc.text(sashesText, x, y, { width: colWidths.sashes, align: 'right' });
      x += colWidths.sashes;

      // Dla AKROBUD pokaż wartość PLN (przeliczoną z EUR), a EUR w nawiasie
      if (row.isAkrobud && akrobudEurTotal > 0) {
        const plnFormatted = this.formatNumber(akrobudEurInPln);
        const eurFormatted = this.formatNumber(akrobudEurTotal);
        doc.text(`${plnFormatted} (${eurFormatted} EUR)`, x, y, { width: colWidths.value + 60, align: 'right' });
      } else {
        // Dla pozostałych wierszy - wyświetl "-" dla 0
        if (row.data.valuePln > 0) {
          doc.text(this.formatNumber(row.data.valuePln), x, y, { width: colWidths.value, align: 'right' });
        } else {
          doc.text('—', x, y, { width: colWidths.value, align: 'right' });
        }
      }

      y += 14;
    }

    // Oblicz sumę EUR z pozycji
    const totalEur = items.reduce((sum, item) => sum + (item.valueEur ?? 0), 0);

    // Dodaj wiersz EUR jeśli są zlecenia w EUR
    if (totalEur > 0) {
      const eurInPln = totalEur * eurRate;
      const totalWithEur = summary.razem.valuePln + eurInPln;

      y += 5;

      // ZLECENIA EUR
      const totalRowWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
      doc.rect(startX - 2, y - 2, totalRowWidth + 4, 14).fill('#D1FAE5');
      doc.fontSize(9).font('Roboto').fillColor('#000000');
      x = startX;
      doc.text('ZLECENIA EUR', x, y, { width: colWidths.label });
      x += colWidths.label;
      doc.text('—', x, y, { width: colWidths.windows, align: 'right' });
      x += colWidths.windows;
      doc.text('—', x, y, { width: colWidths.units, align: 'right' });
      x += colWidths.units;
      doc.text('—', x, y, { width: colWidths.sashes, align: 'right' });
      x += colWidths.sashes;

      const eurFormatted = this.formatNumber(totalEur);
      const eurInPlnFormatted = this.formatNumber(eurInPln);
      doc.text(`${eurFormatted} EUR (${eurInPlnFormatted} PLN)`, x, y, { width: colWidths.value + 60, align: 'right' });

      y += 14;

      // RAZEM (PLN + EUR)
      doc.rect(startX - 2, y - 2, totalRowWidth + 4, 14).fill('#E5E7EB');
      doc.fontSize(9).font('Roboto-Bold').fillColor('#000000');
      x = startX;
      doc.text('RAZEM (PLN + EUR)', x, y, { width: colWidths.label });
      x += colWidths.label;
      doc.text('—', x, y, { width: colWidths.windows, align: 'right' });
      x += colWidths.windows;
      doc.text('—', x, y, { width: colWidths.units, align: 'right' });
      x += colWidths.units;
      doc.text('—', x, y, { width: colWidths.sashes, align: 'right' });
      x += colWidths.sashes;

      doc.text(`${this.formatNumber(totalWithEur)} PLN`, x, y, { width: colWidths.value, align: 'right' });

      y += 20;

      // Info o kursie
      doc.fontSize(8).font('Roboto').fillColor('#6B7280');
      doc.text(`Kurs EUR/PLN: ${eurRate.toFixed(2)}`, startX, y);
    }

    y += 20;

    // Statystyki dodatkowe
    doc.fontSize(9).font('Roboto').fillColor('#374151');
    const avgPerUnit = summary.razem.units > 0 ? this.formatNumber(summary.razem.valuePln / summary.razem.units) : '—';
    doc.text(`Średnia wartość na jednostkę: ${avgPerUnit} PLN`, startX, y);
    y += 12;
    const avgPerDay = summary.workingDays > 0 ? this.formatNumber(summary.razem.valuePln / summary.workingDays) : '—';
    doc.text(`Średnia wartość na dzień roboczy (${summary.workingDays} dni): ${avgPerDay} PLN`, startX, y);
  }

  /**
   * Dodaj stopki do wszystkich stron
   */
  private addPageFooters(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);

      doc
        .fontSize(8)
        .font('Roboto')
        .fillColor('#9CA3AF')
        .text(
          `Strona ${range.start + i + 1} z ${range.count}`,
          this.PAGE_MARGIN,
          doc.page.height - 30,
          {
            align: 'center',
            width: doc.page.width - 2 * this.PAGE_MARGIN,
          }
        );
    }
  }

  /**
   * Generuj nazwę pliku PDF
   */
  generateFilename(year: number, month: number): string {
    const monthPadded = month.toString().padStart(2, '0');
    return `zestawienie_produkcji_${year}_${monthPadded}.pdf`;
  }
}

// Singleton eksport
export const productionReportPdfService = new ProductionReportPdfService();
