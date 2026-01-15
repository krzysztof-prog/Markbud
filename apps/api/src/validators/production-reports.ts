/**
 * Walidatory dla modułu Zestawienie Miesięczne Produkcji
 * Używane do walidacji requestów API
 */

import { z } from 'zod';

// Walidacja parametrów roku i miesiąca
export const productionReportParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12)
});

// Aktualizacja pozycji raportu (ilości, RW checkboxy) - tylko dla manager/admin
export const updateReportItemSchema = z.object({
  overrideWindows: z.number().int().min(0).optional().nullable(),
  overrideUnits: z.number().int().min(0).optional().nullable(),
  overrideSashes: z.number().int().min(0).optional().nullable(),
  overrideValuePln: z.number().int().min(0).optional().nullable(), // w groszach
  overrideValueEur: z.number().int().min(0).optional().nullable(), // w centach
  rwOkucia: z.boolean().optional(),
  rwProfile: z.boolean().optional()
});

// Aktualizacja danych FV - dostępne dla accountant nawet po zamknięciu
export const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().max(50).optional().nullable(),
  invoiceDate: z.string().datetime().optional().nullable()
});

// Aktualizacja nietypówek (korekta raportowa) - tylko dla manager/admin
export const updateAtypicalSchema = z.object({
  atypicalWindows: z.number().int().min(0),
  atypicalUnits: z.number().int().min(0),
  atypicalSashes: z.number().int().min(0),
  atypicalValuePln: z.number().int().min(0), // w groszach
  atypicalNotes: z.string().max(500).optional().nullable()
});

// Typy eksportowane z walidatorów
export type ProductionReportParams = z.infer<typeof productionReportParamsSchema>;
export type UpdateReportItemInput = z.infer<typeof updateReportItemSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type UpdateAtypicalInput = z.infer<typeof updateAtypicalSchema>;
