# Lessons Learned - Błędy z historii projektu

> **Claude:** Przeczytaj ten plik żeby NIE POWTARZAĆ błędów z przeszłości!
> Każdy wpis to rzeczywisty błąd który został popełniony i naprawiony.

**Format wpisu:**
```
## [Data] - [Tytuł błędu]
**Co się stało:** [opis problemu]
**Root cause:** [dlaczego to się stało]
**Impact:** [jakie były konsekwencje]
**Fix:** [jak naprawiono]
**Prevention:** [jak zapobiec w przyszłości]
```

---

## 2026-01-15 - API Client nie wysyłał tokenu autoryzacji + niezgodność kluczy tokena

**Co się stało:**
Po restarcie aplikacji wszystkie strony pokazywały błąd "Brak autoryzacji":
- Dashboard, Dashboard Operatora, Moja Praca, Panel Kierownika - wszystkie 401
- Użytkownik był zalogowany (widział strony), ale API odrzucało requesty

**Root cause:**
1. **api-client.ts** miał przestarzały komentarz "No authentication required - single-user system" i NIE wysyłał nagłówka `Authorization: Bearer <token>` w requestach HTTP
2. **Niezgodność kluczy tokena** - dwa różne klucze w localStorage:
   - `AuthContext.tsx` zapisywał token pod kluczem `'auth_token'`
   - `auth-token.ts` szukał tokena pod kluczem `'akrobud_auth_token'`
   - `api-client.ts` używał `'auth_token'`
3. **stockHandler.ts** miał lokalną definicję `AuthenticatedRequest` z `user.id` zamiast `user.userId` (niezgodność z middleware auth)

**Impact:**
- **Krytyczny:** Wszystkie strony wymagające autoryzacji nie działały
- Użytkownik widział tylko błędy "Brak autoryzacji" mimo że był zalogowany
- Aplikacja była praktycznie niefunkcjonalna

**Fix:**
1. **api-client.ts** - Dodano token autoryzacji do wszystkich funkcji:
```typescript
const TOKEN_KEY = 'auth_token';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// W fetchApi, uploadFile, fetchBlob, checkExists:
const token = getAuthToken();
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
```

2. **auth-token.ts** - Zmieniono klucz na spójny:
```typescript
// Przed: const TOKEN_STORAGE_KEY = 'akrobud_auth_token';
const TOKEN_STORAGE_KEY = 'auth_token'; // Teraz zgodny z AuthContext
```

3. **stockHandler.ts** - Użyto globalnego typu z middleware:
```typescript
// Usunięto lokalną definicję, zaimportowano z middleware/auth.js
import type { AuthenticatedRequest } from '../../middleware/auth.js';
// + konwersja userId: string | number → number
```

**Prevention:**
1. ✅ **Jeden klucz tokena** - zawsze używaj stałej z centralnego miejsca (np. constants.ts)
2. ✅ **Token w API client** - ZAWSZE dodawaj nagłówek Authorization jeśli system wymaga auth
3. ✅ **Nie duplikuj typów** - importuj `AuthenticatedRequest` z middleware, nie definiuj lokalnie
4. ✅ **Testuj po wylogowaniu/zalogowaniu** - sprawdź czy tokeny są poprawnie wysyłane
5. ✅ **Grep po hardcodowanych kluczach** - `git grep "auth_token\|akrobud_auth"` znajdzie niespójności

**Lekcja:**
- Gdy widzisz 401 na wielu stronach mimo zalogowania → sprawdź czy API client wysyła token
- Nigdy nie duplikuj kluczy localStorage - użyj centralnej stałej
- Typy auth (AuthenticatedRequest) muszą być spójne w całym projekcie

---

## 2026-01-15 - Zbędne Type Assertions po Zod Parse + Brakujące ErrorBoundary

