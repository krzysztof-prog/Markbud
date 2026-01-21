/**
 * Currency Configuration Validators
 */

import { z } from 'zod';

export const updateCurrencyRateSchema = z.object({
  eurToPlnRate: z.number()
    .positive('Exchange rate must be positive')
    .min(0.01, 'Exchange rate must be at least 0.01')
    .max(100, 'Exchange rate seems unrealistic'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'Nieprawidłowy format daty' }).optional(),
});

export type UpdateCurrencyRateInput = z.infer<typeof updateCurrencyRateSchema>;
