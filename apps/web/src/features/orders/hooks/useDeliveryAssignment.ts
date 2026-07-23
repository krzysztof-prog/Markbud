/**
 * Hook do przypisywania zlecenia do dostawy z poziomu tabeli zleceń
 * Obsługuje: wybór daty z kalendarza, pobranie dostaw na datę, przypisanie/przeniesienie/utworzenie dostawy
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';
import type { DeliveryForDate } from '@/features/deliveries/api/deliveriesApi';
import { toast } from '@/hooks/useToast';
import { formatDateWarsaw } from '@/lib/date-utils';

// ================================
// Typy
// ================================

interface DeliveryAssignmentState {
  /** ID zlecenia do przypisania */
  orderId: number;
  /** Numer zlecenia (do wyświetlenia) */
  orderNumber: string;
  /** ID obecnej dostawy (jeśli zlecenie jest już przypisane) */
  currentDeliveryId: number | null;
  /** Wybrana data z kalendarza */
  selectedDate: Date | undefined;
}

export interface UseDeliveryAssignmentReturn {
  /** Stan popovera - które zlecenie jest otwarte */
  assignmentState: DeliveryAssignmentState | null;
  /** Czy popover jest otwarty */
  isOpen: boolean;
  /** Otwórz popover dla zlecenia */
  openAssignment: (orderId: number, orderNumber: string, currentDeliveryId: number | null, currentDate?: string | null) => void;
  /** Zamknij popover */
  closeAssignment: () => void;
  /** Wybrana data z kalendarza */
  selectedDate: Date | undefined;
  /** Zmień wybraną datę */
  setSelectedDate: (date: Date | undefined) => void;
  /** Dostawy na wybraną datę */
  deliveriesForDate: DeliveryForDate[];
  /** Czy ładowanie dostaw */
  isLoadingDeliveries: boolean;
  /** Przypisz do istniejącej dostawy */
  assignToDelivery: (deliveryId: number) => void;
  /** Utwórz nową dostawę i przypisz */
  createAndAssign: () => void;
  /** Ustaw tylko deadline (bez przypisania do dostawy) */
  setDeadlineOnly: () => void;
  /** Czy mutacja w toku */
  isPending: boolean;
}

// ================================
// Hook
// ================================

