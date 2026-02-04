import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  return line.split(';').map((s) => s.trim());
}

function parseGlassesFromCsv(content: string): { totalGlasses: number; glassCount: number } {
  const lines = content.split(/\r?\n/);
  let totalGlassesFromHeader = 0;
  let inGlassSection = false;
  let glassCount = 0;

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    const parts = parseCsvLine(line);

    // Szukaj "Łączna liczba szyb" lub "Laczna lic" w górnej sekcji (przed listą szyb)
    if (!inGlassSection) {
      if ((lineLower.includes('laczna liczba') || lineLower.includes('łączna liczba')) && lineLower.includes('szyb')) {
        totalGlassesFromHeader = parseInt(parts[1]) || 0;
      }
      if ((lineLower.includes('laczna lic') || lineLower.includes('łączna lic')) && totalGlassesFromHeader === 0) {
        // Format: "Laczna lic:;12"
        const value = parseInt(parts[1]) || 0;
        if (value > 0) {
          totalGlassesFromHeader = value;
        }
      }
    }

    // Początek sekcji szyb
    if (lineLower.includes('lista szyb')) {
      inGlassSection = true;
      continue;
    }

    // Koniec sekcji szyb
    if (inGlassSection && (lineLower.includes('materialowka') || lineLower.includes('laczna lic'))) {
      break;
    }

    // Licz wiersze szyb
    if (inGlassSection && parts[0]?.match(/^\d+$/)) {
      glassCount++;
    }
  }

  return { totalGlasses: totalGlassesFromHeader, glassCount };
}

async function main() {
  const baseDir = 'C:/DEV_DATA/uzyte_bele';

  // Znajdź wszystkie pliki CSV
  const findCsvFiles = (dir: string): string[] => {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findCsvFiles(fullPath));
      } else if (item.name.endsWith('.csv') && item.name.includes('uzyte_bele')) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const csvFiles = findCsvFiles(baseDir);
  console.log(`Znaleziono ${csvFiles.length} plików CSV\n`);

  const updates: Array<{ orderNumber: string; oldValue: number | null; newValue: number; source: string }> = [];

  for (const filePath of csvFiles) {
    // Wyciągnij numer zlecenia z nazwy pliku (np. "53897_uzyte_bele.csv" -> "53897")
    const fileName = path.basename(filePath);
    const match = fileName.match(/^(\d+)/);
    if (!match) continue;

    const orderNumber = match[1];

    // Sprawdź czy zlecenie istnieje
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, totalGlasses: true },
    });

    if (!order) continue;

    // Parsuj plik
    const content = fs.readFileSync(filePath, 'utf-8');
    const { totalGlasses: newValue } = parseGlassesFromCsv(content);

    if (newValue > 0 && newValue !== order.totalGlasses) {
      // Aktualizuj
      await prisma.order.update({
        where: { orderNumber },
        data: { totalGlasses: newValue },
      });

      // Ustaw quantity=1 dla każdego OrderGlass
      await prisma.orderGlass.updateMany({
        where: { orderId: order.id },
        data: { quantity: 1 },
      });

      updates.push({
        orderNumber,
        oldValue: order.totalGlasses,
        newValue,
        source: fileName,
      });
    }
  }

  console.log(`Zaktualizowano ${updates.length} zleceń:\n`);

  if (updates.length > 0) {
    console.log('Nr zlecenia | Stara | Nowa | Plik');
    console.log('-'.repeat(60));
    for (const u of updates) {
      console.log(`${u.orderNumber.padEnd(11)} | ${String(u.oldValue ?? '-').padStart(5)} | ${String(u.newValue).padStart(4)} | ${u.source}`);
    }
  }

  // Weryfikacja 53897
  const check = await prisma.order.findUnique({
    where: { orderNumber: '53897' },
    select: { totalGlasses: true },
  });
  console.log(`\nWeryfikacja 53897: totalGlasses = ${check?.totalGlasses}`);

  await prisma.$disconnect();
}

main().catch(console.error);
