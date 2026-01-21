/**
 * Hooki React Query dla kolorów prywatnych
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  getPrivateColors,
  updatePrivateColor,
  deletePrivateColor,
  type UpdatePrivateColorData,
} from '../api/privateColorsApi';

const QUERY_KEY = ['private-colors'];

/**
 * Hook do pobierania listy kolorów prywatnych
 */
export function usePrivateColors() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPrivateColors,
  });
}

/**
 * Hook do aktualizacji nazwy koloru prywatnego
 */
export function useUpdatePrivateColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePrivateColorData }) =>
      updatePrivateColor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Kolor zaktualizowany', 'Nazwa koloru została zmieniona');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd aktualizacji', getErrorMessage(error));
    },
  });
}

/**
 * Hook do usuwania koloru prywatnego
 */
export function useDeletePrivateColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePrivateColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Kolor usunięty', 'Kolor prywatny został usunięty z systemu');
    },
    onError: (error: Error) => {
      showErrorToast('Błąd usuwania', getErrorMessage(error));
    },
  });
}
