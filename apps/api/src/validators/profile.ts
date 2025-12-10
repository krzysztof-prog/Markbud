/**
 * Profile validation schemas
 */

import { z } from 'zod';
import { idParamsSchema } from './common.js';

export const createProfileSchema = z.object({
  number: z.string().min(1, 'Profile number is required').max(50),
  name: z.string().min(1, 'Profile name is required').max(255),
  description: z.string().optional().nullable(),
  articleNumber: z.string().max(100).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255).optional(),
  description: z.string().optional().nullable(),
  articleNumber: z.string().max(100).optional().nullable(),
});

export const profileParamsSchema = idParamsSchema('profile');

export const updateProfileOrderSchema = z.object({
  profileOrders: z.array(
    z.object({
      id: z.number(),
      sortOrder: z.number(),
    })
  ),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileParams = z.infer<typeof profileParamsSchema>;
export type UpdateProfileOrderInput = z.infer<typeof updateProfileOrderSchema>;