**Co się stało:**
Podczas audytu tech debt odkryto 12 miejsc gdzie kod używał `as Type` po `.parse()` Zod:
```typescript
// ❌ Zbędne - Zod już zwraca poprawny typ
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
// ✅ Zod infer działa automatycznie
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
1. ✅ **NIGDY `as Type` po Zod parse** - Zod już daje poprawny typ przez `z.infer`
2. ✅ **Komponenty utility (ErrorBoundary, Loading)** - od razu używaj po stworzeniu
3. ✅ **Grep po `as ` w handlerach** - sprawdź czy assertions są potrzebne
4. ✅ **Zod inference** - korzystaj z `z.infer<typeof schema>` zamiast ręcznych typów

**Lekcja:**
- Zod + TypeScript = type inference działa automatycznie. `as Type` po `.parse()` to code smell
- Komponenty "na później" często zostają "nigdy" - używaj od razu lub usuń

---

## 2026-01-05 - Dashboard nie ładował się po restarcie (WebSocket interference + cache)

**Co się stało:**
Dashboard pokazywał błąd "Failed to parse JSON" mimo że backend zwracał prawidłowe dane (2234 bajty JSON). Problem występował nawet po `localStorage.clear()` i restarcie. DevTools pokazywało 200 OK ale **pustą odpowiedź**. Backend logował "premature close".

**Root cause:**
1. **WebSocket agresywnie próbował reconnect** z wygasłym JWT tokenem
   - `getAuthToken()` nie miał timeout - mógł blokować na zawsze
   - 10 prób reconnect co 3s = 10 HTTP requests w tle
   - To powodowało **interference z Dashboard HTTP request** → "premature close"

2. **React Query persistence cachował złe odpowiedzi**
   - `maxAge: 24h` - cachował przez cały dzień
   - Walidacja `status === 'success'` ale **nie sprawdzała czy data !== null**
   - Puste odpowiedzi były cachowane i używane zamiast fetchować świeże dane

**Impact:**
- **Krytyczny UX:** Dashboard nie działał po restarcie
- Użytkownik musiał wiedzieć żeby czyścić localStorage co dzień
- Trudny do zdiagnozowania - curl działał, frontend nie
- Token wygasał co 24h → problem powtarzał się codziennie

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

   // Exponential backoff: 3s → 4.5s → 6.75s → max 30s
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
- ✅ **WebSocket ZAWSZE z graceful degradation** - aplikacja musi działać bez WS
- ✅ **Timeout na WSZYSTKIE async operacje** w critical path (max 3s)
- ✅ **React Query cache:** waliduj `data !== null` przed persistowaniem
- ✅ **Krótszy maxAge:** minuty nie godziny (10 min zamiast 24h)
- ✅ **Auth errors (1008) = stop retry** nie reconnect
- ✅ **Exponential backoff** dla reconnect (nie stały interval)
- ✅ **Debugging:** "premature close" w backend = frontend zamyka za wcześnie
- ✅ **Test z curl:** jeśli backend działa a frontend nie = problem w frontend

**Szczegóły:** [docs/reviews/DASHBOARD_FIX_2026-01-05.md](docs/reviews/DASHBOARD_FIX_2026-01-05.md)

---

## 2025-12-30 - Dashboard wyświetlał kwoty x100 za duże

**Co się stało:**
Dashboard pokazywał wartość zleceń jako 100,000 zł zamiast 1,000 zł. Wszystkie raporty finansowe były błędne.

**Root cause:**
30 grudnia 2025 została przeprowadzona migracja bazy danych:
- Przed: `valuePln Float` (złotówki jako liczba zmiennoprzecinkowa)
- Po: `valuePln Int` (grosze jako liczba całkowita)

Kod w `dashboard-service.ts` NIE ZOSTAŁ ZAKTUALIZOWANY:
```typescript
// ❌ Stary kod - nadal używa parseFloat
totalValuePln += parseFloat(order.valuePln?.toString() || '0');
// 10000 groszy → traktuje jako 10000 PLN!
```

Stworzono [money.ts](apps/api/src/utils/money.ts) z funkcjami `groszeToPln()` / `plnToGrosze()` ALE:
- Używano tylko w 3 miejscach z 200+ w projekcie
- Dashboard, monthly export, order summary - wszystkie pomijały tę funkcję

**Impact:**
- **Krytyczny:** Decyzje biznesowe oparte na fałszywych danych
- Raporty miesięczne eksportowane z błędnymi kwotami
- Rozbieżność z systemem księgowym
- Wykryto dopiero podczas audytu (2026-01-02) - mogło trwać miesiącami!

**Fix:**
```typescript
// ✅ Poprawiony kod
import { groszeToPln } from '../utils/money.js';

