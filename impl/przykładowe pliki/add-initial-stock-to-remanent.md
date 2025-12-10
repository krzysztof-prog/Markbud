# Plan implementacji: Dodanie kolumny "Stan początkowy" do remanentu

## Cel
Dodać kolumnę "Stan początkowy" w tabeli remanentu, która będzie pokazywać stan magazynowy na początek miesiąca (przed wykonaniem remanentu). Po wykonaniu remanentu, wartość "Stan rzeczywisty" staje się nowym stanem początkowym na następny miesiąc.

## Architektura projektu
- **Backend:** Fastify + Prisma + SQLite (lokalizacja: `apps/api/`)
- **Frontend:** Next.js 15 + React + TypeScript (lokalizacja: `apps/web/`)
- **Baza danych:** SQLite (`apps/api/prisma/schema.prisma`)

## Szczegółowy plan implementacji

### Krok 1: Aktualizacja schematu bazy danych

**Plik:** `apps/api/prisma/schema.prisma`

**Lokalizacja:** Model `WarehouseStock` (około linia 180)

**Zmiany:**
```prisma
model WarehouseStock {
  id                Int      @id @default(autoincrement())
  profileId         Int      @map("profile_id")
  colorId           Int      @map("color_id")
  currentStockBeams Int      @default(0) @map("current_stock_beams") // Stan bieżący (po realizacji zleceń)
  initialStockBeams Int      @default(0) @map("initial_stock_beams") // Stan na początek miesiąca (DODANE)
  updatedAt         DateTime @updatedAt @map("updated_at")
  updatedById       Int?     @map("updated_by_id")

  // ... reszta bez zmian
}
```

**Uwagi:**
- Dodaj komentarz do `currentStockBeams` dla jasności
- Dodaj pole `initialStockBeams` z wartością domyślną `0`
- Zachowaj konwencję `@map("initial_stock_beams")` dla nazwy kolumny w bazie

### Krok 2: Synchronizacja schematu z bazą danych

**⚠️ WAŻNE - Unikaj błędów migracji:**

**NIE używaj** `npx prisma migrate dev` jeśli masz problemy z shadow database!

**ZAMIAST tego użyj:**
```bash
cd apps/api
npx prisma db push
```

**Dlaczego:**
- `db push` synchronizuje schema bez tworzenia plików migracji
- Działa nawet gdy shadow database ma problemy
- Odpowiednie dla środowiska dev z SQLite

**Błąd który możesz napotkać:**
```
Error: P3006
Migration failed to apply cleanly to the shadow database.
no such table: main.schuco_deliveries
```

**Rozwiązanie:** Użyj `prisma db push` zamiast `prisma migrate dev`

**Ignoruj błąd:**
```
EPERM: operation not permitted, rename
'...query_engine-windows.dll.node.tmp...'
```
Ten błąd pojawia się gdy serwery są uruchomione. Schema jest już zsynchronizowana - możesz go zignorować.

### Krok 3: Aktualizacja API endpointu - GET warehouse data

**Plik:** `apps/api/src/routes/warehouse.ts`

**Lokalizacja 1:** GET `/api/warehouse/:colorId` - select (około linia 10-26)

**Zmiany:**
```typescript
const stocks = await prisma.warehouseStock.findMany({
  where: { colorId: parseInt(colorId) },
  select: {
    id: true,
    profileId: true,
    colorId: true,
    currentStockBeams: true,
    initialStockBeams: true,  // DODAJ TĘ LINIĘ
    updatedAt: true,
    profile: {
      select: { id: true, number: true },
    },
    color: {
      select: { id: true, code: true },
    },
  },
  orderBy: { profile: { number: 'asc' } },
});
```

**Lokalizacja 2:** Przekształcenie danych (około linia 115-130)

**Znajdź:**
```typescript
return {
  profileId: stock.profileId,
  profileNumber: stock.profile.number,
  currentStock: stock.currentStockBeams,
  // ...
```

**Dodaj po `currentStock`:**
```typescript
return {
  profileId: stock.profileId,
  profileNumber: stock.profile.number,
  currentStock: stock.currentStockBeams,
  initialStock: stock.initialStockBeams,  // DODAJ TĘ LINIĘ
  demand: demand.beams,
  // ...reszta bez zmian
```

