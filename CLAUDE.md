# AKROBUD - Kontekst projektu dla Claude

## Opis projektu
System ERP dla firmy AKROBUD - zarządzanie produkcją okien aluminiowych, magazynem profili, dostawami i okuciami.

## Tech Stack

### Backend (`apps/api`)
- **Framework:** Fastify 4.x + TypeScript
- **ORM:** Prisma 5.x (SQLite)
- **Walidacja:** Zod
- **Testy:** Vitest
- **Architektura:** Layered (Routes → Handlers → Services → Repositories)

### Frontend (`apps/web`)
- **Framework:** Next.js 14 (App Router)
- **UI:** TailwindCSS + Shadcn/ui (Radix)
- **State:** React Query (TanStack Query)
- **Tabele:** TanStack Table
- **Formularze:** React Hook Form + Zod
- **Wykresy:** Recharts

### Monorepo
- **Manager:** pnpm workspaces
- **Packages:** `@akrobud/api`, `@akrobud/web`

## Struktura katalogów

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/         # Definicje endpointów Fastify
│   │   ├── handlers/       # Logika HTTP (walidacja, response)
│   │   ├── services/       # Logika biznesowa
│   │   ├── repositories/   # Dostęp do bazy (Prisma)
│   │   ├── validators/     # Schematy Zod
│   │   └── utils/          # Helpery
│   └── prisma/
│       ├── schema.prisma   # Model danych
│       └── seed.ts         # Dane początkowe
└── web/
    ├── src/
    │   ├── app/            # Next.js App Router pages
    │   ├── components/     # Komponenty UI (ui/, loaders/, charts/)
    │   ├── features/       # Feature modules (deliveries/, orders/, warehouse/)
    │   ├── hooks/          # Custom hooks
    │   ├── lib/            # Utils, api-client
    │   └── types/          # TypeScript types
```

## Główne moduły

### 1. Zlecenia (Orders)
- Zarządzanie zleceniami produkcyjnymi
- Status: new → in_progress → completed → archived
- Powiązanie z dostawami i zapotrzebowaniem

### 2. Dostawy (Deliveries)
- Planowanie dostaw profili
- Optymalizacja palet (pakowanie okien)
- Status: planned → loading → shipped → delivered

### 3. Magazyn profili (Warehouse)
- Stan magazynowy profili aluminiowych
- Relacja Profile × Color
- Historia zmian, zamówienia

### 4. Okucia (Okuc)
- Magazyn okuć okiennych
- Import z CSV/Excel
- Zapotrzebowanie (RW/PW dokumenty)

### 5. Schuco Integration
- Pobieranie danych z Schuco Connect (Puppeteer)
- Śledzenie zamówień i dostaw

## Konwencje kodu

### Backend
```typescript
// Route → Handler → Service → Repository
// Nazewnictwo plików: kebab-case (order-service.ts)
// Nazewnictwo klas: PascalCase (OrderService)

// Zod dla walidacji
const schema = z.object({ ... });

// Prisma dla DB
const result = await prisma.order.findMany();
```

### Frontend
```typescript
// Feature-based organization
// features/orders/api/ordersApi.ts
// features/orders/components/OrderCard.tsx

// React Query dla data fetching
const { data } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });

// Shadcn/ui dla komponentów
<Button variant="outline">Click</Button>
```

## Komendy

```bash
# Development
pnpm dev              # Start both apps
pnpm dev:api          # Start API only
pnpm dev:web          # Start frontend only

# Database
pnpm db:migrate       # Create migration
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Build
pnpm build            # Build all
pnpm lint             # Lint all
```

## API Endpoints (główne)

```
GET/POST   /api/orders
GET/PATCH  /api/orders/:id
GET/POST   /api/deliveries
GET/POST   /api/warehouse/stock
GET/POST   /api/okuc/articles
POST       /api/imports/upload
```

## Ważne zasady

1. **Nie używaj `db:push`** - kasuje dane. Zawsze `db:migrate`
2. **Walidacja na warstwie handler** - Zod schema
3. **Transakcje Prisma** dla operacji wielokrokowych
4. **React Query** dla cachowania i synchronizacji
5. **TypeScript strict mode** - brak `any`

## Skills dostępne

- `backend-dev-guidelines` - pełna dokumentacja backendu
- `frontend-dev-guidelines` - pełna dokumentacja frontendu

Użyj: "Aktywuj skill backend-dev-guidelines" przed zadaniami backend.
