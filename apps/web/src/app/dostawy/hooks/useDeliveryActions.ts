'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi, workingDaysApi } from '@/lib/api';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import type { Delivery, DeliveryCalendarData } from '@/types/delivery';
import type { Order } from '@/types/order';

export interface CreateDeliveryData {
  deliveryDate: string;
  notes?: string;
}

export interface AddItemData {
  deliveryId: number;
  itemType: string;
  description: string;
  quantity: number;
}

export interface UseDeliveryActionsReturn {
  // Delivery CRUD
  createDeliveryMutation: ReturnType<typeof useMutation<Delivery, Error, CreateDeliveryData, { previousData: unknown }>>;
  deleteDeliveryMutation: ReturnType<typeof useMutation<void, Error, number>>;

  // Order management
  addOrderToDeliveryMutation: ReturnType<typeof useMutation<Delivery, Error, { deliveryId: number; orderId: number }, { previousData: unknown }>>;
  removeOrderFromDeliveryMutation: ReturnType<typeof useMutation<void, Error, { deliveryId: number; orderId: number }>>;
  moveOrderBetweenDeliveriesMutation: ReturnType<typeof useMutation<Delivery, Error, { sourceDeliveryId: number; targetDeliveryId: number; orderId: number }, { previousData: unknown }>>;

  // Delivery items
  addItemMutation: ReturnType<typeof useMutation<unknown, Error, AddItemData>>;
  deleteItemMutation: ReturnType<typeof useMutation<unknown, Error, { deliveryId: number; itemId: number }>>;

  // Order completion
  completeOrdersMutation: ReturnType<typeof useMutation<unknown, Error, { deliveryId: number; productionDate: string }>>;

  // Working days
  toggleWorkingDayMutation: ReturnType<typeof useMutation<unknown, Error, { date: string; isWorking: boolean }>>;
}

interface UseDeliveryActionsProps {
  onDeliveryCreated?: () => void;
  onDeliveryDeleted?: () => void;
  onOrdersCompleted?: () => void;
  onSelectedDeliveryUpdate?: (delivery: Delivery | null) => void;
  selectedDelivery?: Delivery | null;
  monthsToFetch?: { month: number; year: number }[];
}

/**
 * Hook managing all delivery-related mutations.
 *
 * Responsibilities:
 * - Create/delete deliveries with optimistic updates
 * - Add/remove/move orders between deliveries
 * - Add/delete delivery items
 * - Mark orders as completed
 * - Toggle working days
 */
