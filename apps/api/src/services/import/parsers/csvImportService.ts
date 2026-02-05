/**
 * CSV Import Service
 *
 * Orkiestrator importu plikow CSV "uzyte bele".
 * Deleguje walidacje, transformacje i konwersje do wyspecjalizowanych klas.
 *
 * WAZNE: Ten serwis jest za feature flag.
 * Wlacz przez ENABLE_NEW_CSV_PARSER=true lub ENABLE_NEW_PARSERS=true
 */

import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import { stripBOM } from '../../../utils/string-utils.js';
import type {
  ICsvImportService,
  ParsedUzyteBele,
  ParsedRequirement,
  ParsedWindow,
  CsvProcessResult,
  OrderNumberParsed,
  ParserServiceConfig,
} from './types.js';

// Import wyodrebnionych klas
import { CsvRowValidator } from './validators/CsvRowValidator.js';
import { CsvDataTransformer } from './transformers/CsvDataTransformer.js';
import { OrderNumberParser } from './utils/OrderNumberParser.js';
import { CurrencyConverter } from './utils/CurrencyConverter.js';

// Typ dla transakcji Prisma
type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * CSV Import Service Implementation
 *
 * Orkiestruje parsowanie i przetwarzanie plikow CSV "uzyte bele".
 * Deleguje szczegolowa logike do wyspecjalizowanych klas:
 * - CsvRowValidator - walidacja wierszy
 * - CsvDataTransformer - transformacja danych
 * - OrderNumberParser - parsowanie numerow zlecen
 * - CurrencyConverter - konwersja walut
 */
export class CsvImportService implements ICsvImportService {
  private prisma: PrismaClient;
  private debug: boolean;

  // Wyspecjalizowane klasy pomocnicze
  private validator: CsvRowValidator;
  private transformer: CsvDataTransformer;
  private orderNumberParser: OrderNumberParser;
  private currencyConverter: CurrencyConverter;

  constructor(config: ParserServiceConfig) {
    this.prisma = config.prisma;
    this.debug = config.debug ?? false;

    // Inicjalizacja klas pomocniczych
    this.validator = new CsvRowValidator();
    this.transformer = new CsvDataTransformer();
    this.orderNumberParser = new OrderNumberParser();
    this.currencyConverter = new CurrencyConverter();
  }

  /**
   * Parsuje kwote EUR z formatu Schuco
   * Deleguje do CurrencyConverter
   */
  parseEurAmountFromSchuco(amountStr: string): number | null {
    return this.currencyConverter.parseEurFromSchuco(amountStr);
  }

  /**
   * Parsuje numer zlecenia na skladowe: baza i sufiks
   * Deleguje do OrderNumberParser
   */
  parseOrderNumber(orderNumber: string): OrderNumberParsed {
    return this.orderNumberParser.parse(orderNumber);
  }

