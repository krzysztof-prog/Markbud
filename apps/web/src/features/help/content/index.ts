/**
 * Mapowanie ścieżek URL do treści instrukcji
 */

import type { HelpContent, PathToPageMap } from '../types';

// Import treści instrukcji
import { dostawyHelp } from './dostawy';
import { zleceniaHelp } from './zlecenia';
import { magazynAkrobudHelp } from './magazyn-akrobud';
import { logistykaHelp } from './logistyka';
import { mojaPracaHelp } from './moja-praca';
import { importyHelpContent } from './importy';
import { kierownikHelpContent } from './kierownik';
import { operatorHelpContent } from './operator';
import { weryfikacjaHelpContent } from './weryfikacja';
import { kontrolaEtykietHelpContent } from './kontrola-etykiet';
import { magazynPvcHelpContent } from './magazyn-pvc';
import { zestawieniaMiesieczneHelpContent } from './zestawienia-miesieczne';
import { szybyHelpContent } from './szyby';

/**
 * Mapowanie ścieżek URL do pageId
 * Wspiera dokładne dopasowanie i prefiksy
 */
export const PATH_TO_PAGE_MAP: PathToPageMap = {
  // Główne strony
  '/dostawy': 'dostawy',
  '/dostawy/weryfikacja': 'weryfikacja',
  '/zestawienia/zlecenia': 'zlecenia',
  '/zestawienia/miesieczne': 'zestawienia-miesieczne',
  '/magazyn/akrobud': 'magazyn-akrobud',
  '/magazyn/pvc': 'magazyn-pvc',
  '/logistyka': 'logistyka',
  '/moja-praca': 'moja-praca',
  '/importy': 'importy',
  '/kierownik': 'kierownik',
  '/operator': 'operator',
  '/kontrola-etykiet': 'kontrola-etykiet',
  '/szyby': 'szyby',
};

/**
 * Rejestr wszystkich instrukcji
 */
export const HELP_CONTENT_REGISTRY: Record<string, HelpContent> = {
  'dostawy': dostawyHelp,
  'zlecenia': zleceniaHelp,
  'magazyn-akrobud': magazynAkrobudHelp,
  'logistyka': logistykaHelp,
  'moja-praca': mojaPracaHelp,
  'importy': importyHelpContent,
  'kierownik': kierownikHelpContent,
  'operator': operatorHelpContent,
  'weryfikacja': weryfikacjaHelpContent,
  'kontrola-etykiet': kontrolaEtykietHelpContent,
  'magazyn-pvc': magazynPvcHelpContent,
  'zestawienia-miesieczne': zestawieniaMiesieczneHelpContent,
  'szyby': szybyHelpContent,
};

/**
 * Znajdź pageId dla danej ścieżki
 * Obsługuje dokładne dopasowanie i prefiksy (np. /dostawy/123)
 */
export function getPageIdFromPath(pathname: string): string | null {
  // Dokładne dopasowanie (najpierw sprawdź dłuższe ścieżki)
  const sortedPaths = Object.keys(PATH_TO_PAGE_MAP).sort((a, b) => b.length - a.length);

  for (const path of sortedPaths) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return PATH_TO_PAGE_MAP[path];
    }
  }

  return null;
}

/**
 * Pobierz treść instrukcji dla danego pageId
 */
export function getHelpContent(pageId: string): HelpContent | null {
  return HELP_CONTENT_REGISTRY[pageId] || null;
}
