/**
 * Profile Depth validation schemas
 */

import { z } from 'zod';

// ==================== PROFILE DEPTHS ====================

export const profileDepthSchema = z.object({
  profileType: z.string().min(1, 'Profile type is required').max(50, 'Profile type too long'),
  depthMm: z.number().int().positive('Depth must be positive'),
  description: z.string().max(255, 'Description too long').optional(),
});

export const updateProfileDepthSchema = profileDepthSchema.partial();

export const profileDepthParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid profile depth ID'),
});

// ==================== TYPES ====================

export type ProfileDepthInput = z.infer<typeof profileDepthSchema>;
export type UpdateProfileDepthInput = z.infer<typeof updateProfileDepthSchema>;
export type ProfileDepthParams = z.infer<typeof profileDepthParamsSchema>;
