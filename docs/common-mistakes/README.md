# Common Mistakes - Spis Tresci

> **Claude:** Przeczytaj odpowiednie sekcje PRZED kazdym kodowaniem!
> Ta lista rosnie z kazdym bledem - jesli popelnisz nowy, **dodaj go tutaj**.

**Ostatnia aktualizacja:** 2026-01-20
**Zrodlo:** Audyt kodu + doswiadczenie projektu

---

## Nawigacja po sekcjach

| Sekcja | Plik | Opis |
|--------|------|------|
| Operacje na pieniadzach | [money-operations.md](money-operations.md) | money.ts, grosze vs zlotowki, formatowanie |
| Usuwanie danych | [data-deletion.md](data-deletion.md) | Soft delete, confirmation dialogs |
| Importy i parsowanie | [imports-parsing.md](imports-parsing.md) | Raportowanie bledow, zbieranie errors[] |
| Buttony i mutacje | [buttons-mutations.md](buttons-mutations.md) | disabled={isPending}, loading states |
| Architektura Backend | [backend-architecture.md](backend-architecture.md) | Try-catch, Prisma, transakcje, gzip |
| Frontend - React | [frontend-react.md](frontend-react.md) | React Query, Suspense, Dynamic Imports |
| Walidacja i bezpieczenstwo | [validation-security.md](validation-security.md) | Zod, confirmation dialogs, autoryzacja |
| Pozostale | [other.md](other.md) | pnpm, komentarze, testy, responsive, routing |

---

## Szybki checklist przed commitem

```
[ ] Przeczytalam/em odpowiednie sekcje COMMON_MISTAKES
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

## Jak aktualizowac te pliki

### Gdy znajdziesz nowy blad:

1. **Dodaj sekcje** w odpowiednim pliku kategorii
2. **Format:**
   ```markdown
   ### DON'T - Co jest zle
   ```code example```
   **Dlaczego:** Wyjasnienie

   ### DO - Jak poprawnie
   ```code example```
   **Gdzie sprawdzic:** Link do pliku/dokumentacji
   ```

3. **Commit message:**
   ```
   docs: Add common mistake - [krotki opis]

   Found in: [gdzie znalazles blad]
   Impact: [jakie konsekwencje]
   ```

---

## Powrot do glownego pliku

[< Powrot do COMMON_MISTAKES.md](../../COMMON_MISTAKES.md)

---

**Pamietaj:** Te pliki sa Twoja pamiecia. Uzywaj ich!

**Nastepny krok:** Przeczytaj [LESSONS_LEARNED.md](../../LESSONS_LEARNED.md) - bledy z historii projektu.
