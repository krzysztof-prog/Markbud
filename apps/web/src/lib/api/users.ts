/**
 * Users API module
 */

import { fetchApi } from '../api-client';

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

// Users API
export const usersApi = {
  getAll: () => fetchApi<User[]>('/api/users'),
  getById: (id: number) => fetchApi<User>(`/api/users/${id}`),
  create: (data: CreateUserData) =>
    fetchApi<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateUserData) =>
    fetchApi<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchApi<void>(`/api/users/${id}`, { method: 'DELETE' }),
};
