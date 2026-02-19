import path from 'path';
import { existsSync } from 'fs';
import { mkdir, rename, access, constants, readdir, copyFile, rm } from 'fs/promises';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import type { DeliveryNumber } from './types.js';

/**
 * Pobiera ustawienie z bazy danych
 */
export async function getSetting(prisma: PrismaClient, key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });
  return setting?.value || null;
}

/**
 * Wyciąga datę z nazwy folderu w formacie DD.MM.YYYY
 * @returns Data lub null jeśli format nieprawidłowy
 */
export function extractDateFromFolderName(folderName: string): Date | null {
  // Obsługuje DD.MM.YYYY i DD.MM.YY
  const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);

  if (!dateMatch) {
    return null;
  }

  const [, day, month, yearStr] = dateMatch;
  // Dla 2-cyfrowego roku: 26 -> 2026
  const year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
  const date = new Date(year, parseInt(month) - 1, parseInt(day));

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Wyciąga numer dostawy z nazwy folderu
 * Format: "01.12.2025_I" lub "01.12.2025_II" lub "01.12.2025_III"
 * Domyślnie zwraca 'I'
 */
export function extractDeliveryNumber(folderName: string): DeliveryNumber {
  const deliveryNumberMatch = folderName.match(/_(I{1,3})$/);
  return (deliveryNumberMatch?.[1] || 'I') as DeliveryNumber;
}

/**
 * Formatuje datę na numer dostawy w formacie DD.MM.YYYY_X
 */
export function formatDeliveryNumber(date: Date, deliveryNumber: DeliveryNumber): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}_${deliveryNumber}`;
}

/**
 * Archiwizuje pojedynczy plik (przenosi do _archiwum w tym samym folderze)
 * @returns Nowa ścieżka do pliku w archiwum lub null jeśli archiwizacja się nie powiodła
 */
export async function archiveFile(filePath: string): Promise<string | null> {
  try {
    const directory = path.dirname(filePath);
    const filename = path.basename(filePath);
    const archivePath = path.join(directory, '_archiwum');
    const archiveDestination = path.join(archivePath, filename);

    // Utwórz folder _archiwum jeśli nie istnieje
    try {
      await access(archivePath, constants.F_OK);
    } catch {
      await mkdir(archivePath, { recursive: true });
    }

    // Przenieś plik do archiwum
    await rename(filePath, archiveDestination);
    logger.info(`   Zarchiwizowano plik: ${filename} → _archiwum/`);
    return archiveDestination;
  } catch (error) {
    logger.warn(
      `   Nie udało się zarchiwizować pliku ${filePath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    );
    return null;
  }
}

/**
 * Archiwizuje pomyślnie zaimportowany folder (przenosi do _archiwum)
 * Jeśli folder docelowy już istnieje (np. dwie dostawy tego samego dnia),
 * merguje pliki do istniejącego folderu zamiast próby rename.
 */
