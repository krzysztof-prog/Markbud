import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { prisma } from '../../index.js';

// Stałe z specyfikacji
const BEAM_LENGTH_MM = 6000;
const REST_ROUNDING_MM = 500;

interface UzyteBeleRow {
  numZlec: string;
  numArt: string;
  nowychBel: number;
  reszta: number;
}

interface UzyteBeleWindow {
  lp: number;
  szer: number;
  wys: number;
  typProfilu: string;
  ilosc: number;
  referencja: string;
}

interface ParsedUzyteBele {
  orderNumber: string;
  orderNumberParsed?: {
    base: string;
    suffix: string | null;
    full: string;
  };
  client?: string;
  project?: string;
  system?: string;
  deadline?: string;
  pvcDeliveryDate?: string;
  requirements: Array<{
    articleNumber: string;
    profileNumber: string;
    colorCode: string;
    originalBeams: number;
    originalRest: number;
    calculatedBeams: number;
    calculatedMeters: number;
  }>;
  windows: UzyteBeleWindow[];
  totals: {
    windows: number;
    sashes: number;
    glasses: number;
  };
  conflict?: {
    baseOrderExists: boolean;
    baseOrderId?: number;
    baseOrderNumber?: string;
  };
}

export class CsvParser {
  /**
   * Parsuje numer zlecenia i wyciąga numer bazowy oraz sufiks
   * Przykłady:
   * - "54222" → { base: "54222", suffix: null }
   * - "54222-a" → { base: "54222", suffix: "a" }
   * - "54222a" → { base: "54222", suffix: "a" }
   * - "54222-abc" → { base: "54222", suffix: "abc" }
   * - "54222 xxx" → { base: "54222", suffix: "xxx" }
   * - "54222 a" → { base: "54222", suffix: "a" }
   */
  parseOrderNumber(orderNumber: string): { base: string; suffix: string | null; full: string } {
    // Wzorzec 1: cyfry + separator (myślnik/spacja) + 1-3 znaki alfanumeryczne
    // Wzorzec 2: cyfry + 1-3 litery BEZ separatora (dla formatu "54222a")
    const matchWithSeparator = orderNumber.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
    const matchWithoutSeparator = orderNumber.match(/^(\d+)([a-zA-Z]{1,3})$/);
    const matchPlain = orderNumber.match(/^(\d+)$/);

    if (matchWithSeparator) {
      const [, base, suffix] = matchWithSeparator;
      return { base, suffix, full: orderNumber };
    }

    if (matchWithoutSeparator) {
      const [, base, suffix] = matchWithoutSeparator;
      return { base, suffix, full: orderNumber };
    }

    if (matchPlain) {
      const [, base] = matchPlain;
      return { base, suffix: null, full: orderNumber };
    }

    // Nie pasuje do żadnego wzorca - zwróć jako jest
    return { base: orderNumber, suffix: null, full: orderNumber };
  }

