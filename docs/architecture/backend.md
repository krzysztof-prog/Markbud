# Backend Architecture

> Dokumentacja architektury backend opartej na Fastify z wzorcem warstwowym.

---

## Layered Architecture Pattern

Backend AKROBUD wykorzystuje wzorzec warstwowy (Layered Architecture):

```
Routes → Handlers → Services → Repositories → Database
   │         │          │            │            │
   │         │          │            │            ▼
   │         │          │            │      ┌──────────┐
   │         │          │            │      │  Prisma  │
   │         │          │            │      │  Client  │
   │         │          │            │      └──────────┘
   │         │          │            │            │
   │         │          │            └────────────┼────► SQLite
   │         │          │                         │
   │         │          └─────────────────────────┘
   │         │                   Business Logic
   │         └───────────────────────────────────────► HTTP Layer
   └─────────────────────────────────────────────────► Routing
```

---

## Warstwy

### 1. Routes Layer (`src/routes/`)

Definicja endpointow Fastify + OpenAPI schemas dla Swagger.

**Odpowiedzialnosc:**
- Definicja sciezek URL
- OpenAPI/Swagger schemas
- Mapowanie na handlery

```typescript
// Przyklad: routes/orders.ts
export default async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', {
    schema: {
      tags: ['Orders'],
      summary: 'Get all orders',
      response: {
        200: OrderListResponseSchema
      }
    },
    handler: orderHandler.getAll
  });
}
```

---

### 2. Handlers Layer (`src/handlers/`)

Obsluga HTTP requests: parsowanie, walidacja Zod, response formatting.

**Odpowiedzialnosc:**
- Parsowanie request body/params/query
- Walidacja danych wejsciowych (Zod)
- Wywolanie odpowiedniego serwisu
- Formatowanie response
- NIE zawiera try-catch (middleware obsluguje bledy)

```typescript
// Przyklad: handlers/orderHandler.ts
export async function getAll(req: FastifyRequest, reply: FastifyReply) {
  const orders = await orderService.getAll();
  return reply.status(200).send(orders);
}

export async function create(req: FastifyRequest, reply: FastifyReply) {
  const data = createOrderSchema.parse(req.body);
  const order = await orderService.create(data);
  return reply.status(201).send(order);
}
```

**WAZNE:** NIE uzywaj try-catch w handlerach - middleware error handler to robi!

---

### 3. Services Layer (`src/services/`)

Logika biznesowa, orchestration, transactions.

**Odpowiedzialnosc:**
- Cala logika biznesowa
- Koordynacja miedzy repozytoriami
- Obsluga transakcji
- Walidacja regul biznesowych

```typescript
// Przyklad: services/orderService.ts
export class OrderService {
  async getAll(): Promise<Order[]> {
    return orderRepository.findAll();
  }

  async createWithRequirements(data: CreateOrderDTO) {
    // Transakcja dla powiazanych operacji
    return prisma.$transaction(async (tx) => {
      const order = await orderRepository.create(data, tx);
      await requirementService.calculateForOrder(order.id, tx);
      return order;
    });
  }
}
```

---

### 4. Repositories Layer (`src/repositories/`)

Dostep do bazy danych - wszystkie operacje Prisma.

**Odpowiedzialnosc:**
- Zapytania do bazy danych
- Mapowanie danych
- Obsluga relacji

```typescript
// Przyklad: repositories/OrderRepository.ts
export class OrderRepository {
  async findAll(): Promise<Order[]> {
    return prisma.order.findMany({
      include: { requirements: true }
    });
  }

  async findById(id: number): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
      include: { requirements: true, windows: true }
    });
  }

  async create(data: CreateOrderDTO, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.order.create({ data });
  }
}
```

---

## Middleware & Plugins

### Error Handler Middleware

Centralna obsluga bledow z kategoriami:

| Typ bledu | Kod HTTP | Kiedy |
|-----------|----------|-------|
| `ValidationError` | 400 | Bledy walidacji Zod |
| `NotFoundError` | 404 | Zasob nie znaleziony |
| `ConflictError` | 409 | Konflikt biznesowy |
| `UnauthorizedError` | 401 | Brak autoryzacji |

```typescript
// middleware/errorHandler.ts
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.errors
    });
  }

  if (error instanceof NotFoundError) {
    return reply.status(404).send({
      error: error.message
    });
  }

  // Logowanie i generyczny blad dla nieznanych bledow
  logger.error(error);
  return reply.status(500).send({
    error: 'Internal Server Error'
  });
});
```

---

### Swagger Plugin

Auto-generation dokumentacji API z schemas Zod.

```typescript
// plugins/swagger.ts
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'AKROBUD API',
      version: '1.0.0'
    }
  }
});

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs'
});
```

**Dostep:** `http://localhost:3001/docs`

---

### WebSocket Plugin

Real-time updates dla synchronizacji danych.

```typescript
// plugins/websocket.ts
websocketPlugin.broadcast('warehouse:update', { stockId, quantity });
websocketPlugin.broadcast('delivery:status', { deliveryId, status });
```

---

## Walidacja z Zod

Wszystkie dane wejsciowe sa walidowane przez Zod:

```typescript
// validators/order.ts
export const createOrderSchema = z.object({
  orderNumber: z.string().min(1),
  client: z.string().min(1),
  project: z.string().optional(),
  deadline: z.string().datetime().optional(),
  valuePln: z.number().int().min(0), // Grosze!
  valueEur: z.number().int().min(0)  // Centy!
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
```

**WAZNE:** Kwoty w groszach/centach - uzywaj `money.ts` do konwersji!

---

## Transakcje

Dla powiazanych operacji uzywaj transakcji Prisma:

```typescript
// Dobrze - atomowa operacja
await prisma.$transaction(async (tx) => {
  await tx.delivery.create({ data: deliveryData });
  await tx.order.updateMany({
    where: { id: { in: orderIds } },
    data: { deliveryId }
  });
});

// Zle - moze zostawic dane w niespojnym stanie
await prisma.delivery.create({ data: deliveryData });
await prisma.order.updateMany({ ... }); // Jesli to sie nie uda, dostawa juz istnieje
```

---

## Struktura Katalogow

```
apps/api/src/
├── routes/
│   ├── orders.ts
│   ├── deliveries.ts
│   ├── warehouse.ts
│   └── ...
├── handlers/
│   ├── orderHandler.ts
│   ├── deliveryHandler.ts
│   └── ...
├── services/
│   ├── orderService.ts
│   ├── deliveryService.ts
│   ├── import/
│   │   ├── ImportService.ts
│   │   └── parsers/
│   └── ...
├── repositories/
│   ├── OrderRepository.ts
│   ├── DeliveryRepository.ts
│   └── ...
├── validators/
│   ├── order.ts
│   ├── delivery.ts
│   └── ...
├── middleware/
│   ├── errorHandler.ts
│   └── auth.ts
├── plugins/
│   ├── swagger.ts
│   └── websocket.ts
└── utils/
    ├── money.ts        # Operacje na kwotach
    ├── logger.ts       # Winston logger
    └── errors.ts       # Custom error classes
```

---

## Powiazane Dokumenty

- [Tech Stack](./tech-stack.md)
- [Database Schema](./database.md)
- [API Endpoints](./api-endpoints.md)
- [Security Model](./security.md)

---

**Ostatnia aktualizacja:** 2026-01-20
