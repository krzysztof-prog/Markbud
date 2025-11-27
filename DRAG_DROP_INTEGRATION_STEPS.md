# Kroki integracji Drag & Drop w dostawach

## Krok 1: Dodaj importy na początku pliku `page.tsx`

```tsx
// Dodaj te importy do istniejących
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
import {
  DraggableOrder,
  DroppableDelivery,
  UnassignedOrdersDropzone,
  OrderDragOverlay,
} from './DragDropComponents';
```

## Krok 2: Dodaj stan dla drag & drop w komponencie DostawyPage

```tsx
// Dodaj te stany zaraz po istniejących useState
const [activeDragItem, setActiveDragItem] = useState<{
  orderId: number;
  orderNumber: string;
  sourceDeliveryId?: number;
} | null>(null);

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Minimalna odległość do rozpoczęcia przeciągania (8px)
    },
  })
);
```

## Krok 3: Dodaj handlery dla drag events

```tsx
const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  const data = active.data.current as any;

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

  const activeData = active.data.current as any;
  const overData = over.data.current as any;

  const orderId = activeData.orderId;
  const sourceDeliveryId = activeData.deliveryId;
  const targetDeliveryId = overData?.deliveryId;

  // Przypadek 1: Przenoszenie między dostawami
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

## Krok 4: Owinąć całą zawartość strony w DndContext

Znajdź w kodzie `return (` głównego komponentu i dodaj:

```tsx
return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="flex flex-col h-full">
      <Header title="Dostawy" />

      {/* Cała reszta zawartości... */}

    </div>

    {/* Overlay pokazywany podczas przeciągania */}
    <DragOverlay>
      {activeDragItem && (
        <OrderDragOverlay orderNumber={activeDragItem.orderNumber} />
      )}
    </DragOverlay>
  </DndContext>
);
```

## Krok 5: Zamień komponenty zleceń na draggable

### W kalendarzu (dla każdej dostawy):

Znajdź mapowanie zleceń w dostawie i zamień na:

```tsx
<DroppableDelivery delivery={delivery}>
  <div className="text-xs font-medium mb-2">
    {delivery.deliveryNumber || `Dostawa #${delivery.id}`}
  </div>

  <div className="space-y-1">
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
  </div>
</DroppableDelivery>
```

### W liście nieprzypisanych zleceń:

Znajdź mapowanie nieprzypisanych zleceń i zamień na:

```tsx
<UnassignedOrdersDropzone>
  <h3 className="font-semibold text-sm mb-3">
    Nieprzypisane zlecenia ({unassignedOrders.length})
  </h3>

  <div className="space-y-2">
    {unassignedOrders.map((order: any) => (
      <DraggableOrder
        key={order.id}
        order={order}
        onView={() => {
          setSelectedOrderId(order.id);
          setSelectedOrderNumber(order.orderNumber);
        }}
      />
    ))}
  </div>
</UnassignedOrdersDropzone>
```

## Testowanie

Po implementacji powinieneś móc:

1. ✅ **Przeciągnąć zlecenie z nieprzypisanych do dostawy** - zlecenie zniknie z listy i pojawi się w dostawie
2. ✅ **Przeciągnąć zlecenie między dostawami** - zlecenie przeniesie się z jednej dostawy do drugiej
3. ✅ **Przeciągnąć zlecenie z dostawy do nieprzypisanych** - zlecenie wróci do listy nieprzypisanych
4. ✅ **Wizualna informacja zwrotna** - obszar docelowy podświetli się na niebiesko podczas hover
5. ✅ **Drag overlay** - podczas przeciągania zobaczysz "cień" przeciąganego zlecenia

## Wskazówki

- **Minimalna odległość**: 8px - musisz przesunąć myszkę o 8 pikseli żeby rozpocząć przeciąganie (unika przypadkowego przeciągania podczas klikania)
- **Hover efekty**: Obszary docelowe zmieniają kolor gdy najeżdżasz z przeciąganym elementem
- **Cursor**: Zmienia się na `grab` gdy najeżdżasz i `grabbing` podczas przeciągania
- **Ikona uchwytu**: `GripVertical` pokazuje gdzie można złapać zlecenie do przeciągania
