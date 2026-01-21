/**
 * LabelCheckService - Serwis sprawdzania etykiet
 *
 * Serwis do sprawdzania etykiet dla dostaw.
 * Odpowiada za koordynacje procesu sprawdzania etykiet:
 * - checkDelivery: sprawdza wszystkie zlecenia w dostawie
 * - checkOrder: sprawdza etykiete pojedynczego zlecenia
 * - getById, getLatestForDelivery, getAll: pobieranie wynikow
 * - delete: soft delete sprawdzenia
 */

import type { PrismaClient } from '@prisma/client';
import { LabelCheckRepository } from '../../repositories/LabelCheckRepository.js';
import { OcrService } from './OcrService.js';
import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

// Typy dla wynikow sprawdzania
export type LabelCheckResultStatus = 'OK' | 'MISMATCH' | 'NO_FOLDER' | 'NO_BMP' | 'OCR_ERROR';

export interface CheckOrderResult {
  orderId: number;
  orderNumber: string;
  status: LabelCheckResultStatus;
  expectedDate: Date;
  detectedDate: Date | null;
  detectedText: string | null;
  imagePath: string | null;
  errorMessage: string | null;
}

export interface LabelCheckFilters {
  status?: 'pending' | 'completed' | 'failed';
  deliveryId?: number;
  from?: Date;
  to?: Date;
  includeDeleted?: boolean;
}

export interface PaginationParams {
  skip?: number;
  take?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface LabelCheckStatistics {
  totalChecks: number;
  totalOk: number;
  totalMismatch: number;
  totalErrors: number;
}

export interface DeliveryCheckSummary {
  successRate: number;
  hasIssues: boolean;
  completed: boolean;
}

export interface LabelCheckServiceConfig {
  basePath?: string;
}

export class LabelCheckService {
  /**
   * Stala sciezka bazowa do folderow ze zdjeciami etykiet
   */
  static readonly BASE_PATH = '//pila21/KABANTRANSFER';

  private repository: LabelCheckRepository;
  private ocrService: OcrService;
  private prisma: PrismaClient;
  private basePath: string;

  constructor(prisma: PrismaClient, config?: LabelCheckServiceConfig) {
    this.prisma = prisma;
    this.repository = new LabelCheckRepository(prisma);
    this.ocrService = new OcrService();
    this.basePath = config?.basePath ?? LabelCheckService.BASE_PATH;
  }

  /**
   * Sprawdza etykiety dla wszystkich zlecen w dostawie.
   *
   * @param deliveryId - ID dostawy
   * @returns LabelCheck z wynikami
   * @throws Error gdy dostawa nie istnieje lub nie ma zlecen
   */
  async checkDelivery(deliveryId: number): Promise<any> {
    // 1. Pobierz dostawe z zleceniami
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliveryOrders: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (!delivery.deliveryOrders || delivery.deliveryOrders.length === 0) {
      throw new Error(`Brak zlecen w dostawie: ${deliveryId}`);
    }

    // 2. Utworz LabelCheck record
    const labelCheck = await this.repository.create({
      deliveryId,
      deliveryDate: delivery.deliveryDate,
      totalOrders: delivery.deliveryOrders.length,
    });

    // 3. Countery do aktualizacji
    let checkedCount = 0;
    let okCount = 0;
    let mismatchCount = 0;
    let errorCount = 0;

    // 4. Sprawdz kazdego zlecenie
    for (const deliveryOrder of delivery.deliveryOrders) {
      const order = deliveryOrder.order;
      const result = await this.checkOrder(order.id, order.orderNumber, delivery.deliveryDate);

      // Zapisz wynik do bazy
      await this.repository.addResult(labelCheck.id, {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        status: result.status,
        expectedDate: result.expectedDate,
        detectedDate: result.detectedDate,
        detectedText: result.detectedText,
        imagePath: result.imagePath,
        errorMessage: result.errorMessage,
      });

      // Aktualizuj countery
      checkedCount++;
      if (result.status === 'OK') {
        okCount++;
      } else if (result.status === 'MISMATCH') {
        mismatchCount++;
      } else {
        errorCount++;
      }
    }

    // 5. Aktualizuj status i countery
    const completedAt = new Date();
    await this.repository.updateStatus(labelCheck.id, {
      status: 'completed',
      checkedCount,
      okCount,
      mismatchCount,
      errorCount,
      completedAt,
    });

    return {
      ...labelCheck,
      status: 'completed',
      checkedCount,
      okCount,
      mismatchCount,
      errorCount,
      completedAt,
    };
  }

