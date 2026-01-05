# Plan: Panel Kierownika Produkcji

## Cel
Stworzenie dedykowanej podstrony "Panel Kierownika" z narzędziami do zarządzania produkcją:
- Dodawanie zleceń do produkcji (zmiana statusu na "in_progress")
- Kończenie zleceń (zmiana statusu na "completed")
- Zestawienie miesięczne (przeniesione z obecnego menu)
- Placeholder dla przyszłych funkcji (Godzinówki, Paletówki, B-Z)

## Kontekst biznesowy

### Problem
Obecnie brak dedykowanego panelu dla kierownika produkcji, który pozwalałby na:
- Szybkie przeglądanie zleceń wymagających uwagi (przeterminowane, nadchodzące)
- Grupowe zaznaczanie i zmienianie statusu zleceń
- Kończenie całych dostaw AKROBUD jednym kliknięciem

### Rozwiązanie
Panel kierownika z 5 sekcjami (zakładki):
1. **Dodaj do produkcji** - zaznaczanie zleceń i ustawienie statusu "w produkcji"
2. **Zakończ zlecenia** - zaznaczanie zleceń/dostaw i ustawienie statusu "wyprodukowane"
3. **Zestawienie miesięczne** - przeniesiona strona `/zestawienia`
4. **Godzinówki** - placeholder (wkrótce)
5. **Paletówki** - placeholder (wkrótce)
6. **B-Z** - placeholder (wkrótce)

---

## Struktura routingu

### Nowa główna sekcja menu
- **Ścieżka główna:** `/kierownik`
- **Nazwa w menu:** "Panel Kierownika"
- **Ikona:** `UserCog` (z lucide-react)
- **Pozycja w sidebaru:** Po "Dashboard", przed "AKROBUD"

### Zakładki w panelu (Tab Navigation)
| Zakładka | Komponent | Status |
|----------|-----------|--------|
| Dodaj do produkcji | `AddToProductionTab.tsx` | Do zaimplementowania |
| Zakończ zlecenia | `CompleteOrdersTab.tsx` | Do zaimplementowania |
| Zestawienie miesięczne | `MonthlyReportTab.tsx` | Refaktoryzacja istniejącej strony |
| Godzinówki | `TimeTrackerTab.tsx` | Placeholder |
| Paletówki | `PalletsTab.tsx` | Placeholder |
| B-Z | `BZTab.tsx` | Placeholder |

---

## Analiza istniejącej funkcjonalności

### 1. Zarządzanie statusem zleceń

**Obecny stan:**
- ❌ Brak UI do zmiany statusu zleceń (tylko archiwizacja)
- ❌ Brak bulk update endpoint (każda zmiana pojedynczo)
- ✅ Endpoint PATCH `/api/orders/:id` - zmiana statusu pojedynczego zlecenia
- ✅ Endpoint PUT `/api/orders/:id` - pełna aktualizacja

**Co trzeba dodać:**
- ✅ Backend: Nowy endpoint `POST /api/orders/bulk-update-status`
- ✅ Backend: Nowy endpoint `POST /api/deliveries/:id/complete-all-orders`
- ✅ Frontend: Komponenty do multi-select z checkboxami
- ✅ Frontend: UI do zmiany statusu wybranych zleceń

### 2. Struktura dostaw AKROBUD

**Obecny stan:**
- ✅ Dostawy są powiązane ze zleceniami przez tabelę `DeliveryOrder`
- ✅ Każda dostawa zawiera `deliveryOrders[]` z pełnymi danymi zleceń
- ✅ API endpoint `GET /api/deliveries?status=planned` - pobieranie dostaw
- ✅ Checkbox multi-select już istnieje w widoku dostaw (DragDropComponents.tsx)

**Wykorzystanie:**
- ✅ Możemy wyświetlić najbliższe dostawy z checkboxami
- ✅ Możemy zaznaczać pojedyncze zlecenia lub całe dostawy
- ✅ Użyjemy istniejącego wzorca checkboxów

### 3. Filtry i grupowanie zleceń

**Potrzebne filtry dla zakładki "Dodaj do produkcji":**
1. Zlecenia z przeterminowanym terminem realizacji (`deadline < today`)
2. Zlecenia z terminem w najbliższych 2 tygodniach (`deadline <= today + 14 dni`)
3. Zlecenia prywatne (nie-AKROBUD) - zlecenia bez powiązania z dostawą
4. Najbliższe dostawy AKROBUD (kilka kolejnych dostaw)

**Potrzebne filtry dla zakładki "Zakończ zlecenia":**
1. Zlecenia w statusie `in_progress`
2. Grupowanie według dostaw AKROBUD (jeśli powiązane)
3. Możliwość zaznaczenia całej dostawy lub pojedynczych zleceń