  /**
   * Parsuje numer artykułu na numer profilu i kod koloru
   * Format: X-profil-kolor, np. 19016050 → 9016 = profil, 050 = kolor
   */
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string } {
    // Usuń pierwszy znak (nic nie znaczy)
    const withoutPrefix = articleNumber.substring(1);

    // Ostatnie 3 znaki to kod koloru
    const colorCode = withoutPrefix.slice(-3);

    // Reszta to numer profilu
    const profileNumber = withoutPrefix.slice(0, -3);

    return { profileNumber, colorCode };
  }

  /**
   * Przelicza bele i resztę według specyfikacji
   * - zaokrąglić resztę w górę do wielokrotności 500mm
   * - jeśli reszta > 0 → od nowych bel odjąć 1
   * - reszta2 = 6000mm - zaokrąglona reszta → na metry
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
    if (restMm === 0) {
      return { beams: originalBeams, meters: 0 };
    }

    // Zaokrąglij resztę w górę do wielokrotności 500mm
    const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

    // Odjąć 1 belę (bo reszta > 0)
    const beams = originalBeams - 1;

    // reszta2 = 6000 - roundedRest, przelicz na metry
    const reszta2Mm = BEAM_LENGTH_MM - roundedRest;
    const meters = reszta2Mm / 1000;

    return { beams, meters };
  }

  /**
   * Podgląd pliku "użyte bele" przed importem
   */
  async previewUzyteBele(filepath: string): Promise<ParsedUzyteBele> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia i sprawdź konflikty
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);
    parsed.orderNumberParsed = orderNumberParsed;

    // Jeśli zlecenie ma sufiks, sprawdź czy istnieje zlecenie bazowe
    if (orderNumberParsed.suffix) {
      const baseOrder = await prisma.order.findUnique({
        where: { orderNumber: orderNumberParsed.base },
      });

      // Zawsze zwróć informacje o konflikcie, nawet jeśli zlecenia bazowego nie ma
      parsed.conflict = {
        baseOrderExists: baseOrder !== null,
        baseOrderId: baseOrder?.id,
        baseOrderNumber: baseOrder?.orderNumber,
      };
    }

    return parsed;
  }

  /**
   * Przetwórz plik "użyte bele" i zapisz do bazy
   * @param filepath - Ścieżka do pliku CSV
   * @param action - 'overwrite' (nadpisz istniejące) lub 'add_new' (utwórz nowe/zaktualizuj)
   * @param replaceBase - Jeśli true i zlecenie ma sufiks, zamieni zlecenie bazowe zamiast tworzyć nowe
   */
  async processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean
  ): Promise<{ orderId: number; requirementsCount: number; windowsCount: number }> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);

    // Określ który numer zlecenia użyć (bazowy vs pełny)
    let targetOrderNumber = parsed.orderNumber;

    // Jeśli zlecenie ma sufiks i użytkownik chce zamienić bazowe
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
      console.log(`   🔄 Zamienianie zlecenia bazowego ${orderNumberParsed.base} (zamiast tworzenia ${parsed.orderNumber})`);
    }

    // Znajdź lub utwórz zlecenie
    let order = await prisma.order.findUnique({
      where: { orderNumber: targetOrderNumber },
    });

    if (order && action === 'overwrite') {
      // Usuń istniejące requirements i windows
      await prisma.orderRequirement.deleteMany({
        where: { orderId: order.id },
      });
      await prisma.orderWindow.deleteMany({
        where: { orderId: order.id },
      });
      // Zaktualizuj zlecenie o nowe dane z CSV
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          client: parsed.client || undefined,
          project: parsed.project || undefined,
          system: parsed.system || undefined,
          deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
          pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
          totalWindows: parsed.totals.windows || undefined,
          totalSashes: parsed.totals.sashes || undefined,
          totalGlasses: parsed.totals.glasses || undefined,
        },
      });
    } else if (!order) {
      order = await prisma.order.create({
        data: {
          orderNumber: targetOrderNumber, // Używa targetOrderNumber zamiast parsed.orderNumber
          client: parsed.client || undefined,
          project: parsed.project || undefined,
          system: parsed.system || undefined,
          deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
          pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
          totalWindows: parsed.totals.windows || undefined,
          totalSashes: parsed.totals.sashes || undefined,
          totalGlasses: parsed.totals.glasses || undefined,
        },
      });
    } else if (action === 'add_new') {
      // Zaktualizuj istniejące zlecenie o nowe dane z CSV (jeśli action to add_new)
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          client: parsed.client || undefined,
          project: parsed.project || undefined,
          system: parsed.system || undefined,
          deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
          pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
          totalWindows: parsed.totals.windows || undefined,
          totalSashes: parsed.totals.sashes || undefined,
          totalGlasses: parsed.totals.glasses || undefined,
        },
      });
    }

    // Dodaj requirements
    for (const req of parsed.requirements) {
      // Znajdź lub utwórz profil z articleNumber
      let profile = await prisma.profile.findUnique({
        where: { number: req.profileNumber },
      });

      if (!profile) {
        // Spróbuj znaleźć po articleNumber
        profile = await prisma.profile.findUnique({
          where: { articleNumber: req.articleNumber },
        });

        if (!profile) {
          // Utwórz nowy profil jeśli nie istnieje
          profile = await prisma.profile.create({
            data: {
              number: req.profileNumber,
              name: req.profileNumber,
              articleNumber: req.articleNumber,
            },
          });
          console.log(`Utworzony nowy profil ${req.profileNumber} z numerem artykułu ${req.articleNumber}`);
        }
      } else if (!profile.articleNumber) {
        // Jeśli profil istnieje ale nie ma articleNumber, zaktualizuj go
        profile = await prisma.profile.update({
          where: { id: profile.id },
          data: { articleNumber: req.articleNumber },
        });
      }

      // Znajdź kolor
      const color = await prisma.color.findUnique({
        where: { code: req.colorCode },
      });

      if (!color) {
        console.warn(`Kolor ${req.colorCode} nie znaleziony, pomijam`);
        continue;
      }

      // Utwórz lub zaktualizuj requirement
      await prisma.orderRequirement.upsert({
        where: {
          orderId_profileId_colorId: {
            orderId: order.id,
            profileId: profile.id,
            colorId: color.id,
          },
        },
        update: {
          beamsCount: req.calculatedBeams,
          meters: req.calculatedMeters,
          restMm: req.originalRest,
        },
        create: {
          orderId: order.id,
          profileId: profile.id,
          colorId: color.id,
          beamsCount: req.calculatedBeams,
          meters: req.calculatedMeters,
          restMm: req.originalRest,
        },
      });
    }

    // Dodaj windows
    for (const win of parsed.windows) {
      await prisma.orderWindow.create({
        data: {
          orderId: order.id,
          widthMm: win.szer,
          heightMm: win.wys,
          profileType: win.typProfilu,
          quantity: win.ilosc,
          reference: win.referencja,
        },
      });
    }

    return {
      orderId: order.id,
      requirementsCount: parsed.requirements.length,
      windowsCount: parsed.windows.length,
    };
  }

  /**
   * Parsuj plik CSV "użyte bele"
   */
  private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
    const content = await fs.promises.readFile(filepath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    const requirements: ParsedUzyteBele['requirements'] = [];
    const windows: UzyteBeleWindow[] = [];
    const totals = { windows: 0, sashes: 0, glasses: 0 };

    let orderNumber = 'UNKNOWN';
    let client: string | undefined;
    let project: string | undefined;
    let system: string | undefined;
    let deadline: string | undefined;
    let pvcDeliveryDate: string | undefined;
    let currentSection = 'requirements'; // lub 'windows'
    let requirementsHeaderSkipped = false;
    let windowsHeaderSkipped = false;

    for (const line of lines) {
      const parts = line.split(';').map((p) => p.trim());
      const lineLower = line.toLowerCase();

      // Parsuj opcjonalne metadane zlecenia (mogą być przed danymi)
      // Format: Klient: ABC Corp; Projekt: Proj-001; System: Profil 70; etc.
      if (lineLower.includes('klient:')) {
        const match = line.match(/klient:\s*([^;]+)/i);
        if (match) client = match[1].trim();
      }
      if (lineLower.includes('projekt:')) {
        const match = line.match(/projekt:\s*([^;]+)/i);
        if (match) project = match[1].trim();
      }
      if (lineLower.includes('system:')) {
        const match = line.match(/system:\s*([^;]+)/i);
        if (match) system = match[1].trim();
      }
      if (lineLower.includes('termin') && lineLower.includes('realizacji')) {
        const match = line.match(/termin.*realizacji:\s*([^;]+)/i);
        if (match) deadline = match[1].trim();
      }
      if (lineLower.includes('dostawa') && lineLower.includes('pvc')) {
        const match = line.match(/dostawa\s+pvc:\s*([^;]+)/i);
        if (match) pvcDeliveryDate = match[1].trim();
      }

      // Wykryj przejście do sekcji windows
      if (lineLower.includes('lista okien') || lineLower.includes('lista drzwi')) {
        currentSection = 'windows';
        windowsHeaderSkipped = false;
        continue;
      }

      // Parsuj wiersze podsumowujące
      if (lineLower.includes('laczna liczba') || lineLower.includes('łączna liczba')) {
        const value = parseInt(parts[1]) || 0;
        if (lineLower.includes('okien') || lineLower.includes('drzwi')) {
          totals.windows = value;
        } else if (lineLower.includes('skrzyd')) {
          totals.sashes = value;
        } else if (lineLower.includes('szyb')) {
          totals.glasses = value;
        }
        continue;
      }

      if (currentSection === 'requirements') {
        // Pomiń nagłówek requirements
        if (!requirementsHeaderSkipped && (parts[0]?.toLowerCase().includes('zlec') || parts[0]?.toLowerCase().includes('numer'))) {
          requirementsHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz requirements - musi mieć numer zlecenia w pierwszej kolumnie
        if (parts.length >= 4 && parts[0] && parts[1]) {
          // Pierwszy wiersz z danymi - wyciągnij numer zlecenia
          // Akceptuj cyfry opcjonalnie z separatorem + sufiks: 54222, 54222-a, 54222 xxx
          if (orderNumber === 'UNKNOWN' && parts[0].match(/^\d+(?:[-\s][a-zA-Z0-9]{1,3})?$/)) {
            orderNumber = parts[0];
          }

          const numArt = parts[1];
          const nowychBel = parseInt(parts[2]) || 0;
          const reszta = parseInt(parts[3]) || 0;

          // Sprawdź czy to wygląda jak poprawny numer artykułu (same cyfry)
          if (!numArt.match(/^\d+$/)) {
            continue;
          }

          const { profileNumber, colorCode } = this.parseArticleNumber(numArt);
          const { beams, meters } = this.calculateBeamsAndMeters(nowychBel, reszta);

          requirements.push({
            articleNumber: numArt,
            profileNumber,
            colorCode,
            originalBeams: nowychBel,
            originalRest: reszta,
            calculatedBeams: beams,
            calculatedMeters: meters,
          });
        }
      } else if (currentSection === 'windows') {
        // Pomiń nagłówek windows
        if (!windowsHeaderSkipped && (parts[0]?.toLowerCase().includes('lp') || parts[1]?.toLowerCase().includes('szerok'))) {
          windowsHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz windows - lp musi być liczbą
        if (parts.length >= 5 && parts[0].match(/^\d+$/)) {
          windows.push({
            lp: parseInt(parts[0]) || 0,
            szer: parseInt(parts[1]) || 0,
            wys: parseInt(parts[2]) || 0,
            typProfilu: parts[3] || '',
            ilosc: parseInt(parts[4]) || 1,
            referencja: parts[5] || '',
          });
        }
      }
    }

    return {
      orderNumber,
      client,
      project,
      system,
      deadline,
      pvcDeliveryDate,
      requirements,
      windows,
      totals,
    };
  }
}
