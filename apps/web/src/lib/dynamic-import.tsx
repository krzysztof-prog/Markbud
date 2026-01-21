/**
 * Helper do warunkowego lazy loading
 *
 * W DEV: używa dynamic() z lazy loading (szybszy start, wolniejsze przełączanie)
 * W PROD: eager loading - wszystko ładowane od razu (wolniejszy start, szybsze działanie)
 *
 * Użycie:
 * ```typescript
 * import { createDynamicComponent } from '@/lib/dynamic-import';
 *
 * const MyComponent = createDynamicComponent(
 *   () => import('./MyComponent').then(mod => ({ default: mod.MyComponent })),
 *   { loading: () => <Spinner /> }
 * );
 * ```
 */

import dynamic, { DynamicOptions, Loader } from 'next/dynamic';
import { ComponentType } from 'react';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Tworzy komponent z warunkowym lazy loading
 *
 * UWAGA: Używamy ssr: false w obu trybach ponieważ:
 * 1. Komponenty używają React Query i pobierają dane z API
 * 2. Podczas build API nie jest dostępne (prerender error)
 * 3. W produkcji eager loading osiągamy przez preload w aplikacji (nie SSR)
 *
 * Różnica między DEV i PROD:
 * - DEV: loading fallback pokazywany przy lazy loading
 * - PROD: brak loading fallback - komponent ładuje się jako chunk,
 *         ale preload zmniejsza opóźnienie
 *
 * @param loader - funkcja importująca komponent
 * @param options - opcje dla dynamic() (loading, ssr)
 * @returns Komponent - w PROD bez loading fallback, w DEV z loading fallback
 */
export function createDynamicComponent<P = object>(
  loader: Loader<P>,
  options?: DynamicOptions<P>
): ComponentType<P> {
  // Zawsze ssr: false - komponenty używają API i nie mogą być prerenderowane
  // W produkcji usuwamy loading fallback dla natychmiastowego wyświetlania
  return dynamic(loader, {
    ssr: false,
    ...options,
    // W PROD nie pokazujemy loading state - zakładamy że chunk jest już preloaded
    loading: IS_PRODUCTION ? undefined : options?.loading,
  });
}