/**
 * Color validation schemas
 */

import { z } from 'zod';

export const createColorSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(50),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const updateColorSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['powder', 'ral', 'anodized']).optional(),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const colorParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid color ID'),
});

export type CreateColorInput = z.infer<typeof createColorSchema>;
export type UpdateColorInput = z.infer<typeof updateColorSchema>;
export type ColorParams = z.infer<typeof colorParamsSchema>;
