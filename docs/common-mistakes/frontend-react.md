# Frontend - React Query i Dynamic Imports

[< Powrot do spisu tresci](README.md)

---

## React Query - Loading states

### DON'T - Early returns z loading

```typescript
// ZLE - powoduje layout shift
const { data, isLoading } = useQuery(...);

if (isLoading) {
  return <LoadingSpinner />; // <- zmienia layout!
}

return <div>{data.map(...)}</div>;
```

**Konsekwencja:** Content "skacze" podczas ladowania. Zla UX.

### DO - Suspense boundaries

```typescript
// POPRAWNIE - Option 1: useSuspenseQuery
const { data } = useSuspenseQuery(...);

return <div>{data.map(...)}</div>;

// W parent component:
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>

// POPRAWNIE - Option 2: Conditional render
const { data, isLoading } = useQuery(...);

return (
  <div>
    {isLoading ? (
      <LoadingSkeleton /> // <- ten sam layout jak data!
    ) : (
      <div>{data.map(...)}</div>
    )}
  </div>
);
```

**Gdzie sprawdzic:** [frontend-dev-guidelines skill](../../apps/web/src/)

---

## Dynamic Imports - Next.js 15

### DON'T - next/dynamic z ssr:false dla komponentow na kazdej stronie

```typescript
// ZLE - crash "Cannot read properties of undefined (reading 'call')"
const Sidebar = dynamic(
  () => import('./sidebar').then((mod) => mod.Sidebar),
  { ssr: false }
);
```

**Blad:** `Cannot read properties of undefined (reading 'call')` w `<Lazy>` component

### DO - Bezposredni import dla Sidebar, Header, Layout

```typescript
// POPRAWNIE - dla komponentow uzywanych na kazdej stronie
import { Sidebar } from './sidebar';
import { Header } from './header';
```

### DO - next/dynamic TYLKO dla ciezkich, rzadko uzywanych komponentow

```typescript
// POPRAWNIE - dla DataGrid, Charts, PDF viewers
const HeavyChart = dynamic(
  () => import('./HeavyChart').then((mod) => mod.default), // <- explicit default!
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

---

## Kiedy uzywac next/dynamic

**TAK - uzywaj dla:**
- Wykresy (Recharts, Chart.js)
- DataGrid/DataTable z duza iloscia danych
- PDF viewers
- Rich text editors

**NIE - nie uzywaj dla:**
- Sidebar, Header, Footer - uzywane na kazdej stronie
- Layout components
- Male komponenty UI

---

## Kluczowe zasady

1. **Skeleton zamiast spinner** - zachowuje layout
2. **Suspense boundaries** - dla async data loading
3. **Bezposredni import** - dla layoutu i czesto uzywanych komponentow
4. **Dynamic import** - tylko dla ciezkich, rzadko uzywanych komponentow
5. **Explicit default** - `.then((mod) => mod.default)` przy dynamic import

---

[< Powrot do spisu tresci](README.md)
