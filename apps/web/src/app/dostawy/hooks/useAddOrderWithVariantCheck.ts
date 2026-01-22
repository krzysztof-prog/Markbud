'use client';

import { useState, useCallback } from 'react';
import { ordersApi } from '@/lib/api';
import type { ApiError } from '@/lib/api-client';
import type { VariantType } from '@/components/ui/variant-type-selection-dialog';

/**
 * P1-3: Hook do dodawania zlecenia do dostawy z obsługą dialogu wyboru typu wariantu
 *
 * Rozszerza standardową mutację addOrderToDelivery o:
 * - Wykrywanie błędu VARIANT_TYPE_REQUIRED z backendu
 * - Pokazywanie dialogu wyboru typu wariantu
 * - Automatyczne ponowienie operacji po wyborze typu
 */

interface VariantDialogState {
  open: boolean;
  orderNumber: string;
  orderId: number;
  /** Numer zlecenia bazowego (może być null dla VARIANT_TYPE_REQUIRED_FOR_SUFFIX) */
  conflictingOrderNumber: string | null;
  /** Oryginalna dostawa (może być null dla VARIANT_TYPE_REQUIRED_FOR_SUFFIX) */
  originalDelivery: {
    deliveryId: number;
    deliveryNumber: string;
  } | null;
  targetDeliveryId: number;
  /** Typ błędu - określa wariant dialogu */
  errorCode: 'VARIANT_TYPE_REQUIRED' | 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX';
}

export function useAddOrderWithVariantCheck(
  addOrderMutation: (params: { deliveryId: number; orderId: number }) => Promise<unknown>
) {
  const [dialogState, setDialogState] = useState<VariantDialogState | null>(null);
  const [isSettingVariantType, setIsSettingVariantType] = useState(false);

  /**
   * Parsuje błąd API i sprawdza czy wymaga wyboru typu wariantu
   * Obsługuje dwa kody błędów:
   * - VARIANT_TYPE_REQUIRED - wariant już przypisany gdzieś, trzeba wybrać typ
   * - VARIANT_TYPE_REQUIRED_FOR_SUFFIX - zlecenie ma sufix ale nie ma typu
   */
  const isVariantTypeRequired = useCallback((error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const apiError = error as ApiError;

    // Check: status 400 + data.code === 'VARIANT_TYPE_REQUIRED' lub 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX'
    return (
      apiError.status === 400 &&
      (apiError.data?.code === 'VARIANT_TYPE_REQUIRED' ||
       apiError.data?.code === 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX')
    );
  }, []);

  /**
   * Wyodrębnia metadata z błędu VARIANT_TYPE_REQUIRED lub VARIANT_TYPE_REQUIRED_FOR_SUFFIX
   */
  const extractVariantMetadata = useCallback((error: ApiError, orderId: number, deliveryId: number) => {
    const data = error.data || {};
    const errorCode = data.code as 'VARIANT_TYPE_REQUIRED' | 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX';

    // Dla VARIANT_TYPE_REQUIRED_FOR_SUFFIX backend nie zwraca metadata
    // (zlecenie ma sufix ale nie jest jeszcze nigdzie przypisane)
    if (errorCode === 'VARIANT_TYPE_REQUIRED_FOR_SUFFIX') {
      return {
        conflictingOrderNumber: null,
        originalDelivery: null,
        targetDeliveryId: deliveryId,
        orderId,
        errorCode,
      };
    }

    // Dla VARIANT_TYPE_REQUIRED backend zwraca:
    // {
    //   error: "message",
    //   code: "VARIANT_TYPE_REQUIRED",
    //   metadata: {
    //     conflictingOrder: { orderNumber: "53335" },
    //     originalDelivery: { deliveryId: 1, deliveryNumber: "D001" }
    //   }
    // }
    const metadata = data.metadata as Record<string, unknown> | undefined;
    const conflictingOrder = metadata?.conflictingOrder as { orderNumber?: string } | undefined;
    const originalDelivery = metadata?.originalDelivery as { deliveryId?: number; deliveryNumber?: string } | undefined;

    return {
      conflictingOrderNumber: conflictingOrder?.orderNumber || null,
      originalDelivery: originalDelivery?.deliveryId && originalDelivery?.deliveryNumber
        ? {
            deliveryId: originalDelivery.deliveryId,
            deliveryNumber: originalDelivery.deliveryNumber,
          }
        : null,
      targetDeliveryId: deliveryId,
      orderId,
      errorCode,
    };
  }, []);

  /**
   * Główna funkcja dodawania zlecenia z obsługą dialogu wariantów
   */
  const addOrderWithVariantCheck = useCallback(
    async (deliveryId: number, orderId: number, orderNumber: string) => {
      try {
        // Próbuj dodać zlecenie
        await addOrderMutation({ deliveryId, orderId });
      } catch (error) {
        // Sprawdź czy to błąd wymagający wyboru typu wariantu
        if (isVariantTypeRequired(error)) {
          const apiError = error as ApiError;
          const metadata = extractVariantMetadata(apiError, orderId, deliveryId);

          // Pokaż dialog wyboru typu wariantu
          setDialogState({
            open: true,
            orderNumber,
            orderId,
            conflictingOrderNumber: metadata.conflictingOrderNumber,
            originalDelivery: metadata.originalDelivery,
            targetDeliveryId: metadata.targetDeliveryId,
            errorCode: metadata.errorCode,
          });

          // Nie throw - dialog przejmuje kontrolę
          return;
        }

        // Inny błąd - przepuść dalej
        throw error;
      }
    },
    [addOrderMutation, isVariantTypeRequired, extractVariantMetadata]
  );

  /**
   * Callback gdy użytkownik wybierze typ wariantu w dialogu
   */
  const handleVariantTypeConfirm = useCallback(
    async (variantType: VariantType) => {
      if (!dialogState) return;

      setIsSettingVariantType(true);

      try {
        // 1. Ustaw variant type na zleceniu
        await ordersApi.setVariantType(dialogState.orderId, variantType);

        // 2. Spróbuj ponownie dodać zlecenie do dostawy
        await addOrderMutation({
          deliveryId: dialogState.targetDeliveryId,
          orderId: dialogState.orderId,
        });

        // 3. Sukces - zamknij dialog
        setDialogState(null);
      } catch (error) {
        // Błąd podczas ustawiania typu lub dodawania - propaguj dalej
        setIsSettingVariantType(false);
        throw error;
      } finally {
        setIsSettingVariantType(false);
      }
    },
    [dialogState, addOrderMutation]
  );

  /**
   * Zamknij dialog
   */
  const closeDialog = useCallback(() => {
    setDialogState(null);
  }, []);

  return {
    addOrderWithVariantCheck,
    variantDialog: {
      state: dialogState,
      isLoading: isSettingVariantType,
      onConfirm: handleVariantTypeConfirm,
      onClose: closeDialog,
    },
  };
}
