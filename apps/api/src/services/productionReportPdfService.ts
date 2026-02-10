/**
 * Production Report PDF Service - Generowanie PDF zestawienia miesięcznego
 *
 * Generuje raport PDF zawierający:
 * - Nagłówek z miesiącem, rokiem i kursem EUR/PLN
 * - Tabelę zleceń z kolumnami (A4 landscape):
 *   LP, Nr prod., Klient, Data prod., Okna, Jedn., Skrzyd., PLN, EUR,
 *   Materiał, Wsp., Jedn.zł, Nr FV
 * - Sekcję nietypówek
 * - Podsumowanie z przeliczeniem EUR na PLN
 * - Sumę materiału z rozbiciem na szyby, okucia, części
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
  private readonly ROW_HEIGHT = 14;

  // Szerokości kolumn tabeli (z kolumną LP)
  private readonly COL_WIDTHS = {
    lp: 25,              // LP (numer porządkowy)
    orderNumber: 65,     // Nr prod.
    client: 120,         // Klient
    productionDate: 50,  // Data prod.
    windows: 35,         // Okna
    units: 35,           // Jedn.
    sashes: 35,          // Skrzyd.
    valuePln: 75,        // PLN
    valueEur: 65,        // EUR
    materialValue: 70,   // Materiał
    coefficient: 40,     // Wsp.
    unitValue: 50,       // Jedn.zł
    invoiceNumber: 75,   // Nr FV
  };

  /**
   * Oblicz efektywną wartość PLN dla zlecenia (uwzględniając EUR)
   */
  private getEffectivePln(item: ReportItem, eurRate: number): number {
    if (item.valuePln > 0) return item.valuePln;
    if (item.valueEur !== null && item.valueEur > 0) return item.valueEur * eurRate;
    return 0;
  }

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
          autoFirstPage: true,
        });

        // Buffer do przechowywania PDF
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Rejestracja fontów wspierających polskie znaki
        doc.registerFont('Roboto', this.REGULAR_FONT);
        doc.registerFont('Roboto-Bold', this.BOLD_FONT);

        // Śledź ile stron z treścią mamy
        let contentPageCount = 1;

        // ==================== NAGŁÓWEK ====================
        this.drawHeader(doc, report.year, report.month, eurRate);

        // ==================== TABELA ZLECEŃ ====================
        contentPageCount = this.drawOrdersTable(doc, report.items, eurRate);

        // ==================== NIETYPÓWKI ====================
        this.drawAtypicalSection(doc, report.summary.atypical);

        // ==================== PODSUMOWANIE ====================
        this.drawSummarySection(doc, report.summary, report.items, eurRate);

        // ==================== SUMA MATERIAŁÓW ====================
        this.drawMaterialSummary(doc, report.items, eurRate);

        // ==================== STOPKI ====================
        // Pobierz faktyczną liczbę stron z treścią
        const range = doc.bufferedPageRange();
        contentPageCount = range.count;
        this.addPageFooters(doc, contentPageCount);

        // Zakończ dokument
        doc.end();

        logger.info(`Generated production report PDF for ${report.year}-${report.month} (${contentPageCount} pages)`);
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
   * Rysuj tabelę zleceń - zwraca liczbę stron
   */
  private drawOrdersTable(doc: PDFKit.PDFDocument, items: ReportItem[], eurRate: number): number {
    const startX = this.PAGE_MARGIN;
    let currentY = doc.y;
    let pageCount = 1;

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
        pageCount++;
        currentY = this.PAGE_MARGIN;
        this.drawTableHeader(doc, startX, currentY);
        currentY = doc.y + 10;
        doc.fontSize(7).font('Roboto').fillColor('#000000');
      }

      // Zebra striping - co drugi wiersz ciemniejszy
      if (i % 2 === 1) {
        doc
          .rect(startX, currentY - 2, totalWidth, this.ROW_HEIGHT)
          .fillOpacity(0.1)
          .fill('#6B7280')
          .fillOpacity(1)
          .fillColor('#000000');
      }

      this.drawTableRow(doc, item, startX, currentY, i + 1, eurRate);
      currentY += this.ROW_HEIGHT;
    }

    // Linia zamykająca tabelę
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(startX, currentY)
      .lineTo(startX + totalWidth, currentY)
      .stroke();

    doc.y = currentY + 15;
    return pageCount;
  }

  /**
   * Rysuj nagłówek tabeli z kolumną LP
   */
  private drawTableHeader(doc: PDFKit.PDFDocument, startX: number, startY: number): void {
    doc.fontSize(7).font('Roboto-Bold').fillColor('#374151');

    let x = startX;

    doc.text('LP', x, startY, { width: this.COL_WIDTHS.lp, align: 'center' });
    x += this.COL_WIDTHS.lp;

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
   * Rysuj wiersz tabeli z kolumną LP i przeliczeniem EUR->PLN dla WSP/JEDN
   */
  private drawTableRow(
    doc: PDFKit.PDFDocument,
    item: ReportItem,
    startX: number,
    y: number,
    lp: number,
    eurRate: number
  ): void {
    let x = startX;

    // LP (numer porządkowy)
    doc.text(lp.toString(), x, y, { width: this.COL_WIDTHS.lp, align: 'center' });
    x += this.COL_WIDTHS.lp;

    // Nr produkcyjny
    doc.text(item.orderNumber, x, y, { width: this.COL_WIDTHS.orderNumber, align: 'left' });
    x += this.COL_WIDTHS.orderNumber;

    // Klient (obcinamy jeśli za długi)
    const client = item.client || '-';
    const truncatedClient = client.length > 16 ? client.substring(0, 15) + '…' : client;
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

    // Wartość PLN (pokazuj "—" dla 0)
    if (item.valuePln > 0) {
      doc.text(this.formatNumber(item.valuePln), x, y, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.valuePln, align: 'right' });
    }
    x += this.COL_WIDTHS.valuePln;

    // Wartość EUR (pokazuj "—" dla 0 lub null)
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

    // Efektywna wartość PLN (uwzględniając EUR * kurs)
    const effectivePln = this.getEffectivePln(item, eurRate);

    // Współczynnik = efektywne PLN / materiał
    if (item.materialValue > 0 && effectivePln > 0) {
      const coeff = (effectivePln / item.materialValue).toFixed(2);
      doc.text(coeff, x, y, { width: this.COL_WIDTHS.coefficient, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.coefficient, align: 'right' });
    }
    x += this.COL_WIDTHS.coefficient;

    // Jednostka = (efektywne PLN - materiał) / ilość szyb
    if (item.totalGlassQuantity > 0 && effectivePln > 0) {
      const unitVal = Math.round((effectivePln - item.materialValue) / item.totalGlassQuantity);
      doc.text(unitVal.toString(), x, y, { width: this.COL_WIDTHS.unitValue, align: 'right' });
    } else {
      doc.text('—', x, y, { width: this.COL_WIDTHS.unitValue, align: 'right' });
    }
    x += this.COL_WIDTHS.unitValue;

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

    doc.fontSize(12).font('Roboto-Bold').fillColor('#B45309').text('Nietypówki', this.PAGE_MARGIN, doc.y);

    doc.moveDown(0.3);

    doc.fontSize(10).font('Roboto').fillColor('#000000');

    const atypicalData = [
      `Okna: ${atypical.windows}`,
      `Jednostki: ${atypical.units}`,
      `Skrzydła: ${atypical.sashes}`,
      `Wartość: ${this.formatNumber(atypical.valuePln)} PLN`,
    ].join('   |   ');

    doc.text(atypicalData, this.PAGE_MARGIN, doc.y);

    if (atypical.notes) {
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#6B7280').text(`Uwagi: ${atypical.notes}`, this.PAGE_MARGIN, doc.y);
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
      { label: 'TYPOWE', data: summary.typowe, bg: null as string | null, isAkrobud: false, bold: false },
      { label: 'AKROBUD', data: summary.akrobud, bg: '#DBEAFE', isAkrobud: true, bold: false },
      { label: 'RESZTA', data: summary.reszta, bg: null as string | null, isAkrobud: false, bold: false },
      { label: 'NIETYPÓWKI', data: summary.atypical, bg: '#FEF3C7', isAkrobud: false, bold: false },
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

      // Wyświetl "—" dla wartości 0
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
        // Dla pozostałych wierszy - wyświetl "—" dla 0
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

    doc.y = y + 15;
  }

  /**
   * Rysuj sekcję sumy materiałów z rozbiciem na szyby, okucia, części
   * + współczynniki globalnie i z podziałem AKROBUD / nie-AKROBUD
   */
  private drawMaterialSummary(
    doc: PDFKit.PDFDocument,
    items: ReportItem[],
    eurRate: number
  ): void {
    // Sprawdź czy jest miejsce (potrzebujemy ~200px)
    if (doc.y > doc.page.height - 220) {
      doc.addPage();
    }

    doc.moveDown(1);
    doc.fontSize(12).font('Roboto-Bold').fillColor('#1F2937').text('Zestawienie materiałów', this.PAGE_MARGIN, doc.y);
    doc.moveDown(0.3);

    const startX = this.PAGE_MARGIN;
    const colWidths = { label: 120, glazing: 85, fittings: 85, parts: 85, total: 85, coeff: 60 };
    let y = doc.y;

    // Nagłówki
    doc.fontSize(9).font('Roboto-Bold').fillColor('#374151');
    let x = startX;
    doc.text('Kategoria', x, y, { width: colWidths.label });
    x += colWidths.label;
    doc.text('Szyby', x, y, { width: colWidths.glazing, align: 'right' });
    x += colWidths.glazing;
    doc.text('Okucia', x, y, { width: colWidths.fittings, align: 'right' });
    x += colWidths.fittings;
    doc.text('Części', x, y, { width: colWidths.parts, align: 'right' });
    x += colWidths.parts;
    doc.text('Materiał', x, y, { width: colWidths.total, align: 'right' });
    x += colWidths.total;
    doc.text('Wsp.', x, y, { width: colWidths.coeff, align: 'right' });

    y += 15;

    // Linia pod nagłówkami
    const totalColWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(startX, y - 2)
      .lineTo(startX + totalColWidth, y - 2)
      .stroke();

    // Oblicz sumy
    const akrobudItems = items.filter(i => (i.client ?? '').toUpperCase().includes('AKROBUD'));
    const resztaItems = items.filter(i => !(i.client ?? '').toUpperCase().includes('AKROBUD'));

    // Funkcja pomocnicza do obliczenia sum
    const sumMaterials = (list: ReportItem[]) => ({
      glazing: list.reduce((s, i) => s + i.glazingValue, 0),
      fittings: list.reduce((s, i) => s + i.fittingsValue, 0),
      parts: list.reduce((s, i) => s + i.partsValue, 0),
      material: list.reduce((s, i) => s + i.materialValue, 0),
      effectivePln: list.reduce((s, i) => s + this.getEffectivePln(i, eurRate), 0),
    });

    const akrobudSums = sumMaterials(akrobudItems);
    const resztaSums = sumMaterials(resztaItems);
    const globalSums = sumMaterials(items);

    // Wiersze tabeli materiałów
    const materialRows = [
      { label: 'AKROBUD', sums: akrobudSums, bg: '#DBEAFE' as string | null, bold: false },
      { label: 'RESZTA', sums: resztaSums, bg: null as string | null, bold: false },
      { label: 'RAZEM', sums: globalSums, bg: '#F3F4F6' as string | null, bold: true },
    ];

    for (const row of materialRows) {
      if (row.bg) {
        doc.rect(startX - 2, y - 2, totalColWidth + 4, 14).fill(row.bg);
      }

      doc.fontSize(9).font(row.bold ? 'Roboto-Bold' : 'Roboto').fillColor('#000000');
      x = startX;

      doc.text(row.label, x, y, { width: colWidths.label });
      x += colWidths.label;

      doc.text(row.sums.glazing > 0 ? this.formatNumber(row.sums.glazing) : '—', x, y, { width: colWidths.glazing, align: 'right' });
      x += colWidths.glazing;

      doc.text(row.sums.fittings > 0 ? this.formatNumber(row.sums.fittings) : '—', x, y, { width: colWidths.fittings, align: 'right' });
      x += colWidths.fittings;

      doc.text(row.sums.parts > 0 ? this.formatNumber(row.sums.parts) : '—', x, y, { width: colWidths.parts, align: 'right' });
      x += colWidths.parts;

      doc.text(row.sums.material > 0 ? this.formatNumber(row.sums.material) : '—', x, y, { width: colWidths.total, align: 'right' });
      x += colWidths.total;

      // Współczynnik = efektywne PLN / materiał
      const coeff = row.sums.material > 0 ? (row.sums.effectivePln / row.sums.material).toFixed(2) : '—';
      doc.text(coeff, x, y, { width: colWidths.coeff, align: 'right' });

      y += 14;
    }

    // Linia zamykająca
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(startX, y)
      .lineTo(startX + totalColWidth, y)
      .stroke();

    doc.y = y + 10;
  }

  /**
   * Dodaj stopki do wszystkich stron (tylko strony z treścią)
   */
  private addPageFooters(doc: PDFKit.PDFDocument, totalPages: number): void {
    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);

      doc
        .fontSize(8)
        .font('Roboto')
        .fillColor('#9CA3AF')
        .text(
          `Strona ${i + 1} z ${range.count}`,
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
