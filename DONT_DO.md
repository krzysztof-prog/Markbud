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

### NIE pozostawiaj duplikatów stron w Next.js App Router
- **Problem:** Dwie strony rozwiązują się do tej samej ścieżki (conflict), build failuje z `PageNotFoundError`
- **Rozwiązanie:** Upewnij się że każda ścieżka ma **dokładnie jedną** stronę
- **Szczegółowo:**
  - Route groups `(name)` muszą mieć `layout.tsx` jeśli zawierają strony
  - Jeśli grupa nie ma layoutu, przenieś strony poza nią
  - Sprawdzaj duplikaty struktury: `/app/magazyn/remanent/page.tsx` vs `/app/(dashboard)/magazyn/remanent/page.tsx`
- **Przykład błędu:**
  ```
  You cannot have two parallel pages that resolve to the same path.
  Please check /(dashboard)/magazyn/akrobud/remanent/page and /magazyn/akrobud/remanent/page
  ```
- **Data nauki:** 2025-12-07 (skanowanie TypeScript)

### NIE zostawiaj starych plików backup w git
- **Problem:** Zaśmiecenie repo, konfuzja podczas refaktoryzacji, duży rozmiar projektu
- **Rozwiązanie:** Nigdy nie commituj `*.backup`, `*.before-*`, `*.new.ts` - używaj git branches zamiast tego
- **Jeśli są konieczne:** Dodaj je do `.gitignore`
- **Przykład z projektu:**
  - `apps/web/src/app/dostawy/page.tsx.backup` (35 KB)
  - `apps/web/src/app/dostawy/page.tsx.before-continuous` (43 KB)
  - `apps/api/src/routes/deliveries.new.ts`, `orders.new.ts`, etc.
- **Data nauki:** 2025-12-07 (skanowanie TypeScript)

### NIE pomijaj walidacji Zod
- **Problem:** Runtime errors, nieprzewidywalne dane
- **Rozwiązanie:** Waliduj WSZYSTKIE inputy w handlerach

### NIE używaj `any` w TypeScript
- **Problem:** Traci się type safety, całkowity bypass type checking
- **Rozwiązanie:** Definiuj typy, używaj `unknown` + type guards, Prisma types dla bazy
- **Szczegółowo:**
  1. **Dla error handling:** `catch (error: unknown)` + `error instanceof Error ? error.message : 'Unknown error'`
  2. **Dla Prisma operacji:** `Prisma.OrderWhereInput`, `Prisma.OrderUpdateInput`, itp.
  3. **Dla dynamicznych obiektów:** `Record<string, unknown>` zamiast `any`
  4. **Dla arrays:** Zawsze konkretny typ: `Window[]` zamiast `any[]`
  5. **Dla React props:** `React.ComponentType<SVGProps<SVGElement>>` dla ikon zamiast `any`
- **Przykłady:**
  ```typescript
  // ❌ ZŁE
  const where: any = {};
  catch (error: any) { }
  windows?: any[];
  icon: any;

  // ✅ DOBRE
  const where: Prisma.OrderWhereInput = {};
  catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
  }
  windows?: Window[];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  ```
- **Data nauki:** 2025-12-07 (skanowanie znalazło 92 instancje `any`, wszystkie naprawione)

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

