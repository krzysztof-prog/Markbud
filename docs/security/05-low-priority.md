# Niskie Problemy - Nice to Have

**Priorytet:** NISKI - Nice to have
**Liczba problemow:** 4

> Te problemy sa optymalizacjami i ulepszeniami, ktore nie stanowia zagrozenia bezpieczenstwa.

---

## 42. Brak Optimistic Updates

**Lokalizacja:** `apps/web/src/app/importy/page.tsx:61-80`

**Problem:**
Mutacje czekaja na response przed update UI

**Wplyw:** Wolniejsze UX

**Rozwiazanie:**
```typescript
const mutation = useMutation({
  mutationFn: updateOrder,
  onMutate: async (newData) => {
    // Optimistic update
    await queryClient.cancelQueries(['orders']);
    const previousOrders = queryClient.getQueryData(['orders']);
    queryClient.setQueryData(['orders'], (old) => [...old, newData]);
    return { previousOrders };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['orders'], context.previousOrders);
  },
});
```

---

## 43. Uzywanie db:push zamiast migrate (JUZ NAPRAWIONE)

**Lokalizacja:** `apps/api/package.json:20`

**Status:** NAPRAWIONE

```json
"db:push": "echo 'UWAGA: db:push KASUJE DANE! Uzyj db:migrate zamiast tego.' && exit 1",
```

To juz jest dobrze zrobione - ochrona przed przypadkowym db:push.

---

## 44. Nieefektywne Re-renders (PRAWIDLOWE)

**Lokalizacja:** `apps/web/src/app/magazyn/dostawy-schuco/page.tsx:95-102`

**Status:** PRAWIDLOWE

```typescript
const changedCounts = useMemo(() => {
  const counts = { new: 0, updated: 0 };
  deliveries.forEach((d) => {
    if (d.changeType === 'new') counts.new++;
    else if (d.changeType === 'updated') counts.updated++;
  });
  return counts;
}, [deliveries]);
```

To jest prawidlowe uzycie useMemo - nie ma problemu.

---

## 45. Brak Charset w Response Headers (CZESCIOWO NAPRAWIONE)

**Lokalizacja:** `apps/api/src/index.ts:78-82`

**Status:** Czesciowo naprawione przez hook onSend

**Problem:** Hook dodaje charset tylko gdy brak Content-Type

**Rozwiazanie:** Zawsze jawnie ustawiac charset na poczatku response

---

## Podsumowanie

| # | Problem | Status | Priorytet |
|---|---------|--------|-----------|
| 42 | Brak optimistic updates | Nice to have | NISKI |
| 43 | db:push protection | NAPRAWIONE | NISKI |
| 44 | useMemo usage | PRAWIDLOWE | NISKI |
| 45 | Charset headers | Czesciowo naprawione | NISKI |

---

[Powrot do indeksu](./README.md) | [Poprzedni: Srednie](./04-medium-priority.md) | [Nastepny: Plan naprawy](./06-remediation-plan.md)
