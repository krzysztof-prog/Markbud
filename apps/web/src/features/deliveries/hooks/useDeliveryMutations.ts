/**
 * Delivery Mutations - All mutations for delivery calendar
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi, workingDaysApi } from '@/lib/api';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TOAST_MESSAGES } from '@/lib/toast-messages';
import type { DeliveryCalendarData } from '@/types/delivery';
import type { Order } from '@/types/order';

const CALENDAR_QUERY_KEY = 'deliveries-calendar-continuous';

/**
 * Hook for creating a delivery
 */
export function useCreateDelivery(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { deliveryDate: string; notes?: string }) =>
      deliveriesApi.create(data),

    onMutate: async (newDelivery) => {
      await queryClient.cancelQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      const previousData = queryClient.getQueryData([CALENDAR_QUERY_KEY]);

      const tempId = `temp-${Date.now()}`;

      queryClient.setQueryData([CALENDAR_QUERY_KEY], (old: DeliveryCalendarData | undefined) => {
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
      });

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.created, TOAST_MESSAGES.delivery.createdDesc);
      callbacks?.onSuccess?.();
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([CALENDAR_QUERY_KEY], context.previousData);
      }
      showErrorToast(TOAST_MESSAGES.delivery.errorCreate, getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
    },
  });
}

/**
 * Hook for deleting a delivery
 */
export function useDeleteDelivery(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deliveriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.deleted, TOAST_MESSAGES.delivery.deletedDesc);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.delivery.errorDelete, getErrorMessage(error));
    },
  });
}

/**
 * Hook for removing an order from a delivery
 */
export function useRemoveOrderFromDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.removeOrder(deliveryId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.orderRemoved, TOAST_MESSAGES.delivery.orderRemovedDesc);
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.delivery.errorRemoveOrder, getErrorMessage(error));
    },
  });
}

/**
 * Hook for moving an order between deliveries
 */
export function useMoveOrderBetweenDeliveries() {
  const queryClient = useQueryClient();

  return useMutation({
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
      await queryClient.cancelQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      const previousData = queryClient.getQueryData([CALENDAR_QUERY_KEY]);

      queryClient.setQueryData([CALENDAR_QUERY_KEY], (old: DeliveryCalendarData | undefined) => {
        if (!old) return old;

        return {
          ...old,
          deliveries: old.deliveries?.map((delivery) => {
            if (delivery.id === sourceDeliveryId) {
              return {
                ...delivery,
                orders: (delivery.orders || []).filter((o) => o.id !== orderId),
              };
            }
            if (delivery.id === targetDeliveryId) {
              return {
                ...delivery,
                orders: [...(delivery.orders || []), { id: orderId, _optimistic: true } as unknown as Order],
              };
            }
            return delivery;
          }),
        };
      });

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.orderMoved, TOAST_MESSAGES.delivery.orderMovedDesc);
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([CALENDAR_QUERY_KEY], context.previousData);
      }
      showErrorToast(TOAST_MESSAGES.delivery.errorMoveOrder, getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
    },
  });
}

/**
 * Hook for adding an order to a delivery
 */
export function useAddOrderToDelivery(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.addOrder(deliveryId, orderId),

    onMutate: async ({ deliveryId, orderId }) => {
      await queryClient.cancelQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      const previousData = queryClient.getQueryData([CALENDAR_QUERY_KEY]);

      queryClient.setQueryData([CALENDAR_QUERY_KEY], (old: DeliveryCalendarData | undefined) => {
        if (!old) return old;

        return {
          ...old,
          deliveries: old.deliveries?.map((delivery) =>
            delivery.id === deliveryId
              ? {
                  ...delivery,
                  orders: [...(delivery.orders || []), { id: orderId, _optimistic: true } as unknown as Order],
                }
              : delivery
          ),
        };
      });

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.orderAdded, TOAST_MESSAGES.delivery.orderAddedDesc);
      callbacks?.onSuccess?.();
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([CALENDAR_QUERY_KEY], context.previousData);
      }
      showErrorToast(TOAST_MESSAGES.delivery.errorAddOrder, getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
    },
  });
}

/**
 * Hook for adding an item to a delivery
 */
export function useAddItemToDelivery(callbacks?: {
  onSuccess?: (deliveryId: number) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      deliveryId: number;
      itemType: string;
      description: string;
      quantity: number;
    }) =>
      deliveriesApi.addItem(data.deliveryId, {
        itemType: data.itemType,
        description: data.description,
        quantity: data.quantity,
      }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.itemAdded, TOAST_MESSAGES.delivery.itemAddedDesc);
      callbacks?.onSuccess?.(variables.deliveryId);
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.delivery.errorAddItem, getErrorMessage(error));
    },
  });
}

/**
 * Hook for deleting an item from a delivery
 */
export function useDeleteItemFromDelivery(callbacks?: {
  onSuccess?: (deliveryId: number) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, itemId }: { deliveryId: number; itemId: number }) =>
      deliveriesApi.deleteItem(deliveryId, itemId),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.itemDeleted, TOAST_MESSAGES.delivery.itemDeletedDesc);
      callbacks?.onSuccess?.(variables.deliveryId);
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.delivery.errorDeleteItem, getErrorMessage(error));
    },
  });
}

/**
 * Hook for completing orders in a delivery
 */
export function useCompleteDeliveryOrders(callbacks?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deliveryId, productionDate }: { deliveryId: number; productionDate: string }) =>
      deliveriesApi.completeOrders(deliveryId, productionDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      showSuccessToast(TOAST_MESSAGES.delivery.ordersCompleted, TOAST_MESSAGES.delivery.ordersCompletedDesc);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.delivery.errorCompleteOrders, getErrorMessage(error));
    },
  });
}

/**
 * Hook for toggling working day status
 */
export function useToggleWorkingDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, isWorking }: { date: string; isWorking: boolean }) =>
      workingDaysApi.setWorkingDay(date, isWorking),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
      showSuccessToast(
        variables.isWorking ? TOAST_MESSAGES.workingDays.workingDay : TOAST_MESSAGES.workingDays.dayOff,
        variables.isWorking ? TOAST_MESSAGES.workingDays.workingDayDesc : TOAST_MESSAGES.workingDays.dayOffDesc
      );
    },
    onError: (error) => {
      showErrorToast(TOAST_MESSAGES.workingDays.errorToggle, getErrorMessage(error));
    },
  });
}
