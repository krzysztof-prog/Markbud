/**
 * LabelCheckExportService - Generowanie raportów Excel z wynikami sprawdzania etykiet
 *
 * Eksportuje wyniki LabelCheck do pliku Excel z:
 * - Nagłówkiem z informacjami o dostawie
 * - Podsumowaniem statystyk (OK, niezgodne, błędy)
 * - Tabelą z wynikami dla każdego zlecenia
 * - Kolorowaniem statusów (zielony=OK, czerwony=MISMATCH, żółty=błędy)
 */

import ExcelJS from 'exceljs';
import type { LabelCheckWithResults } from '../../repositories/LabelCheckRepository.js';

/**
 * Formatuje datę jako DD.MM.YYYY
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Tłumaczy status na polski
 */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    OK: 'OK',
    MISMATCH: 'Niezgodna',
    NO_FOLDER: 'Brak folderu',
    NO_BMP: 'Brak BMP',
    OCR_ERROR: 'Błąd OCR',
  };
  return statusMap[status] || status;
}

export class LabelCheckExportService {
  /**
   * Generuje raport Excel z wynikami sprawdzenia etykiet
   *
   * @param labelCheck - Sprawdzenie etykiet z wynikami
   * @returns Buffer z plikiem Excel
   */
  async exportToExcel(labelCheck: LabelCheckWithResults): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Metadane dokumentu
    workbook.creator = 'AKROBUD System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Kontrola etykiet');

    // ===============================
    // Nagłówek z informacjami o dostawie
    // ===============================

    // Tytuł
    const titleRow = worksheet.addRow(['Kontrola etykiet']);
    titleRow.font = { bold: true, size: 16 };
    titleRow.height = 24;
    worksheet.mergeCells('A1:F1');

    worksheet.addRow([]); // pusta linia

    // Informacje o dostawie
    const deliveryDateRow = worksheet.addRow(['Data dostawy:', formatDate(labelCheck.deliveryDate)]);
    deliveryDateRow.getCell(1).font = { bold: true };

    const checkDateRow = worksheet.addRow(['Data sprawdzenia:', formatDate(labelCheck.createdAt)]);
    checkDateRow.getCell(1).font = { bold: true };

    if (labelCheck.completedAt) {
      const completedRow = worksheet.addRow(['Zakończono:', formatDate(labelCheck.completedAt)]);
      completedRow.getCell(1).font = { bold: true };
    }

    worksheet.addRow([]); // pusta linia

    // ===============================
    // Podsumowanie
    // ===============================

    const summaryTitleRow = worksheet.addRow(['Podsumowanie']);
    summaryTitleRow.font = { bold: true, size: 14 };
    summaryTitleRow.height = 20;

    const totalRow = worksheet.addRow(['Razem zleceń:', labelCheck.totalOrders]);
    totalRow.getCell(1).font = { bold: true };

    const okRow = worksheet.addRow(['OK:', labelCheck.okCount]);
    okRow.getCell(1).font = { bold: true };
    okRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90EE90' }, // jasno zielony
    };

    const mismatchRow = worksheet.addRow(['Niezgodne:', labelCheck.mismatchCount]);
    mismatchRow.getCell(1).font = { bold: true };
    if (labelCheck.mismatchCount > 0) {
      mismatchRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF6B6B' }, // czerwony
      };
    }

    const errorRow = worksheet.addRow(['Błędy:', labelCheck.errorCount]);
    errorRow.getCell(1).font = { bold: true };
    if (labelCheck.errorCount > 0) {
      errorRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD93D' }, // żółty
      };
    }

    // Procent sukcesu
    const successRate =
      labelCheck.totalOrders > 0
        ? Math.round((labelCheck.okCount / labelCheck.totalOrders) * 100)
        : 0;
    const successRow = worksheet.addRow(['Procent sukcesu:', `${successRate}%`]);
    successRow.getCell(1).font = { bold: true };

    worksheet.addRow([]); // pusta linia
    worksheet.addRow([]); // pusta linia

    // ===============================
    // Tabela z wynikami
    // ===============================

    const tableHeaderRow = worksheet.addRow([
      'Nr zlecenia',
      'Status',
      'Oczekiwana data',
      'Wykryta data',
      'Wykryty tekst',
      'Błąd',
    ]);

    // Style nagłówków tabeli
    tableHeaderRow.font = { bold: true };
    tableHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }, // szary
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Dane wyników
    for (const result of labelCheck.results) {
      const row = worksheet.addRow([
        result.orderNumber,
        translateStatus(result.status),
        formatDate(result.expectedDate),
        result.detectedDate ? formatDate(result.detectedDate) : '-',
        result.detectedText || '-',
        result.errorMessage || '-',
      ]);

      // Kolorowanie statusów
      const statusCell = row.getCell(2);
      if (result.status === 'OK') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }, // zielony
        };
      } else if (result.status === 'MISMATCH') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }, // czerwony
        };
      } else {
        // NO_FOLDER, NO_BMP, OCR_ERROR
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD93D' }, // żółty
        };
      }

      // Obramowanie komórek
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // ===============================
    // Formatowanie kolumn
    // ===============================

    worksheet.getColumn(1).width = 15; // Nr zlecenia
    worksheet.getColumn(2).width = 14; // Status
    worksheet.getColumn(3).width = 16; // Oczekiwana data
    worksheet.getColumn(4).width = 16; // Wykryta data
    worksheet.getColumn(5).width = 20; // Wykryty tekst
    worksheet.getColumn(6).width = 40; // Błąd

    // Wyrównanie kolumn
    worksheet.getColumn(1).alignment = { horizontal: 'center' };
    worksheet.getColumn(2).alignment = { horizontal: 'center' };
    worksheet.getColumn(3).alignment = { horizontal: 'center' };
    worksheet.getColumn(4).alignment = { horizontal: 'center' };
    worksheet.getColumn(5).alignment = { horizontal: 'left' };
    worksheet.getColumn(6).alignment = { horizontal: 'left', wrapText: true };

    // ===============================
    // Generowanie bufora
    // ===============================

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generuje nazwę pliku dla eksportu
   *
   * @param labelCheck - Sprawdzenie etykiet
   * @returns Nazwa pliku (bez rozszerzenia)
   */
  generateFilename(labelCheck: LabelCheckWithResults): string {
    const deliveryDate = formatDate(labelCheck.deliveryDate).replace(/\./g, '-');
    return `kontrola-etykiet-${deliveryDate}`;
  }
}
