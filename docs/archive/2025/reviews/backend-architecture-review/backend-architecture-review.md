# Backend Architecture Code Review

**Last Updated: 2025-12-30**

## Executive Summary

Przeanalizowano architekturę backendu w `apps/api/src` pod kątem zgodności z zasadami layered architecture (Routes → Handlers → Services → Repositories), Single Responsibility Principle, walidacji, error handlingu i użycia transakcji Prisma.

**Ogólna ocena: 7/10** - Architektura jest w większości dobrze zaprojektowana i konsekwentna, ale istnieją krytyczne problemy naruszające warstwowość i SRP.

### Kluczowe osiągnięcia
- Konsekwentna implementacja layered architecture w większości modułów
- Centralized error handling z custom error classes
- Walidacja na właściwej warstwie (handlers) przy użyciu Zod
- Prawidłowe użycie transakcji Prisma w większości przypadków

### Główne problemy
- **KRYTYCZNE**: Bezpośrednie zapytania Prisma w route handlers (naruszenie layered architecture)
- **KRYTYCZNE**: Logika biznesowa w route handlers zamiast w services
- Brak warstwy Repository w wielu miejscach - bezpośrednie użycie Prisma w services
- Niespójność w niektórych routes (część deleguje do handlers, część zawiera inline logic)
- Brakujące transakcje w niektórych operacjach wielokrokowych

---

## Critical Issues (Must Fix)

### 1. KRYTYCZNE: Logika biznesowa w Routes - naruszenie layered architecture

#### Problem: `apps/api/src/routes/orders.ts`

**Linie 53-91: PATCH endpoint z bezpośrednią logiką biznesową**
```typescript
// ❌ BŁĄD - logika biznesowa bezpośrednio w route
fastify.patch<{...}>('/:id', {
  preHandler: verifyAuth,
}, async (request) => {
  const { id } = request.params;
  const { valuePln, valueEur, deadline, status } = request.body;

  const updateData: Prisma.OrderUpdateInput = {};

  // Parsowanie danych - powinno być w handler/validator
  if (valuePln !== undefined) {
    updateData.valuePln = valuePln !== null ? parseFloat(valuePln) : null;
  }

  // Bezpośrednie zapytanie Prisma - powinno być w service/repository
  const order = await prisma.order.update({
    where: { id: parseIntParam(id, 'id') },
    data: updateData,
  });

  // Emit event - OK, ale powinno być w service
  emitOrderUpdated(order);

  return order;
});
```

**Dlaczego to problem:**
- Naruszenie layered architecture - route powinien tylko delegować do handler
- Walidacja i parsowanie powinno być w handler/validator
- Zapytanie DB powinno być w service/repository
- Emisja eventów powinna być w service
- Nie ma Zod validation schema - niespójne z resztą endpointów

**Jak powinno wyglądać:**
```typescript
// ✅ POPRAWNIE - delegacja do handler
fastify.patch<{...}>('/:id', {
  preHandler: verifyAuth,
}, handler.partialUpdate.bind(handler));

// W handlers/orderHandler.ts
async partialUpdate(request, reply) {
  const { id } = orderParamsSchema.parse(request.params);
  const validated = partialUpdateOrderSchema.parse(request.body);
  const order = await this.service.partialUpdateOrder(parseInt(id), validated);
  return reply.send(order);
}
```

**Linie 94-122: PDF check endpoint z bezpośrednimi zapytaniami DB**
```typescript
// ❌ BŁĄD - zapytania Prisma w route
fastify.get<{...}>('/:id/has-pdf', {
  preHandler: verifyAuth,
}, async (request, reply) => {
  const { id } = request.params;

  // Bezpośrednie zapytanie - powinno być w service
  const order = await prisma.order.findUnique({
    where: { id: parseIntParam(id, 'id') },
  });

  // Logika biznesowa - powinno być w service
  const pdfImport = await prisma.fileImport.findFirst({
    where: {
      fileType: 'ceny_pdf',
      status: 'completed',
      metadata: { contains: `"orderId":${order.id}` },
    },
    orderBy: { processedAt: 'desc' },
  });

  return reply.send({
    hasPdf: !!pdfImport && existsSync(pdfImport.filepath),
    filename: pdfImport?.filename || null
  });
});
```

**Linie 124-162: PDF download z file streaming logic**
```typescript
// ❌ BŁĄD - powtórzona logika + file streaming w route
fastify.get<{...}>('/:id/pdf', {
  preHandler: verifyAuth,
}, async (request, reply) => {
  // Powtórzenie logiki z has-pdf
  const order = await prisma.order.findUnique({...});
  const pdfImport = await prisma.fileImport.findFirst({...});

  // File streaming - OK w route dla performance, ale logic powinien być wydzielony
  reply.header('Content-Type', 'application/pdf');
  const stream = createReadStream(pdfImport.filepath);
  return reply.send(stream);
});
```

