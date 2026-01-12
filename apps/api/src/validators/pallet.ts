/**
 * Pallet validation schemas
 */

import { z } from 'zod';

// ==================== OPTYMALIZACJA ====================

export const optimizeDeliveryParamsSchema = z.object({
  deliveryId: z.string().regex(/^\d+$/, 'Invalid delivery ID'),
});

export const optimizeDeliverySchema = z.object({
  deliveryId: z.number().int().positive('Delivery ID must be positive'),
});

// ==================== OPCJE OPTYMALIZACJI ====================

export const optimizationOptionsSchema = z.object({
  // Sortowanie
  sortByHeightWhenWidthSimilar: z.boolean().default(true),
  widthSimilarityThreshold: z.number().min(0.05).max(0.5).default(0.15),

  // Palety
  preferStandardPallets: z.boolean().default(true),
  minimizeOverhang: z.boolean().default(true),
  maxOverhangMm: z.number().int().min(0).max(1500).default(700),
  maximizeUtilization: z.boolean().default(true), // Preferuj jak najmniej wolnego miejsca na paletach

  // Układanie
  allowSideBySide: z.boolean().default(true),
  sideBySideMaxGap: z.number().int().min(0).max(500).default(100),
}).partial();

export const optimizeDeliveryBodySchema = z.object({
  options: optimizationOptionsSchema.optional(),
});

// ==================== TYPY PALET ====================

export const palletTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  lengthMm: z.number().int().positive('Length must be positive'),
  widthMm: z.number().int().positive('Width must be positive'),
  heightMm: z.number().int().positive('Height must be positive'),
  loadWidthMm: z.number().int().nonnegative('Load width must be non-negative').optional(),
  loadDepthMm: z.number().int().positive('Load depth must be positive').optional(),
});

export const updatePalletTypeSchema = palletTypeSchema.partial();

export const palletTypeParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid pallet type ID'),
});

// ==================== REGUŁY PAKOWANIA ====================

export const packingRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isActive: z.boolean().default(true),
  ruleConfig: z.string().min(1, 'Rule config is required'), // JSON string
});

export const updatePackingRuleSchema = packingRuleSchema.partial();

export const packingRuleParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid packing rule ID'),
});

// ==================== TYPES ====================

export type OptimizeDeliveryParams = z.infer<typeof optimizeDeliveryParamsSchema>;
export type OptimizeDeliveryInput = z.infer<typeof optimizeDeliverySchema>;
export type OptimizationOptionsInput = z.infer<typeof optimizationOptionsSchema>;
export type OptimizeDeliveryBody = z.infer<typeof optimizeDeliveryBodySchema>;
export type PalletTypeInput = z.infer<typeof palletTypeSchema>;
export type UpdatePalletTypeInput = z.infer<typeof updatePalletTypeSchema>;
export type PalletTypeParams = z.infer<typeof palletTypeParamsSchema>;
export type PackingRuleInput = z.infer<typeof packingRuleSchema>;
export type UpdatePackingRuleInput = z.infer<typeof updatePackingRuleSchema>;
export type PackingRuleParams = z.infer<typeof packingRuleParamsSchema>;
