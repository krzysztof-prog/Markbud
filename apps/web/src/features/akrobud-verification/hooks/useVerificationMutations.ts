/**
 * Verification Mutations - All mutations for verification lists
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationApi } from '../api/verificationApi';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { VERIFICATION_LIST_KEYS } from './useVerificationLists';
import type {
  CreateVerificationListData,
  UpdateVerificationListData,
  AddItemsData,
  VerifyListParams,
  ApplyChangesParams,
  ProjectVerificationResult,
} from '@/types';

// ===================
// List CRUD Mutations
// ===================

/**
 * Hook do tworzenia nowej listy weryfikacyjnej
 */
export function useCreateVerificationList(callbacks?: {
  onSuccess?: (id: number) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVerificationListData) => verificationApi.create(data),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: VERIFICATION_LIST_KEYS.lists() });
      showSuccessToast(
        'Lista utworzona',
        'Możesz teraz dodać numery zleceń do weryfikacji'
      );
      callbacks?.onSuccess?.(data.id);
    },

    onError: (error) => {
      showErrorToast('Błąd tworzenia listy', getErrorMessage(error));
    },
  });
}

/**
 * Hook do aktualizacji listy weryfikacyjnej
 */
export function useUpdateVerificationList(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateVerificationListData;
    }) => verificationApi.update(id, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: VERIFICATION_LIST_KEYS.lists() });
      showSuccessToast('Lista zaktualizowana', 'Zmiany zostały zapisane');
      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      showErrorToast('Błąd aktualizacji', getErrorMessage(error));
    },
  });
}

/**
 * Hook do usuwania listy weryfikacyjnej
 */
export function useDeleteVerificationList(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => verificationApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VERIFICATION_LIST_KEYS.lists() });
      showSuccessToast('Lista usunięta', 'Lista została usunięta');
      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      showErrorToast('Błąd usuwania', getErrorMessage(error));
    },
  });
}

// ===================
// Items Mutations
// ===================

/**
 * Hook do dodawania elementów do listy
 */
export function useAddItemsToList(callbacks?: {
  onSuccess?: (result: { added: number; duplicates: number; errors: number }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: number; data: AddItemsData }) =>
      verificationApi.addItems(listId, data),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.listId),
      });

      const message =
        result.duplicates.length > 0 || result.errors.length > 0
          ? `Dodano ${result.added} zleceń. Duplikaty: ${result.duplicates.length}, Błędy: ${result.errors.length}`
          : `Dodano ${result.added} zleceń`;

      showSuccessToast('Elementy dodane', message);
      callbacks?.onSuccess?.({
        added: result.added,
        duplicates: result.duplicates.length,
        errors: result.errors.length,
      });
    },

    onError: (error) => {
      showErrorToast('Błąd dodawania', getErrorMessage(error));
    },
  });
}

/**
 * Hook do usuwania pojedynczego elementu z listy
 */
export function useDeleteItemFromList(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: number; itemId: number }) =>
      verificationApi.deleteItem(listId, itemId),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.listId),
      });
      showSuccessToast('Element usunięty', 'Element został usunięty z listy');
      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      showErrorToast('Błąd usuwania', getErrorMessage(error));
    },
  });
}

/**
 * Hook do czyszczenia wszystkich elementów z listy
 */
export function useClearListItems(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: number) => verificationApi.clearItems(listId),

    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(listId),
      });
      showSuccessToast('Lista wyczyszczona', 'Wszystkie elementy zostały usunięte');
      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      showErrorToast('Błąd czyszczenia', getErrorMessage(error));
    },
  });
}

// ===================
// Verification Mutations
// ===================

/**
 * Hook do weryfikacji listy
 */
export function useVerifyList(callbacks?: {
  onSuccess?: (needsDeliveryCreation: boolean) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      params,
    }: {
      listId: number;
      params?: VerifyListParams;
    }) => verificationApi.verify(listId, params),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.listId),
      });

      const { summary } = result;
      const message = `Zgodne: ${summary.matchedCount}, Brakujące: ${summary.missingCount}, Nadmiarowe: ${summary.excessCount}, Nieznane: ${summary.notFoundCount}`;

      if (result.needsDeliveryCreation) {
        showSuccessToast(
          'Weryfikacja zakończona',
          `${message}. Brak dostawy na ten dzień - zostanie utworzona automatycznie.`
        );
      } else {
        showSuccessToast('Weryfikacja zakończona', message);
      }

      callbacks?.onSuccess?.(result.needsDeliveryCreation);
    },

    onError: (error) => {
      showErrorToast('Błąd weryfikacji', getErrorMessage(error));
    },
  });
}