**Linie 165-268: Orders table endpoint - złożona logika**
```typescript
// ❌ BŁĄD - złożona logika biznesowa w route
fastify.get<{...}>('/table/:colorId', {
  preHandler: verifyAuth,
}, async (request) => {
  // Multiple Prisma queries
  const visibleProfiles = await prisma.profileColor.findMany({...});
  const orders = await prisma.order.findMany({...});

  // Complex business logic
  const tableData = orders.map((order) => {
    const requirements: Record<string, ...> = {};
    for (const req of order.requirements) {
      requirements[req.profile.number] = {...};
    }
    return {...};
  });

  // More calculation logic
  const totals: Record<string, ...> = {};
  for (const profile of visibleProfiles) {...}

  return { profiles, orders: tableData, totals };
});
```

**Linie 271-309: Requirements totals - aggregation logic**
```typescript
// ❌ BŁĄD - logika agregacji w route
fastify.get('/requirements/totals', {
  preHandler: verifyAuth,
}, async () => {
  const requirements = await prisma.orderRequirement.findMany({...});

  // Complex aggregation logic - powinno być w service
  const totals: Record<string, ...> = {};
  for (const req of requirements) {
    const key = `${req.profileId}-${req.colorId}`;
    if (!totals[key]) {...}
    totals[key].totalBeams += req.beamsCount;
  }

  return Object.values(totals);
});
```

**Rekomendacja:** Przenieś wszystkie te endpointy do OrderHandler i OrderService.

---

#### Problem: `apps/api/src/routes/settings.ts`

**Linie 46-131: Browse folders endpoint - filesystem logic w route**
```typescript
// ❌ BŁĄD - logika filesystemu bezpośrednio w route
fastify.get<{...}>('/browse-folders', { preHandler: verifyAuth }, async (request, reply) => {
  const requestedPath = request.query.path || '';

  // Drive enumeration logic - powinno być w service
  if (!requestedPath) {
    const drives: { name: string; path: string; type: 'drive' }[] = [];
    for (let charCode = 65; charCode <= 90; charCode++) {
      const driveLetter = String.fromCharCode(charCode);
      const drivePath = `${driveLetter}:\\`;
      try {
        fs.accessSync(drivePath, fs.constants.R_OK);
        drives.push({...});
      } catch {}
    }
    return { currentPath: '', parent: null, items: drives };
  }

  // Directory traversal logic - security sensitive!
  const normalizedPath = path.normalize(requestedPath);

  // File system operations - powinno być w service
  const stats = fs.statSync(normalizedPath);
  const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });

  // Business logic filtering - powinno być w service
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (['$RECYCLE.BIN', ...].includes(entry.name)) continue;
    if (entry.isDirectory()) {...}
  }

  return {...};
});
```

**Dlaczego to krytyczne:**
- **Security concern**: Path traversal logic powinien być w service z odpowiednimi testami
- Złożona logika filesystemu w route handler
- Brak walidacji Zod (niespójne z resztą API)
- Trudne do testowania

**Linie 133-159: Validate folder endpoint**
```typescript
// ❌ BŁĄD - filesystem validation w route
fastify.post<{...}>('/validate-folder', { preHandler: verifyAuth }, async (request, reply) => {
  const { path: folderPath } = request.body;

  // Brak Zod validation!
  if (!folderPath) {
    return reply.status(400).send({ error: 'Ścieżka jest wymagana', valid: false });
  }

  // Filesystem operations - powinno być w service
  const stats = fs.statSync(normalizedPath);
  fs.accessSync(normalizedPath, fs.constants.R_OK);

  return { valid: true, path: normalizedPath };
});
```

**Linie 162-197: File watcher endpoints**
```typescript
// ⚠️ CZĘŚCIOWO OK - ale mogłoby być lepsze
fastify.get('/file-watcher/status', { preHandler: verifyAuth }, async () => {
  // Direct access do global fileWatcher - mogłoby być przez service
  if (!fileWatcher) {
    return { running: false, paths: null };
  }
  const paths = await fileWatcher.getCurrentPaths();
  return { running: true, paths };
});

fastify.post('/file-watcher/restart', { preHandler: verifyAuth }, async (request, reply) => {
  // Direct file watcher manipulation
  await fileWatcher.restart();
  const paths = await fileWatcher.getCurrentPaths();
  return { success: true, message: '...', paths };
});
```

**Rekomendacja:** Przenieś całą logikę filesystem i file watcher do SettingsHandler i SettingsService.

---

