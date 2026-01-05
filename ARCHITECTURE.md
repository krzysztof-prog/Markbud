# Architektura Systemu AKROBUD

## Spis Treści

- [Przegląd Architektury](#przegląd-architektury)
- [Monorepo Structure](#monorepo-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Schema](#database-schema)
- [External Integrations](#external-integrations)
- [Communication Flow](#communication-flow)
- [Security Model](#security-model)
- [Architectural Decisions](#architectural-decisions)

---

## Przegląd Architektury

AKROBUD to monorepo zawierające:
- **Backend API** (Fastify + Prisma + SQLite)
- **Frontend App** (Next.js 15 + React 19)
- **Shared Packages** (TypeScript types, utils)

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AKROBUD System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │ ◄─────► │   Backend    │                  │
│  │  (Next.js)   │  HTTP   │  (Fastify)   │                  │
│  │   Port 3000  │  REST   │  Port 3001   │                  │
│  └──────────────┘         └──────┬───────┘                  │
│         │                         │                           │
│         │                  ┌──────▼───────┐                  │
│         │                  │   Database   │                  │
│         │                  │   (SQLite)   │                  │
│         │                  └──────────────┘                  │
│         │                                                     │
│         │                  External Systems:                 │
│         │                  - Schuco Connect (Puppeteer)      │
│         └─────────────────► - Google Calendar API            │
│                            - PDF Generation (PDFKit)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
AKROBUD/
├── apps/
│   ├── api/                    # Backend application
│   │   ├── src/
│   │   │   ├── routes/         # Fastify route definitions
│   │   │   ├── handlers/       # HTTP request handlers
│   │   │   ├── services/       # Business logic layer
│   │   │   ├── repositories/   # Data access layer (Prisma)
│   │   │   ├── validators/     # Zod schemas
│   │   │   ├── middleware/     # Fastify middleware
│   │   │   ├── plugins/        # Fastify plugins (Swagger, WebSocket)
│   │   │   └── utils/          # Utilities & helpers
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── migrations/     # SQL migrations
│   │   │   └── seed.ts         # Database seeding
│   │   ├── uploads/            # Uploaded files (CSV, PDF)
│   │   └── downloads/          # Downloaded files (Schuco)
│   │
│   └── web/                    # Frontend application
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   ├── components/     # Reusable UI components
│       │   │   ├── ui/         # Shadcn/ui components
│       │   │   ├── layout/     # Layout components
│       │   │   ├── charts/     # Recharts components
│       │   │   └── loaders/    # Loading states
│       │   ├── features/       # Feature-based modules
│       │   │   ├── deliveries/ # Delivery feature
│       │   │   ├── orders/     # Orders feature
│       │   │   ├── warehouse/  # Warehouse feature
│       │   │   └── glass/      # Glass feature
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Utilities & helpers
│       │   │   ├── api-client.ts   # API client (fetch wrapper)
│       │   │   └── api.ts          # React Query setup
│       │   └── types/          # TypeScript type definitions
│       └── public/             # Static assets
│
├── packages/
│   └── shared/                 # Shared code
│       └── src/
│           ├── types/          # Shared TypeScript types
│           └── utils/          # Shared utilities
│
├── docs/                       # Documentation
├── .plan/                      # Project plans & backlog
└── .claude/                    # AI configuration
```

### Package Manager

**pnpm workspaces** - wszystkie dependencies zarządzane centralnie:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

**Turbo** - parallel builds i caching:
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false }
  }
}
```

---

## Backend Architecture

### Layered Architecture Pattern

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

### Warstwy

#### 1. Routes Layer (`src/routes/`)
Definicja endpointów Fastify + OpenAPI schemas dla Swagger.

```typescript
// Przykład: routes/orders.ts
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

#### 2. Handlers Layer (`src/handlers/`)
Obsługa HTTP requests: parsowanie, walidacja Zod, response formatting.

```typescript
// Przykład: handlers/orderHandler.ts
export async function getAll(req: FastifyRequest, reply: FastifyReply) {
  const orders = await orderService.getAll();
  return reply.status(200).send(orders);
}
```

#### 3. Services Layer (`src/services/`)
Logika biznesowa, orchestration, transactions.

```typescript
// Przykład: services/orderService.ts
export class OrderService {
  async getAll(): Promise<Order[]> {
    return orderRepository.findAll();
  }

  async createWithRequirements(data: CreateOrderDTO) {
    return prisma.$transaction(async (tx) => {
      const order = await orderRepository.create(data, tx);
      await requirementService.calculateForOrder(order.id, tx);
      return order;
    });
  }
}
```

#### 4. Repositories Layer (`src/repositories/`)
Dostęp do bazy danych - wszystkie operacje Prisma.

```typescript
// Przykład: repositories/OrderRepository.ts
export class OrderRepository {
  async findAll(): Promise<Order[]> {
    return prisma.order.findMany({
      include: { requirements: true }
    });
  }
}
```

### Middleware & Plugins

#### Error Handler Middleware
Centralna obsługa błędów z kategoriami:
- `ValidationError` (400) - błędy walidacji Zod
- `NotFoundError` (404) - zasób nie znaleziony
- `ConflictError` (409) - konflikt biznesowy
- `UnauthorizedError` (401) - brak autoryzacji

#### Swagger Plugin
Auto-generation dokumentacji API z schemas Zod.

#### WebSocket Plugin
Real-time updates dla synchronizacji danych (deliveries, warehouse).

---

## Frontend Architecture

### Next.js 15 App Router

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

### Feature-Based Organization

Each feature has:
```
features/<feature-name>/
├── api/
│   └── <feature>Api.ts        # API calls (React Query)
├── components/
│   ├── <Component>.tsx        # Feature components
│   └── ...
├── hooks/
│   └── use<Hook>.ts           # Feature-specific hooks
└── types/
    └── <feature>.types.ts     # Feature types
```

### State Management Strategy

#### Server State (React Query)
- Cache management
- Automatic refetching
- Optimistic updates
- Real-time sync via WebSocket

```typescript
const { data: deliveries } = useQuery({
  queryKey: ['deliveries'],
  queryFn: fetchDeliveries,
  staleTime: 60000
});
```

#### Client State (React useState/useReducer)
- UI state (modals, forms)
- Local filters
- Temporary selections

#### URL State (Next.js searchParams)
- Pagination
- Filters
- Active tabs

### Component Architecture

```
components/
├── ui/                         # Shadcn/ui primitives
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── table.tsx
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

### Data Fetching Pattern

```typescript
// 1. Define API function
export async function fetchOrders() {
  return apiClient.get<Order[]>('/orders');
}

// 2. Create React Query hook
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders
  });
}

// 3. Use in component
function OrdersList() {
  const { data, isLoading, error } = useOrders();

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <OrdersTable data={data} />;
}
```

---

## Database Schema

### ER Diagram (High-Level)

```
┌──────────┐         ┌───────────────┐         ┌──────────────┐
│  Order   │◄───────►│ OrderRequirement│◄─────►│   Profile    │
└──────────┘         └───────────────┘         └──────────────┘
     │                                                 │
     │                                                 │
     ▼                                                 ▼
┌──────────┐                                  ┌──────────────┐
│ Delivery │                                  │ ProfileColor │
└──────────┘                                  └──────────────┘
     │                                                 │
     │                                                 ▼
     ▼                                         ┌──────────────┐
┌──────────┐                                  │ WarehouseStock│
│  Pallet  │                                  └──────────────┘
└──────────┘                                         │
                                                     ▼
                                             ┌──────────────┐
                                             │ WarehouseHistory│
                                             └──────────────┘
```

### Kluczowe Modele

#### Order
Zlecenie produkcyjne okna.

**Kluczowe pola:**
- `orderNumber` - numer zlecenia
- `orderDate` - data zlecenia
- `clientName` - klient
- `status` - new/in_progress/completed/archived
- `totalValue` - wartość zlecenia
- `deliveryId` - powiązanie z dostawą

#### Delivery
Dostawa profili do klienta.

**Kluczowe pola:**
- `deliveryDate` - data dostawy
- `status` - planned/loading/shipped/delivered
- `pallets` - liczba palet
- `orders` - powiązane zlecenia

#### WarehouseStock
Stan magazynowy profilu w kolorze.

**Kluczowe pola:**
- `profileId` + `colorId` - klucz kompozytowy
- `quantity` - ilość (mm)
- `version` - optimistic locking
- `lastUpdated` - timestamp

#### Profile
Definicja profilu aluminiowego.

**Kluczowe pola:**
- `name` - nazwa profilu
- `article` - artykuł
- `depth` - głębokość
- `profileGroupId` - grupa profili

### Optymalizacje

#### Indexy
```sql
-- Composite indexes dla często używanych queries
CREATE INDEX idx_warehouse_stock_profile_color ON WarehouseStock(profileId, colorId);
CREATE INDEX idx_order_delivery ON Order(deliveryId);
CREATE INDEX idx_order_status_date ON Order(status, orderDate);
```

#### Optimistic Locking
WarehouseStock używa `version` field dla concurrent updates:
```typescript
await prisma.warehouseStock.update({
  where: {
    profileId_colorId: { profileId, colorId },
    version: currentVersion
  },
  data: {
    quantity: newQuantity,
    version: { increment: 1 }
  }
});
```

Szczegóły: [docs/architecture/database.md](docs/architecture/database.md)

---

## External Integrations

### Schuco Connect
**Purpose:** Pobieranie zamówień i dostaw z systemu Schuco.

**Technology:** Puppeteer (headless browser automation)

**Flow:**
1. Login do Schuco Connect
2. Navigate to orders page
3. Download CSV file
4. Parse and import to database

**Challenges:**
- Dynamic page loading (wait strategies)
- CAPTCHA handling
- Session management

### Google Calendar API
**Purpose:** Synchronizacja dat dostaw.

**Features:**
- Create calendar events for deliveries
- Update event on delivery date change
- Delete event on delivery cancellation

### PDF Generation
**Purpose:** Eksport dokumentów (protokoły, raporty).

**Library:** PDFKit

**Documents:**
- Delivery protocols
- Pallet layouts
- Monthly reports
- Warehouse reports

---

## Communication Flow

### Request Lifecycle

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
      │ fetch()
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

### WebSocket Communication

Real-time updates dla:
- Warehouse stock changes
- Delivery status updates
- New orders

```typescript
// Server
websocketPlugin.broadcast('warehouse:update', { stockId, quantity });

// Client
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001');
  ws.on('warehouse:update', (data) => {
    queryClient.invalidateQueries(['warehouse']);
  });
}, []);
```

---

## Security Model

### Authentication
**Method:** JWT tokens

**Flow:**
1. User login → JWT token
2. Token stored in httpOnly cookie
3. Token sent with every request
4. Server validates token

### Authorization
**Role-based:**
- Admin - full access
- User - read/write orders, deliveries
- Viewer - read-only

### Data Validation
**Layers:**
1. Frontend - React Hook Form + Zod
2. Backend - Zod schemas in handlers
3. Database - Prisma constraints

### SQL Injection Protection
Prisma ORM automatically escapes queries.

### XSS Protection
- Next.js auto-escapes JSX
- CSP headers
- Sanitization for user inputs

Szczegóły: [docs/security/best-practices.md](docs/security/best-practices.md)

---

## Architectural Decisions

### ADR-001: SQLite vs PostgreSQL
**Decision:** SQLite

**Rationale:**
- Small-medium scale deployment (single location)
- Simplicity (no server setup)
- File-based (easy backup)
- Sufficient performance for workload

**Trade-offs:**
- Limited concurrent writes
- No built-in replication

---

### ADR-002: Monorepo vs Separate Repos
**Decision:** Monorepo (pnpm workspaces + Turbo)

**Rationale:**
- Shared types between frontend/backend
- Atomic commits across stack
- Simplified dependency management
- Better developer experience

---

### ADR-003: Next.js App Router vs Pages Router
**Decision:** App Router

**Rationale:**
- React Server Components
- Better code splitting
- Improved SEO
- Future-proof

**Trade-offs:**
- Learning curve
- Limited third-party support (initially)

---

### ADR-004: Optimistic Locking for Warehouse
**Decision:** Version field + check on update

**Rationale:**
- Prevent lost updates in concurrent scenarios
- Better than pessimistic locking (no locks)
- Handles edge cases (double submission)

**Implementation:**
```prisma
model WarehouseStock {
  version Int @default(1)
  // ... other fields
}
```

---

### ADR-005: Feature-Based Frontend Structure
**Decision:** `features/<feature>/` instead of `components/`, `hooks/`, etc.

**Rationale:**
- Colocate related code
- Easier to navigate
- Scalability
- Clear ownership

**Structure:**
```
features/
  deliveries/
    api/
    components/
    hooks/
    types/
```

---

## Performance Considerations

### Database
- Composite indexes on frequently joined columns
- Selective eager loading (Prisma `include`)
- Pagination for large datasets

### Frontend
- Code splitting (dynamic imports)
- Image optimization (Next.js Image)
- React.memo for expensive components
- Virtual scrolling for large lists (TanStack Table)

### API
- Response caching (React Query)
- Compression middleware
- Rate limiting

---

## Monitoring & Observability

### Logging
- Winston logger (structured logs)
- Log levels: error, warn, info, debug
- Request/response logging

### Metrics
- API response times
- Database query performance
- Error rates

### Error Tracking
- Global error boundaries (Frontend)
- Error handler middleware (Backend)
- Error logging to file

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Environment          │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │    │   Fastify    │  │
│  │   (PM2)      │    │   (PM2)      │  │
│  │   Port 3000  │    │   Port 3001  │  │
│  └──────────────┘    └──────┬───────┘  │
│         │                     │          │
│         │              ┌──────▼───────┐ │
│         └─────────────►│   SQLite     │ │
│                        │   (file)     │ │
│                        └──────────────┘ │
│                                          │
│  Nginx Reverse Proxy (HTTPS)            │
│  - /api → :3001                          │
│  - / → :3000                             │
└─────────────────────────────────────────┘
```

Szczegóły: [docs/deployment/](docs/deployment/)

---

## Dalsze Informacje

- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Database Schema](docs/architecture/database.md)
- [Deployment Guide](docs/deployment/README.md)

---

**Ostatnia aktualizacja:** 2025-12-30
**Wersja dokumentu:** 1.0.0
