/**
 * File Watcher Module
 *
 * Modułowy system monitorowania plików podzielony na domeny:
 * - GlassWatcher - zamówienia i dostawy szyb (.txt, .csv)
 * - UzyteBeleWatcher - import użytych beli CSV (foldery z datą)
 * - FileWatcherFactory - orkiestrator wszystkich watcherów
 *
 * @module file-watcher
 */

// Typy eksportowane
export type {
  WatcherConfig,
  WatcherPaths,
  ImportResult,
  DeliveryNumber,
  IFileWatcher,
  WatcherContext,
} from './types.js';

export { DEFAULT_WATCHER_CONFIG } from './types.js';

// Funkcje pomocnicze
export {
  getSetting,
  extractDateFromFolderName,
  extractDeliveryNumber,
  formatDeliveryNumber,
  archiveFile,
  archiveFolder,
  ensureDirectoryExists,
  generateSafeFilename,
} from './utils.js';

// Klasy watcherów
export { GlassWatcher } from './GlassWatcher.js';
export { UzyteBeleWatcher } from './UzyteBeleWatcher.js';
export { FileWatcherFactory } from './FileWatcherFactory.js';

// Backward compatibility - alias dla starego FileWatcherService
// Pozwala na płynną migrację bez zmian w innych częściach kodu
import { FileWatcherFactory } from './FileWatcherFactory.js';

/**
 * @deprecated Użyj FileWatcherFactory zamiast FileWatcherService
 */
export const FileWatcherService = FileWatcherFactory;

/**
 * Typ dla backward compatibility
 * @deprecated Użyj FileWatcherFactory zamiast FileWatcherService
 */
export type FileWatcherService = FileWatcherFactory;
