/**
 * Role-based access control middleware
 *
 * Sprawdza czy użytkownik ma odpowiednią rolę do wykonania akcji
 */

import type { FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './auth';
import { UserRole } from '../validators/auth';
import { prisma } from '../utils/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

// Lokalne kopie funkcji z @markbud/shared (problem z ESM)
const ROLE_PERMISSIONS = {
  [UserRole.OWNER]: { canManageUsers: true, canAccessManagerPanel: true },
  [UserRole.ADMIN]: { canManageUsers: true, canAccessManagerPanel: true },
  [UserRole.KIEROWNIK]: { canManageUsers: false, canAccessManagerPanel: true },
  [UserRole.KSIEGOWA]: { canManageUsers: false, canAccessManagerPanel: false },
  [UserRole.USER]: { canManageUsers: false, canAccessManagerPanel: false },
} as const;

function canManageUsers(role: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.canManageUsers ?? false;
}

function canAccessManagerPanel(role: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.canAccessManagerPanel ?? false;
}

function hasPermission(role: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return (permissions as Record<string, boolean>)[permission] ?? false;
}

/**
 * Middleware: Sprawdza czy użytkownik może zarządzać użytkownikami
 * Tylko owner i admin
 * UWAGA: Rzuca wyjatki zamiast reply.send() dla spojnosci z error handling middleware
 */
export async function requireUserManagement(
  request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Brak autoryzacji. Zaloguj się ponownie.');
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    throw new UnauthorizedError('Użytkownik nie istnieje.');
  }

  if (!canManageUsers(user.role)) {
    throw new ForbiddenError('Brak uprawnień. Tylko właściciel i administrator mogą zarządzać użytkownikami.');
  }
}

/**
 * Middleware: Sprawdza czy użytkownik ma dostęp do panelu kierownika
 * Owner, admin, kierownik
 * UWAGA: Rzuca wyjatki zamiast reply.send() dla spojnosci z error handling middleware
 */
export async function requireManagerAccess(
  request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Brak autoryzacji. Zaloguj się ponownie.');
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    throw new UnauthorizedError('Użytkownik nie istnieje.');
  }

  if (!canAccessManagerPanel(user.role)) {
    throw new ForbiddenError('Brak uprawnień. Tylko właściciel, administrator i kierownik mają dostęp do tego panelu.');
  }
}

/**
 * Middleware: Sprawdza czy użytkownik jest administratorem
 * Tylko owner i admin
 * UWAGA: Rzuca wyjatki zamiast reply.send() dla spojnosci z error handling middleware
 */
export async function requireAdmin(
  request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    throw new UnauthorizedError('Brak autoryzacji. Zaloguj się ponownie.');
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    throw new UnauthorizedError('Użytkownik nie istnieje.');
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    throw new ForbiddenError('Dostęp tylko dla administratorów.');
  }
}

/**
 * Middleware generyczny: Sprawdza konkretne uprawnienie
 * UWAGA: Rzuca wyjatki zamiast reply.send() dla spojnosci z error handling middleware
 */
export function requirePermission(permission: string) {
  return async (request: AuthenticatedRequest, _reply: FastifyReply): Promise<void> => {
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Brak autoryzacji. Zaloguj się ponownie.');
    }

    // Konwertuj userId na number jeśli jest stringiem
    const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    const user = await prisma.user.findUnique({
      where: { id: userIdNumber },
      select: { role: true },
    });

    if (!user) {
      throw new UnauthorizedError('Użytkownik nie istnieje.');
    }

    if (!hasPermission(user.role, permission)) {
      throw new ForbiddenError(`Brak uprawnień. Ta akcja wymaga uprawnienia: ${permission}`);
    }
  };
}
