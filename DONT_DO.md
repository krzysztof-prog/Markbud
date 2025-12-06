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

### NIE dodawaj `@@index` na kolumny które mają `@@unique`
- **Problem:** `@@unique` automatycznie tworzy indeks w SQLite - duplikacja marnuje miejsce i spowalnia INSERT/UPDATE
- **Przykład błędu:**
  ```prisma
  @@unique([orderId, profileId, colorId])  // ← To już tworzy indeks!
  @@index([orderId, profileId, colorId])   // ← DUPLIKACJA - nie dodawaj!
  ```
- **Rozwiązanie:** `@@unique` wystarczy sam, nie dodawaj `@@index` na te same kolumny
- **Data nauki:** 2025-12-06 (optymalizacja bazy)

### NIE dodawaj indeksów bez weryfikacji użycia
- **Problem:** Nieużywane indeksy marnują miejsce i spowalniają zapisy, a nie przyspieszają niczego
- **Rozwiązanie:**
  1. Sprawdź EXPLAIN QUERY PLAN dla kluczowych queries
  2. Dodawaj indeksy tylko tam gdzie są faktycznie używane
  3. Monitor slow queries przed dodaniem indeksów
- **Przykład:**
  ```sql
  EXPLAIN QUERY PLAN
  SELECT * FROM orders WHERE archived_at IS NULL AND status = 'new';
  -- Sprawdź czy używa dodanego indeksu!
  ```
- **Data nauki:** 2025-12-06

### NIE zakładaj że composite index zastępuje single-column index
- **Problem:** W SQLite composite index (col1, col2) może obsłużyć WHERE col1=?, ale single index jest szybszy dla prostych queries
- **Kiedy zachować oba:**
  - Jeśli kod używa OBIE wersje: `WHERE col1=?` I `WHERE col1=? AND col2=?`
  - Single index jest mniejszy i szybszy dla prostych filtrów
- **Kiedy usunąć single:**
  - Jeśli ZAWSZE filtrujesz z obiema kolumnami
  - Po weryfikacji EXPLAIN QUERY PLAN
- **Data nauki:** 2025-12-06

### NIE zapomnij `npx prisma generate` po zmianie schema
- **Problem:** Prisma Client jest nieaktualny, TypeScript types nie zgadzają się, runtime errors
- **Rozwiązanie:**
  1. Zatrzymaj backend (żeby nie było file lock)
  2. Po każdej zmianie schema: `npx prisma generate`
  3. Restart backendu
- **Przykład błędu:** `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`
- **Data nauki:** 2025-12-06

### NIE rób optymalizacji "na czuja"
- **Problem:** Założenia != rzeczywistość, można pogorszyć zamiast poprawić
- **Rozwiązanie:**
  1. **MEASURE** - zmierz wydajność PRZED optymalizacją
  2. **PLAN** - zaprojektuj zmiany z uzasadnieniem
  3. **IMPLEMENT** - wprowadź zmiany
  4. **MEASURE** - zmierz wydajność PO optymalizacji
  5. **REVIEW** - zweryfikuj czy zysk jest realny
- **Data nauki:** 2025-12-06

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

### NIE implementuj business logic w routes
- **Problem:**
  - Naruszenie layered architecture (Route → Handler → Service → Repository)
  - Brak emisji WebSocket events
  - Duplikacja kodu
  - Niemożność unit testowania
- **Rozwiązanie:** Route deleguje do Handler, Handler do Service
- **Przykład błędu:**
  ```typescript
  // ❌ ZŁE - transakcja bezpośrednio w route
  fastify.post('/move-order', async (request) => {
    const result = await prisma.$transaction(async (tx) => {
      // 30 linii business logic
    });
  });

  // ✅ DOBRE - delegacja do service
  fastify.post('/move-order', async (request) => {
    const result = await deliveryService.moveOrder(...);
  });
  ```