---

## Plan implementacji

### FAZA 1: Backend - Nowe endpointy

#### 1.1 Bulk update statusu zleceń
**Plik:** `apps/api/src/routes/orders.ts`

```typescript
/**
 * Endpoint: POST /api/orders/bulk-update-status
 * Body: { orderIds: number[], status: string, productionDate?: string }
 */
fastify.post('/bulk-update-status', {
  schema: {
    body: bulkUpdateStatusSchema,
    response: { 200: z.array(orderSchema) }
  }
}, orderHandler.bulkUpdateStatus);
```

**Handler:** `apps/api/src/handlers/orderHandler.ts`
```typescript
async bulkUpdateStatus(request: FastifyRequest, reply: FastifyReply) {
  const { orderIds, status, productionDate } = bulkUpdateStatusSchema.parse(request.body);
  const orders = await orderService.bulkUpdateStatus(orderIds, status, productionDate);
  return reply.status(200).send(orders);
}
```

**Service:** `apps/api/src/services/orderService.ts`
```typescript
async bulkUpdateStatus(orderIds: number[], status: string, productionDate?: string) {
  // Walidacja statusu
  if (!['new', 'in_progress', 'completed', 'archived'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  // Transakcja Prisma - aktualizacja wielu zleceń
  return await prisma.$transaction(
    orderIds.map(id =>
      prisma.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'completed' && productionDate ? { productionDate } : {})
        }
      })
    )
  );
}
```

**Validator:** `apps/api/src/validators/order.ts`
```typescript
const bulkUpdateStatusSchema = z.object({
  orderIds: z.array(z.number()).min(1),
  status: z.enum(['new', 'in_progress', 'completed', 'archived']),
  productionDate: z.string().datetime().optional()
});
```

#### 1.2 Zakończenie wszystkich zleceń w dostawie
**Endpoint:** `POST /api/deliveries/:id/complete-all-orders`

```typescript
/**
 * Ustawia status 'completed' dla wszystkich zleceń w dostawie
 * Body: { productionDate: string }
 */
fastify.post('/:id/complete-all-orders', {
  schema: {
    params: z.object({ id: z.coerce.number() }),
    body: z.object({ productionDate: z.string().datetime() }),
    response: { 200: deliverySchema }
  }
}, deliveryHandler.completeAllOrders);
```

**Handler:** `apps/api/src/handlers/deliveryHandler.ts`
```typescript
async completeAllOrders(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: number };
  const { productionDate } = request.body as { productionDate: string };

  const delivery = await deliveryService.completeAllOrders(id, productionDate);
  return reply.status(200).send(delivery);
}
```

**Service:** `apps/api/src/services/deliveryService.ts`
```typescript
async completeAllOrders(deliveryId: number, productionDate: string) {
  // Pobierz dostawę z zleceniami
  const delivery = await deliveryRepository.findById(deliveryId, {
    include: { deliveryOrders: { include: { order: true } } }
  });

  if (!delivery) {
    throw new AppError('Delivery not found', 404);
  }

  // Wyciągnij ID zleceń
  const orderIds = delivery.deliveryOrders.map(do => do.orderId);

  // Bulk update statusu
  await orderService.bulkUpdateStatus(orderIds, 'completed', productionDate);

  // Zwróć zaktualizowaną dostawę
  return await deliveryRepository.findById(deliveryId, {
    include: { deliveryOrders: { include: { order: true } } }
  });
}
```

#### 1.3 Endpoint filtrowania zleceń dla kierownika
**Endpoint:** `GET /api/orders/for-production`

```typescript
/**
 * Zwraca zlecenia podzielone na kategorie dla panelu kierownika
 * Query params:
 *  - overdueDays: number (domyślnie 0 - przeterminowane)
 *  - upcomingDays: number (domyślnie 14 - nadchodzące w ciągu 14 dni)
 *  - deliveriesLimit: number (domyślnie 5 - ile najbliższych dostaw)
 */
fastify.get('/for-production', {
  schema: {
    querystring: z.object({
      overdueDays: z.coerce.number().optional().default(0),
      upcomingDays: z.coerce.number().optional().default(14),
      deliveriesLimit: z.coerce.number().optional().default(5)
    }),
    response: { 200: forProductionSchema }
  }
}, orderHandler.getForProduction);
```

**Response schema:**
```typescript
const forProductionSchema = z.object({
  overdueOrders: z.array(orderSchema),           // Przeterminowane
  upcomingOrders: z.array(orderSchema),          // Nadchodzące 2 tygodnie
  privateOrders: z.array(orderSchema),           // Prywatne (nie-AKROBUD)
  upcomingDeliveries: z.array(deliverySchema)    // Najbliższe dostawy
});
```