export async function archiveFolder(folderPath: string, basePath: string): Promise<void> {
  try {
    const folderName = path.basename(folderPath);
    const archivePath = path.join(basePath, '_archiwum');
    const archiveDestination = path.join(archivePath, folderName);

    // Utwórz folder _archiwum jeśli nie istnieje
    await mkdir(archivePath, { recursive: true });

    // Sprawdź czy folder docelowy już istnieje
    const targetExists = existsSync(archiveDestination);

    if (!targetExists) {
      // Folder docelowy nie istnieje - standardowe przeniesienie
      await rename(folderPath, archiveDestination);
      logger.info(`   Zarchiwizowano folder: ${folderName} → _archiwum/`);
    } else {
      // Folder docelowy JUŻ ISTNIEJE (kolizja nazw, np. druga dostawa tego samego dnia)
      // Mergujemy pliki do istniejącego folderu
      logger.info(`   Folder _archiwum/${folderName} już istnieje - merge plików`);

      const files = await readdir(folderPath);
      for (const file of files) {
        const srcFile = path.join(folderPath, file);
        const destFile = path.join(archiveDestination, file);

        // Jeśli plik o tej nazwie już jest w archiwum, dodaj timestamp
        const finalDest = existsSync(destFile)
          ? path.join(archiveDestination, `${Date.now()}_${file}`)
          : destFile;

        await copyFile(srcFile, finalDest);
      }

      // Usuń oryginalny folder po pomyślnym skopiowaniu
      await rm(folderPath, { recursive: true });
      logger.info(`   Zmergowano ${files.length} plików do _archiwum/${folderName} i usunięto źródło`);
    }
  } catch (error) {
    logger.warn(
      `   Nie udało się zarchiwizować folderu ${folderPath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    );
  }
}

/**
 * Upewnia się że folder istnieje, tworzy jeśli nie
 */
export async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  if (existsSync(dirPath)) {
    return true;
  }

  try {
    await mkdir(dirPath, { recursive: true });
    logger.info(`   Utworzono folder: ${dirPath}`);
    return true;
  } catch (error) {
    logger.error(`Nie można utworzyć folderu ${dirPath}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    return false;
  }
}

/**
 * Generuje bezpieczną nazwę pliku z timestamp
 */
export function generateSafeFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${timestamp}_${safeFilename}`;
}

/**
 * Sprawdza czy plik był już zaimportowany I nadal istnieje w archiwum/pominiętych
 * Jeśli plik był zaimportowany ale został usunięty z archiwum - pozwala na ponowny import
 *
 * WAŻNE: Sprawdza FIZYCZNIE czy plik istnieje w archiwum/pominiętych
 * Nawet jeśli nie ma rekordu w bazie, ale plik jest w archiwum - pomijamy import
 *
 * @returns true jeśli plik powinien być pominięty, false jeśli można importować
 */
export async function shouldSkipImport(
  prisma: PrismaClient,
  filename: string,
  filePath: string
): Promise<boolean> {
  const directory = path.dirname(filePath);

  // NAJPIERW sprawdź fizycznie czy plik istnieje w archiwum/pominiętych
  // To jest najważniejszy warunek - jeśli plik już tam jest, nie importuj ponownie
  // Sprawdzamy oba warianty nazw folderów: z podkreślnikiem (_archiwum) i bez (archiwum)

  // Wariant 1: z podkreślnikiem (używany przez UzyteBeleWatcher, CenyWatcher)
  const archivePathUnderscore = path.join(directory, '_archiwum', filename);
  const skippedPathUnderscore = path.join(directory, '_pominiete', filename);

  // Wariant 2: bez podkreślnika (używany przez UzyteBelePrywatneWatcher)
  const archivePathNoUnderscore = path.join(directory, 'archiwum', filename);
  const skippedPathNoUnderscore = path.join(directory, 'pominiete', filename);

  const archivedExists = existsSync(archivePathUnderscore) || existsSync(archivePathNoUnderscore);
  const skippedExists = existsSync(skippedPathUnderscore) || existsSync(skippedPathNoUnderscore);

  if (archivedExists || skippedExists) {
    // Plik jest w archiwum lub pominięte - pomiń import
    logger.info(`   ⏭️ Plik ${filename} już istnieje w archiwum/pominiętych - pomijam`);
    return true;
  }

  // Sprawdź w bazie czy plik był importowany (szukaj po nazwie oryginalnej lub z timestampem)
  // Uwaga: filename w bazie może mieć prefix timestamp (np. 1769035865820_53821_uzyte_bele.csv)
  const existingImport = await prisma.fileImport.findFirst({
    where: {
      OR: [
        { filename: filename },
        { filename: { endsWith: `_${filename}` } }, // Szukaj też z prefixem timestamp
      ],
      status: { in: ['completed', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!existingImport) {
    // Plik nigdy nie był importowany i nie jest w archiwum - można importować
    return false;
  }

  // Plik był importowany ale został usunięty z archiwum - pozwól na ponowny import
  logger.info(`   🔄 Plik ${filename} był wcześniej importowany, ale usunięty z archiwum - importuję ponownie`);

  // Oznacz poprzedni import jako "reprocessed" żeby zachować historię
  await prisma.fileImport.update({
    where: { id: existingImport.id },
    data: {
      status: 'reprocessed',
      metadata: JSON.stringify({
        ...JSON.parse(existingImport.metadata || '{}'),
        reprocessedAt: new Date().toISOString(),
        reprocessReason: 'file_deleted_from_archive'
      })
    },
  });

  return false;
}

/**
 * Przenosi plik do folderu _pominiete (dla plikow juz zarejestrowanych)
 */
export async function moveToSkipped(filePath: string): Promise<void> {
  try {
    const directory = path.dirname(filePath);
    const filename = path.basename(filePath);
    const skippedPath = path.join(directory, '_pominiete');
    const skippedDestination = path.join(skippedPath, filename);

    // Utworz folder _pominiete jesli nie istnieje
    try {
      await access(skippedPath, constants.F_OK);
    } catch {
      await mkdir(skippedPath, { recursive: true });
    }

    // Przenies plik do pominiete
    await rename(filePath, skippedDestination);
    logger.info(`   Przeniesiono do pominiete: ${filename} → _pominiete/`);
  } catch (error) {
    logger.warn(
      `   Nie udalo sie przeniesc pliku ${filePath} do pominiete: ${error instanceof Error ? error.message : 'Nieznany blad'}`
    );
  }
}
