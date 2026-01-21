/**
 * Label Check Validators
 *
 * Walidatory Zod dla modułu sprawdzania etykiet (label-check).
 * Używane do walidacji danych wejściowych w routes/handlers.
 *
 * Statusy sprawdzania etykiet:
 * - OK: Etykieta zgodna z zamówieniem
 * - MISMATCH: Etykieta niezgodna z zamówieniem
 * - NO_FOLDER: Brak folderu z etykietami
 * - NO_BMP: Brak pliku BMP etykiety
 * - OCR_ERROR: Błąd rozpoznawania tekstu
 */

import { z } from 'zod';

// =============================================================================
// Status schemas
// =============================================================================

/**
 * Status sprawdzenia etykiety (pending/completed/failed)
 */
export const labelCheckStatusSchema = z.enum(['pending', 'completed', 'failed']);
export type LabelCheckStatus = z.infer<typeof labelCheckStatusSchema>;

/**
 * Status wyniku OCR (OK/MISMATCH/NO_FOLDER/NO_BMP/OCR_ERROR)
 */
export const labelCheckResultStatusSchema = z.enum([
  'OK',
  'MISMATCH',
  'NO_FOLDER',
  'NO_BMP',
  'OCR_ERROR',
]);
export type LabelCheckResultStatus = z.infer<typeof labelCheckResultStatusSchema>;

// =============================================================================
// Input schemas
// =============================================================================

/**
 * Schema do tworzenia nowego sprawdzenia etykiety
 */
export const createLabelCheckSchema = z.object({
  deliveryId: z.number().int().positive(),
});
export type CreateLabelCheckInput = z.infer<typeof createLabelCheckSchema>;

/**
 * Schema dla ID sprawdzenia (params)
 * Używa coerce dla konwersji string -> number (z URL params)
 */
export const labelCheckIdSchema = z.object({
  id: z.coerce
    .number()
    .refine((val) => Number.isInteger(val), { message: 'ID must be an integer' })
    .refine((val) => val > 0, { message: 'ID must be positive' }),
});
export type LabelCheckIdParams = z.infer<typeof labelCheckIdSchema>;

// =============================================================================
// Query schemas
// =============================================================================

/**
 * ISO date string validator (YYYY-MM-DD or full ISO datetime)
 * Akceptuje formaty:
 * - 2025-01-15
 * - 2025-01-15T10:30:00Z
 */
const isoDateStringSchema = z
  .string()
  .refine(
    (val) => {
      // Sprawdź format YYYY-MM-DD lub ISO datetime
      const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
      const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

      if (!dateOnlyRegex.test(val) && !isoDatetimeRegex.test(val)) {
        return false;
      }

      // Sprawdź czy data jest poprawna
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)' }
  );

/**
 * Schema dla query parameters (filtry + paginacja)
 */
export const labelCheckQuerySchema = z.object({
  // Filtry
  status: labelCheckStatusSchema.optional(),
  deliveryId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  from: isoDateStringSchema.optional(),
  to: isoDateStringSchema.optional(),

  // Paginacja
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type LabelCheckQueryParams = z.infer<typeof labelCheckQuerySchema>;