/**
 * Hook do aplikowania zmian (dodawanie/usuwanie zleceń z dostawy)
 */
export function useApplyChanges(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      params,
    }: {
      listId: number;
      params: ApplyChangesParams;
    }) => verificationApi.applyChanges(listId, params),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.listId),
      });
      // Invalidate deliveries cache too
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });

      const message = `Dodano: ${result.added.length}, Usunięto: ${result.removed.length}`;
      if (result.errors.length > 0) {
        showSuccessToast(
          'Zmiany zastosowane częściowo',
          `${message}. Błędów: ${result.errors.length}`
        );
      } else {
        showSuccessToast('Zmiany zastosowane', message);
      }

      callbacks?.onSuccess?.();
    },

    onError: (error) => {
      showErrorToast('Błąd aplikowania zmian', getErrorMessage(error));
    },
  });
}

/**
 * Hook do parsowania textarea (preview)
 */
export function useParseTextarea() {
  return useMutation({
    mutationFn: ({ listId, text }: { listId: number; text: string }) =>
      verificationApi.parseTextarea(listId, text),
  });
}

// ===================
// Project-based Mutations (NEW)
// ===================

/**
 * Hook do parsowania treści maila (wykrywa datę i projekty)
 */
export function useParseMailContent() {
  return useMutation({
    mutationFn: (rawInput: string) => verificationApi.parseMailContent(rawInput),
  });
}

/**
 * Hook do preview projektów (ile zleceń dla każdego)
 */
export function usePreviewProjects() {
  return useMutation({
    mutationFn: (projects: string[]) => verificationApi.previewProjects(projects),
  });
}

/**
 * Hook do tworzenia nowej wersji listy z projektami
 */
export function useCreateListVersion(callbacks?: {
  onSuccess?: (id: number) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      deliveryDate: string;
      rawInput?: string;
      projects: string[];
      parentId?: number;
      title?: string;
      notes?: string;
    }) => verificationApi.createListVersion(data),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: VERIFICATION_LIST_KEYS.lists() });
      showSuccessToast(
        'Wersja utworzona',
        `Utworzono wersję ${data.version} z ${data.items.length} projektami`
      );
      callbacks?.onSuccess?.(data.id);
    },

    onError: (error) => {
      showErrorToast('Błąd tworzenia wersji', getErrorMessage(error));
    },
  });
}

/**
 * Hook do porównywania wersji
 */
export function useCompareVersions() {
  return useMutation({
    mutationFn: ({ listId1, listId2 }: { listId1: number; listId2: number }) =>
      verificationApi.compareVersions(listId1, listId2),

    onError: (error) => {
      showErrorToast('Błąd porównywania', getErrorMessage(error));
    },
  });
}

/**
 * Hook do weryfikacji listy projektów
 */
export function useVerifyProjectList(callbacks?: {
  onSuccess?: (result: ProjectVerificationResult) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      params,
    }: {
      listId: number;
      params?: { createDeliveryIfMissing?: boolean };
    }) => verificationApi.verifyProjectList(listId, params),

    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: VERIFICATION_LIST_KEYS.list(variables.listId),
      });

      const { summary } = result;
      const message = `Zgodne: ${summary.allInDelivery}, Częściowe: ${summary.partialInDelivery}, Brakujące: ${summary.noneInDelivery}, Nieznalezione: ${summary.notFound}`;

      if (result.needsDeliveryCreation) {
        showSuccessToast(
          'Weryfikacja zakończona',
          `${message}. Brak dostawy na ten dzień - zostanie utworzona automatycznie.`
        );
      } else {
        showSuccessToast('Weryfikacja zakończona', message);
      }

      callbacks?.onSuccess?.(result);
    },

    onError: (error) => {
      showErrorToast('Błąd weryfikacji', getErrorMessage(error));
    },
  });
}