  /**
   * Parsuje numer artykulu na numer profilu i kod koloru
   * Deleguje do CsvDataTransformer
   */
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string } {
    return this.transformer.parseArticleNumber(articleNumber);
  }

  /**
   * Oblicza liczbe bel i metrow wedlug specyfikacji
   * Deleguje do CsvDataTransformer
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
    return this.transformer.calculateBeamsAndMeters(originalBeams, restMm);
  }

  /**
   * Podglad pliku CSV bez zapisywania do bazy
   */
  async previewUzyteBele(filepath: string): Promise<ParsedUzyteBele> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia i sprawdz konflikty
    const orderNumberParsed = this.orderNumberParser.parse(parsed.orderNumber);
    parsed.orderNumberParsed = orderNumberParsed;

    // Jesli zlecenie ma sufiks, sprawdz czy bazowe zlecenie istnieje
    if (orderNumberParsed.suffix) {
      const baseOrder = await this.prisma.order.findUnique({
        where: { orderNumber: orderNumberParsed.base },
      });

      // Zawsze zwroc informacje o konflikcie, nawet jesli bazowe nie istnieje
      parsed.conflict = {
        baseOrderExists: baseOrder !== null,
        baseOrderId: baseOrder?.id,
        baseOrderNumber: baseOrder?.orderNumber,
      };
    }

    return parsed;
  }

  /**
   * Przetwarza i zapisuje dane CSV do bazy
   *
   * @param filepath - Sciezka do pliku CSV
   * @param action - 'overwrite' (nadpisz istniejace) lub 'add_new' (utworz nowe/aktualizuj)
   * @param replaceBase - Jesli true i zlecenie ma sufiks, zastap bazowe zlecenie
   */
  async processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean
  ): Promise<CsvProcessResult> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia (przed transakcja)
    const orderNumberParsed = this.orderNumberParser.parse(parsed.orderNumber);
    let targetOrderNumber = parsed.orderNumber;

    // Jesli zlecenie ma sufiks i uzytkownik chce zastapic bazowe
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
      if (this.debug) {
        logger.info(`Replacing base order ${orderNumberParsed.base} (instead of creating ${parsed.orderNumber})`);
      }
    }

    // Przetwarzaj w transakcji dla atomowosci
    const result = await this.processInTransaction(
      parsed,
      targetOrderNumber,
      action
    );

    // Operacje post-transakcyjne (re-matching szklenia, linkowanie Schuco)
    await this.postProcessOrder(targetOrderNumber, result.orderId);

    return result;
  }

  /**
   * Przetwarza dane zlecenia w transakcji bazodanowej
   */
  private async processInTransaction(
    parsed: ParsedUzyteBele,
    targetOrderNumber: string,
    action: 'overwrite' | 'add_new'
  ): Promise<CsvProcessResult> {
    return this.prisma.$transaction(
      async (tx) => {
        // Znajdz lub utworz zlecenie
        let order = await tx.order.findUnique({
          where: { orderNumber: targetOrderNumber },
        });

        if (order && action === 'overwrite') {
          // Atomowo usun istniejace requirements i okna
          await tx.orderRequirement.deleteMany({
            where: { orderId: order.id },
          });
          await tx.orderWindow.deleteMany({
            where: { orderId: order.id },
          });
          // Zaktualizuj zlecenie nowymi danymi CSV
          order = await tx.order.update({
            where: { id: order.id },
            data: this.buildOrderUpdateData(parsed),
          });
        } else if (!order) {
          // Utworz nowe zlecenie
          const eurValue = await this.getEurValueFromSchuco(tx, targetOrderNumber);
          const pendingPrice = await this.getPendingPrice(tx, targetOrderNumber);

          order = await tx.order.create({
            data: {
              orderNumber: targetOrderNumber,
              ...this.buildOrderCreateData(parsed, eurValue, pendingPrice),
            },
          });

          // Oznacz pending price jako zastosowana
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
          // Zaktualizuj istniejace zlecenie nowymi danymi CSV
          order = await tx.order.update({
            where: { id: order.id },
            data: this.buildOrderUpdateData(parsed),
          });
        }

        // Dodaj requirements - batch fetch profili i kolorow aby uniknac N+1
        await this.processRequirementsBatch(tx, order.id, parsed.requirements);

        // Dodaj okna
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
      },
      { timeout: 30000 } // 30s dla duzych importow
    );
  }

  /**
   * Buduje dane aktualizacji zlecenia z sparsowanego CSV
   */
  private buildOrderUpdateData(parsed: ParsedUzyteBele) {
    return {
      client: parsed.client || undefined,
      // Fix: Pusty string powinien byc null, nie undefined
      project: parsed.project?.trim() || null,
      system: parsed.system?.trim() || null,
      deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
      pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
      totalWindows: parsed.totals.windows || undefined,
      totalSashes: parsed.totals.sashes || undefined,
      totalGlasses: parsed.totals.glasses || undefined,
    };
  }

  /**
   * Buduje dane tworzenia zlecenia z sparsowanego CSV
   */
  private buildOrderCreateData(
    parsed: ParsedUzyteBele,
    eurValue: number | undefined,
    pendingPrice: { currency: string; valueNetto: number } | null
  ) {
    let valueEur = eurValue;
    let valuePln: number | undefined;

    if (pendingPrice) {
      if (pendingPrice.currency === 'EUR') {
        valueEur = pendingPrice.valueNetto;
      } else {
        valuePln = pendingPrice.valueNetto;
      }
    }

    return {
      client: parsed.client || undefined,
      // Fix: Pusty string powinien byc null, nie undefined
      project: parsed.project?.trim() || null,
      system: parsed.system?.trim() || null,
      deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
      pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
      totalWindows: parsed.totals.windows || undefined,
      totalSashes: parsed.totals.sashes || undefined,
      totalGlasses: parsed.totals.glasses || undefined,
      valueEur,
      valuePln,
    };
  }

  /**
   * Pobiera wartosc EUR z polaczonej dostawy Schuco
   */
  private async getEurValueFromSchuco(
    tx: PrismaTransaction,
    orderNumber: string
  ): Promise<number | undefined> {
    const schucoLink = await tx.orderSchucoLink.findFirst({
      where: {
        order: { orderNumber },
      },
      include: {
        schucoDelivery: {
          select: { totalAmount: true },
        },
      },
    });

    if (schucoLink?.schucoDelivery?.totalAmount) {
      const parsedAmount = this.currencyConverter.parseEurFromSchuco(
        schucoLink.schucoDelivery.totalAmount
      );
      return parsedAmount ?? undefined;
    }

    return undefined;
  }

  /**
   * Pobiera oczekujaca cene dla zlecenia.
   * Szuka exact match, a jesli nie znajdzie - probuje prefix match
   * (np. zlecenie "53526-a" dopasowuje pending z orderNumber "53526")
   */
  private async getPendingPrice(
    tx: PrismaTransaction,
    orderNumber: string
  ) {
    // Exact match
    const exact = await tx.pendingOrderPrice.findFirst({
      where: {
        orderNumber,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (exact) return exact;

    // Prefix match: zlecenie "53526-a" -> pending "53526"
    const baseNumber = orderNumber.split('-')[0];
    if (baseNumber !== orderNumber) {
      return tx.pendingOrderPrice.findFirst({
        where: {
          orderNumber: baseNumber,
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return null;
  }

  /**
   * Przetwarza requirements batch'em aby uniknac problemu N+1 queries
   * Zamiast 3+ zapytan na requirement, robimy:
   * - 1 zapytanie batch dla wszystkich profili
   * - 1 zapytanie batch dla wszystkich kolorow
   * - N upsertow dla requirements (nieuniknione z logika upsert)
   */
  private async processRequirementsBatch(
    tx: PrismaTransaction,
    orderId: number,
    requirements: ParsedRequirement[]
  ): Promise<void> {
    if (requirements.length === 0) return;

    // Zbieramy wszystkie potrzebne identyfikatory
    const profileNumbers = [...new Set(requirements.map(r => r.profileNumber).filter(Boolean))];
    const articleNumbers = [...new Set(requirements.map(r => r.articleNumber).filter(Boolean))];
    const colorCodes = [...new Set(requirements.map(r => r.colorCode).filter(Boolean))];

    // Batch fetch profili - jedno zapytanie zamiast N
    const profiles = await tx.profile.findMany({
      where: {
        OR: [
          { number: { in: profileNumbers } },
          { articleNumber: { in: articleNumbers } },
        ],
      },
    });

    // Tworzymy mapy dla szybkiego dostepu O(1)
    const profileByNumber = new Map(profiles.map(p => [p.number, p]));
    const profileByArticle = new Map(
      profiles.filter(p => p.articleNumber).map(p => [p.articleNumber!, p])
    );

    // Batch fetch kolorow - jedno zapytanie zamiast N
    const colors = await tx.color.findMany({
      where: { code: { in: colorCodes } },
    });
    const colorByCode = new Map(colors.map(c => [c.code, c]));

    // Zbieramy profile do utworzenia i aktualizacji
    const profilesToCreate: Array<{ number: string; name: string; articleNumber: string }> = [];
    const profilesToUpdate: Array<{ id: number; articleNumber: string }> = [];

    // Pierwszy przebieg - identyfikujemy brakujace profile
    for (const req of requirements) {
      let profile = profileByNumber.get(req.profileNumber);

      if (!profile) {
        profile = profileByArticle.get(req.articleNumber);
      }

      if (!profile) {
        // Profil nie istnieje - dodajemy do listy do utworzenia
        // Sprawdzamy czy juz nie dodalismy tego samego profilu
        const alreadyToCreate = profilesToCreate.find(p => p.number === req.profileNumber);
        if (!alreadyToCreate) {
          profilesToCreate.push({
            number: req.profileNumber,
            name: req.profileNumber,
            articleNumber: req.articleNumber,
          });
        }
      } else if (!profile.articleNumber && req.articleNumber) {
        // Profil istnieje ale nie ma articleNumber - aktualizujemy
        const alreadyToUpdate = profilesToUpdate.find(p => p.id === profile!.id);
        if (!alreadyToUpdate) {
          profilesToUpdate.push({
            id: profile.id,
            articleNumber: req.articleNumber,
          });
        }
      }
    }

    // Batch create nowych profili
    if (profilesToCreate.length > 0) {
      // SQLite nie wspiera skipDuplicates, wiec uzywamy pojedynczych upsert
      // dla nowych profili - to nadal jest szybsze niz N+1 queries
      for (const profileData of profilesToCreate) {
        await tx.profile.upsert({
          where: { number: profileData.number },
          update: {}, // Nic nie aktualizujemy jesli juz istnieje
          create: profileData,
        });
      }

      // Pobieramy nowo utworzone profile
      const newProfiles = await tx.profile.findMany({
        where: { number: { in: profilesToCreate.map(p => p.number) } },
      });

      // Dodajemy do map
      for (const p of newProfiles) {
        profileByNumber.set(p.number, p);
        if (p.articleNumber) {
          profileByArticle.set(p.articleNumber, p);
        }
      }

      if (this.debug) {
        logger.info(`Batch created ${profilesToCreate.length} new profiles`);
      }
    }

    // Batch update profili bez articleNumber
    // Niestety Prisma nie wspiera batch update z roznymi wartosciami,
    // ale to sa rzadkie przypadki wiec OK
    for (const update of profilesToUpdate) {
      const updated = await tx.profile.update({
        where: { id: update.id },
        data: { articleNumber: update.articleNumber },
      });
      profileByNumber.set(updated.number, updated);
      if (updated.articleNumber) {
        profileByArticle.set(updated.articleNumber, updated);
      }
    }

    // Teraz przetwarzamy requirements - kazdy wymaga upsert
    // ale przynajmniej nie robimy juz zapytan o profile i kolory
    const requirementsToUpsert: Array<{
      orderId: number;
      profileId: number;
      colorId: number;
      beamsCount: number;
      meters: number;
      restMm: number;
    }> = [];

    for (const req of requirements) {
      // Znajdz profil w mapie (teraz O(1) zamiast zapytania do DB)
      let profile = profileByNumber.get(req.profileNumber);
      if (!profile) {
        profile = profileByArticle.get(req.articleNumber);
      }

      if (!profile) {
        // To nie powinno sie zdarzyc po batch create, ale dla bezpieczenstwa
        logger.warn(`Profile ${req.profileNumber} not found after batch create, skipping`);
        continue;
      }

      // Znajdz kolor w mapie
      const color = colorByCode.get(req.colorCode);
      if (!color) {
        logger.warn(`Color ${req.colorCode} not found, skipping`);
        continue;
      }

      requirementsToUpsert.push({
        orderId,
        profileId: profile.id,
        colorId: color.id,
        beamsCount: req.calculatedBeams,
        meters: req.calculatedMeters,
        restMm: req.originalRest,
      });
    }

    // Wykonujemy upserty
    // Niestety createMany nie obsluguje upsert, wiec musimy robic pojedynczo
    // ale przynajmniej nie robimy juz zapytan o profile i kolory
    for (const data of requirementsToUpsert) {
      await tx.orderRequirement.upsert({
        where: {
          orderId_profileId_colorId: {
            orderId: data.orderId,
            profileId: data.profileId,
            colorId: data.colorId,
          },
        },
        update: {
          beamsCount: data.beamsCount,
          meters: data.meters,
          restMm: data.restMm,
        },
        create: data,
      });
    }
  }

  /**
   * Post-procesowanie zlecenia po zakonczeniu transakcji
   * - Re-match dostaw szkla
   * - Linkowanie do dostaw Schuco
   */
  private async postProcessOrder(orderNumber: string, _orderId: number): Promise<void> {
    // Re-match niedopasowanych pozycji dostaw szkla
    try {
      // Dynamiczny import aby uniknac circular dependency
      const { GlassDeliveryService } = await import('../../glass-delivery/index.js');
      const glassDeliveryService = new GlassDeliveryService(this.prisma);
      const rematchResult = await glassDeliveryService.rematchUnmatchedForOrders([orderNumber]);
      if (rematchResult.rematched > 0) {
        logger.info(
          `Re-match glass deliveries for ${orderNumber}: ${rematchResult.rematched} matched, ${rematchResult.stillUnmatched} still unmatched`
        );
      }
    } catch (error) {
      logger.warn(
        `Error re-matching glass deliveries for ${orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Auto-link do oczekujacych dostaw Schuco
    try {
      const { SchucoLinkService } = await import('../../schuco/schucoLinkService.js');
      const schucoLinkService = new SchucoLinkService(this.prisma);
      const linksCreated = await schucoLinkService.linkOrderToWaitingDeliveries(orderNumber);
      if (linksCreated > 0) {
        logger.info(`Auto-linked ${linksCreated} Schuco delivery/ies to order ${orderNumber}`);
      }
    } catch (error) {
      logger.warn(
        `Failed to auto-link Schuco deliveries for ${orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parsuje plik CSV "uzyte bele"
   */
  private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
    // Czytaj plik jako buffer, potem dekoduj z Windows-1250
    const buffer = await fs.promises.readFile(filepath);

    // Najpierw probuj Windows-1250 (polskie znaki w Windows)
    let content: string;
    try {
      const decoder = new TextDecoder('windows-1250');
      content = decoder.decode(buffer);
      // Sprawdz czy sa polskie znaki - jesli nie, probuj UTF-8
      if (!content.match(/[acelnoszAcelnoszZzCN]/)) {
        content = buffer.toString('utf-8');
      }
    } catch {
      // Fallback do UTF-8
      content = buffer.toString('utf-8');
    }

    // Usun UTF-8 BOM jesli istnieje (pliki eksportowane z Excela czesto maja BOM)
    content = stripBOM(content);

    const lines = content.split('\n').filter((line) => line.trim());

    const requirements: ParsedRequirement[] = [];
    const windows: ParsedWindow[] = [];
    const totals = { windows: 0, sashes: 0, glasses: 0 };

    let orderNumber = 'UNKNOWN';
    let client: string | undefined;
    let project: string | undefined;
    let system: string | undefined;
    let deadline: string | undefined;
    let pvcDeliveryDate: string | undefined;
    let currentSection = 'requirements';
    let requirementsHeaderSkipped = false;
    let windowsHeaderSkipped = false;

    for (const line of lines) {
      const parts = line.split(';').map((p) => p.trim());
      const lineLower = line.toLowerCase();

      // Parsuj opcjonalne metadane zlecenia
      const metadata = this.transformer.parseMetadataLine(lineLower, line);
      if (metadata) {
        if (metadata.client) client = metadata.client;
        if (metadata.project) project = metadata.project;
        if (metadata.system) system = metadata.system;
        if (metadata.deadline) deadline = metadata.deadline;
        if (metadata.pvcDeliveryDate) pvcDeliveryDate = metadata.pvcDeliveryDate;
      }

      // Wykryj przejscie do sekcji okien
      if (this.validator.isWindowsSectionStart(lineLower)) {
        currentSection = 'windows';
        windowsHeaderSkipped = false;
        continue;
      }

      // Parsuj wiersze podsumowania
      const summary = this.transformer.parseSummaryLine(lineLower, parts);
      if (summary) {
        totals[summary.type] = summary.value;
        continue;
      }

      if (currentSection === 'requirements') {
        // Pomin naglowek requirements
        if (!requirementsHeaderSkipped && this.validator.isRequirementsHeader(parts)) {
          requirementsHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz requirement
        if (parts.length >= 4 && parts[0] && parts[1]) {
          // Pierwszy wiersz danych - wyciagnij numer zlecenia
          // Akceptuj też trailing dash bez sufiksu: 51737- → traktuj jako 51737
          if (orderNumber === 'UNKNOWN' && parts[0].match(/^\d+(?:[-\s][a-zA-Z0-9]{1,3})?-?$/)) {
            orderNumber = parts[0].replace(/-$/, '');
          }

          const numArt = parts[1];
          const nowychBel = parseInt(parts[2]) || 0;
          const reszta = parseInt(parts[3]) || 0;

          // Sprawdz czy to wyglada na prawidlowy numer artykulu Schuco
          // Format: 8 cyfr + opcjonalny suffix "p" (np. 19016000, 19016000p)
          // Pomin artykuly nie-Schuco (np. stalowe jak 202620)
          if (!this.validator.isRequirementRow(parts)) {
            continue;
          }

          try {
            const requirement = this.transformer.transformRequirementRow({
              orderNumber: parts[0],
              articleNumber: numArt,
              beamsCount: nowychBel,
              restMm: reszta,
            });
            requirements.push(requirement);
          } catch (error) {
            // Loguj blad transformacji ale kontynuuj
            if (this.debug) {
              logger.warn(`Failed to transform requirement row: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      } else if (currentSection === 'windows') {
        // Pomin naglowek okien
        if (!windowsHeaderSkipped && this.validator.isWindowsHeader(parts)) {
          windowsHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz okna
        if (this.validator.isWindowRow(parts)) {
          const rawWindow = this.transformer.parseWindowParts(parts);
          if (rawWindow) {
            windows.push(this.transformer.transformWindowRow(rawWindow));
          }
        }
      }
    }

    // Automatyczne uzupelnienie project i system z danych okien
    // jesli nie zostaly sparsowane z metadanych CSV
    const autoFilled = this.transformer.autoFillFromWindows(windows, project, system);

    return {
      orderNumber,
      client,
      project: autoFilled.project,
      system: autoFilled.system,
      deadline,
      pvcDeliveryDate,
      requirements,
      windows,
      totals,
    };
  }
}

/**
 * Tworzy nowa instancje CSV import service
 */
export function createCsvImportService(config: ParserServiceConfig): ICsvImportService {
  return new CsvImportService(config);
}