  /**
   * Sprawdza etykiete pojedynczego zlecenia.
   *
   * @param orderId - ID zlecenia
   * @param orderNumber - numer zlecenia (do budowania sciezki)
   * @param expectedDate - oczekiwana data na etykiecie
   * @returns wynik sprawdzenia
   */
  async checkOrder(
    orderId: number,
    orderNumber: string,
    expectedDate: Date
  ): Promise<CheckOrderResult> {
    const baseResult: CheckOrderResult = {
      orderId,
      orderNumber,
      status: 'OK',
      expectedDate,
      detectedDate: null,
      detectedText: null,
      imagePath: null,
      errorMessage: null,
    };

    // 1. Zbuduj sciezke do folderu
    const folderPath = join(this.basePath, orderNumber);

    // 2. Sprawdz czy folder istnieje
    try {
      await access(folderPath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Rozrozniamy typy bledow
      if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
        return {
          ...baseResult,
          status: 'NO_FOLDER',
          errorMessage: `Brak dostepu do folderu (permission denied): ${folderPath}`,
        };
      }

      return {
        ...baseResult,
        status: 'NO_FOLDER',
        errorMessage: `Nie znaleziono folderu zlecenia: ${folderPath}`,
      };
    }

    // 3. Znajdz pliki BMP
    let files: string[];
    try {
      files = await readdir(folderPath);
    } catch {
      return {
        ...baseResult,
        status: 'NO_FOLDER',
        errorMessage: `Nie mozna odczytac folderu: ${folderPath}`,
      };
    }

    // Filtruj tylko pliki BMP (case-insensitive)
    const bmpFiles = files.filter((file) => file.toLowerCase().endsWith('.bmp'));

    if (bmpFiles.length === 0) {
      return {
        ...baseResult,
        status: 'NO_BMP',
        errorMessage: `Brak plikow BMP w folderze: ${folderPath}`,
      };
    }

    // 4. Uzyj pierwszego pliku BMP
    const bmpFile = bmpFiles[0];
    const imagePath = join(folderPath, bmpFile);

    // 5. Uruchom OCR
    let detectedText: string | null;
    try {
      detectedText = await this.ocrService.extractDateFromImage(imagePath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ...baseResult,
        status: 'OCR_ERROR',
        imagePath,
        errorMessage: `Blad OCR: ${errorMessage}`,
      };
    }

    // 6. Sprawdz czy OCR wykryl date
    if (!detectedText) {
      return {
        ...baseResult,
        status: 'OCR_ERROR',
        imagePath,
        errorMessage: 'OCR: nie rozpoznano daty na obrazie',
      };
    }

    // 7. Parsuj wykryta date - uzywamy roku z daty dostawy (expectedDate)
    // Dzieki temu przy przelamie roku (grudzien 2026 -> styczen 2027) porownanie bedzie poprawne
    const expectedYear = expectedDate.getFullYear();
    const detectedDate = this.ocrService.parseDetectedDate(detectedText, expectedYear);

    if (!detectedDate) {
      return {
        ...baseResult,
        status: 'OCR_ERROR',
        imagePath,
        detectedText,
        errorMessage: `OCR: nie mozna sparsowac daty: ${detectedText}`,
      };
    }

    // 8. Porownaj daty (dzien i miesiac) - rok jest juz ustawiony z expectedDate
    const expectedDay = expectedDate.getDate();
    const expectedMonth = expectedDate.getMonth();
    const detectedDay = detectedDate.getDate();
    const detectedMonth = detectedDate.getMonth();

    const isMatch = expectedDay === detectedDay && expectedMonth === detectedMonth;

    return {
      ...baseResult,
      status: isMatch ? 'OK' : 'MISMATCH',
      detectedDate,
      detectedText,
      imagePath,
    };
  }

  /**
   * Pobiera sprawdzenie po ID.
   *
   * @param id - ID sprawdzenia
   * @returns LabelCheck z wynikami lub null
   */
  async getById(id: number): Promise<any | null> {
    return this.repository.findById(id);
  }

  /**
   * Pobiera najnowsze sprawdzenie dla dostawy.
   *
   * @param deliveryId - ID dostawy
   * @returns LabelCheck lub null
   */
  async getLatestForDelivery(deliveryId: number): Promise<any | null> {
    return this.repository.getLatestForDelivery(deliveryId);
  }

  /**
   * Pobiera liste sprawdzen z filtrami i paginacja.
   *
   * @param filters - filtry (status, deliveryId, from, to)
   * @param pagination - paginacja (skip, take)
   * @returns lista z paginacja
   */
  async getAll(
    filters: LabelCheckFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<any>> {
    return this.repository.findAll(filters, pagination);
  }

  /**
   * Usuwa sprawdzenie (soft delete).
   *
   * @param id - ID sprawdzenia
   * @returns usuniete sprawdzenie
   * @throws Error gdy sprawdzenie nie istnieje
   */
  async delete(id: number): Promise<any> {
    return this.repository.softDelete(id);
  }

  /**
   * Zwraca statystyki wszystkich sprawdzen.
   *
   * @returns statystyki (totalChecks, totalOk, totalMismatch, totalErrors)
   */
  async getStatistics(): Promise<LabelCheckStatistics> {
    const result = await this.repository.findAll({}, { skip: 0, take: 1000 });

    let totalOk = 0;
    let totalMismatch = 0;
    let totalErrors = 0;

    for (const check of result.data) {
      totalOk += check.okCount || 0;
      totalMismatch += check.mismatchCount || 0;
      totalErrors += check.errorCount || 0;
    }

    return {
      totalChecks: result.total,
      totalOk,
      totalMismatch,
      totalErrors,
    };
  }

  /**
   * Zwraca podsumowanie sprawdzenia dla dostawy.
   *
   * @param deliveryId - ID dostawy
   * @returns podsumowanie lub null
   */
  async getDeliveryCheckSummary(deliveryId: number): Promise<DeliveryCheckSummary | null> {
    const latestCheck = await this.repository.getLatestForDelivery(deliveryId);

    if (!latestCheck) {
      return null;
    }

    const totalChecked = latestCheck.checkedCount || 0;
    const okCount = latestCheck.okCount || 0;
    const mismatchCount = latestCheck.mismatchCount || 0;
    const errorCount = latestCheck.errorCount || 0;

    const successRate = totalChecked > 0 ? Math.round((okCount / totalChecked) * 100) : 0;
    const hasIssues = mismatchCount > 0 || errorCount > 0;
    const completed = latestCheck.status === 'completed';

    return {
      successRate,
      hasIssues,
      completed,
    };
  }
}
