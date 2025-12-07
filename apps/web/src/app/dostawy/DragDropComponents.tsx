// Komponenty drag & drop dla dostaw
// Import tego pliku w page.tsx i użyj komponentów

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Package, Eye, X, GripVertical, ArrowRight, Trash2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { SyncIndicator } from '@/components/ui/sync-indicator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Komponent dla przeciąganego zlecenia
export function DraggableOrder({
  order,
  deliveryId,
  onView,
  onRemove,
  compact = false,
  isSelected = false,
  onToggleSelect,
}: {
  order: {
    id: number;
    orderNumber: string;
    totalWindows?: number | null;
    totalSashes?: number | null;
    totalGlasses?: number | null;
    _optimistic?: boolean; // Flaga optimistic update
  };
  deliveryId?: number;
  onView: () => void;
  onRemove?: () => void;
  compact?: boolean; // Tryb kompaktowy dla kalendarza
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryId,
    },
  });

  // Merge attributes with ARIA labels for better accessibility
  const accessibilityAttributes = {
    ...attributes,
    role: 'button',
    'aria-label': `Zlecenie ${order.orderNumber}${order.totalWindows ? `, ${order.totalWindows} okien` : ''}. Użyj Spacji lub Enter aby podnieść, strzałek aby przemieścić, Escape aby anulować.`,
    'aria-grabbed': isDragging,
    tabIndex: 0,
  };

  if (compact) {
    // Wersja kompaktowa dla kalendarza
    return (
      <div
        ref={setNodeRef}
        {...accessibilityAttributes}
        {...listeners}
        className={cn(
          'flex items-center justify-between px-1.5 py-0.5 rounded text-xs bg-white border transition-all cursor-grab active:cursor-grabbing select-none',
          isDragging ? 'opacity-50' : 'hover:bg-blue-50 hover:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          order._optimistic && 'border-yellow-300 bg-yellow-50/50'
        )}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onView();
        }}
      >
        <div className="flex items-center gap-1 pointer-events-none">
          <span className="font-mono font-medium text-[10px]">{order.orderNumber}</span>
          {order._optimistic && <SyncIndicator status="pending" size="xs" />}
        </div>
        {order.totalWindows ? (
          <span className="text-[10px] text-slate-500 pointer-events-none">{order.totalWindows}ok</span>
        ) : null}
      </div>
    );
  }

  // Wersja standardowa dla sidebar/listy
  return (
    <div
      ref={setNodeRef}
      {...accessibilityAttributes}
      {...listeners}
      className={cn(
        'flex items-center justify-between p-1.5 rounded border bg-white transition-all group select-none',
        isDragging ? 'opacity-50 cursor-grabbing' : 'hover:bg-slate-50 cursor-grab focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        isSelected && 'bg-blue-50 border-blue-400 ring-2 ring-blue-200',
        order._optimistic && 'border-yellow-300 bg-yellow-50/50'
      )}
    >
      <div className="flex items-center gap-1.5 flex-1 pointer-events-none">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-auto"
          />
        )}
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
        <Package className="h-3 w-3 text-slate-400" />
        <span className="font-mono text-xs font-medium">{order.orderNumber}</span>
        {order._optimistic && <SyncIndicator status="pending" size="xs" />}
        {order.totalWindows && (
          <span className="text-xs text-slate-500">{order.totalWindows} okien</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          aria-label={`Podgląd zlecenia ${order.orderNumber}`}
        >
          <Eye className="h-3 w-3" />
        </Button>
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Usuń zlecenie ${order.orderNumber} z dostawy`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Komponent dla obszaru, na który można przeciągnąć zlecenie (dostawa)
export function DroppableDelivery({
  delivery,
  children,
  compact = false,
}: {
  delivery: {
    id: number;
    deliveryNumber?: string | null;
  };
  children: React.ReactNode;
  compact?: boolean; // Tryb kompaktowy dla kalendarza
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `delivery-${delivery.id}`,
    data: {
      deliveryId: delivery.id,
    },
  });

  if (compact) {
    // Wersja kompaktowa dla kalendarza - subtelna granica tylko podczas hover
    return (
      <div
        ref={setNodeRef}
        role="region"
        aria-label={`Dostawa ${delivery.deliveryNumber || delivery.id}. Miejsce docelowe dla przeciąganych zleceń.`}
        aria-dropeffect={isOver ? 'move' : 'none'}
        className={cn(
          'p-1 rounded transition-all',
          isOver
            ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
            : 'bg-slate-50/30'
        )}
      >
        {children}
      </div>
    );
  }

  // Wersja standardowa dla sidebar
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`Dostawa ${delivery.deliveryNumber || delivery.id}. Miejsce docelowe dla przeciąganych zleceń.`}
      aria-dropeffect={isOver ? 'move' : 'none'}
      className={cn(
        'min-h-[60px] p-1.5 rounded-lg border-2 border-dashed transition-all',
        isOver
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-slate-50/50'
      )}
    >
      {children}
    </div>
  );
}

// Komponent dla listy nieprzypisanych zleceń (też droppable)
export function UnassignedOrdersDropzone({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-orders',
    data: {
      isUnassigned: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label="Lista nieprzypisanych zleceń. Upuść tutaj zlecenie aby usunąć je z dostawy."
      aria-dropeffect={isOver ? 'move' : 'none'}
      className={cn(
        'p-4 rounded-lg border-2 border-dashed transition-all min-h-[200px]',
        isOver
          ? 'border-red-500 bg-red-50 shadow-md'
          : 'border-slate-300 bg-white'
      )}
    >
      {children}
    </div>
  );
}

// Komponent overlay pokazywany podczas przeciągania
export function OrderDragOverlay({
  orderNumber,
  selectedCount = 1,
}: {
  orderNumber: string;
  selectedCount?: number;
}) {
  return (
    <div className="p-3 bg-white rounded-lg shadow-xl border-2 border-blue-500 cursor-grabbing relative">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" />
        <span className="font-mono text-sm font-semibold text-blue-700">
          {orderNumber}
        </span>
      </div>
      {selectedCount > 1 && (
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
          {selectedCount}
        </div>
      )}
    </div>
  );
}

// Typ dla dostawy w context menu
interface DeliveryOption {
  id: number;
  deliveryDate: string;
  deliveryNumber?: string | null;
}

// Komponent zlecenia z context menu - alternatywa dla drag & drop
export function DraggableOrderWithContextMenu({
  order,
  deliveryId,
  onView,
  onRemove,
  compact = false,
  isSelected = false,
  onToggleSelect,
  availableDeliveries = [],
  onMoveToDelivery,
}: {
  order: {
    id: number;
    orderNumber: string;
    totalWindows?: number | null;
    totalSashes?: number | null;
    totalGlasses?: number | null;
    _optimistic?: boolean;
  };
  deliveryId?: number;
  onView: () => void;
  onRemove?: () => void;
  compact?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  availableDeliveries?: DeliveryOption[];
  onMoveToDelivery?: (orderId: number, targetDeliveryId: number | null) => void;
}) {
  const hasContextMenu = onMoveToDelivery && availableDeliveries.length > 0;

  // Filtruj dostawy - nie pokazuj obecnej dostawy
  const otherDeliveries = availableDeliveries.filter(d => d.id !== deliveryId);

  const content = (
    <DraggableOrder
      order={order}
      deliveryId={deliveryId}
      onView={onView}
      onRemove={onRemove}
      compact={compact}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
    />
  );

  if (!hasContextMenu) {
    return content;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          Podgląd zlecenia
        </ContextMenuItem>

        {otherDeliveries.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowRight className="mr-2 h-4 w-4" />
                Przenieś do dostawy
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {otherDeliveries.map((delivery) => (
                  <ContextMenuItem
                    key={delivery.id}
                    onClick={() => onMoveToDelivery?.(order.id, delivery.id)}
                  >
                    {formatDate(delivery.deliveryDate)}
                    {delivery.deliveryNumber && ` (${delivery.deliveryNumber})`}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {onRemove && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onRemove}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń z dostawy
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

