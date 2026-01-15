/**
 * Production Report PDF Service - Generowanie PDF zestawienia miesięcznego
 *
 * Generuje raport PDF zawierający:
 * - Nagłówek z miesiącem, rokiem i kursem EUR/PLN
 * - Tabelę zleceń z kolumnami: Nr prod., Klient, Data prod., Okna, Jedn., Skrzyd., PLN, EUR, Nr FV
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

  // Marginesy i stałe layoutu
  private readonly PAGE_MARGIN = 40;
  private readonly TABLE_TOP = 100;

  // Szerokości kolumn tabeli (suma = ~515 dla A4 portrait)
  // Usunięto kolumny rwOkucia i rwProfile zgodnie z wymaganiami
  private readonly COL_WIDTHS = {
    orderNumber: 70,
    client: 100,
    productionDate: 50,
    windows: 40,
    units: 40,
    sashes: 40,
    valuePln: 70,
    valueEur: 55,
    invoiceNumber: 50,
  };

  /**
   * Generuj PDF raportu produkcji
   */
  async generatePdf(report: FullReport, eurRate: number = DEFAULT_EUR_RATE): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Utwórz dokument PDF A4 pionowo
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'portrait',
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

    // Wiersze z danymi
    doc.fontSize(8).font('Roboto').fillColor('#000000');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Sprawdź czy jest miejsce na wiersz
      if (currentY > doc.page.height - 120) {
        doc.addPage();
        currentY = this.PAGE_MARGIN;
        this.drawTableHeader(doc, startX, currentY);
        currentY = doc.y + 10;
        doc.fontSize(8).font('Roboto').fillColor('#000000');
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
   * Rysuj nagłówek tabeli
   */
  private drawTableHeader(doc: PDFKit.PDFDocument, startX: number, startY: number): void {
    doc.fontSize(8).font('Roboto-Bold').fillColor('#374151');

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

    doc.text('FV', x, startY, { width: this.COL_WIDTHS.invoiceNumber, align: 'center' });

    doc.moveDown(0.5);
  }

  /**
   * Rysuj wiersz tabeli
   */
  private drawTableRow(doc: PDFKit.PDFDocument, item: ReportItem, startX: number, y: number): void {
    let x = startX;

    // Nr produkcyjny
    doc.text(item.orderNumber, x, y, { width: this.COL_WIDTHS.orderNumber, align: 'left' });
    x += this.COL_WIDTHS.orderNumber;

    // Klient (obcinamy jeśli za długi)
    const client = item.client || '-';
    const truncatedClient = client.length > 15 ? client.substring(0, 14) + '…' : client;
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

    // Wartość PLN
    const plnValue = item.valuePln.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    doc.text(plnValue, x, y, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    x += this.COL_WIDTHS.valuePln;

    // Wartość EUR
    if (item.valueEur !== null) {
      const eurValue = item.valueEur.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      doc.text(eurValue, x, y, { width: this.COL_WIDTHS.valueEur, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.valueEur, align: 'right' });
    }
    x += this.COL_WIDTHS.valueEur;

    // Nr FV
    const invoice = item.invoiceNumber || '';
    const truncatedInvoice = invoice.length > 10 ? invoice.substring(0, 9) + '…' : invoice;
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
      `Wartość: ${atypical.valuePln.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN`,
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

    // Wiersze podsumowania
    const rows = [
      { label: 'TYPOWE', data: summary.typowe, bg: null },
      { label: 'AKROBUD', data: summary.akrobud, bg: '#DBEAFE' },
      { label: 'RESZTA', data: summary.reszta, bg: null },
      { label: 'NIETYPÓWKI', data: summary.atypical, bg: '#FEF3C7' },
      { label: 'RAZEM PLN', data: summary.razem, bg: '#F3F4F6', bold: true },
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

      doc.text(row.data.windows.toString(), x, y, { width: colWidths.windows, align: 'right' });
      x += colWidths.windows;

      doc.text(row.data.units.toString(), x, y, { width: colWidths.units, align: 'right' });
      x += colWidths.units;

      doc.text(row.data.sashes.toString(), x, y, { width: colWidths.sashes, align: 'right' });
      x += colWidths.sashes;

      const valuePln = row.data.valuePln.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      doc.text(valuePln, x, y, { width: colWidths.value, align: 'right' });

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

      const eurFormatted = totalEur.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const eurInPlnFormatted = eurInPln.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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

      const totalFormatted = totalWithEur.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      doc.text(`${totalFormatted} PLN`, x, y, { width: colWidths.value, align: 'right' });

      y += 20;

      // Info o kursie
      doc.fontSize(8).font('Roboto').fillColor('#6B7280');
      doc.text(`Kurs EUR/PLN: ${eurRate.toFixed(2)}`, startX, y);
    }

    y += 20;

    // Statystyki dodatkowe
    doc.fontSize(9).font('Roboto').fillColor('#374151');
    doc.text(`Średnia wartość na jednostkę: ${summary.razem.units > 0 ? (summary.razem.valuePln / summary.razem.units).toFixed(2) : '—'} PLN`, startX, y);
    y += 12;
    doc.text(`Średnia wartość na dzień roboczy (${summary.workingDays} dni): ${summary.workingDays > 0 ? (summary.razem.valuePln / summary.workingDays).toFixed(2) : '—'} PLN`, startX, y);
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
