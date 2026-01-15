/**
 * Users API - Zarządzanie użytkownikami (admin only)
 */

import { fetchApi } from '@/lib/api-client';

/**
 * User type
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'kierownik' | 'ksiegowa' | 'user';
  createdAt: string;
  updatedAt: string;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'admin' | 'kierownik' | 'ksiegowa' | 'user';
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  role?: 'owner' | 'admin' | 'kierownik' | 'ksiegowa' | 'user';
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  return fetchApi<User[]>('/api/users');
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User> {
  return fetchApi<User>(`/api/users/${id}`);
}

/**
 * Create new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  return fetchApi<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update user
 */
export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  return fetchApi<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete user
 */
export async function deleteUser(id: number): Promise<void> {
  return fetchApi<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}
