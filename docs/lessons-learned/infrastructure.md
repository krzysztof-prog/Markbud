# Lessons Learned - Infrastructure & Configuration

> Błędy związane z kompresją, routingiem, WebSocket i konfiguracją serwera.

---

## 2026-01-16 - Kompresja gzip i next/dynamic powodują puste odpowiedzi i błędy hydration

**Co się stało:**
Dashboard Operatora nie wyświetlał danych. Dwa różne błędy:
1. **JSON parse error:** "Unexpected end of JSON input" przy przełączaniu filtra "Tylko moje zlecenia"
2. **Hydration error:** "Cannot read properties of undefined (reading 'call')" w komponencie `<Lazy>`

**Root cause:**
1. **Kompresja gzip (`@fastify/compress`)** - zwracała puste odpowiedzi (`content-length: 0`) w przeglądarce przy większych payloadach JSON w połączeniu z CORS. Request z curl działał, ale przeglądarka otrzymywała pustą odpowiedź.
2. **next/dynamic z ssr:false** - w Next.js 15.5.7 powoduje crash "Cannot read properties of undefined (reading 'call')" dla komponentów używanych na każdej stronie (Sidebar).

**Impact:**
- **Krytyczny:** Dashboard Operatora całkowicie niedziałający
- Błąd JSON parse przy każdym przełączeniu filtra
- Crash aplikacji przy wchodzeniu na stronę

**Fix:**
1. **Wyłączono kompresję gzip** w `apps/api/src/index.ts`:
   ```typescript
   // import compress from '@fastify/compress'; // DISABLED - causes empty responses
   // await fastify.register(compress, { ... });
   ```
2. **Usunięto next/dynamic** z `client-sidebar.tsx` i `dashboard-wrapper.tsx`:
   ```typescript
   // PRZED: const Sidebar = dynamic(() => import('./sidebar'), { ssr: false });
   // PO: import { Sidebar } from './sidebar';
   ```

**Prevention:**
1. **NIE używaj @fastify/compress z CORS** - powoduje puste odpowiedzi w przeglądarce
2. **NIE używaj next/dynamic z ssr:false dla komponentów na każdej stronie** - Sidebar, Header, Layout
3. **Lazy loading tylko dla ciężkich komponentów używanych rzadko** - DataGrid, wykresy, PDF viewer
4. **Testuj zmiany w przeglądarce, nie tylko curl** - gzip działa inaczej w curl vs przeglądarka
5. **Sprawdź content-length w Network tab** - `content-length: 0` przy 200 OK = problem z kompresją

**Lekcja:**
- Kompresja gzip na lokalnej sieci (5-10 użytkowników) nie jest potrzebna i może powodować problemy
- next/dynamic jest problematyczny w Next.js 15.x - używaj bezpośrednich importów gdzie to możliwe
- Testuj w przeglądarce, nie tylko terminalem - zachowanie może się różnić

---

## 2026-01-16 - Audyt routingów - duplikaty, aliasy i brakujące zabezpieczenia

**Co się stało:**
Podczas audytu routingów w aplikacji znaleziono kilka problemów:
1. **Duplikat ordersApi** - dwa pliki z API clientem dla zleceń
2. **Alias /moja-praca bez /api prefix** - zduplikowana rejestracja routów
3. **Brakujące PROTECTED_ROUTES** - wiele stron bez ochrony ról

**Root cause:**
1. **ordersApi duplikat**: Stworzony podczas refaktoryzacji do features/, ale nigdy nie użyty - zapomniano usunąć `lib/api/orders.ts` lub odwrotnie
2. **Alias bez /api**: Dodany "dla kompatybilności wstecznej" ale nigdy nieużywany przez frontend
3. **PROTECTED_ROUTES**: Middleware dodano ale nie zaktualizowano o wszystkie strony

**Impact:**
- **Niski** (duplikat): Dead code, mylące dla deweloperów
- **Niski** (alias): Potencjalny konflikt z Next.js routing (nigdy nie wystąpił)
- **Średni** (PROTECTED_ROUTES): Każdy zalogowany użytkownik mógł wejść na strony typu /dostawy, /magazyn bez sprawdzenia roli

