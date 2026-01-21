# Common Mistakes - DO / DON'T

> **Claude:** Przeczytaj ten plik PRZED kazdym kodowaniem!
> Ta lista rosnie z kazdym bledem - jesli popelnisz nowy, **dodaj go tutaj**.

**Ostatnia aktualizacja:** 2026-01-20
**Zrodlo:** Audyt kodu + doswiadczenie projektu

---

## Szczegolowa dokumentacja

Plik zostal podzielony na mniejsze sekcje dla latwiejszej nawigacji.
Szczegoly znajdziesz w katalogu [docs/common-mistakes/](docs/common-mistakes/README.md).

| Sekcja | Plik | Najwazniejsza zasada |
|--------|------|---------------------|
| Operacje na pieniadzach | [money-operations.md](docs/common-mistakes/money-operations.md) | ZAWSZE uzywaj `money.ts` (groszeToPln/plnToGrosze) |
| Usuwanie danych | [data-deletion.md](docs/common-mistakes/data-deletion.md) | Soft delete + confirmation dialog |
| Importy i parsowanie | [imports-parsing.md](docs/common-mistakes/imports-parsing.md) | Zbieraj errors[] i raportuj uzytkownikowi |
| Buttony i mutacje | [buttons-mutations.md](docs/common-mistakes/buttons-mutations.md) | `disabled={isPending}` na wszystkich buttonach |
| Architektura Backend | [backend-architecture.md](docs/common-mistakes/backend-architecture.md) | Brak try-catch w handlerach, db:migrate |
| Frontend - React | [frontend-react.md](docs/common-mistakes/frontend-react.md) | Suspense/Skeleton, dynamic tylko dla ciezkich komponentow |
| Walidacja i bezpieczenstwo | [validation-security.md](docs/common-mistakes/validation-security.md) | Zod walidacja, jeden klucz tokena |
| Pozostale | [other.md](docs/common-mistakes/other.md) | pnpm, routing, responsive, testy |

---

## Szybkie podsumowanie najwazniejszych zasad

### P0 - NIGDY NIE LAM (Krytyczne)

```typescript
// PIENIADZE - zawsze money.ts
import { groszeToPln, formatGrosze } from './utils/money';
const total = groszeToPln(order.valuePln as Grosze); // NIE parseFloat!

// USUWANIE - zawsze soft delete
await prisma.delivery.update({
  where: { id },
  data: { deletedAt: new Date() } // NIE prisma.delete!
});

// BAZA - zawsze migracje
pnpm db:migrate  // NIE pnpm db:push!
```

### P1 - ZAWSZE (Wysoky priorytet)

```typescript
// BUTTONY - disabled podczas mutacji
const { mutate, isPending } = useMutation(...);
<Button disabled={isPending}>
  {isPending ? 'Ladowanie...' : 'Zapisz'}
</Button>

// IMPORTY - raportuj bledy
return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};

// HANDLERY - brak try-catch (middleware obsluguje)
async handler(request, reply) {
  const data = schema.parse(request.body); // ZodError -> middleware -> 400
  return reply.send(data);
}
```

### P2 - JESLI MOZLIWE (Nice to have)

```typescript
// SUSPENSE zamiast isLoading
<Suspense fallback={<Skeleton />}>
  <DataComponent />
</Suspense>

// RESPONSIVE - card view na mobile
{isMobile ? <CardView /> : <TableView />}
```

---

## Checklist przed commitem

```
[ ] Przeczytalam/em odpowiednie sekcje z docs/common-mistakes/
[ ] Sprawdzilem LESSONS_LEARNED.md
[ ] Aktywowalem odpowiedni skill (backend/frontend-dev-guidelines)
[ ] Kod po angielsku, komentarze po polsku
[ ] Komunikaty uzytkownika po polsku
[ ] Uzywam money.ts dla kwot
[ ] Soft delete zamiast hard delete
[ ] Confirmation dla destructive actions
[ ] Disabled buttons podczas mutacji
[ ] Import errors sa raportowane
[ ] Brak try-catch w handlerach
[ ] TypeScript strict - no any
[ ] pnpm (nie npm/yarn)
```

---

## Jak aktualizowac dokumentacje

### Gdy znajdziesz nowy blad:

1. **Znajdz odpowiedni plik** w [docs/common-mistakes/](docs/common-mistakes/)
2. **Dodaj sekcje** w formacie DON'T/DO
3. **Commit message:**
   ```
   docs: Add common mistake - [krotki opis]
   ```

### Gdy tworzysz nowa kategorie:

1. Utworz nowy plik w `docs/common-mistakes/`
2. Dodaj link w tabeli powyzej
3. Dodaj link w [docs/common-mistakes/README.md](docs/common-mistakes/README.md)

---

**Pamietaj:** Te pliki sa Twoja pamiecia projektu. Uzywaj ich!

**Nastepny krok:** Przeczytaj [LESSONS_LEARNED.md](LESSONS_LEARNED.md) - bledy z historii projektu.
