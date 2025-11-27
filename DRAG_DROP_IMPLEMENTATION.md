# Drag & Drop Implementation dla Dostaw

## Zmiany do zaimplementowania

### 1. Import biblioteki @dnd-kit

```tsx
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
```

### 2. Dodanie stanu dla drag & drop

```tsx
const [activeDragItem, setActiveDragItem] = useState<{
  orderId: number;
  orderNumber: string;
  sourceDeliveryId?: number;
} | null>(null);

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Minimalna odległość do rozpoczęcia przeciągania
    },
  })
);
```

### 3. Handler dla drag events

```tsx
const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  const data = active.data.current;
  setActiveDragItem({
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    sourceDeliveryId: data.deliveryId,
  });
};

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) {
    setActiveDragItem(null);
    return;
  }

  const activeData = active.data.current;
  const overData = over.data.current;

  const orderId = activeData.orderId;
  const sourceDeliveryId = activeData.deliveryId;
  const targetDeliveryId = overData?.deliveryId;

  // Przypadek 1: Przenoszenie z dostawy do innej dostawy
  if (sourceDeliveryId && targetDeliveryId && sourceDeliveryId !== targetDeliveryId) {
    // Najpierw usuń ze źródła
    removeOrderFromDeliveryMutation.mutate(
      { deliveryId: sourceDeliveryId, orderId },
      {
        onSuccess: () => {
          // Potem dodaj do celu
          addOrderToDeliveryMutation.mutate({ deliveryId: targetDeliveryId, orderId });
        },
      }
    );
  }

  // Przypadek 2: Przenoszenie z nieprzypisanych do dostawy
  else if (!sourceDeliveryId && targetDeliveryId) {
    addOrderToDeliveryMutation.mutate({ deliveryId: targetDeliveryId, orderId });
  }

  // Przypadek 3: Przenoszenie z dostawy do nieprzypisanych
  else if (sourceDeliveryId && overData?.isUnassigned) {
    removeOrderFromDeliveryMutation.mutate({ deliveryId: sourceDeliveryId, orderId });
  }

  setActiveDragItem(null);
};
```

### 4. Komponent Draggable Order

```tsx
function DraggableOrder({
  order,
  deliveryId,
  onView,
  onRemove,
}: {
  order: any;
  deliveryId?: number;
  onView: () => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center justify-between p-2 rounded border cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-50' : 'hover:bg-slate-50'
      )}
    >
      <div className="flex items-center gap-2">
        <Package className="h-3 w-3 text-slate-400" />
        <span className="font-mono text-xs font-medium">{order.orderNumber}</span>
      </div>
      <div className="flex items-center gap-1">
        {order.totalWindows && (
          <span className="text-xs text-slate-500">{order.totalWindows} okien</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="h-3 w-3" />
        </Button>
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 5. Komponent Droppable Delivery

```tsx
function DroppableDelivery({ delivery, children }: { delivery: Delivery; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `delivery-${delivery.id}`,
    data: {
      deliveryId: delivery.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[100px] p-2 rounded-lg border-2 border-dashed transition-colors',
        isOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
      )}
    >
      {children}
    </div>
  );
}
```

### 6. Wrap całej aplikacji w DndContext

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  {/* Cała zawartość kalendarza */}

  <DragOverlay>
    {activeDragItem && (
      <div className="p-2 bg-white rounded shadow-lg border-2 border-blue-500">
        <span className="font-mono text-xs font-medium">
          {activeDragItem.orderNumber}
        </span>
      </div>
    )}
  </DragOverlay>
</DndContext>
```

### 7. Przykład użycia w kalendarzu

```tsx
{days.map((day, index) => {
  if (day === null) return <div key={`empty-${index}`} />;

  const dayDeliveries = getDeliveriesForDay(day);

  return (
    <div key={day} className="border p-2 min-h-[120px]">
      <div className="font-semibold text-sm mb-2">{day}</div>

      <div className="space-y-2">
        {dayDeliveries.map((delivery) => (
          <DroppableDelivery key={delivery.id} delivery={delivery}>
            <div className="text-xs font-medium mb-1">
              {delivery.deliveryNumber || `Dostawa #${delivery.id}`}
            </div>

            {delivery.deliveryOrders.map(({ order }) => (
              <DraggableOrder
                key={order.id}
                order={order}
                deliveryId={delivery.id}
                onView={() => {
                  setSelectedOrderId(order.id);
                  setSelectedOrderNumber(order.orderNumber);
                }}
                onRemove={() =>
                  removeOrderFromDeliveryMutation.mutate({
                    deliveryId: delivery.id,
                    orderId: order.id,
                  })
                }
              />
            ))}
          </DroppableDelivery>
        ))}
      </div>
    </div>
  );
})}
```

### 8. Lista nieprzypisanych zleceń jako droppable

```tsx
function UnassignedOrdersDropzone({ orders, onOrderView }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-orders',
    data: {
      isUnassigned: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'p-4 rounded-lg border-2 border-dashed transition-colors',
        isOver ? 'border-red-500 bg-red-50' : 'border-slate-300'
      )}
    >
      <h3 className="font-semibold mb-3">Nieprzypisane zlecenia</h3>

      <div className="space-y-2">
        {orders.map((order: any) => (
          <DraggableOrder
            key={order.id}
            order={order}
            onView={() => onOrderView(order.id, order.orderNumber)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Funkcje drag & drop:

✅ **Przeciąganie zlecenia z jednej dostawy do drugiej**
✅ **Przeciąganie nieprzypisanego zlecenia do dostawy**
✅ **Przeciąganie zlecenia z dostawy do nieprzypisanych**
✅ **Wizualna informacja zwrotna (highlight przy hover)**
✅ **Drag overlay pokazujący co przeciągasz**
✅ **Minimum distance aby uniknąć przypadkowego przeciągania**

