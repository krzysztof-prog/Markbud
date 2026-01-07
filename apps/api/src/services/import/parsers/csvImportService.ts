/**
 * CSV Import Service
 *
 * Handles parsing and processing of CSV files for order imports.
 * This is a refactored version of the CsvParser class with improved:
 * - Error handling
 * - Type safety
 * - Testability
 * - Separation of concerns
 *
 * IMPORTANT: This service is behind a feature flag.
 * Enable with ENABLE_NEW_CSV_PARSER=true or ENABLE_NEW_PARSERS=true
 */

import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import type {
  ICsvImportService,
  ParsedUzyteBele,
  ParsedRequirement,
  ParsedWindow,
  CsvProcessResult,
  OrderNumberParsed,
  ParserServiceConfig,
} from './types.js';
import { BEAM_LENGTH_MM, REST_ROUNDING_MM } from './types.js';

// Typ dla transakcji Prisma
type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * CSV Import Service Implementation
 *
 * Provides methods for parsing and processing "uzyte bele" CSV files.
 * Extracted from the monolithic CsvParser for better maintainability.
 */
export class CsvImportService implements ICsvImportService {
  private prisma: PrismaClient;
  private debug: boolean;

  constructor(config: ParserServiceConfig) {
    this.prisma = config.prisma;
    this.debug = config.debug ?? false;
  }

  /**
   * Parse EUR amount from Schuco format
   * Converts "62,30 EUR" to 62.30
   * Converts "2 321,02 EUR" to 2321.02
   */
  parseEurAmountFromSchuco(amountStr: string): number | null {
    if (!amountStr) return null;

    try {
      // Remove currency symbol and spaces
      let cleaned = amountStr.replace(/€/g, '').replace(/EUR/gi, '').trim();

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
   * Parse order number into base and suffix components
   *
   * Examples:
   * - "54222" -> { base: "54222", suffix: null }
   * - "54222-a" -> { base: "54222", suffix: "a" }
   * - "54222a" -> { base: "54222", suffix: "a" }
   * - "54222-abc" -> { base: "54222", suffix: "abc" }
   * - "54222 xxx" -> { base: "54222", suffix: "xxx" }
   */
  parseOrderNumber(orderNumber: string): OrderNumberParsed {
    // Basic validation
    if (!orderNumber || orderNumber.trim().length === 0) {
      throw new Error('Numer zlecenia nie moze byc pusty');
    }

    const trimmed = orderNumber.trim();

    // Length limit
    if (trimmed.length > 20) {
      throw new Error('Numer zlecenia zbyt dlugi (max 20 znakow)');
    }

    // Pattern 1: digits + separator (dash/space) + 1-3 alphanumeric chars
    const matchWithSeparator = trimmed.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
    // Pattern 2: digits + 1-3 letters WITHOUT separator (format "54222a")
    const matchWithoutSeparator = trimmed.match(/^(\d+)([a-zA-Z]{1,3})$/);
    // Pattern 3: just digits
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

    // Invalid format - throw error instead of fallback
    throw new Error(
      `Nieprawidlowy format numeru zlecenia: "${trimmed}". ` +
      `Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")`
    );
  }

  /**
   * Parse article number into profile number and color code
   * Format: X-profil-kolor, e.g., 19016050 -> 9016 = profile, 050 = color
   */
  parseArticleNumber(articleNumber: string): { profileNumber: string; colorCode: string } {
    if (!articleNumber || articleNumber.length < 4) {
      throw new Error(`Nieprawidlowy numer artykulu: "${articleNumber}"`);
    }

    // Remove first character (doesn't have meaning)
    const withoutPrefix = articleNumber.substring(1);

    // Last 3 characters are color code
    const colorCode = withoutPrefix.slice(-3);

    // Rest is profile number
    const profileNumber = withoutPrefix.slice(0, -3);

    return { profileNumber, colorCode };
  }

  /**
   * Calculate beams and meters according to specification
   * - Round up rest to multiple of 500mm
   * - If rest > 0, subtract 1 from beams
   * - rest2 = 6000mm - rounded rest -> to meters
   */
  calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
    // Input validation
    if (!Number.isFinite(originalBeams) || !Number.isFinite(restMm)) {
      throw new Error('Wartosci musza byc liczbami skonczonym');
    }

    if (originalBeams < 0) {
      throw new Error('Liczba bel nie moze byc ujemna');
    }

    if (restMm < 0) {
      throw new Error('Reszta nie moze byc ujemna');
    }

    if (restMm > BEAM_LENGTH_MM) {
      throw new Error(`Reszta (${restMm}mm) nie moze byc wieksza niz dlugosc beli (${BEAM_LENGTH_MM}mm)`);
    }

    if (restMm === 0) {
      return { beams: originalBeams, meters: 0 };
    }

    // Check if we can subtract a beam
    if (originalBeams < 1) {
      throw new Error('Brak bel do odjecia (oryginalna liczba < 1, ale reszta > 0)');
    }

    // Round up rest to multiple of 500mm
    const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

    // Subtract 1 beam
    const beams = originalBeams - 1;

    // rest2 = 6000 - roundedRest
    const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

    // Result validation (protection against calculation errors)
    if (reszta2Mm < 0) {
      logger.warn(`Negative reszta2Mm: ${reszta2Mm}, roundedRest: ${roundedRest}`);
      return { beams, meters: 0 }; // Safe fallback
    }

    const meters = reszta2Mm / 1000;

    return { beams, meters };
  }

  /**
   * Preview a CSV file without saving to database
   */
  async previewUzyteBele(filepath: string): Promise<ParsedUzyteBele> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parse order number and check for conflicts
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);
    parsed.orderNumberParsed = orderNumberParsed;

