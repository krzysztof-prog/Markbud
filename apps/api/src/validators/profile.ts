/**
 * Profile validation schemas
 */

import { z } from 'zod';

export const createProfileSchema = z.object({
  number: z.string().min(1, 'Profile number is required').max(50),
  name: z.string().min(1, 'Profile name is required').max(255),
  description: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255).optional(),
  description: z.string().optional(),
});

export const profileParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid profile ID'),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileParams = z.infer<typeof profileParamsSchema>;
