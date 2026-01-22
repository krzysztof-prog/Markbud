/**
 * Monthly Report Export Service
 * Exports monthly reports to Excel and PDF formats
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { MonthlyReportData } from './monthlyReportService.js';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MonthlyReportExportService {
  // Ścieżki do fontów wspierających polskie znaki
  private readonly FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
  private readonly BOLD_FONT = path.join(this.FONT_DIR, 'Roboto-Bold.ttf');
  private readonly REGULAR_FONT = path.join(this.FONT_DIR, 'Roboto-Regular.ttf');

  /**
   * Export monthly report to Excel format
   */
  async exportToExcel(reportData: MonthlyReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Zestawienie ${reportData.month}/${reportData.year}`);

    // Set up column widths
    worksheet.columns = [
      { header: 'Nr zlecenia', key: 'orderNumber', width: 15 },
      { header: 'Nr faktury', key: 'invoiceNumber', width: 15 },
      { header: 'Okna', key: 'windows', width: 10 },
      { header: 'Skrzydła', key: 'sashes', width: 10 },
      { header: 'Jednostki', key: 'units', width: 10 },
      { header: 'Wartość PLN', key: 'valuePln', width: 15 },
      { header: 'Wartość EUR', key: 'valueEur', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    reportData.items.forEach((item) => {
      worksheet.addRow({
        orderNumber: item.orderNumber,
        invoiceNumber: item.invoiceNumber || '-',
        windows: item.windowsCount,
        sashes: item.sashesCount,
        units: item.unitsCount,
        valuePln: item.valuePln ? groszeToPln(item.valuePln as Grosze).toFixed(2) : '-',
        valueEur: item.valueEur ? centyToEur(item.valueEur as Centy).toFixed(2) : '-',
      });
    });

    // Add totals row
    const totalsRow = worksheet.addRow({
      orderNumber: 'RAZEM',
      invoiceNumber: '',
      windows: reportData.totalWindows,
      sashes: reportData.totalSashes,
      units: reportData.items.reduce((sum, item) => sum + item.unitsCount, 0),
      valuePln: groszeToPln(reportData.totalValuePln as Grosze).toFixed(2),
      valueEur: centyToEur(reportData.totalValueEur as Centy).toFixed(2),
    });

    // Style totals row
    totalsRow.font = { bold: true, size: 12 };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC99' },
    };

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Align numeric columns to the right
    ['windows', 'sashes', 'units', 'valuePln', 'valueEur'].forEach((key) => {
      const column = worksheet.getColumn(key);
      column.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    // Add summary section
    const summaryStartRow = worksheet.rowCount + 3;
    worksheet.getCell(`A${summaryStartRow}`).value = 'Podsumowanie:';
    worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 14 };

    worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Liczba zleceń:';
    worksheet.getCell(`B${summaryStartRow + 1}`).value = reportData.totalOrders;

    worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Łączna liczba okien:';
    worksheet.getCell(`B${summaryStartRow + 2}`).value = reportData.totalWindows;

    worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Łączna liczba skrzydeł:';
    worksheet.getCell(`B${summaryStartRow + 3}`).value = reportData.totalSashes;

    worksheet.getCell(`A${summaryStartRow + 4}`).value = 'Łączna wartość PLN:';
    worksheet.getCell(`B${summaryStartRow + 4}`).value = groszeToPln(reportData.totalValuePln as Grosze).toFixed(2);

    worksheet.getCell(`A${summaryStartRow + 5}`).value = 'Łączna wartość EUR:';
    worksheet.getCell(`B${summaryStartRow + 5}`).value = centyToEur(reportData.totalValueEur as Centy).toFixed(2);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export monthly report to PDF format
   */
  async exportToPdf(reportData: MonthlyReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Rejestracja fontów wspierających polskie znaki
      doc.registerFont('Roboto', this.REGULAR_FONT);
      doc.registerFont('Roboto-Bold', this.BOLD_FONT);

      // Title
      doc.fontSize(20)
        .font('Roboto-Bold')
        .text(`Zestawienie miesięczne ${reportData.month}/${reportData.year}`, {
          align: 'center',
        });

      doc.moveDown(1.5);

      // Table setup
      const tableTop = 120;
      const rowHeight = 25;
      const columns = [
        { key: 'orderNumber', label: 'Nr zlecenia', x: 50, width: 80 },
        { key: 'invoiceNumber', label: 'Nr faktury', x: 135, width: 80 },
        { key: 'windows', label: 'Okna', x: 220, width: 60 },
        { key: 'sashes', label: 'Skrzydła', x: 285, width: 70 },
        { key: 'units', label: 'Jednostki', x: 360, width: 80 },
        { key: 'valuePln', label: 'PLN', x: 445, width: 80 },
        { key: 'valueEur', label: 'EUR', x: 530, width: 80 },
      ];

      // Draw header
      doc.fontSize(10).font('Roboto-Bold');
      columns.forEach((col) => {
        doc.text(col.label, col.x, tableTop, { width: col.width, align: 'center' });
      });

      // Draw header line
      doc.moveTo(50, tableTop + 15)
        .lineTo(610, tableTop + 15)
        .stroke();

      // Draw data rows
      doc.font('Roboto').fontSize(9);
      let currentY = tableTop + rowHeight;

      reportData.items.forEach((item) => {
        // Check if we need a new page
        if (currentY > 500) {
          doc.addPage({ layout: 'landscape', margin: 50 });
          currentY = 50;
        }

        const rowData = [
          { text: item.orderNumber, align: 'left' },
          { text: item.invoiceNumber || '-', align: 'left' },
          { text: item.windowsCount.toString(), align: 'right' },
          { text: item.sashesCount.toString(), align: 'right' },
          { text: item.unitsCount.toString(), align: 'right' },
          { text: item.valuePln ? groszeToPln(item.valuePln as Grosze).toFixed(2) : '-', align: 'right' },
          { text: item.valueEur ? centyToEur(item.valueEur as Centy).toFixed(2) : '-', align: 'right' },
        ];

        columns.forEach((col, idx) => {
          doc.text(rowData[idx].text, col.x, currentY, {
            width: col.width,
            align: rowData[idx].align as 'left' | 'right' | 'center',
          });
        });

        currentY += rowHeight;
      });

      // Draw totals row
      currentY += 10;
      doc.moveTo(50, currentY - 5)
        .lineTo(610, currentY - 5)
        .stroke();

      doc.font('Roboto-Bold');
      const totalUnits = reportData.items.reduce((sum, item) => sum + item.unitsCount, 0);

      const totalsData = [
        { text: 'RAZEM', align: 'left' },
        { text: '', align: 'left' },
        { text: reportData.totalWindows.toString(), align: 'right' },
        { text: reportData.totalSashes.toString(), align: 'right' },
        { text: totalUnits.toString(), align: 'right' },
        { text: groszeToPln(reportData.totalValuePln as Grosze).toFixed(2), align: 'right' },
        { text: centyToEur(reportData.totalValueEur as Centy).toFixed(2), align: 'right' },
      ];

      columns.forEach((col, idx) => {
        doc.text(totalsData[idx].text, col.x, currentY, {
          width: col.width,
          align: totalsData[idx].align as 'left' | 'right' | 'center',
        });
      });

      // Summary section
      currentY += 50;
      doc.fontSize(12).font('Roboto-Bold');
      doc.text('Podsumowanie:', 50, currentY);

      currentY += 25;
      doc.fontSize(10).font('Roboto');

      const summaryLines = [
        `Liczba zleceń: ${reportData.totalOrders}`,
        `Łączna liczba okien: ${reportData.totalWindows}`,
        `Łączna liczba skrzydeł: ${reportData.totalSashes}`,
        `Łączna wartość PLN: ${groszeToPln(reportData.totalValuePln as Grosze).toFixed(2)}`,
        `Łączna wartość EUR: ${centyToEur(reportData.totalValueEur as Centy).toFixed(2)}`,
      ];

      summaryLines.forEach((line) => {
        doc.text(line, 50, currentY);
        currentY += 20;
      });

      // Footer
      doc.fontSize(8)
        .font('Roboto')
        .text(
          `Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );

      doc.end();
    });
  }

  /**
   * Get filename for export
   */
  getFilename(year: number, month: number, format: 'xlsx' | 'pdf'): string {
    const monthStr = month.toString().padStart(2, '0');
    return `zestawienie_${year}_${monthStr}.${format}`;
  }
}
