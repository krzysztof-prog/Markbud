/**
 * Typy dla modułu paletówek produkcyjnych
 */

// Typy palet produkcyjnych
export type ProductionPalletType = 'MALA' | 'P2400' | 'P3000' | 'P3500' | 'P4000';
export type PalletDayStatus = 'OPEN' | 'CLOSED';

// Nazwy wyświetlane dla typów palet
export const PALLET_TYPE_LABELS: Record<ProductionPalletType, string> = {
  MALA: 'Mała',
  P2400: '2400',
  P3000: '3000',
  P3500: '3500',
  P4000: '4000',
};

export const PALLET_TYPES: ProductionPalletType[] = ['MALA', 'P2400', 'P3000', 'P3500', 'P4000'];

// Wpis dla typu palety
export interface PalletStockEntry {
  id: number;
  palletDayId: number;
  type: ProductionPalletType;
  morningStock: number;
  morningCorrected: boolean;
  morningNote: string | null;
  used: number;
  produced: number; // = morningStock (dziś) - morningStock (poprzedni dzień) + used
  previousMorningStock: number; // Stan poranny z poprzedniego dnia (do wyliczenia "zrobione")
  createdAt: string;
  updatedAt: string;
}

// Dzień paletowy z wpisami
export interface PalletStockDay {
  id: number;
  date: string;
  status: PalletDayStatus;
  closedAt: string | null;
  entries: PalletStockEntry[];
  alerts: PalletAlert[];
  createdAt: string;
  updatedAt: string;
}

// Alert - bazuje na stanie porannym
export interface PalletAlert {
  type: ProductionPalletType;
  currentStock: number; // Stan poranny (morningStock)
  threshold: number;
  severity: 'warning' | 'critical';
}

// Konfiguracja alertów
export interface PalletAlertConfig {
  id: number;
  type: ProductionPalletType;
  criticalThreshold: number;
}

// Podsumowanie miesiąca
export interface PalletMonthSummary {
  year: number;
  month: number;
  startStocks: Record<ProductionPalletType, number>;
  endStocks: Record<ProductionPalletType, number>;
  totalUsed: Record<ProductionPalletType, number>;
  totalProduced: Record<ProductionPalletType, number>;
  daysWithAlerts: number;
  totalDays: number;
}

// Input do aktualizacji wpisów
// Kierownik wpisuje: used (użyte) i może zmienić morningStock (stan poranny)
// Backend wylicza: produced = morningStock (dziś) - morningStock (poprzedni dzień) + used
export interface UpdatePalletDayEntry {
  type: ProductionPalletType;
  used: number;
  morningStock: number;
}

// Input do korekty stanu porannego
export interface CorrectMorningStockInput {
  morningStock: number;
  note: string;
}

// Kalendarz - status dnia
export type CalendarDayStatus = 'empty' | 'open' | 'closed';

export interface PalletCalendarDay {
  date: string;
  status: CalendarDayStatus;
  hasAlerts: boolean;
}

export interface PalletCalendarSummary {
  year: number;
  month: number;
  days: PalletCalendarDay[];
}
