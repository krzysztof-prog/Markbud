/**
 * Settings Mutations - All mutations for settings page
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, colorsApi, profilesApi } from '@/lib/api';
import type { UpdateColorData, UpdateProfileData, PalletType } from '@/types';
import { getAuthToken } from '@/lib/auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Hook for updating settings
 */
export function useUpdateSettings(callbacks?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      callbacks?.onSuccess?.();
    },
  });
}

/**
 * Hook for pallet type mutations
 */
export function usePalletTypeMutations(callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: settingsApi.createPalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      callbacks?.onCreateSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PalletType> }) =>
      settingsApi.updatePalletType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      callbacks?.onUpdateSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deletePalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      callbacks?.onDeleteSuccess?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}

/**
 * Hook for color mutations
 */
export function useColorMutations(callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: colorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      callbacks?.onCreateSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateColorData }) =>
      colorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      callbacks?.onUpdateSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: colorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      callbacks?.onDeleteSuccess?.();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}

/**
 * Hook for profile mutations
 */
export function useProfileMutations(callbacks?: {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      callbacks?.onCreateSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProfileData }) =>
      profilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      callbacks?.onUpdateSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: profilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      callbacks?.onDeleteSuccess?.();
    },
    onError: (error: Error) => {
      callbacks?.onDeleteError?.(error);
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}

/**
 * Hook for file watcher control
 */
export function useFileWatcher(callbacks?: { onRestartSuccess?: () => void }) {
  const restartMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/settings/file-watcher/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Błąd restartu file watchera');
      return res.json();
    },
    onSuccess: () => {
      callbacks?.onRestartSuccess?.();
    },
  });

  return { restartMutation };
}

/**
 * Hook for user folder path mutations
 */
export function useUserFolderPath(callbacks?: { onUpdateSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateUserFolderPath,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-folder-path'] });
      callbacks?.onUpdateSuccess?.();
    },
  });

  return { updateMutation };
}
