import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const ARCHIVE_FOLDER = 'C:/DEV_DATA/uzyte_bele/archiwum';

// Prosty parser requirements z pliku CSV
function parseRequirementsFromCsv(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const requirements = [];

  let inRequirementsSection = true;
  let headerSkipped = false;

  for (const line of lines) {
    // Wykryj koniec sekcji requirements
    if (line.includes('Lp.') && line.includes('Szer.') && line.includes('Wys.')) {
      break; // Zaczyna się sekcja okien
    }

    const parts = line.split(';').map(p => p.trim());

    // Pomiń nagłówek
    if (!headerSkipped && (parts[0]?.toLowerCase().includes('zlec') || parts[0]?.toLowerCase().includes('numer'))) {
      headerSkipped = true;
      continue;
    }

    // Parsuj wiersz - musi mieć numer zlecenia i numer artykułu
    if (parts.length >= 4 && parts[0] && parts[1]) {
      const numArt = parts[1];

      // Sprawdź czy to wygląda jak numer artykułu (np. 210106000)
      if (!/^\d{6,}$/.test(numArt)) continue;

      // Wyciągnij numer profilu i kod koloru z numeru artykułu
      // Format: X-PPPP-KKK gdzie X=ignorowany, P=profil, K=kolor
      // Np. 19016050 → 9016 = profil, 050 = kolor
      const withoutPrefix = numArt.substring(1); // Usuń pierwszy znak (nic nie znaczy)
      const colorCode = withoutPrefix.slice(-3); // Ostatnie 3 cyfry = kolor
      const profileNumber = withoutPrefix.slice(0, -3); // Reszta = profil

      const nowychBel = parseFloat(parts[2]?.replace(',', '.')) || 0;
      const reszta = parseInt(parts[3]) || 0;

      // Oblicz liczbę belek i metrów
      const beams = Math.ceil(nowychBel);
      const meters = nowychBel * 6.5; // Standardowa długość belki

      requirements.push({
        articleNumber: numArt,
        profileNumber,
        colorCode,
        calculatedBeams: beams,
        calculatedMeters: meters,
        originalRest: reszta
      });
    }
  }

  return requirements;
}

async function reimport() {
  console.log('=== REIMPORT REQUIREMENTS ===\n');

  // Pobierz wszystkie zlecenia z dostaw
  const ordersInDeliveries = await prisma.deliveryOrder.findMany({
    include: {
      order: { select: { id: true, orderNumber: true } }
    }
  });

  const orderMap = new Map();
  for (const d of ordersInDeliveries) {
    orderMap.set(d.order.orderNumber, d.order);
  }

  const orderNumbers = [...orderMap.keys()];
  console.log('Zlecenia w dostawach:', orderNumbers.length);

  // Sprawdź które pliki istnieją w archiwum
  const files = fs.readdirSync(ARCHIVE_FOLDER);

  // Znajdź pliki dla zleceń w dostawach
  const filesToImport = [];
  for (const orderNum of orderNumbers) {
    const matchingFile = files.find(f => f.startsWith(orderNum + '_') || f.startsWith(orderNum + '-'));
    if (matchingFile) {
      filesToImport.push({
        orderNumber: orderNum,
        orderId: orderMap.get(orderNum).id,
        file: matchingFile,
        fullPath: path.join(ARCHIVE_FOLDER, matchingFile)
      });
    }
  }

  console.log('Pliki do reimportu:', filesToImport.length);

  // Reimportuj każdy plik
  let totalRequirements = 0;
  let totalColors = 0;

  for (const fileInfo of filesToImport) {
    console.log(`\nPrzetwarzam: ${fileInfo.file}`);

    const content = fs.readFileSync(fileInfo.fullPath, 'utf-8');
    const requirements = parseRequirementsFromCsv(content);

    console.log(`  Znaleziono ${requirements.length} requirements`);

    for (const req of requirements) {
      // Znajdź lub utwórz profil
      let profile = await prisma.profile.findUnique({
        where: { number: req.profileNumber }
      });

      if (!profile) {
        // Spróbuj znaleźć po articleNumber
        profile = await prisma.profile.findUnique({
          where: { articleNumber: req.articleNumber }
        });
      }

      if (!profile) {
        profile = await prisma.profile.create({
          data: {
            number: req.profileNumber,
            name: req.profileNumber,
            articleNumber: req.articleNumber
          }
        });
        console.log(`  Utworzono profil: ${req.profileNumber}`);
      }

      // Znajdź lub utwórz kolor
      let color = await prisma.color.findUnique({
        where: { code: req.colorCode }
      });

      if (!color) {
        color = await prisma.color.create({
          data: {
            code: req.colorCode,
            name: req.colorCode, // Nazwa = kod, można zmienić w ustawieniach
            type: 'akrobud' // Domyślny typ
          }
        });
        console.log(`  Utworzono kolor: ${req.colorCode}`);
        totalColors++;
      }

      // Utwórz lub zaktualizuj requirement
      await prisma.orderRequirement.upsert({
        where: {
          orderId_profileId_colorId: {
            orderId: fileInfo.orderId,
            profileId: profile.id,
            colorId: color.id
          }
        },
        update: {
          beamsCount: req.calculatedBeams,
          meters: req.calculatedMeters,
          restMm: req.originalRest
        },
        create: {
          orderId: fileInfo.orderId,
          profileId: profile.id,
          colorId: color.id,
          beamsCount: req.calculatedBeams,
          meters: req.calculatedMeters,
          restMm: req.originalRest
        }
      });

      totalRequirements++;
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Utworzono kolorów: ${totalColors}`);
  console.log(`Utworzono/zaktualizowano requirements: ${totalRequirements}`);

  // Sprawdź wyniki
  const reqCount = await prisma.orderRequirement.count();
  const colorCount = await prisma.color.count();
  console.log(`\nW bazie: ${reqCount} requirements, ${colorCount} kolorów`);

  await prisma.$disconnect();
}

reimport().catch(console.error);
