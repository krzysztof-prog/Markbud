/**
 * Typy dla systemu instrukcji/pomocy
 */

import type { ReactNode } from 'react';

/**
 * Pojedyncza sekcja instrukcji
 */
export interface HelpSection {
  /** Unikalny identyfikator sekcji */
  id: string;
  /** Tytuł sekcji */
  title: string;
  /** Treść sekcji (JSX dla elastyczności formatowania) */
  content: ReactNode;
}

/**
 * Pełna treść instrukcji dla strony
 */
export interface HelpContent {
  /** Identyfikator strony (np. 'dostawy', 'zlecenia') */
  pageId: string;
  /** Tytuł wyświetlany w modalu */
  pageTitle: string;
  /** Krótki opis strony */
  description: string;
  /** Sekcje instrukcji podzielone na kategorie */
  sections: {
    /** Co za co odpowiada - opis elementów UI */
    overview: HelpSection[];
    /** Jak wykonać typowe zadania - instrukcje krok po kroku */
    howTo: HelpSection[];
    /** Co się zmieni po akcji - konsekwencje */
    consequences: HelpSection[];
    /** Często zadawane pytania */
    faq: HelpSection[];
  };
}

/**
 * Mapowanie ścieżek URL do pageId
 */
export type PathToPageMap = Record<string, string>;

/**
 * Dane do generowania PDF (plain text, bez JSX)
 */
export interface HelpPdfSection {
  title: string;
  items: string[];
}

export interface HelpPdfContent {
  title: string;
  description: string;
  sections: HelpPdfSection[];
}
