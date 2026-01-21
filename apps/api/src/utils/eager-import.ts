/**
 * Eager Import Helper - Pre-ładowanie modułów w produkcji
 *
 * W DEV: lazy loading (szybszy start serwera)
 * W PROD: eager loading (szybsze działanie po starcie)
 *
 * Użycie:
 * ```typescript
 * // Na starcie serwera (index.ts):
 * await preloadModules();
 *
 * // W kodzie:
 * const ExcelJS = await getExcelJS();
 * const PDFDocument = await getPdfKit();
 * ```
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Cache dla załadowanych modułów
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const moduleCache: Map<string, any> = new Map();

/**
 * Pobiera moduł z cache lub ładuje go dynamicznie
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCachedModule<T = any>(
  moduleName: string,
  loader: () => Promise<T>
): Promise<T> {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName) as T;
  }

  const module = await loader();
  moduleCache.set(moduleName, module);
  return module;
}

/**
 * Pobiera exceljs
 */
export async function getExcelJS() {
  return getCachedModule('exceljs', async () => {
    const mod = await import('exceljs');
    return mod.default;
  });
}

/**
 * Pobiera pdfkit
 */
export async function getPdfKit() {
  return getCachedModule('pdfkit', async () => {
    const mod = await import('pdfkit');
    return mod.default;
  });
}

/**
 * Pre-ładuje wszystkie ciężkie moduły
 * Wywołaj na starcie serwera w trybie PROD
 */
export async function preloadHeavyModules(): Promise<void> {
  if (!IS_PRODUCTION) {
    console.log('[eager-import] Skipping preload in development mode');
    return;
  }

  console.log('[eager-import] Pre-loading heavy modules...');

  const startTime = Date.now();

  await Promise.all([
    getExcelJS().then(() => console.log('[eager-import] exceljs loaded')),
    getPdfKit().then(() => console.log('[eager-import] pdfkit loaded')),
  ]);

  console.log(`[eager-import] All modules loaded in ${Date.now() - startTime}ms`);
}

/**
 * Zwraca listę załadowanych modułów (do debugowania)
 */
export function getLoadedModules(): string[] {
  return Array.from(moduleCache.keys());
}