#### Problem: `apps/api/src/routes/warehouse.ts`

**CAŁY PLIK (709 linii) - brak layered architecture**

Ten route jest kompletnie bez Handler i Service layers. Wszystkie endpointy zawierają:
- Bezpośrednie zapytania Prisma
- Logikę biznesową
- Obliczenia
- Brak walidacji Zod

**Przykłady:**

**Linie 7-137: GET warehouse table**
```typescript
// ❌ BŁĄD - cały endpoint w route
fastify.get<{...}>('/:colorId', async (request) => {
  // Multiple Prisma queries
  const stocks = await prisma.warehouseStock.findMany({...});
  const demands = await prisma.orderRequirement.groupBy({...});
  const allWarehouseOrders = await prisma.warehouseOrder.findMany({...});

  // Complex business logic
  const demandMap = new Map(...);
  const pendingOrdersMap = new Map<number, any[]>();
  const receivedOrdersMap = new Map<number, any[]>();

  // Settings query
  const lowThresholdSetting = await prisma.setting.findUnique({...});
  const lowThreshold = parseInt(lowThresholdSetting?.value || '10');

  // Data transformation
  const tableData = stocks.map((stock) => {
    const demand = demandMap.get(stock.profileId) || {...};
    const afterDemand = stock.currentStockBeams - demand.beams;
    // ... więcej logiki
    return {...};
  });

  return { color: colorInfo, data: tableData };
});
```

**Linie 179-264: POST monthly update - TRANSAKCJA OK, ale w route**
```typescript
// ✅ Transakcja OK, ale ❌ w złym miejscu
fastify.post<{...}>('/monthly-update', async (request) => {
  const { colorId, updates } = request.body;  // Brak walidacji Zod!

  const results = [];

  // ✅ DOBRZE: Use transaction
  for (const update of updates) {
    const result = await prisma.$transaction(async (tx) => {
      const currentStock = await tx.warehouseStock.findUnique({...});
      const calculatedStock = currentStock?.currentStockBeams || 0;
      const difference = update.actualStock - calculatedStock;

      await tx.warehouseHistory.create({...});
      await tx.warehouseStock.update({...});

      return {...};
    });
    results.push(result);
  }

  // More business logic
  const archivedOrders = await prisma.order.updateMany({...});

  return { updates: results, archivedOrdersCount: archivedOrders.count };
});
```

**Linie 327-432: POST rollback inventory - złożona logika transakcyjna**
```typescript
// ❌ BŁĄD - bardzo złożona logika w route
fastify.post<{...}>('/rollback-inventory', async (request, reply) => {
  const { colorId } = request.body;  // Brak walidacji!

  // Business logic
  const lastInventoryRecords = await prisma.warehouseHistory.findMany({...});
  const latestDate = lastInventoryRecords[0].recordedAt;
  const hoursSinceInventory = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);

  // Validation logic - powinno być w service
  if (hoursSinceInventory >= 24) {
    return reply.status(400).send({...});
  }

  // Filtering logic
  const inventoryToRollback = lastInventoryRecords.filter((record) => {
    const timeDiff = Math.abs(latestDate.getTime() - record.recordedAt.getTime());
    return timeDiff < 60000;
  });

  // ✅ DOBRZE: Complex transaction
  const result = await prisma.$transaction(async (tx) => {
    // Multiple operations
    for (const record of inventoryToRollback) {
      await tx.warehouseStock.update({...});
      await tx.warehouseHistory.delete({...});
    }

    // Find and restore orders
    const archivedOrders = await tx.order.findMany({...});
    if (archivedOrders.length > 0) {
      await tx.order.updateMany({...});
    }

    return {...};
  });

  return { success: true, message: '...', ...result };
});
```

**Rekomendacja:** Stwórz WarehouseHandler i WarehouseService. To PRIORYTET 1 - największy plik bez layered architecture.

---

#### Problem: `apps/api/src/routes/schuco.ts`

**Częściowo OK** - większość deleguje do SchucoHandler, ale:

**Linie 186-218: DEBUG endpoint z bezpośrednimi zapytaniami**
```typescript
// ❌ BŁĄD - debug endpoint powinien też używać handler/service
fastify.get('/debug/changed', { preHandler: verifyAuth }, async (request, reply) => {
  const [newCount, updatedCount, totalCount] = await Promise.all([
    fastify.prisma.schucoDelivery.count({ where: { changeType: 'new' } }),
    fastify.prisma.schucoDelivery.count({ where: { changeType: 'updated' } }),
    fastify.prisma.schucoDelivery.count(),
  ]);

  const changedRecords = await fastify.prisma.schucoDelivery.findMany({...});

  return reply.send({...});
});
```