### Krok 4: Aktualizacja logiki zapisywania remanentu

**Plik:** `apps/api/src/routes/warehouse.ts`

**Lokalizacja:** POST `/api/warehouse/monthly-update` (około linia 200-233)

**Znajdź:**
```typescript
const calculatedStock = currentStock?.currentStockBeams || 0;
const difference = update.actualStock - calculatedStock;
```

**Zamień na:**
```typescript
const calculatedStock = currentStock?.currentStockBeams || 0;
const initialStock = currentStock?.initialStockBeams || 0;  // DODAJ
const difference = update.actualStock - calculatedStock;
```

**Znajdź:**
```typescript
await tx.warehouseStock.update({
  where: {
    profileId_colorId: {
      profileId: update.profileId,
      colorId,
    },
  },
  data: {
    currentStockBeams: update.actualStock,
  },
});
```

**Zamień na:**
```typescript
// Zaktualizuj stan magazynowy
// initialStockBeams staje się currentStockBeams przed remanent
// currentStockBeams staje się actualStock z remanentu
await tx.warehouseStock.update({
  where: {
    profileId_colorId: {
      profileId: update.profileId,
      colorId,
    },
  },
  data: {
    currentStockBeams: update.actualStock,
    initialStockBeams: calculatedStock, // DODAJ - Zapisz stan przed remanent
  },
});
```

**Logika biznesowa:**
- `initialStockBeams` = stan obliczony PRZED wykonaniem remanentu
- `currentStockBeams` = stan rzeczywisty Z remanentu
- W następnym miesiącu `initialStock` będzie pokazywał stan z końca poprzedniego miesiąca

### Krok 5: Aktualizacja typów TypeScript - Backend types

**⚠️ Uwaga:** Po `prisma db push` typy Prisma są automatycznie regenerowane.

**Weryfikacja:**
Sprawdź czy zmiana została odebrana przez TypeScript:
```typescript
// TypeScript powinien teraz wiedzieć o initialStockBeams
const stock = await prisma.warehouseStock.findFirst();
console.log(stock?.initialStockBeams); // ✅ Powinno się kompilować
```

### Krok 6: Aktualizacja typów TypeScript - Frontend types

**Plik:** `apps/web/src/types/warehouse.ts`

**Lokalizacja 1:** Interface `WarehouseTableRow` (około linia 108-125)

**Znajdź:**
```typescript
export interface WarehouseTableRow {
  profileId: ID;
  profileNumber: string;
  profileName?: string;
  currentStock: number;
  stock?: number;
  demand: number;
  // ...
```

**Dodaj po `currentStock`:**
```typescript
export interface WarehouseTableRow {
  profileId: ID;
  profileNumber: string;
  profileName?: string;
  currentStock: number;
  initialStock?: number; // DODAJ - Stan na początek miesiąca (przed remanent)
  stock?: number;
  demand: number;
  // ...reszta bez zmian
```

**Lokalizacja 2:** Interface `RemanentFormEntry` (około linia 144-151)

**Znajdź:**
```typescript
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  calculatedStock: number; // Stan obliczony (currentStockBeams)
  actualStock: number | ''; // Stan rzeczywisty (INPUT value)
  difference: number; // actualStock - calculatedStock
}
```

**Zamień na:**
```typescript
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  initialStock: number; // DODAJ - Stan na początek miesiąca
  calculatedStock: number; // Stan obliczony (currentStockBeams)
  actualStock: number | ''; // Stan rzeczywisty (INPUT value)
  difference: number; // actualStock - calculatedStock
}
```

### Krok 7: Aktualizacja komponentu RemanentTable

**Plik:** `apps/web/src/features/warehouse/remanent/components/RemanentTable.tsx`

**Lokalizacja 1:** useEffect - inicjalizacja entries (około linia 17-28)

**Znajdź:**
```typescript
const initialEntries: RemanentFormEntry[] = warehouseData.map((row) => ({
  profileId: row.profileId,
  profileNumber: row.profileNumber,
  calculatedStock: row.currentStock,
  actualStock: '', // Empty initially
  difference: 0,
}));
```

