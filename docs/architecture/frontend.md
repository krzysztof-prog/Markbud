# Frontend Architecture

> Dokumentacja architektury frontend opartej na Next.js 15 z App Router.

---

## Next.js 15 App Router

Frontend wykorzystuje Next.js 15 z App Router (katalog `app/`):

```
app/
├── layout.tsx                  # Root layout
├── page.tsx                    # Dashboard (home)
├── providers.tsx               # React Query + Theme providers
├── dostawy/
│   ├── page.tsx               # Deliveries list
│   ├── [id]/
│   │   └── optymalizacja/
│   │       └── page.tsx       # Pallet optimization
│   └── components/            # Feature-specific components
├── magazyn/
│   ├── page.tsx               # Warehouse overview
│   └── akrobud/
│       └── page.tsx           # AKROBUD warehouse
├── szyby/
│   └── page.tsx               # Glass orders/deliveries
└── ustawienia/
    └── page.tsx               # Settings
```

---

## Feature-Based Organization

Kazdy feature ma wlasna strukture:

```
features/<feature-name>/
├── api/
│   └── <feature>Api.ts        # API calls (React Query)
├── components/
│   ├── <Component>.tsx        # Feature components
│   └── index.ts               # Barrel export
├── hooks/
│   └── use<Hook>.ts           # Feature-specific hooks
└── types/
    └── index.ts               # Feature types
```

### Przyklad: Deliveries Feature

```
features/deliveries/
├── api/
│   └── deliveriesApi.ts       # fetchDeliveries, createDelivery, etc.
├── components/
│   ├── DeliveriesTable.tsx
│   ├── DeliveryCard.tsx
│   ├── DeliveryCalendar.tsx
│   └── index.ts
├── hooks/
│   ├── useDeliveries.ts
│   └── useDeliveryMutations.ts
└── types/
    └── index.ts
```

---

## State Management Strategy

### Server State (React Query)

Do danych z serwera uzywamy React Query:

- Cache management
- Automatic refetching
- Optimistic updates
- Real-time sync via WebSocket

```typescript
// features/deliveries/api/deliveriesApi.ts
export async function fetchDeliveries() {
  return apiClient.get<Delivery[]>('/deliveries');
}

// features/deliveries/hooks/useDeliveries.ts
export function useDeliveries() {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: fetchDeliveries,
    staleTime: 60000  // 1 minuta
  });
}
```

### Client State (React useState/useReducer)

Do stanu lokalnego uzywamy hookow React:

- UI state (modals, forms)
- Local filters
- Temporary selections

```typescript
// Przyklad: modal state
const [isModalOpen, setIsModalOpen] = useState(false);

// Przyklad: local filter
const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
```

### URL State (Next.js searchParams)

Do stanu synchronizowanego z URL:

- Pagination
- Filters
- Active tabs

```typescript
// Przyklad: pagination z URL
const searchParams = useSearchParams();
const page = parseInt(searchParams.get('page') || '1');
```

---

## Component Architecture

```
components/
├── ui/                         # Shadcn/ui primitives
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── layout/                     # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
├── charts/                     # Recharts wrappers
│   ├── BarChart.tsx
│   └── PieChart.tsx
└── loaders/                    # Loading states
    ├── TableSkeleton.tsx
    └── CardSkeleton.tsx
```

### Shadcn/ui

Uzywamy Shadcn/ui jako biblioteki komponentow:

- Konfigurowalny (zrodla w `components/ui/`)
- Stylowany TailwindCSS
- Accessibility out-of-the-box

---

## Data Fetching Pattern

### 1. Definiuj funkcje API

```typescript
// features/orders/api/ordersApi.ts
export async function fetchOrders(): Promise<Order[]> {
  return apiClient.get<Order[]>('/orders');
}

export async function fetchOrderById(id: number): Promise<Order> {
  return apiClient.get<Order>(`/orders/${id}`);
}

export async function createOrder(data: CreateOrderDTO): Promise<Order> {
  return apiClient.post<Order>('/orders', data);
}
```

### 2. Tworz React Query hooks

```typescript
// features/orders/hooks/useOrders.ts
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchOrderById(id),
    enabled: !!id
  });
}
```

### 3. Tworz mutation hooks

```typescript
// features/orders/hooks/useOrderMutations.ts
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Zlecenie utworzone');
    },
    onError: (error) => {
      toast.error('Blad podczas tworzenia zlecenia');
    }
  });
}
```

### 4. Uzyj w komponencie

```typescript
// features/orders/components/OrdersList.tsx
function OrdersList() {
  const { data, isLoading, error } = useOrders();

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <OrdersTable data={data} />;
}
```

---

## Loading States

### Skeleton Components

Uzywaj skeletonow zamiast spinnerow:

```typescript
// components/loaders/TableSkeleton.tsx
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
```

### Suspense Boundaries

Uzywaj Suspense dla lazy loading:

```typescript
// app/dostawy/page.tsx
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/loaders';

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DeliveriesContent />
    </Suspense>
  );
}
```

---

## Lazy Loading

Ciezkie komponenty laduj dynamicznie:

```typescript
// Dobrze - lazy loading z explicit default
const DeliveryCalendar = dynamic(
  () => import('./DeliveryCalendar').then(mod => ({ default: mod.DeliveryCalendar })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false  // Jesli komponent wymaga window/document
  }
);

// Zle - bez lazy loading
import { DeliveryCalendar } from './DeliveryCalendar';
```

---

## Styling z TailwindCSS

### Utility Classes

```tsx
<Button
  className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
  disabled={isPending}
>
  {isPending ? 'Ladowanie...' : 'Zapisz'}
</Button>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Dark Mode

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

---

## Form Handling

Uzywamy React Hook Form + Zod:

```typescript
// Przyklad formularza
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, type CreateOrderDTO } from '@/validators/order';

function CreateOrderForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateOrderDTO>({
    resolver: zodResolver(createOrderSchema)
  });

  const createOrder = useCreateOrder();

  const onSubmit = (data: CreateOrderDTO) => {
    createOrder.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('orderNumber')} error={errors.orderNumber?.message} />
      <Input {...register('client')} error={errors.client?.message} />
      <Button type="submit" disabled={isSubmitting || createOrder.isPending}>
        {createOrder.isPending ? 'Tworzenie...' : 'Utworz zlecenie'}
      </Button>
    </form>
  );
}
```

---

## Notifications (Toast)

Uzywaj toast dla komunikatow:

```typescript
import { toast } from 'sonner';

// Sukces
toast.success('Zlecenie zapisane');

// Blad
toast.error('Nie udalo sie zapisac zlecenia');

// Info
toast.info('Dane zostaly odswiezone');

// Z akcja
toast('Czy chcesz cofnac?', {
  action: {
    label: 'Cofnij',
    onClick: () => handleUndo()
  }
});
```

---

## Powiazane Dokumenty

- [Tech Stack](./tech-stack.md)
- [Backend Architecture](./backend.md)
- [Communication Flow](./communication-flow.md)

---

**Ostatnia aktualizacja:** 2026-01-20