**Linie 237-242: Sync links endpoint - częściowa delegacja**
```typescript
// ⚠️ NIESPÓJNE - niektóre endpoints używają handler, inne service directly
handler: async (request, reply) => {
  const result = await schucoService.syncAllOrderLinks();  // OK, ale niespójne
  return reply.send(result);
},
```

**Linie 273-278, 307-312, 336-341: Inline handlers**
```typescript
// ❌ BŁĄD - inline handlers zamiast delegacji do schucoHandler
handler: async (request, reply) => {
  const { limit } = request.query as { limit?: number };
  const deliveries = await schucoService.getUnlinkedDeliveries(limit);
  return reply.send(deliveries);
},
```

**Rekomendacja:** Przenieś wszystkie inline handlers do SchucoHandler dla spójności.

---

### 2. KRYTYCZNE: Brak walidacji Zod w niektórych endpointach

#### Endpointy bez walidacji:
1. `routes/orders.ts:53-91` - PATCH /:id (inline)
2. `routes/settings.ts:46-131` - browse-folders
3. `routes/settings.ts:133-159` - validate-folder
4. `routes/warehouse.ts` - WSZYSTKIE endpointy (cały plik)

**Dlaczego to problem:**
- Niespójność z resztą API (wszystkie inne używają Zod)
- Brak type safety
- Podatność na błędy runtime
- Trudniejsze testowanie

**Rekomendacja:** Dodaj Zod schemas dla wszystkich endpointów.

---

### 3. WYSOKIE: Brak Repository layer - bezpośrednie użycie Prisma w Services

Większość services używa Prisma bezpośrednio zamiast przez Repository:

#### Problem: `apps/api/src/services/deliveryService.ts`

```typescript
// ❌ CZĘŚCIOWO BŁĄD - mix repository i direct Prisma
export class DeliveryService {
  constructor(private repository: DeliveryRepository) {
    // ✅ Używa repository
  }

  async addOrderToDelivery(deliveryId: number, orderId: number) {
    const delivery = await this.getDeliveryById(deliveryId);  // ✅ Przez service method

    // ❌ BŁĄD - direct Prisma query zamiast repository
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    // OK - używa repository
    const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(...);
  }

  // ❌ BŁĄD - direct Prisma w service
  async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const existingDeliveries = await tx.$queryRaw<...>`...`;
      // ...
    });
  }
}
```

#### Problem: `apps/api/src/services/importService.ts`

```typescript
// ❌ BŁĄD - extensive direct Prisma usage
export class ImportService {
  constructor(private repository: ImportRepository) {}

  // Multiple direct Prisma calls:
  // Linia 55: await prisma.userFolderSettings.findUnique({...})
  // Linia 155: await prisma.pendingOrderPrice.create({...})
  // Linia 367: await prisma.pendingOrderPrice.create({...})
  // Linia 480-507: await prisma.$transaction(...)
  // Linia 743: await this.repository.findOrderByOrderNumber(...)  // ✅

  // W sumie: ~15 direct Prisma calls + ~20 repository calls
}
```

**Dlaczego to problem:**
- Naruszenie Repository pattern
- Trudniejsze testowanie (trzeba mockować Prisma zamiast Repository)
- Mieszanie poziomów abstrakcji
- Potencjalne duplikaty zapytań

**Rekomendacja:**
- Przenieś wszystkie zapytania Prisma do Repository layer
- Service powinien używać TYLKO repository methods
- Wyjątek: transakcje mogą być w service jeśli orchestrują wiele repository calls

---

### 4. WYSOKIE: Niespójna obsługa transakcji

#### Problem 1: Brak transakcji w operacjach wielokrokowych

**`services/deliveryService.ts:273-294` - completeDelivery**
```typescript
// ⚠️ POTENCJALNY PROBLEM - brak transakcji
async completeDelivery(deliveryId: number, productionDate: string) {
  const delivery = await this.repository.getDeliveryOrders(deliveryId);
  const orderIds = delivery.deliveryOrders.map((d) => d.orderId);

  // ❌ BŁĄD - batch update bez transakcji
  // Co jeśli ta operacja się nie powiedzie w połowie?
  await this.repository.updateOrdersBatch(orderIds, {
    productionDate: parseDate(productionDate),
    status: 'completed',
  });

  // Events są emitowane nawet jeśli część orders nie zostanie zaktualizowana
  emitDeliveryUpdated({ id: deliveryId });
  orderIds.forEach((orderId) => {
    emitOrderUpdated({ id: orderId });
  });

  return { success: true, updatedOrders: orderIds.length };
}
```