**Zamień na:**
```typescript
const initialEntries: RemanentFormEntry[] = warehouseData.map((row) => ({
  profileId: row.profileId,
  profileNumber: row.profileNumber,
  initialStock: row.initialStock || 0, // DODAJ - Stan na początek miesiąca
  calculatedStock: row.currentStock,
  actualStock: '', // Empty initially
  difference: 0,
}));
```

**Lokalizacja 2:** Nagłówek tabeli (około linia 57-64)

**Znajdź:**
```typescript
<thead className="bg-slate-50 border-b sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left font-semibold">Profil</th>
    <th className="px-4 py-3 text-center font-semibold">Stan obliczony</th>
    <th className="px-4 py-3 text-center font-semibold">Stan rzeczywisty</th>
    <th className="px-4 py-3 text-center font-semibold">Różnica</th>
  </tr>
</thead>
```

**Zamień na:**
```typescript
<thead className="bg-slate-50 border-b sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left font-semibold">Profil</th>
    <th className="px-4 py-3 text-center font-semibold">Stan początkowy</th>  {/* DODAJ */}
    <th className="px-4 py-3 text-center font-semibold">Stan obliczony</th>
    <th className="px-4 py-3 text-center font-semibold">Stan rzeczywisty</th>
    <th className="px-4 py-3 text-center font-semibold">Różnica</th>
  </tr>
</thead>
```

**Lokalizacja 3:** Wiersz tabeli (około linia 75-95)

**Znajdź:**
```typescript
<td className="px-4 py-3 font-mono font-semibold">{entry.profileNumber}</td>
<td className="px-4 py-3 text-center">{entry.calculatedStock} bel</td>
<td className="px-4 py-3 text-center">
```

**Dodaj kolumnę między profileNumber a calculatedStock:**
```typescript
<td className="px-4 py-3 font-mono font-semibold">{entry.profileNumber}</td>
<td className="px-4 py-3 text-center text-slate-600">{entry.initialStock} bel</td>  {/* DODAJ */}
<td className="px-4 py-3 text-center">{entry.calculatedStock} bel</td>
<td className="px-4 py-3 text-center">
```

**Stylowanie:**
- Użyj `text-slate-600` dla kolumny Stan początkowy (mniej wyróżniona)
- Pozostałe kolumny pozostają bez zmian

### Krok 8: Testowanie

**Uruchom serwery:**
```bash
# Terminal 1 - Backend (port 4000)
cd Markbud
PORT=4000 pnpm --filter api dev

# Terminal 2 - Frontend (port 3000)
cd Markbud
pnpm --filter web dev
```

**Sprawdź:**

1. **Strona remanentu ładuje się poprawnie:**
   - Przejdź do: `http://localhost:3000/magazyn/akrobud/remanent`
   - Wybierz kolor (np. "Biały")
   - Sprawdź czy tabela się wyświetla

2. **Kolumny są widoczne:**
   - [ ] Profil
   - [ ] Stan początkowy (nowa kolumna)
   - [ ] Stan obliczony
   - [ ] Stan rzeczywisty (input)
   - [ ] Różnica

3. **Wartości są poprawne:**
   - Stan początkowy powinien być `0` (jeśli nie wykonywano jeszcze remanentu)
   - Stan obliczony pokazuje bieżący stan

4. **Wprowadź dane i zapisz remanent:**
   - Wprowadź wartości w kolumnie "Stan rzeczywisty"
   - Kliknij "Zapisz remanent"
   - Potwierdź w modalu

5. **Weryfikacja po zapisie:**
   - Odśwież stronę
   - Stan początkowy powinien teraz pokazywać poprzedni stan obliczony
   - Stan obliczony = wartość rzeczywista z poprzedniego remanentu

**Weryfikacja w bazie danych:**
```bash
cd apps/api
sqlite3 dev.db

# Sprawdź wartości
SELECT
  p.number as profil,
  ws.initial_stock_beams as stan_poczatkowy,
  ws.current_stock_beams as stan_biezacy
FROM warehouse_stock ws
JOIN profiles p ON ws.profile_id = p.id
WHERE ws.color_id = 1
LIMIT 10;
```

### Krok 9: Czyszczenie i finalizacja

**Opcjonalnie - wygeneruj Prisma Client:**
```bash
cd apps/api
npx prisma generate
```

