/**
 * OcrService - Serwis OCR do rozpoznawania dat na etykietach
 *
 * Serwis do rozpoznawania dat na etykietach BMP.
 * Używa tesseract.js + Jimp do przetwarzania obrazów.
 * Jimp lepiej obsługuje różne formaty BMP niż sharp.
 *
 * Koordynaty obszaru daty: x=489, y=73, width=103, height=38
 * Wzorzec daty: DD.MM (np. "15.02")
 */

import { createWorker, PSM } from 'tesseract.js';
import Jimp from 'jimp';
import { access } from 'node:fs/promises';

// Koordynaty obszaru daty na etykiecie
export interface DateArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OcrService {
  /**
   * Stałe konfiguracyjne - współrzędne obszaru daty na etykiecie BMP
   */
  static readonly DATE_AREA: DateArea = {
    x: 489,
    y: 73,
    width: 103,
    height: 38,
  };

  /**
   * Wzorzec daty DD.MM (np. "15.02", "1.3")
   * Waliduje: dzień 1-31, miesiąc 1-12
   */
  static readonly DATE_PATTERN = /\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[012])\b/;

  /**
   * Wyodrębnia datę z obrazu etykiety przy użyciu OCR.
   *
   * @param imagePath - ścieżka do pliku obrazu (BMP, PNG, JPEG)
   * @returns rozpoznany string daty (np. "15.02") lub null jeśli nie znaleziono
   * @throws Error gdy plik nie istnieje lub nie jest obrazem
   */
  async extractDateFromImage(imagePath: string): Promise<string | null> {
    // 1. Sprawdź czy plik istnieje
    try {
      await access(imagePath);
    } catch {
      throw new Error(`Plik nie istnieje: ${imagePath}`);
    }

    // 2. Wczytaj obraz przez Jimp (lepiej obsługuje różne formaty BMP)
    let image: Jimp;
    try {
      image = await Jimp.read(imagePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Nie można wczytać obrazu: ${errorMessage}`);
    }

    // 3. Sprawdź wymiary obrazu
    const minWidth = OcrService.DATE_AREA.x + OcrService.DATE_AREA.width;
    const minHeight = OcrService.DATE_AREA.y + OcrService.DATE_AREA.height;

    const width = image.getWidth();
    const height = image.getHeight();

    if (width < minWidth || height < minHeight) {
      throw new Error(
        `Obraz ma za mały wymiar (${width}x${height}). ` +
          `Wymagane minimum: ${minWidth}x${minHeight}`
      );
    }

    // 4. Przycięcie obrazu do obszaru daty i konwersja na grayscale
    const croppedBuffer = await this.cropDateArea(image);

    // 5. Uruchom OCR z Tesseract (v5+ API - createWorker zwraca gotowego workera)
    const worker = await createWorker('pol', 1, {
      // Opcje workera - tesseract.js v5+ nie wymaga loadLanguage/initialize
    });
    try {
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });

      const { data } = await worker.recognize(croppedBuffer);
      const text = data.text.trim();

      // 6. Wyodrębnij datę z tekstu OCR
      const match = text.match(OcrService.DATE_PATTERN);
      if (match) {
        return match[0];
      }

      return null;
    } finally {
      // Zawsze zamknij worker
      await worker.terminate();
    }
  }

  /**
   * Parsuje rozpoznany tekst daty na obiekt Date.
   *
   * @param text - tekst w formacie DD.MM (np. "15.02")
   * @param year - rok do użycia (domyślnie bieżący rok)
   * @returns obiekt Date lub null dla niepoprawnego tekstu
   */
  parseDetectedDate(text: string, year?: number): Date | null {
    const trimmedText = text.trim();
    const match = trimmedText.match(OcrService.DATE_PATTERN);

    if (!match) {
      return null;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const usedYear = year ?? new Date().getFullYear();

    // Walidacja zakresu dnia i miesiąca
    if (day < 1 || day > 31) {
      return null;
    }
    if (month < 1 || month > 12) {
      return null;
    }

    // Tworzenie daty (miesiąc w JS jest 0-indexed)
    const date = new Date(usedYear, month - 1, day);

    // Sprawdź czy data jest poprawna (np. 31.02 utworzy niepoprawną datę)
    if (
      date.getFullYear() !== usedYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /**
   * Przycina obraz do obszaru zawierającego datę.
   *
   * @param image - obiekt Jimp z wczytanym obrazem
   * @returns Buffer z przyciętym obrazem w formacie PNG
   */
  async cropDateArea(image: Jimp): Promise<Buffer> {
    // Sklonuj obraz żeby nie modyfikować oryginału
    const cropped = image.clone();

    // Przytnij do obszaru daty
    cropped.crop(
      OcrService.DATE_AREA.x,
      OcrService.DATE_AREA.y,
      OcrService.DATE_AREA.width,
      OcrService.DATE_AREA.height
    );

    // Konwertuj na grayscale dla lepszego OCR
    cropped.grayscale();

    // Zwiększ kontrast dla lepszego rozpoznawania
    cropped.contrast(0.3);

    // Zwróć jako PNG buffer (tesseract dobrze obsługuje PNG)
    return cropped.getBufferAsync(Jimp.MIME_PNG);
  }
}
