'use client';

import { useState, useCallback } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { showErrorToast } from '@/lib/toast-helpers';

export interface ActiveDragItem {
  orderId: number;
  orderNumber: string;
  sourceDeliveryId?: number;
}

interface DragDropData {
  orderId: number;
  deliveryId?: number;
  isUnassigned?: boolean;
}

export interface UseDeliverySelectionReturn {
  // Multi-select state
  selectedOrderIds: Set<number>;
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleOrderSelection: (orderId: number) => void;
  clearSelection: () => void;

  // Drag state
  activeDragItem: ActiveDragItem | null;
  setActiveDragItem: React.Dispatch<React.SetStateAction<ActiveDragItem | null>>;

  // DnD Kit sensors
  sensors: ReturnType<typeof useSensors>;

  // Drag handlers
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (
    event: DragEndEvent,
    callbacks: {
      onMoveOrderBetweenDeliveries: (
        sourceDeliveryId: number,
        targetDeliveryId: number,
        orderId: number
      ) => Promise<void>;
      onAddOrderToDelivery: (deliveryId: number, orderId: number) => Promise<void>;
      onRemoveOrderFromDelivery: (deliveryId: number, orderId: number) => Promise<void>;
    }
  ) => void;

  // Right panel state
  rightPanelCollapsed: boolean;
  setRightPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Hook managing order selection and drag & drop state.
 *
 * Responsibilities:
 * - Multi-select order management
 * - Drag & drop state and sensors
 * - Drag start/end event handling
 * - Right panel collapse state
 */
export function useDeliverySelection(): UseDeliverySelectionReturn {
  // Multi-select state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  // Drag state
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);

  // Right panel collapse state - domyślnie zwinięty
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);

  // DnD Kit sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle order selection
  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrderIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(orderId)) {
        newSelected.delete(orderId);
      } else {
        newSelected.add(orderId);
      }
      return newSelected;
    });
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedOrderIds(new Set());
  }, []);

  // Handle drag start event
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { orderId: number; orderNumber: string; deliveryId?: number };

    setActiveDragItem({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      sourceDeliveryId: data.deliveryId,
    });
  }, []);

  // Handle drag end event
  const handleDragEnd = useCallback(
    (
      event: DragEndEvent,
      callbacks: {
        onMoveOrderBetweenDeliveries: (
          sourceDeliveryId: number,
          targetDeliveryId: number,
          orderId: number
        ) => Promise<void>;
        onAddOrderToDelivery: (deliveryId: number, orderId: number) => Promise<void>;
        onRemoveOrderFromDelivery: (deliveryId: number, orderId: number) => Promise<void>;
      }
    ) => {
      const { active, over } = event;

      if (!over) {
        setActiveDragItem(null);
        return;
      }

      const activeData = active.data.current as DragDropData | undefined;
      const overData = over.data.current as DragDropData | undefined;

      const orderId = activeData?.orderId;
      const sourceDeliveryId = activeData?.deliveryId;
      const targetDeliveryId = overData?.deliveryId;

      if (!orderId) {
        setActiveDragItem(null);
        return;
      }

      // Check if we're dragging multiple orders
      const ordersToMove = selectedOrderIds.has(orderId)
        ? Array.from(selectedOrderIds)
        : [orderId];

      // Case 1: Moving between deliveries
      if (sourceDeliveryId && targetDeliveryId && sourceDeliveryId !== targetDeliveryId) {
        (async () => {
          for (const id of ordersToMove) {
            try {
              await callbacks.onMoveOrderBetweenDeliveries(sourceDeliveryId, targetDeliveryId, id);
            } catch (error) {
              console.error(`Failed to move order ${id}:`, error);
              break;
            }
          }
        })();
        setSelectedOrderIds(new Set());
      }

      // Case 2: Moving from unassigned to delivery
      else if (!sourceDeliveryId && targetDeliveryId) {
        (async () => {
          for (const id of ordersToMove) {
            try {
              await callbacks.onAddOrderToDelivery(targetDeliveryId, id);
            } catch (error) {
              console.error(`Failed to add order ${id} to delivery:`, error);
              showErrorToast('Blad', `Nie udalo sie dodac zlecenia ${id} do dostawy`);
              break;
            }
          }
        })();
        setSelectedOrderIds(new Set());
      }

      // Case 3: Moving from delivery to unassigned
      else if (sourceDeliveryId && overData?.isUnassigned) {
        (async () => {
          for (const id of ordersToMove) {
            try {
              await callbacks.onRemoveOrderFromDelivery(sourceDeliveryId, id);
            } catch (error) {
              console.error(`Failed to remove order ${id} from delivery:`, error);
              showErrorToast('Blad', `Nie udalo sie usunac zlecenia ${id} z dostawy`);
              break;
            }
          }
        })();
        setSelectedOrderIds(new Set());
      }

      setActiveDragItem(null);
    },
    [selectedOrderIds]
  );

  return {
    // Multi-select state
    selectedOrderIds,
    setSelectedOrderIds,
    toggleOrderSelection,
    clearSelection,

    // Drag state
    activeDragItem,
    setActiveDragItem,

    // DnD Kit sensors
    sensors,

    // Drag handlers
    handleDragStart,
    handleDragEnd,

    // Right panel state
    rightPanelCollapsed,
    setRightPanelCollapsed,
  };
}
