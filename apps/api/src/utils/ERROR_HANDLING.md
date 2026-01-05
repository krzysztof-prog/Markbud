# Obsługa Błędów w Backend

## Przegląd

System obsługi błędów w backendzie składa się z trzech warstw:

1. **Custom Error Classes** - Hierarchia typowanych błędów
2. **Global Error Handler Middleware** - Centralizowana obsługa wszystkich błędów
3. **Safe Transaction Utilities** - Bezpieczne wykonywanie transakcji Prisma

---

## 1. Custom Error Classes

Plik: `apps/api/src/utils/errors.ts`

### Hierarchia

```
AppError (bazowa klasa)
├── ValidationError (400)
├── NotFoundError (404)
├── ConflictError (409)
├── UnauthorizedError (401)
├── ForbiddenError (403)
└── InternalServerError (500)
```

### Użycie w Services

```typescript
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

// Not Found
const order = await this.repository.findById(id);
if (!order) {
  throw new NotFoundError('Zamówienie');
}

// Validation Error z detalami
if (order.status === 'shipped') {
  throw new ValidationError(
    'Nie można usunąć wysłanego zlecenia',
    { status: ['Zlecenie ma status wysłane'] }
  );
}

// Conflict Error z dodatkowymi danymi
const existing = await this.repository.findByNumber(orderNumber);
if (existing) {
  throw new ConflictError(
    `Zlecenie ${orderNumber} już istnieje`,
    { existingId: existing.id, newData: orderData }
  );
}
```

**WAŻNE:** Zawsze throwuj błędy, nigdy nie zwracaj `reply.status(4xx).send()` bezpośrednio w Services!

---

## 2. Global Error Handler Middleware

Plik: `apps/api/src/middleware/error-handler.ts`

### Obsługiwane typy błędów

1. **ZodError** - Automatyczna walidacja z szczegółami
2. **Prisma Errors**:
   - `PrismaClientKnownRequestError` (P2002, P2025, P2003, P2014, P2016, P2021, P2022)
   - `PrismaClientValidationError` (błędy schematu)
   - `PrismaClientInitializationError` (błędy połączenia)
   - `PrismaClientUnknownRequestError` (nieznane błędy DB)
   - `PrismaClientRustPanicError` (krytyczne błędy)
3. **AppError** - Custom errors z hierarchii
4. **FastifyError** - Błędy Fastify
5. **Unexpected Errors** - Wszystkie inne (500)

### Format odpowiedzi

```json
{
  "statusCode": 400,
  "error": "Nieprawidłowe dane",
  "message": "Walidacja nie powiodła się",
  "code": "VALIDATION_ERROR",
  "validation": {
    "orderNumber": ["Numer zlecenia nie może być pusty"],
    "deliveryDate": ["Data dostawy jest wymagana"]
  },
  "timestamp": "2025-12-30T10:00:00.000Z",
  "requestId": "req-123-abc"
}
```

### Kody błędów Prisma

| Kod | Znaczenie | Status | Komunikat |
|-----|-----------|--------|-----------|
| P2002 | Unique constraint | 409 | Rekord z wartością {pole} już istnieje |
| P2025 | Not found | 404 | Rekord nie został znaleziony |
| P2003 | Foreign key | 400 | Nieprawidłowe odniesienie: {pole} nie istnieje |
| P2014 | Relation constraint | 409 | Nie można usunąć rekordu posiadającego powiązane rekordy |
| P2016 | Query interpretation | 500 | Błąd interpretacji zapytania |
| P2021 | Table not exist | 500 | Tabela nie istnieje w bazie danych |
| P2022 | Column not exist | 500 | Kolumna nie istnieje w bazie danych |

---

## 3. Safe Transaction Utilities

Plik: `apps/api/src/utils/safe-transaction.ts`

### Funkcje

#### `safeTransaction(prisma, fn, options?)`

Podstawowa bezpieczna transakcja z automatycznym error handling.

```typescript
import { safeTransaction } from '../utils/safe-transaction.js';

const order = await safeTransaction(prisma, async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.orderRequirement.createMany({ data: requirements });
  await tx.orderWindow.createMany({ data: windows });
  return order;
});
```

**Opcje:**
- `maxWait` - Max czas oczekiwania (default: 5000ms)
- `timeout` - Max czas wykonania (default: 10000ms)
- `isolationLevel` - Poziom izolacji

#### `safeInteractiveTransaction(prisma, fn, options?)`

Transakcja z możliwością ręcznego commit/rollback.

```typescript
import { safeInteractiveTransaction } from '../utils/safe-transaction.js';

await safeInteractiveTransaction(prisma, async (tx) => {
  const order = await tx.order.create({ data });

  // Walidacja biznesowa
  if (!isValid(order)) {
    throw new ValidationError('Nieprawidłowe dane zlecenia');
    // Automatyczny rollback
  }

  await tx.orderRequirement.createMany({ data: requirements });
  // Automatyczny commit jeśli nie ma błędów
});
```

#### `retryTransaction(prisma, fn, options?)`

Automatyczny retry dla deadlock/timeout.

