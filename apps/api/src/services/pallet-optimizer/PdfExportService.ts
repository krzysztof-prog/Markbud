/**
 * PDF Export Service - Generowanie PDF z optymalizacją palet
 */

import PDFDocument from 'pdfkit';
import type { OptimizationResult } from './PalletOptimizerService.js';
import { logger } from '../../utils/logger.js';

export class PdfExportService {
    // Stałe dla layoutu
    private readonly PAGE_BREAK_PALLET = 650;  // Próg dla nowej palety
    private readonly PAGE_BREAK_ROW = 750;     // Próg dla nowego wiersza
    private readonly TABLE_LEFT = 70;
    private readonly COL_WIDTHS = {
        lp: 30,
        width: 80,
        height: 80,
        profile: 80,
        depth: 70,
        quantity: 60,
        order: 100,
    };

    /**
     * Generuj PDF z wynikiem optymalizacji
     */
    async generatePdf(result: OptimizationResult): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Utwórz dokument PDF
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50,
                    },
                    bufferPages: true,  // Enable page buffering for footer support
                });

                // Buffer do przechowywania PDF
                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // ==================== NAGŁÓWEK ====================
                doc
                    .fontSize(20)
                    .font('Helvetica-Bold')
                    .text('Optymalizacja Pakowania Palet', { align: 'center' });

                doc.moveDown(0.5);

                doc
                    .fontSize(12)
                    .font('Helvetica')
                    .text(`Dostawa ID: ${result.deliveryId}`, { align: 'center' });

                doc
                    .text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, {
                        align: 'center',
                    });

                doc.moveDown(1);

                // ==================== PODSUMOWANIE ====================
                doc.fontSize(14).font('Helvetica-Bold').text('Podsumowanie:', { underline: true });

                doc.moveDown(0.3);

                doc.fontSize(11).font('Helvetica');

                const summaryY = doc.y;
                const leftColumn = 70;
                const rightColumn = 300;

                doc.text(`Liczba palet:`, leftColumn, summaryY);
                doc.text(`${result.totalPallets}`, rightColumn, summaryY);

                doc.text(`Liczba okien:`, leftColumn, doc.y + 5);
                doc.text(`${result.summary.totalWindows}`, rightColumn, doc.y);

                doc.text(`Średnie wykorzystanie:`, leftColumn, doc.y + 5);
                doc.text(`${result.summary.averageUtilization.toFixed(1)}%`, rightColumn, doc.y);

                doc.moveDown(1.5);

                // ==================== SZCZEGÓŁY PALET ====================
                doc.fontSize(14).font('Helvetica-Bold').text('Szczegóły Palet:', { underline: true });

                doc.moveDown(0.5);

                // Oblicz całkowitą szerokość tabeli raz
                const totalTableWidth = Object.values(this.COL_WIDTHS).reduce((a, b) => a + b, 0);

                // Iteruj przez palety
                for (const pallet of result.pallets) {
                    // Sprawdź czy jest miejsce na nową paletę (jeśli nie - nowa strona)
                    if (doc.y > this.PAGE_BREAK_PALLET) {
                        doc.addPage();
                    }

                    // Nagłówek palety
                    doc
                        .fontSize(12)
                        .font('Helvetica-Bold')
                        .fillColor('#2563eb') // Niebieski
                        .text(
                            `${pallet.palletType} (${pallet.palletWidthMm}mm) - Wykorzystanie: ${pallet.utilizationPercent.toFixed(1)}%`
                        );

                    doc.fillColor('#000000'); // Powrót do czarnego

                    doc.moveDown(0.2);

                    // Informacje o palecie
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Głębokość: ${pallet.usedDepthMm}mm / ${pallet.maxDepthMm}mm`);

                    doc.moveDown(0.3);

                    // Rysuj nagłówki tabeli (funkcja pomocnicza)
                    this.drawTableHeaders(doc);

                    // Linia pod nagłówkami
                    const lineY = doc.y;
                    doc
                        .strokeColor('#d1d5db')
                        .lineWidth(0.5)
                        .moveTo(this.TABLE_LEFT, lineY)
                        .lineTo(this.TABLE_LEFT + totalTableWidth, lineY)
                        .stroke();

                    doc.moveDown(0.2);

                    // Wiersze z oknami (posortowane od najszerszego)
                    doc.fontSize(9).font('Helvetica').fillColor('#000000');

                    pallet.windows.forEach((window, idx) => {
                        // POPRAWKA: Sprawdź czy jest miejsce na wiersz (jeśli nie - nowa strona z nagłówkami)
                        if (doc.y > this.PAGE_BREAK_ROW) {
                            doc.addPage();
                            // Narysuj nagłówki na nowej stronie
                            this.drawTableHeaders(doc);
                            // Linia pod nagłówkami
                            const newLineY = doc.y;
                            doc
                                .strokeColor('#d1d5db')
                                .lineWidth(0.5)
                                .moveTo(this.TABLE_LEFT, newLineY)
                                .lineTo(this.TABLE_LEFT + totalTableWidth, newLineY)
                                .stroke();
                            doc.moveDown(0.2);
                            doc.fontSize(9).font('Helvetica').fillColor('#000000');
                        }

                        const rowY = doc.y;
                        let currentX = this.TABLE_LEFT;

                        doc.text(`${idx + 1}`, currentX, rowY, { width: this.COL_WIDTHS.lp, align: 'center' });
                        currentX += this.COL_WIDTHS.lp;

                        doc.text(`${window.widthMm} mm`, currentX, rowY, {
                            width: this.COL_WIDTHS.width,
                            align: 'center',
                        });
                        currentX += this.COL_WIDTHS.width;

                        doc.text(`${window.heightMm} mm`, currentX, rowY, {
                            width: this.COL_WIDTHS.height,
                            align: 'center',
                        });
                        currentX += this.COL_WIDTHS.height;

                        doc.text(window.profileType, currentX, rowY, {
                            width: this.COL_WIDTHS.profile,
                            align: 'center',
                        });
                        currentX += this.COL_WIDTHS.profile;

                        doc.text(`${window.depthMm} mm`, currentX, rowY, {
                            width: this.COL_WIDTHS.depth,
                            align: 'center',
                        });
                        currentX += this.COL_WIDTHS.depth;

                        doc.text(`${window.quantity}`, currentX, rowY, {
                            width: this.COL_WIDTHS.quantity,
                            align: 'center',
                        });
                        currentX += this.COL_WIDTHS.quantity;

                        doc.text(window.orderNumber, currentX, rowY, {
                            width: this.COL_WIDTHS.order,
                            align: 'left',
                        });

                        doc.moveDown(0.4);
                    });

                    doc.moveDown(0.5);

                    // Linia po palecie
                    const separatorY = doc.y;
                    doc
                        .strokeColor('#e5e7eb')
                        .lineWidth(1)
                        .moveTo(this.TABLE_LEFT, separatorY)
                        .lineTo(this.TABLE_LEFT + totalTableWidth, separatorY)
                        .stroke();

                    doc.moveDown(1);
                }

                // ==================== STOPKA ====================
                // Get the range of pages that need footers
                const range = doc.bufferedPageRange();

                // Add footer to each page in the buffer
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(range.start + i);

                    doc
                        .fontSize(8)
                        .font('Helvetica')
                        .fillColor('#6b7280')
                        .text(
                            `Strona ${range.start + i + 1} z ${range.count} | Wygenerowano przez System AKROBUD`,
                            50,
                            doc.page.height - 40,
                            {
                                align: 'center',
                                width: doc.page.width - 100,
                            }
                        );
                }

                // Zakończ dokument
                doc.end();

                logger.info(`Generated PDF for delivery ${result.deliveryId}`);
            } catch (error) {
                logger.error('Error generating PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Rysuj nagłówki tabeli (funkcja pomocnicza)
     */
    private drawTableHeaders(doc: PDFKit.PDFDocument): void {
        const tableTop = doc.y;

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#4b5563'); // Szary

        let currentX = this.TABLE_LEFT;

        doc.text('Lp', currentX, tableTop, { width: this.COL_WIDTHS.lp, align: 'center' });
        currentX += this.COL_WIDTHS.lp;

        doc.text('Szerokość', currentX, tableTop, { width: this.COL_WIDTHS.width, align: 'center' });
        currentX += this.COL_WIDTHS.width;

        doc.text('Wysokość', currentX, tableTop, { width: this.COL_WIDTHS.height, align: 'center' });
        currentX += this.COL_WIDTHS.height;

        doc.text('Profil', currentX, tableTop, { width: this.COL_WIDTHS.profile, align: 'center' });
        currentX += this.COL_WIDTHS.profile;

        doc.text('Głębokość', currentX, tableTop, { width: this.COL_WIDTHS.depth, align: 'center' });
        currentX += this.COL_WIDTHS.depth;

        doc.text('Ilość', currentX, tableTop, { width: this.COL_WIDTHS.quantity, align: 'center' });
        currentX += this.COL_WIDTHS.quantity;

        doc.text('Zlecenie', currentX, tableTop, { width: this.COL_WIDTHS.order, align: 'center' });

        doc.moveDown(0.3);
    }

    /**
     * Generuj nazwę pliku PDF
     */
    generateFilename(deliveryId: number): string {
        const date = new Date().toISOString().split('T')[0];
        return `palety_dostawa_${deliveryId}_${date}.pdf`;
    }
}
