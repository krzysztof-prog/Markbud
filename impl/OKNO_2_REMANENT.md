# OKNO 2: Remanent - Stan początkowy

## ZALEŻNOŚĆ: Wymaga ukończenia OKNA 1!

Przed rozpoczęciem upewnij się, że Okno 1 (migracja bazy) jest zakończone.
Pole `initialStockBeams` musi już istnieć w tabeli `warehouse_stock`.

---

## Cel

Dodać kolumnę "Stan początkowy" do tabeli remanentu, która pokazuje stan magazynowy na początek miesiąca (przed wykonaniem remanentu).

---

## Pliki do modyfikacji

| Plik | Typ zmiany |
|------|------------|
| `apps/api/src/routes/warehouse.ts` | Backend - dodaj pole do query i response |
| `apps/web/src/types/warehouse.ts` | Frontend - dodaj typy |
| `apps/web/src/features/warehouse/remanent/components/RemanentTable.tsx` | Frontend - wyświetl kolumnę |

---

## Krok 1: Backend - GET warehouse data

### Plik: `apps/api/src/routes/warehouse.ts`

#### 1.1 Znajdź GET `/api/warehouse/:colorId` i dodaj `initialStockBeams` do select

**Znajdź** (około linia 10-26):
```typescript
const stocks = await prisma.warehouseStock.findMany({
  where: { colorId: parseInt(colorId) },
  select: {
    id: true,
    profileId: true,
    colorId: true,
    currentStockBeams: true,
    updatedAt: true,
    // ...
  },
```

**Zamień na:**
```typescript
const stocks = await prisma.warehouseStock.findMany({
  where: { colorId: parseInt(colorId) },
  select: {
    id: true,
    profileId: true,
    colorId: true,
    currentStockBeams: true,
    initialStockBeams: true,  // DODANE
    updatedAt: true,
    // ...
  },
```

#### 1.2 Znajdź przekształcenie danych i dodaj `initialStock`

**Znajdź** (w funkcji transformacji/mapowania około linia 115-130):
```typescript
return {
  profileId: stock.profileId,
  profileNumber: stock.profile.number,
  currentStock: stock.currentStockBeams,
  demand: demand.beams,
  // ...
```

**Dodaj `initialStock`:**
```typescript
return {
  profileId: stock.profileId,
  profileNumber: stock.profile.number,
  currentStock: stock.currentStockBeams,
  initialStock: stock.initialStockBeams,  // DODANE
  demand: demand.beams,
  // ...
```

---

## Krok 2: Backend - POST monthly-update (zapisywanie remanentu)

### Plik: `apps/api/src/routes/warehouse.ts`

#### 2.1 Znajdź POST `/api/warehouse/monthly-update` i zaktualizuj logikę

**Znajdź** (około linia 200-233):
```typescript
const calculatedStock = currentStock?.currentStockBeams || 0;
const difference = update.actualStock - calculatedStock;
```

**Upewnij się że `calculatedStock` jest poprawnie obliczany.**

#### 2.2 Znajdź update i dodaj zapisywanie `initialStockBeams`

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
await tx.warehouseStock.update({
  where: {
    profileId_colorId: {
      profileId: update.profileId,
      colorId,
    },
  },
  data: {
    currentStockBeams: update.actualStock,
    initialStockBeams: calculatedStock,  // DODANE - zapisz stan przed remanentem
  },
});
```

**Logika biznesowa:**
- `initialStockBeams` = stan obliczony PRZED wykonaniem remanentu
- `currentStockBeams` = stan rzeczywisty Z remanentu
- W następnym miesiącu `initialStock` będzie pokazywał stan z końca poprzedniego miesiąca

---

## Krok 3: Frontend - Typy TypeScript

### Plik: `apps/web/src/types/warehouse.ts`

#### 3.1 Dodaj `initialStock` do `WarehouseTableRow`

**Znajdź** (około linia 108-125):
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

**Dodaj `initialStock` po `currentStock`:**
```typescript
export interface WarehouseTableRow {
  profileId: ID;
  profileNumber: string;
  profileName?: string;
  currentStock: number;
  initialStock?: number;  // DODANE - Stan na początek miesiąca
  stock?: number;
  demand: number;
  // ...
```

#### 3.2 Dodaj `initialStock` do `RemanentFormEntry`

**Znajdź** (około linia 144-151):
```typescript
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  calculatedStock: number;
  actualStock: number | '';
  difference: number;
}
```

**Dodaj `initialStock`:**
```typescript
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  initialStock: number;  // DODANE
  calculatedStock: number;
  actualStock: number | '';
  difference: number;
}
```

---

## Krok 4: Frontend - Komponent RemanentTable

### Plik: `apps/web/src/features/warehouse/remanent/components/RemanentTable.tsx`

#### 4.1 Zaktualizuj useEffect - inicjalizacja entries

**Znajdź** (około linia 17-28):
```typescript
const initialEntries: RemanentFormEntry[] = warehouseData.map((row) => ({
  profileId: row.profileId,
  profileNumber: row.profileNumber,
  calculatedStock: row.currentStock,
  actualStock: '',
  difference: 0,
}));
```

**Dodaj `initialStock`:**
```typescript
const initialEntries: RemanentFormEntry[] = warehouseData.map((row) => ({
  profileId: row.profileId,
  profileNumber: row.profileNumber,
  initialStock: row.initialStock || 0,  // DODANE
  calculatedStock: row.currentStock,
  actualStock: '',
  difference: 0,
}));
```

#### 4.2 Zaktualizuj nagłówek tabeli

**Znajdź** (około linia 57-64):
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

**Dodaj kolumnę "Stan początkowy":**
```typescript
<thead className="bg-slate-50 border-b sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left font-semibold">Profil</th>
    <th className="px-4 py-3 text-center font-semibold">Stan początkowy</th>  {/* DODANE */}
    <th className="px-4 py-3 text-center font-semibold">Stan obliczony</th>
    <th className="px-4 py-3 text-center font-semibold">Stan rzeczywisty</th>
    <th className="px-4 py-3 text-center font-semibold">Różnica</th>
  </tr>
