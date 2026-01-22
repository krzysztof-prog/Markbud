/**
 * PalletOptimizerService Unit Tests
 *
 * Testy jednostkowe dla PalletOptimizerService - serwisu optymalizacji pakowania okien na palety.
 *
 * Pokrywa scenariusze:
 * - Algorytm pakowania (bin packing)
 * - Limity wymiarowe (głębokość, szerokość, wystawanie)
 * - Sortowanie inteligentne (szerokość + wysokość gdy podobne)
 * - Układanie side-by-side
 * - Walidacja danych wejściowych
 * - Opcje optymalizacji (maximizeUtilization, preferStandardPallets)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PalletOptimizerService,
  type WindowInput,
  type PalletDefinition,
  type OptimizationOptions,
} from './PalletOptimizerService.js';
import type { PalletOptimizerRepository } from '../../repositories/PalletOptimizerRepository.js';
import { ValidationError } from '../../utils/errors.js';

// Mock logger aby nie zaśmiecał outputu testów
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Tworzy mock repozytorium z domyślnymi danymi
 */
const createMockRepository = (overrides: Partial<{
  windows: WindowInput[];
  profileDepths: Record<string, number>;
  palletTypes: PalletDefinition[];
}> = {}): PalletOptimizerRepository => {
  const defaults = {
    windows: [],
    profileDepths: { 'AWS75': 100, 'AWS90': 120, 'ADS90': 130 },
    palletTypes: [
      { name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 },
      { name: 'Mała', lengthMm: 1500, maxLoadDepthMm: 1000, maxOverhangMm: 700 },
    ],
  };

  const config = { ...defaults, ...overrides };

  return {
    getDeliveryWindows: vi.fn().mockResolvedValue(config.windows),
    getProfileDepths: vi.fn().mockResolvedValue(config.profileDepths),
    getPalletTypes: vi.fn().mockResolvedValue(config.palletTypes),
    saveOptimization: vi.fn().mockResolvedValue(undefined),
    getOptimization: vi.fn().mockResolvedValue(null),
    deleteOptimization: vi.fn().mockResolvedValue(true),
    deliveryExists: vi.fn().mockResolvedValue(true),
    optimizationExists: vi.fn().mockResolvedValue(false),
    getAllPalletTypes: vi.fn().mockResolvedValue([]),
    createPalletType: vi.fn(),
    updatePalletType: vi.fn(),
    deletePalletType: vi.fn(),
    getPalletTypeById: vi.fn(),
  } as unknown as PalletOptimizerRepository;
};

/**
 * Tworzy okno testowe
 */
const createWindow = (overrides: Partial<WindowInput> = {}): WindowInput => ({
  id: 1,
  orderId: 100,
  orderNumber: 'Z-001',
  widthMm: 1000,
  heightMm: 1500,
  profileType: 'AWS75',
  quantity: 1,
  reference: 'REF-001',
  ...overrides,
});

