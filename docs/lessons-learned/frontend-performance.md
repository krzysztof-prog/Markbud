# Lessons Learned - Frontend & Performance

> Błędy związane z wydajnością frontendu, responsive design i type safety.

---

## 2026-01-15 - Zbędne Type Assertions po Zod Parse + Brakujące ErrorBoundary

**Co się stało:**
Podczas audytu tech debt odkryto 12 miejsc gdzie kod używał `as Type` po `.parse()` Zod:
```typescript
// Zbędne - Zod już zwraca poprawny typ
const data = createDemandSchema.parse(request.body) as CreateDemandInput;
```

Dodatkowo, komponent `ErrorBoundary` istniał w projekcie ale NIE BYŁ UŻYWANY - błędy React renderowania nie były łapane.

**Root cause:**
1. **Type assertions**: Copy-paste starszego kodu gdzie używano `as` dla type safety, nie rozumiejąc że Zod automatycznie inferuje typy przez `z.infer<typeof schema>`
2. **ErrorBoundary**: Komponent stworzony "na potem" i zapomniany - nigdy nie dodany do layout.tsx

**Impact:**
- Niski (Type assertions): Niepotrzebny kod, trudniejsze utrzymanie, fałszywe przekonanie o bezpieczeństwie typów
- Średni (ErrorBoundary): Błędy renderowania crashowały całą aplikację zamiast pokazać przyjazną stronę błędu

**Fix:**

1. **Type assertions - usuń wszystkie:**
```typescript
// Zod infer działa automatycznie
const data = createDemandSchema.parse(request.body);
// TypeScript zna typ 'data' z definicji schematu!
```

Usunięto w 4 plikach:
- `mojaPracaHandler.ts` - 4 miejsca + usunięto nieużywany import typu
- `demandHandler.ts` - 2 miejsca
- `orderHandler.ts` - 3 miejsca
- `proportionHandler.ts` - 2 miejsca

2. **ErrorBoundary - dodaj do layout:**
```typescript
// apps/web/src/app/layout.tsx
import { ErrorBoundary } from '@/components/error-boundary';

<Providers>
  <ErrorBoundary>
    <div className="flex h-screen">
      {/* ...content */}
    </div>
  </ErrorBoundary>
</Providers>
```

**Prevention:**
1. **NIGDY `as Type` po Zod parse** - Zod już daje poprawny typ przez `z.infer`
2. **Komponenty utility (ErrorBoundary, Loading)** - od razu używaj po stworzeniu
3. **Grep po `as ` w handlerach** - sprawdź czy assertions są potrzebne
4. **Zod inference** - korzystaj z `z.infer<typeof schema>` zamiast ręcznych typów

**Lekcja:** Zod + TypeScript = type inference działa automatycznie. `as Type` po `.parse()` to code smell. Komponenty "na później" często zostają "nigdy" - używaj od razu lub usuń.

---

## 2025-12-XX - Tabele na telefonie całkowicie nieużywalne

**Co się stało:**
Użytkownik próbował sprawdzić zestawienie zleceń na telefonie (iPhone). Tabela 14 kolumn na ekranie 375px = scroll w 2 kierunkach, całkowicie nieużywalna.

**Root cause:**
```typescript
// Tylko desktop view
<Table>
  <TableHeader>
    <TableRow>
      {/* 14 kolumn - łączna szerokość ~5000px */}
      <TableHead>Nr zlecenia</TableHead>
      <TableHead>Klient</TableHead>
      <TableHead>Deadline</TableHead>
      {/* ... 11 więcej kolumn */}
    </TableRow>
  </TableHeader>
</Table>
```

Brak:
- Mobile card view
- Responsive breakpoints
- Virtualizacja (wolne przewijanie przy 100+ wierszach)

**Impact:**
- Średni: 50%+ użytkowników używa telefonu czasami
- Użytkownicy zmuszeni do laptopa (wolniejsza praca)
- Frustracja: "system nie działa na telefonie"

**Fix:**
```typescript
// Responsive view
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  // Card view for mobile
  <div className="space-y-2">
    {orders.map(order => (
      <Card key={order.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="font-bold">{order.orderNumber}</div>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Klient: {order.client}</div>
          <div>Deadline: {formatDate(order.deadline)}</div>
          <div>Wartość: {formatMoney(order.valuePln)}</div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => handleView(order.id)}>
            Szczegóły
          </Button>
        </div>
      </Card>
    ))}
  </div>
) : (
  // Table view for desktop
  <Table>{/* pełna tabela */}</Table>
)}
```

**Prevention:**
1. KAŻDA tabela: sprawdź mobile view
2. Card view dla < 768px
3. Najważniejsze dane visible, reszta w "Szczegóły"
4. Virtualizacja dla > 50 wierszy

**Lekcja:** **Desktop-first = 50% użytkowników frustracji**. Testuj na telefonie (375px, 414px).

---

## 2025-12-XX - Frontend nie używał lazy loading (wolny initial load)

**Co się stało:**
Pierwszy load aplikacji trwał 8-10 sekund. Bundle size 3.2MB. Użytkownicy myśleli że aplikacja się zawiesza.

**Root cause:**
```typescript
// Wszystko synchroniczne
import { DeliveryCalendar } from './DeliveryCalendar';
import { DataTable } from '@/components/ui/data-table';
import { Charts } from './Charts';

// Wszystkie komponenty w jednym bundle -> 3.2MB!
```

Zero użycia:
- `React.lazy()`
- `dynamic()` (Next.js)
- Code splitting

**Impact:**
- Średni: Wolny initial load (8-10s)
- Bounce rate (użytkownicy odchodzą przed załadowaniem)
- Złe wrażenie ("wolna aplikacja")

**Fix:**
```typescript
// Lazy loading
import dynamic from 'next/dynamic';

const DeliveryCalendar = dynamic(
  () => import('./DeliveryCalendar').then(mod => mod.default),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false
  }
);

const DataTable = dynamic(
  () => import('@/components/ui/data-table').then(mod => mod.DataTable),
  {
    loading: () => <TableSkeleton />,
    ssr: false
  }
);
```

**Rezultat:**
- Initial bundle: 3.2MB -> 800KB (75% redukcja!)
- Initial load: 8-10s -> 2-3s
- Interactive faster (First Contentful Paint)

**Prevention:**
1. Lazy load: Calendars, Charts, DataTables, Editors, Heavy Dialogs
2. Bundle analysis: `pnpm build && npx @next/bundle-analyzer`
3. Lighthouse CI: monitor bundle size
4. Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Dynamic Imports"

**Lekcja:** Ciężkie komponenty (>50KB) = **ZAWSZE lazy load**. Użytkownik nie potrzebuje calendar zanim go nie otworzy.

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)
