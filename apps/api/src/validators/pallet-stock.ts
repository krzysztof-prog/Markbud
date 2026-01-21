/**
 * Pallet Stock validation schemas
 * Modul paletwek produkcyjnych - walidacja stanow magazynowych palet
 */

import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

/**
 * Typy palet produkcyjnych
 * MALA - mala paleta
 * P2400-P4000 - palety o roznych dlugosciach
 */
export const ProductionPalletTypeSchema = z.enum([
  'MALA',
  'P2400',
  'P3000',
  'P3500',
  'P4000',
]);

/**
 * Status dnia paletowego
 * OPEN - dzien otwarty do edycji
 * CLOSED - dzien zamkniety (tylko korekty)
 */
export const PalletDayStatusSchema = z.enum(['OPEN', 'CLOSED']);

// ============================================
// PARAMS SCHEMAS
// ============================================

/**
 * Parametry dla pobrania dnia paletowego
 * date - data w formacie YYYY-MM-DD
 */
export const GetPalletDayParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidlowy format daty (YYYY-MM-DD)'),
});

/**
 * Parametry dla pobrania miesiaca paletowego
 * year - rok (2020-2100)
 * month - miesiac (1-12)
 */
export const GetPalletMonthParamsSchema = z.object({
  year: z.coerce.number().int().min(2020, 'Rok musi byc >= 2020').max(2100, 'Rok musi byc <= 2100'),
  month: z.coerce.number().int().min(1, 'Miesiac musi byc >= 1').max(12, 'Miesiac musi byc <= 12'),
});

// ============================================
// UPDATE/CREATE SCHEMAS
// ============================================

/**
 * Pojedynczy wpis aktualizacji stanu palet
 * type - typ palety
 * used - ilosc zuzytych palet (>= 0)
 * morningStock - stan poranny (>= 0)
 *
 * Pole "produced" (zrobione) jest WYLICZANE automatycznie w serwisie:
 * produced = morningStock (dziś) - morningStock (poprzedni dzień) + used
 */
const PalletDayEntrySchema = z.object({
  type: ProductionPalletTypeSchema,
  used: z.number().int().min(0, 'Ilosc zuzytych palet nie moze byc ujemna'),
  morningStock: z.number().int().min(0, 'Stan poranny nie moze byc ujemny'),
});

/**
 * Aktualizacja wpisow dnia paletowego
 * Tablica wpisow dla roznych typow palet
 */
export const UpdatePalletDayEntriesSchema = z.array(PalletDayEntrySchema);

/**
 * Korekta stanu poczatkowego (morning stock)
 * type - typ palety
 * morningStock - nowy stan poczatkowy (>= 0)
 * note - powod korekty (min 3 znaki)
 */
export const CorrectMorningStockSchema = z.object({
  type: ProductionPalletTypeSchema,
  morningStock: z.number().int().min(0, 'Stan poczatkowy nie moze byc ujemny'),
  note: z.string().min(3, 'Powod korekty musi miec minimum 3 znaki'),
});

// ============================================
// ALERT CONFIG SCHEMAS
// ============================================

/**
 * Pojedynczy wpis konfiguracji alertow
 * type - typ palety
 * criticalThreshold - prog krytyczny (>= 0)
 */
const AlertConfigEntrySchema = z.object({
  type: ProductionPalletTypeSchema,
  criticalThreshold: z.number().int().min(0, 'Prog krytyczny nie moze byc ujemny'),
});

/**
 * Aktualizacja konfiguracji alertow
 * Tablica konfiguracji dla roznych typow palet
 */
export const UpdateAlertConfigSchema = z.array(AlertConfigEntrySchema);

// ============================================
// INITIAL STOCK SCHEMAS
// ============================================

/**
 * Pojedynczy wpis stanu początkowego
 * type - typ palety
 * initialStock - stan początkowy (>= 0)
 */
const InitialStockEntrySchema = z.object({
  type: ProductionPalletTypeSchema,
  initialStock: z.number().int().min(0, 'Stan początkowy nie może być ujemny'),
});

/**
 * Ustawienie stanów początkowych palet
 * startDate - data od której system liczy (wspólna dla wszystkich typów)
 * stocks - tablica stanów początkowych dla każdego typu palety
 */
export const SetInitialStocksSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Nieprawidłowy format daty (YYYY-MM-DD)'),
  stocks: z.array(InitialStockEntrySchema),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ProductionPalletType = z.infer<typeof ProductionPalletTypeSchema>;
export type PalletDayStatus = z.infer<typeof PalletDayStatusSchema>;
export type GetPalletDayParams = z.infer<typeof GetPalletDayParamsSchema>;
export type GetPalletMonthParams = z.infer<typeof GetPalletMonthParamsSchema>;
export type PalletDayEntry = z.infer<typeof PalletDayEntrySchema>;
export type UpdatePalletDayEntriesInput = z.infer<typeof UpdatePalletDayEntriesSchema>;
export type CorrectMorningStockInput = z.infer<typeof CorrectMorningStockSchema>;
export type AlertConfigEntry = z.infer<typeof AlertConfigEntrySchema>;
export type UpdateAlertConfigInput = z.infer<typeof UpdateAlertConfigSchema>;
export type InitialStockEntry = z.infer<typeof InitialStockEntrySchema>;
export type SetInitialStocksInput = z.infer<typeof SetInitialStocksSchema>;