**Powinno być:**
```typescript
async completeDelivery(deliveryId: number, productionDate: string) {
  return await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({...});

    // Update all orders atomically
    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { productionDate, status: 'completed' },
    });

    return { success: true, updatedOrders: orderIds.length };
  });
  // Events AFTER successful transaction
}
```

#### Problem 2: Transakcje w service vs repository

**`services/deliveryService.ts:91-111` - generateDeliveryNumber**
```typescript
// ✅ DOBRZE: Transakcja w service z raw SQL + FOR UPDATE
private async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const existingDeliveries = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM deliveries
      WHERE delivery_date >= ${start.getTime()}
        AND delivery_date <= ${end.getTime()}
      FOR UPDATE  -- ✅ Prevents race conditions
    `;

    const count = Number(existingDeliveries[0]?.count || 0n) + 1;
    return `${datePrefix}_${toRomanNumeral(count)}`;
  });
}
```

**To jest OK** - transakcja z row locking dla race condition prevention.

**Ale:** `repositories/DeliveryRepository.ts` również ma podobne transakcje. Niespójność gdzie powinny być.

---

## Important Improvements (Should Fix)

### 5. Services bezpośrednio używają Prisma zamiast Repository

**Przykład: OrderService**
```typescript
// ✅ DOBRZE zaprojektowany - używa TYLKO repository
export class OrderService {
  constructor(private repository: OrderRepository) {}

  async getAllOrders(filters: {...}) {
    return this.repository.findAll(filters);  // ✅
  }

  async getOrderById(id: number) {
    const order = await this.repository.findById(id);  // ✅
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  async deleteOrder(id: number) {
    const order = await this.getOrderById(id);  // ✅ Przez service method

    // ✅ Business logic validation
    const deliveries = await this.repository.getOrderDeliveries(id);
    const hasShippedOrDelivered = deliveries.some(...);
    if (hasShippedOrDelivered) throw new ValidationError('...');

    await this.repository.delete(id);  // ✅
    emitOrderDeleted(id);
  }
}
```

**To jest wzorcowa implementacja!** OrderService to najlepszy przykład w projekcie.

**Ale:** DeliveryService i ImportService mieszają Repository + direct Prisma.

---

### 6. Error handling - w większości OK, ale drobne problemy

**`middleware/error-handler.ts` - ✅ DOBRZE zaprojektowany**

Centralized error handling z:
- Custom AppError classes
- Zod validation errors
- Prisma errors
- Fastify errors
- Unexpected errors

**Ale drobne problemy:**

**1. Brak error code mapping dla niektórych Prisma errors**
```typescript
// error-handler.ts:165-211
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002': // ✅ Unique constraint
    case 'P2025': // ✅ Not found
    case 'P2003': // ✅ FK constraint
    case 'P2014': // ✅ Required relation
    default:
      // ⚠️ Inne kody Prisma jako generic 500
      return {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
  }
}
```

**Rekomendacja:** Dodaj więcej specific Prisma error codes (P2001, P2004, P2015, etc.)

**2. ValidationError z optional errors field**
```typescript
// utils/errors.ts:16-21
export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

**Problem:** Niektóre miejsca używają errors field, inne nie. Niespójność:
```typescript
// importService.ts:694
throw new ValidationError('Brak daty w nazwie folderu', {
  format: ['Oczekiwany format: DD.MM.YYYY'],  // ✅ Używa errors
});

// orderService.ts:71-75
throw new ValidationError(
  'Nie można usunąć zlecenia...'  // ❌ Nie używa errors field
);
```

**Rekomendacja:** Spójne używanie errors field lub stwórz osobną klasę dla validation errors z details.

---

### 7. Handlers - w większości OK, ale brak spójności w response formatach

**Przykład dobry: OrderHandler**
```typescript
// ✅ DOBRZE - konsekwentna struktura
export class OrderHandler {
  constructor(private service: OrderService) {}

  async getAll(request, reply) {
    const validated = orderQuerySchema.parse(request.query);  // ✅ Zod validation
    const orders = await this.service.getAllOrders(validated);  // ✅ Delegacja do service
    return reply.send(orders);  // ✅ Zwraca dane bezpośrednio
  }

  async create(request, reply) {
    const validated = createOrderSchema.parse(request.body);  // ✅
    const order = await this.service.createOrder(validated);  // ✅
    return reply.status(201).send(order);  // ✅ Proper HTTP status
  }
}
```

**Problem: Niespójne response formaty**

Niektóre endpointy zwracają:
```typescript
// Format 1: Data bezpośrednio
return reply.send(orders);

// Format 2: Wrapped w success
return reply.send({ success: true, result: {...} });

// Format 3: Wrapped z message
return reply.send({ success: true, message: '...', data: {...} });

// Format 4: Custom shape
return reply.send({ color: colorInfo, data: tableData });
```

