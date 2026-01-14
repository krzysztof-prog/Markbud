/**
 * Authentication service
 * Logika biznesowa związana z uwierzytelnianiem użytkowników
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { encodeToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import type { LoginInput, LoginResponse } from '../validators/auth.js';

const prisma = new PrismaClient();

/**
 * Logowanie użytkownika
 * Weryfikuje email i hasło, zwraca JWT token
 */
export async function login(input: LoginInput): Promise<LoginResponse | null> {
  try {
    // Znajdź użytkownika po email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
      },
    });

    // Użytkownik nie istnieje
    if (!user) {
      logger.warn('Login attempt with non-existent email', { email: input.email });
      return null;
    }

    // Weryfikuj hasło
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', { email: input.email });
      return null;
    }

    // Generuj JWT token (30 dni)
    const token = encodeToken({
      userId: user.id,
      email: user.email,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as LoginResponse['user']['role'],
      },
    };
  } catch (error) {
    logger.error('Login error', { error });
    throw error;
  }
}

/**
 * Pobierz informacje o aktualnym użytkowniku po userId
 */
export async function getCurrentUser(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      logger.warn('User not found', { userId });
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Error fetching current user', { error, userId });
    throw error;
  }
}

/**
 * Pomocnicza funkcja do hashowania hasła
 * Używana przy tworzeniu nowych użytkowników i seed
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}