totalValuePln += order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
```

Naprawiono w 23 miejscach:
- `dashboard-service.ts` - 2 miejsca
- `monthlyReportExportService.ts` - 14 miejsc
- `monthlyReportService.ts` - 7 miejsc

**Prevention:**
1. ✅ ESLint rule: zabroń `parseFloat` / `toFixed` na polach `value*Pln` / `value*Eur`
2. ✅ Testy integracyjne dla dashboard - porównaj z oczekiwaną sumą
3. ✅ Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Operacje na pieniądzach"
4. ✅ Wymóg code review dla zmian w money calculations

**Lekcja:** Gdy robisz breaking change w formacie danych (Float→Int), **ZNAJDŹ WSZYSTKIE** miejsca używające tych danych. `git grep` jest Twoim przyjacielem!

---

## 2025-12-XX - Import "successful" ale 150 wierszy znikło

**Co się stało:**
Użytkownik zaimportował CSV z 500 zleceniami. System pokazał "Import successful!". Po tygodniu odkryto że w bazie jest tylko 350 zleceń - **150 zniknęło bez śladu**.

**Root cause:**
`csv-parser.ts` miał logikę:
```typescript
// ❌ Problematyczny kod
for (const row of rows) {
  const color = await findColorByCode(row.colorCode);
  if (!color) {
    console.warn(`Kolor ${row.colorCode} nie znaleziony`); // ← tylko log!
    continue; // ← pomija wiersz BEZ informacji użytkownika
  }
  // ... dalsze przetwarzanie
}

return { success: true }; // ← ZAWSZE "success"!
```

**Impact:**
- Średni: 150 zleceń musiało być ręcznie dodanych
- Opóźnienia w produkcji (zlecenia nie były widoczne)
- Utrata zaufania użytkowników do importu
- Ręczne porównywanie CSV z bazą (4 godziny pracy!)

**Fix:**
```typescript
// ✅ Naprawiony kod
const errors: ImportError[] = [];
let successCount = 0;

for (const [index, row] of rows.entries()) {
  const color = await findColorByCode(row.colorCode);
  if (!color) {
    errors.push({
      row: index + 1,
      field: 'color',
      value: row.colorCode,
      reason: `Kolor "${row.colorCode}" nie istnieje w bazie`
    });
    continue;
  }
  // ... przetwarzanie
  successCount++;
}

return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};
```

Frontend pokazuje:
```typescript
if (result.failed > 0) {
  toast({
    variant: 'warning',
    title: `Zaimportowano ${result.success}/${result.total} wierszy`,
    description: `${result.failed} wierszy pominięto. Kliknij aby pobrać raport błędów.`
  });
}
```

**Prevention:**
1. ✅ KAŻDY import zwraca `{ success, failed, errors[] }`
2. ✅ Frontend pokazuje dialog z podsumowaniem
3. ✅ Możliwość pobrania CSV z błędnymi wierszami
4. ✅ Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Importy i parsowanie"

**Lekcja:** **NIGDY nie zakładaj że operacja się udała**. Zawsze raportuj użytkownikowi co się faktycznie wydarzyło (success count, failed count, errors).

---

## 2025-12-XX - Przypadkowe usunięcie dostawy z 50 zleceniami

**Co się stało:**
Użytkownik przypadkowo kliknął "Usuń" przy dostawie zawierającej 50 zleceń. Jeden klik - dostawa znikła NA ZAWSZE. Zlecenia pozostały ale nieprzypisane. Brak możliwości odzyskania.

**Root cause:**
```typescript
// ❌ Niebezpieczny kod
<Button onClick={() => deleteDelivery(id)}>
  <TrashIcon /> Usuń
</Button>