**Service logic:**
```typescript
async getForProduction(params: ForProductionParams) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + params.upcomingDays);

  const [overdueOrders, upcomingOrders, privateOrders, upcomingDeliveries] = await Promise.all([
    // Przeterminowane (deadline < today, status != completed/archived)
    prisma.order.findMany({
      where: {
        deadline: { lt: today },
        status: { notIn: ['completed', 'archived'] },
        archivedAt: null
      },
      orderBy: { deadline: 'asc' }
    }),

    // Nadchodzące (today <= deadline <= today + upcomingDays)
    prisma.order.findMany({
      where: {
        deadline: { gte: today, lte: futureDate },
        status: { notIn: ['completed', 'archived'] },
        archivedAt: null
      },
      orderBy: { deadline: 'asc' }
    }),

    // Prywatne (brak powiązania z dostawą)
    prisma.order.findMany({
      where: {
        deliveryOrders: { none: {} },
        status: { notIn: ['completed', 'archived'] },
        archivedAt: null
      },
      orderBy: { deadline: 'asc' }
    }),

    // Najbliższe dostawy
    prisma.delivery.findMany({
      where: {
        deliveryDate: { gte: today },
        status: { in: ['planned', 'in_progress'] }
      },
      include: {
        deliveryOrders: {
          include: { order: true }
        }
      },
      orderBy: { deliveryDate: 'asc' },
      take: params.deliveriesLimit
    })
  ]);

  return {
    overdueOrders,
    upcomingOrders,
    privateOrders,
    upcomingDeliveries
  };
}
```

---

### FAZA 2: Frontend - Typy TypeScript

**Plik:** `apps/web/src/types/manager.ts`

```typescript
export interface ForProductionData {
  overdueOrders: Order[];
  upcomingOrders: Order[];
  privateOrders: Order[];
  upcomingDeliveries: Delivery[];
}

export interface BulkUpdateStatusData {
  orderIds: number[];
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  productionDate?: string;
}

export interface CompleteDeliveryData {
  productionDate: string;
}
```

---

### FAZA 3: Frontend - API Client

**Plik:** `apps/web/src/lib/api.ts`

```typescript
export const ordersApi = {
  // ... istniejące metody

  /**
   * Bulk update statusu zleceń
   */
  bulkUpdateStatus: async (data: BulkUpdateStatusData): Promise<Order[]> => {
    const response = await apiClient.post('/api/orders/bulk-update-status', data);
    return response.data;
  },

  /**
   * Pobierz zlecenia dla panelu kierownika
   */
  getForProduction: async (params?: {
    overdueDays?: number;
    upcomingDays?: number;
    deliveriesLimit?: number;
  }): Promise<ForProductionData> => {
    const response = await apiClient.get('/api/orders/for-production', { params });
    return response.data;
  }
};

export const deliveriesApi = {
  // ... istniejące metody

  /**
   * Zakończ wszystkie zlecenia w dostawie
   */
  completeAllOrders: async (deliveryId: number, data: CompleteDeliveryData): Promise<Delivery> => {
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/complete-all-orders`, data);
    return response.data;
  }
};
```

---

### FAZA 4: Frontend - Komponenty współdzielone

#### 4.1 OrderCheckbox - Komponent checkbox dla zlecenia
**Plik:** `apps/web/src/features/manager/components/OrderCheckbox.tsx`

```typescript
interface OrderCheckboxProps {
  order: Order;
  checked: boolean;
  onChange: (orderId: number, checked: boolean) => void;
}

