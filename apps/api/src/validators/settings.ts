/**
 * Settings validators using Zod
 */

import { z } from 'zod';

// Setting validators
export const settingKeySchema = z.object({
  key: z.string().min(1, 'Setting key is required').max(100, 'Key too long'),
});

export const settingValueSchema = z.object({
  value: z.string().max(1000, 'Value too long'),
});

export const upsertOneSettingSchema = z.object({
  params: settingKeySchema,
  body: settingValueSchema,
});

export const upsertManySettingsSchema = z.object({
  body: z.record(z.string().max(100), z.string().max(1000)),
});

// Pallet Type validators
export const createPalletTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Pallet type name is required').max(100, 'Name too long'),
    lengthMm: z.number().int().positive('Length must be positive'),
    widthMm: z.number().int().positive('Width must be positive'),
    heightMm: z.number().int().positive('Height must be positive'),
    loadWidthMm: z.number().int().positive('Load width must be positive'),
  }),
});

export const updatePalletTypeSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Pallet type name is required').max(100, 'Name too long').optional(),
    lengthMm: z.number().int().positive('Length must be positive').optional(),
    widthMm: z.number().int().positive('Width must be positive').optional(),
    heightMm: z.number().int().positive('Height must be positive').optional(),
    loadWidthMm: z.number().int().positive('Load width must be positive').optional(),
  }),
});

export const palletTypeIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

// Packing Rule validators
export const createPackingRuleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Rule name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().optional(),
    ruleConfig: z.record(z.unknown()),
  }),
});

export const updatePackingRuleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
  body: z.object({
    name: z.string().min(1, 'Rule name is required').max(100, 'Name too long').optional(),
    description: z.string().max(500, 'Description too long').optional().nullable(),
    isActive: z.boolean().optional(),
    ruleConfig: z.record(z.unknown()).optional(),
  }),
});

export const packingRuleIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID'),
  }),
});

// Type exports for TypeScript
export type SettingKeyParams = z.infer<typeof settingKeySchema>;
export type SettingValueBody = z.infer<typeof settingValueSchema>;
export type CreatePalletTypeBody = z.infer<typeof createPalletTypeSchema>['body'];
export type UpdatePalletTypeBody = z.infer<typeof updatePalletTypeSchema>['body'];
export type CreatePackingRuleBody = z.infer<typeof createPackingRuleSchema>['body'];
export type UpdatePackingRuleBody = z.infer<typeof updatePackingRuleSchema>['body'];