```typescript
import { retryTransaction } from '../utils/safe-transaction.js';

const result = await retryTransaction(
  prisma,
  async (tx) => {
    return await tx.order.update({ where: { id }, data });
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

**Retry dla:**
- P2034 - Transaction conflict (deadlock)
- P2028 - Transaction timeout

**Opcje:**
- `maxRetries` - Max liczba prób (default: 3)
- `retryDelay` - Opóźnienie między próbami (default: 100ms, exponential backoff)

#### `batchTransaction(prisma, operations, options?)`

Wykonuje wiele operacji w jednej transakcji.

```typescript
import { batchTransaction } from '../utils/safe-transaction.js';

const results = await batchTransaction(prisma, [
  (tx) => tx.order.create({ data: order1 }),
  (tx) => tx.order.create({ data: order2 }),
  (tx) => tx.order.create({ data: order3 }),
]);
```

---

## Wzorce użycia

### ✅ DOBRZE - Handler deleguje do middleware

```typescript
export class OrderHandler {
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamsSchema.parse(request.params);
    const order = await this.service.findById(id);
    if (!order) {
      throw new NotFoundError('Zamówienie');
    }
    return reply.send(order);
  }
}
```

### ❌ ŹLE - Lokalne try-catch dla ZodError

```typescript
export class OrderHandler {
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = idParamsSchema.parse(request.params);
      // ...
    } catch (error) {
      if (error instanceof ZodError) {
        // DUPLIKACJA! Middleware już to robi
        return reply.status(400).send({ error: error.errors[0].message });
      }
    }
  }
}
```

### ✅ DOBRZE - Service rzuca custom errors

```typescript
export class OrderService {
  async deleteOrder(id: number) {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new NotFoundError('Zamówienie');
    }

    if (order.status === 'shipped') {
      throw new ValidationError(
        'Nie można usunąć wysłanego zlecenia',
        { status: ['Zlecenie ma status wysłane'] }
      );
    }

    return this.repository.delete(id);
  }
}
```

### ✅ DOBRZE - Bezpieczne transakcje

```typescript
export class OrderService {
  async createOrderWithDetails(data: CreateOrderInput) {
    return safeTransaction(this.prisma, async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: data.orderNumber,
          // ...
        },
      });

      if (data.requirements?.length) {
        await tx.orderRequirement.createMany({
          data: data.requirements.map(req => ({
            orderId: order.id,
            ...req,
          })),
        });
      }

      return order;
    });
  }
}
```

---

## Logowanie błędów

Middleware automatycznie loguje wszystkie błędy z odpowiednim poziomem:

- **logger.warn** - ValidationError, ZodError, Prisma P2002/P2003/P2014, AppError
- **logger.error** - Prisma initialization/unknown/panic, unexpected errors

Format logu:
```javascript
{
  requestId: 'req-123',
  path: '/api/orders/123',
  method: 'GET',
  statusCode: 404,
  error: 'Zamówienie nie znaleziono',
  // ... dodatkowe dane
}
```

---

## Migration Guide

### Stare handlery → Nowy wzorzec

**Przed:**
```typescript
async getAll(request, reply) {
  try {
    const filters = schema.parse(request.query);
    const data = await this.service.findAll(filters);
    return reply.send(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: error.errors[0].message });
    }
    return reply.status(500).send({ error: 'Server error' });
  }
}
```

**Po:**
```typescript
async getAll(request, reply) {
  const filters = schema.parse(request.query); // Middleware obsłuży ZodError
  const data = await this.service.findAll(filters);
  return reply.send(data);
}
```

### Stare services → Nowy wzorzec

**Przed:**
```typescript
async deleteOrder(id: number) {
  try {
    const order = await this.repository.findById(id);
    if (!order) {
      return null; // Brak jasnego błędu
    }
    return await this.repository.delete(id);
  } catch (error) {
    console.error('Delete failed', error);
    throw error;
  }
}
```

**Po:**
```typescript
async deleteOrder(id: number) {
  const order = await this.repository.findById(id);
  if (!order) {
    throw new NotFoundError('Zamówienie');
  }

  // Walidacja biznesowa
  if (order.status === 'shipped') {
    throw new ValidationError('Nie można usunąć wysłanego zlecenia');
  }

  return this.repository.delete(id);
}
```

---

## Checklist dla nowych endpointów

- [ ] Handler używa schema.parse() bez try-catch
- [ ] Handler throwuje NotFoundError dla brakujących zasobów
- [ ] Service używa custom errors (NotFoundError, ValidationError, ConflictError)
- [ ] Transakcje używają safeTransaction() lub retryTransaction()
- [ ] Wszystkie komunikaty błędów po polsku
- [ ] Brak lokalnego logowania (middleware loguje)
- [ ] ConflictError zawiera details dla klienta
- [ ] ValidationError zawiera validation object z mapą błędów

---

## Przykłady z projektu

Zobacz implementacje:
- `apps/api/src/handlers/orderHandler.ts` - Wzorcowe handlery
- `apps/api/src/services/orderService.ts` - Custom errors w Services
- `apps/api/src/services/deliveryService.ts` - Safe transactions
- `apps/api/src/handlers/glassOrderHandler.ts` - ConflictError z details
