# DONT_DO - Błędy do unikania

> Dodawaj tutaj lekcje z błędów. Claude przeczyta to na początku każdej sesji.

---

## Baza danych

### NIE używaj `pnpm db:push`
- **Problem:** Kasuje wszystkie dane w bazie
- **Rozwiązanie:** Zawsze `pnpm db:migrate`

### NIE modyfikuj `schema.prisma` bez migracji
- **Problem:** Rozsynchronizowanie schematu z bazą
- **Rozwiązanie:** Po zmianie schema zawsze `pnpm db:migrate`

---

## Backend

### NIE pomijaj walidacji Zod
- **Problem:** Runtime errors, nieprzewidywalne dane
- **Rozwiązanie:** Waliduj WSZYSTKIE inputy w handlerach

### NIE używaj `any` w TypeScript
- **Problem:** Traci się type safety
- **Rozwiązanie:** Definiuj typy, używaj `unknown` + type guards

### NIE rób długich transakcji Prisma
- **Problem:** Blokuje bazę, timeout errors
- **Rozwiązanie:** Krótkie transakcje, batch operations

---

## Frontend

### NIE używaj `useEffect` do data fetching
- **Problem:** Race conditions, brak cache
- **Rozwiązanie:** React Query (`useQuery`, `useMutation`)

### NIE hardcoduj URL API
- **Problem:** Nie działa w różnych środowiskach
- **Rozwiązanie:** Użyj `api-client.ts` i zmiennych env

### NIE importuj całych bibliotek
- **Problem:** Bundle size
- **Rozwiązanie:** Importuj tylko to co potrzeba (tree-shaking)

---

## Git

### NIE commituj bez sprawdzenia
- **Problem:** Commity z błędami TypeScript
- **Rozwiązanie:** Przed commitem: `pnpm lint && pnpm build`

### NIE pushuj do main bez review
- **Problem:** Broken code na produkcji
- **Rozwiązanie:** Feature branch → PR → merge

---

## Claude Code

### NIE dawaj zbyt wielu zadań naraz
- **Problem:** Claude gubi kontekst, robi błędy
- **Rozwiązanie:** Jedno zadanie → weryfikacja → następne

### NIE ignoruj błędów kompilacji
- **Problem:** Kaskada błędów
- **Rozwiązanie:** Napraw błędy zanim przejdziesz dalej

---

## Dodawanie nowych wpisów

Format:
```markdown
### NIE [co nie robić]
- **Problem:** [co poszło źle]
- **Rozwiązanie:** [jak robić poprawnie]
```

Dodaj po każdym błędzie który stracił Ci czas!
