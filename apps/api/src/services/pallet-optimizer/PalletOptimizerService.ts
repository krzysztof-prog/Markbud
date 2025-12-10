/**
 * Pallet Optimizer Service - Business logic for pallet optimization
 *
 * Algorytm optymalizacji pakowania okien na palety:
 * 1. Weryfikacja danych wejściowych
 * 2. Przypisanie głębokości według typu profilu
 * 3. Inteligentne sortowanie (szerokość + wysokość gdy podobne)
 * 4. Układanie na paletach z minimalizacją liczby palet
 * 5. Zapisanie wyniku do bazy
 */

import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { PalletOptimizerRepository } from '../../repositories/PalletOptimizerRepository.js';

// ==================== INTERFACES ====================

export interface WindowInput {
  id: number;
  orderId: number;
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  profileType: string; // Dynamic - supports any profile type configured in ProfileDepth table
  quantity: number;
  reference?: string;
}

export interface PalletDefinition {
  name: string;
  lengthMm: number;        // Długość palety (odpowiada szerokości okna)
  maxLoadDepthMm: number;  // Głębokość załadunku
  maxOverhangMm: number;   // Maksymalne wystawanie
}

export interface OptimizedWindow extends WindowInput {
  depthMm: number; // Zajmowana głębokość na palecie
  sideBySideGroupId?: number; // ID grupy okien ułożonych obok siebie (undefined = pojedyncze okno)
}

export interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletLengthMm: number;  // Długość palety (odpowiada szerokości okien)
  maxDepthMm: number;
  usedDepthMm: number;
  utilizationPercent: number;
  windows: OptimizedWindow[];
}

export interface OptimizationResult {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: {
    totalWindows: number;
    averageUtilization: number;
  };
  options?: OptimizationOptions;
}

/**
 * Opcje optymalizacji - checkboxy z parametrami sortowania
 */
export interface OptimizationOptions {
  // Sortowanie
  sortByHeightWhenWidthSimilar: boolean;  // Gdy szerokości podobne (±15%), sortuj po wysokości
  widthSimilarityThreshold: number;       // Próg podobieństwa szerokości (domyślnie 0.15 = 15%)

  // Palety
  preferStandardPallets: boolean;         // Preferuj standardowe palety nad małe
  minimizeOverhang: boolean;              // Minimalizuj wystawanie okien poza paletę
  maxOverhangMm: number;                  // Maksymalne wystawanie (domyślnie 700mm)
  maximizeUtilization: boolean;           // Preferuj jak najmniej wolnego miejsca na paletach

  // Układanie
  allowSideBySide: boolean;               // Pozwól układać dwa okna obok siebie (suma szerokości)
  sideBySideMaxGap: number;               // Maksymalny gap między oknami obok siebie (mm)
}

/**
 * Kontekst optymalizacji - przekazywany do metod prywatnych
 * (thread-safe - każde wywołanie ma własny kontekst)
 */
interface OptimizationContext {
  options: OptimizationOptions;
  profileDepths: Record<string, number>;
}

// ==================== SERVICE ====================

/**
 * Domyślne opcje optymalizacji
 */
const DEFAULT_OPTIONS: OptimizationOptions = {
  sortByHeightWhenWidthSimilar: true,
  widthSimilarityThreshold: 0.15,        // 15%
  preferStandardPallets: true,
  minimizeOverhang: true,
  maxOverhangMm: 700,
  maximizeUtilization: true,             // Domyślnie włączone - wypełniaj palety maksymalnie
  allowSideBySide: true,
  sideBySideMaxGap: 100,                 // 100mm gap max
};

export class PalletOptimizerService {
  constructor(private repository: PalletOptimizerRepository) {}

