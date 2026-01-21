/**
 * LabelCheckService Unit Tests (TDD)
 *
 * Testy jednostkowe dla serwisu sprawdzania etykiet.
 * Pisane w stylu TDD - testy FAIL dopoki nie zaimplementujemy serwisu.
 *
 * Serwis odpowiada za:
 * - Sprawdzanie etykiet dla dostawy (checkDelivery)
 * - Sprawdzanie etykiety pojedynczego zlecenia (checkOrder)
 * - Pobieranie wynikow sprawdzen (getById, getLatestForDelivery, getAll)
 * - Usuwanie sprawdzen (delete - soft delete)
 *
 * Statusy wynikow:
 * - OK: Etykieta zgodna z zamowieniem
 * - MISMATCH: Etykieta niezgodna z zamowieniem
 * - NO_FOLDER: Brak folderu zlecenia
 * - NO_BMP: Brak pliku BMP etykiety
 * - OCR_ERROR: Blad rozpoznawania tekstu
 *
 * Sciezka do zdjec: //pila21/KABANTRANSFER/[ORDER_NUMBER]/*.bmp
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { LabelCheckService } from './LabelCheckService.js';
import { createMockPrisma, setupTransactionMock } from '../../tests/mocks/prisma.mock.js';

// Mock LabelCheckRepository
vi.mock('../../repositories/LabelCheckRepository.js', () => {
  const MockLabelCheckRepository = vi.fn(function(this: any) {
    this.create = vi.fn();
    this.findById = vi.fn();
    this.findByDeliveryId = vi.fn();
    this.findAll = vi.fn();
    this.softDelete = vi.fn();
    this.addResult = vi.fn();
    this.updateStatus = vi.fn();
    this.getLatestForDelivery = vi.fn();
    this.createWithResults = vi.fn();
  });
  return { LabelCheckRepository: MockLabelCheckRepository };
});

// Mock OcrService
vi.mock('./OcrService.js', () => {
  const MockOcrService = vi.fn(function(this: any) {
    this.extractDateFromImage = vi.fn();
    this.parseDetectedDate = vi.fn();
  });
  return { OcrService: MockOcrService };
});

// Mock fs dla sprawdzania istnienia folderow
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readdir: vi.fn(),
}));

// Mock path dla budowania sciezek
vi.mock('node:path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
}));

// Importy po mockach
import { LabelCheckRepository } from '../../repositories/LabelCheckRepository.js';
import { OcrService } from './OcrService.js';
import * as fs from 'node:fs/promises';

describe('LabelCheckService', () => {
  let service: LabelCheckService;
  let mockRepository: {
    create: Mock;
    findById: Mock;
    findByDeliveryId: Mock;
    findAll: Mock;
    softDelete: Mock;
    addResult: Mock;
    updateStatus: Mock;
    getLatestForDelivery: Mock;
    createWithResults: Mock;
  };
  let mockOcrService: {
    extractDateFromImage: Mock;
    parseDetectedDate: Mock;
  };
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  // ============================================
  // Test fixtures
  // ============================================
  const mockDelivery = {
    id: 1,
    deliveryDate: new Date('2024-02-15'),
    deliveryNumber: 'D001',
    status: 'planned',
    deliveryOrders: [
      { order: { id: 100, orderNumber: '53690' } },
      { order: { id: 101, orderNumber: '53691' } },
    ],
  };

  const mockLabelCheck = {
    id: 1,
    deliveryId: 1,
    deliveryDate: new Date('2024-02-15'),
    status: 'pending',
    totalOrders: 2,
    checkedCount: 0,
    okCount: 0,
    mismatchCount: 0,
    errorCount: 0,
    createdAt: new Date(),
    completedAt: null,
    deletedAt: null,
    results: [],
  };

  const mockLabelCheckResult = {
    id: 1,
    labelCheckId: 1,
    orderId: 100,
    orderNumber: '53690',
    status: 'OK',
    expectedDate: new Date('2024-02-15'),
    detectedDate: new Date('2024-02-15'),
    detectedText: '15.02',
    imagePath: '//pila21/KABANTRANSFER/53690/label.bmp',
    errorMessage: null,
    createdAt: new Date(),
  };

  const mockLabelCheckWithResults = {
    ...mockLabelCheck,
    results: [mockLabelCheckResult],
    delivery: {
      id: 1,
      deliveryDate: new Date('2024-02-15'),
      deliveryNumber: 'D001',
      status: 'planned',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = createMockPrisma();
    setupTransactionMock(mockPrisma);

    // Setup mock repository
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByDeliveryId: vi.fn(),
      findAll: vi.fn(),
      softDelete: vi.fn(),
      addResult: vi.fn(),
      updateStatus: vi.fn(),
      getLatestForDelivery: vi.fn(),
      createWithResults: vi.fn(),
    };

    // Setup mock OCR service
    mockOcrService = {
      extractDateFromImage: vi.fn(),
      parseDetectedDate: vi.fn(),
    };

    // Mock repository constructor to return our mock
    (LabelCheckRepository as unknown as Mock).mockImplementation(function(this: any) {
      Object.assign(this, mockRepository);
    });

    // Mock OcrService constructor
    (OcrService as unknown as Mock).mockImplementation(function(this: any) {
      Object.assign(this, mockOcrService);
    });

    // Setup default fs mocks
    (fs.access as Mock).mockResolvedValue(undefined);
    (fs.readdir as Mock).mockResolvedValue(['label.bmp']);

    // Create service
    service = new LabelCheckService(mockPrisma);
  });

  // ============================================
  // checkDelivery(deliveryId)
  // ============================================
  describe('checkDelivery', () => {
    beforeEach(() => {
      // Setup default delivery mock
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockRepository.create.mockResolvedValue(mockLabelCheck);
      mockRepository.updateStatus.mockResolvedValue(mockLabelCheck);
      mockRepository.addResult.mockResolvedValue(mockLabelCheckResult);
      mockOcrService.extractDateFromImage.mockResolvedValue('15.02');
      mockOcrService.parseDetectedDate.mockReturnValue(new Date('2024-02-15'));
    });

    it('tworzy LabelCheck dla dostawy', async () => {
      // Act
      const result = await service.checkDelivery(1);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        deliveryId: 1,
        deliveryDate: mockDelivery.deliveryDate,
        totalOrders: 2,
      });
      expect(result).toBeDefined();
      expect(result.deliveryId).toBe(1);
    });

    it('pobiera zlecenia przypisane do dostawy', async () => {
      // Act
      await service.checkDelivery(1);

      // Assert
      expect(mockPrisma.delivery.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            deliveryOrders: expect.anything(),
          }),
        })
      );
    });

    it('sprawdza etykiety dla kazdego zlecenia', async () => {
      // Act
      await service.checkDelivery(1);

      // Assert
      // Powinno byc 2 wywolania addResult (dla kazdego zlecenia)
      expect(mockRepository.addResult).toHaveBeenCalledTimes(2);
    });

    it('aktualizuje countery (okCount, mismatchCount, errorCount)', async () => {
      // Arrange
      mockOcrService.extractDateFromImage
        .mockResolvedValueOnce('15.02') // OK
        .mockResolvedValueOnce('20.02'); // MISMATCH

      mockOcrService.parseDetectedDate
        .mockReturnValueOnce(new Date('2024-02-15')) // OK
        .mockReturnValueOnce(new Date('2024-02-20')); // MISMATCH

      // Act
      await service.checkDelivery(1);

      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          checkedCount: 2,
          okCount: 1,
          mismatchCount: 1,
          errorCount: 0,
        })
      );
    });

    it('ustawia status "completed" po zakonczeniu', async () => {
      // Act
      await service.checkDelivery(1);

      // Assert
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        })
      );
    });

    it('rzuca blad gdy dostawa nie istnieje', async () => {
      // Arrange
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkDelivery(999)).rejects.toThrow(/not found|nie znaleziono/i);
    });

    it('rzuca blad gdy dostawa nie ma przypisanych zlecen', async () => {
      // Arrange
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        deliveryOrders: [],
      });

      // Act & Assert
      await expect(service.checkDelivery(1)).rejects.toThrow(
        /brak zlecen|no orders|empty delivery/i
      );
    });
  });

  // ============================================
  // checkOrder(orderId, orderNumber, expectedDate)
  // ============================================
  describe('checkOrder', () => {
    const orderId = 100;
    const orderNumber = '53690';
    const expectedDate = new Date('2024-02-15');

    beforeEach(() => {
      mockOcrService.extractDateFromImage.mockResolvedValue('15.02');
      mockOcrService.parseDetectedDate.mockReturnValue(new Date('2024-02-15'));
    });

    describe('zwraca "OK" gdy data sie zgadza', () => {
      it('dla dokladnego dopasowania daty', async () => {
        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('OK');
        expect(result.detectedDate).toEqual(expectedDate);
      });

      it('zapisuje sciezke do obrazu', async () => {
        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.imagePath).toContain('53690');
        expect(result.imagePath).toContain('.bmp');
      });

      it('zapisuje rozpoznany tekst', async () => {
        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.detectedText).toBe('15.02');
      });
    });

    describe('zwraca "MISMATCH" gdy data sie nie zgadza', () => {
      it('dla roznej daty', async () => {
        // Arrange
        mockOcrService.extractDateFromImage.mockResolvedValue('20.02');
        mockOcrService.parseDetectedDate.mockReturnValue(new Date('2024-02-20'));

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('MISMATCH');
        expect(result.detectedDate).not.toEqual(expectedDate);
      });

      it('zapisuje oczekiwana i wykryta date', async () => {
        // Arrange
        mockOcrService.extractDateFromImage.mockResolvedValue('20.02');
        mockOcrService.parseDetectedDate.mockReturnValue(new Date('2024-02-20'));

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.expectedDate).toEqual(expectedDate);
        expect(result.detectedDate).toEqual(new Date('2024-02-20'));
      });
    });

    describe('zwraca "NO_FOLDER" gdy brak folderu zlecenia', () => {
      it('dla nieistniejacego folderu', async () => {
        // Arrange
        (fs.access as Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('NO_FOLDER');
        expect(result.errorMessage).toContain('folder');
      });

      it('zapisuje komunikat bledu', async () => {
        // Arrange
        (fs.access as Mock).mockRejectedValue(new Error('ENOENT'));

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.errorMessage).toBeDefined();
        expect(result.detectedDate).toBeNull();
        expect(result.imagePath).toBeNull();
      });
    });

    describe('zwraca "NO_BMP" gdy folder pusty', () => {
      it('dla pustego folderu', async () => {
        // Arrange
        (fs.readdir as Mock).mockResolvedValue([]);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('NO_BMP');
        expect(result.errorMessage).toContain('BMP');
      });

      it('dla folderu bez plikow BMP', async () => {
        // Arrange
        (fs.readdir as Mock).mockResolvedValue(['readme.txt', 'data.json']);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('NO_BMP');
      });
    });

    describe('zwraca "OCR_ERROR" gdy OCR sie nie powiedzie', () => {
      it('gdy extractDateFromImage rzuca blad', async () => {
        // Arrange
        mockOcrService.extractDateFromImage.mockRejectedValue(new Error('OCR failed'));

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('OCR_ERROR');
        expect(result.errorMessage).toContain('OCR');
      });

      it('gdy nie mozna rozpoznac daty', async () => {
        // Arrange
        mockOcrService.extractDateFromImage.mockResolvedValue(null);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('OCR_ERROR');
        expect(result.errorMessage).toContain('nie rozpoznano');
      });

      it('gdy parseDetectedDate zwraca null', async () => {
        // Arrange
        mockOcrService.extractDateFromImage.mockResolvedValue('invalid');
        mockOcrService.parseDetectedDate.mockReturnValue(null);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.status).toBe('OCR_ERROR');
      });
    });

    describe('buduje poprawna sciezke do folderu', () => {
      it('uzywa sciezki //pila21/KABANTRANSFER/[ORDER_NUMBER]', async () => {
        // Act
        await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(fs.access).toHaveBeenCalledWith(
          expect.stringContaining('pila21/KABANTRANSFER/53690')
        );
      });
    });

    describe('wybiera plik BMP do analizy', () => {
      it('wybiera pierwszy plik BMP z folderu', async () => {
        // Arrange
        (fs.readdir as Mock).mockResolvedValue(['label1.bmp', 'label2.bmp']);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.imagePath).toContain('label1.bmp');
      });

      it('ignoruje pliki inne niz BMP', async () => {
        // Arrange
        (fs.readdir as Mock).mockResolvedValue(['readme.txt', 'label.bmp', 'data.json']);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.imagePath).toContain('label.bmp');
        expect(result.imagePath).not.toContain('.txt');
      });

      it('obsluguje rozszerzenie .BMP (wielkie litery)', async () => {
        // Arrange
        (fs.readdir as Mock).mockResolvedValue(['LABEL.BMP']);

        // Act
        const result = await service.checkOrder(orderId, orderNumber, expectedDate);

        // Assert
        expect(result.imagePath).toContain('LABEL.BMP');
        expect(result.status).not.toBe('NO_BMP');
      });
    });
  });

  // ============================================
  // Query methods
  // ============================================
  describe('Query methods', () => {
    describe('getById(id)', () => {
      it('zwraca sprawdzenie z wynikami', async () => {
        // Arrange
        mockRepository.findById.mockResolvedValue(mockLabelCheckWithResults);

        // Act
        const result = await service.getById(1);

        // Assert
        expect(result).toEqual(mockLabelCheckWithResults);
        expect(result.results).toHaveLength(1);
        expect(mockRepository.findById).toHaveBeenCalledWith(1);
      });

      it('zwraca null gdy nie istnieje', async () => {
        // Arrange
        mockRepository.findById.mockResolvedValue(null);

        // Act
        const result = await service.getById(999);

        // Assert
        expect(result).toBeNull();
      });

      it('zawiera relacje delivery', async () => {
        // Arrange
        mockRepository.findById.mockResolvedValue(mockLabelCheckWithResults);

        // Act
        const result = await service.getById(1);

        // Assert
        expect(result?.delivery).toBeDefined();
        expect(result?.delivery?.deliveryNumber).toBe('D001');
      });
    });

    describe('getLatestForDelivery(deliveryId)', () => {
      it('zwraca najnowsze sprawdzenie dla dostawy', async () => {
        // Arrange
        const latestCheck = {
          ...mockLabelCheckWithResults,
          id: 3,
          createdAt: new Date('2024-02-15T10:00:00'),
        };
        mockRepository.getLatestForDelivery.mockResolvedValue(latestCheck);

        // Act
        const result = await service.getLatestForDelivery(1);

        // Assert
        expect(result).toEqual(latestCheck);
        expect(mockRepository.getLatestForDelivery).toHaveBeenCalledWith(1);
      });

      it('zwraca null gdy brak sprawdzen dla dostawy', async () => {
        // Arrange
        mockRepository.getLatestForDelivery.mockResolvedValue(null);

        // Act
        const result = await service.getLatestForDelivery(999);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('getAll(filters)', () => {
      it('zwraca liste z paginacja', async () => {
        // Arrange
        const paginatedResult = {
          data: [mockLabelCheck],
          total: 100,
          skip: 0,
          take: 50,
        };
        mockRepository.findAll.mockResolvedValue(paginatedResult);

        // Act
        const result = await service.getAll({});

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(100);
      });

      it('przekazuje filtry do repository', async () => {
        // Arrange
        const filters = { status: 'completed' as const, deliveryId: 5 };
        mockRepository.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 50 });

        // Act
        await service.getAll(filters);

        // Assert
        expect(mockRepository.findAll).toHaveBeenCalledWith(filters, undefined);
      });

      it('przekazuje paginacje do repository', async () => {
        // Arrange
        const pagination = { skip: 20, take: 10 };
        mockRepository.findAll.mockResolvedValue({ data: [], total: 100, skip: 20, take: 10 });

        // Act
        await service.getAll({}, pagination);

        // Assert
        expect(mockRepository.findAll).toHaveBeenCalledWith({}, pagination);
      });

      it('filtruje po statusie', async () => {
        // Arrange
        mockRepository.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 50 });

        // Act
        await service.getAll({ status: 'pending' });

        // Assert
        expect(mockRepository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'pending' }),
          undefined
        );
      });

      it('filtruje po zakresie dat', async () => {
        // Arrange
        const from = new Date('2024-02-01');
        const to = new Date('2024-02-28');
        mockRepository.findAll.mockResolvedValue({ data: [], total: 0, skip: 0, take: 50 });

        // Act
        await service.getAll({ from, to });

        // Assert
        expect(mockRepository.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ from, to }),
          undefined
        );
      });
    });

    describe('delete(id)', () => {
      it('wykonuje soft delete', async () => {
        // Arrange
        const deletedCheck = { ...mockLabelCheck, deletedAt: new Date() };
        mockRepository.softDelete.mockResolvedValue(deletedCheck);

        // Act
        const result = await service.delete(1);

        // Assert
        expect(result.deletedAt).not.toBeNull();
        expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
      });

      it('rzuca blad gdy sprawdzenie nie istnieje', async () => {
        // Arrange
        mockRepository.softDelete.mockRejectedValue(new Error('Record not found'));

        // Act & Assert
        await expect(service.delete(999)).rejects.toThrow();
      });
    });
  });

  // ============================================
  // Edge cases
  // ============================================
  describe('Edge cases', () => {
    describe('obsluguje dostawe bez zlecen', () => {
      it('rzuca blad z odpowiednim komunikatem', async () => {
        // Arrange
        mockPrisma.delivery.findUnique.mockResolvedValue({
          ...mockDelivery,
          deliveryOrders: [],
        });

        // Act & Assert
        await expect(service.checkDelivery(1)).rejects.toThrow(/brak zlecen|no orders/i);
      });
    });

    describe('obsluguje bledy sieciowe (folder niedostepny)', () => {
      it('zwraca NO_FOLDER dla bledu ENOTFOUND', async () => {
        // Arrange
        (fs.access as Mock).mockRejectedValue(new Error('ENOTFOUND: network error'));

        // Act
        const result = await service.checkOrder(100, '53690', new Date('2024-02-15'));

        // Assert
        expect(result.status).toBe('NO_FOLDER');
        expect(result.errorMessage).toBeDefined();
      });

      it('zwraca NO_FOLDER dla bledu ETIMEDOUT', async () => {
        // Arrange
        (fs.access as Mock).mockRejectedValue(new Error('ETIMEDOUT'));

        // Act
        const result = await service.checkOrder(100, '53690', new Date('2024-02-15'));

        // Assert
        expect(result.status).toBe('NO_FOLDER');
      });

      it('zwraca NO_FOLDER dla bledu uprawnien', async () => {
        // Arrange
        (fs.access as Mock).mockRejectedValue(new Error('EACCES: permission denied'));

        // Act
        const result = await service.checkOrder(100, '53690', new Date('2024-02-15'));

        // Assert
        expect(result.status).toBe('NO_FOLDER');
        expect(result.errorMessage).toContain('permission');
      });
    });

    describe('obsluguje czesciowebledy podczas sprawdzania dostawy', () => {
      it('kontynuuje sprawdzanie mimo bledow pojedynczych zlecen', async () => {
        // Arrange
        mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
        mockRepository.create.mockResolvedValue(mockLabelCheck);

        // Pierwsze zlecenie - OK, drugie - blad
        (fs.access as Mock)
          .mockResolvedValueOnce(undefined) // 53690 - OK
          .mockRejectedValueOnce(new Error('ENOENT')); // 53691 - NO_FOLDER

        mockOcrService.extractDateFromImage.mockResolvedValue('15.02');
        mockOcrService.parseDetectedDate.mockReturnValue(new Date('2024-02-15'));

        // Act
        await service.checkDelivery(1);

        // Assert
        // Powinno byc 2 wywolania addResult mimo bledu
        expect(mockRepository.addResult).toHaveBeenCalledTimes(2);
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            okCount: 1,
            errorCount: 1,
          })
        );
      });

      it('ustawia status completed nawet gdy wszystkie zlecenia maja bledy', async () => {
        // Arrange
        mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
        mockRepository.create.mockResolvedValue(mockLabelCheck);
        (fs.access as Mock).mockRejectedValue(new Error('ENOENT'));

        // Act
        await service.checkDelivery(1);

        // Assert
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'completed',
            errorCount: 2,
          })
        );
      });
    });
  });

  // ============================================
  // Statistics and summary
  // ============================================
  describe('Statistics and summary', () => {
    describe('getStatistics', () => {
      it('zwraca podsumowanie sprawdzen', async () => {
        // Arrange
        mockRepository.findAll.mockResolvedValue({
          data: [
            { ...mockLabelCheck, status: 'completed', okCount: 5, mismatchCount: 1, errorCount: 0 },
            { ...mockLabelCheck, id: 2, status: 'completed', okCount: 3, mismatchCount: 0, errorCount: 2 },
          ],
          total: 2,
          skip: 0,
          take: 50,
        });

        // Act
        const result = await service.getStatistics();

        // Assert
        expect(result.totalChecks).toBe(2);
        expect(result.totalOk).toBe(8);
        expect(result.totalMismatch).toBe(1);
        expect(result.totalErrors).toBe(2);
      });
    });

    describe('getDeliveryCheckSummary', () => {
      it('zwraca podsumowanie dla dostawy', async () => {
        // Arrange
        const checkWithStats = {
          ...mockLabelCheck,
          totalOrders: 10,
          checkedCount: 10,
          okCount: 8,
          mismatchCount: 1,
          errorCount: 1,
          status: 'completed',
        };
        mockRepository.getLatestForDelivery.mockResolvedValue(checkWithStats);

        // Act
        const result = await service.getDeliveryCheckSummary(1);

        // Assert
        expect(result.successRate).toBe(80); // 8/10 * 100
        expect(result.hasIssues).toBe(true); // mismatch + error > 0
        expect(result.completed).toBe(true);
      });

      it('zwraca null gdy brak sprawdzen dla dostawy', async () => {
        // Arrange
        mockRepository.getLatestForDelivery.mockResolvedValue(null);

        // Act
        const result = await service.getDeliveryCheckSummary(999);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  // ============================================
  // Configuration
  // ============================================
  describe('Configuration', () => {
    it('uzywa stalej BASE_PATH dla sciezki do folderow', () => {
      // Assert
      expect(LabelCheckService.BASE_PATH).toBe('//pila21/KABANTRANSFER');
    });

    it('moze byc skonfigurowany z custom base path', () => {
      // Arrange
      const customPath = '//custom/path';
      const customService = new LabelCheckService(mockPrisma, { basePath: customPath });

      // Assert - sprawdzamy ze serwis zostal utworzony bez bledu
      expect(customService).toBeDefined();
    });
  });
});
