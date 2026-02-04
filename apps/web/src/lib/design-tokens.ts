/**
 * Design Tokens - centralne definicje stylów dla aplikacji AKROBUD
 *
 * Użycie:
 * ```tsx
 * import { COLORS, STATUS_COLORS, SPACING } from '@/lib/design-tokens';
 *
 * <Badge className={STATUS_COLORS.success.badge}>Gotowe</Badge>
 * <Card className={COLORS.surface.card}>...</Card>
 * ```
 *
 * Dlaczego to istnieje:
 * - Spójność kolorów w całej aplikacji
 * - Łatwa zmiana motywu (dark mode w przyszłości)
 * - Unikanie ad-hoc kolorów (text-green-500 vs text-emerald-700)
 */

// ============================================================
// KOLORY POWIERZCHNI (tła, karty, panele)
// ============================================================

export const COLORS = {
  /** Tła główne */
  surface: {
    /** Główne tło strony */
    page: 'bg-slate-50',
    /** Tło karty */
    card: 'bg-white',
    /** Tło sekcji wyróżnionej */
    elevated: 'bg-slate-100',
    /** Tło ciemne (np. header dashboardu) */
    dark: 'bg-slate-800',
    /** Tło bardzo ciemne */
    darker: 'bg-slate-900',
  },

  /** Kolory tekstu */
  text: {
    /** Tekst główny */
    primary: 'text-slate-900',
    /** Tekst drugorzędny */
    secondary: 'text-slate-600',
    /** Tekst wyciszony (etykiety, podpisy) */
    muted: 'text-slate-400',
    /** Tekst na ciemnym tle */
    onDark: 'text-white',
    /** Tekst na ciemnym tle - wyciszony */
    onDarkMuted: 'text-slate-300',
  },

  /** Kolory obramowań */
  border: {
    /** Standardowe obramowanie */
    default: 'border-slate-200',
    /** Mocniejsze obramowanie */
    strong: 'border-slate-300',
    /** Obramowanie na ciemnym tle */
    dark: 'border-slate-700',
  },

  /** Kolory akcji głównych */
  primary: {
    /** Przycisk główny */
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    /** Tekst akcentowy */
    text: 'text-blue-600',
    /** Tło wyróżnione */
    surface: 'bg-blue-50',
    /** Obramowanie akcentowe */
    border: 'border-blue-200',
  },
} as const;

// ============================================================
// KOLORY STATUSÓW (success, warning, error, info)
// ============================================================

export const STATUS_COLORS = {
  /** Sukces / Gotowe / Zielone */
  success: {
    badge: 'bg-green-100 text-green-700 border-green-200',
    text: 'text-green-600',
    surface: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
  },

  /** Ostrzeżenie / W toku / Żółte-Pomarańczowe */
  warning: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    text: 'text-orange-600',
    surface: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-500',
  },

  /** Błąd / Krytyczne / Czerwone */
  error: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    text: 'text-red-600',
    surface: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
  },

  /** Informacja / Neutralne / Niebieskie */
  info: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    text: 'text-blue-600',
    surface: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
  },

  /** Nieaktywne / Wyciszone / Szare */
  neutral: {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    text: 'text-slate-500',
    surface: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-400',
  },
} as const;

// ============================================================
// KOLORY SPECYFICZNE DLA MODUŁÓW
// ============================================================

export const MODULE_COLORS = {
  /** Dostawy / Logistyka */
  deliveries: {
    surface: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: 'text-indigo-500',
  },

  /** Szyby */
  glass: {
    surface: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    icon: 'text-cyan-500',
  },

  /** Okucia */
  hardware: {
    surface: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },

  /** Schuco */
  schuco: {
    surface: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'text-orange-500',
  },

  /** Magazyn */
  warehouse: {
    surface: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-500',
  },

  /** Produkcja */
  production: {
    surface: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    icon: 'text-violet-500',
  },
} as const;

// ============================================================
// SPACING (odwzorowanie Tailwind spacing)
// ============================================================

export const SPACING = {
  /** Bardzo mały (4px) */
  xs: 'p-1',
  /** Mały (8px) */
  sm: 'p-2',
  /** Średni (12px) */
  md: 'p-3',
  /** Standardowy (16px) */
  lg: 'p-4',
  /** Duży (24px) */
  xl: 'p-6',
  /** Bardzo duży (32px) */
  '2xl': 'p-8',
} as const;

// ============================================================
// TYPOGRAPHY (rozmiary tekstu)
// ============================================================

export const TYPOGRAPHY = {
  /** Nagłówek strony */
  pageTitle: 'text-2xl font-bold',
  /** Nagłówek sekcji */
  sectionTitle: 'text-xl font-semibold',
  /** Nagłówek karty */
  cardTitle: 'text-lg font-medium',
  /** Tekst zwykły */
  body: 'text-sm',
  /** Tekst mały (etykiety) */
  small: 'text-xs',
  /** Tekst mono (kody, numery) */
  mono: 'font-mono text-sm',
} as const;

// ============================================================
// POMOCNICZE KOMBINACJE
// ============================================================

/**
 * Predefiniowane style dla kart statusów
 */
export const STATUS_CARD_STYLES = {
  success: `${STATUS_COLORS.success.surface} ${STATUS_COLORS.success.border} border`,
  warning: `${STATUS_COLORS.warning.surface} ${STATUS_COLORS.warning.border} border`,
  error: `${STATUS_COLORS.error.surface} ${STATUS_COLORS.error.border} border`,
  info: `${STATUS_COLORS.info.surface} ${STATUS_COLORS.info.border} border`,
  neutral: `${STATUS_COLORS.neutral.surface} ${STATUS_COLORS.neutral.border} border`,
} as const;

/**
 * Mapowanie statusów zleceń na kolory
 */
export const ORDER_STATUS_COLORS = {
  new: STATUS_COLORS.info,
  in_progress: STATUS_COLORS.warning,
  completed: STATUS_COLORS.success,
  archived: STATUS_COLORS.neutral,
} as const;

/**
 * Mapowanie statusów dostaw na kolory
 */
export const DELIVERY_STATUS_COLORS = {
  planned: STATUS_COLORS.info,
  in_transit: STATUS_COLORS.warning,
  delivered: STATUS_COLORS.success,
  cancelled: STATUS_COLORS.error,
} as const;
