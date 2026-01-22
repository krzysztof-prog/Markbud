/**
 * PDF Export Service - Generowanie PDF z optymalizacją palet
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import type { OptimizationResult, OptimizedPallet } from './PalletOptimizerService.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stałe dla wizualizacji
const MAX_OVERHANG_MM = 700;
const VIS_WIDTH = 400;  // Szerokość wizualizacji w punktach PDF
const VIS_HEIGHT = 200; // Wysokość wizualizacji w punktach PDF
const VIS_PADDING = 10;

// Kolory profili (w formacie hex)
const PROFILE_COLORS: Record<string, { fill: string; stroke: string }> = {
    VLAK: { fill: '#3B82F6', stroke: '#2563EB' },
    BLOK: { fill: '#10B981', stroke: '#059669' },
    szyba: { fill: '#F59E0B', stroke: '#D97706' },
    VARIANT: { fill: '#8B5CF6', stroke: '#7C3AED' },
};
const DEFAULT_COLOR = { fill: '#6B7280', stroke: '#4B5563' };

export class PdfExportService {
    // Stałe dla layoutu
    private readonly PAGE_BREAK_PALLET = 500;  // Próg dla nowej palety (zmniejszony dla wizualizacji)
    private readonly PAGE_BREAK_ROW = 720;     // Próg dla nowego wiersza (obniżony)
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

    // Ścieżki do fontów wspierających polskie znaki
    private readonly FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
    private readonly BOLD_FONT = path.join(this.FONT_DIR, 'Roboto-Bold.ttf');
    private readonly REGULAR_FONT = path.join(this.FONT_DIR, 'Roboto-Regular.ttf');

    /**
     * Generuj PDF z wynikiem optymalizacji
     */
    async generatePdf(result: OptimizationResult): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                // Utwórz dokument PDF z obsługą Unicode
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50,
                    },
                    bufferPages: true,  // Enable page buffering for footer support
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
                doc
                    .fontSize(20)
                    .font('Roboto-Bold')
                    .text('Optymalizacja Pakowania Palet', { align: 'center' });

                doc.moveDown(0.5);

                doc
                    .fontSize(12)
                    .font('Roboto')
                    .text(`Dostawa ID: ${result.deliveryId}`, { align: 'center' });

                doc
                    .text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, {
                        align: 'center',
                    });

                doc.moveDown(1);

                // ==================== PODSUMOWANIE ====================
                doc.fontSize(14).font('Roboto-Bold').text('Podsumowanie:', { underline: true });

                doc.moveDown(0.3);

                doc.fontSize(11).font('Roboto');

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
                doc.fontSize(14).font('Roboto-Bold').text('Szczegóły Palet:', { underline: true });

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
                        .font('Roboto-Bold')
                        .fillColor('#2563eb') // Niebieski
                        .text(
                            `${pallet.palletType} (${pallet.palletLengthMm}mm) - Wykorzystanie: ${pallet.utilizationPercent.toFixed(1)}%`
                        );

                    doc.fillColor('#000000'); // Powrót do czarnego

                    doc.moveDown(0.2);

                    // Informacje o palecie
                    doc.fontSize(10).font('Roboto');
                    doc.text(`Głębokość: ${pallet.usedDepthMm}mm / ${pallet.maxDepthMm}mm`);

                    doc.moveDown(0.3);

                    // Wizualizacja palety
                    this.drawPalletVisualization(doc, pallet);

                    doc.moveDown(0.5);

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
                    doc.fontSize(9).font('Roboto').fillColor('#000000');

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
                            doc.fontSize(9).font('Roboto').fillColor('#000000');
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
                        .font('Roboto')
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

        doc.fontSize(9).font('Roboto-Bold').fillColor('#4b5563'); // Szary

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
     * Rysuj wizualizację palety
     */
    private drawPalletVisualization(doc: PDFKit.PDFDocument, pallet: OptimizedPallet): void {
        const startX = this.TABLE_LEFT;
        const startY = doc.y;

        // Oblicz skalę
        const totalWidthMm = pallet.palletLengthMm + MAX_OVERHANG_MM;
        const totalDepthMm = pallet.maxDepthMm;

        const drawableWidth = VIS_WIDTH - 2 * VIS_PADDING;
        const drawableHeight = VIS_HEIGHT - 2 * VIS_PADDING;

        const scaleX = drawableWidth / totalWidthMm;
        const scaleY = drawableHeight / totalDepthMm;
        const scale = Math.min(scaleX, scaleY);

        const actualWidth = totalWidthMm * scale;
        const actualHeight = totalDepthMm * scale;

        const offsetX = startX + VIS_PADDING + (drawableWidth - actualWidth) / 2;
        const offsetY = startY + VIS_PADDING;

        // Rysuj tło palety
        const palletWidthPx = pallet.palletLengthMm * scale;
        const overhangWidthPx = MAX_OVERHANG_MM * scale;

        // Strefa palety (szara)
        doc
            .rect(offsetX, offsetY, palletWidthPx, actualHeight)
            .fillAndStroke('#F3F4F6', '#9CA3AF');

        // Strefa overhang (żółta, przerywana)
        doc
            .rect(offsetX + palletWidthPx, offsetY, overhangWidthPx, actualHeight)
            .fillOpacity(0.3)
            .fillAndStroke('#FEF3C7', '#F59E0B');

        doc.fillOpacity(1);

        // Rysuj okna
        let currentY = 0;
        for (const window of pallet.windows) {
            const windowWidth = window.widthMm * scale;
            const windowHeight = window.depthMm * scale;
            const windowX = offsetX;
            const windowY = offsetY + currentY;

            const color = PROFILE_COLORS[window.profileType] || DEFAULT_COLOR;

            doc
                .rect(windowX, windowY, windowWidth, windowHeight - 1)
                .fillAndStroke(color.fill, color.stroke);

            // Etykieta wymiaru (jeśli jest miejsce)
            if (windowHeight > 12 && windowWidth > 40) {
                doc
                    .fontSize(7)
                    .font('Roboto')
                    .fillColor('#FFFFFF')
                    .text(
                        `${window.widthMm}`,
                        windowX + 2,
                        windowY + windowHeight / 2 - 4,
                        { width: windowWidth - 4, align: 'center' }
                    );
            }

            currentY += windowHeight;
        }

        // Wymiary - szerokość palety
        doc
            .strokeColor('#6B7280')
            .lineWidth(0.5)
            .moveTo(offsetX, offsetY - 8)
            .lineTo(offsetX + palletWidthPx, offsetY - 8)
            .stroke();

        doc
            .moveTo(offsetX, offsetY - 12)
            .lineTo(offsetX, offsetY - 4)
            .stroke();

        doc
            .moveTo(offsetX + palletWidthPx, offsetY - 12)
            .lineTo(offsetX + palletWidthPx, offsetY - 4)
            .stroke();

        doc
            .fontSize(7)
            .font('Roboto')
            .fillColor('#374151')
            .text(
                `${pallet.palletLengthMm} mm`,
                offsetX,
                offsetY - 20,
                { width: palletWidthPx, align: 'center' }
            );

        // Etykieta overhang
        doc
            .fontSize(6)
            .fillColor('#D97706')
            .text(
                `+${MAX_OVERHANG_MM} mm`,
                offsetX + palletWidthPx,
                offsetY - 18,
                { width: overhangWidthPx, align: 'center' }
            );

        // Legenda kolorów (mała, na prawo od wizualizacji)
        const legendX = startX + VIS_WIDTH + 20;
        const legendY = startY + 10;
        const legendItemHeight = 12;

        doc.fontSize(7).font('Roboto-Bold').fillColor('#374151');
        doc.text('Legenda:', legendX, legendY);

        let legendCurrentY = legendY + 14;
        for (const [type, colors] of Object.entries(PROFILE_COLORS)) {
            doc
                .rect(legendX, legendCurrentY, 10, 8)
                .fillAndStroke(colors.fill, colors.stroke);

            doc
                .fontSize(6)
                .font('Roboto')
                .fillColor('#374151')
                .text(type, legendX + 14, legendCurrentY + 1);

            legendCurrentY += legendItemHeight;
        }

        // Przywróć kolor
        doc.fillColor('#000000');

        // Przesuń pozycję doc.y za wizualizację
        doc.y = startY + VIS_HEIGHT + 10;
    }

    /**
     * Generuj nazwę pliku PDF
     */
    generateFilename(deliveryId: number): string {
        const date = new Date().toISOString().split('T')[0];
        return `palety_dostawa_${deliveryId}_${date}.pdf`;
    }
}