  /**
   * Główna metoda optymalizacji dla dostawy
   */
  async optimizeDelivery(
    deliveryId: number,
    options?: Partial<OptimizationOptions>
  ): Promise<OptimizationResult> {
    logger.info(`Starting pallet optimization for delivery ${deliveryId}`);

    // Połącz opcje z domyślnymi (lokalna zmienna - thread-safe)
    const mergedOptions: OptimizationOptions = { ...DEFAULT_OPTIONS, ...options };

    // 1. Pobierz okna dla dostawy (sprawdzi czy dostawa istnieje)
    const windows = await this.repository.getDeliveryWindows(deliveryId);

    if (windows.length === 0) {
      throw new ValidationError('Delivery has no windows to optimize');
    }

    // 2. Pobierz głębokości profili z bazy
    const profileDepths = await this.repository.getProfileDepths();

    if (Object.keys(profileDepths).length === 0) {
      throw new ValidationError('No profile depths configured in database');
    }

    // 3. Pobierz definicje palet z bazy
    const palletDefinitions = await this.repository.getPalletTypes();

    if (palletDefinitions.length === 0) {
      throw new ValidationError('No pallet types defined in database');
    }

    // Kontekst optymalizacji (thread-safe)
    const ctx: OptimizationContext = {
      options: mergedOptions,
      profileDepths,
    };

    // 4. Uruchom algorytm pakowania
    const optimizedPallets = this.packWindows(windows, palletDefinitions, ctx);

    // 5. Oblicz statystyki
    const totalWindows = windows.reduce((sum, w) => sum + w.quantity, 0);
    const averageUtilization = optimizedPallets.length > 0
      ? optimizedPallets.reduce((sum, p) => sum + p.utilizationPercent, 0) / optimizedPallets.length
      : 0;

    const result: OptimizationResult = {
      deliveryId,
      totalPallets: optimizedPallets.length,
      pallets: optimizedPallets,
      summary: {
        totalWindows,
        averageUtilization,
      },
      options: mergedOptions,
    };

    // 6. Zapisz wynik do bazy (przez repository)
    await this.repository.saveOptimization(result);

    logger.info(`Pallet optimization completed: ${result.totalPallets} pallets, ${totalWindows} windows`);

    return result;
  }

  /**
   * Główny algorytm pakowania okien na palety
   */
  private packWindows(
    windows: WindowInput[],
    palletDefinitions: PalletDefinition[],
    ctx: OptimizationContext
  ): OptimizedPallet[] {
    // KROK 1: Weryfikacja danych
    this.validateWindows(windows);

    // KROK 2: Przekształcenie danych - przypisanie głębokości
    const expandedWindows: OptimizedWindow[] = [];
    for (const window of windows) {
      const optimizedWindow = this.assignDepth(window, ctx);
      for (let i = 0; i < window.quantity; i++) {
        expandedWindows.push({ ...optimizedWindow });
      }
    }

    // KROK 3: Inteligentne sortowanie
    const sortedWindows = this.smartSortWindows(expandedWindows, ctx);

    // KROK 4: Sortowanie palet - preferuj standardowe (większe) nad małe
    const sortedPalletDefs = this.sortPalletDefinitions(palletDefinitions, ctx);

    // KROK 5: Układanie okien na paletach
    const pallets: OptimizedPallet[] = [];
    const placedWindowIndices = new Set<number>();
    let sideBySideGroupCounter = 0; // Licznik grup side-by-side

    for (let i = 0; i < sortedWindows.length; i++) {
      if (placedWindowIndices.has(i)) continue;

      const window = sortedWindows[i];

      // Spróbuj umieścić na istniejącej palecie
      let placed = this.tryPlaceOnExistingPallet(window, pallets, placedWindowIndices, i, ctx);

      // Jeśli włączone układanie obok siebie - spróbuj znaleźć parę
      if (!placed && ctx.options.allowSideBySide) {
        const result = this.tryPlaceSideBySide(
          window, i, sortedWindows, pallets, palletDefinitions, placedWindowIndices, ctx, sideBySideGroupCounter
        );
        placed = result.placed;
        if (result.newGroupId !== undefined) {
          sideBySideGroupCounter = result.newGroupId + 1;
        }
      }

      // Jeśli nie udało się - utwórz nową paletę
      if (!placed) {
        const newPallet = this.createNewPallet(window, sortedPalletDefs, pallets.length + 1, ctx);
        if (newPallet) {
          pallets.push(newPallet);
          placedWindowIndices.add(i);
        } else {
          throw new ValidationError(
            `Window ${window.widthMm}mm is too wide for any pallet (max: ${Math.max(...palletDefinitions.map(p => p.lengthMm))}mm + ${ctx.options.maxOverhangMm}mm)`
          );
        }
      }
    }

    // KROK 6: Końcowa optymalizacja - posortuj okna w każdej palecie
    for (const pallet of pallets) {
      // Sortuj od najwyższych do najniższych (lepszy wygląd na palecie)
      pallet.windows.sort((a, b) => b.heightMm - a.heightMm);
    }

    return pallets;
  }