**Fix:**
1. Usunięto `apps/web/src/features/orders/api/ordersApi.ts`
2. Usunięto alias `/moja-praca` z `apps/api/src/index.ts`
3. PROTECTED_ROUTES - **DO ZROBIENIA** (wymaga decyzji o mapie ról)

**Prevention:**
1. **Jeden API client** - zawsze `@/lib/api/[nazwa].ts`, nie duplikuj w features/
2. **Wszystkie API routes z /api prefix** - nie twórz aliasów bez /api
3. **Kolejność routów** - stałe ścieżki (`/calendar`) PRZED dynamicznymi (`/:id`)
4. **Audyt middleware** - przy dodawaniu nowej strony, dodaj do PROTECTED_ROUTES
5. **Grep na duplikaty** - `git grep "ordersApi\|deliveriesApi"` znajdzie duplikaty

**Lekcja:**
- Regularny audyt routingów zapobiega narastaniu "martwego kodu"
- Aliasy "dla kompatybilności" często nie są potrzebne i mylą
- Middleware PROTECTED_ROUTES musi być aktualizowane przy każdej nowej stronie

---

## 2026-01-05 - Dashboard nie ładował się po restarcie (WebSocket interference + cache)

**Co się stało:**
Dashboard pokazywał błąd "Failed to parse JSON" mimo że backend zwracał prawidłowe dane (2234 bajty JSON). Problem występował nawet po `localStorage.clear()` i restarcie. DevTools pokazywało 200 OK ale **pustą odpowiedź**. Backend logował "premature close".

**Root cause:**
1. **WebSocket agresywnie próbował reconnect** z wygasłym JWT tokenem
   - `getAuthToken()` nie miał timeout - mógł blokować na zawsze
   - 10 prób reconnect co 3s = 10 HTTP requests w tle
   - To powodowało **interference z Dashboard HTTP request** -> "premature close"

2. **React Query persistence cachował złe odpowiedzi**
   - `maxAge: 24h` - cachował przez cały dzień
   - Walidacja `status === 'success'` ale **nie sprawdzała czy data !== null**
   - Puste odpowiedzi były cachowane i używane zamiast fetchować świeże dane

**Impact:**
- **Krytyczny UX:** Dashboard nie działał po restarcie
- Użytkownik musiał wiedzieć żeby czyścić localStorage co dzień
- Trudny do zdiagnozowania - curl działał, frontend nie
- Token wygasał co 24h, problem powtarzał się codziennie

**Fix:**
1. **WebSocket - graceful degradation:**
   ```typescript
   // Timeout 2s na getAuthToken()
   const token = await Promise.race([
     getAuthToken(),
     new Promise(resolve => setTimeout(() => resolve(null), 2000))
   ]);

   // Wykrywanie auth error (1008) - nie reconnect
   if (event.code === 1008) {
     reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
     return;
   }

   // Exponential backoff: 3s -> 4.5s -> 6.75s -> max 30s
   const delay = Math.min(
     RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1),
     30000
   );
   ```

2. **React Query - bezpieczniejszy cache:**
   ```typescript
   maxAge: 10 * 60 * 1000, // 10 min zamiast 24h
   shouldDehydrateQuery: (query) => (
     query.state.status === 'success' &&
     query.state.data !== null &&
     query.state.data !== undefined
   )
   ```

3. **Auth token fetch - timeout:**
   ```typescript
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 3000);
   await fetch('/api/auth/demo-token', { signal: controller.signal });
   ```

**Prevention:**
- **WebSocket ZAWSZE z graceful degradation** - aplikacja musi działać bez WS
- **Timeout na WSZYSTKIE async operacje** w critical path (max 3s)
- **React Query cache:** waliduj `data !== null` przed persistowaniem
- **Krótszy maxAge:** minuty nie godziny (10 min zamiast 24h)
- **Auth errors (1008) = stop retry** nie reconnect
- **Exponential backoff** dla reconnect (nie stały interval)
- **Debugging:** "premature close" w backend = frontend zamyka za wcześnie
- **Test z curl:** jeśli backend działa a frontend nie = problem w frontend

**Szczegóły:** [docs/reviews/DASHBOARD_FIX_2026-01-05.md](docs/reviews/DASHBOARD_FIX_2026-01-05.md)

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)
