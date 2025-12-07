/**
 * Delivery Protocol Service - Generowanie PDF protokołu odbioru dostawy
 */

import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger.js';

export interface ProtocolOrder {
  orderNumber: string;
  windowsCount: number;
  value: number;
  isReclamation: boolean;
}

export interface DeliveryProtocolData {
  deliveryId: number;
  deliveryDate: Date | string;
  orders: ProtocolOrder[];
  totalWindows: number;
  totalPallets: number;
  totalValue: number;
  generatedAt: Date;
}

export class DeliveryProtocolService {
  // Stałe dla layoutu
  private readonly TABLE_LEFT = 50;
  private readonly PAGE_WIDTH = 595; // A4
  private readonly TABLE_WIDTH = 495;
  private readonly COL_WIDTHS = {
    lp: 40,
    orderNumber: 150,
    windows: 80,
    value: 120,
    reclamation: 105,
  };

  /**
   * Generuj PDF protokołu odbioru
   */
  async generatePdf(data: DeliveryProtocolData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Format daty
        const deliveryDateStr = new Date(data.deliveryDate).toLocaleDateString('pl-PL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // ==================== NAGŁÓWEK ====================
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .text('PROTOKÓŁ ODBIORU DOSTAWY', { align: 'center' });

        doc.moveDown(0.5);

        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#2563eb')
          .text(`Dostawa #${data.deliveryId}`, { align: 'center' });

        doc.fillColor('#000000');

        doc.moveDown(0.3);

        doc
          .fontSize(12)
          .text(`Data dostawy: ${deliveryDateStr}`, { align: 'center' });

        doc.moveDown(1.5);

        // ==================== PODSUMOWANIE ====================
        doc.fontSize(14).font('Helvetica-Bold').text('Podsumowanie:', { underline: true });

        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica');

        const leftCol = 70;
        const rightCol = 250;

        doc.text('Liczba zleceń:', leftCol);
        doc.text(`${data.orders.length}`, rightCol, doc.y - 13);

        doc.text('Liczba okien/drzwi:', leftCol);
        doc.text(`${data.totalWindows} szt.`, rightCol, doc.y - 13);

        doc.text('Liczba palet:', leftCol);
        doc.text(`${data.totalPallets}`, rightCol, doc.y - 13);

        doc.text('Wartość całkowita:', leftCol);
        doc.text(`${data.totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`, rightCol, doc.y - 13);

        doc.moveDown(1.5);

        // ==================== TABELA ZLECEŃ ====================
        doc.fontSize(14).font('Helvetica-Bold').text('Lista zleceń:', { underline: true });

        doc.moveDown(0.5);

        // Nagłówki tabeli
        this.drawTableHeaders(doc);

        // Linia pod nagłówkami
        const lineY = doc.y;
        doc
          .strokeColor('#374151')
          .lineWidth(1)
          .moveTo(this.TABLE_LEFT, lineY)
          .lineTo(this.TABLE_LEFT + this.TABLE_WIDTH, lineY)
          .stroke();

        doc.moveDown(0.3);

        // Wiersze
        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        data.orders.forEach((order, idx) => {
          // Sprawdź czy jest miejsce (jeśli nie - nowa strona)
          if (doc.y > 700) {
            doc.addPage();
            this.drawTableHeaders(doc);
            const newLineY = doc.y;
            doc
              .strokeColor('#374151')
              .lineWidth(1)
              .moveTo(this.TABLE_LEFT, newLineY)
              .lineTo(this.TABLE_LEFT + this.TABLE_WIDTH, newLineY)
              .stroke();
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor('#000000');
          }

          const rowY = doc.y;
          let currentX = this.TABLE_LEFT;

          // Tło dla parzystych wierszy
          if (idx % 2 === 0) {
            doc
              .rect(this.TABLE_LEFT, rowY - 2, this.TABLE_WIDTH, 18)
              .fillColor('#f9fafb')
              .fill();
            doc.fillColor('#000000');
          }

          // Lp
          doc.text(`${idx + 1}`, currentX, rowY, { width: this.COL_WIDTHS.lp, align: 'center' });
          currentX += this.COL_WIDTHS.lp;

          // Numer zlecenia
          doc.font('Helvetica-Bold').text(order.orderNumber, currentX, rowY, {
            width: this.COL_WIDTHS.orderNumber,
            align: 'left',
          });
          doc.font('Helvetica');
          currentX += this.COL_WIDTHS.orderNumber;

          // Okna
          doc.text(`${order.windowsCount} szt.`, currentX, rowY, {
            width: this.COL_WIDTHS.windows,
            align: 'center',
          });
          currentX += this.COL_WIDTHS.windows;

          // Wartość
          doc.text(
            `${order.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`,
            currentX,
            rowY,
            {
              width: this.COL_WIDTHS.value,
              align: 'right',
            }
          );
          currentX += this.COL_WIDTHS.value;

          // Reklamacja
          doc.text(order.isReclamation ? 'TAK' : '-', currentX, rowY, {
            width: this.COL_WIDTHS.reclamation,
            align: 'center',
          });

          doc.moveDown(0.6);
        });

        // Linia końcowa tabeli
        const endLineY = doc.y;
        doc
          .strokeColor('#374151')
          .lineWidth(1)
          .moveTo(this.TABLE_LEFT, endLineY)
          .lineTo(this.TABLE_LEFT + this.TABLE_WIDTH, endLineY)
          .stroke();

        // ==================== SEKCJA PODPISÓW ====================
        doc.moveDown(3);

        // Sprawdź czy jest miejsce na podpisy (jeśli nie - nowa strona)
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.fontSize(11).font('Helvetica');

        // Linia dla podpisu dostawcy
        const signatureY = doc.y + 30;
        doc.text('Wydał (dostawca):', 70, doc.y);
        doc
          .strokeColor('#9ca3af')
          .lineWidth(0.5)
          .moveTo(70, signatureY + 30)
          .lineTo(250, signatureY + 30)
          .stroke();
        doc.fontSize(9).text('podpis i pieczątka', 120, signatureY + 35);

        // Linia dla podpisu odbiorcy
        doc.fontSize(11).text('Odebrał (odbiorca):', 320, signatureY - 30);
        doc
          .strokeColor('#9ca3af')
          .lineWidth(0.5)
          .moveTo(320, signatureY + 30)
          .lineTo(500, signatureY + 30)
          .stroke();
        doc.fontSize(9).text('podpis i pieczątka', 370, signatureY + 35);

        // Data i miejsce
        doc.moveDown(4);
        doc.fontSize(10).text(`Data odbioru: ___________________`, 70);
        doc.text(`Miejsce: ___________________`, 320, doc.y - 13);

        // ==================== STOPKA ====================
        const pageCount = (doc as any).bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);

          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#6b7280')
            .text(
              `Strona ${i + 1} z ${pageCount} | Wygenerowano: ${new Date().toLocaleString('pl-PL')} | System AKROBUD`,
              50,
              doc.page.height - 40,
              {
                align: 'center',
                width: doc.page.width - 100,
              }
            );
        }

