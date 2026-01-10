import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { prisma } from '../../index.js';
import { GlassDeliveryService } from '../glass-delivery/index.js';
import { SchucoLinkService } from '../schuco/schucoLinkService.js';
import { logger } from '../../utils/logger.js';
import { stripBOM } from '../../utils/string-utils.js';

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

/**
 * Informacja o błędzie parsowania
 */
export interface ParseError {
  row: number;
  field?: string;
  reason: string;
  rawData: any;
}

/**
 * Wynik parsowania z informacjami o błędach
 */
export interface ParseResult<T> {
  data: T;
  errors: ParseError[];
  summary: {
    totalRows: number;
    successRows: number;
    failedRows: number;
    skippedRows: number;
  };
}

export interface ParsedUzyteBele {
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
   * Parse EUR amount from Schuco format
   * Converts "62,30 €" to 62.30
   * Converts "2 321,02 €" to 2321.02
   */
  parseEurAmountFromSchuco(amountStr: string): number | null {
    if (!amountStr) return null;

    try {
      // Remove currency symbol and spaces
      let cleaned = amountStr.replace(/€/g, '').trim();

      // Remove thousands separator (space)
      cleaned = cleaned.replace(/\s/g, '');

      // Replace comma with dot for decimal separator
      cleaned = cleaned.replace(/,/g, '.');

      const amount = parseFloat(cleaned);
      return isNaN(amount) ? null : amount;
    } catch {
      return null;
    }
  }

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
    // Walidacja podstawowa
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error('Numer zlecenia nie może być pusty');
    }

    const trimmed = orderNumber.trim();

    // Limit długości
    if (trimmed.length > 20) {
      throw new Error('Numer zlecenia zbyt długi (max 20 znaków)');
    }

    // Wzorce
    // Wzorzec 1: cyfry + separator (myślnik/spacja) + 1-3 znaki alfanumeryczne
    const matchWithSeparator = trimmed.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
    // Wzorzec 2: cyfry + 1-3 litery BEZ separatora (dla formatu "54222a")
    const matchWithoutSeparator = trimmed.match(/^(\d+)([a-zA-Z]{1,3})$/);
    // Wzorzec 3: same cyfry
    const matchPlain = trimmed.match(/^(\d+)$/);

    if (matchWithSeparator) {
      const [, base, suffix] = matchWithSeparator;
      return { base, suffix, full: trimmed };
    }

    if (matchWithoutSeparator) {
      const [, base, suffix] = matchWithoutSeparator;
      return { base, suffix, full: trimmed };
    }

    if (matchPlain) {
      const [, base] = matchPlain;
      return { base, suffix: null, full: trimmed };
    }

    // Nieprawidłowy format - rzuć błąd zamiast fallback
    throw new Error(
      `Nieprawidłowy format numeru zlecenia: "${trimmed}". ` +
      `Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")`
    );
  }

  /**
   * Parsuje numer artykułu na numer profilu i kod koloru
   * Format: X-profil-kolor, np. 19016050 → 9016 = profil, 050 = kolor
   */
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string } {
    // Usuń sufiks "p" jeśli istnieje (np. "19016000p" → "19016000")
    const cleanedNumber = articleNumber.replace(/p$/i, '');

    // Usuń pierwszy znak (nic nie znaczy)
    const withoutPrefix = cleanedNumber.substring(1);

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
    // Walidacja inputów
    if (!Number.isFinite(originalBeams) || !Number.isFinite(restMm)) {
      throw new Error('Wartości muszą być liczbami skończonymi');
    }

    if (originalBeams < 0) {
      throw new Error('Liczba bel nie może być ujemna');
    }

    if (restMm < 0) {
      throw new Error('Reszta nie może być ujemna');
    }

    if (restMm > BEAM_LENGTH_MM) {
      throw new Error(`Reszta (${restMm}mm) nie może być większa niż długość beli (${BEAM_LENGTH_MM}mm)`);
    }

    if (restMm === 0) {
      return { beams: originalBeams, meters: 0 };
    }

    // Sprawdź czy można odjąć belę
    if (originalBeams < 1) {
      throw new Error('Brak bel do odjęcia (oryginalna liczba < 1, ale reszta > 0)');
    }

    // Zaokrąglij resztę w górę do wielokrotności 500mm
    const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

    // Odjąć 1 belę
    const beams = originalBeams - 1;

    // reszta2 = 6000 - roundedRest
    const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

    // Walidacja wyniku (ochrona przed błędami obliczeniowymi)
    if (reszta2Mm < 0) {
      console.warn(`Negative reszta2Mm: ${reszta2Mm}, roundedRest: ${roundedRest}`);
      return { beams, meters: 0 }; // Bezpieczny fallback
    }

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
   * Podgląd pliku "użyte bele" z raportowaniem błędów walidacji
   * Zwraca ParseResult z listą błędów dla wierszy które nie przeszły walidacji
   */
  async previewUzyteBeleWithErrors(filepath: string): Promise<ParseResult<ParsedUzyteBele>> {
    const errors: ParseError[] = [];
    let totalRows = 0;
    let successRows = 0;
    let failedRows = 0;

    // Parsuj plik
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);
    parsed.orderNumberParsed = orderNumberParsed;

    // Walidacja requirements - sprawdź czy profile i kolory istnieją w bazie
    totalRows = parsed.requirements.length;

    for (let i = 0; i < parsed.requirements.length; i++) {
      const req = parsed.requirements[i];
      let hasError = false;

      // Sprawdź czy profil istnieje
      const profile = await prisma.profile.findFirst({
        where: { number: req.profileNumber },
      });

      if (!profile) {
        errors.push({
          row: i + 1,
          field: 'profile',
          reason: `Profil ${req.profileNumber} nie znaleziony w systemie`,
          rawData: req,
        });
        hasError = true;
        failedRows++;
      }

      // Sprawdź czy kolor istnieje
      const color = await prisma.color.findFirst({
        where: { code: req.colorCode },
      });

      if (!color) {
        errors.push({
          row: i + 1,
          field: 'color',
          reason: `Kolor ${req.colorCode} nie znaleziony w systemie`,
          rawData: req,
        });
        hasError = true;
        if (!hasError) failedRows++; // Zlicz tylko raz per wiersz
      }

      if (!hasError) {
        successRows++;
      }
    }

    // Sprawdź konflikty wariantów
    if (orderNumberParsed.suffix) {
      const baseOrder = await prisma.order.findUnique({
        where: { orderNumber: orderNumberParsed.base },
      });

      parsed.conflict = {
        baseOrderExists: baseOrder !== null,
        baseOrderId: baseOrder?.id,
        baseOrderNumber: baseOrder?.orderNumber,
      };
    }

    return {
      data: parsed,
      errors,
      summary: {
        totalRows,
        successRows,
        failedRows,
        skippedRows: 0,
      },
    };
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

    // Parsuj numer zlecenia (przed transakcją)
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);
    let targetOrderNumber = parsed.orderNumber;

    // Jeśli zlecenie ma sufiks i użytkownik chce zamienić bazowe
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
      console.log(`   🔄 Zamienianie zlecenia bazowego ${orderNumberParsed.base} (zamiast tworzenia ${parsed.orderNumber})`);
    }

    // Całość w transakcji dla atomicity
    return prisma.$transaction(async (tx) => {
      // Znajdź lub utwórz zlecenie
      let order = await tx.order.findUnique({
        where: { orderNumber: targetOrderNumber },
      });

      if (order && action === 'overwrite') {
        // Atomowo usuń istniejące requirements i windows
        await tx.orderRequirement.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderWindow.deleteMany({
          where: { orderId: order.id },
        });
        // Zaktualizuj zlecenie o nowe dane z CSV
        order = await tx.order.update({
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
        // Try to get EUR value from linked Schuco delivery if available
        const schucoLink = await tx.orderSchucoLink.findFirst({
          where: {
            order: {
              orderNumber: targetOrderNumber,
            },
          },
          include: {
            schucoDelivery: {
              select: { totalAmount: true },
            },
          },
        });

        let eurValue: number | undefined;
        if (schucoLink?.schucoDelivery?.totalAmount) {
          const parsedAmount = this.parseEurAmountFromSchuco(schucoLink.schucoDelivery.totalAmount);
          if (parsedAmount !== null) {
            eurValue = parsedAmount;
          }
        }

        // Sprawdź czy jest oczekująca cena dla tego zlecenia
        const pendingPrice = await tx.pendingOrderPrice.findFirst({
          where: {
            orderNumber: targetOrderNumber,
            status: 'pending',
          },
          orderBy: { createdAt: 'desc' },
        });

        let valueEurFromPending: number | undefined;
        let valuePlnFromPending: number | undefined;

        if (pendingPrice) {
          if (pendingPrice.currency === 'EUR') {
            valueEurFromPending = pendingPrice.valueNetto;
          } else {
            valuePlnFromPending = pendingPrice.valueNetto;
          }
          logger.info(`Found pending price for ${targetOrderNumber}: ${pendingPrice.currency} ${pendingPrice.valueNetto}`);
        }

        order = await tx.order.create({
          data: {
            orderNumber: targetOrderNumber,
            client: parsed.client || undefined,
            project: parsed.project || undefined,
            system: parsed.system || undefined,
            deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
            pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
            totalWindows: parsed.totals.windows || undefined,
            totalSashes: parsed.totals.sashes || undefined,
            totalGlasses: parsed.totals.glasses || undefined,
            valueEur: eurValue ?? valueEurFromPending,
            valuePln: valuePlnFromPending,
          },
        });

        // Oznacz pending price jako zastosowaną
        if (pendingPrice) {
          await tx.pendingOrderPrice.update({
            where: { id: pendingPrice.id },
            data: {
              status: 'applied',
              appliedAt: new Date(),
              appliedToOrderId: order.id,
            },
          });
          logger.info(`Applied pending price to order ${targetOrderNumber} (ID: ${order.id})`);
        }
      } else if (action === 'add_new') {
        // Zaktualizuj istniejące zlecenie o nowe dane z CSV
        order = await tx.order.update({
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

      // Dodaj requirements (w tej samej transakcji)
      for (const req of parsed.requirements) {
        // Znajdź lub utwórz profil z articleNumber
        let profile = await tx.profile.findUnique({
          where: { number: req.profileNumber },
        });

        if (!profile) {
          // Spróbuj znaleźć po articleNumber
          profile = await tx.profile.findUnique({
            where: { articleNumber: req.articleNumber },
          });

          if (!profile) {
            // Utwórz nowy profil jeśli nie istnieje
            profile = await tx.profile.create({
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
          profile = await tx.profile.update({
            where: { id: profile.id },
            data: { articleNumber: req.articleNumber },
          });
        }

        // Znajdź kolor
        const color = await tx.color.findUnique({
          where: { code: req.colorCode },
        });

        if (!color) {
          console.warn(`Kolor ${req.colorCode} nie znaleziony, pomijam`);
          continue;
        }

        // Utwórz lub zaktualizuj requirement
        await tx.orderRequirement.upsert({
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

      // Dodaj windows (w tej samej transakcji)
      for (const win of parsed.windows) {
        await tx.orderWindow.create({
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
    }, {
      timeout: 30000, // 30s dla dużych importów
    }).then(async (result) => {
      // Re-match unmatched glass delivery items AFTER transaction completes
      try {
        const glassDeliveryService = new GlassDeliveryService(prisma);
        const rematchResult = await glassDeliveryService.rematchUnmatchedForOrders([targetOrderNumber]);
        if (rematchResult.rematched > 0) {
          logger.info(`Re-match dostaw szyb dla ${targetOrderNumber}: ${rematchResult.rematched} dopasowanych, ${rematchResult.stillUnmatched} nadal niedopasowanych`);
        }
      } catch (error) {
        logger.warn(`Błąd re-matchingu dostaw szyb dla ${targetOrderNumber}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      }

      // AUTOMATYCZNE POWIĄZYWANIE SCHUCO (PO ZAKOŃCZENIU TRANSAKCJI)
      // Sprawdź czy istnieją dostawy Schuco czekające na powiązanie z tym zleceniem
      try {
        const schucoLinkService = new SchucoLinkService(prisma);
        const linksCreated = await schucoLinkService.linkOrderToWaitingDeliveries(targetOrderNumber);
        if (linksCreated > 0) {
          logger.info(`Auto-linked ${linksCreated} Schuco delivery/ies to order ${targetOrderNumber}`);
        }
      } catch (error) {
        logger.warn(`Failed to auto-link Schuco deliveries for ${targetOrderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      return result;
    });
  }

  /**
   * Parsuj plik CSV "użyte bele"
   */
  private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
    // Odczytaj plik jako buffer, następnie dekoduj z Windows-1250
    const buffer = await fs.promises.readFile(filepath);

    // Próbuj najpierw Windows-1250 (polskie znaki w Windows)
    let content: string;
    try {
      const decoder = new TextDecoder('windows-1250');
      content = decoder.decode(buffer);
      // Sprawdź czy są polskie znaki - jeśli nie, spróbuj UTF-8
      if (!content.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)) {
        content = buffer.toString('utf-8');
      }
    } catch {
      // Fallback do UTF-8
      content = buffer.toString('utf-8');
    }

    // Usuń UTF-8 BOM jeśli istnieje (pliki eksportowane z Excela często mają BOM)
    content = stripBOM(content);

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

          // Sprawdź czy to wygląda jak poprawny numer artykułu (8 cyfr, opcjonalnie "p" na końcu)
          // Przykłady: 19016000, 18866000, 19016000p
          if (!numArt.match(/^\d{8}p?$/i)) {
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
