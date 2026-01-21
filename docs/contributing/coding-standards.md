# Coding Standards

Standardy kodowania obowiazujace w projekcie AKROBUD.

---

## Spis Tresci

- [TypeScript](#typescript)
- [Backend (Fastify + Prisma)](#backend-fastify--prisma)
- [Frontend (Next.js + React)](#frontend-nextjs--react)
- [Code Style](#code-style)

---

## TypeScript

### Ogolne zasady

- Uzywaj TypeScript strict mode
- Unikaj `any` - uzywaj `unknown` lub proper types
- Definiuj interfejsy dla obiektow
- Uzywaj generics dla reusable logic

### Przyklad

```typescript
// ZLE
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// DOBRE
interface DataItem {
  value: number;
  label: string;
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}
```

---

## Backend (Fastify + Prisma)

### Layered Architecture

```
Route -> Handler -> Service -> Repository -> Database
```

### Nazewnictwo plikow

- kebab-case: `order-service.ts`, `delivery-handler.ts`
- Klasy: PascalCase: `OrderService`, `DeliveryHandler`

### Walidacja

- Zawsze uzywaj Zod schemas w handlerach
- Never trust client input

```typescript
// handler
import { createOrderSchema } from '../validators/order';

export async function createOrder(req: FastifyRequest, reply: FastifyReply) {
  const data = createOrderSchema.parse(req.body);
  const order = await orderService.create(data);
  return reply.status(201).send(order);
}
```

### Error Handling

- Throwuj custom errors (ValidationError, NotFoundError)
- Nigdy nie catchuj bledow w handlerach - pozwol middleware obsluzyc

```typescript
// DOBRE
if (!order) {
  throw new NotFoundError('Zlecenie', orderId);
}

// ZLE
try {
  // ... logic
} catch (error) {
  return reply.status(500).send({ error });
}
```

### Database Transactions

- Uzywaj transakcji dla multi-step operations

```typescript
return prisma.$transaction(async (tx) => {
  const order = await orderRepository.create(data, tx);
  await requirementService.calculate(order.id, tx);
  return order;
});
```

**Wiecej:** [Backend Guidelines](../../.claude/skills/backend-dev-guidelines/)

---

## Frontend (Next.js + React)

### File Organization

- Feature-based structure
- Colocation - trzymaj powiazane pliki razem

```
features/
  deliveries/
    api/
      deliveriesApi.ts
    components/
      DeliveryCard.tsx
      DeliveryList.tsx
    hooks/
      useDeliveries.ts
    types/
      delivery.types.ts
```

### Components

- Uzywaj functional components
- Destructure props
- TypeScript interfaces dla props

```typescript
interface OrderCardProps {
  order: Order;
  onEdit?: (id: string) => void;
}

export function OrderCard({ order, onEdit }: OrderCardProps) {
  // ... component logic
}
```

### Data Fetching

- Uzywaj React Query dla server state
- Define custom hooks

```typescript
// api/ordersApi.ts
export async function fetchOrders() {
  return apiClient.get<Order[]>('/orders');
}

// hooks/useOrders.ts
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders
  });
}

// Component
const { data, isLoading } = useOrders();
```

### Dynamic Imports

- Zawsze uzywaj `.then((mod) => mod.default)` w Next.js 15

```typescript
// DOBRE
const Component = dynamic(
  () => import('./Component').then((mod) => mod.default),
  { ssr: false }
);

// ZLE
const Component = dynamic(() => import('./Component'));
```

### Styling

- TailwindCSS dla styling
- Shadcn/ui dla komponentow
- Unikaj inline styles

**Wiecej:** [Frontend Guidelines](../../.claude/skills/frontend-dev-guidelines/)

---

## Code Style

### Formatting

- Uzywamy Prettier (automatyczne formatowanie)
- 2 spaces indentation
- Single quotes
- Semicolons

### Linting

```bash
# Sprawdz linting
pnpm lint

# Auto-fix
pnpm lint:fix
```

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
