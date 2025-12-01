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

// ==================== TYPY PALET ====================

export const palletTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  lengthMm: z.number().int().positive('Length must be positive'),
  widthMm: z.number().int().positive('Width must be positive'),
  heightMm: z.number().int().positive('Height must be positive'),
  loadWidthMm: z.number().int().positive('Load width must be positive'),
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
export type PalletTypeInput = z.infer<typeof palletTypeSchema>;
export type UpdatePalletTypeInput = z.infer<typeof updatePalletTypeSchema>;
export type PalletTypeParams = z.infer<typeof palletTypeParamsSchema>;
export type PackingRuleInput = z.infer<typeof packingRuleSchema>;
export type UpdatePackingRuleInput = z.infer<typeof updatePackingRuleSchema>;
export type PackingRuleParams = z.infer<typeof packingRuleParamsSchema>;