**Rekomendacja:** Ustal jeden standardowy format response:
```typescript
// Proposal: Zawsze zwracaj dane bezpośrednio, errors przez error handler
// Success responses:
return reply.send(data);  // GET, POST, PUT, PATCH
return reply.status(204).send();  // DELETE

// Errors przez middleware (już działa):
throw new NotFoundError('Order');
```

---

### 8. Brak validation middleware - Zod schemas stosowane manualnie

**Obecnie:**
```typescript
// handlers/orderHandler.ts
async getAll(request, reply) {
  const validated = orderQuerySchema.parse(request.query);  // ✅ Działa, ale...
  const orders = await this.service.getAllOrders(validated);
  return reply.send(orders);
}
```

**Problem:**
- Schema jest parsowany w handler - powtarzalny kod
- Brak centralized validation
- Jeśli zapomnimy `.parse()`, nie ma walidacji

**Lepsze rozwiązanie:**
```typescript
// Stwórz validation middleware
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      // Error handler automatically catches ZodError
      throw error;
    }
  };
}

// Użycie w routes:
fastify.post('/', {
  preHandler: [verifyAuth, validate(createOrderSchema)],
}, handler.create.bind(handler));

// Handler bez manual validation:
async create(request, reply) {
  // request.body jest już zwalidowany i ma prawidłowy typ
  const order = await this.service.createOrder(request.body);
  return reply.status(201).send(order);
}
```

---

## Minor Suggestions (Nice to Have)

### 9. Event emitters - OK, ale mogłoby być lepsze

**`services/event-emitter.ts`** - używane dla WebSocket updates

**Obecnie:**
```typescript
// events emitowane z różnych miejsc:
// 1. W services (✅ OK)
emitOrderUpdated(order);

// 2. W routes (❌ BŁĄD - powinno być w service)
emitOrderUpdated({ id: orderId });

// 3. W repositories (⚠️ Wątpliwe - lepiej w service)
```

**Rekomendacja:**
- Events powinny być emitowane TYLKO w service layer
- Nigdy w routes ani repositories
- Consistent shape - zawsze cały obiekt lub zawsze tylko ID

---

### 10. Inconsistent naming conventions

**Pliki:**
```
✅ DOBRZE: orderService.ts, OrderService class
✅ DOBRZE: orderHandler.ts, OrderHandler class
❌ NIESPÓJNE: DeliveryProtocolService.ts (PascalCase file)
❌ NIESPÓJNE: event-emitter.ts (kebab-case service)
```

**Zmienne:**
```typescript
// Większość OK:
const order = await this.repository.findById(id);  // ✅
const deliveryOrder = await this.service.addOrder(...);  // ✅

// Ale czasem:
const fileImport = await this.repository.create({...});  // ⚠️ camelCase for DB entity
const FileImport = await prisma.fileImport.findUnique({...});  // Prisma type
```

**Rekomendacja:** Stick to project conventions:
- Files: camelCase (orderService.ts)
- Classes: PascalCase (OrderService)
- Variables: camelCase
- DB entities (Prisma types): PascalCase

---

### 11. Brak consistent logging strategy

**Obecnie:**
```typescript
// Niektóre miejsca używają logger
logger.info('Processing import', { importId, orderNumber });
logger.error('Import failed', { error });

// Inne używają console
console.log('Starting server...');

// Niektóre w ogóle nie logują
```

**Rekomendacja:**
- Zawsze używaj logger z `utils/logger.ts`
- Dodaj structured logging dla wszystkich ważnych operacji
- Log levels: error (failures), warn (issues), info (important events), debug (details)

---

### 12. Repository pattern inconsistency

**Obecny stan:**
- `OrderRepository` - ✅ exists, used consistently
- `DeliveryRepository` - ✅ exists, mostly used
- `ImportRepository` - ✅ exists, partially used
- `SettingsRepository` - ✅ exists, used consistently
- **WarehouseRepository** - ❌ NIE ISTNIEJE (wszystko w route)
- **SchucoRepository** - ❌ NIE ISTNIEJE (service używa Prisma directly)

**Rekomendacja:** Create missing repositories for consistency.

---

## Architecture Considerations

### Obecna architektura (Większość modułów)

```
Routes (routing tylko)
  ↓ delegacja
Handlers (walidacja Zod + response handling)
  ↓ delegacja
Services (logika biznesowa + transakcje)
  ↓ delegacja
Repositories (zapytania DB Prisma)
```

**✅ To jest PRAWIDŁOWE** - występuje w:
- orders (wzorcowy przykład)
- deliveries (prawie wzorcowy)
- imports (większość)
- settings (większość)

### Problematyczna architektura (Niektóre routes)

