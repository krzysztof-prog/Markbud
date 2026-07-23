/**
 * Parser plików "użyte bele"
 * Odpowiada za parsowanie, walidację i przetwarzanie plików CSV z danymi o użytych belach
 */

import fs from 'fs';
import { prisma } from '../../index.js';
import { GlassDeliveryService } from '../glass-delivery/index.js';
import { SchucoLinkService } from '../schuco/schucoLinkService.js';
import { logger } from '../../utils/logger.js';
import { stripBOM } from '../../utils/string-utils.js';

import { OrderNumberParser } from './OrderNumberParser.js';
import { ArticleNumberParser } from './ArticleNumberParser.js';
import { BeamCalculator } from './BeamCalculator.js';
import type {
  ParsedUzyteBele,
  ParseResult,
  ParseError,
  UzyteBeleWindow,
  UzyteBeleGlass,
  UzytebeleMaterial,
  MaterialCategory,
} from './types.js';

/**
 * Klasa do parsowania plików "użyte bele"
 */
export class UzyteBeleParser {
  private orderNumberParser: OrderNumberParser;
  private articleNumberParser: ArticleNumberParser;
  private beamCalculator: BeamCalculator;

  constructor() {
    this.orderNumberParser = new OrderNumberParser();
    this.articleNumberParser = new ArticleNumberParser();
    this.beamCalculator = new BeamCalculator();
  }

  /**
   * Konwertuje wartość z pliku CSV (np. "406,8") na grosze (40680)
   * Używamy groszy dla zgodności z money.ts
   */
  private parseAmountToGrosze(value: string | undefined): number {
    if (!value || value.trim() === '') return 0;

    // Zamień przecinek na kropkę i parsuj jako float
    const cleaned = value.replace(',', '.').trim();
    const amount = parseFloat(cleaned);

    if (isNaN(amount)) return 0;

    // Konwertuj na grosze (zaokrąglamy do pełnych groszy)
    return Math.round(amount * 100);
  }

