/**
 * Role-based access control middleware
 *
 * Sprawdza czy użytkownik ma odpowiednią rolę do wykonania akcji
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './auth';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '../validators/auth';

const prisma = new PrismaClient();

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
 */
export async function requireUserManagement(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({ error: 'Brak autoryzacji. Zaloguj się ponownie.' });
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    return reply.status(401).send({ error: 'Użytkownik nie istnieje.' });
  }

  if (!canManageUsers(user.role)) {
    return reply.status(403).send({
      error: 'Brak uprawnień. Tylko właściciel i administrator mogą zarządzać użytkownikami.',
    });
  }
}

/**
 * Middleware: Sprawdza czy użytkownik ma dostęp do panelu kierownika
 * Owner, admin, kierownik
 */
export async function requireManagerAccess(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({ error: 'Brak autoryzacji. Zaloguj się ponownie.' });
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    return reply.status(401).send({ error: 'Użytkownik nie istnieje.' });
  }

  if (!canAccessManagerPanel(user.role)) {
    return reply.status(403).send({
      error: 'Brak uprawnień. Tylko właściciel, administrator i kierownik mają dostęp do tego panelu.',
    });
  }
}

/**
 * Middleware: Sprawdza czy użytkownik jest administratorem
 * Tylko owner i admin
 */
export async function requireAdmin(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.userId;

  if (!userId) {
    return reply.status(401).send({ error: 'Brak autoryzacji. Zaloguj się ponownie.' });
  }

  // Konwertuj userId na number jeśli jest stringiem
  const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { role: true },
  });

  if (!user) {
    return reply.status(401).send({ error: 'Użytkownik nie istnieje.' });
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
    return reply.status(403).send({
      error: 'Dostęp tylko dla administratorów.',
    });
  }
}

/**
 * Middleware generyczny: Sprawdza konkretne uprawnienie
 */
export function requirePermission(permission: string) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Brak autoryzacji. Zaloguj się ponownie.' });
    }

    // Konwertuj userId na number jeśli jest stringiem
    const userIdNumber = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    const user = await prisma.user.findUnique({
      where: { id: userIdNumber },
      select: { role: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Użytkownik nie istnieje.' });
    }

    if (!hasPermission(user.role, permission)) {
      return reply.status(403).send({
        error: `Brak uprawnień. Ta akcja wymaga uprawnienia: ${permission}`,
      });
    }
  };
}
