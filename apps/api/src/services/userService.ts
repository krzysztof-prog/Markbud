/**
 * User Service - Zarządzanie użytkownikami
 *
 * Business logic dla operacji CRUD na użytkownikach
 *
 * WAŻNE:
 * - Soft delete (deletedAt) zamiast hard delete
 * - Walidacja przeciw usuwaniu samego siebie
 * - Walidacja minimalnej liczby adminów
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { CreateUserInput, UpdateUserInput } from '../validators/auth';

const prisma = new PrismaClient();

/**
 * Pobierz wszystkich aktywnych użytkowników (bez hashy haseł, bez usuniętych)
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    where: {
      deletedAt: null, // Tylko aktywni użytkownicy (nie usunięci soft delete)
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Pobierz użytkownika po ID (bez hashy hasła)
 * Zwraca null dla usuniętych użytkowników
 */
export async function getUserById(id: number) {
  return prisma.user.findFirst({
    where: {
      id,
      deletedAt: null, // Nie zwracaj usuniętych użytkowników
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Stwórz nowego użytkownika
 */
export async function createUser(input: CreateUserInput) {
  // Sprawdź czy email już istnieje (wśród aktywnych użytkowników)
  const existingUser = await prisma.user.findFirst({
    where: {
      email: input.email,
      deletedAt: null,
    },
  });

  if (existingUser) {
    throw new Error('Użytkownik z tym emailem już istnieje');
  }

  // Hashuj hasło
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Stwórz użytkownika
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Zaktualizuj użytkownika
 */
export async function updateUser(id: number, input: UpdateUserInput) {
  // Sprawdź czy użytkownik istnieje (i nie jest usunięty)
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingUser) {
    throw new Error('Użytkownik nie istnieje');
  }

  // Jeśli zmienia się email, sprawdź czy nowy email nie jest zajęty
  if (input.email && input.email !== existingUser.email) {
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
        NOT: { id }, // Ignoruj obecnego użytkownika
      },
    });

    if (emailTaken) {
      throw new Error('Email jest już zajęty');
    }
  }

  // Przygotuj dane do update (proper TypeScript type zamiast any)
  const updateData: Prisma.UserUpdateInput = {};

  if (input.email) updateData.email = input.email;
  if (input.name) updateData.name = input.name;
  if (input.role) updateData.role = input.role;
  if (input.password) {
    updateData.passwordHash = await bcrypt.hash(input.password, 10);
  }

  // Zaktualizuj użytkownika
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Usuń użytkownika (SOFT DELETE)
 *
 * @param id - ID użytkownika do usunięcia
 * @param currentUserId - ID użytkownika wykonującego operację (aby nie usunął siebie)
 */
export async function deleteUser(id: number, currentUserId?: number) {
  // Sprawdź czy użytkownik istnieje (i nie jest już usunięty)
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existingUser) {
    throw new Error('Użytkownik nie istnieje');
  }

  // Zabezpieczenie: nie pozwól usunąć samego siebie
  if (currentUserId && id === currentUserId) {
    throw new Error('Nie możesz usunąć samego siebie');
  }

  // Sprawdź czy po usunięciu zostanie przynajmniej jeden owner/admin
  if (existingUser.role === 'owner' || existingUser.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: {
        role: { in: ['owner', 'admin'] },
        deletedAt: null,
        NOT: { id }, // Nie licz użytkownika który ma być usunięty
      },
    });

    if (adminCount === 0) {
      throw new Error('Nie można usunąć ostatniego administratora/właściciela systemu');
    }
  }

  // SOFT DELETE - ustaw deletedAt zamiast fizycznego usunięcia
  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * Przywróć usuniętego użytkownika (opcjonalne - do użytku w przyszłości)
 */
export async function restoreUser(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('Użytkownik nie istnieje');
  }

  if (!user.deletedAt) {
    throw new Error('Użytkownik nie jest usunięty');
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  });

  return { success: true };
}