    // If order has suffix, check if base order exists
    if (orderNumberParsed.suffix) {
      const baseOrder = await this.prisma.order.findUnique({
        where: { orderNumber: orderNumberParsed.base },
      });

      // Always return conflict info, even if base order doesn't exist
      parsed.conflict = {
        baseOrderExists: baseOrder !== null,
        baseOrderId: baseOrder?.id,
        baseOrderNumber: baseOrder?.orderNumber,
      };
    }

    return parsed;
  }

  /**
   * Process and save CSV data to database
   *
   * @param filepath - Path to CSV file
   * @param action - 'overwrite' (overwrite existing) or 'add_new' (create new/update)
   * @param replaceBase - If true and order has suffix, replace base order instead of creating new
   */
  async processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean
  ): Promise<CsvProcessResult> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parse order number (before transaction)
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);
    let targetOrderNumber = parsed.orderNumber;

    // If order has suffix and user wants to replace base
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
      if (this.debug) {
        logger.info(`Replacing base order ${orderNumberParsed.base} (instead of creating ${parsed.orderNumber})`);
      }
    }

    // Process in transaction for atomicity
    const result = await this.processInTransaction(
      parsed,
      targetOrderNumber,
      action
    );

    // Post-transaction operations (glass delivery re-matching, Schuco linking)
    await this.postProcessOrder(targetOrderNumber, result.orderId);

    return result;
  }

  /**
   * Process order data in a database transaction
   */
  private async processInTransaction(
    parsed: ParsedUzyteBele,
    targetOrderNumber: string,
    action: 'overwrite' | 'add_new'
  ): Promise<CsvProcessResult> {
    return this.prisma.$transaction(
      async (tx) => {
        // Find or create order
        let order = await tx.order.findUnique({
          where: { orderNumber: targetOrderNumber },
        });

        if (order && action === 'overwrite') {
          // Atomically delete existing requirements and windows
          await tx.orderRequirement.deleteMany({
            where: { orderId: order.id },
          });
          await tx.orderWindow.deleteMany({
            where: { orderId: order.id },
          });
          // Update order with new CSV data
          order = await tx.order.update({
            where: { id: order.id },
            data: this.buildOrderUpdateData(parsed),
          });
        } else if (!order) {
          // Create new order
          const eurValue = await this.getEurValueFromSchuco(tx, targetOrderNumber);
          const pendingPrice = await this.getPendingPrice(tx, targetOrderNumber);

          order = await tx.order.create({
            data: {
              orderNumber: targetOrderNumber,
              ...this.buildOrderCreateData(parsed, eurValue, pendingPrice),
            },
          });

          // Mark pending price as applied
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
          // Update existing order with new CSV data
          order = await tx.order.update({
            where: { id: order.id },
            data: this.buildOrderUpdateData(parsed),
          });
        }

        // Add requirements - batch fetch profiles and colors first to avoid N+1
        await this.processRequirementsBatch(tx, order.id, parsed.requirements);

        // Add windows
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
      { timeout: 30000 } // 30s for large imports
    );
  }

  /**
   * Build order update data from parsed CSV
   */
  private buildOrderUpdateData(parsed: ParsedUzyteBele) {
    return {
      client: parsed.client || undefined,
      project: parsed.project || undefined,
      system: parsed.system || undefined,
      deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
      pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
      totalWindows: parsed.totals.windows || undefined,
      totalSashes: parsed.totals.sashes || undefined,
      totalGlasses: parsed.totals.glasses || undefined,
    };
  }

  /**
   * Build order create data from parsed CSV
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
      project: parsed.project || undefined,
      system: parsed.system || undefined,
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
   * Get EUR value from linked Schuco delivery
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
      const parsedAmount = this.parseEurAmountFromSchuco(schucoLink.schucoDelivery.totalAmount);
      return parsedAmount ?? undefined;
    }

    return undefined;
  }

  /**
   * Get pending price for order
   */
  private async getPendingPrice(
    tx: PrismaTransaction,
    orderNumber: string
  ) {
    return tx.pendingOrderPrice.findFirst({
      where: {
        orderNumber,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Process requirements in batch to avoid N+1 query problem
   * Instead of 3+ queries per requirement, we do:
   * - 1 batch query for all profiles
   * - 1 batch query for all colors
   * - N upserts for requirements (unavoidable with upsert logic)
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

    // Batch fetch profiles - jedno zapytanie zamiast N
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

    // Batch fetch colors - jedno zapytanie zamiast N
    const colors = await tx.color.findMany({
      where: { code: { in: colorCodes } },
    });
    const colorByCode = new Map(colors.map(c => [c.code, c]));

    // Zbieramy profile do utworzenia i do aktualizacji
    const profilesToCreate: Array<{ number: string; name: string; articleNumber: string }> = [];
    const profilesToUpdate: Array<{ id: number; articleNumber: string }> = [];

    // Pierwszy przebieg - identyfikujemy brakujace profile
    for (const req of requirements) {
      let profile = profileByNumber.get(req.profileNumber);

      if (!profile) {
        profile = profileByArticle.get(req.articleNumber);
      }

      if (!profile) {
        // Profile nie istnieje - dodajemy do listy do utworzenia
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
   * Upsert a requirement for an order
   * @deprecated Use processRequirementsBatch instead to avoid N+1 queries
   */
  private async upsertRequirement(
    tx: PrismaTransaction,
    orderId: number,
    req: ParsedRequirement
  ): Promise<void> {
    // Find or create profile with articleNumber
    let profile = await tx.profile.findUnique({
      where: { number: req.profileNumber },
    });

    if (!profile) {
      // Try to find by articleNumber
      profile = await tx.profile.findUnique({
        where: { articleNumber: req.articleNumber },
      });

      if (!profile) {
        // Create new profile if doesn't exist
        profile = await tx.profile.create({
          data: {
            number: req.profileNumber,
            name: req.profileNumber,
            articleNumber: req.articleNumber,
          },
        });
        if (this.debug) {
          logger.info(`Created new profile ${req.profileNumber} with article number ${req.articleNumber}`);
        }
      }
    } else if (!profile.articleNumber) {
      // If profile exists but has no articleNumber, update it
      profile = await tx.profile.update({
        where: { id: profile.id },
        data: { articleNumber: req.articleNumber },
      });
    }

    // Find color
    const color = await tx.color.findUnique({
      where: { code: req.colorCode },
    });

    if (!color) {
      logger.warn(`Color ${req.colorCode} not found, skipping`);
      return;
    }

    // Create or update requirement
    await tx.orderRequirement.upsert({
      where: {
        orderId_profileId_colorId: {
          orderId,
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
        orderId,
        profileId: profile.id,
        colorId: color.id,
        beamsCount: req.calculatedBeams,
        meters: req.calculatedMeters,
        restMm: req.originalRest,
      },
    });
  }

  /**
   * Post-process order after transaction completes
   * - Re-match glass deliveries
   * - Link to Schuco deliveries
   */
  private async postProcessOrder(orderNumber: string, orderId: number): Promise<void> {
    // Re-match unmatched glass delivery items
    try {
      // Dynamic import to avoid circular dependency
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

    // Auto-link to waiting Schuco deliveries
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
   * Parse CSV "uzyte bele" file
   */
  private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
    // Read file as buffer, then decode from Windows-1250
    const buffer = await fs.promises.readFile(filepath);

    // Try Windows-1250 first (Polish characters in Windows)
    let content: string;
    try {
      const decoder = new TextDecoder('windows-1250');
      content = decoder.decode(buffer);
      // Check if there are Polish characters - if not, try UTF-8
      if (!content.match(/[acelnoszAcelnoszZzCN]/)) {
        content = buffer.toString('utf-8');
      }
    } catch {
      // Fallback to UTF-8
      content = buffer.toString('utf-8');
    }

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

      // Parse optional order metadata
      this.parseMetadata(lineLower, line, {
        setClient: (v) => { client = v; },
        setProject: (v) => { project = v; },
        setSystem: (v) => { system = v; },
        setDeadline: (v) => { deadline = v; },
        setPvcDeliveryDate: (v) => { pvcDeliveryDate = v; },
      });

      // Detect transition to windows section
      if (lineLower.includes('lista okien') || lineLower.includes('lista drzwi')) {
        currentSection = 'windows';
        windowsHeaderSkipped = false;
        continue;
      }

      // Parse summary rows
      if (lineLower.includes('laczna liczba') || lineLower.includes('laczna liczba')) {
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
        // Skip requirements header
        if (!requirementsHeaderSkipped && (parts[0]?.toLowerCase().includes('zlec') || parts[0]?.toLowerCase().includes('numer'))) {
          requirementsHeaderSkipped = true;
          continue;
        }

        // Parse requirements row
        if (parts.length >= 4 && parts[0] && parts[1]) {
          // First data row - extract order number
          if (orderNumber === 'UNKNOWN' && parts[0].match(/^\d+(?:[-\s][a-zA-Z0-9]{1,3})?$/)) {
            orderNumber = parts[0];
          }

          const numArt = parts[1];
          const nowychBel = parseInt(parts[2]) || 0;
          const reszta = parseInt(parts[3]) || 0;

          // Check if it looks like a valid article number (only digits)
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
        // Skip windows header
        if (!windowsHeaderSkipped && (parts[0]?.toLowerCase().includes('lp') || parts[1]?.toLowerCase().includes('szerok'))) {
          windowsHeaderSkipped = true;
          continue;
        }

        // Parse windows row
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

    // Automatyczne wypełnienie project i system z danych okien
    // jeśli nie zostały sparsowane z metadanych CSV
    let finalProject = project;
    let finalSystem = system;

    if ((!finalProject || finalProject.trim() === '') && windows.length > 0) {
      // Pobierz unikalne referencje z okien
      const references = [...new Set(windows.map(w => w.referencja).filter(Boolean))];
      if (references.length > 0) {
        finalProject = references.join(', ');
      }
    }

    if ((!finalSystem || finalSystem.trim() === '') && windows.length > 0) {
      // Pobierz unikalne typy profili z okien
      const profileTypes = [...new Set(windows.map(w => w.typProfilu).filter(Boolean))];
      if (profileTypes.length > 0) {
        finalSystem = profileTypes.join(', ');
      }
    }

    return {
      orderNumber,
      client,
      project: finalProject,
      system: finalSystem,
      deadline,
      pvcDeliveryDate,
      requirements,
      windows,
      totals,
    };
  }

  /**
   * Parse metadata from a line
   */
  private parseMetadata(
    lineLower: string,
    line: string,
    setters: {
      setClient: (v: string) => void;
      setProject: (v: string) => void;
      setSystem: (v: string) => void;
      setDeadline: (v: string) => void;
      setPvcDeliveryDate: (v: string) => void;
    }
  ): void {
    if (lineLower.includes('klient:')) {
      const match = line.match(/klient:\s*([^;]+)/i);
      if (match) setters.setClient(match[1].trim());
    }
    if (lineLower.includes('projekt:')) {
      const match = line.match(/projekt:\s*([^;]+)/i);
      if (match) setters.setProject(match[1].trim());
    }
    if (lineLower.includes('system:')) {
      const match = line.match(/system:\s*([^;]+)/i);
      if (match) setters.setSystem(match[1].trim());
    }
    if (lineLower.includes('termin') && lineLower.includes('realizacji')) {
      const match = line.match(/termin.*realizacji:\s*([^;]+)/i);
      if (match) setters.setDeadline(match[1].trim());
    }
    if (lineLower.includes('dostawa') && lineLower.includes('pvc')) {
      const match = line.match(/dostawa\s+pvc:\s*([^;]+)/i);
      if (match) setters.setPvcDeliveryDate(match[1].trim());
    }
  }
}

/**
 * Create a new CSV import service instance
 */
export function createCsvImportService(config: ParserServiceConfig): ICsvImportService {
  return new CsvImportService(config);
}
