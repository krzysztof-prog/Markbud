/**
 * Profile Pallet Config validation schemas
 * Przelicznik: ile beli profilu mieści się w jednej palecie Schuco
 */

import { z } from 'zod';

// ==================== PROFILE PALLET CONFIGS ====================

export const profilePalletConfigSchema = z.object({
  profileId: z.number().int().positive('Profile ID is required'),
  beamsPerPallet: z.number().int().positive('Beams per pallet must be positive'),
});

export const updateProfilePalletConfigSchema = z.object({
  beamsPerPallet: z.number().int().positive('Beams per pallet must be positive'),
});

export const profilePalletConfigParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid profile pallet config ID'),
});

// ==================== TYPES ====================

export type ProfilePalletConfigInput = z.infer<typeof profilePalletConfigSchema>;
export type UpdateProfilePalletConfigInput = z.infer<typeof updateProfilePalletConfigSchema>;
export type ProfilePalletConfigParams = z.infer<typeof profilePalletConfigParamsSchema>;