```
Routes (wszystko inline)
  ↓
Direct Prisma + logika biznesowa + walidacja
```

**❌ To jest BŁĘDNE** - występuje w:
- warehouse (cały moduł)
- orders (niektóre endpointy: PATCH, PDF, table, totals)
- settings (browse-folders, validate-folder, file-watcher)
- schuco (niektóre inline handlers)

### Rekomendowana struktura

**WSZYSTKIE moduły powinny mieć:**

```
1. routes/moduleName.ts
   - TYLKO routing i delegacja do handler
   - preHandler: verifyAuth
   - schema definitions (opcjonalnie, jeśli nie w validators)
   - handler: handler.methodName.bind(handler)

2. handlers/moduleNameHandler.ts
   - Request/Response handling
   - Zod validation: schema.parse(request.body/query/params)
   - HTTP status codes
   - Delegacja do service
   - NO business logic, NO Prisma queries

3. services/moduleNameService.ts
   - Business logic
   - Transaction orchestration
   - Event emission
   - Delegacja do repository
   - NO direct Prisma (poza transakcjami orchestrującymi repository)

4. repositories/ModuleNameRepository.ts
   - Database access (Prisma only)
   - CRUD operations
   - Query building
   - NO business logic

5. validators/moduleName.ts
   - Zod schemas
   - Type exports
   - Shared validation logic
```

---

## Transaction Strategy Recommendations

### Kiedy używać transakcji:

**1. Multiple related DB operations (MUST use transaction)**
```typescript
// ✅ DOBRZE
async moveOrderBetweenDeliveries(sourceId, targetId, orderId) {
  return await prisma.$transaction(async (tx) => {
    // Remove from source
    await tx.deliveryOrder.delete({...});

    // Add to target
    await tx.deliveryOrder.create({...});

    // All or nothing - atomic
  });
}
```

**2. Race condition prevention (MUST use transaction + locking)**
```typescript
// ✅ DOBRZE - FOR UPDATE lock
async generateDeliveryNumber(date: Date) {
  return await prisma.$transaction(async (tx) => {
    const count = await tx.$queryRaw`
      SELECT COUNT(*) FROM deliveries
      WHERE delivery_date = ${date}
      FOR UPDATE  -- ✅ Row-level lock
    `;
    return generateNumber(count);
  });
}
```

**3. Batch operations (SHOULD use transaction)**
```typescript
// ⚠️ OBECNIE BEZ TRANSAKCJI - powinno mieć
async completeDelivery(deliveryId, productionDate) {
  // To powinno być w transakcji!
  await this.repository.updateOrdersBatch(orderIds, {
    productionDate,
    status: 'completed',
  });
}
```

### Gdzie transakcje powinny być:

**Service layer** - gdy orchestrują multiple repository calls:
```typescript
// service/orderService.ts
async deleteOrderWithRelations(id: number) {
  return await prisma.$transaction(async (tx) => {
    await this.repository.deleteRequirements(id, tx);
    await this.repository.deleteWindows(id, tx);
    await this.repository.deleteOrder(id, tx);
  });
}
```

**Repository layer** - gdy operacja atomowa na jednej encji:
```typescript
// repository/DeliveryRepository.ts
async addOrderToDeliveryAtomic(deliveryId, orderId) {
  return await prisma.$transaction(async (tx) => {
    const maxPos = await tx.deliveryOrder.findFirst({...});
    return await tx.deliveryOrder.create({
      data: { deliveryId, orderId, position: maxPos + 1 }
    });
  });
}
```

---

## Testing Considerations

### Obecny stan testów:
- `handlers/profileHandler.test.ts` - ✅ exists
- `handlers/deliveryHandler.test.ts` - ✅ exists
- `services/profileService.test.ts` - ✅ exists
- `services/colorService.test.ts` - ✅ exists
- `services/deliveryService.test.ts` - ✅ exists
- Inne moduły - ❌ brak testów

### Problemy z testowalnością:

**1. Routes z inline logic - bardzo trudne do testowania**
```typescript
// warehouse.ts - jak to testować?
fastify.get('/:colorId', async (request) => {
  const stocks = await prisma.warehouseStock.findMany({...});
  const demands = await prisma.orderRequirement.groupBy({...});
  // 50+ linii logiki
  return { data: complexCalculation(...) };
});

// Musimy mockować cały Prisma + Fastify request
```

**2. Services z direct Prisma - trzeba mockować Prisma**
```typescript
// deliveryService.ts
const order = await prisma.order.findUnique({...});

// Test musi mockować prisma.order.findUnique
// Lepiej: mockować repository.findOrderById
```

