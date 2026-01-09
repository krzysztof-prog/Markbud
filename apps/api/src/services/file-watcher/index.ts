/**
 * File Watcher Module
 *
 * Modułowy system monitorowania plików podzielony na domeny:
 * - GlassWatcher - zamówienia i dostawy szyb (.txt, .csv)
 * - UzyteBeleWatcher - import użytych beli CSV (foldery z datą)
 * - CenyWatcher - import plików PDF z cenami zleceń
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
export { UzyteBelePrywatneWatcher } from './UzyteBelePrywatneWatcher.js';
export { CenyWatcher } from './CenyWatcher.js';
export { OkucZapotrzebowaWatcher } from './OkucZapotrzebowaWatcher.js';
export { FileWatcherFactory } from './FileWatcherFactory.js';

// Backward compatibility - alias dla starego FileWatcherService
// Pozwala na płynną migrację bez zmian w innych częściach kodu
import { FileWatcherFactory } from './FileWatcherFactory.js';

/**
 * @deprecated Użyj FileWatcherFactory zamiast FileWatcherService
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const FileWatcherService = FileWatcherFactory;

/**
 * Typ dla backward compatibility
 * @deprecated Użyj FileWatcherFactory zamiast FileWatcherService
 */
// eslint-disable-next-line no-redeclare
export type FileWatcherService = FileWatcherFactory;
