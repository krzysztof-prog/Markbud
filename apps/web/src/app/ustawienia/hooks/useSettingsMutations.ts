/**
 * Settings Mutations - All mutations for settings page
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, colorsApi, profilesApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PalletType {
  id?: number;
  name: string;
  lengthMm: number;
  loadDepthMm: number;
}

interface Color {
  id?: number;
  code: string;
  name: string;
  type: 'typical' | 'atypical';
  hexColor?: string;
}

interface Profile {
  id?: number;
  number: string;
  name: string;
  description?: string | null;
}

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
    mutationFn: ({ id, data }: { id: number; data: Partial<Color> }) =>
      colorsApi.update(id, data as any),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<Profile> }) =>
      profilesApi.update(id, data as any),
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
      const res = await fetch(`${API_URL}/api/settings/file-watcher/restart`, {
        method: 'POST',
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
