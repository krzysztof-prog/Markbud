/**
 * Authentication validators (Zod schemas)
 */

import { z } from 'zod';

// Lokalna kopia UserRole (zamiast @markbud/shared - problem z ESM)
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  KIEROWNIK = 'kierownik',
  KSIEGOWA = 'ksiegowa',
  USER = 'user',
}

/**
 * User role schema
 */
export const userRoleSchema = z.enum([
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.KIEROWNIK,
  UserRole.KSIEGOWA,
  UserRole.USER,
]);

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Login response schema
 */
export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    role: userRoleSchema,
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Me response schema (current user info)
 */
export const meResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * Create user schema (admin only)
 */
export const createUserSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(3, 'Hasło musi mieć minimum 3 znaki'),
  name: z.string().min(1, 'Imię jest wymagane'),
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Update user schema (admin only)
 */
export const updateUserSchema = z.object({
  email: z.string().email('Nieprawidłowy format email').optional(),
  password: z.string().min(3, 'Hasło musi mieć minimum 3 znaki').optional(),
  name: z.string().min(1, 'Imię jest wymagane').optional(),
  role: userRoleSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
