# Performance i Monitoring

> Dokumentacja optymalizacji wydajnosci i monitoringu systemu AKROBUD.

---

## Database Performance

### Indexy

Composite indexes dla czesto uzywanych zapytan:

```sql
-- Indexy na tabeli Order
CREATE INDEX idx_order_status_date ON orders(status, orderDate);
CREATE INDEX idx_order_delivery ON orders(deliveryId);
CREATE INDEX idx_order_invoice ON orders(invoiceNumber, createdAt);

-- Indexy na tabeli WarehouseStock
CREATE INDEX idx_warehouse_stock_profile_color ON warehouse_stock(profileId, colorId);

-- Indexy na tabeli SchucoDelivery
CREATE INDEX idx_schuco_order_date ON schuco_deliveries(orderDateParsed);
CREATE INDEX idx_schuco_change_type ON schuco_deliveries(changeType, changedAt);
```

### Selective Eager Loading

Laduj tylko potrzebne relacje:

```typescript
// Dobrze - laduje tylko potrzebne relacje
const orders = await prisma.order.findMany({
  include: {
    requirements: true  // Tylko jesli potrzebne
  }
});

// Zle - laduje wszystko
const orders = await prisma.order.findMany({
  include: {
    requirements: true,
    windows: true,
    delivery: {
      include: {
        orders: true  // N+1 potential!
      }
    }
  }
});
```

### Pagination

Dla duzych datasetow uzywaj paginacji:

```typescript
// Cursor-based pagination (zalecane dla duzych zbiorow)
const orders = await prisma.order.findMany({
  take: 20,
  skip: 1,  // Pomin cursor
  cursor: { id: lastOrderId },
  orderBy: { createdAt: 'desc' }
});

// Offset-based pagination (prostsze, ale wolniejsze dla duzych zbiorow)
const orders = await prisma.order.findMany({
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## Frontend Performance

### Code Splitting

Dynamiczne importy dla ciezkich komponentow:

```typescript
// Lazy loading z explicit default export
const DeliveryCalendar = dynamic(
  () => import('./DeliveryCalendar').then(mod => ({ default: mod.DeliveryCalendar })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false
  }
);

// Lazy loading pages
const AdminPage = dynamic(() => import('./AdminPage'));
```

### Image Optimization

Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="AKROBUD Logo"
  width={200}
  height={50}
  priority  // Dla above-the-fold images
/>
```

### React.memo

Dla kosztownych komponentow:

```typescript
// Memoizacja komponentu
const OrderRow = React.memo(function OrderRow({ order }: { order: Order }) {
  return (
    <tr>
      <td>{order.orderNumber}</td>
      <td>{order.client}</td>
    </tr>
  );
});

// Memoizacja z custom comparison
const DeliveryCard = React.memo(
  function DeliveryCard({ delivery }: Props) { ... },
  (prevProps, nextProps) => prevProps.delivery.id === nextProps.delivery.id
);
```

### Virtual Scrolling

TanStack Table z virtualizacja dla duzych list:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualTable({ rows }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,  // Szacunkowa wysokosc wiersza
    overscan: 5  // Renderuj 5 wierszy wiecej
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size
            }}
          >
            <TableRow data={rows[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## API Performance

### Response Caching

React Query cache:

```typescript
const { data } = useQuery({
  queryKey: ['orders'],
  queryFn: fetchOrders,
  staleTime: 60000,      // Cache przez 1 minute
  cacheTime: 5 * 60000,  // Trzymaj w cache 5 minut
  refetchOnWindowFocus: false  // Nie odswijezaj przy focus
});
```

### Compression Middleware

Fastify compression:

```typescript
import fastifyCompress from '@fastify/compress';

app.register(fastifyCompress, {
  global: true,
  encodings: ['gzip', 'deflate']
});
```

### Rate Limiting

Ochrona przed przeciazeniem:

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});
```

---

## Monitoring & Observability

### Logging (Winston)

Strukturyzowane logi:

```typescript
// utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Uzycie
logger.info('Order created', { orderId: 123, userId: 1 });
logger.error('Database error', { error: err.message, stack: err.stack });
```

### Log Levels

| Level | Kiedy uzywac |
|-------|--------------|
| `error` | Bledy krytyczne, wyjatki |
| `warn` | Ostrzezenia, nieoczekiwane sytuacje |
| `info` | Wazne zdarzenia biznesowe |
| `debug` | Informacje debugowania |

### Request/Response Logging

```typescript
// Middleware do logowania requestow
app.addHook('onRequest', async (req) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
});

app.addHook('onResponse', async (req, reply) => {
  logger.info('Response sent', {
    method: req.method,
    url: req.url,
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime()
  });
});
```

---

## Metrics

### API Response Times

```typescript
// Mierzenie czasu odpowiedzi
app.addHook('onResponse', async (req, reply) => {
  const responseTime = reply.getResponseTime();

  // Log slow requests
  if (responseTime > 1000) {
    logger.warn('Slow request', {
      url: req.url,
      responseTime,
      method: req.method
    });
  }
});
```

### Database Query Performance

```typescript
// Prisma middleware do mierzenia zapytan
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();

  const duration = after - before;
  if (duration > 100) {
    logger.warn('Slow database query', {
      model: params.model,
      action: params.action,
      duration
    });
  }

  return result;
});
```

---

## Error Tracking

### Global Error Boundaries (Frontend)

```tsx
// components/ErrorBoundary.tsx
'use client';

export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do serwisu monitoringu
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Error Handler Middleware (Backend)

```typescript
// middleware/errorHandler.ts
app.setErrorHandler((error, request, reply) => {
  // Logowanie bledu
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    body: request.body
  });

  // Kategoryzacja i odpowiedz
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.errors
    });
  }

  return reply.status(500).send({
    error: 'Internal Server Error'
  });
});
```

---

## Deployment Performance

### Production Build

```powershell
# Optymalizowany build
pnpm build

# Build z analiza bundle
ANALYZE=true pnpm build
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'akrobud-api',
      script: 'dist/index.js',
      instances: 'max',  // Cluster mode
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'akrobud-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

---

## Performance Checklist

### Database
- [ ] Indexy na czesto wyszukiwanych kolumnach
- [ ] Paginacja dla duzych datasetow
- [ ] Selective eager loading
- [ ] Monitoring slow queries

### Frontend
- [ ] Code splitting / lazy loading
- [ ] Image optimization
- [ ] React.memo dla ciezkich komponentow
- [ ] Virtual scrolling dla duzych list

### API
- [ ] Response caching
- [ ] Compression wlaczone
- [ ] Rate limiting
- [ ] Request/response logging

### General
- [ ] Error tracking skonfigurowany
- [ ] Metryki wydajnosci zbierane
- [ ] Alerty dla slow requests

---

## Powiazane Dokumenty

- [Backend Architecture](./backend.md)
- [Frontend Architecture](./frontend.md)
- [Security Model](./security.md)

---

**Ostatnia aktualizacja:** 2026-01-20
