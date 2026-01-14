/**
 * User Handler - Obsługa requestów zarządzania użytkownikami
 *
 * CRUD dla użytkowników (tylko dla admin/owner)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import * as userService from '../services/userService';
import { createUserSchema, updateUserSchema } from '../validators/auth';

// Typ dla request z parametrem id
interface RequestWithIdParams {
  Params: { id: string };
}

// Typ dla authenticated request (user dodany przez middleware)
interface AuthenticatedUser {
  userId: string | number;
  email?: string;
}

/**
 * GET /api/users - Pobierz wszystkich użytkowników
 */
export async function listUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const users = await userService.getAllUsers();
    return reply.status(200).send(users);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message || 'Błąd pobierania użytkowników' });
  }
}

/**
 * GET /api/users/:id - Pobierz użytkownika po ID
 */
export async function getUserHandler(
  request: FastifyRequest<RequestWithIdParams>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = parseInt(request.params.id, 10);

    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID użytkownika' });
    }

    const user = await userService.getUserById(userId);

    if (!user) {
      return reply.status(404).send({ error: 'Użytkownik nie znaleziony' });
    }

    return reply.status(200).send(user);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message || 'Błąd pobierania użytkownika' });
  }
}

/**
 * POST /api/users - Stwórz nowego użytkownika
 */
export async function createUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const input = createUserSchema.parse(request.body);
    const user = await userService.createUser(input);
    return reply.status(201).send(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.status(400).send({ error: 'Nieprawidłowe dane wejściowe', details: error.errors });
    }
    return reply.status(400).send({ error: error.message || 'Błąd tworzenia użytkownika' });
  }
}

/**
 * PUT /api/users/:id - Zaktualizuj użytkownika
 */
export async function updateUserHandler(
  request: FastifyRequest<RequestWithIdParams>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = parseInt(request.params.id, 10);

    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID użytkownika' });
    }

    const input = updateUserSchema.parse(request.body);
    const user = await userService.updateUser(userId, input);
    return reply.status(200).send(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.status(400).send({ error: 'Nieprawidłowe dane wejściowe', details: error.errors });
    }
    return reply.status(400).send({ error: error.message || 'Błąd aktualizacji użytkownika' });
  }
}

/**
 * DELETE /api/users/:id - Usuń użytkownika (soft delete)
 */
export async function deleteUserHandler(
  request: FastifyRequest<RequestWithIdParams>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = parseInt(request.params.id, 10);

    if (isNaN(userId)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID użytkownika' });
    }

    // Pobierz ID aktualnie zalogowanego użytkownika z dekoratora request.user
    // (dodany przez middleware withAuth)
    const requestUser = (request as any).user as AuthenticatedUser | undefined;
    const currentUserId = requestUser?.userId
      ? typeof requestUser.userId === 'number'
        ? requestUser.userId
        : parseInt(requestUser.userId, 10)
      : undefined;

    await userService.deleteUser(userId, currentUserId);
    return reply.status(204).send();
  } catch (error: any) {
    return reply.status(400).send({ error: error.message || 'Błąd usuwania użytkownika' });
  }
}
