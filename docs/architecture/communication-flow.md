# Communication Flow

> Dokumentacja przeplywu komunikacji w systemie AKROBUD.

---

## Request Lifecycle

Pelny cykl zycia requesta od przegladarki do bazy danych:

```
┌───────────┐
│  Browser  │
└─────┬─────┘
      │
      │ HTTP Request
      ▼
┌───────────────┐
│   Next.js     │ (SSR/Client)
│   Frontend    │
└─────┬─────────┘
      │
      │ fetch() / apiClient
      ▼
┌───────────────┐
│   Fastify     │
│   Backend     │
└─────┬─────────┘
      │
      │ 1. Route matching
      ▼
┌───────────────┐
│   Handler     │
└─────┬─────────┘
      │
      │ 2. Validation (Zod)
      ▼
┌───────────────┐
│   Service     │
└─────┬─────────┘
      │
      │ 3. Business logic
      ▼
┌───────────────┐
│  Repository   │
└─────┬─────────┘
      │
      │ 4. Prisma query
      ▼
┌───────────────┐
│   SQLite DB   │
└───────────────┘
```

---

## Szczegolowy przeplyw

### 1. Browser -> Frontend

```typescript
// Frontend component wywoluje API
const { data } = useQuery({
  queryKey: ['orders'],
  queryFn: () => apiClient.get('/orders')
});
```

### 2. Frontend -> Backend

```typescript
// lib/api-client.ts
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(`${API_URL}${url}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  }
};
```

### 3. Backend - Route matching

```typescript
// routes/orders.ts
app.get('/orders', {
  schema: { /* OpenAPI schema */ },
  handler: orderHandler.getAll
});
```

### 4. Backend - Handler

```typescript
// handlers/orderHandler.ts
export async function getAll(req: FastifyRequest, reply: FastifyReply) {
  // Opcjonalnie: walidacja query params
  const filters = getOrdersQuerySchema.parse(req.query);

  // Wywolanie serwisu
  const orders = await orderService.getAll(filters);

  // Zwrocenie odpowiedzi
  return reply.status(200).send(orders);
}
```

### 5. Backend - Service

```typescript
// services/orderService.ts
export class OrderService {
  async getAll(filters?: OrderFilters): Promise<Order[]> {
    // Logika biznesowa (filtrowanie, sortowanie)
    return orderRepository.findAll(filters);
  }
}
```

### 6. Backend - Repository

```typescript
// repositories/OrderRepository.ts
export class OrderRepository {
  async findAll(filters?: OrderFilters): Promise<Order[]> {
    return prisma.order.findMany({
      where: filters ? this.buildWhereClause(filters) : undefined,
      include: { requirements: true }
    });
  }
}
```

### 7. Database -> Response

Dane wracaja ta sama sciezka w odwrotnej kolejnosci.

---

## WebSocket Communication

Real-time updates dla synchronizacji danych:

### Eventy

| Event | Opis | Payload |
|-------|------|---------|
| `warehouse:update` | Zmiana stanu magazynu | `{ stockId, quantity }` |
| `delivery:status` | Zmiana statusu dostawy | `{ deliveryId, status }` |
| `order:created` | Nowe zlecenie | `{ orderId, orderNumber }` |
| `import:progress` | Postep importu | `{ importId, progress, total }` |

### Server-side (emit)

```typescript
// services/warehouseService.ts
export class WarehouseService {
  async updateStock(stockId: number, quantity: number) {
    const stock = await warehouseRepository.updateStock(stockId, quantity);

    // Broadcast do wszystkich klientow
    websocketPlugin.broadcast('warehouse:update', {
      stockId,
      quantity: stock.currentStockBeams
    });

    return stock;
  }
}
```

### Client-side (listen)

```typescript
// hooks/useRealtimeSync.ts
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`ws://${API_HOST}`);

    ws.addEventListener('message', (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'warehouse:update':
          queryClient.invalidateQueries({ queryKey: ['warehouse'] });
          break;
        case 'delivery:status':
          queryClient.invalidateQueries({ queryKey: ['deliveries'] });
          break;
        case 'order:created':
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          break;
      }
    });

    return () => ws.close();
  }, [queryClient]);
}
```

---

## Diagramy sekwencji

### Tworzenie zlecenia

```
Browser          Frontend        Backend         Database
   │                │               │               │
   │ Click "Zapisz" │               │               │
   │───────────────>│               │               │
   │                │ POST /orders  │               │
   │                │──────────────>│               │
   │                │               │ Validate      │
   │                │               │──────┐        │
   │                │               │<─────┘        │
   │                │               │ INSERT        │
   │                │               │──────────────>│
   │                │               │<──────────────│
   │                │ 201 Created   │               │
   │                │<──────────────│               │
   │ Toast success  │               │               │
   │<───────────────│               │               │
   │                │ invalidate    │               │
   │                │ queries       │               │
   │<───────────────│               │               │
```

### Real-time update

```
User A          Server          User B          User C
   │               │               │               │
   │ Update stock  │               │               │
   │──────────────>│               │               │
   │               │ broadcast     │               │
   │               │──────────────>│               │
   │               │──────────────────────────────>│
   │               │               │ invalidate    │
   │               │               │ queries       │
   │               │               │               │ invalidate
   │               │               │               │ queries
```

---

## Error Handling Flow

```
┌───────────┐
│  Request  │
└─────┬─────┘
      │
      ▼
┌───────────────────────┐
│  Handler              │
│  (no try-catch!)      │
└─────┬─────────────────┘
      │
      │ Error thrown
      ▼
┌───────────────────────┐
│  Error Handler        │
│  Middleware           │
└─────┬─────────────────┘
      │
      │ Categorize error
      ▼
┌───────────────────────────────────────────────┐
│  ZodError?     → 400 Bad Request              │
│  NotFoundError → 404 Not Found                │
│  ConflictError → 409 Conflict                 │
│  Other         → 500 Internal Server Error    │
└───────────────────────────────────────────────┘
      │
      ▼
┌───────────────────────┐
│  JSON Response        │
│  { error, details }   │
└───────────────────────┘
```

---

## Powiazane Dokumenty

- [Backend Architecture](./backend.md)
- [Frontend Architecture](./frontend.md)
- [Security Model](./security.md)

---

**Ostatnia aktualizacja:** 2026-01-20