  /**
   * Parsuje wartość numeryczną (bez konwersji na grosze)
   */
  private parseNumericValue(value: string | undefined): number {
    if (!value || value.trim() === '') return 0;

    const cleaned = value.replace(',', '.').trim();
    const amount = parseFloat(cleaned);

    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Określa kategorię pozycji materiałówki
   * @param position - numer pozycji
   * @param windowPositions - zbiór pozycji sklasyfikowanych jako okna (na bazie rankingu)
   * @param material - wartość materiału w groszach
   * @param netValue - wartość netto w groszach
   * @param assemblyValueAfterDiscount - wartość montażu po rabacie w groszach
   * @param glazing - szklenia w groszach
   * @param fittings - okucia w groszach
   * @param parts - części w groszach
   */
  private categorizeMaterial(
    position: number,
    windowPositions: Set<number>, // zbiór pozycji sklasyfikowanych jako okna
    material: number,
    netValue: number,
    assemblyValueAfterDiscount: number,
    glazing: number,
    fittings: number,
    parts: number
  ): MaterialCategory {
    // Jeśli pozycja NIE należy do pozycji okien = dodatki
    // Używamy zbioru pozycji okien zamiast prostego porównania position > windowCount,
    // bo w pod-zleceniach (-a, -b) numery pozycji mogą nie zaczynać się od 1
    if (!windowPositions.has(position)) {
      return 'dodatki';
    }

    // Jeśli TYLKO wartość montażu po rabacie ma wartość > 0 (reszta = 0)
    const hasOnlyAssembly = assemblyValueAfterDiscount > 0 &&
      glazing === 0 &&
      fittings === 0 &&
      parts === 0 &&
      material === 0;

    if (hasOnlyAssembly) {
      return 'montaz';
    }

    // Jeśli material = 0 ale wartość netto > 0 = inne
    if (material === 0 && netValue > 0) {
      return 'inne';
    }

    // Normalna pozycja przypisana do okna
    return 'okno';
  }

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
   * Sprawdza czy zlecenie jest oznaczone jako sprawdzone w raporcie produkcji
   * Zlecenia sprawdzone NIE MOGĄ być aktualizowane przez importy
   */
  private async checkIfOrderVerified(orderId: number): Promise<boolean> {
    const verifiedItem = await prisma.productionReportItem.findFirst({
      where: {
        orderId,
        verified: true,
      },
      select: { id: true },
    });
    return verifiedItem !== null;
  }

  /**
   * Podgląd pliku "użyte bele" przed importem
   */
  async previewUzyteBele(filepath: string): Promise<ParsedUzyteBele> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia i sprawdź konflikty
    const orderNumberParsed = this.orderNumberParser.parse(parsed.orderNumber);
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
    const orderNumberParsed = this.orderNumberParser.parse(parsed.orderNumber);
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
   * Znajdź userId dla autora dokumentu na podstawie mapowania
   * Zwraca undefined jeśli brak autora lub brak mapowania
   */
  private async findDocumentAuthorUserId(authorName: string | undefined): Promise<number | undefined> {
    if (!authorName) {
      return undefined;
    }

    // Sprawdź czy istnieje mapowanie dla tego autora
    const mapping = await prisma.documentAuthorMapping.findUnique({
      where: { authorName },
      select: { userId: true },
    });

    return mapping?.userId;
  }

  /**
   * Przetwórz plik "użyte bele" i zapisz do bazy
   * @param filepath - Ścieżka do pliku CSV
   * @param action - 'overwrite' (nadpisz istniejące) lub 'add_new' (utwórz nowe/zaktualizuj)
   * @param replaceBase - Jeśli true i zlecenie ma sufiks, zamieni zlecenie bazowe zamiast tworzyć nowe
   * @param options - Opcjonalne parametry: isPrivateImport - czy to import prywatny (tworzy PrivateColor dla nieznanych kolorów)
   */
  async processUzyteBele(
    filepath: string,
    action: 'overwrite' | 'add_new',
    replaceBase?: boolean,
    options?: { isPrivateImport?: boolean }
  ): Promise<{
    orderId: number;
    requirementsCount: number;
    windowsCount: number;
    glassesCount: number;
    materialsCount: number;
    isNewOrder: boolean;
    skipped?: boolean;
    skippedReason?: string;
  }> {
    const parsed = await this.parseUzyteBeleFile(filepath);

    // Parsuj numer zlecenia (przed transakcją)
    const orderNumberParsed = this.orderNumberParser.parse(parsed.orderNumber);
    let targetOrderNumber = parsed.orderNumber;

    // Jeśli zlecenie ma sufiks i użytkownik chce zamienić bazowe
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
      console.log(`   🔄 Zamienianie zlecenia bazowego ${orderNumberParsed.base} (zamiast tworzenia ${parsed.orderNumber})`);
    }

    // Znajdź userId dla autora dokumentu (PRZED transakcją)
    const documentAuthorUserId = await this.findDocumentAuthorUserId(parsed.documentAuthor);
    if (parsed.documentAuthor && !documentAuthorUserId) {
      console.warn(`⚠️  Autor "${parsed.documentAuthor}" nie ma mapowania - zlecenie zostanie zaimportowane bez przypisanego użytkownika`);
    }

    // Całość w transakcji dla atomicity
    return prisma.$transaction(async (tx) => {
      // Znajdź lub utwórz zlecenie
      let isNewOrder = false;
      let order = await tx.order.findUnique({
        where: { orderNumber: targetOrderNumber },
      });

      // SPRAWDZENIE VERIFIED - jeśli zlecenie istnieje i jest sprawdzone, pomiń
      if (order) {
        const isVerified = await this.checkIfOrderVerified(order.id);
        if (isVerified) {
          logger.info(`⏭️  Pominięto import zlecenia ${targetOrderNumber} - jest sprawdzone w raporcie produkcji`);
          return {
            orderId: order.id,
            requirementsCount: 0,
            windowsCount: 0,
            glassesCount: 0,
            materialsCount: 0,
            isNewOrder: false,
            skipped: true,
            skippedReason: 'verified',
          };
        }
      }

      if (order && action === 'overwrite') {
        // Sprawdź czy nowy numer zlecenia (z pliku) już istnieje jako osobne zlecenie
        // Dotyczy przypadku gdy zastępujemy bazowe (53815) danymi z wariantu (53815-a)
        const newOrderNumber = parsed.orderNumber;
        if (replaceBase && newOrderNumber !== targetOrderNumber) {
          const existingNewOrder = await tx.order.findUnique({
            where: { orderNumber: newOrderNumber },
          });
          if (existingNewOrder) {
            throw new Error(`Zlecenie ${newOrderNumber} już istnieje w systemie. Nie można zastąpić zlecenia ${targetOrderNumber} - usuń najpierw istniejące ${newOrderNumber}.`);
          }
        }

        // Atomowo usuń istniejące requirements, windows, glasses, materials i zapotrzebowanie okuć
        await tx.orderRequirement.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderWindow.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderGlass.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderMaterial.deleteMany({
          where: { orderId: order.id },
        });
        // Usuń zapotrzebowanie okuć - przy zastępowaniu zlecenia stare zapotrzebowanie nie jest aktualne
        await tx.okucDemand.deleteMany({
          where: { orderId: order.id },
        });
        logger.info(`Usunięto zapotrzebowanie okuć dla zlecenia ${order.orderNumber} (zastąpione)`);

        // Zaktualizuj zlecenie o nowe dane z CSV
        // Przy replaceBase zmieniamy też numer zlecenia na nowy (z sufiksem)
        order = await tx.order.update({
          where: { id: order.id },
          data: {
            orderNumber: replaceBase ? newOrderNumber : undefined,
            client: parsed.client || undefined,
            project: parsed.project || undefined,
            system: parsed.system || undefined,
            deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
            pvcDeliveryDate: parsed.pvcDeliveryDate ? new Date(parsed.pvcDeliveryDate) : undefined,
            totalWindows: parsed.totals.windows || undefined,
            totalSashes: parsed.totals.sashes || undefined,
            totalGlasses: parsed.totals.glasses || undefined,
            documentAuthor: parsed.documentAuthor || undefined,
            documentAuthorUserId: documentAuthorUserId || undefined,
          },
        });

        if (replaceBase && newOrderNumber !== targetOrderNumber) {
          logger.info(`Zmieniono numer zlecenia: ${targetOrderNumber} → ${newOrderNumber}`);
        }
      } else if (!order) {
        isNewOrder = true;
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
            documentAuthor: parsed.documentAuthor || undefined,
            documentAuthorUserId: documentAuthorUserId || undefined,
          },
        });

        // Automatyczny re-matching szyb: sprawdź czy istnieją nierozwiązane walidacje
        // dla tego numeru zlecenia (szyby zaimportowane PRZED zleceniem)
        await this.rematchGlassValidations(tx, targetOrderNumber);

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
        // Usuń istniejące dane przed ponownym dodaniem (zapobieganie duplikatom)
        await tx.orderRequirement.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderWindow.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderGlass.deleteMany({
          where: { orderId: order.id },
        });
        await tx.orderMaterial.deleteMany({
          where: { orderId: order.id },
        });

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
            documentAuthor: parsed.documentAuthor || undefined,
            documentAuthorUserId: documentAuthorUserId || undefined,
          },
        });
      }

      // Dodaj requirements (w tej samej transakcji)
      for (const req of parsed.requirements) {
        // Sprawdź czy to stal (numery artykułów zaczynające się od 201 lub 202)
        if (this.articleNumberParser.isSteel(req.articleNumber)) {
          const steelNumber = this.articleNumberParser.parseSteelNumber(req.articleNumber);

          // Znajdź lub utwórz stal
          let steel = await tx.steel.findUnique({
            where: { number: steelNumber },
          });

          if (!steel) {
            // Spróbuj znaleźć po numerze artykułu
            steel = await tx.steel.findUnique({
              where: { articleNumber: req.articleNumber },
            });

            if (!steel) {
              // Utwórz nową stal jeśli nie istnieje
              steel = await tx.steel.create({
                data: {
                  number: steelNumber,
                  name: `Wzmocnienie ${steelNumber}`,
                  articleNumber: req.articleNumber,
                  sortOrder: 0,
                },
              });

              // Utwórz też rekord stanu magazynowego
              await tx.steelStock.create({
                data: {
                  steelId: steel.id,
                  currentStockBeams: 0,
                  initialStockBeams: 0,
                },
              });

              console.log(`Utworzona nowa stal ${steelNumber} z numerem artykułu ${req.articleNumber}`);
            }
          }

          // Utwórz lub zaktualizuj zapotrzebowanie na stal
          await tx.orderSteelRequirement.upsert({
            where: {
              orderId_steelId: {
                orderId: order.id,
                steelId: steel.id,
              },
            },
            update: {
              beamsCount: req.calculatedBeams,
              meters: req.calculatedMeters,
              restMm: req.originalRest,
            },
            create: {
              orderId: order.id,
              steelId: steel.id,
              beamsCount: req.calculatedBeams,
              meters: req.calculatedMeters,
              restMm: req.originalRest,
            },
          });

          // Pomiń logikę profili - stal nie ma koloru
          continue;
        }

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

        // Znajdź kolor Akrobud
        const color = await tx.color.findUnique({
          where: { code: req.colorCode },
        });

        // Zmienne do upsert - albo colorId albo privateColorId
        let colorId: number | null = null;
        let privateColorId: number | null = null;

        if (color) {
          // Znaleziono kolor Akrobud
          colorId = color.id;
        } else if (options?.isPrivateImport) {
          // Import prywatny - znajdź lub utwórz PrivateColor
          let privateColor = await tx.privateColor.findUnique({
            where: { code: req.colorCode },
          });

          if (!privateColor) {
            // Utwórz nowy kolor prywatny
            privateColor = await tx.privateColor.create({
              data: {
                code: req.colorCode,
                name: req.colorCode, // Domyślnie nazwa = kod, użytkownik może zmienić
              },
            });
            console.log(`Utworzono nowy kolor prywatny: ${req.colorCode}`);
          }

          privateColorId = privateColor.id;
        } else {
          // Import zwykły (Akrobud) - utwórz nowy kolor Akrobud
          const newColor = await tx.color.create({
            data: {
              code: req.colorCode,
              name: req.colorCode, // Domyślnie nazwa = kod, użytkownik może zmienić w ustawieniach
              type: 'akrobud',
            },
          });
          console.log(`Utworzono nowy kolor Akrobud: ${req.colorCode}`);
          colorId = newColor.id;
        }

        // Utwórz lub zaktualizuj requirement
        // Uwaga: używamy różnych unique constraints w zależności od typu koloru
        if (colorId) {
          // Kolor Akrobud
          await tx.orderRequirement.upsert({
            where: {
              orderId_profileId_colorId: {
                orderId: order.id,
                profileId: profile.id,
                colorId: colorId,
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
              colorId: colorId,
              beamsCount: req.calculatedBeams,
              meters: req.calculatedMeters,
              restMm: req.originalRest,
            },
          });
        } else if (privateColorId) {
          // Kolor prywatny - używamy innego unique constraint
          await tx.orderRequirement.upsert({
            where: {
              orderId_profileId_privateColorId: {
                orderId: order.id,
                profileId: profile.id,
                privateColorId: privateColorId,
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
              privateColorId: privateColorId,
              beamsCount: req.calculatedBeams,
              meters: req.calculatedMeters,
              restMm: req.originalRest,
            },
          });
        }
      }

      // Dodaj windows (w tej samej transakcji) i zachowaj mapowanie position -> id
      const windowPositionToIdMap = new Map<number, number>();
      for (const win of parsed.windows) {
        const createdWindow = await tx.orderWindow.create({
          data: {
            orderId: order.id,
            position: win.lp, // Zapisujemy numer pozycji (Lp.)
            widthMm: win.szer,
            heightMm: win.wys,
            profileType: win.typProfilu,
            quantity: win.ilosc,
            reference: win.referencja,
          },
        });
        // Zapisz mapowanie: numer pozycji -> id okna w bazie
        windowPositionToIdMap.set(win.lp, createdWindow.id);
      }

      // Dodaj glasses (szyby) - używamy createMany dla lepszej wydajności
      if (parsed.glasses.length > 0) {
        await tx.orderGlass.createMany({
          data: parsed.glasses.map(glass => ({
            orderId: order.id,
            lp: glass.lp,
            position: glass.position,
            widthMm: glass.widthMm,
            heightMm: glass.heightMm,
            quantity: glass.quantity,
            packageType: glass.packageType,
            areaSqm: glass.areaSqm,
          })),
        });
      }

      // Dodaj materials (materiałówka) - przygotuj dane i oblicz sumy przed batch insert
      // Oblicz sumy dla każdej kategorii
      let windowsNetValue = 0;
      let windowsMaterial = 0;
      let assemblyValue = 0;
      let extrasValue = 0;
      let otherValue = 0;

      // Przygotuj dane do batch insert i oblicz sumy jednocześnie
      const materialsData = parsed.materials.map(mat => {
        // Dla kategorii 'okno' - powiąż z odpowiednim oknem
        const orderWindowId = mat.category === 'okno'
          ? (windowPositionToIdMap.get(mat.position) ?? null)
          : null;

        // Oblicz sumy dla każdej kategorii
        // Uwaga: totalNet i material już zawierają pełne wartości dla pozycji,
        // NIE mnożymy przez quantity (to powodowało podwójne liczenie)
        switch (mat.category) {
          case 'okno':
            windowsNetValue += mat.totalNet;
            windowsMaterial += mat.material;
            break;
          case 'montaz':
            assemblyValue += mat.totalNet;
            break;
          case 'dodatki':
            extrasValue += mat.totalNet;
            break;
          case 'inne':
            otherValue += mat.totalNet;
            break;
        }

        return {
          orderId: order.id,
          orderWindowId, // Powiązanie z oknem (tylko dla kategorii 'okno')
          position: mat.position,
          category: mat.category,
          glazing: mat.glazing,
          fittings: mat.fittings,
          parts: mat.parts,
          glassQuantity: mat.glassQuantity,
          material: mat.material,
          assemblyValueBeforeDiscount: mat.assemblyValueBeforeDiscount,
          assemblyValueAfterDiscount: mat.assemblyValueAfterDiscount,
          netValue: mat.netValue,
          totalNet: mat.totalNet,
          quantity: mat.quantity,
          coefficient: mat.coefficient,
          unit: mat.unit,
        };
      });

      // Batch insert materials - jedno zapytanie zamiast N
      if (materialsData.length > 0) {
        await tx.orderMaterial.createMany({
          data: materialsData,
        });
      }

      // Zapisz sumy do zlecenia
      // Dla AKROBUD: windowsNetValue = valueEur (z PDF), NIE z CSV materiałówki
      const isAkrobud = (order.client ?? '').toUpperCase().includes('AKROBUD');
      const finalWindowsNetValue = isAkrobud
        ? (order.valueEur ?? null)
        : (windowsNetValue > 0 ? windowsNetValue : null);

      // Dla prywatnych (nie-AKROBUD): ustaw valuePln z CSV materiałówki (jeśli jeszcze nie ma)
      const shouldSetValuePln = !isAkrobud && windowsNetValue > 0 && order.valuePln == null;

      await tx.order.update({
        where: { id: order.id },
        data: {
          windowsNetValue: finalWindowsNetValue,
          windowsMaterial: windowsMaterial > 0 ? windowsMaterial : null,
          assemblyValue: assemblyValue > 0 ? assemblyValue : null,
          extrasValue: extrasValue > 0 ? extrasValue : null,
          otherValue: otherValue > 0 ? otherValue : null,
          // Dla prywatnych: valuePln = suma netto okien z materiałówki
          ...(shouldSetValuePln ? { valuePln: windowsNetValue } : {}),
        },
      });

      return {
        orderId: order.id,
        requirementsCount: parsed.requirements.length,
        windowsCount: parsed.windows.length,
        glassesCount: parsed.glasses.length,
        materialsCount: parsed.materials.length,
        isNewOrder,
      };
    }, {
      timeout: 60000, // 60s dla dużych importów (zwiększone z 30s - fix timeout issues)
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

      // AUTOMATYCZNE POWIĄZYWANIE OKUĆ (PO ZAKOŃCZENIU TRANSAKCJI)
      // Gdy okucia zostały zaimportowane PRZED zleceniem, mają orderId=null.
      // Po utworzeniu/przeniesieniu zlecenia, linkujemy osierocone okucDemand.
      try {
        const finalOrderNumber = parsed.orderNumber;

        // Znajdź FileImport z okuciami czekającymi na to zlecenie
        const allOkucImports = await prisma.fileImport.findMany({
          where: {
            fileType: 'okuc_zapotrzebowanie',
            status: { in: ['completed', 'pending_review'] },
          },
          select: { id: true, filename: true, metadata: true, createdAt: true, processedAt: true },
        });

        // Filtruj te, które mają pasujący orderNumber i orderId=null w metadata
        const pendingImports = allOkucImports.filter(imp => {
          try {
            const meta = JSON.parse(imp.metadata || '{}');
            return meta.orderNumber === finalOrderNumber && meta.orderId === null;
          } catch {
            return false;
          }
        });

        if (pendingImports.length > 0) {
          const order = await prisma.order.findUnique({
            where: { orderNumber: finalOrderNumber },
            select: { id: true },
          });

          if (order) {
            // Sprawdź czy zlecenie już ma okucia (mogły być dodane w transakcji)
            const existingOkuc = await prisma.okucDemand.count({
              where: { orderId: order.id },
            });

            if (existingOkuc === 0) {
              let totalLinked = 0;

              for (const imp of pendingImports) {
                // Identyfikuj osierocone okucDemand po zakresie czasu importu
                const importStart = imp.createdAt;
                const importEnd = imp.processedAt || new Date(importStart.getTime() + 300000); // +5 min fallback

                const updated = await prisma.okucDemand.updateMany({
                  where: {
                    orderId: null,
                    source: 'csv_import',
                    createdAt: { gte: importStart, lte: importEnd },
                  },
                  data: { orderId: order.id },
                });

                if (updated.count > 0) {
                  // Aktualizuj FileImport metadata
                  const oldMeta = JSON.parse(imp.metadata || '{}');
                  oldMeta.orderId = order.id;
                  oldMeta.orderExists = true;
                  oldMeta.autoLinkedAt = new Date().toISOString();
                  oldMeta.autoLinkReason = 'order-created-after-import';

                  await prisma.fileImport.update({
                    where: { id: imp.id },
                    data: { metadata: JSON.stringify(oldMeta) },
                  });

                  totalLinked += updated.count;
                  logger.info(`Auto-link okuć: ${imp.filename} → ${finalOrderNumber} (${updated.count} pozycji)`);
                }
              }

              if (totalLinked > 0) {
                await prisma.order.update({
                  where: { id: order.id },
                  data: { okucDemandStatus: 'imported' },
                });
                logger.info(`Auto-linked ${totalLinked} okucia pozycji do zlecenia ${finalOrderNumber}`);
              }
            }
          }
        }
      } catch (error) {
        logger.warn(`Błąd auto-linkingu okuć dla ${parsed.orderNumber}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      }

      return result;
    });
  }

  /**
   * Automatyczny re-matching szyb do nowo utworzonego zlecenia.
   * Gdy szyby zostały zaimportowane PRZED zleceniem, tworzona jest walidacja
   * 'missing_production_order'. Ta metoda sprawdza czy takie walidacje istnieją
   * i automatycznie dopasowuje szyby do zlecenia.
   */
  private async rematchGlassValidations(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    orderNumber: string
  ): Promise<void> {
    const unresolvedValidations = await tx.glassOrderValidation.findMany({
      where: {
        orderNumber,
        validationType: 'missing_production_order',
        resolved: false,
        glassOrder: { deletedAt: null },
      },
      include: {
        glassOrder: {
          select: { expectedDeliveryDate: true, glassOrderNumber: true },
        },
      },
    });

    if (unresolvedValidations.length === 0) return;

    let totalGlassCount = 0;
    let glassDeliveryDate: Date | null = null;

    for (const validation of unresolvedValidations) {
      const quantity = validation.orderedQuantity || 0;
      if (quantity <= 0) continue;

      totalGlassCount += quantity;

      // Użyj daty dostawy z glass order (pierwsza niepusta)
      if (!glassDeliveryDate && validation.glassOrder?.expectedDeliveryDate) {
        glassDeliveryDate = validation.glassOrder.expectedDeliveryDate;
      }

      // Oznacz walidację jako rozwiązaną
      await tx.glassOrderValidation.update({
        where: { id: validation.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: 'auto-rematch-on-import',
        },
      });
    }

    // Zaktualizuj zlecenie z danymi o szybach
    if (totalGlassCount > 0) {
      const updateData: Record<string, unknown> = {
        orderedGlassCount: { increment: totalGlassCount },
        glassOrderStatus: 'ordered',
      };

      if (glassDeliveryDate) {
        updateData.glassDeliveryDate = glassDeliveryDate;
      }

      await tx.order.update({
        where: { orderNumber },
        data: updateData,
      });

      logger.info(
        `Auto re-match szyb: zlecenie ${orderNumber} ← ${totalGlassCount} szyb z ${unresolvedValidations.length} walidacji`
      );
    }
  }

  /**
   * Parsuj plik CSV "użyte bele"
   */
  async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
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
    const glasses: UzyteBeleGlass[] = [];
    const materials: UzytebeleMaterial[] = [];
    const totals = { windows: 0, sashes: 0, glasses: 0 };

    let orderNumber = 'UNKNOWN';
    let client: string | undefined;
    let project: string | undefined;
    let system: string | undefined;
    let deadline: string | undefined;
    let pvcDeliveryDate: string | undefined;
    let documentAuthor: string | undefined;
    let currentSection = 'requirements'; // 'requirements', 'windows', 'glasses' lub 'materials'
    let requirementsHeaderSkipped = false;
    let windowsHeaderSkipped = false;
    let glassesHeaderSkipped = false;
    let materialsHeaderSkipped = false;
    let glassLpCounter = 0;

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
      if (lineLower.includes('autor') && lineLower.includes('dokumentu')) {
        const match = line.match(/autor.*dokumentu:\s*([^;]+)/i);
        if (match) documentAuthor = match[1].trim();
      }

      // Wykryj przejście do sekcji windows
      if (lineLower.includes('lista okien') || lineLower.includes('lista drzwi')) {
        currentSection = 'windows';
        windowsHeaderSkipped = false;
        continue;
      }

      // Wykryj przejście do sekcji glasses (szyby)
      if (lineLower.includes('lista szyb')) {
        currentSection = 'glasses';
        glassesHeaderSkipped = false;
        glassLpCounter = 0;
        continue;
      }

      // Wykryj przejście do sekcji materiałówka
      if (lineLower.includes('materialowka') || lineLower.includes('materiałówka')) {
        currentSection = 'materials';
        materialsHeaderSkipped = false;
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
          // Bierz tylko pierwszą wartość (z górnej sekcji podsumowania, nie z dolnej po liście szyb)
          if (totals.glasses === 0) {
            totals.glasses = value;
          }
        }
        continue;
      }

      // Parsuj podsumowanie szyb (format: "Laczna lic:;14")
      if (lineLower.includes('laczna lic') || lineLower.includes('łączna lic')) {
        // Jeśli jeszcze nie mamy totals.glasses, użyj tej wartości
        const value = parseInt(parts[1]) || 0;
        if (totals.glasses === 0 && value > 0) {
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
          // Akceptuj też trailing dash bez sufiksu: 51737- → traktuj jako 51737
          if (orderNumber === 'UNKNOWN' && parts[0].match(/^\d+(?:[-\s][a-zA-Z0-9]{1,3})?-?$/)) {
            orderNumber = parts[0].replace(/-$/, '');
          }

          const numArt = parts[1];
          const nowychBel = parseInt(parts[2]) || 0;
          const reszta = parseInt(parts[3]) || 0;

          // Sprawdź czy to wygląda jak poprawny numer artykułu (8 cyfr, opcjonalnie "p" na końcu)
          // Przykłady: 19016000, 18866000, 19016000p
          if (!numArt.match(/^\d{8}p?$/i)) {
            continue;
          }

          const { profileNumber, colorCode } = this.articleNumberParser.parse(numArt);
          const { beams, meters } = this.beamCalculator.calculate(nowychBel, reszta);

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
      } else if (currentSection === 'glasses') {
        // Pomiń nagłówek glasses
        // Format nagłówka: "Lp.;Pozycja;Szerokosc;Wysokosc;Ilosc;Typ pakietu"
        if (!glassesHeaderSkipped && (parts[0]?.toLowerCase().includes('lp') || parts[1]?.toLowerCase().includes('pozycja'))) {
          glassesHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz glasses - lp musi być liczbą
        // Format: 1;1;773;2222;1;4/18/4/18/4S3 Ug=0.5
        if (parts.length >= 6 && parts[0].match(/^\d+$/)) {
          glassLpCounter++;
          const widthMm = parseInt(parts[2]) || 0;
          const heightMm = parseInt(parts[3]) || 0;
          const quantity = parseInt(parts[4]) || 1;

          // Oblicz powierzchnię w m² (szerokość × wysokość / 1000000)
          const areaSqm = (widthMm * heightMm) / 1000000;

          glasses.push({
            lp: glassLpCounter,
            position: parseInt(parts[1]) || 0,
            widthMm,
            heightMm,
            quantity,
            packageType: parts[5] || '',
            areaSqm: Math.round(areaSqm * 10000) / 10000, // Zaokrąglenie do 4 miejsc po przecinku
          });
        }
      } else if (currentSection === 'materials') {
        // Pomiń nagłówek materiałówki
        // Format nagłówka: "Dokument;Pozycja;Szklenia;Okucia;Czesci;Ilosc szkle;Material;Wartosc n;Wartosc n;Wartosc n;Suma nett;Sztuk;wspolczyn;jednostka"
        if (!materialsHeaderSkipped && (parts[0]?.toLowerCase().includes('dokument') || parts[1]?.toLowerCase().includes('pozycja'))) {
          materialsHeaderSkipped = true;
          continue;
        }

        // Parsuj wiersz materiałówki
        // Format: 6146;1;406,8;275,69;662,04;4;1344,53;2427,7;0;0;2427,7;2;1,81;1,64
        // Kolumny: Dokument(0), Pozycja(1), Szklenia(2), Okucia(3), Czesci(4), Ilosc szkle(5),
        //          Material(6), Wartosc n montazu przed rabatem(7), Wartosc n montazu po rabacie(8),
        //          Wartosc n(9), Suma nett(10), Sztuk(11), wspolczyn(12), jednostka(13)
        if (parts.length >= 10) {
          const positionStr = parts[1];
          // Pozycja może być pusta lub mieć liczbę
          const position = parseInt(positionStr) || 0;

          // Pomijamy wiersz jeśli pozycja = 0 lub wygląda jak podsumowanie
          if (position === 0) {
            continue;
          }

          // Parsuj wartości - konwertuj na grosze
          const glazing = this.parseAmountToGrosze(parts[2]);
          const fittings = this.parseAmountToGrosze(parts[3]);
          const partsValue = this.parseAmountToGrosze(parts[4]);
          const glassQuantity = parseInt(parts[5]) || 0;
          const material = this.parseAmountToGrosze(parts[6]);
          const assemblyValueBeforeDiscount = this.parseAmountToGrosze(parts[7]);
          const assemblyValueAfterDiscount = this.parseAmountToGrosze(parts[8]);
          const netValue = this.parseAmountToGrosze(parts[9]);
          const totalNet = this.parseAmountToGrosze(parts[10]);
          const quantity = parseInt(parts[11]) || 1;
          const coefficient = parts[12] ? this.parseNumericValue(parts[12]) : null;
          const unit = parts[13] ? this.parseNumericValue(parts[13]) : null;

          // Kategoria zostanie określona później, gdy będziemy znać liczbę niezerowych okien
          materials.push({
            position,
            category: 'okno', // Tymczasowa kategoria - zostanie przeliczona później
            glazing,
            fittings,
            parts: partsValue,
            glassQuantity,
            material,
            assemblyValueBeforeDiscount,
            assemblyValueAfterDiscount,
            netValue,
            totalNet,
            quantity,
            coefficient,
            unit,
          });
        }
      }
    }

    // Filtruj zerowe okna (szerokość=0 i wysokość=0 to nie są okna)
    const filteredWindows = windows.filter(w => w.szer > 0 || w.wys > 0);
    const nonZeroWindowCount = filteredWindows.length;

    // Wyznacz zbiór pozycji materiałów które odpowiadają oknom
    // Sortujemy unikalne pozycje rosnąco i bierzemy pierwsze N (= liczba okien)
    // Dzięki temu pod-zlecenia (-a, -b) z pozycjami np. 3 zamiast 1 są poprawnie klasyfikowane
    const sortedUniquePositions = [...new Set(materials.map(m => m.position))].sort((a, b) => a - b);
    const windowPositions = new Set(sortedUniquePositions.slice(0, nonZeroWindowCount));

    // Określ kategorie dla pozycji materiałówki
    const categorizedMaterials = materials.map(m => ({
      ...m,
      category: this.categorizeMaterial(
        m.position,
        windowPositions,
        m.material,
        m.netValue,
        m.assemblyValueAfterDiscount,
        m.glazing,
        m.fittings,
        m.parts
      ),
    }));

    // Auto-fill project i system z danych okien jeśli nie zostały sparsowane z metadanych
    let finalProject = project;
    let finalSystem = system;

    if ((!finalProject || finalProject.trim() === '') && filteredWindows.length > 0) {
      // Pobierz unikalne referencje z okien
      const references = [...new Set(filteredWindows.map(w => w.referencja).filter(Boolean))];
      if (references.length > 0) {
        finalProject = references.join(', ');
      }
    }

    if ((!finalSystem || finalSystem.trim() === '') && filteredWindows.length > 0) {
      // Pobierz unikalne typy profili z okien
      const profileTypes = [...new Set(filteredWindows.map(w => w.typProfilu).filter(Boolean))];
      if (profileTypes.length > 0) {
        finalSystem = profileTypes.join(', ');
      }
    }

    // Policz szyby wykluczając panele i wypełnienia (to nie są prawdziwe szyby)
    // Sumujemy quantity (fizyczne sztuki), nie liczbę pozycji/rekordów
    if (glasses.length > 0) {
      let realGlassCount = 0;
      for (const glass of glasses) {
        const packageTypeLower = (glass.packageType || '').toLowerCase();
        // Jeśli packageType NIE zawiera "panel" ani "wypełnienie"/"wypelnienie", to jest to prawdziwa szyba
        if (!packageTypeLower.includes('panel') && !packageTypeLower.includes('wypełnienie') && !packageTypeLower.includes('wypelnienie')) {
          realGlassCount += glass.quantity;
        }
      }
      // Nadpisz totals.glasses sumą sztuk szyb (bez paneli/wypełnień)
      totals.glasses = realGlassCount;
    }

    return {
      orderNumber,
      client,
      project: finalProject,
      system: finalSystem,
      deadline,
      pvcDeliveryDate,
      documentAuthor,
      requirements,
      windows: filteredWindows, // Zwracamy tylko niezerowe okna
      glasses,
      materials: categorizedMaterials,
      totals,
    };
  }
}

// Eksport instancji singletona dla wygody
export const uzyteBeleParser = new UzyteBeleParser();
