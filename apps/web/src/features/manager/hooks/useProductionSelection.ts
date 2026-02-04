/**
 * Custom hook for managing production selection state
 */

import { useState, useCallback } from 'react';
import type { Delivery } from '@/types';

interface UseProductionSelectionReturn {
  selectedOrderIds: Set<number>;
  selectedDeliveryIds: Set<number>;
  handleOrderToggle: (orderId: number, checked: boolean) => void;
  handleDeliveryToggle: (deliveryId: number, checked: boolean, delivery?: Delivery) => void;
  reset: () => void;
  totalSelected: number;
  hasSelection: boolean;
}

/**
 * Hook for managing selection state in production tabs
 * Handles both individual orders and entire deliveries
 *
 * @returns Selection state and handlers
 */
export const useProductionSelection = (): UseProductionSelectionReturn => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());

  /**
   * Toggle individual order selection
   */
  const handleOrderToggle = useCallback((orderId: number, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  }, []);

  /**
   * Toggle entire delivery selection
   * Also toggles all orders within the delivery
   */
  const handleDeliveryToggle = useCallback(
    (deliveryId: number, checked: boolean, delivery?: Delivery) => {
      // Toggle delivery selection
      setSelectedDeliveryIds((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(deliveryId);
        } else {
          newSet.delete(deliveryId);
        }
        return newSet;
      });

      // Toggle all orders in delivery
      if (delivery?.deliveryOrders) {
        const orderIds = delivery.deliveryOrders.map((dOrder) => dOrder.order.id);
        setSelectedOrderIds((prev) => {
          const newSet = new Set(prev);
          if (checked) {
            orderIds.forEach((id) => newSet.add(id));
          } else {
            orderIds.forEach((id) => newSet.delete(id));
          }
          return newSet;
        });
      }
    },
    []
  );

  /**
   * Reset all selections
   */
  const reset = useCallback(() => {
    setSelectedOrderIds(new Set());
    setSelectedDeliveryIds(new Set());
  }, []);

  // Licznik pokazuje tylko unikalne zlecenia (nie liczymy dostaw osobno,
  // bo zaznaczenie dostawy automatycznie dodaje jej zlecenia do selectedOrderIds)
  const totalSelected = selectedOrderIds.size;
  const hasSelection = totalSelected > 0;

  return {
    selectedOrderIds,
    selectedDeliveryIds,
    handleOrderToggle,
    handleDeliveryToggle,
    reset,
    totalSelected,
    hasSelection,
  };
};