### NIE używaj `React.ComponentType<any>` dla ikon i komponentów
- **Problem:** Brak type safety dla props, runtime errors w komponencie
- **Rozwiązanie:** Używaj konkretnego typu: `React.ComponentType<React.SVGProps<SVGSVGElement>>` dla SVG ikon
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  type NavItem = {
    icon: any;
  };

  // ✅ DOBRE
  type NavItem = {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
  ```
- **Data nauki:** 2025-12-07 (sidebar.tsx naprawione)

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

## TypeScript

### NIE zamieniaj `as any` na konkretne typy bez zmiany logiki
- **Problem:** `as any` wyłącza type checking - nigdy nie powinna być rozwiązaniem
- **Rozwiązanie:** Zawsze zastąp `as any` na `as konkretnyTyp` lub `as unknown` z type narrowing
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  const result = data as any;  // ← bypass type safety

  // ✅ DOBRE - konkretny typ
  const result = data as Prisma.OrderWhereInput;

  // ✅ DOBRE - double assertion dla dynamicznych danych
  const result = data as unknown as ImportData[];  // tylko gdy struktura jest rzeczywiście dynamiczna
  ```
- **Data nauki:** 2025-12-07 (znaleziono 4 instancje `as any`)

### NIE definiuj typów inline w funkcjach
- **Problem:** Brak reusability, duplikacja kodu, trudne maintenance
- **Rozwiązanie:** Definiuj interfejsy w `/types` i importuj je
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  function processData(item: { id: number; name: string; email: string }) { }
  function processItem(item: { id: number; name: string; email: string }) { }

  // ✅ DOBRE
  // types/user.ts
  interface User {
    id: number;
    name: string;
    email: string;
  }

  // routes/users.ts
  function processData(item: User) { }
  function processItem(item: User) { }
  ```
- **Data nauki:** 2025-12-07 (frontend komponenty miały niezdefiniowane typy)

### NIE mieszaj typów Prisma z dynamicznymi `where` obiektami
- **Problem:** Runtime errors gdy typ się zmieni
- **Rozwiązanie:** Używaj `Prisma.OrderWhereInput` itd. zamiast `Record<string, any>`
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  const where: Record<string, any> = {};
  if (status) where.status = status;

  // ✅ DOBRE
  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  ```
- **Data nauki:** 2025-12-07 (backend routes - 20 instancji naprawionych)

### NIE używaj `unknown` bez type narrowing
- **Problem:** `unknown` jest bezpieczniejszy niż `any`, ale bez sprawdzenia typu to nadal ma ograniczenia
- **Rozwiązanie:** Zawsze sprawdzaj typ zanim go użyjesz
- **Przykład:**
  ```typescript
  // ❌ ZŁE
  catch (error: unknown) {
    console.log(error.message);  // Error! error może być wszystkim
  }

  // ✅ DOBRE
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(message);
  }
  ```
- **Data nauki:** 2025-12-07 (error handling naprawy)

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

### NIE pomijaj regularnego skanowania TypeScript
- **Problem:** `any` typy, brakujące interfejsy, niebezpieczne assertions mogą się gromadzić
- **Rozwiązanie:**
  1. Co tydzień uruchom: `pnpm exec tsc --noEmit`
  2. Szukaj: `grep -r "any" --include="*.ts" --include="*.tsx" apps/`
  3. Szukaj: `grep -r " as any" --include="*.ts" --include="*.tsx" apps/`
  4. Szukaj: `grep -r "catch (error: any)" --include="*.ts" --include="*.tsx" apps/`
- **Co szukać:**
  - `any` w typach (zamiast `unknown`, `Record<string, unknown>`, konkretnych typów)
  - `as any` assertions (zamiast konkretnych typów)
  - `catch (error: any)` (zamiast `catch (error: unknown)`)
  - Niezdefiniowane interfejsy (zamiast inline typów)
- **Jak naprawić:** Użyj konkretnych typów Prisma, React typów, lub stwórz interfejsy w `/types`
- **Data nauki:** 2025-12-07 (skanowanie znalazło 92 instancje `any` w jednym projekcie!)

---

## UX i Komponenty UI

### NIE używaj tego samego wariantu dla warning i error toastów
- **Problem:** Użytkownik nie rozróżnia ostrzeżenia od błędu - oba są czerwone
- **Rozwiązanie:** Osobne warianty: `destructive` (czerwony) dla błędów, `warning` (żółty) dla ostrzeżeń
- **Przykład:**
  ```typescript
  // ❌ ZŁE - oba czerwone
  showWarningToast('Uwaga!', 'Coś może być nie tak');  // variant: 'destructive'
  showErrorToast('Błąd!', 'Operacja się nie udała');   // variant: 'destructive'

  // ✅ DOBRE - rozróżnialne
  showWarningToast('Uwaga!', 'Coś może być nie tak');  // variant: 'warning' (żółty)
  showErrorToast('Błąd!', 'Operacja się nie udała');   // variant: 'destructive' (czerwony)
  ```
- **Data nauki:** 2025-12-07 (UX improvements)

### NIE polegaj tylko na drag & drop bez alternatywy
- **Problem:** Użytkownicy z touchpadem/accessibility tools nie mogą korzystać z funkcji
- **Rozwiązanie:** Zawsze dodaj context menu (PPM) jako alternatywę dla drag & drop
- **Przykład:**
  ```typescript
  // ❌ ZŁE - tylko drag & drop
  <DraggableOrder order={order} />

  // ✅ DOBRE - drag & drop + context menu
  <DraggableOrderWithContextMenu
    order={order}
    availableDeliveries={deliveries}
    onMoveToDelivery={(orderId, deliveryId) => moveOrder(orderId, deliveryId)}
  />
  ```
- **Data nauki:** 2025-12-07 (UX improvements - context menu fallback)

### NIE używaj nieistniejących klas Tailwind
- **Problem:** Klasa nie działa, style są ignorowane bez błędu
- **Rozwiązanie:** Sprawdzaj dokumentację Tailwind lub używaj arbitrary values `[...]`
- **Przykład:**
  ```typescript
  // ❌ ZŁE - nieistniejąca klasa
  className="rounded-inherit"

  // ✅ DOBRE - arbitrary value
  className="rounded-[inherit]"
  ```
- **Data nauki:** 2025-12-07 (loading-overlay.tsx)

### NIE importuj nieużywanych ikon/komponentów
- **Problem:** Zwiększony bundle size, dead code
- **Rozwiązanie:** Usuwaj nieużywane importy (ESLint/TSC powinny to wyłapać)
- **Przykład:**
  ```typescript
  // ❌ ZŁE - Cloud nigdy nie użyty
  import { CheckCircle, AlertCircle, RefreshCw, Cloud, CloudOff } from 'lucide-react';

  // ✅ DOBRE - tylko używane
  import { CheckCircle, AlertCircle, RefreshCw, CloudOff } from 'lucide-react';
  ```
- **Data nauki:** 2025-12-07 (sync-indicator.tsx)

### NIE pokazuj optimistic updates bez wizualnego feedbacku
- **Problem:** Użytkownik nie wie czy dane są zsynchronizowane czy jeszcze nie
- **Rozwiązanie:** Dodaj SyncIndicator lub inne wizualne oznaczenie dla `_optimistic: true`
- **Przykład:**
  ```typescript
  // ❌ ZŁE - brak oznaczenia optimistic update
  <div>{order.orderNumber}</div>

  // ✅ DOBRE - widoczny status synchronizacji
  <div className={order._optimistic ? 'border-yellow-300' : ''}>
    {order.orderNumber}
    {order._optimistic && <SyncIndicator status="pending" />}
  </div>
  ```
- **Data nauki:** 2025-12-07 (UX improvements - SyncIndicator)

### NIE wywołuj optional function bez optional chaining
- **Problem:** Runtime error jeśli funkcja jest undefined
- **Rozwiązanie:** Używaj `fn?.()` lub sprawdzaj przed wywołaniem
- **Przykład:**
  ```typescript
  // ❌ ZŁE - crash jeśli onMoveToDelivery jest undefined
  onClick={() => onMoveToDelivery(order.id, delivery.id)}

  // ✅ DOBRE - safe call
  onClick={() => onMoveToDelivery?.(order.id, delivery.id)}
  ```
- **Data nauki:** 2025-12-07 (DragDropComponents.tsx)

---

## React Hooks i State Management

### NIE zapominaj o synchronizacji lokalnego state z props
- **Problem:** Komponent używa `useState(value)` ale gdy `value` zmieni się z zewnątrz (np. po fetch z API), lokalny state nie jest aktualizowany
- **Rozwiązanie:** Dodaj `useEffect` który synchronizuje state gdy props się zmieni
- **Przykład:**
  ```typescript
  // ❌ ZŁE - manualPath nie aktualizuje się po załadowaniu settings z API
  const [manualPath, setManualPath] = useState(value);

  // ✅ DOBRE - synchronizacja z zewnętrzną wartością
  const [manualPath, setManualPath] = useState(value);
  useEffect(() => {
    setManualPath(value);
  }, [value]);
  ```
- **Data nauki:** 2025-12-07 (FolderBrowser component)

### NIE duplikuj logiki w onClick i onDoubleClick
- **Problem:** Kod robi to samo w obu handlerach, utrudnia maintenance i tworzy race conditions
- **Rozwiązanie:** Rozdziel odpowiedzialności - single click = zaznacz, double click = nawiguj
- **Przykład:**
  ```typescript
  // ❌ ZŁE - duplikacja logiki
  onClick={() => {
    setCurrentPath(item.path);
    setSelectedPath(item.path);
  }}
  onDoubleClick={() => {
    setCurrentPath(item.path);  // duplikacja!
    setSelectedPath(item.path);
  }}

  // ✅ DOBRE - rozdzielone odpowiedzialności
  onClick={() => setSelectedPath(item.path)}  // tylko zaznacz
  onDoubleClick={() => {
    setCurrentPath(item.path);   // nawiguj
    setSelectedPath(item.path);
  }}
  ```
- **Data nauki:** 2025-12-07 (FolderBrowser component)

### NIE waliduj danych przy każdej zmianie bez debounce
- **Problem:** Zbyt wiele requestów do API, słaba wydajność
- **Rozwiązanie:** Użyj debounce (setTimeout + clearTimeout w cleanup)
- **Przykład:**
  ```typescript
  // ❌ ZŁE - walidacja przy każdym keystroke
  useEffect(() => {
    validateFolder(path);  // request co 50ms podczas pisania!
  }, [path]);

  // ✅ DOBRE - debounce 500ms
  useEffect(() => {
    const timeout = setTimeout(() => {
      validateFolder(path);
    }, 500);
    return () => clearTimeout(timeout);
  }, [path]);
  ```
- **Data nauki:** 2025-12-07 (FolderBrowser component)

---

## Eksportowanie zmiennych między modułami

### NIE używaj `const` dla zmiennych które muszą być reassigned w runtime
- **Problem:** `const` nie może być reassigned, więc nie możesz jej zmienić później (np. przy starcie serwera)
- **Rozwiązanie:** Użyj `let` dla zmiennych które będą inicjalizowane później
- **Przykład:**
  ```typescript
  // ❌ ZŁE - nie możesz zmienić fileWatcher później
  export const fileWatcher = null;
  // ... później
  fileWatcher = new FileWatcherService();  // ERROR!

  // ✅ DOBRE - let pozwala na późniejsze przypisanie
  export let fileWatcher: FileWatcherService | null = null;
  // ... później
  fileWatcher = new FileWatcherService();  // OK
  ```
- **Data nauki:** 2025-12-07 (index.ts - eksport fileWatcher do routes)

---

## PDF Generation

### NIE używaj Helvetica dla polskich znaków w pdfkit
- **Problem:** Helvetica nie obsługuje polskich znaków (ą, ę, ć, ń, ó, ś, ź, ż) - będą wyświetlane jako kwadraty lub puste
- **Rozwiązanie:** Użyj fontu z pełną obsługą Unicode lub wbuduj własny font TTF
- **Przykład:**
  ```typescript
  // ❌ ZŁE - Helvetica nie obsługuje polskich znaków
  doc.font('Helvetica').text('Protokół Odbioru');

  // ✅ DOBRE - użyj fontu z obsługą Unicode lub embeduj font
  doc.registerFont('DejaVu', 'fonts/DejaVuSans.ttf');
  doc.font('DejaVu').text('Protokół Odbioru');
  ```
- **Uwaga:** Dla prostych dokumentów Helvetica może działać jeśli tekst jest głównie angielski, ale polskie teksty wymagają lepszego fontu
- **Data nauki:** 2025-12-07 (DeliveryProtocolService)

### NIE generuj PDF inline w route handler
- **Problem:** Kod jest nieczytelny, trudny do testowania, brak separacji odpowiedzialności
- **Rozwiązanie:** Stwórz dedykowany Service dla generowania PDF
- **Przykład:**
  ```typescript
  // ❌ ZŁE - generowanie PDF w route
  fastify.get('/pdf', async (req, reply) => {
    const doc = new PDFDocument();
    doc.text('...');
    // 100+ linii PDF generation
    reply.send(buffer);
  });

  // ✅ DOBRE - dedykowany service
  // DeliveryProtocolService.ts
  export class DeliveryProtocolService {
    async generatePdf(data: ProtocolData): Promise<Buffer> { ... }
  }

  // routes/deliveries.ts
  fastify.get('/pdf', async (req, reply) => {
    const buffer = await protocolService.generatePdf(data);
    reply.send(buffer);
  });
  ```
- **Data nauki:** 2025-12-07 (protokół odbioru dostaw)

---

## Komponenty React - Wydajność

### NIE twórz helper functions wewnątrz komponentu
- **Problem:** Funkcje są tworzone na nowo przy każdym renderze, co może powodować problemy z wydajnością
- **Rozwiązanie:** Przenieś pure functions (bez zależności od props/state) poza komponent
- **Przykład:**
  ```typescript
  // ❌ ZŁE - funkcja tworzona przy każdym renderze
  function MyComponent({ value }) {
    const getColor = (val: number) => val > 0 ? 'green' : 'red';
    return <div className={getColor(value)}>{value}</div>;
  }

  // ✅ DOBRE - funkcja zdefiniowana raz
  const getColor = (val: number) => val > 0 ? 'green' : 'red';

  function MyComponent({ value }) {
    return <div className={getColor(value)}>{value}</div>;
  }
  ```
- **Kiedy zostawić wewnątrz:** Gdy funkcja zależy od props/state i użycie `useCallback` jest uzasadnione
- **Data nauki:** 2025-12-07 (WarehouseHistory.tsx)

### NIE obliczaj danych pochodnych bez useMemo dla dużych zbiorów
- **Problem:** Grupowanie/sortowanie/filtrowanie dużych tablic przy każdym renderze spowalnia UI
- **Rozwiązanie:** Użyj `useMemo` z odpowiednimi zależnościami
- **Przykład:**
  ```typescript
  // ❌ ZŁE - obliczane przy każdym renderze
  function HistoryTable({ history }) {
    const grouped = history.reduce((acc, item) => { ... }, {});
    const sorted = Object.keys(grouped).sort();
    return <table>...</table>;
  }

  // ✅ DOBRE - obliczane tylko gdy history się zmieni
  function HistoryTable({ history }) {
    const { grouped, sorted } = useMemo(() => {
      const grouped = history.reduce((acc, item) => { ... }, {});
      const sorted = Object.keys(grouped).sort();
      return { grouped, sorted };
    }, [history]);
    return <table>...</table>;
  }
  ```
- **Data nauki:** 2025-12-07 (WarehouseHistory.tsx)

### NIE przekazuj komponentu jako prop gdy oczekiwany jest ReactNode
- **Problem:** `icon={History}` przekazuje klasę komponentu, nie wyrenderowany element
- **Rozwiązanie:** Przekaż wyrenderowany JSX: `icon={<History />}`
- **Przykład:**
  ```typescript
  // ❌ ZŁE - przekazuje referencję do komponentu
  <EmptyState icon={History} title="Brak danych" />

  // ✅ DOBRE - przekazuje wyrenderowany element
  <EmptyState icon={<History className="h-12 w-12" />} title="Brak danych" />
  ```
- **Błąd TypeScript:** `Type 'ForwardRefExoticComponent...' is not assignable to type 'ReactNode'`
- **Data nauki:** 2025-12-07 (WarehouseHistory.tsx + EmptyState)

---

## Shadcn/UI

### NIE zakładaj że wszystkie komponenty są zainstalowane
- **Problem:** Shadcn komponenty trzeba dodawać pojedynczo, mogą brakować zależności
- **Rozwiązanie:** Sprawdź czy komponent istnieje przed użyciem, jeśli nie - dodaj
- **Jak sprawdzić:**
  ```bash
  ls apps/web/src/components/ui/scroll-area.tsx  # sprawdź czy istnieje
  ```
- **Jak dodać:**
  ```bash
  cd apps/web && npx shadcn@latest add scroll-area
  # lub ręcznie skopiuj z shadcn/ui docs
  ```
- **Brakujące komponenty z tego projektu:** `alert`, `scroll-area`
- **Data nauki:** 2025-12-07 (folder-browser.tsx potrzebował scroll-area)

---

## Dodawanie nowych wpisów

Format:
```markdown
### NIE [co nie robić]
- **Problem:** [co poszło źle]
- **Rozwiązanie:** [jak robić poprawnie]
```

Dodaj po każdym błędzie który stracił Ci czas!