        doc.end();

        logger.info(`Generated delivery protocol PDF for delivery ${data.deliveryId}`);
      } catch (error) {
        logger.error('Error generating delivery protocol PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Rysuj nagłówki tabeli
   */
  private drawTableHeaders(doc: PDFKit.PDFDocument): void {
    const tableTop = doc.y;

    // Tło nagłówka
    doc
      .rect(this.TABLE_LEFT, tableTop - 3, this.TABLE_WIDTH, 20)
      .fillColor('#e5e7eb')
      .fill();

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');

    let currentX = this.TABLE_LEFT;

    doc.text('Lp', currentX, tableTop, { width: this.COL_WIDTHS.lp, align: 'center' });
    currentX += this.COL_WIDTHS.lp;

    doc.text('Numer zlecenia', currentX, tableTop, { width: this.COL_WIDTHS.orderNumber, align: 'left' });
    currentX += this.COL_WIDTHS.orderNumber;

    doc.text('Okna', currentX, tableTop, { width: this.COL_WIDTHS.windows, align: 'center' });
    currentX += this.COL_WIDTHS.windows;

    doc.text('Wartość', currentX, tableTop, { width: this.COL_WIDTHS.value, align: 'right' });
    currentX += this.COL_WIDTHS.value;

    doc.text('Reklamacja', currentX, tableTop, { width: this.COL_WIDTHS.reclamation, align: 'center' });

    doc.moveDown(0.5);
  }

  /**
   * Generuj nazwę pliku PDF
   */
  generateFilename(deliveryId: number): string {
    const date = new Date().toISOString().split('T')[0];
    return `protokol_dostawy_${deliveryId}_${date}.pdf`;
  }
}
