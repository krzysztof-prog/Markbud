/**
 * Pallet Optimizer Service - Business logic for pallet optimization
 *
 * Algorytm optymalizacji pakowania okien na palety:
 * 1. Weryfikacja danych wejściowych
 * 2. Przypisanie głębokości według typu profilu
 * 3. Sortowanie okien od najszerszego do najwęższego
 * 4. Układanie okien na najmniejszych możliwych paletach
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
  profileType: 'VLAK' | 'BLOK' | 'szyba';
  quantity: number;
  reference?: string;
}

export interface PalletDefinition {
  name: string;
  widthMm: number;
  maxLoadDepthMm: number;
  maxOverhangMm: number;
}

export interface OptimizedWindow extends WindowInput {
  depthMm: number; // Zajmowana głębokość na palecie
}

export interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletWidthMm: number;
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
}

// ==================== SERVICE ====================

export class PalletOptimizerService {
  // Mapowanie typu profilu na zajmowaną głębokość (zgodnie z wymaganiami)
  private readonly PROFILE_DEPTHS: Record<string, number> = {
    'VLAK': 95,
    'BLOK': 137,
    'szyba': 70,
  };

  // Maksymalne wystawanie okna poza paletę
  private readonly MAX_OVERHANG_MM = 700;

  constructor(private repository: PalletOptimizerRepository) {}

  /**
   * Główna metoda optymalizacji dla dostawy
   */
  async optimizeDelivery(deliveryId: number): Promise<OptimizationResult> {
    logger.info(`Starting pallet optimization for delivery ${deliveryId}`);

    // 1. Pobierz okna dla dostawy (sprawdzi czy dostawa istnieje)
    const windows = await this.repository.getDeliveryWindows(deliveryId);

    if (windows.length === 0) {
      throw new ValidationError('Delivery has no windows to optimize');
    }

    // 2. Pobierz definicje palet z bazy
    const palletDefinitions = await this.repository.getPalletTypes();

    if (palletDefinitions.length === 0) {
      throw new ValidationError('No pallet types defined in database');
    }

    // 3. Uruchom algorytm pakowania
    const optimizedPallets = this.packWindows(windows, palletDefinitions);

    // 4. Oblicz statystyki
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
    };

    // 5. Zapisz wynik do bazy (przez repository)
    await this.repository.saveOptimization(result);

    logger.info(`Pallet optimization completed: ${result.totalPallets} pallets, ${totalWindows} windows`);

    return result;
  }

  /**
   * Główny algorytm pakowania (7 kroków zgodnie z wymaganiami użytkownika)
   */
  private packWindows(
    windows: WindowInput[],
    palletDefinitions: PalletDefinition[]
  ): OptimizedPallet[] {
    // KROK 1: Weryfikacja danych
    this.validateWindows(windows);

    // KROK 2: Przekształcenie danych - przypisanie głębokości
    // POPRAWKA: Rozwińmy okna z quantity > 1 na osobne pozycje
    const expandedWindows: OptimizedWindow[] = [];
    for (const window of windows) {
      const optimizedWindow = this.assignDepth(window);
      // Każde okno dodajemy quantity razy (bo zajmują miejsce na palecie)
      for (let i = 0; i < window.quantity; i++) {
        expandedWindows.push({ ...optimizedWindow });
      }
    }

    // KROK 3: Sortowanie okien od najszerszego do najwęższego
    const sortedWindows = this.sortWindows(expandedWindows);

    // KROK 4: Definicja palet już mamy (palletDefinitions)

    // KROK 5: Układanie okien na paletach
    const pallets: OptimizedPallet[] = [];

    // POPRAWKA: Określ próg dla "małych okien" (ostatnie 20% lub min 3 okna)
    const smallWindowsStartIndex = Math.max(
      sortedWindows.length - 3,
      Math.floor(sortedWindows.length * 0.8)
    );

    for (let i = 0; i < sortedWindows.length; i++) {
      const window = sortedWindows[i];
      const isSmallWindow = i >= smallWindowsStartIndex;

      // POPRAWKA: Dla małych okien (końcówka listy) - spróbuj umieścić na ostatniej palecie
      if (isSmallWindow && pallets.length > 0) {
        const lastPallet = pallets[pallets.length - 1];
        const maxAllowedWidth = lastPallet.palletWidthMm + this.MAX_OVERHANG_MM;
        const windowFits = window.widthMm <= maxAllowedWidth;
        const hasDepth = lastPallet.usedDepthMm + window.depthMm <= lastPallet.maxDepthMm;

        if (windowFits && hasDepth) {
          // Pasuje na ostatnią paletę
          lastPallet.windows.push(window);
          lastPallet.usedDepthMm += window.depthMm;
          lastPallet.utilizationPercent = (lastPallet.usedDepthMm / lastPallet.maxDepthMm) * 100;
          continue;
        }
      }

      // Znajdź najmniejszą możliwą paletę (od najmniejszej do największej)
      let placed = false;

      // Sortuj istniejące palety od najmniejszej (żeby wykorzystać najpierw mniejsze)
      const sortedPallets = [...pallets].sort((a, b) => a.palletWidthMm - b.palletWidthMm);

      for (const pallet of sortedPallets) {
        // Czy okno się mieści na szerokość (z uwzględnieniem wystawania)
        const maxAllowedWidth = pallet.palletWidthMm + this.MAX_OVERHANG_MM;
        const windowFits = window.widthMm <= maxAllowedWidth;

        // Czy jest miejsce na głębokość
        const hasDepth = pallet.usedDepthMm + window.depthMm <= pallet.maxDepthMm;

        if (windowFits && hasDepth) {
          pallet.windows.push(window);
          pallet.usedDepthMm += window.depthMm;
          pallet.utilizationPercent = (pallet.usedDepthMm / pallet.maxDepthMm) * 100;
          placed = true;
          break;
        }
      }

      // Jeśli nie pasuje na żadną istniejącą paletę - utwórz nową
      if (!placed) {
        const suitablePallet = this.findSuitablePallet(window, palletDefinitions);

        if (!suitablePallet) {
          throw new ValidationError(
            `Window ${window.widthMm}mm is too wide to fit on any pallet (max: ${Math.max(...palletDefinitions.map(p => p.widthMm))}mm + ${this.MAX_OVERHANG_MM}mm overhang)`
          );
        }

        // KROK 6: Nazewnictwo palety
        const palletNumber = pallets.length + 1;
        const palletType = suitablePallet.name.includes('mała') || suitablePallet.name.includes('Mała')
          ? `Paleta_${palletNumber}_mała`
          : `Paleta_${palletNumber}_${suitablePallet.widthMm}`;

        const newPallet: OptimizedPallet = {
          palletNumber,
          palletType,
          palletWidthMm: suitablePallet.widthMm,
          maxDepthMm: suitablePallet.maxLoadDepthMm,
          usedDepthMm: window.depthMm,
          utilizationPercent: (window.depthMm / suitablePallet.maxLoadDepthMm) * 100,
          windows: [window],
        };

        pallets.push(newPallet);
      }
    }

    // POPRAWKA: Posortuj okna w każdej palecie od najszerszego (wymaganie użytkownika)
    for (const pallet of pallets) {
      pallet.windows.sort((a, b) => b.widthMm - a.widthMm);
    }

    return pallets;
  }

  /**
   * KROK 1: Walidacja danych wejściowych
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

      if (!['VLAK', 'BLOK', 'szyba'].includes(window.profileType)) {
        throw new ValidationError(
          `Invalid profile type: ${window.profileType} (order: ${window.orderNumber})`
        );
      }
    }
  }

  /**
   * KROK 2: Przypisanie głębokości według typu profilu
   */
  private assignDepth(window: WindowInput): OptimizedWindow {
    const depthMm = this.PROFILE_DEPTHS[window.profileType];

    if (depthMm === undefined) {
      throw new ValidationError(`Unknown profile type: ${window.profileType}`);
    }

    return {
      ...window,
      depthMm,
    };
  }

  /**
   * KROK 3: Sortowanie okien od najszerszego do najwęższego
   */
  private sortWindows(windows: OptimizedWindow[]): OptimizedWindow[] {
    return [...windows].sort((a, b) => b.widthMm - a.widthMm);
  }

  /**
   * Znajdź najmniejszą możliwą paletę dla okna
   */
  private findSuitablePallet(
    window: OptimizedWindow,
    pallets: PalletDefinition[]
  ): PalletDefinition | null {
    // Sortuj palety od najmniejszej do największej
    const sortedPallets = [...pallets].sort((a, b) => a.widthMm - b.widthMm);

    for (const pallet of sortedPallets) {
      const maxAllowedWidth = pallet.widthMm + this.MAX_OVERHANG_MM;
      if (window.widthMm <= maxAllowedWidth) {
        return pallet;
      }
    }

    return null;
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
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    loadWidthMm: number;
  }) {
    const created = await this.repository.createPalletType(data);
    logger.info(`Created pallet type: ${data.name} (${data.widthMm}mm)`);
    return created;
  }

  /**
   * Zaktualizuj typ palety
   */
  async updatePalletType(id: number, data: {
    name?: string;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    loadWidthMm?: number;
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