export function useDeliveryActions({
  onDeliveryCreated,
  onDeliveryDeleted,
  onOrdersCompleted,
  onSelectedDeliveryUpdate,
  selectedDelivery,
  monthsToFetch,
}: UseDeliveryActionsProps = {}): UseDeliveryActionsReturn {
  const queryClient = useQueryClient();

  // Helper to update selectedDelivery from cache
  const updateSelectedDeliveryFromCache = (deliveryId: number) => {
    if (selectedDelivery && onSelectedDeliveryUpdate) {
      const updatedData = queryClient.getQueryData<{
        deliveries: Delivery[];
        unassignedOrders: Order[];
      }>(['deliveries-calendar-batch', monthsToFetch]);

      if (updatedData) {
        const updatedDelivery = updatedData.deliveries.find((d) => d.id === deliveryId);
        if (updatedDelivery) {
          onSelectedDeliveryUpdate(updatedDelivery);
        }
      }
    }
  };

  // Create delivery mutation with optimistic update
  const createDeliveryMutation = useMutation({
    mutationFn: (data: CreateDeliveryData) => deliveriesApi.create(data),

    onMutate: async (newDelivery) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar-batch'] });
      const previousData = queryClient.getQueryData(['deliveries-calendar-batch']);

      // Generate temporary ID for optimistic delivery
      const tempId = `temp-${Date.now()}`;

      queryClient.setQueryData(
        ['deliveries-calendar-batch'],
        (old: DeliveryCalendarData | undefined) => {
          if (!old) return old;

          return {
            ...old,
            deliveries: [
              ...(old.deliveries || []),
              {
                id: tempId,
                deliveryDate: newDelivery.deliveryDate,
                deliveryNumber: null,
                notes: newDelivery.notes || null,
                orders: [],
                items: [],
                _optimistic: true,
              },
            ],
          };
        }
      );

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Dostawa utworzona', 'Pomyslnie utworzono nowa dostawe');
      onDeliveryCreated?.();
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar-batch'], context.previousData);
      }
      showErrorToast('Blad tworzenia dostawy', getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
    },
  });

  // Delete delivery mutation
  const deleteDeliveryMutation = useMutation({
    mutationFn: (id: number) => deliveriesApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Dostawa usunieta', 'Pomyslnie usunieto dostawe');
      onDeliveryDeleted?.();
    },

    onError: (error) => {
      showErrorToast('Blad usuwania dostawy', getErrorMessage(error));
    },
  });

  // Add order to delivery mutation with optimistic update
  const addOrderToDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.addOrder(deliveryId, orderId),

    onMutate: async ({ deliveryId, orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar-batch'] });
      const previousData = queryClient.getQueryData(['deliveries-calendar-batch']);

      queryClient.setQueryData(
        ['deliveries-calendar-batch'],
        (old: DeliveryCalendarData | undefined) => {
          if (!old) return old;

          return {
            ...old,
            deliveries: old.deliveries?.map((delivery) =>
              delivery.id === deliveryId
                ? {
                    ...delivery,
                    orders: [
                      ...(delivery.orders || []),
                      {
                        id: orderId,
                        _optimistic: true,
                      } as unknown as Order,
                    ],
                  }
                : delivery
            ),
          };
        }
      );

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Zlecenie dodane', 'Zlecenie zostalo dodane do dostawy');
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar-batch'], context.previousData);
      }
      showErrorToast('Blad dodawania zlecenia', getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
    },
  });

  // Remove order from delivery mutation
  const removeOrderFromDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.removeOrder(deliveryId, orderId),

    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      updateSelectedDeliveryFromCache(variables.deliveryId);
      showSuccessToast('Zlecenie usuniete', 'Zlecenie zostalo usuniete z dostawy');
    },

    onError: (error) => {
      showErrorToast('Blad usuwania zlecenia', getErrorMessage(error));
    },
  });

  // Move order between deliveries mutation with optimistic update
  const moveOrderBetweenDeliveriesMutation = useMutation({
    mutationFn: ({
      sourceDeliveryId,
      targetDeliveryId,
      orderId,
    }: {
      sourceDeliveryId: number;
      targetDeliveryId: number;
      orderId: number;
    }) => deliveriesApi.moveOrder(sourceDeliveryId, orderId, targetDeliveryId),

    onMutate: async ({ sourceDeliveryId, targetDeliveryId, orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar-batch'] });
      const previousData = queryClient.getQueryData(['deliveries-calendar-batch']);

      queryClient.setQueryData(
        ['deliveries-calendar-batch'],
        (old: DeliveryCalendarData | undefined) => {
          if (!old) return old;

          return {
            ...old,
            deliveries: old.deliveries?.map((delivery) => {
              // Remove from source
              if (delivery.id === sourceDeliveryId) {
                return {
                  ...delivery,
                  orders: (delivery.orders || []).filter((o) => o.id !== orderId),
                };
              }
              // Add to target
              if (delivery.id === targetDeliveryId) {
                return {
                  ...delivery,
                  orders: [
                    ...(delivery.orders || []),
                    { id: orderId, _optimistic: true } as unknown as Order,
                  ],
                };
              }
              return delivery;
            }),
          };
        }
      );

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Zlecenie przeniesione', 'Zlecenie zostalo przeniesione miedzy dostawami');
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar-batch'], context.previousData);
      }
      showErrorToast('Blad przenoszenia zlecenia', getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
    },
  });

  // Add item to delivery mutation
  const addItemMutation = useMutation({
    mutationFn: (data: AddItemData) =>
      deliveriesApi.addItem(data.deliveryId, {
        itemType: data.itemType,
        description: data.description,
        quantity: data.quantity,
      }),

    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      updateSelectedDeliveryFromCache(variables.deliveryId);
      showSuccessToast('Artykul dodany', 'Pomyslnie dodano artykul do dostawy');
    },

    onError: (error) => {
      showErrorToast('Blad dodawania artykulu', getErrorMessage(error));
    },
  });

  // Delete item from delivery mutation
  const deleteItemMutation = useMutation({
    mutationFn: ({ deliveryId, itemId }: { deliveryId: number; itemId: number }) =>
      deliveriesApi.deleteItem(deliveryId, itemId),

    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      updateSelectedDeliveryFromCache(variables.deliveryId);
      showSuccessToast('Artykul usuniety', 'Pomyslnie usunieto artykul z dostawy');
    },

    onError: (error) => {
      showErrorToast('Blad usuwania artykulu', getErrorMessage(error));
    },
  });

  // Complete orders mutation
  const completeOrdersMutation = useMutation({
    mutationFn: ({ deliveryId, productionDate }: { deliveryId: number; productionDate: string }) =>
      deliveriesApi.completeOrders(deliveryId, productionDate),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast('Zlecenia zakonczone', 'Pomyslnie oznaczono zlecenia jako wyprodukowane');
      onOrdersCompleted?.();
    },

    onError: (error) => {
      showErrorToast('Blad konczenia zlecen', getErrorMessage(error));
    },
  });

  // Toggle working day mutation
  const toggleWorkingDayMutation = useMutation({
    mutationFn: ({ date, isWorking }: { date: string; isWorking: boolean }) =>
      workingDaysApi.setWorkingDay(date, isWorking),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });
      showSuccessToast(
        variables.isWorking ? 'Dzien roboczy' : 'Dzien wolny',
        `Oznaczono jako ${variables.isWorking ? 'dzien roboczy' : 'dzien wolny'}`
      );
    },

    onError: (error) => {
      showErrorToast('Blad zmiany dnia', getErrorMessage(error));
    },
  });

  return {
    createDeliveryMutation,
    deleteDeliveryMutation,
    addOrderToDeliveryMutation,
    removeOrderFromDeliveryMutation,
    moveOrderBetweenDeliveriesMutation,
    addItemMutation,
    deleteItemMutation,
    completeOrdersMutation,
    toggleWorkingDayMutation,
  };
}
