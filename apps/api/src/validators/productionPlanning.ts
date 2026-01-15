/**
 * Walidatory dla modułu Planowania Produkcji
 */
import { z } from 'zod';

// === Efficiency Config ===

export const efficiencyConfigSchema = z.object({
  clientType: z.string().min(1, 'Typ klienta jest wymagany'),
  name: z.string().min(1, 'Nazwa jest wymagana'),
  glazingsPerHour: z.number().positive('Szkleń/h musi być > 0'),
  wingsPerHour: z.number().positive('Skrzydeł/h musi być > 0'),
  coefficient: z.number().positive().default(1.0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateEfficiencyConfigSchema = efficiencyConfigSchema.partial().extend({
  id: z.number().int().positive(),
});

export const efficiencyConfigIdSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

export type EfficiencyConfigInput = z.infer<typeof efficiencyConfigSchema>;
export type UpdateEfficiencyConfigInput = z.infer<typeof updateEfficiencyConfigSchema>;

// === Production Settings ===

export const productionSettingSchema = z.object({
  key: z.string().min(1, 'Klucz jest wymagany'),
  value: z.string(),
  description: z.string().optional(),
});

export const updateProductionSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});

export type ProductionSettingInput = z.infer<typeof productionSettingSchema>;

// === Production Calendar ===

export const productionCalendarSchema = z.object({
  date: z.string().transform((val) => new Date(val)),
  dayType: z.enum(['working', 'holiday', 'production_saturday', 'custom_off']),
  description: z.string().optional(),
  maxHours: z.number().positive().optional(),
});

export const updateProductionCalendarSchema = productionCalendarSchema.partial();

export type ProductionCalendarInput = z.infer<typeof productionCalendarSchema>;

// === Profile isPalletized ===

export const updateProfilePalletizedSchema = z.object({
  isPalletized: z.boolean(),
});

export const bulkUpdateProfilePalletizedSchema = z.object({
  profiles: z.array(z.object({
    id: z.number().int().positive(),
    isPalletized: z.boolean(),
  })),
});

export type UpdateProfilePalletizedInput = z.infer<typeof updateProfilePalletizedSchema>;
export type BulkUpdateProfilePalletizedInput = z.infer<typeof bulkUpdateProfilePalletizedSchema>;

// === Color isTypical ===

export const updateColorTypicalSchema = z.object({
  isTypical: z.boolean(),
});

export const bulkUpdateColorTypicalSchema = z.object({
  colors: z.array(z.object({
    id: z.number().int().positive(),
    isTypical: z.boolean(),
  })),
});

export type UpdateColorTypicalInput = z.infer<typeof updateColorTypicalSchema>;
export type BulkUpdateColorTypicalInput = z.infer<typeof bulkUpdateColorTypicalSchema>;
