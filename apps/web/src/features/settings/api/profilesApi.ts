/**
 * Profiles API Service
 */

import { fetchApi } from '@/lib/api-client';
import type { Profile, ProfileWithColors, CreateProfileData, UpdateProfileData } from '@/types';

export const profilesApi = {
  /**
   * Pobierz wszystkie profile
   */
  getAll: () =>
    fetchApi<ProfileWithColors[]>('/api/profiles'),

  /**
   * Pobierz profil po ID
   */
  getById: (id: number) =>
    fetchApi<ProfileWithColors>(`/api/profiles/${id}`),

  /**
   * Utwórz nowy profil
   */
  create: (data: CreateProfileData) =>
    fetchApi<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Zaktualizuj profil
   */
  update: (id: number, data: UpdateProfileData) =>
    fetchApi<Profile>(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Usuń profil
   */
  delete: (id: number) =>
    fetchApi<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
};
