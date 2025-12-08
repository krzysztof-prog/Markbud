# Antypatterns - Czego Unikać

> Skondensowane zasady z doświadczenia projektu. Pełna wersja: [archive/anti-patterns-full.md](../archive/anti-patterns-full.md)

---

## Baza Danych (Prisma/SQLite)

| Nie rób | Rób |
|---------|-----|
| `pnpm db:push` | `pnpm db:migrate` (push kasuje dane!) |
| `@@index` na kolumnach z `@@unique` | `@@unique` sam tworzy indeks |
| Zmiana schema bez `npx prisma generate` | Zawsze generuj po zmianie |
| `DATE(timestamp)` w SQLite | `DATE(datetime(ts/1000, 'unixepoch'))` |

---

## Backend (Fastify/TypeScript)

| Nie rób | Rób |
|---------|-----|
| Business logic w routes | Route → Handler → Service → Repository |
| `parseInt()` bez `isNaN()` | Zawsze sprawdzaj NaN przed użyciem |
| `any` typy | `unknown` + type narrowing, Prisma types |
| `startsWith()` dla ścieżek Windows | `toLowerCase()` - case-insensitive |
| Osobne `remove` + `add` operacje | Jedna transakcja `prisma.$transaction()` |
| `max position` poza transakcją | Aggregate w transakcji (race condition!) |

### Transakcje - szablon
```typescript
await prisma.$transaction(async (tx) => {
  const max = await tx.table.aggregate({ _max: { position: true } });
  await tx.table.create({ data: { position: (max._max.position || 0) + 1 } });
});
```

---

## Frontend (Next.js 15 / React)

### Dynamic Imports - KRYTYCZNE
```typescript
// NIE - runtime error w Next.js 15
const C = dynamic(() => import('./C'));

// TAK - explicit default
const C = dynamic(() => import('./C').then(m => m.default), { ssr: false });
```

Po zmianach: `rm -rf apps/web/.next && pnpm dev:web`

### React Hooks - Kolejność
```typescript
function Component() {
  // 1. WSZYSTKIE Hooks na początku
  const { data } = useQuery(...);
  const [state, setState] = useState(...);
  const memo = useMemo(() => ..., []);

  // 2. POTEM early returns
  if (!data) return <Loading />;

  // 3. POTEM render
  return <div>{data}</div>;
}
```

### Częste błędy React

| Nie rób | Rób |
|---------|-----|
| `useEffect` do fetch | `useQuery` z React Query |
| Hook wewnątrz `if` | Hook zawsze, `enabled: !!condition` |
| `{items.map(x => <><div/></>)}` | `<React.Fragment key={x.id}>` |
| `preview.import.metadata` | `preview?.import?.metadata` |
| `icon={History}` | `icon={<History />}` |

### Optimistic Updates - szablon
```typescript
useMutation({
  onMutate: async () => {
    const prev = queryClient.getQueryData(['key']);
    queryClient.setQueryData(['key'], newData);
    return { prev };
  },
  onError: (_, __, ctx) => {
    queryClient.setQueryData(['key'], ctx.prev); // rollback!
  },
});
```

---

## TypeScript

| Nie rób | Rób |
|---------|-----|
| `catch (e: any)` | `catch (e: unknown)` + `e instanceof Error` |
| `as any` | `as Prisma.OrderWhereInput` |
| `icon: any` | `icon: ComponentType<SVGProps<SVGSVGElement>>` |
| Inline typy | Interfejsy w `/types` |

---

## UX / Komponenty

| Nie rób | Rób |
|---------|-----|
| Warning i Error ten sam kolor | `warning` (żółty) vs `destructive` (czerwony) |
| Tylko drag & drop | + context menu jako alternatywa |
| `rounded-inherit` | `rounded-[inherit]` (arbitrary value) |
| Optimistic bez feedbacku | `SyncIndicator` dla `_optimistic: true` |

---

## PDF (pdfkit)

| Nie rób | Rób |
|---------|-----|
| Helvetica dla PL znaków | DejaVu lub inny Unicode font |
| PDF inline w route | Dedykowany `PdfService` |

---

## Git / Workflow

| Nie rób | Rób |
|---------|-----|
| Commit bez sprawdzenia | `pnpm lint && pnpm build` przed commit |
| Push do main bez review | Feature branch → PR → merge |
| `*.backup` w repo | Użyj git branches |

---

## Claude Code

1. **Jedno zadanie naraz** - nie dawaj wielu zadań, gubi kontekst
2. **Naprawiaj błędy od razu** - nie ignoruj, kaskadują
3. **Self-review** - poproś: "Zrecenzuj swoją pracę"
4. **Regularne skanowanie** - `grep -r "any" apps/` co tydzień

---

## Checklist przed PR

- [ ] `pnpm lint` - brak błędów
- [ ] `pnpm build` - kompiluje się
- [ ] Brak `any` w nowym kodzie
- [ ] Transakcje dla operacji multi-step
- [ ] Dynamic imports z `.then(m => m.default)`
- [ ] Hooks na początku komponentu
- [ ] Optional chaining dla nested properties
