'use client';

/**
 * Hook do pobierania treści instrukcji dla aktualnej strony
 */

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getPageIdFromPath, HELP_CONTENT_REGISTRY } from '../content';
import type { HelpContent } from '../types';

interface UseHelpContentReturn {
  /** Czy dla tej strony istnieje instrukcja */
  hasHelp: boolean;
  /** Treść instrukcji (null jeśli brak) */
  helpContent: HelpContent | null;
  /** ID strony */
  pageId: string | null;
}

/**
 * Hook zwracający treść instrukcji dla aktualnej strony
 *
 * @example
 * const { hasHelp, helpContent, pageId } = useHelpContent();
 * if (hasHelp && helpContent) {
 *   // Pokaż przycisk pomocy
 * }
 */
export function useHelpContent(): UseHelpContentReturn {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) {
      return { hasHelp: false, helpContent: null, pageId: null };
    }

    const pageId = getPageIdFromPath(pathname);

    if (!pageId) {
      return { hasHelp: false, helpContent: null, pageId: null };
    }

    const helpContent = HELP_CONTENT_REGISTRY[pageId] || null;

    return {
      hasHelp: !!helpContent,
      helpContent,
      pageId,
    };
  }, [pathname]);
}