**3. Po refactoringu - łatwiejsze testowanie**
```typescript
// service używa repository
async addOrder(deliveryId, orderId) {
  const order = await this.repository.findOrderById(orderId);
  // ...
}

// Test:
const mockRepo = {
  findOrderById: jest.fn().mockResolvedValue(mockOrder)
};
const service = new DeliveryService(mockRepo);
// Easy to test!
```

---

## Specific Action Items

### Priority 1 (Critical - Do First)

1. **Refactor `routes/warehouse.ts`**
   - Create `WarehouseHandler` class
   - Create `WarehouseService` class
   - Create `WarehouseRepository` class
   - Move all logic from routes to proper layers
   - Add Zod validation schemas
   - Estimated: 8-12 hours

2. **Refactor inline endpoints in `routes/orders.ts`**
   - Move PATCH /:id to handler
   - Move PDF endpoints to handler
   - Move table/:colorId to handler
   - Move requirements/totals to handler
   - Add Zod schemas
   - Estimated: 4-6 hours

3. **Refactor filesystem endpoints in `routes/settings.ts`**
   - Move browse-folders to handler/service
   - Move validate-folder to handler/service
   - Move file-watcher to handler/service
   - Add Zod schemas
   - Add security review for path traversal
   - Estimated: 3-4 hours

4. **Refactor inline handlers in `routes/schuco.ts`**
   - Move all inline handlers to SchucoHandler
   - Remove direct service calls from routes
   - Estimated: 2 hours

### Priority 2 (Important - Do Next)

5. **Add missing Zod schemas**
   - Create schemas for all endpoints without validation
   - Estimated: 2-3 hours

6. **Refactor Services to use Repositories only**
   - DeliveryService - move direct Prisma to repository
   - ImportService - move direct Prisma to repository
   - Estimated: 4-6 hours

7. **Add missing transactions**
   - completeDelivery in DeliveryService
   - Other batch operations
   - Estimated: 2-3 hours

8. **Create SchucoRepository**
   - Extract Prisma queries from SchucoService
   - Estimated: 3-4 hours

### Priority 3 (Nice to Have - Optional)

9. **Create validation middleware**
   - Centralized Zod validation
   - Estimated: 2 hours

10. **Standardize response formats**
    - Decide on format
    - Update all handlers
    - Estimated: 3-4 hours

11. **Add more Prisma error codes**
    - Extend handlePrismaError
    - Estimated: 1 hour

12. **Consistent logging**
    - Add structured logging everywhere
    - Estimated: 2-3 hours

13. **Fix naming inconsistencies**
    - Rename files to camelCase
    - Estimated: 1 hour

---

## Summary of Findings

### Strengths
1. ✅ Majority of modules follow layered architecture correctly
2. ✅ OrderService/Handler is exemplary implementation
3. ✅ Centralized error handling works well
4. ✅ Zod validation in most handlers
5. ✅ Transactions used where critical (with row locking)
6. ✅ Event emission for WebSocket updates
7. ✅ Custom error classes for clear error semantics

### Weaknesses
1. ❌ Complete modules without layered architecture (warehouse)
2. ❌ Inline logic in some routes (orders, settings, schuco)
3. ❌ Direct Prisma usage in services instead of repositories
4. ❌ Missing Zod validation in some endpoints
5. ❌ Inconsistent response formats
6. ❌ Missing transactions in some batch operations
7. ❌ File system operations in routes (security concern)

### Risk Assessment
- **High Risk**: warehouse module (709 lines without layers)
- **Medium Risk**: Inline endpoints in orders, settings
- **Low Risk**: Minor inconsistencies in naming, logging

### Effort Estimate
- **Critical fixes**: ~20-25 hours
- **Important improvements**: ~12-15 hours
- **Nice to have**: ~8-10 hours
- **Total**: ~40-50 hours for complete refactor

---

## Conclusion

Projekt ma **solidną architekturę w większości modułów** (orders, deliveries, imports - częściowo), ale **krytyczne problemy** w niektórych obszarach (warehouse, inline endpoints).

**Najważniejsze zalecenie**: Rozpocznij od refactoringu `warehouse.ts` (największy problem) i inline endpointów w `orders.ts`. To przyniesie największą wartość i sprawi, że cała architektura będzie spójna.

Po wykonaniu Priority 1 i 2, system będzie miał **konsekwentną, testowalną i maintainable architecture** zgodną z zasadami SOLID.

---

**Next Steps:**

Please review the findings and approve which changes to implement before I proceed with any fixes.

Czy chcesz, żebym:
1. Rozpoczął refactoring od konkretnego modułu (warehouse, orders)?
2. Stworzył task breakdown z dokładnymi krokami?
3. Przygotował przykładowy refactoring jednego endpointu jako proof of concept?