export function useDeliveryAssignment(): UseDeliveryAssignmentReturn {
  const [assignmentState, setAssignmentState] = useState<DeliveryAssignmentState | null>(null);
  const queryClient = useQueryClient();

  const isOpen = assignmentState !== null;
  const selectedDate = assignmentState?.selectedDate;

  // Formatuj datę do YYYY-MM-DD dla API
  const selectedDateStr = selectedDate ? formatDateWarsaw(selectedDate) : null;

  // Pobierz dostawy na wybraną datę
  const { data: deliveriesForDate = [], isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['deliveries-for-date', selectedDateStr],
    queryFn: () => deliveriesApi.getDeliveriesForDate(selectedDateStr!),
    enabled: !!selectedDateStr,
  });

  // Mutacja: bulk-assign (obsługuje przypisanie, przeniesienie, utworzenie nowej dostawy)
  const bulkAssignMutation = useMutation({
    mutationFn: deliveriesApi.bulkAssignOrders,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-for-date'] });

      const deliveryLabel = result.delivery.deliveryNumber || selectedDateStr;
      toast({
        title: 'Zlecenie przypisane',
        description: `Zlecenie ${assignmentState?.orderNumber} przypisane do dostawy ${deliveryLabel}`,
      });
      setAssignmentState(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przypisania',
        description: error.message || 'Nie udało się przypisać zlecenia do dostawy',
        variant: 'destructive',
      });
    },
  });

  // Mutacja: add order to delivery (proste dodanie bez reassign)
  const addOrderMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.addOrder(deliveryId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-for-date'] });

      toast({
        title: 'Zlecenie przypisane',
        description: `Zlecenie ${assignmentState?.orderNumber} przypisane do dostawy`,
      });
      setAssignmentState(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przypisania',
        description: error.message || 'Nie udało się przypisać zlecenia do dostawy',
        variant: 'destructive',
      });
    },
  });

  // Mutacja: move order between deliveries
  const moveOrderMutation = useMutation({
    mutationFn: ({ sourceDeliveryId, orderId, targetDeliveryId }: { sourceDeliveryId: number; orderId: number; targetDeliveryId: number }) =>
      deliveriesApi.moveOrder(sourceDeliveryId, orderId, targetDeliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-for-date'] });

      toast({
        title: 'Zlecenie przeniesione',
        description: `Zlecenie ${assignmentState?.orderNumber} przeniesione do nowej dostawy`,
      });
      setAssignmentState(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd przeniesienia',
        description: error.message || 'Nie udało się przenieść zlecenia',
        variant: 'destructive',
      });
    },
  });

  // Mutacja: ustaw deadline bez przypisania do dostawy
  const setDeadlineMutation = useMutation({
    mutationFn: ({ orderId, deadline }: { orderId: number; deadline: string }) => {
      // Import dynamiczny aby uniknąć circular dependency
      return import('@/lib/api').then(({ ordersApi }) =>
        ordersApi.patch(orderId, { deadline })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast({
        title: 'Termin zaktualizowany',
        description: `Termin realizacji zlecenia ${assignmentState?.orderNumber} został zmieniony`,
      });
      setAssignmentState(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zmienić terminu',
        variant: 'destructive',
      });
    },
  });

  // ================================
  // Akcje
  // ================================

  const openAssignment = useCallback((
    orderId: number,
    orderNumber: string,
    currentDeliveryId: number | null,
    currentDate?: string | null,
  ) => {
    let initialDate: Date | undefined;
    if (currentDate) {
      const parsed = new Date(currentDate);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setAssignmentState({
      orderId,
      orderNumber,
      currentDeliveryId,
      selectedDate: initialDate,
    });
  }, []);

  const closeAssignment = useCallback(() => {
    setAssignmentState(null);
  }, []);

  const setSelectedDate = useCallback((date: Date | undefined) => {
    setAssignmentState(prev => prev ? { ...prev, selectedDate: date } : null);
  }, []);

  const assignToDelivery = useCallback((targetDeliveryId: number) => {
    if (!assignmentState) return;
    const { orderId, currentDeliveryId } = assignmentState;

    if (currentDeliveryId && currentDeliveryId !== targetDeliveryId) {
      // Przenieś między dostawami
      moveOrderMutation.mutate({
        sourceDeliveryId: currentDeliveryId,
        orderId,
        targetDeliveryId,
      });
    } else if (!currentDeliveryId) {
      // Dodaj do dostawy (zlecenie nie było wcześniej przypisane)
      addOrderMutation.mutate({ deliveryId: targetDeliveryId, orderId });
    } else {
      // Już jest w tej dostawie - zamknij
      setAssignmentState(null);
    }
  }, [assignmentState, moveOrderMutation, addOrderMutation]);

  const createAndAssign = useCallback(() => {
    if (!assignmentState || !selectedDateStr) return;
    const { orderId, currentDeliveryId } = assignmentState;

    // Użyj bulk-assign z deliveryDate (bez deliveryId) - tworzy nową dostawę
    bulkAssignMutation.mutate({
      orderIds: [orderId],
      deliveryDate: selectedDateStr,
      reassignOrderIds: currentDeliveryId ? [orderId] : undefined,
    });
  }, [assignmentState, selectedDateStr, bulkAssignMutation]);

  const setDeadlineOnly = useCallback(() => {
    if (!assignmentState || !selectedDateStr) return;
    setDeadlineMutation.mutate({
      orderId: assignmentState.orderId,
      deadline: selectedDateStr,
    });
  }, [assignmentState, selectedDateStr, setDeadlineMutation]);

  const isPending = bulkAssignMutation.isPending
    || addOrderMutation.isPending
    || moveOrderMutation.isPending
    || setDeadlineMutation.isPending;

  return {
    assignmentState,
    isOpen,
    openAssignment,
    closeAssignment,
    selectedDate,
    setSelectedDate,
    deliveriesForDate,
    isLoadingDeliveries,
    assignToDelivery,
    createAndAssign,
    setDeadlineOnly,
    isPending,
  };
}
