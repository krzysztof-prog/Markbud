/**
 * OcrService Unit Tests (TDD)
 *
 * Testy dla serwisu OCR do rozpoznawania dat na etykietach BMP.
 * Używa tesseract.js + Jimp do przetwarzania obrazów.
 *
 * Koordynaty obszaru daty: x=489, y=73, width=103, height=38
 * Wzorzec daty: DD.MM (np. "15.02")
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { OcrService } from './OcrService.js';

// Mock tesseract.js z PSM enum (tesseract.js v5+)
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
  PSM: {
    OSD_ONLY: '0',
    AUTO_OSD: '1',
    AUTO_ONLY: '2',
    AUTO: '3',
    SINGLE_COLUMN: '4',
    SINGLE_BLOCK_VERT_TEXT: '5',
    SINGLE_BLOCK: '6',
    SINGLE_LINE: '7',
    SINGLE_WORD: '8',
    CIRCLE_WORD: '9',
    SINGLE_CHAR: '10',
    SPARSE_TEXT: '11',
    SPARSE_TEXT_OSD: '12',
    RAW_LINE: '13',
  },
}));

// Mock Jimp
vi.mock('jimp', () => {
  const mockJimpInstance = {
    getWidth: vi.fn().mockReturnValue(600),
    getHeight: vi.fn().mockReturnValue(300),
    clone: vi.fn().mockReturnThis(),
    crop: vi.fn().mockReturnThis(),
    grayscale: vi.fn().mockReturnThis(),
    contrast: vi.fn().mockReturnThis(),
    getBufferAsync: vi.fn().mockResolvedValue(Buffer.from('test-image-data')),
  };

  return {
    default: {
      read: vi.fn().mockResolvedValue(mockJimpInstance),
      MIME_PNG: 'image/png',
    },
  };
});

// Mock fs dla sprawdzania istnienia plików
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

// Importy po mockach
import { createWorker } from 'tesseract.js';
import Jimp from 'jimp';
import * as fs from 'node:fs/promises';

describe('OcrService', () => {
  let ocrService: OcrService;
  // tesseract.js v5+ - worker nie ma loadLanguage/initialize (robi to createWorker)
  let mockWorker: {
    setParameters: Mock;
    recognize: Mock;
    terminate: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock tesseract worker (v5+ API - bez loadLanguage/initialize)
    mockWorker = {
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockResolvedValue({
        data: { text: '15.02' },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    };

    (createWorker as Mock).mockResolvedValue(mockWorker);

    // Setup mock fs
    (fs.access as Mock).mockResolvedValue(undefined);

    ocrService = new OcrService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // extractDateFromImage(imagePath)
  // ============================================
  describe('extractDateFromImage', () => {
    it('zwraca rozpoznaną datę gdy OCR się powiedzie', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';
      mockWorker.recognize.mockResolvedValue({
        data: { text: '15.02\n' },
      });

      // Act
      const result = await ocrService.extractDateFromImage(imagePath);

      // Assert
      expect(result).toBe('15.02');
      expect(createWorker).toHaveBeenCalled();
      expect(mockWorker.recognize).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('zwraca null gdy nie znajdzie wzorca daty', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';
      mockWorker.recognize.mockResolvedValue({
        data: { text: 'ABCDEFGH\nno date here' },
      });

      // Act
      const result = await ocrService.extractDateFromImage(imagePath);

      // Assert
      expect(result).toBeNull();
    });

    it('rzuca błąd gdy plik nie istnieje', async () => {
      // Arrange
      const imagePath = '/test/path/nonexistent.bmp';
      (fs.access as Mock).mockRejectedValue(new Error('ENOENT: no such file'));

      // Act & Assert
      await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow(
        /plik nie istnieje|ENOENT|not found/i
      );
    });

    it('rzuca błąd gdy plik nie jest obrazem', async () => {
      // Arrange
      const imagePath = '/test/path/document.txt';
      (Jimp.read as Mock).mockRejectedValue(
        new Error('Could not find MIME for Buffer')
      );

      // Act & Assert
      await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow(
        /nie można wczytać|not an image|invalid image|MIME/i
      );
    });

    it('poprawnie inicjalizuje tesseract worker z polskim językiem', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';

      // Act
      await ocrService.extractDateFromImage(imagePath);

      // Assert - tesseract.js v5+ przekazuje język do createWorker zamiast loadLanguage/initialize
      expect(createWorker).toHaveBeenCalledWith('pol', 1, expect.any(Object));
    });

    it('ustawia odpowiednie parametry dla rozpoznawania cyfr', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';

      // Act
      await ocrService.extractDateFromImage(imagePath);

      // Assert
      // Oczekujemy że setParameters zostanie wywołane z parametrami
      // ograniczającymi rozpoznawanie do cyfr i kropki
      expect(mockWorker.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          tessedit_char_whitelist: expect.stringContaining('0123456789.'),
        })
      );
    });

    it('zawsze kończy worker nawet przy błędzie', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';
      mockWorker.recognize.mockRejectedValue(new Error('OCR failed'));

      // Act & Assert
      await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('rozpoznaje datę z białymi znakami', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';
      mockWorker.recognize.mockResolvedValue({
        data: { text: '  15.02  \n\n' },
      });

      // Act
      const result = await ocrService.extractDateFromImage(imagePath);

      // Assert
      expect(result).toBe('15.02');
    });
  });

  // ============================================
  // parseDetectedDate(text, year)
  // ============================================
  describe('parseDetectedDate', () => {
    it('parsuje "15.02" na Date(year, 1, 15)', () => {
      // Arrange
      const text = '15.02';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(1); // 0-indexed, luty = 1
      expect(result?.getDate()).toBe(15);
    });

    it('parsuje "1.3" na Date(year, 2, 1) - bez wiodącego zera', () => {
      // Arrange
      const text = '1.3';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(2); // marzec = 2
      expect(result?.getDate()).toBe(1);
    });

    it('parsuje "01.03" na Date(year, 2, 1) - z wiodącym zerem', () => {
      // Arrange
      const text = '01.03';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(1);
    });

    it('zwraca null dla niepoprawnego tekstu', () => {
      // Arrange & Act & Assert
      expect(ocrService.parseDetectedDate('abc', 2026)).toBeNull();
      expect(ocrService.parseDetectedDate('', 2026)).toBeNull();
      expect(ocrService.parseDetectedDate('12', 2026)).toBeNull();
      expect(ocrService.parseDetectedDate('12/01', 2026)).toBeNull();
    });

    it('zwraca null dla niepoprawnej daty (32.01)', () => {
      // Arrange
      const text = '32.01';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeNull();
    });

    it('zwraca null dla niepoprawnego miesiąca (15.13)', () => {
      // Arrange
      const text = '15.13';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeNull();
    });

    it('zwraca null dla miesiąca 0 (15.00)', () => {
      // Arrange
      const text = '15.00';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result).toBeNull();
    });

    it('obsługuje tekst z białymi znakami', () => {
      // Arrange
      const text = '  15.02  ';
      const year = 2026;

      // Act
      const result = ocrService.parseDetectedDate(text, year);

      // Assert
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(1);
    });

    it('używa bieżącego roku jeśli nie podano', () => {
      // Arrange
      const text = '15.02';
      const currentYear = new Date().getFullYear();

      // Act
      const result = ocrService.parseDetectedDate(text);

      // Assert
      expect(result?.getFullYear()).toBe(currentYear);
    });
  });

  // ============================================
  // cropDateArea(image)
  // ============================================
  describe('cropDateArea', () => {
    it('przycina obraz do obszaru daty i zwraca Buffer PNG', async () => {
      // Arrange
      const mockImage = {
        clone: vi.fn().mockReturnThis(),
        crop: vi.fn().mockReturnThis(),
        grayscale: vi.fn().mockReturnThis(),
        contrast: vi.fn().mockReturnThis(),
        getBufferAsync: vi.fn().mockResolvedValue(Buffer.from('cropped-image-data')),
      };

      // Act
      const result = await ocrService.cropDateArea(mockImage as any);

      // Assert
      expect(mockImage.clone).toHaveBeenCalled();
      expect(mockImage.crop).toHaveBeenCalledWith(489, 73, 103, 38);
      expect(mockImage.grayscale).toHaveBeenCalled();
      expect(mockImage.contrast).toHaveBeenCalledWith(0.3);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ============================================
  // Edge cases
  // ============================================
  describe('Edge cases', () => {
    describe('obsługa obrazów o złych wymiarach', () => {
      it('rzuca błąd gdy obraz jest za mały dla obszaru daty', async () => {
        // Arrange
        const imagePath = '/test/path/small-label.bmp';
        const mockSmallImage = {
          getWidth: vi.fn().mockReturnValue(400), // Za małe - obszar daty zaczyna się od x=489
          getHeight: vi.fn().mockReturnValue(200),
        };
        (Jimp.read as Mock).mockResolvedValue(mockSmallImage);

        // Act & Assert
        await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow(
          /wymiar|dimension|too small|za mały/i
        );
      });

      it('rzuca błąd gdy wysokość obrazu jest za mała', async () => {
        // Arrange
        const imagePath = '/test/path/short-label.bmp';
        const mockShortImage = {
          getWidth: vi.fn().mockReturnValue(600),
          getHeight: vi.fn().mockReturnValue(50), // Za małe - obszar daty wymaga y=73 + height=38 = 111
        };
        (Jimp.read as Mock).mockResolvedValue(mockShortImage);

        // Act & Assert
        await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow(
          /wymiar|dimension|too small|za mały/i
        );
      });

      it('akceptuje obraz o minimalnych wymaganych wymiarach', async () => {
        // Arrange
        const imagePath = '/test/path/minimal-label.bmp';
        // Minimalne wymiary: x=489 + width=103 = 592, y=73 + height=38 = 111
        const mockMinimalImage = {
          getWidth: vi.fn().mockReturnValue(592),
          getHeight: vi.fn().mockReturnValue(111),
          clone: vi.fn().mockReturnThis(),
          crop: vi.fn().mockReturnThis(),
          grayscale: vi.fn().mockReturnThis(),
          contrast: vi.fn().mockReturnThis(),
          getBufferAsync: vi.fn().mockResolvedValue(Buffer.from('test')),
        };
        (Jimp.read as Mock).mockResolvedValue(mockMinimalImage);

        // Act & Assert
        await expect(
          ocrService.extractDateFromImage(imagePath)
        ).resolves.toBeDefined();
      });
    });

    describe('obsługa błędów OCR', () => {
      it('obsługuje timeout tesseract', async () => {
        // Arrange
        const imagePath = '/test/path/label.bmp';
        mockWorker.recognize.mockRejectedValue(new Error('Timeout'));

        // Act & Assert
        await expect(ocrService.extractDateFromImage(imagePath)).rejects.toThrow(
          /timeout/i
        );
      });
    });

    describe('rozpoznawanie różnych formatów dat', () => {
      it('rozpoznaje datę z wieloma liniami tekstu', async () => {
        // Arrange
        const imagePath = '/test/path/label.bmp';
        mockWorker.recognize.mockResolvedValue({
          data: { text: 'Some text\n15.02\nMore text' },
        });

        // Act
        const result = await ocrService.extractDateFromImage(imagePath);

        // Assert
        expect(result).toBe('15.02');
      });

      it('wybiera pierwszą znalezioną datę gdy jest wiele', async () => {
        // Arrange
        const imagePath = '/test/path/label.bmp';
        mockWorker.recognize.mockResolvedValue({
          data: { text: '15.02 20.03' },
        });

        // Act
        const result = await ocrService.extractDateFromImage(imagePath);

        // Assert
        expect(result).toBe('15.02');
      });
    });
  });

  // ============================================
  // Stałe konfiguracyjne
  // ============================================
  describe('Stałe konfiguracyjne', () => {
    it('DATE_AREA powinno mieć poprawne współrzędne', () => {
      // Assert
      expect(OcrService.DATE_AREA).toEqual({
        x: 489,
        y: 73,
        width: 103,
        height: 38,
      });
    });

    it('DATE_PATTERN powinno pasować do wzorca DD.MM', () => {
      // Assert
      const pattern = OcrService.DATE_PATTERN;
      expect(pattern.test('15.02')).toBe(true);
      expect(pattern.test('1.3')).toBe(true);
      expect(pattern.test('01.03')).toBe(true);
      expect(pattern.test('31.12')).toBe(true);
      expect(pattern.test('abc')).toBe(false);
      expect(pattern.test('15/02')).toBe(false);
    });
  });

  // ============================================
  // Integracja metod
  // ============================================
  describe('Integracja metod', () => {
    it('pełny przepływ: obraz -> przycięcie -> OCR -> parsowanie', async () => {
      // Arrange
      const imagePath = '/test/path/label.bmp';
      mockWorker.recognize.mockResolvedValue({
        data: { text: '15.02' },
      });

      // Act
      const dateString = await ocrService.extractDateFromImage(imagePath);
      const parsedDate = ocrService.parseDetectedDate(dateString!, 2026);

      // Assert
      expect(dateString).toBe('15.02');
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate?.getDate()).toBe(15);
      expect(parsedDate?.getMonth()).toBe(1);
      expect(parsedDate?.getFullYear()).toBe(2026);
    });
  });
});
