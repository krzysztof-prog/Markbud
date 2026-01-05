/**
 * Test PDF generation with Polish characters
 */

import { DeliveryProtocolService } from './src/services/delivery-protocol-service.js';
import type { DeliveryProtocolData } from './src/services/delivery-protocol-service.js';
import fs from 'fs';
import path from 'path';

const service = new DeliveryProtocolService();

const testData: DeliveryProtocolData = {
  deliveryId: 4,
  deliveryDate: new Date('2025-12-04'),
  orders: [
    {
      orderNumber: '53314-b',
      windowsCount: 2,
      value: 0,
      isReclamation: false,
    },
    {
      orderNumber: '53401',
      windowsCount: 4,
      value: 0,
      isReclamation: false,
    },
    {
      orderNumber: '53423',
      windowsCount: 3,
      value: 0,
      isReclamation: false,
    },
    {
      orderNumber: '53446-a',
      windowsCount: 2,
      value: 0,
      isReclamation: false,
    },
  ],
  totalWindows: 11,
  totalPallets: 0,
  totalValue: 0,
  generatedAt: new Date(),
};

async function test() {
  try {
    console.log('Generowanie PDF z polskimi znakami...');
    const pdfBuffer = await service.generatePdf(testData);

    const filename = service.generateFilename(testData.deliveryId);
    const outputPath = path.join(process.cwd(), filename);

    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`✅ PDF wygenerowany pomyślnie: ${outputPath}`);
    console.log(`📄 Rozmiar pliku: ${pdfBuffer.length} bytes`);
  } catch (error) {
    console.error('❌ Błąd podczas generowania PDF:', error);
    process.exit(1);
  }
}

test();