- **Data nauki:** 2025-12-06 (moveOrder endpoint bypass'ował service)

### NIE używaj parseInt/Number bez walidacji
- **Problem:** NaN może trafić do bazy danych, cryptic errors
- **Rozwiązanie:** Zawsze sprawdzaj `isNaN()` po parseInt
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  const id = parseInt(request.params.id, 10);
  await prisma.order.findUnique({ where: { id } }); // Może być NaN!

  // ✅ DOBRE
  const id = parseInt(request.params.id, 10);
  if (isNaN(id)) {
    return reply.status(400).send({ error: 'Invalid ID' });
  }
  await prisma.order.findUnique({ where: { id } });
  ```
- **Data nauki:** 2025-12-06 (znaleziono w 13+ endpointach)

### NIE używaj startsWith() dla path validation na Windows
- **Problem:** `startsWith()` jest case-sensitive, Windows filesystem nie - path traversal bypass
- **Rozwiązanie:** Case-insensitive validation
- **Przykład błędu:**
  ```typescript
  // ❌ ZŁE - "c:\dostawy" bypass "C:\Dostawy"
  if (!path.startsWith(basePath)) { ... }

  // ✅ DOBRE
  if (!path.toLowerCase().startsWith(basePath.toLowerCase())) { ... }
  ```
- **Data nauki:** 2025-12-06 (critical security issue)

### NIE rób operacji remove+add zamiast atomowej transakcji
- **Problem:** Jeśli remove się powiedzie ale add failuje, dane są zgubione
- **Rozwiązanie:** Jedna transakcja dla całej operacji
- **Przykład błędu:**
  ```typescript
  // ❌ ZŁE - partial failure możliwe
  await removeOrderFromDelivery(sourceId, orderId);
  await addOrderToDelivery(targetId, orderId); // Jeśli failuje = order zgubiony!

  // ✅ DOBRE - atomowa transakcja
  await prisma.$transaction(async (tx) => {
    await tx.deliveryOrder.delete({ where: { ... } });
    await tx.deliveryOrder.create({ data: { ... } });
  });
  ```
- **Data nauki:** 2025-12-06 (moveOrderBetweenDeliveries fix)

### NIE pobieraj max position poza transakcją
- **Problem:** Race condition - dwa równoległe requesty mogą dostać tę samą pozycję
- **Rozwiązanie:** Aggregate i create w jednej transakcji
- **Przykład:**
  ```typescript
  // ❌ ZŁE - race condition
  const maxPos = await getMaxPosition(deliveryId);
  await createOrder(deliveryId, orderId, maxPos + 1);

  // ✅ DOBRE - atomowe
  await prisma.$transaction(async (tx) => {
    const result = await tx.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true }
    });
    await tx.deliveryOrder.create({
      data: { deliveryId, orderId, position: (result._max.position || 0) + 1 }
    });
  });
  ```
- **Data nauki:** 2025-12-06 (addOrderToDelivery race condition)

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

### NIE używaj fetch() bez timeout
- **Problem:** Request może wisieć w nieskończoność, brak feedback dla użytkownika
- **Rozwiązanie:** Użyj AbortController z timeoutem
- **Przykład:**
  ```typescript
  // ❌ ZŁE - może wisieć w nieskończoność
  const response = await fetch(url);

  // ✅ DOBRE - timeout after 3.5 min
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 210000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  ```
- **Data nauki:** 2025-12-06 (Schuco scraping timeout issues)

### NIE rób optimistic updates bez rollback
- **Problem:** Po błędzie użytkownik widzi fake data w UI
- **Rozwiązanie:** Rollback w onError callback
- **Przykład:**
  ```typescript
  // ❌ ZŁE - brak rollback
  useMutation({
    onMutate: async () => {
      queryClient.setQueryData(['key'], newData);
      // Jeśli request failuje, newData zostaje!
    },
  });

  // ✅ DOBRE - rollback w onError
  useMutation({
    onMutate: async () => {
      const previousData = queryClient.getQueryData(['key']);
      queryClient.setQueryData(['key'], newData);
      return { previousData };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['key'], context.previousData);
    },
  });
  ```
- **Data nauki:** 2025-12-06 (optimistic updates bez rollback)

### NIE używaj niespójnych wzorców dla optional arrays
- **Problem:** `array?.method() || []` vs `(array || [])` - różne zachowania
- **Rozwiązanie:** Zawsze używaj `(array || []).method()` dla spójności
- **Przykład:**
  ```typescript
  // ❌ NIESPÓJNE
  const filtered = items?.filter(x => x.active) || [];  // Problem jeśli items jest []
  const mapped = (items || []).map(x => x.name);

  // ✅ SPÓJNE
  const filtered = (items || []).filter(x => x.active);
  const mapped = (items || []).map(x => x.name);
  ```
- **Data nauki:** 2025-12-06 (optimistic update inconsistency)

### NIE używaj tej samej wartości timeout dla frontend i backend
- **Problem:** Race condition - frontend może timeout'ować zanim backend zdąży odpowiedzieć
- **Rozwiązanie:** Frontend timeout powinien być ~20% dłuższy niż backend
- **Przykład:**
  ```typescript
  // Backend handler timeout: 180000ms (3 min)
  // Frontend fetch timeout: 210000ms (3.5 min) - 30s marginesu
  ```
- **Data nauki:** 2025-12-06 (Schuco operations timing out)

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

### NIE akceptuj wyniku bez self-review
- **Problem:** Claude może popełnić błędy (jak duplikacja indeksu) które zauważy dopiero przy analizie
- **Rozwiązanie:**
  1. Po ukończeniu zadania: poproś Claude o krytyczną recenzję własnej pracy
  2. Poproś o listę "co może być zepsute"
  3. Uruchom testy/weryfikację
  4. Popraw znalezione błędy
- **Przykład:** "Zrecenzuj swoją pracę i wymień, co może być zepsute"
- **Data nauki:** 2025-12-06 (znalazłem duplikację indeksu przez self-review)

---

## Dodawanie nowych wpisów

Format:
```markdown
### NIE [co nie robić]
- **Problem:** [co poszło źle]
- **Rozwiązanie:** [jak robić poprawnie]
```

Dodaj po każdym błędzie który stracił Ci czas!
