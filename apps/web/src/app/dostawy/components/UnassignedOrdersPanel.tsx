'use client';

import { Package, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DraggableOrderWithContextMenu,
  UnassignedOrdersDropzone,
} from '../DragDropComponents';
import type { Delivery } from '@/types/delivery';
import type { Order } from '@/types/order';

interface UnassignedOrdersPanelProps {
  unassignedOrders: Order[];
  deliveries: Delivery[];
  selectedDelivery: Delivery | null;
  selectedOrderIds: Set<number>;
  rightPanelCollapsed: boolean;
  onToggleOrderSelection: (orderId: number) => void;
  onClearSelection: () => void;
  onViewOrder: (orderId: number, orderNumber: string) => void;
  onAddOrderToDelivery: (deliveryId: number, orderId: number) => void;
  onSetRightPanelCollapsed: (collapsed: boolean) => void;
}

export function UnassignedOrdersPanel({
  unassignedOrders,
  deliveries,
  selectedDelivery,
  selectedOrderIds,
  rightPanelCollapsed,
  onToggleOrderSelection,
  onClearSelection,
  onViewOrder,
  onAddOrderToDelivery,
  onSetRightPanelCollapsed,
}: UnassignedOrdersPanelProps) {
  // Collapse toggle button when panel is collapsed
  if (rightPanelCollapsed) {
    return (
      <button
        onClick={() => onSetRightPanelCollapsed(false)}
        className="fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Expand right panel"
        title="Rozwin panel zlecen"
      >
        <ChevronRight className="h-6 w-6 rotate-180" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'border-l overflow-y-auto transition-all duration-300 ease-in-out w-80',
        selectedDelivery ? 'bg-blue-50 border-blue-300' : 'bg-white'
      )}
    >
      <div className="p-4 transition-all duration-300 opacity-100 visible">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className={cn(
              'font-semibold text-sm uppercase tracking-wide flex items-center gap-2',
              selectedDelivery ? 'text-blue-700' : 'text-slate-500'
            )}
          >
            <Package className="h-4 w-4" />
            Zlecenia bez daty
          </h3>
          <button
            onClick={() => onSetRightPanelCollapsed(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
            aria-label="Collapse right panel"
            title="Zwin panel"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Przeciagnij zlecenia na dni w kalendarzu, aby przypisac do dostawy
        </p>

        {/* Orders list */}
        {unassignedOrders.length > 0 ? (
          <UnassignedOrdersDropzone>
            <h3 className="font-semibold text-sm mb-3">
              Nieprzypisane zlecenia ({unassignedOrders.length})
            </h3>
            <div className="space-y-2">
              {unassignedOrders.map((order: Order) => (
                <DraggableOrderWithContextMenu
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderIds.has(order.id)}
                  onToggleSelect={() => onToggleOrderSelection(order.id)}
                  onView={() => onViewOrder(order.id, order.orderNumber)}
                  availableDeliveries={deliveries.map((d: Delivery) => ({
                    id: d.id,
                    deliveryDate: d.deliveryDate,
                    deliveryNumber: d.deliveryNumber,
                  }))}
                  onMoveToDelivery={(orderId, targetDeliveryId) => {
                    if (targetDeliveryId) {
                      onAddOrderToDelivery(targetDeliveryId, orderId);
                    }
                  }}
                />
              ))}
            </div>

            {/* Selection info */}
            {selectedOrderIds.size > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Zaznaczono: {selectedOrderIds.size}</span>
                  <button
                    onClick={onClearSelection}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Odznacz wszystkie
                  </button>
                </div>
              </div>
            )}
          </UnassignedOrdersDropzone>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            Wszystkie zlecenia maja przypisana date dostawy
          </p>
        )}
      </div>
    </div>
  );
}

export default UnassignedOrdersPanel;
