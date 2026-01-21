/**
 * Attendance Handler - HTTP request handlers for BZ module
 * Moduł BZ - widok miesięczny obecności pracowników
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AttendanceService, type UpdateDayInput } from '../services/attendanceService.js';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Walidatory
const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const updateDayBodySchema = z.object({
  workerId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie YYYY-MM-DD'),
  type: z.enum(['work', 'sick', 'vacation', 'absent', 'clear']),
});

const exportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  format: z.enum(['xlsx', 'pdf']),
});

export class AttendanceHandler {
  constructor(private service: AttendanceService) {}

  /**
   * GET /attendance/monthly?year=2026&month=1
   * Pobiera dane obecności dla wszystkich pracowników
   */
  async getMonthlyAttendance(
    request: FastifyRequest<{ Querystring: { year: string; month: string } }>,
    reply: FastifyReply
  ) {
    const query = monthlyQuerySchema.parse(request.query);
    const { year, month } = query;

    const data = await this.service.getMonthlyAttendance(year, month);
    const isEditable = this.service.isMonthEditable(year, month);

    return reply.send({
      ...data,
      isEditable,
    });
  }

  /**
   * PUT /attendance/day
   * Aktualizuje obecność dla pojedynczego dnia
   */
  async updateDay(
    request: FastifyRequest<{ Body: UpdateDayInput }>,
    reply: FastifyReply
  ) {
    const body = updateDayBodySchema.parse(request.body);

    await this.service.updateDay(body);

    return reply.send({ success: true });
  }

  /**
   * GET /attendance/export?year=2026&month=1&format=xlsx
   * Eksportuje dane do Excel lub PDF
   */
  async exportAttendance(
    request: FastifyRequest<{ Querystring: { year: string; month: string; format: string } }>,
    reply: FastifyReply
  ) {
    const query = exportQuerySchema.parse(request.query);
    const { year, month, format } = query;

    // Pobierz dane
    const data = await this.service.getMonthlyAttendance(year, month);

    // Nazwy miesięcy po polsku
    const monthNames = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
    ];
    const monthName = monthNames[month - 1];
    const filename = `obecnosci_${monthName}_${year}`;

    if (format === 'xlsx') {
      return this.generateExcel(data, reply, filename, monthName, year);
    } else {
      return this.generatePdf(data, reply, filename, monthName, year);
    }
  }

  /**
   * Generuje plik Excel z danymi obecności
   */
  private async generateExcel(
    data: Awaited<ReturnType<AttendanceService['getMonthlyAttendance']>>,
    reply: FastifyReply,
    filename: string,
    _monthName: string,
    _year: number
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Obecności');

    // Mapowanie typów na wyświetlane wartości
    const typeToDisplay = (type: string | null): string => {
      if (type === 'work') return '8';
      if (type === 'sick') return 'CH';
      if (type === 'vacation') return 'UW';
      if (type === 'absent') return 'N';
      return '';
    };

    // Nagłówki - pierwszy wiersz
    const headers = ['Pracownik'];
    for (let day = 1; day <= data.month.daysInMonth; day++) {
      headers.push(day.toString());
    }
    headers.push('Σ godz.', 'UW', 'CH', 'N');

    worksheet.addRow(headers);

    // Style nagłówka
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    // Oznacz weekendy (szare tło)
    for (const weekend of data.month.weekends) {
      const col = worksheet.getColumn(weekend + 1); // +1 bo pierwsza kolumna to Pracownik
      col.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      });
    }

    // Dane pracowników
    for (const worker of data.workers) {
      const row: (string | number)[] = [worker.name];

      for (let day = 1; day <= data.month.daysInMonth; day++) {
        const dayData = worker.days[day.toString()];
        row.push(dayData ? typeToDisplay(dayData.type) : '');
      }

      row.push(
        worker.summary.totalHours,
        worker.summary.vacationDays,
        worker.summary.sickDays,
        worker.summary.absentDays
      );

      worksheet.addRow(row);
    }

    // Auto-fit kolumn
    worksheet.columns.forEach((column) => {
      column.width = 5;
    });
    worksheet.getColumn(1).width = 20; // Kolumna z nazwiskiem

    // Ostatnie 4 kolumny (podsumowania)
    const lastCols = [
      data.month.daysInMonth + 2,
      data.month.daysInMonth + 3,
      data.month.daysInMonth + 4,
      data.month.daysInMonth + 5,
    ];
    for (const colNum of lastCols) {
      worksheet.getColumn(colNum).width = 8;
    }

    // Generuj buffer
    const buffer = await workbook.xlsx.writeBuffer();

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return reply.send(Buffer.from(buffer));
  }

  /**
   * Generuje plik PDF z danymi obecności
   */
  private async generatePdf(
    data: Awaited<ReturnType<AttendanceService['getMonthlyAttendance']>>,
    reply: FastifyReply,
    filename: string,
    monthName: string,
    year: number
  ) {
    // Mapowanie typów na wyświetlane wartości
    const typeToDisplay = (type: string | null): string => {
      if (type === 'work') return '8';
      if (type === 'sick') return 'CH';
      if (type === 'vacation') return 'UW';
      if (type === 'absent') return 'N';
      return '';
    };

    // Twórz PDF w orientacji poziomej
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 30, bottom: 30, left: 30, right: 30 },
    });

    // Zbieraj chunki
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Tytuł
    doc.fontSize(16).text(`Obecności - ${monthName} ${year}`, { align: 'center' });
    doc.moveDown();

    // Oblicz szerokości kolumn
    const pageWidth = 842 - 60; // A4 landscape minus marginesy
    const nameColWidth = 100;
    const summaryColWidth = 30;
    const dayColWidth = Math.min(20, (pageWidth - nameColWidth - summaryColWidth * 4) / data.month.daysInMonth);

    let y = doc.y;
    const rowHeight = 15;
    const headerHeight = 20;

    // Nagłówki
    doc.fontSize(8).font('Helvetica-Bold');
    let x = 30;

    doc.text('Pracownik', x, y, { width: nameColWidth });
    x += nameColWidth;

    for (let day = 1; day <= data.month.daysInMonth; day++) {
      const isWeekend = data.month.weekends.includes(day);
      if (isWeekend) {
        doc.rect(x, y - 2, dayColWidth, headerHeight).fill('#E0E0E0');
        doc.fill('#000000');
      }
      doc.text(day.toString(), x, y, { width: dayColWidth, align: 'center' });
      x += dayColWidth;
    }

    // Nagłówki podsumowań
    doc.text('Σh', x, y, { width: summaryColWidth, align: 'center' });
    x += summaryColWidth;
    doc.text('UW', x, y, { width: summaryColWidth, align: 'center' });
    x += summaryColWidth;
    doc.text('CH', x, y, { width: summaryColWidth, align: 'center' });
    x += summaryColWidth;
    doc.text('N', x, y, { width: summaryColWidth, align: 'center' });

    y += headerHeight;

    // Dane pracowników
    doc.font('Helvetica').fontSize(7);

    for (const worker of data.workers) {
      x = 30;

      // Nazwisko
      doc.text(worker.name, x, y, { width: nameColWidth });
      x += nameColWidth;

      // Dni
      for (let day = 1; day <= data.month.daysInMonth; day++) {
        const isWeekend = data.month.weekends.includes(day);
        if (isWeekend) {
          doc.rect(x, y - 2, dayColWidth, rowHeight).fill('#E0E0E0');
          doc.fill('#000000');
        }

        const dayData = worker.days[day.toString()];
        const value = dayData ? typeToDisplay(dayData.type) : '';
        doc.text(value, x, y, { width: dayColWidth, align: 'center' });
        x += dayColWidth;
      }

      // Podsumowania
      doc.text(worker.summary.totalHours.toString(), x, y, { width: summaryColWidth, align: 'center' });
      x += summaryColWidth;
      doc.text(worker.summary.vacationDays.toString(), x, y, { width: summaryColWidth, align: 'center' });
      x += summaryColWidth;
      doc.text(worker.summary.sickDays.toString(), x, y, { width: summaryColWidth, align: 'center' });
      x += summaryColWidth;
      doc.text(worker.summary.absentDays.toString(), x, y, { width: summaryColWidth, align: 'center' });

      y += rowHeight;

      // Nowa strona jeśli potrzeba
      if (y > 550) {
        doc.addPage();
        y = 30;
      }
    }

    // Legenda
    doc.moveDown();
    doc.fontSize(8);
    doc.text('Legenda: 8 = Praca (8h), CH = Choroba, UW = Urlop, N = Nieobecność', 30, y + 20);

    // Zakończ dokument
    doc.end();

    // Poczekaj na zakończenie
    await new Promise<void>((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return reply.send(pdfBuffer);
  }
}
