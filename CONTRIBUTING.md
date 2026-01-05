# Contributing to AKROBUD

Dziękujemy za zainteresowanie kontryb ucją do projektu AKROBUD! Ten dokument zawiera wytyczne dotyczące procesu rozwoju i współpracy.

## Spis Treści

- [Rozpoczęcie Pracy](#rozpoczęcie-pracy)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Pull Requests](#pull-requests)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

---

## Rozpoczęcie Pracy

### Prerequisites

Wymagane oprogramowanie:
- **Node.js** 18+ (zalecane 20 LTS)
- **pnpm** 8+ (package manager)
- **Git** 2.30+

### Fork & Clone

```bash
# Fork repozytorium na GitHubie
# Następnie sklonuj lokalnie:

git clone https://github.com/YOUR_USERNAME/akrobud.git
cd akrobud
```

### Instalacja

```bash
# Instalacja zależności
pnpm install

# Generowanie Prisma client
pnpm db:generate

# Uruchomienie migracji
pnpm db:migrate

# Seed database (opcjonalnie)
pnpm db:seed
```

### Uruchomienie Development Server

```bash
# Wszystkie aplikacje
pnpm dev

# Lub osobno:
pnpm dev:api    # Backend (http://localhost:3001)
pnpm dev:web    # Frontend (http://localhost:3000)
```

### Weryfikacja Setupu

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Testy
pnpm test
```

Jeśli wszystko działa - gotowe do pracy!

---

## Development Workflow

### 1. Wybierz Task

- Sprawdź otwarte Issues lub Beads tasks:
  ```bash
  bd list
  ```
- Wybierz task albo stwórz nowy Issue
- Przypisz się do task

### 2. Utwórz Branch

```bash
# Feature branch
git checkout -b feature/nazwa-funkcji

# Bugfix branch
git checkout -b fix/opis-bugfixa

# Dokumentacja
git checkout -b docs/opis-zmian
```

**Konwencja nazewnictwa:**
- `feature/` - nowe funkcje
- `fix/` - poprawki bugów
- `docs/` - zmiany w dokumentacji
- `refactor/` - refactoring kodu
- `test/` - dodanie/poprawa testów

### 3. Wprowadź Zmiany

- Stosuj się do [Coding Standards](#coding-standards)
- Commituj często, małe atomic commits
- Pisz testy dla nowego kodu
- Aktualizuj dokumentację

### 4. Commit Changes

```bash
git add .
git commit -m "feat: dodaj moduł eksportu raportów PDF"
```

Zobacz: [Commit Message Convention](#commit-message-convention)

### 5. Push & Create PR

```bash
git push origin feature/nazwa-funkcji
```

Następnie utwórz Pull Request na GitHubie.

---

## Coding Standards

### TypeScript

**Ogólne zasady:**
- Używaj TypeScript strict mode
- Unikaj `any` - używaj `unknown` lub proper types
- Definiuj interfejsy dla obiektów
- Używaj generics dla reusable logic

**Przykład:**
```typescript
// ❌ ZŁE
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ DOBRE
interface DataItem {
  value: number;
  label: string;
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}
```

### Backend (Fastify + Prisma)

**Layered Architecture:**
```
Route → Handler → Service → Repository → Database
```

**Nazewnictwo plików:**
- kebab-case: `order-service.ts`, `delivery-handler.ts`
- Klasy: PascalCase: `OrderService`, `DeliveryHandler`

**Walidacja:**
- Zawsze używaj Zod schemas w handlerach
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

**Error Handling:**
- Throwuj custom errors (ValidationError, NotFoundError)
- Nigdy nie catchuj błędów w handlerach - pozwól middleware obsłużyć

```typescript
// ✅ DOBRE
if (!order) {
  throw new NotFoundError('Zlecenie', orderId);
}

// ❌ ZŁE
try {
  // ... logic
} catch (error) {
  return reply.status(500).send({ error });
}
```

**Database Transactions:**
- Używaj transakcji dla multi-step operations

```typescript
return prisma.$transaction(async (tx) => {
  const order = await orderRepository.create(data, tx);
  await requirementService.calculate(order.id, tx);
  return order;
});
```

Szczegóły: [Backend Guidelines](.claude/skills/backend-dev-guidelines/)

### Frontend (Next.js + React)

**File Organization:**
- Feature-based structure
- Colocation - trzymaj powiązane pliki razem

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

**Components:**
- Używaj functional components
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

**Data Fetching:**
- Używaj React Query dla server state
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

**Dynamic Imports:**
- Zawsze używaj `.then((mod) => mod.default)` w Next.js 15

```typescript
// ✅ DOBRE
const Component = dynamic(
  () => import('./Component').then((mod) => mod.default),
  { ssr: false }
);

// ❌ ZŁE
const Component = dynamic(() => import('./Component'));
```

**Styling:**
- TailwindCSS dla styling
- Shadcn/ui dla komponentów
- Unikaj inline styles

Szczegóły: [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)

### Code Style

**Formatting:**
- Używamy Prettier (automatyczne formatowanie)
- 2 spaces indentation
- Single quotes
- Semicolons

**Linting:**
```bash
# Sprawdź linting
pnpm lint

# Auto-fix
pnpm lint:fix
```

---

## Git Workflow

### Branching Strategy

**Main Branches:**
- `main` - production-ready kod
- `develop` - development branch (if used)

**Supporting Branches:**
- `feature/*` - nowe funkcje
- `fix/*` - bugfix
- `docs/*` - dokumentacja

### Commit Message Convention

Używamy **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - nowa funkcja
- `fix` - poprawka buga
- `docs` - zmiany w dokumentacji
- `refactor` - refactoring bez zmian funkcjonalności
- `test` - dodanie/aktualizacja testów
- `chore` - zmiany w build process, dependencies
- `style` - formatowanie kodu (no logic changes)

**Scope** (opcjonalnie):
- `api` - backend changes
- `web` - frontend changes
- `db` - database changes

**Przykłady:**
```bash
feat(api): dodaj endpoint GET /orders/:id
fix(web): napraw błąd w kalendarzu dostaw
docs: aktualizuj README z instrukcjami instalacji
refactor(api): przenieś logikę walidacji do serwisu
test(web): dodaj testy dla OrderCard component
chore: aktualizuj dependencies (Next.js 15.5.7)
```

### Commit Best Practices

- **Atomic commits** - jeden commit = jedna logiczna zmiana
- **Descriptive messages** - wyjaśnij "co" i "dlaczego"
- **Test before commit** - upewnij się że testy przechodzą
- **No broken commits** - każdy commit powinien być w stanie budować się

```bash
# Przed commitem:
pnpm type-check
pnpm lint
pnpm test
```

---

## Pull Requests

### Tworzenie PR

1. **Tytuł PR:**
   - Jasny i opisowy
   - Zgodny z convention (feat/fix/docs)

2. **Opis PR:**
   ```markdown
   ## Opis
   Krótki opis zmian (co i dlaczego)

   ## Zmiany
   - Dodano moduł X
   - Poprawiono bug Y
   - Zaktualizowano dokumentację Z

   ## Test Plan
   1. Uruchom `pnpm dev`
   2. Przejdź do /deliveries
   3. Sprawdź czy...

   ## Screenshots (jeśli applicable)
   [obrazki]

   ## Checklist
   - [ ] Testy przechodzą
   - [ ] Linting pass
   - [ ] Dokumentacja zaktualizowana
   - [ ] Brak breaking changes (lub opisane)
   ```

3. **Assignees:**
   - Przypisz siebie jako autor
   - Request review od team members

4. **Labels:**
   - `feature`, `bugfix`, `documentation`, etc.

### Code Review Process

**Jako Autor:**
- Odpowiadaj na komentarze
- Fix requested changes
- Re-request review po zmianach
- Nie merguj własnych PR bez review

**Jako Reviewer:**
- Review w ciągu 24h (jeśli możliwe)
- Sprawdź:
  - Kod quality
  - Testy
  - Dokumentację
  - Breaking changes
- Używaj **Approve** / **Request Changes** / **Comment**

**Merge Strategy:**
- **Squash and merge** dla małych PR
- **Merge commit** dla dużych feature branches
- **Never force push** po review (chyba że reviewer prosi)

---

## Testing

### Wymagania

**Nowy kod powinien mieć testy:**
- **Unit tests** - logika biznesowa (services, utils)
- **Integration tests** - API endpoints
- **E2E tests** - critical user flows (opcjonalnie)

### Unit Tests (Vitest)

```bash
# Uruchom testy
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

**Przykład:**
```typescript
// orderService.test.ts
import { describe, it, expect } from 'vitest';
import { OrderService } from './orderService';

describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('should calculate total value correctly', () => {
      const service = new OrderService();
      const total = service.calculateTotal([
        { quantity: 2, price: 100 },
        { quantity: 3, price: 50 }
      ]);
      expect(total).toBe(350);
    });
  });
});
```

### E2E Tests (Playwright)

```bash
# Uruchom E2E tests
pnpm test:e2e

# UI mode
pnpm test:e2e:ui
```

**Przykład:**
```typescript
// deliveries.spec.ts
import { test, expect } from '@playwright/test';

test('should create new delivery', async ({ page }) => {
  await page.goto('/dostawy');
  await page.click('[data-testid="new-delivery"]');
  await page.fill('[name="client"]', 'Test Client');
  await page.click('[type="submit"]');

  await expect(page.locator('text=Dostawa utworzona')).toBeVisible();
});
```

### Test Coverage

Minimalny target: **70% coverage**

Sprawdź coverage:
```bash
pnpm test:coverage
```

---

## Documentation

### Aktualizacja Dokumentacji

**Dokumentacja = część feature:**
- Nowa funkcja = update docs
- Bug fix = update docs (jeśli applicable)
- API changes = update API docs

###Gdzie dokumentować?

**README główny:**
- Quick start
- High-level overview
- Links do szczegółowej docs

**docs/features/:**
- Szczegółowa dokumentacja modułów
- Workflow diagramy
- API integration

**docs/guides/:**
- Development guides
- Best practices
- Troubleshooting

**Code comments:**
- Tylko dla complex logic
- Nie comment "co" robi kod (to widać)
- Comment "dlaczego" (business logic)

```typescript
// ❌ ZŁE
// Increment counter
counter++;

// ✅ DOBRE
// Reset counter after 100 to prevent overflow in legacy systems
if (counter >= 100) counter = 0;
```

### Markdown Style

- Używaj headings hierarchicznie (h1 → h2 → h3)
- Code blocks z syntax highlighting
- Linki względne (nie absolutne)
- Screenshots w `/docs/images/`

---

## Issue Reporting

### Zgłaszanie Bugów

**Template:**
```markdown
## Opis problemu
Krótki opis co nie działa

## Kroki do reprodukcji
1. Przejdź do...
2. Kliknij...
3. Obserwuj błąd...

## Oczekiwane zachowanie
Co powinno się stać

## Aktualne zachowanie
Co się dzieje zamiast tego

## Screenshots
(jeśli applicable)

## Environment
- OS: Windows 10
- Browser: Chrome 120
- Node version: 20.10.0
- AKROBUD version: 1.0.0

## Dodatkowy kontekst
Logi, error messages, etc.
```

### Feature Requests

**Template:**
```markdown
## Opis feature
Co chcesz dodać i dlaczego

## Use Case
Jak będzie używane

## Proposed Solution
Twój pomysł na implementację (opcjonalnie)

## Alternatives
Inne rozważane opcje

## Additional Context
Screenshots, mockupy, etc.
```

---

## Dodatkowe Zasoby

- [ARCHITECTURE.md](ARCHITECTURE.md) - Architektura systemu
- [CLAUDE.md](CLAUDE.md) - Konwencje projektu
- [docs/guides/](docs/guides/) - Development guides
- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)

---

## Kontakt

Pytania? Suggestions?
- Utwórz Issue
- Skontaktuj się z maintainers

---

**Dziękujemy za wkład w projekt AKROBUD!** 🚀

---

**Ostatnia aktualizacja:** 2025-12-30
