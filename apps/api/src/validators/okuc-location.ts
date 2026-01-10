/**
 * Zod validators for OkucLocation (warehouse locations for hardware/okuc)
 */

import { z } from 'zod';

// ============ CREATE VALIDATORS ============

export const createOkucLocationSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(100),
  sortOrder: z.number().int().optional().default(0),
});

// ============ UPDATE VALIDATORS ============

export const updateOkucLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

// ============ REORDER VALIDATORS ============

export const reorderOkucLocationsSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

// ============ PARAMS VALIDATORS ============

export const okucLocationParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID musi być liczbą'),
});

// ============ TYPE EXPORTS ============

export type CreateOkucLocationInput = z.infer<typeof createOkucLocationSchema>;
export type UpdateOkucLocationInput = z.infer<typeof updateOkucLocationSchema>;
export type ReorderOkucLocationsInput = z.infer<typeof reorderOkucLocationsSchema>;