**Sprawdź czy wszystko się kompiluje:**
```bash
# Frontend
cd apps/web
npx tsc --noEmit

# Backend (jeśli używasz TypeScript)
cd apps/api
npx tsc --noEmit
```

## Najczęstsze błędy i jak ich unikać

### ❌ Błąd 1: Używanie `prisma migrate dev` zamiast `prisma db push`
**Objaw:** Błąd P3006 o shadow database

**Rozwiązanie:** Użyj `prisma db push` w środowisku dev

### ❌ Błąd 2: Zapomnienie o dodaniu pola w select
**Objaw:** Frontend nie otrzymuje `initialStock`, wartość zawsze `undefined`

**Rozwiązanie:** Sprawdź czy `initialStockBeams: true` jest w select w `warehouse.ts`

### ❌ Błąd 3: Niepoprawna kolejność kolumn w tabeli
**Objaw:** Kolumny są w złej kolejności

**Rozwiązanie:** Kolejność powinna być:
1. Profil
2. Stan początkowy ← NOWA
3. Stan obliczony
4. Stan rzeczywisty
5. Różnica

### ❌ Błąd 4: Zapomnienie o inicjalizacji `initialStock` w useEffect
**Objaw:** TypeScript błędy lub `undefined` values

**Rozwiązanie:** Dodaj `initialStock: row.initialStock || 0` w mapowaniu

### ❌ Błąd 5: Niepoprawna logika zapisu w remanent
**Objaw:** `initialStock` nie aktualizuje się po zapisie remanentu

**Rozwiązanie:** Upewnij się, że zapisujesz:
```typescript
data: {
  currentStockBeams: update.actualStock,      // Nowy stan
  initialStockBeams: calculatedStock,         // Poprzedni stan obliczony
}
```

### ❌ Błąd 6: Modyfikacja niewłaściwego pliku warehouse.ts
**Objaw:** Zmiany nie mają efektu

**Rozwiązanie:** Upewnij się, że edytujesz:
- `apps/api/src/routes/warehouse.ts` (backend)
- NIE `apps/web/src/features/warehouse/api/warehouseApi.ts` (to tylko wrapper API)

## Checklist implementacji

Przed rozpoczęciem:
- [ ] Wykonaj backup bazy danych (`cp apps/api/dev.db apps/api/dev.db.backup`)
- [ ] Upewnij się, że serwery NIE są uruchomione przed `prisma db push`

Implementacja:
- [ ] Zaktualizuj schema.prisma (dodaj `initialStockBeams`)
- [ ] Wykonaj `npx prisma db push`
- [ ] Zaktualizuj GET `/api/warehouse/:colorId` - dodaj do select
- [ ] Zaktualizuj przekształcenie danych - dodaj `initialStock`
- [ ] Zaktualizuj logikę POST `/api/warehouse/monthly-update`
- [ ] Zaktualizuj typy `WarehouseTableRow` i `RemanentFormEntry`
- [ ] Zaktualizuj `RemanentTable.tsx` - useEffect
- [ ] Zaktualizuj `RemanentTable.tsx` - nagłówek
- [ ] Zaktualizuj `RemanentTable.tsx` - wiersz

Testowanie:
- [ ] Strona remanentu ładuje się bez błędów
- [ ] Wszystkie 5 kolumn są widoczne
- [ ] Stan początkowy pokazuje `0` przed pierwszym remanentem
- [ ] Można wprowadzić wartości i zapisać remanent
- [ ] Po zapisie stan początkowy = poprzedni stan obliczony
- [ ] Sprawdź w bazie danych czy wartości są zapisane

## Dodatkowe uwagi

**Konwencje nazewnictwa:**
- Backend (Prisma): `initialStockBeams` (camelCase)
- Baza danych: `initial_stock_beams` (snake_case)
- Frontend API response: `initialStock` (camelCase, skrócone)

**Wartości domyślne:**
- `initialStockBeams` w bazie: `0` (default)
- `initialStock` w UI: `row.initialStock || 0` (fallback)

**Kolejność wykonywania:**
1. Zawsze najpierw zmiany w bazie danych (schema)
2. Potem backend (API routes)
3. Na końcu frontend (types i komponenty)

## Szacowany czas: 30-45 minut

Powodzenia! 🚀