// Backend
async delete(id: number) {
  await prisma.delivery.delete({ where: { id } }); // ← HARD DELETE!
}
```

Brak:
- Confirmation dialog
- Soft delete (deletedAt)
- Audit log
- Możliwości undo

**Impact:**
- Poważny: 4 godziny ręcznego przypisywania zleceń z powrotem
- Część zleceń była przypisana do złej dostawy
- Użytkownik stracił zaufanie do systemu
- Ryzyko ponownego wystąpienia (każde kliknięcie = katastrofa)

**Fix:**

1. **Soft delete** (schema):
```prisma
model Delivery {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")
  @@index([deletedAt])
}
```

2. **Confirmation dialog** (frontend):
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">
      <TrashIcon /> Usuń
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno usunąć?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Dostawa #{delivery.id}
        zostanie trwale usunięta. {delivery.ordersCount} zleceń
        stanie się nieprzypisanych.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Usuń trwale
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

3. **Soft delete** (backend):
```typescript
async delete(id: number) {
  await prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

// W queries
findMany({ where: { deletedAt: null } })
```

**Prevention:**
1. ✅ Soft delete dla WSZYSTKICH modeli (43/44 modeli!)
2. ✅ Confirmation dla destructive actions
3. ✅ Wyjaśnienie konsekwencji w dialogu
4. ✅ "Kosz" z możliwością restore (opcjonalnie)
5. ✅ Audit log (kto, kiedy, co usunął)

**Lekcja:** **Jeden klik użytkownika NIGDY nie powinien być nieodwracalny**. Zawsze: confirmation + soft delete + możliwość undo (przez admin).

---

## 2025-12-XX - Double-submit utworzył 3 duplikaty dostawy

**Co się stało:**
Użytkownik kliknął "Utwórz dostawę" 3 razy (bo przycisk nie reagował natychmiast). W bazie utworzyły się 3 identyczne dostawy.

**Root cause:**
```typescript
// ❌ Problematyczny kod
const { mutate: createDelivery } = useMutation(...);

<Button onClick={() => createDelivery(data)}>
  Utwórz dostawę
</Button>
```

Brak:
- `disabled` podczas mutacji
- Wizualnego feedbacku (loading)
- Debounce/throttle

**Impact:**
- Niski-Średni: Duplikaty w bazie (łatwe do usunięcia)
- Confusion użytkownika ("dlaczego 3 dostawy?")
- Race condition w backend (możliwe większe problemy)

**Fix:**
```typescript
// ✅ Poprawiony kod
const { mutate: createDelivery, isPending } = useMutation(...);

<Button
  onClick={() => createDelivery(data)}
  disabled={isPending} // ← KLUCZOWE!
>
  {isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Tworzenie...
    </>
  ) : (
    'Utwórz dostawę'
  )}
</Button>
```

**Prevention:**
1. ✅ WSZYSTKIE mutacje: `disabled={isPending}`
2. ✅ Visual feedback podczas operacji
3. ✅ Opcjonalnie: debounce dla submit buttons
4. ✅ Backend: idempotency tokens (advanced)

**Lekcja:** Użytkownik ZAWSZE kliknie więcej razy niż myślisz. Buttony muszą być disabled podczas operacji.

---

## 2025-12-XX - Tabele na telefonie całkowicie nieużywalne

**Co się stało:**
Użytkownik próbował sprawdzić zestawienie zleceń na telefonie (iPhone). Tabela 14 kolumn na ekranie 375px = scroll w 2 kierunkach, całkowicie nieużywalna.

**Root cause:**
```typescript
// ❌ Tylko desktop view
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
// ✅ Responsive view
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
1. ✅ KAŻDA tabela: sprawdź mobile view
2. ✅ Card view dla < 768px
3. ✅ Najważniejsze dane visible, reszta w "Szczegóły"
4. ✅ Virtualizacja dla > 50 wierszy

**Lekcja:** **Desktop-first = 50% użytkowników frustracji**. Testuj na telefonie (375px, 414px).

---

## 2025-12-XX - Frontend nie używał lazy loading (wolny initial load)

**Co się stało:**
Pierwszy load aplikacji trwał 8-10 sekund. Bundle size 3.2MB. Użytkownicy myśleli że aplikacja się zawiesza.

**Root cause:**
```typescript
// ❌ Wszystko synchroniczne
import { DeliveryCalendar } from './DeliveryCalendar';
import { DataTable } from '@/components/ui/data-table';
import { Charts } from './Charts';

// Wszystkie komponenty w jednym bundle → 3.2MB!
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
// ✅ Lazy loading
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
- Initial bundle: 3.2MB → 800KB (75% redukcja!)
- Initial load: 8-10s → 2-3s
- Interactive faster (First Contentful Paint)

**Prevention:**
1. ✅ Lazy load: Calendars, Charts, DataTables, Editors, Heavy Dialogs
2. ✅ Bundle analysis: `pnpm build && npx @next/bundle-analyzer`
3. ✅ Lighthouse CI: monitor bundle size
4. ✅ Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Dynamic Imports"

**Lekcja:** Ciężkie komponenty (>50KB) = **ZAWSZE lazy load**. Użytkownik nie potrzebuje calendar zanim go nie otworzy.

---

## 2026-01-02 - Brak testów = regresja w deliveryService

**Co się stało:**
Zmiana w `deliveryService.ts` (dodanie nowego pola) złamała `importService.ts` który używał delivery API. Wykryto dopiero na produkcji - crash podczas importu.

**Root cause:**
```
Backend tests: 32 pliki (przy 200+ plikach kodu)
Frontend tests: 0 plików (!!)