  /**
   * Inteligentne sortowanie okien:
   * - Podstawowo: od najszerszego do najwęższego
   * - Gdy szerokości podobne (±threshold): sortuj po wysokości (od najwyższego)
   */
  private smartSortWindows(windows: OptimizedWindow[], ctx: OptimizationContext): OptimizedWindow[] {
    const threshold = ctx.options.widthSimilarityThreshold;

    return [...windows].sort((a, b) => {
      // Podstawowe sortowanie po szerokości
      const widthDiff = b.widthMm - a.widthMm;

      // Jeśli szerokości są podobne (w zakresie ±threshold)
      const absWidthDiff = Math.abs(a.widthMm - b.widthMm);
      const avgWidth = (a.widthMm + b.widthMm) / 2;
      const widthsSimilar = avgWidth > 0 && absWidthDiff / avgWidth <= threshold;

      if (ctx.options.sortByHeightWhenWidthSimilar && widthsSimilar) {
        // Sortuj po wysokości (od najwyższego do najniższego)
        return b.heightMm - a.heightMm;
      }

      // Domyślnie: od najszerszego do najwęższego
      return widthDiff;
    });
  }

  /**
   * Sortuj definicje palet - preferuj standardowe (większe) nad małe
   */
  private sortPalletDefinitions(pallets: PalletDefinition[], ctx: OptimizationContext): PalletDefinition[] {
    if (ctx.options.preferStandardPallets) {
      // Od najdłuższej do najkrótszej (standardowe najpierw)
      return [...pallets].sort((a, b) => b.lengthMm - a.lengthMm);
    }
    // Od najkrótszej do najdłuższej
    return [...pallets].sort((a, b) => a.lengthMm - b.lengthMm);
  }