export const OrderCheckbox: React.FC<OrderCheckboxProps> = ({
  order,
  checked,
  onChange
}) => {
  return (
    <div className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(order.id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
      <div className="flex-1">
        <div className="font-medium">{order.orderNumber}</div>
        <div className="text-sm text-gray-600">
          {order.client} • {order.system}
        </div>
        {order.deadline && (
          <div className="text-xs text-gray-500">
            Termin: {formatDate(order.deadline)}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{order.totalWindows || 0} okien</div>
        <div className="text-xs text-gray-500">{order.status}</div>
      </div>
    </div>
  );
};
```

#### 4.2 DeliveryCheckbox - Komponent checkbox dla dostawy
**Plik:** `apps/web/src/features/manager/components/DeliveryCheckbox.tsx`

```typescript
interface DeliveryCheckboxProps {
  delivery: Delivery;
  checked: boolean;
  onChange: (deliveryId: number, checked: boolean) => void;
  onOrderToggle?: (orderId: number, checked: boolean) => void;
  selectedOrderIds?: Set<number>;
}

export const DeliveryCheckbox: React.FC<DeliveryCheckboxProps> = ({
  delivery,
  checked,
  onChange,
  onOrderToggle,
  selectedOrderIds = new Set()
}) => {
  const ordersCount = delivery.deliveryOrders?.length || 0;
  const totalWindows = delivery.deliveryOrders?.reduce(
    (sum, dOrder) => sum + (dOrder.order.totalWindows || 0),
    0
  ) || 0;

  return (
    <div className="border rounded overflow-hidden">
      {/* Header - Checkbox całej dostawy */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(delivery.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <div className="flex-1">
          <div className="font-medium">
            {formatDate(delivery.deliveryDate)} • {delivery.deliveryNumber || 'Bez numeru'}
          </div>
          <div className="text-sm text-gray-600">
            {ordersCount} zleceń • {totalWindows} okien
          </div>
        </div>
        <Badge>{delivery.status}</Badge>
      </div>

      {/* Lista zleceń w dostawie (opcjonalna) */}
      {onOrderToggle && delivery.deliveryOrders && (
        <div className="p-2 space-y-1">
          {delivery.deliveryOrders.map(dOrder => (
            <OrderCheckbox
              key={dOrder.order.id}
              order={dOrder.order}
              checked={selectedOrderIds.has(dOrder.order.id)}
              onChange={onOrderToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### FAZA 5: Frontend - Zakładka "Dodaj do produkcji"

**Plik:** `apps/web/src/features/manager/components/AddToProductionTab.tsx`

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ordersApi } from '@/lib/api';
import { OrderCheckbox } from './OrderCheckbox';
import { DeliveryCheckbox } from './DeliveryCheckbox';
import type { Order, Delivery } from '@/types';

export const AddToProductionTab: React.FC = () => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pobierz dane dla panelu
  const { data, isLoading } = useQuery({
    queryKey: ['orders-for-production'],
    queryFn: () => ordersApi.getForProduction({ upcomingDays: 14, deliveriesLimit: 5 })
  });

  // Mutacja - zmiana statusu
  const bulkUpdateMutation = useMutation({
    mutationFn: (orderIds: number[]) =>
      ordersApi.bulkUpdateStatus({
        orderIds,
        status: 'in_progress',
        productionDate: new Date().toISOString()
      }),
    onSuccess: () => {
      toast({ title: 'Sukces', description: 'Zlecenia dodane do produkcji' });
      setSelectedOrderIds(new Set());
      setSelectedDeliveryIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['orders-for-production'] });
    },
    onError: () => {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować zleceń',
        variant: 'destructive'
      });
    }
  });

  // Obsługa zaznaczania zlecenia
  const handleOrderToggle = useCallback((orderId: number, checked: boolean) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }, []);

  // Obsługa zaznaczania dostawy
  const handleDeliveryToggle = useCallback((deliveryId: number, checked: boolean) => {
    setSelectedDeliveryIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(deliveryId);
      else next.delete(deliveryId);
      return next;
    });

    // Zaznacz/odznacz wszystkie zlecenia w dostawie
    const delivery = data?.upcomingDeliveries.find(d => d.id === deliveryId);
    if (delivery?.deliveryOrders) {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        delivery.deliveryOrders.forEach(dOrder => {
          if (checked) next.add(dOrder.order.id);
          else next.delete(dOrder.order.id);
        });
        return next;
      });
    }
  }, [data]);

  // Submit - dodaj do produkcji
  const handleSubmit = useCallback(() => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: 'Brak zaznaczenia',
        description: 'Zaznacz przynajmniej jedno zlecenie',
        variant: 'destructive'
      });
      return;
    }
    bulkUpdateMutation.mutate(Array.from(selectedOrderIds));
  }, [selectedOrderIds, bulkUpdateMutation, toast]);

  if (isLoading) {
    return <div className="p-6">Ładowanie...</div>;
  }

  const totalSelected = selectedOrderIds.size;

  return (
    <div className="p-6 space-y-6">
      {/* Header z przyciskiem akcji */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dodaj zlecenia do produkcji</h2>
        <div className="flex gap-3 items-center">
          {totalSelected > 0 && (
            <span className="text-sm text-gray-600">
              Zaznaczono: {totalSelected}
            </span>
          )}
          <Button
            onClick={handleSubmit}
            disabled={totalSelected === 0 || bulkUpdateMutation.isPending}
          >
            Dodaj do produkcji ({totalSelected})
          </Button>
        </div>
      </div>

      {/* Sekcja 1: Najbliższe dostawy AKROBUD */}
      <Card>
        <CardHeader>
          <CardTitle>Najbliższe dostawy AKROBUD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.upcomingDeliveries && data.upcomingDeliveries.length > 0 ? (
            data.upcomingDeliveries.map(delivery => (
              <DeliveryCheckbox
                key={delivery.id}
                delivery={delivery}
                checked={selectedDeliveryIds.has(delivery.id)}
                onChange={handleDeliveryToggle}
                onOrderToggle={handleOrderToggle}
                selectedOrderIds={selectedOrderIds}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak zaplanowanych dostaw</p>
          )}
        </CardContent>
      </Card>

      {/* Sekcja 2: Zlecenia z przeterminowanym terminem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            Zlecenia przeterminowane ({data?.overdueOrders.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.overdueOrders && data.overdueOrders.length > 0 ? (
            data.overdueOrders.map(order => (
              <OrderCheckbox
                key={order.id}
                order={order}
                checked={selectedOrderIds.has(order.id)}
                onChange={handleOrderToggle}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak przeterminowanych zleceń</p>
          )}
        </CardContent>
      </Card>

      {/* Sekcja 3: Zlecenia na najbliższe 2 tygodnie */}
      <Card>
        <CardHeader>
          <CardTitle>
            Zlecenia na najbliższe 2 tygodnie ({data?.upcomingOrders.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.upcomingOrders && data.upcomingOrders.length > 0 ? (
            data.upcomingOrders.map(order => (
              <OrderCheckbox
                key={order.id}
                order={order}
                checked={selectedOrderIds.has(order.id)}
                onChange={handleOrderToggle}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak zleceń w tym okresie</p>
          )}
        </CardContent>
      </Card>

      {/* Sekcja 4: Zlecenia prywatne (nie AKROBUD) */}
      <Card>
        <CardHeader>
          <CardTitle>
            Zlecenia prywatne ({data?.privateOrders.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.privateOrders && data.privateOrders.length > 0 ? (
            data.privateOrders.map(order => (
              <OrderCheckbox
                key={order.id}
                order={order}
                checked={selectedOrderIds.has(order.id)}
                onChange={handleOrderToggle}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak zleceń prywatnych</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddToProductionTab;
```

---

### FAZA 6: Frontend - Zakładka "Zakończ zlecenia"

**Plik:** `apps/web/src/features/manager/components/CompleteOrdersTab.tsx`

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ordersApi, deliveriesApi } from '@/lib/api';
import { OrderCheckbox } from './OrderCheckbox';
import { DeliveryCheckbox } from './DeliveryCheckbox';

export const CompleteOrdersTab: React.FC = () => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pobierz zlecenia w produkcji
  const { data: inProgressOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', { status: 'in_progress' }],
    queryFn: () => ordersApi.getAll({ status: 'in_progress', archived: 'false' })
  });

  // Pobierz dostawy z zleceniami w produkcji
  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries-with-in-progress'],
    queryFn: async () => {
      const allDeliveries = await deliveriesApi.getAll({
        status: 'planned,in_progress'
      });

      // Filtruj tylko dostawy z zleceniami w statusie in_progress
      return allDeliveries.filter(delivery =>
        delivery.deliveryOrders?.some(dOrder =>
          dOrder.order.status === 'in_progress'
        )
      );
    }
  });

  // Mutacja - zakończ zlecenia
  const completeOrdersMutation = useMutation({
    mutationFn: (orderIds: number[]) =>
      ordersApi.bulkUpdateStatus({
        orderIds,
        status: 'completed',
        productionDate: new Date().toISOString()
      }),
    onSuccess: () => {
      toast({ title: 'Sukces', description: 'Zlecenia zakończone' });
      setSelectedOrderIds(new Set());
      setSelectedDeliveryIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-with-in-progress'] });
    }
  });

  // Mutacja - zakończ całą dostawę
  const completeDeliveryMutation = useMutation({
    mutationFn: (deliveryId: number) =>
      deliveriesApi.completeAllOrders(deliveryId, {
        productionDate: new Date().toISOString()
      }),
    onSuccess: () => {
      toast({ title: 'Sukces', description: 'Dostawa zakończona' });
      setSelectedOrderIds(new Set());
      setSelectedDeliveryIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries-with-in-progress'] });
    }
  });

  const handleOrderToggle = useCallback((orderId: number, checked: boolean) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }, []);

  const handleDeliveryToggle = useCallback((deliveryId: number, checked: boolean) => {
    setSelectedDeliveryIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(deliveryId);
      else next.delete(deliveryId);
      return next;
    });
  }, []);

  const handleCompleteSelected = useCallback(() => {
    if (selectedOrderIds.size === 0) {
      toast({
        title: 'Brak zaznaczenia',
        description: 'Zaznacz przynajmniej jedno zlecenie',
        variant: 'destructive'
      });
      return;
    }
    completeOrdersMutation.mutate(Array.from(selectedOrderIds));
  }, [selectedOrderIds, completeOrdersMutation, toast]);

  const handleCompleteDeliveries = useCallback(() => {
    if (selectedDeliveryIds.size === 0) {
      toast({
        title: 'Brak zaznaczenia',
        description: 'Zaznacz przynajmniej jedną dostawę',
        variant: 'destructive'
      });
      return;
    }

    // Zakończ każdą zaznaczoną dostawę
    selectedDeliveryIds.forEach(deliveryId => {
      completeDeliveryMutation.mutate(deliveryId);
    });
  }, [selectedDeliveryIds, completeDeliveryMutation, toast]);

  if (ordersLoading || deliveriesLoading) {
    return <div className="p-6">Ładowanie...</div>;
  }

  // Rozdziel zlecenia na: powiązane z dostawami i pojedyncze
  const deliveryOrderIds = new Set(
    deliveries?.flatMap(d =>
      d.deliveryOrders?.map(dOrder => dOrder.order.id) || []
    ) || []
  );

  const standaloneOrders = inProgressOrders?.filter(
    order => !deliveryOrderIds.has(order.id)
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Zakończ zlecenia</h2>
        <div className="flex gap-3">
          {selectedDeliveryIds.size > 0 && (
            <Button
              onClick={handleCompleteDeliveries}
              variant="outline"
              disabled={completeDeliveryMutation.isPending}
            >
              Zakończ dostawy ({selectedDeliveryIds.size})
            </Button>
          )}
          {selectedOrderIds.size > 0 && (
            <Button
              onClick={handleCompleteSelected}
              disabled={completeOrdersMutation.isPending}
            >
              Zakończ zlecenia ({selectedOrderIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Dostawy AKROBUD z zleceniami w produkcji */}
      <Card>
        <CardHeader>
          <CardTitle>Dostawy AKROBUD ({deliveries?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deliveries && deliveries.length > 0 ? (
            deliveries.map(delivery => (
              <DeliveryCheckbox
                key={delivery.id}
                delivery={delivery}
                checked={selectedDeliveryIds.has(delivery.id)}
                onChange={handleDeliveryToggle}
                onOrderToggle={handleOrderToggle}
                selectedOrderIds={selectedOrderIds}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak dostaw w produkcji</p>
          )}
        </CardContent>
      </Card>

      {/* Pojedyncze zlecenia */}
      <Card>
        <CardHeader>
          <CardTitle>Pojedyncze zlecenia ({standaloneOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {standaloneOrders.length > 0 ? (
            standaloneOrders.map(order => (
              <OrderCheckbox
                key={order.id}
                order={order}
                checked={selectedOrderIds.has(order.id)}
                onChange={handleOrderToggle}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm">Brak pojedynczych zleceń</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteOrdersTab;
```

---

### FAZA 7: Frontend - Zakładka "Zestawienie miesięczne"

**Plik:** `apps/web/src/features/manager/components/MonthlyReportTab.tsx`

```typescript
'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Import istniejącego komponentu z /zestawienia
const MonthlyReportContent = dynamic(
  () => import('@/app/zestawienia/page').then(mod => mod.default),
  {
    loading: () => <div className="p-6">Ładowanie zestawienia...</div>,
    ssr: false
  }
);

export const MonthlyReportTab: React.FC = () => {
  return <MonthlyReportContent />;
};

export default MonthlyReportTab;
```

**UWAGA:** Istniejąca strona `/zestawienia` będzie nadal dostępna, ale dodatkowo będzie osadzona w panelu kierownika.

---

### FAZA 8: Frontend - Zakładki placeholder

**Pliki:**
- `apps/web/src/features/manager/components/TimeTrackerTab.tsx`
- `apps/web/src/features/manager/components/PalletsTab.tsx`
- `apps/web/src/features/manager/components/BZTab.tsx`

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TimeTrackerTab: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Godzinówki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Funkcjonalność w przygotowaniu...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTrackerTab;
```

(Analogicznie dla PalletsTab i BZTab)

---

### FAZA 9: Frontend - Główna strona Panelu Kierownika

**Plik:** `apps/web/src/app/kierownik/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

// Lazy load komponentów zakładek
const AddToProductionTab = dynamic(
  () => import('@/features/manager/components/AddToProductionTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

const CompleteOrdersTab = dynamic(
  () => import('@/features/manager/components/CompleteOrdersTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

const MonthlyReportTab = dynamic(
  () => import('@/features/manager/components/MonthlyReportTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

const TimeTrackerTab = dynamic(
  () => import('@/features/manager/components/TimeTrackerTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

const PalletsTab = dynamic(
  () => import('@/features/manager/components/PalletsTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

const BZTab = dynamic(
  () => import('@/features/manager/components/BZTab').then(mod => mod.default),
  { loading: () => <div className="p-6">Ładowanie...</div>, ssr: false }
);

export default function KierownikPage() {
  const [activeTab, setActiveTab] = useState('add-to-production');

  return (
    <div className="flex flex-col h-full">
      <Header title="Panel Kierownika" />

      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b bg-white sticky top-0 z-10">
            <TabsList className="w-full justify-start p-4 gap-2">
              <TabsTrigger value="add-to-production">
                Dodaj do produkcji
              </TabsTrigger>
              <TabsTrigger value="complete-orders">
                Zakończ zlecenia
              </TabsTrigger>
              <TabsTrigger value="monthly-report">
                Zestawienie miesięczne
              </TabsTrigger>
              <TabsTrigger value="time-tracker">
                Godzinówki
              </TabsTrigger>
              <TabsTrigger value="pallets">
                Paletówki
              </TabsTrigger>
              <TabsTrigger value="bz">
                B-Z
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="add-to-production" className="mt-0">
            <AddToProductionTab />
          </TabsContent>

          <TabsContent value="complete-orders" className="mt-0">
            <CompleteOrdersTab />
          </TabsContent>

          <TabsContent value="monthly-report" className="mt-0">
            <MonthlyReportTab />
          </TabsContent>

          <TabsContent value="time-tracker" className="mt-0">
            <TimeTrackerTab />
          </TabsContent>

          <TabsContent value="pallets" className="mt-0">
            <PalletsTab />
          </TabsContent>

          <TabsContent value="bz" className="mt-0">
            <BZTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

### FAZA 10: Frontend - Aktualizacja Sidebar

**Plik:** `apps/web/src/components/layout/sidebar.tsx`

Dodać nowy element do tablicy `navigation`:

```typescript
import { UserCog } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },

  // NOWA POZYCJA
  {
    name: 'Panel Kierownika',
    href: '/kierownik',
    icon: UserCog
  },

  { name: 'AKROBUD', href: '/magazyn/akrobud', icon: Warehouse },
  // ... reszta
];
```

---

## Struktura plików (pełna)

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── orders.ts                      [MODIFY] - dodać bulk-update-status, for-production
│   │   │   └── deliveries.ts                  [MODIFY] - dodać complete-all-orders
│   │   ├── handlers/
│   │   │   ├── orderHandler.ts                [MODIFY]
│   │   │   └── deliveryHandler.ts             [MODIFY]
│   │   ├── services/
│   │   │   ├── orderService.ts                [MODIFY]
│   │   │   └── deliveryService.ts             [MODIFY]
│   │   └── validators/
│   │       └── order.ts                       [MODIFY]
│   └── prisma/
│       └── schema.prisma                      [NO CHANGES]
│
└── web/
    ├── src/
    │   ├── app/
    │   │   └── kierownik/
    │   │       └── page.tsx                   [CREATE]
    │   ├── features/
    │   │   └── manager/                       [CREATE FOLDER]
    │   │       ├── components/
    │   │       │   ├── AddToProductionTab.tsx
    │   │       │   ├── CompleteOrdersTab.tsx
    │   │       │   ├── MonthlyReportTab.tsx
    │   │       │   ├── TimeTrackerTab.tsx
    │   │       │   ├── PalletsTab.tsx
    │   │       │   ├── BZTab.tsx
    │   │       │   ├── OrderCheckbox.tsx
    │   │       │   └── DeliveryCheckbox.tsx
    │   │       └── index.ts
    │   ├── components/
    │   │   └── layout/
    │   │       └── sidebar.tsx                [MODIFY]
    │   ├── types/
    │   │   └── manager.ts                     [CREATE]
    │   └── lib/
    │       └── api.ts                         [MODIFY]
```

---

## Kolejność implementacji

### Sprint 1: Backend (1-2 dni)
1. ✅ Dodać endpoint `POST /api/orders/bulk-update-status`
2. ✅ Dodać endpoint `GET /api/orders/for-production`
3. ✅ Dodać endpoint `POST /api/deliveries/:id/complete-all-orders`
4. ✅ Testy jednostkowe dla nowych endpointów

### Sprint 2: Frontend - Komponenty (2-3 dni)
1. ✅ Stworzyć folder `features/manager/`
2. ✅ Stworzyć `OrderCheckbox.tsx`
3. ✅ Stworzyć `DeliveryCheckbox.tsx`
4. ✅ Stworzyć `AddToProductionTab.tsx`
5. ✅ Stworzyć `CompleteOrdersTab.tsx`
6. ✅ Stworzyć placeholder tabs (TimeTracker, Pallets, BZ)

### Sprint 3: Frontend - Integracja (1 dzień)
1. ✅ Stworzyć stronę `/kierownik/page.tsx`
2. ✅ Zaimplementować Tab Navigation
3. ✅ Dodać pozycję w Sidebar
4. ✅ Stworzyć `MonthlyReportTab.tsx` (wrapper dla istniejącej strony)
5. ✅ Rozszerzyć `lib/api.ts` o nowe metody

### Sprint 4: Testy i refinement (1 dzień)
1. ✅ Testy end-to-end dla całego flow
2. ✅ Poprawki UI/UX
3. ✅ Optymalizacja wydajności

---

## Kwestie do wyjaśnienia z użytkownikiem

### 1. Grupowanie dostaw AKROBUD
**Pytanie:** Jak określić które dostawy to AKROBUD?
- **Opcja A:** Wszystkie dostawy z `deliveryOrders` (powiązane ze zleceniami)
- **Opcja B:** Dodać pole `isAkrobud` do modelu Delivery
- **Opcja C:** Rozpoznawać po prefiksie numeru dostawy

**Sugestia:** Opcja A - wszystkie dostawy z przypisanymi zleceniami to AKROBUD.

### 2. Status "Wyprodukowane" vs "Zakończone"
**Pytanie:** Jaki status ustawiać?
- Status `completed` w bazie
- W UI pokazywać jako "Wyprodukowane"?

**Sugestia:** Status w bazie: `completed`, wyświetlanie: "Wyprodukowane"

### 3. Przeniesienie "Zestawienia miesięcznego"
**Pytanie:** Czy usunąć starą stronę `/zestawienia` czy zostawić oba?
- **Opcja A:** Zostawić `/zestawienia` + dodać do panelu kierownika
- **Opcja B:** Usunąć `/zestawienia`, przekierować do `/kierownik?tab=monthly-report`
- **Opcja C:** Zostawić oba bez zmian

**Sugestia:** Opcja A - zachować kompatybilność wsteczną

### 4. Automatyczna data produkcji
**Pytanie:** Czy data produkcji (`productionDate`) ma być:
- **Opcja A:** Automatycznie ustawiana na "dzisiaj"
- **Opcja B:** Pytać użytkownika o datę (date picker)

**Sugestia:** Opcja A - automatycznie "dzisiaj", możliwość edycji później

---

## Ryzyka i mitigacje

| Ryzyko | Wpływ | Mitigacja |
|--------|-------|-----------|
| Brak bulk update endpoint powoduje długie czasy odpowiedzi | Wysoki | Prisma transaction + optymalizacja query |
| Konflikty z istniejącym kodem zarządzania zleceniami | Średni | Testy regresyjne, zachowanie API kompatybilności |
| Złożoność UI z checkboxami i multi-select | Średni | Wykorzystanie istniejącego wzorca z dostaw |
| Przeniesienie zestawienia może złamać istniejące linki | Niski | Zachowanie obu ścieżek |

---

## Szacowany nakład pracy

| Faza | Nakład | Priorytet |
|------|--------|-----------|
| Backend - endpointy | 8h | Wysoki |
| Frontend - komponenty checkbox | 4h | Wysoki |
| Frontend - AddToProductionTab | 6h | Wysoki |
| Frontend - CompleteOrdersTab | 6h | Wysoki |
| Frontend - Integracja (tabs, routing) | 4h | Wysoki |
| Frontend - MonthlyReportTab | 2h | Średni |
| Frontend - Placeholder tabs | 1h | Niski |
| Testy | 6h | Wysoki |
| **RAZEM** | **37h** (~5 dni roboczych) | |

---

## Checklist przed wdrożeniem

- [ ] Backend endpointy działają poprawnie
- [ ] Testy jednostkowe przechodzą
- [ ] UI checkboxów działa płynnie
- [ ] Bulk update nie powoduje timeoutów
- [ ] Sidebar zawiera nową pozycję "Panel Kierownika"
- [ ] Wszystkie zakładki ładują się poprawnie
- [ ] Istniejąca strona `/zestawienia` działa bez zmian
- [ ] Dokumentacja API zaktualizowana
- [ ] User guide dla kierownika przygotowany