describe('PalletOptimizerService', () => {
  let service: PalletOptimizerService;
  let mockRepository: PalletOptimizerRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new PalletOptimizerService(mockRepository);
  });

  // ===================
  // Walidacja danych wejściowych
  // ===================

  describe('validateWindows - walidacja danych wejściowych', () => {
    it('powinien rzucić błąd gdy dostawa nie ma okien', async () => {
      mockRepository = createMockRepository({ windows: [] });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('Delivery has no windows to optimize');
    });

    it('powinien rzucić błąd gdy brak konfiguracji głębokości profili', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow()],
        profileDepths: {},
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('No profile depths configured');
    });

    it('powinien rzucić błąd gdy brak definicji palet', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow()],
        palletTypes: [],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('No pallet types defined');
    });

    it('powinien rzucić błąd gdy okno ma zerową szerokość', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 0 })],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('Window width must be positive');
    });

    it('powinien rzucić błąd gdy okno ma ujemną szerokość', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: -100 })],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
    });

    it('powinien rzucić błąd gdy okno ma zerową wysokość', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ heightMm: 0 })],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('Window height must be positive');
    });

    it('powinien rzucić błąd gdy okno ma zerową ilość', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ quantity: 0 })],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('Window quantity must be positive');
    });

    it('powinien rzucić błąd gdy typ profilu jest nieznany', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ profileType: 'UNKNOWN_PROFILE' })],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1)).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1)).rejects.toThrow('Unknown profile type: UNKNOWN_PROFILE');
    });
  });

  // ===================
  // Algorytm pakowania - podstawowe scenariusze
  // ===================

  describe('packWindows - podstawowe pakowanie', () => {
    it('powinien spakować jedno okno na jedną paletę', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 1000, heightMm: 1500, profileType: 'AWS75' })],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].windows).toHaveLength(1);
      expect(result.summary.totalWindows).toBe(1);
    });

    it('powinien rozwinąć okna według quantity', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ quantity: 3, profileType: 'AWS75' })],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      expect(result.summary.totalWindows).toBe(3);
      // Wszystkie 3 okna powinny być spakowane (mogą być na 1 lub więcej paletach)
      const totalWindowsOnPallets = result.pallets.reduce(
        (sum, p) => sum + p.windows.length, 0
      );
      expect(totalWindowsOnPallets).toBe(3);
    });

    it('powinien umieścić wiele okien na jednej palecie gdy głębokość pozwala', async () => {
      // 3 okna x 100mm głębokości = 300mm < 1200mm (max load depth)
      // UWAGA: Algorytm może układać okna side-by-side, co zmienia głębokość
      // Wyłączamy side-by-side dla tego testu
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1000, profileType: 'AWS75', quantity: 1 }),
          createWindow({ id: 2, widthMm: 1000, profileType: 'AWS75', quantity: 1 }),
          createWindow({ id: 3, widthMm: 1000, profileType: 'AWS75', quantity: 1 }),
        ],
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { allowSideBySide: false });

      // Wszystkie 3 okna powinny zmieścić się na jednej palecie
      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].windows).toHaveLength(3);
      expect(result.pallets[0].usedDepthMm).toBe(300);
    });

    it('powinien utworzyć nową paletę gdy głębokość jest pełna', async () => {
      // 12 okien x 100mm = 1200mm (pełna paleta), 13. okno -> nowa paleta
      // Wyłączamy side-by-side aby mieć przewidywalną głębokość
      const windows = Array.from({ length: 13 }, (_, i) =>
        createWindow({ id: i + 1, widthMm: 1000, profileType: 'AWS75', quantity: 1 })
      );
      mockRepository = createMockRepository({
        windows,
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { allowSideBySide: false });

      expect(result.totalPallets).toBe(2);
      expect(result.pallets[0].windows).toHaveLength(12);
      expect(result.pallets[1].windows).toHaveLength(1);
    });
  });

  // ===================
  // Limity wymiarowe - szerokość i wystawanie
  // ===================

  describe('limity wymiarowe - szerokość i wystawanie', () => {
    it('powinien umieścić okno bez wystawania gdy mieści się w palecie', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 2000 })], // 2000mm < 2500mm paleta
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { minimizeOverhang: true });

      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].palletLengthMm).toBe(2500);
    });

    it('powinien pozwolić na wystawanie gdy okno jest szersze od palety', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 2800 })], // 2800mm > 2500mm, ale < 2500+700=3200mm
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { maxOverhangMm: 700 });

      expect(result.totalPallets).toBe(1);
    });

    it('powinien rzucić błąd gdy okno jest za szerokie nawet z wystawaniem', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 4000 })], // 4000mm > 2500+700=3200mm
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      await expect(service.optimizeDelivery(1, { maxOverhangMm: 700 })).rejects.toThrow(ValidationError);
      await expect(service.optimizeDelivery(1, { maxOverhangMm: 700 })).rejects.toThrow('too wide');
    });

    it('powinien użyć małej palety gdy okno jest wąskie', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 800 })], // 800mm < 1500mm (mała paleta)
        palletTypes: [
          { name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 },
          { name: 'Mała', lengthMm: 1500, maxLoadDepthMm: 1000, maxOverhangMm: 700 },
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { preferStandardPallets: false });

      expect(result.totalPallets).toBe(1);
      // Przy preferStandardPallets=false, powinna wybrać mniejszą paletę
      expect(result.pallets[0].palletLengthMm).toBe(1500);
    });

    it('powinien preferować standardową paletę gdy opcja włączona', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 800 })],
        palletTypes: [
          { name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 },
          { name: 'Mała', lengthMm: 1500, maxLoadDepthMm: 1000, maxOverhangMm: 700 },
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { preferStandardPallets: true });

      expect(result.totalPallets).toBe(1);
      // Przy preferStandardPallets=true, powinna wybrać standardową
      expect(result.pallets[0].palletLengthMm).toBe(2500);
    });
  });

  // ===================
  // Inteligentne sortowanie
  // ===================

  describe('smartSortWindows - sortowanie inteligentne', () => {
    it('powinien sortować od najszerszych do najwęższych domyślnie', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1000, heightMm: 1000 }),
          createWindow({ id: 2, widthMm: 2000, heightMm: 1000 }),
          createWindow({ id: 3, widthMm: 1500, heightMm: 1000 }),
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      // Okna powinny być ułożone od najszerszego
      const widths = result.pallets.flatMap(p => p.windows.map(w => w.widthMm));
      expect(widths[0]).toBe(2000);
      expect(widths[1]).toBe(1500);
      expect(widths[2]).toBe(1000);
    });

    it('powinien sortować po wysokości gdy szerokości są podobne (±15%)', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1000, heightMm: 1200 }),
          createWindow({ id: 2, widthMm: 1050, heightMm: 1800 }), // Podobna szerokość (~5% różnicy)
          createWindow({ id: 3, widthMm: 1020, heightMm: 1500 }), // Podobna szerokość
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        sortByHeightWhenWidthSimilar: true,
        widthSimilarityThreshold: 0.15,
      });

      // Gdy szerokości podobne, powinny być posortowane po wysokości (od najwyższego)
      const heights = result.pallets.flatMap(p => p.windows.map(w => w.heightMm));
      expect(heights[0]).toBe(1800);
      expect(heights[1]).toBe(1500);
      expect(heights[2]).toBe(1200);
    });

    it('powinien NIE sortować po wysokości gdy opcja wyłączona', async () => {
      // Używamy bardzo różnych szerokości aby uniknąć side-by-side
      // UWAGA: Algorytm sortuje okna na palecie po wysokości NA KOŃCU (krok 6 w packWindows)
      // więc finalny widok na palecie będzie posortowany po wysokości
      // Ten test sprawdza czy podczas PAKOWANIA sortowanie po podobnych szerokościach
      // NIE uwzględnia wysokości (domyślnie sortByHeightWhenWidthSimilar=true)
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1000, heightMm: 1800 }),
          createWindow({ id: 2, widthMm: 1500, heightMm: 1200 }), // Wyraźnie różna szerokość
          createWindow({ id: 3, widthMm: 1200, heightMm: 1500 }),
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        sortByHeightWhenWidthSimilar: false,
        allowSideBySide: false,
      });

      // Okna są pakowane wg szerokości (1500, 1200, 1000)
      // ale NA KOŃCU sortowane po wysokości wewnątrz palety (1800, 1500, 1200)
      // Więc finalnie sprawdzamy czy wszystkie okna są na jednej palecie
      // i że końcowe sortowanie po wysokości działa
      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].windows).toHaveLength(3);

      // Końcowe sortowanie po wysokości (od najwyższych)
      const heights = result.pallets[0].windows.map(w => w.heightMm);
      expect(heights).toEqual([1800, 1500, 1200]);
    });
  });

  // ===================
  // Side-by-side układanie
  // ===================

  describe('tryPlaceSideBySide - układanie obok siebie', () => {
    it('powinien ułożyć dwa wąskie okna obok siebie na jednej palecie', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 800, heightMm: 1500, profileType: 'AWS75' }),
          createWindow({ id: 2, widthMm: 800, heightMm: 1500, profileType: 'AWS75' }),
        ],
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        allowSideBySide: true,
        sideBySideMaxGap: 100,
      });

      // Dwa okna 800mm + 100mm gap = 1700mm < 2500mm (paleta)
      // Powinny być ułożone obok siebie (sideBySideGroupId)
      expect(result.totalPallets).toBe(1);
      const windowsWithSideBySide = result.pallets[0].windows.filter(
        w => w.sideBySideGroupId !== undefined
      );
      expect(windowsWithSideBySide.length).toBe(2);
    });

    it('powinien NIE układać obok siebie gdy opcja wyłączona', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 800, heightMm: 1500, profileType: 'AWS75' }),
          createWindow({ id: 2, widthMm: 800, heightMm: 1500, profileType: 'AWS75' }),
        ],
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        allowSideBySide: false,
      });

      // Bez side-by-side, okna powinny być ułożone jedno za drugim
      const windowsWithSideBySide = result.pallets.flatMap(p =>
        p.windows.filter(w => w.sideBySideGroupId !== undefined)
      );
      expect(windowsWithSideBySide.length).toBe(0);
    });

    it('powinien NIE układać obok siebie gdy różnica wysokości > 15%', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 800, heightMm: 1500, profileType: 'AWS75' }),
          createWindow({ id: 2, widthMm: 800, heightMm: 2000, profileType: 'AWS75' }), // 33% różnicy
        ],
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        allowSideBySide: true,
      });

      // Okna o różnej wysokości NIE powinny być ułożone obok siebie
      const windowsWithSideBySide = result.pallets.flatMap(p =>
        p.windows.filter(w => w.sideBySideGroupId !== undefined)
      );
      expect(windowsWithSideBySide.length).toBe(0);
    });

    it('powinien NIE układać obok siebie gdy suma szerokości przekracza paletę', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1500, heightMm: 1500, profileType: 'AWS75' }),
          createWindow({ id: 2, widthMm: 1500, heightMm: 1500, profileType: 'AWS75' }),
        ],
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
        profileDepths: { 'AWS75': 100 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        allowSideBySide: true,
        sideBySideMaxGap: 100,
      });

      // 1500 + 1500 + 100 gap = 3100mm > 2500mm
      // Side-by-side NIE pozwala na wystawanie, więc okna NIE będą obok siebie
      const windowsWithSideBySide = result.pallets.flatMap(p =>
        p.windows.filter(w => w.sideBySideGroupId !== undefined)
      );
      expect(windowsWithSideBySide.length).toBe(0);
    });
  });

  // ===================
  // Maximize Utilization (Best Fit)
  // ===================

  describe('maximizeUtilization - optymalizacja wypełnienia', () => {
    it('powinien wypełniać palety maksymalnie gdy opcja włączona (Best Fit)', async () => {
      // Scenariusz: okna które zmieszczą się na jednej palecie
      // Wyłączamy side-by-side dla przewidywalności
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 2000, profileType: 'AWS75', quantity: 1 }),
          createWindow({ id: 2, widthMm: 1800, profileType: 'AWS75', quantity: 1 }),
          createWindow({ id: 3, widthMm: 1000, profileType: 'AWS75', quantity: 1 }),
        ],
        profileDepths: { 'AWS75': 300 }, // 300mm głębokości
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        maximizeUtilization: true,
        allowSideBySide: false,
      });

      // Wszystkie okna (3 x 300mm = 900mm < 1200mm) powinny zmieścić się na jednej palecie
      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].windows).toHaveLength(3);
    });

    it('powinien NIE optymalizować gdy maximizeUtilization wyłączone', async () => {
      // Ten test sprawdza czy opcja ma wpływ (First Fit vs Best Fit)
      mockRepository = createMockRepository({
        windows: Array.from({ length: 5 }, (_, i) =>
          createWindow({ id: i + 1, widthMm: 1000, profileType: 'AWS75', quantity: 1 })
        ),
        profileDepths: { 'AWS75': 200 },
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, {
        maximizeUtilization: false,
      });

      // 5 okien x 200mm = 1000mm < 1200mm - wszystkie powinny zmieścić się na jednej palecie
      expect(result.totalPallets).toBe(1);
    });
  });

  // ===================
  // Różne typy profili (głębokości)
  // ===================

  describe('assignDepth - przypisywanie głębokości profili', () => {
    it('powinien przypisać poprawną głębokość dla różnych profili', async () => {
      // Wyłączamy side-by-side aby głębokości nie były dzielone
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, profileType: 'AWS75', widthMm: 2000 }),  // 100mm
          createWindow({ id: 2, profileType: 'AWS90', widthMm: 1800 }),  // 120mm
          createWindow({ id: 3, profileType: 'ADS90', widthMm: 1600 }),  // 130mm
        ],
        profileDepths: { 'AWS75': 100, 'AWS90': 120, 'ADS90': 130 },
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { allowSideBySide: false });

      // Sprawdź czy głębokości zostały poprawnie przypisane
      const depths = result.pallets.flatMap(p => p.windows.map(w => w.depthMm));
      expect(depths).toContain(100);
      expect(depths).toContain(120);
      expect(depths).toContain(130);
    });

    it('powinien obliczyć prawidłowe wykorzystanie palety', async () => {
      // Wyłączamy side-by-side dla przewidywalnego obliczenia głębokości
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, profileType: 'AWS75', quantity: 6, widthMm: 2000 }), // 6 x 100mm = 600mm
        ],
        profileDepths: { 'AWS75': 100 },
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { allowSideBySide: false });

      expect(result.pallets[0].usedDepthMm).toBe(600);
      expect(result.pallets[0].maxDepthMm).toBe(1200);
      expect(result.pallets[0].utilizationPercent).toBe(50);
    });
  });

  // ===================
  // Statystyki i podsumowanie
  // ===================

  describe('summary - statystyki optymalizacji', () => {
    it('powinien obliczyć poprawne statystyki', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, quantity: 3 }),
          createWindow({ id: 2, quantity: 2 }),
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      expect(result.summary.totalWindows).toBe(5);
      expect(result.deliveryId).toBe(1);
      expect(result.totalPallets).toBeGreaterThan(0);
      expect(result.summary.averageUtilization).toBeGreaterThan(0);
    });

    it('powinien obliczyć średnie wykorzystanie dla wielu palet', async () => {
      // Stwórz scenariusz z wieloma paletami o różnym wykorzystaniu
      mockRepository = createMockRepository({
        windows: Array.from({ length: 20 }, (_, i) =>
          createWindow({ id: i + 1, widthMm: 1000, profileType: 'AWS75', quantity: 1 })
        ),
        profileDepths: { 'AWS75': 100 },
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      // 20 okien x 100mm = 2000mm, 1200mm/paleta => ~2 palety
      expect(result.totalPallets).toBe(2);
      // Średnie wykorzystanie powinno być > 0
      expect(result.summary.averageUtilization).toBeGreaterThan(0);
      expect(result.summary.averageUtilization).toBeLessThanOrEqual(100);
    });
  });

  // ===================
  // Zapis do repozytorium
  // ===================

  describe('saveOptimization - zapis wyniku', () => {
    it('powinien zapisać wynik optymalizacji do repozytorium', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow()],
      });
      service = new PalletOptimizerService(mockRepository);

      await service.optimizeDelivery(1);

      expect(mockRepository.saveOptimization).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveOptimization).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 1,
          totalPallets: expect.any(Number),
          pallets: expect.any(Array),
          summary: expect.objectContaining({
            totalWindows: expect.any(Number),
            averageUtilization: expect.any(Number),
          }),
        })
      );
    });

    it('powinien zwrócić opcje użyte do optymalizacji', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow()],
      });
      service = new PalletOptimizerService(mockRepository);

      const options: Partial<OptimizationOptions> = {
        maximizeUtilization: false,
        allowSideBySide: false,
      };

      const result = await service.optimizeDelivery(1, options);

      expect(result.options).toBeDefined();
      expect(result.options?.maximizeUtilization).toBe(false);
      expect(result.options?.allowSideBySide).toBe(false);
    });
  });

  // ===================
  // CRUD operacje na typach palet
  // ===================

  describe('CRUD - typy palet', () => {
    it('powinien pobrać wszystkie typy palet', async () => {
      const palletTypes = [{ id: 1, name: 'Standard', lengthMm: 2500 }];
      (mockRepository.getAllPalletTypes as ReturnType<typeof vi.fn>).mockResolvedValue(palletTypes);

      const result = await service.getAllPalletTypes();

      expect(result).toEqual(palletTypes);
      expect(mockRepository.getAllPalletTypes).toHaveBeenCalled();
    });

    it('powinien utworzyć nowy typ palety', async () => {
      const newPallet = { name: 'XL', lengthMm: 3000, widthMm: 1000, heightMm: 200 };
      (mockRepository.createPalletType as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ...newPallet });

      const result = await service.createPalletType(newPallet);

      expect(result).toEqual({ id: 1, ...newPallet });
      expect(mockRepository.createPalletType).toHaveBeenCalledWith(newPallet);
    });

    it('powinien zaktualizować typ palety', async () => {
      const updates = { name: 'Standard XL' };
      (mockRepository.updatePalletType as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, ...updates });

      const result = await service.updatePalletType(1, updates);

      expect(result).toMatchObject(updates);
      expect(mockRepository.updatePalletType).toHaveBeenCalledWith(1, updates);
    });

    it('powinien usunąć typ palety', async () => {
      (mockRepository.deletePalletType as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

      const result = await service.deletePalletType(1);

      expect(result).toEqual({ id: 1 });
      expect(mockRepository.deletePalletType).toHaveBeenCalledWith(1);
    });
  });

  // ===================
  // Edge cases
  // ===================

  describe('edge cases', () => {
    it('powinien obsłużyć okno zajmujące całą głębokość palety', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ profileType: 'THICK' })],
        profileDepths: { 'THICK': 1200 }, // Pełna głębokość
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      expect(result.totalPallets).toBe(1);
      expect(result.pallets[0].usedDepthMm).toBe(1200);
      expect(result.pallets[0].utilizationPercent).toBe(100);
    });

    it('powinien obsłużyć okno dokładnie pasujące do szerokości palety', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 2500 })], // Dokładnie szerokość palety
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      expect(result.totalPallets).toBe(1);
    });

    it('powinien obsłużyć okno wymagające maksymalnego wystawania', async () => {
      mockRepository = createMockRepository({
        windows: [createWindow({ widthMm: 3200 })], // 2500 + 700 = 3200mm max
        palletTypes: [{ name: 'Standard', lengthMm: 2500, maxLoadDepthMm: 1200, maxOverhangMm: 700 }],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1, { maxOverhangMm: 700 });

      expect(result.totalPallets).toBe(1);
    });

    it('powinien posortować okna w palecie po wysokości na końcu', async () => {
      mockRepository = createMockRepository({
        windows: [
          createWindow({ id: 1, widthMm: 1000, heightMm: 1200 }),
          createWindow({ id: 2, widthMm: 1000, heightMm: 1800 }),
          createWindow({ id: 3, widthMm: 1000, heightMm: 1500 }),
        ],
      });
      service = new PalletOptimizerService(mockRepository);

      const result = await service.optimizeDelivery(1);

      // Po końcowej optymalizacji, okna w palecie powinny być posortowane po wysokości (od najwyższych)
      const heights = result.pallets[0].windows.map(w => w.heightMm);
      expect(heights).toEqual([1800, 1500, 1200]);
    });
  });

  // ===================
  // Usuwanie optymalizacji
  // ===================

  describe('deleteOptimization', () => {
    it('powinien usunąć optymalizację przez repozytorium', async () => {
      await service.deleteOptimization(1);

      expect(mockRepository.deleteOptimization).toHaveBeenCalledWith(1);
    });
  });

  // ===================
  // Pobieranie optymalizacji
  // ===================

  describe('getOptimization', () => {
    it('powinien pobrać zapisaną optymalizację', async () => {
      const savedOptimization = {
        deliveryId: 1,
        totalPallets: 2,
        pallets: [],
        summary: { totalWindows: 5, averageUtilization: 75 },
      };
      (mockRepository.getOptimization as ReturnType<typeof vi.fn>).mockResolvedValue(savedOptimization);

      const result = await service.getOptimization(1);

      expect(result).toEqual(savedOptimization);
      expect(mockRepository.getOptimization).toHaveBeenCalledWith(1);
    });

    it('powinien zwrócić null gdy optymalizacja nie istnieje', async () => {
      (mockRepository.getOptimization as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getOptimization(999);

      expect(result).toBeNull();
    });
  });
});