  /**
   * Spróbuj umieścić okno na istniejącej palecie
   * Gdy maximizeUtilization jest włączone - wybierz paletę gdzie zostanie najmniej wolnego miejsca (best fit)
   * Gdy wyłączone - wybierz pierwszą pasującą paletę z największym wykorzystaniem
   */
  private tryPlaceOnExistingPallet(
    window: OptimizedWindow,
    pallets: OptimizedPallet[],
    placedIndices: Set<number>,
    windowIndex: number,
    ctx: OptimizationContext
  ): boolean {
    // Znajdź wszystkie palety gdzie okno pasuje (bez wystawania jeśli minimizeOverhang)
    const candidates: Array<{ pallet: OptimizedPallet; remainingDepth: number; withOverhang: boolean }> = [];

    for (const pallet of pallets) {
      // Sprawdź bez wystawania
      const windowFitsNoOverhang = window.widthMm <= pallet.palletLengthMm;
      const hasDepth = pallet.usedDepthMm + window.depthMm <= pallet.maxDepthMm;

      if (windowFitsNoOverhang && hasDepth) {
        candidates.push({
          pallet,
          remainingDepth: pallet.maxDepthMm - (pallet.usedDepthMm + window.depthMm),
          withOverhang: false,
        });
      }
    }

    // Jeśli nie znaleziono bez wystawania, sprawdź z wystawaniem
    if (candidates.length === 0 || !ctx.options.minimizeOverhang) {
      for (const pallet of pallets) {
        const maxAllowedWidth = pallet.palletLengthMm + ctx.options.maxOverhangMm;
        const windowFits = window.widthMm <= maxAllowedWidth;
        const hasDepth = pallet.usedDepthMm + window.depthMm <= pallet.maxDepthMm;
        const alreadyAdded = candidates.some(c => c.pallet === pallet);

        if (windowFits && hasDepth && !alreadyAdded) {
          candidates.push({
            pallet,
            remainingDepth: pallet.maxDepthMm - (pallet.usedDepthMm + window.depthMm),
            withOverhang: true,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return false;
    }

    // Wybierz najlepszego kandydata
    let selected: typeof candidates[0];

    if (ctx.options.maximizeUtilization) {
      // Best Fit: wybierz paletę z najmniejszą pozostałą głębokością (najlepsze wypełnienie)
      // Preferuj palety bez wystawania
      candidates.sort((a, b) => {
        // Najpierw preferuj bez wystawania
        if (a.withOverhang !== b.withOverhang) {
          return a.withOverhang ? 1 : -1;
        }
        // Potem po najmniejszej pozostałej głębokości
        return a.remainingDepth - b.remainingDepth;
      });
      selected = candidates[0];
    } else {
      // First Fit: wybierz pierwszą pasującą paletę z największym wykorzystaniem
      // Preferuj palety bez wystawania
      candidates.sort((a, b) => {
        // Najpierw preferuj bez wystawania
        if (a.withOverhang !== b.withOverhang) {
          return a.withOverhang ? 1 : -1;
        }
        // Potem po największym aktualnym wykorzystaniu
        return b.pallet.utilizationPercent - a.pallet.utilizationPercent;
      });
      selected = candidates[0];
    }

    // Umieść okno na wybranej palecie
    selected.pallet.windows.push(window);
    selected.pallet.usedDepthMm += window.depthMm;
    selected.pallet.utilizationPercent = (selected.pallet.usedDepthMm / selected.pallet.maxDepthMm) * 100;
    placedIndices.add(windowIndex);
    return true;
  }

  /**
   * Spróbuj ułożyć dwa okna obok siebie na palecie
   * Zwraca obiekt z informacją czy udało się i ID grupy side-by-side
   */
  private tryPlaceSideBySide(
    window: OptimizedWindow,
    windowIndex: number,
    allWindows: OptimizedWindow[],
    pallets: OptimizedPallet[],
    palletDefs: PalletDefinition[],
    placedIndices: Set<number>,
    ctx: OptimizationContext,
    groupIdCounter: number
  ): { placed: boolean; newGroupId?: number } {
    // Znajdź drugie okno o podobnej wysokości
    for (let j = windowIndex + 1; j < allWindows.length; j++) {
      if (placedIndices.has(j)) continue;

      const otherWindow = allWindows[j];

      // Sprawdź czy wysokości są podobne (±15%)
      const heightDiff = Math.abs(window.heightMm - otherWindow.heightMm);
      const avgHeight = (window.heightMm + otherWindow.heightMm) / 2;
      if (avgHeight > 0 && heightDiff / avgHeight > 0.15) continue;

      // Oblicz łączną szerokość + gap
      const combinedWidth = window.widthMm + otherWindow.widthMm + ctx.options.sideBySideMaxGap;

      // Głębokość = maksymalna z dwóch (bo stoją obok siebie)
      const combinedDepth = Math.max(window.depthMm, otherWindow.depthMm);

      // Side-by-side TYLKO gdy mieści się w palecie (nie pozwalamy na wystawanie przy side-by-side)
      // Wystawanie jest dozwolone tylko dla pojedynczych okien, nie dla par

      // Oznacz oba okna jako parę side-by-side (dzielą tę samą głębokość!)
      // Każde okno ma depthMm = połowa wspólnej głębokości, żeby suma się zgadzała
      const halfDepth = combinedDepth / 2;

      // Znajdź paletę która pomieści oba okna (bez wystawania!)
      // Przy maximizeUtilization - wybierz paletę z najmniejszą pozostałą głębokością
      const palletCandidates: Array<{ pallet: OptimizedPallet; remainingDepth: number }> = [];
      for (const pallet of pallets) {
        // Dla side-by-side zawsze używamy długości palety bez wystawania
        if (combinedWidth <= pallet.palletLengthMm && pallet.usedDepthMm + combinedDepth <= pallet.maxDepthMm) {
          palletCandidates.push({
            pallet,
            remainingDepth: pallet.maxDepthMm - (pallet.usedDepthMm + combinedDepth),
          });
        }
      }

      if (palletCandidates.length > 0) {
        // Wybierz najlepszą paletę
        if (ctx.options.maximizeUtilization) {
          // Best fit - najmniejsza pozostała głębokość
          palletCandidates.sort((a, b) => a.remainingDepth - b.remainingDepth);
        } else {
          // First fit - największe aktualne wykorzystanie
          palletCandidates.sort((a, b) => b.pallet.utilizationPercent - a.pallet.utilizationPercent);
        }

        const selectedPallet = palletCandidates[0].pallet;
        // Dodaj oba okna z oznaczeniem grupy i podzieloną głębokością
        const windowWithGroup = { ...window, depthMm: halfDepth, sideBySideGroupId: groupIdCounter };
        const otherWithGroup = { ...otherWindow, depthMm: halfDepth, sideBySideGroupId: groupIdCounter };
        selectedPallet.windows.push(windowWithGroup);
        selectedPallet.windows.push(otherWithGroup);
        selectedPallet.usedDepthMm += combinedDepth;
        selectedPallet.utilizationPercent = (selectedPallet.usedDepthMm / selectedPallet.maxDepthMm) * 100;
        placedIndices.add(windowIndex);
        placedIndices.add(j);
        return { placed: true, newGroupId: groupIdCounter };
      }

      // Spróbuj utworzyć nową paletę dla pary (bez wystawania!)
      for (const palletDef of this.sortPalletDefinitions(palletDefs, ctx)) {
        // Dla side-by-side zawsze używamy długości palety bez wystawania
        if (combinedWidth <= palletDef.lengthMm) {
          const windowWithGroup = { ...window, depthMm: halfDepth, sideBySideGroupId: groupIdCounter };
          const otherWithGroup = { ...otherWindow, depthMm: halfDepth, sideBySideGroupId: groupIdCounter };
          const newPallet: OptimizedPallet = {
            palletNumber: pallets.length + 1,
            palletType: `Paleta_${pallets.length + 1}_${palletDef.lengthMm}`,
            palletLengthMm: palletDef.lengthMm,
            maxDepthMm: palletDef.maxLoadDepthMm,
            usedDepthMm: combinedDepth,
            utilizationPercent: (combinedDepth / palletDef.maxLoadDepthMm) * 100,
            windows: [windowWithGroup, otherWithGroup],
          };
          pallets.push(newPallet);
          placedIndices.add(windowIndex);
          placedIndices.add(j);
          return { placed: true, newGroupId: groupIdCounter };
        }
      }
    }

    return { placed: false };
  }

  /**
   * Utwórz nową paletę dla okna
   */
  private createNewPallet(
    window: OptimizedWindow,
    sortedPalletDefs: PalletDefinition[],
    palletNumber: number,
    ctx: OptimizationContext
  ): OptimizedPallet | null {
    for (const palletDef of sortedPalletDefs) {
      // Najpierw spróbuj bez wystawania
      if (ctx.options.minimizeOverhang && window.widthMm <= palletDef.lengthMm) {
        return {
          palletNumber,
          palletType: this.getPalletTypeName(palletDef, palletNumber),
          palletLengthMm: palletDef.lengthMm,
          maxDepthMm: palletDef.maxLoadDepthMm,
          usedDepthMm: window.depthMm,
          utilizationPercent: (window.depthMm / palletDef.maxLoadDepthMm) * 100,
          windows: [window],
        };
      }

      // Potem z wystawaniem
      const maxWidth = palletDef.lengthMm + ctx.options.maxOverhangMm;
      if (window.widthMm <= maxWidth) {
        return {
          palletNumber,
          palletType: this.getPalletTypeName(palletDef, palletNumber),
          palletLengthMm: palletDef.lengthMm,
          maxDepthMm: palletDef.maxLoadDepthMm,
          usedDepthMm: window.depthMm,
          utilizationPercent: (window.depthMm / palletDef.maxLoadDepthMm) * 100,
          windows: [window],
        };
      }
    }

    return null;
  }

  /**
   * Generuj nazwę typu palety
   */
  private getPalletTypeName(palletDef: PalletDefinition, palletNumber: number): string {
    if (palletDef.name.toLowerCase().includes('mała')) {
      return `Paleta_${palletNumber}_mała`;
    }
    return `Paleta_${palletNumber}_${palletDef.lengthMm}`;
  }

  /**
   * Walidacja danych wejściowych
   */
  private validateWindows(windows: WindowInput[]): void {
    for (const window of windows) {
      if (window.widthMm <= 0) {
        throw new ValidationError(`Window width must be positive (order: ${window.orderNumber})`);
      }

      if (window.heightMm <= 0) {
        throw new ValidationError(`Window height must be positive (order: ${window.orderNumber})`);
      }

      if (window.quantity <= 0) {
        throw new ValidationError(`Window quantity must be positive (order: ${window.orderNumber})`);
      }

      // Note: Profile type validation happens in assignDepth() method
      // Profile types are dynamic and configured in the ProfileDepth table
    }
  }

  /**
   * Przypisanie głębokości według typu profilu
   */
  private assignDepth(window: WindowInput, ctx: OptimizationContext): OptimizedWindow {
    const depthMm = ctx.profileDepths[window.profileType];

    if (depthMm === undefined) {
      throw new ValidationError(`Unknown profile type: ${window.profileType} - please configure it in settings`);
    }

    return {
      ...window,
      depthMm,
    };
  }

  /**
   * Pobierz zapisaną optymalizację dla dostawy
   */
  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    return this.repository.getOptimization(deliveryId);
  }

  /**
   * Usuń optymalizację
   */
  async deleteOptimization(deliveryId: number): Promise<void> {
    await this.repository.deleteOptimization(deliveryId);
    logger.info(`Deleted pallet optimization for delivery ${deliveryId}`);
  }

  // ==================== TYPY PALET (CRUD) ====================

  /**
   * Pobierz wszystkie typy palet
   */
  async getAllPalletTypes() {
    return this.repository.getAllPalletTypes();
  }

  /**
   * Pobierz typ palety po ID
   */
  async getPalletTypeById(id: number) {
    return this.repository.getPalletTypeById(id);
  }

  /**
   * Utwórz nowy typ palety
   */
  async createPalletType(data: {
    name: string;
    lengthMm: number;      // Długość palety
    loadDepthMm: number;   // Głębokość załadunku
  }) {
    const created = await this.repository.createPalletType(data);
    logger.info(`Created pallet type: ${data.name} (${data.lengthMm}mm)`);
    return created;
  }

  /**
   * Zaktualizuj typ palety
   */
  async updatePalletType(id: number, data: {
    name?: string;
    lengthMm?: number;       // Długość palety
    loadDepthMm?: number;    // Głębokość załadunku
  }) {
    const updated = await this.repository.updatePalletType(id, data);
    logger.info(`Updated pallet type ID ${id}`);
    return updated;
  }

  /**
   * Usuń typ palety
   */
  async deletePalletType(id: number) {
    const deleted = await this.repository.deletePalletType(id);
    logger.info(`Deleted pallet type ID ${id}`);
    return deleted;
  }
}