Critical paths BEZ testów:
- importService.ts (1139 linii) - 0 testów
- deliveryService.ts - 0 testów
- orderService.ts - 0 testów
```

**Impact:**
- Średni-Poważny: Produkcja down przez 2 godziny
- Hotfix w środku dnia
- Utrata zaufania
- Ryzyko regresjii w każdym deploy

**Fix:**
```typescript
// ✅ Testy przynajmniej dla critical paths
describe('DeliveryService', () => {
  describe('create', () => {
    it('should create delivery with valid data', async () => {
      const delivery = await service.create(validDeliveryData);
      expect(delivery).toBeDefined();
      expect(delivery.status).toBe('planned');
    });

    it('should throw ValidationError for missing required fields', async () => {
      await expect(service.create({ /* brak deliveryDate */ }))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('addOrderToDelivery', () => {
    it('should add order successfully', async () => {
      const result = await service.addOrderToDelivery(deliveryId, orderId);
      expect(result.ordersCount).toBe(1);
    });

    it('should throw if order already in another delivery', async () => {
      // ... setup
      await expect(service.addOrderToDelivery(deliveryId2, orderId))
        .rejects.toThrow('Order already assigned');
    });
  });
});
```

**Prevention:**
1. ✅ MINIMUM: Happy path tests dla każdego service
2. ✅ Critical paths: Happy + sad path tests
3. ✅ CI/CD: Tests must pass before deploy
4. ✅ Coverage goal: 60% backend, 40% frontend (realistyczne)

**Lekcja:** "It works on my machine" ≠ "It works". **Tests są dokumentacją jak kod powinien działać** + safety net przed regresjami.

---

## [Template] - Tytuł nowego błędu

**Co się stało:**
[Szczegółowy opis co poszło nie tak]

**Root cause:**
[Dlaczego to się stało - konkretny kod, decyzja, brak czegoś]

**Impact:**
[Jakie były konsekwencje - biznesowe, techniczne, użytkowników]

**Fix:**
[Jak naprawiono - konkretny kod, proces, zmiana]

**Prevention:**
[Jak zapobiec w przyszłości - checklist, tools, proces]

**Lekcja:**
[Główny wniosek - jedna lub dwie zasady do zapamiętania]

---

## 🔄 Jak dodawać nowe wpisy

### Gdy znajdziesz nowy błąd:

1. **Skopiuj template** (powyżej)
2. **Wypełnij wszystkie sekcje** - bądź szczegółowy!
3. **Dodaj datę** w formacie YYYY-MM-DD
4. **Umieść na początku** (najnowsze wpisy na górze)
5. **Aktualizuj [COMMON_MISTAKES.md](COMMON_MISTAKES.md)** jeśli potrzeba nowej sekcji DO/DON'T

### Format commit message:
```
docs: Add lesson learned - [krótki tytuł]

Date: YYYY-MM-DD
Severity: [Low/Medium/High/Critical]
Category: [Backend/Frontend/Database/UX/Performance]
```

---

## 📊 Statystyki błędów

**Całkowite wpisy:** 9
**Ostatnia aktualizacja:** 2026-01-15

**Kategorie:**
- 💰 Money/Financial: 1
- 📥 Imports/Parsing: 1
- 🗑️ Data deletion: 1
- 🔘 UX/Buttons: 1
- 📱 Mobile/Responsive: 1
- 🚀 Performance: 1
- 🧪 Testing: 1
- 🔐 Auth/Security: 1
- 📝 Type Safety: 1

**Severity:**
- Critical: 2 (Dashboard kwoty, Auth token)
- High: 2 (Import, Deletion)
- Medium: 5 (reszta)

---

**Pamiętaj:** Każdy błąd to lekcja. Nie powtarzaj historii!

**Następny krok:** Sprawdź [COMMON_MISTAKES.md](COMMON_MISTAKES.md) - konkretne DO/DON'T rules.