</thead>
```

#### 4.3 Zaktualizuj wiersz tabeli

**Znajdź** (około linia 75-95):
```typescript
<td className="px-4 py-3 font-mono font-semibold">{entry.profileNumber}</td>
<td className="px-4 py-3 text-center">{entry.calculatedStock} bel</td>
<td className="px-4 py-3 text-center">
```

**Dodaj kolumnę między profileNumber a calculatedStock:**
```typescript
<td className="px-4 py-3 font-mono font-semibold">{entry.profileNumber}</td>
<td className="px-4 py-3 text-center text-slate-600">{entry.initialStock} bel</td>  {/* DODANE */}
<td className="px-4 py-3 text-center">{entry.calculatedStock} bel</td>
<td className="px-4 py-3 text-center">
```

---

## Testowanie

### 1. Uruchom serwery

```bash
# Terminal 1 - Backend
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web
```

### 2. Sprawdź funkcjonalność

1. Przejdź do: `http://localhost:3000/magazyn/akrobud/remanent`
2. Wybierz kolor (np. "Biały")
3. Sprawdź czy tabela ma 5 kolumn:
   - [ ] Profil
   - [ ] Stan początkowy (nowa!)
   - [ ] Stan obliczony
   - [ ] Stan rzeczywisty
   - [ ] Różnica

4. Stan początkowy powinien pokazywać `0` (jeśli nie wykonywano jeszcze remanentu)

5. Wprowadź wartości w "Stan rzeczywisty" i zapisz remanent

6. Odśwież stronę - "Stan początkowy" powinien teraz pokazywać poprzedni stan obliczony

### 3. Weryfikacja w bazie

```bash
cd apps/api
npx prisma studio
```

Sprawdź tabelę `warehouse_stock` - kolumna `initial_stock_beams` powinna mieć wartości.

---

## Checklist

- [ ] Backend: `initialStockBeams` dodane do select w GET
- [ ] Backend: `initialStock` dodane do response transformation
- [ ] Backend: `initialStockBeams` zapisywane w POST monthly-update
- [ ] Frontend: `initialStock` dodane do `WarehouseTableRow`
- [ ] Frontend: `initialStock` dodane do `RemanentFormEntry`
- [ ] Frontend: `initialStock` w useEffect (inicjalizacja entries)
- [ ] Frontend: Nagłówek tabeli - kolumna "Stan początkowy"
- [ ] Frontend: Wiersz tabeli - wyświetlanie `entry.initialStock`
- [ ] Testowanie: Strona ładuje się bez błędów
- [ ] Testowanie: 5 kolumn widocznych
- [ ] Testowanie: Zapis remanentu działa
- [ ] Testowanie: Po zapisie stan początkowy się aktualizuje

---

## Po zakończeniu

Potwierdź w głównym czacie:
```
Okno 2 zakończone. Remanent - stan początkowy zaimplementowany.
```

---

## NIE MODYFIKUJ

- `apps/api/prisma/schema.prisma` (zrobione w Oknie 1)
- Żadnych plików związanych z Glass Tracking (Okno 3 i 4)
