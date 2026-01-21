/**
 * Zod schemas dla modułu Steel (wzmocnienia stalowe)
 */
import { z } from 'zod';

// Schema tworzenia nowej stali
export const createSteelSchema = z.object({
  number: z.string().min(1, 'Numer stali jest wymagany'),
  articleNumber: z.string().optional(),
  name: z.string().min(1, 'Nazwa jest wymagana'),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

// Schema aktualizacji stali
export const updateSteelSchema = z.object({
  number: z.string().min(1, 'Numer stali jest wymagany').optional(),
  articleNumber: z.string().nullable().optional(),
  name: z.string().min(1, 'Nazwa jest wymagana').optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

// Schema aktualizacji kolejności
export const updateSteelOrdersSchema = z.object({
  orders: z.array(
    z.object({
      id: z.number().int().positive(),
      sortOrder: z.number().int(),
    })
  ),
});

// Schema aktualizacji stanu magazynowego
export const updateSteelStockSchema = z.object({
  currentStockBeams: z.number().int().min(0),
  notes: z.string().optional(),
});

// Typy TypeScript
export type CreateSteelInput = z.infer<typeof createSteelSchema>;
export type UpdateSteelInput = z.infer<typeof updateSteelSchema>;
export type UpdateSteelOrdersInput = z.infer<typeof updateSteelOrdersSchema>;
export type UpdateSteelStockInput = z.infer<typeof updateSteelStockSchema>;
