import type { PrismaClient } from '@prisma/client';
import type { FSWatcher } from 'chokidar';

/**
 * Konfiguracja watchera plików
 */
export interface WatcherConfig {
  /** Czas oczekiwania na stabilność pliku (ms) */
  stabilityThreshold: number;
  /** Interwał sprawdzania (ms) */
  pollInterval: number;
}

/**
 * Domyślna konfiguracja watchera
 */
export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  stabilityThreshold: 2000,
  pollInterval: 100,
};

/**
 * Ścieżki monitorowanych folderów
 */
export interface WatcherPaths {
  watchFolderUzyteBele: string;
  watchFolderUzyteBelePrywatne: string;
  watchFolderCeny: string;
  watchFolderGlassOrders: string;
  watchFolderGlassDeliveries: string;
  watchFolderOkucZapotrzebowanie: string;
  importsBasePath: string;
  importsCenyPath: string;
}

/**
 * Wynik importu plików
 */
export interface ImportResult {
  successCount: number;
  failCount: number;
  errors: string[];
}

/**
 * Numer dostawy w ciągu dnia
 */
export type DeliveryNumber = 'I' | 'II' | 'III';

/**
 * Interfejs bazowy dla wszystkich watcherów
 */
export interface IFileWatcher {
  start(basePath: string): Promise<void>;
  stop(): Promise<void>;
  getWatchers(): FSWatcher[];
}

/**
 * Kontekst współdzielony między watcherami
 */
export interface WatcherContext {
  prisma: PrismaClient;
  projectRoot: string;
}
