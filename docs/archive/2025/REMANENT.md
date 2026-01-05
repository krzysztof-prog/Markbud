# Remanent magazynu - Dokumentacja

## Przegląd

System remanentu (inwentaryzacji) umożliwia miesięczne porównanie stanów obliczonych magazynu ze stanami rzeczywistymi. Główne funkcje:

- Wprowadzanie rzeczywistych stanów magazynowych dla wybranego koloru
- Automatyczne obliczanie różnic między stanem obliczonym a rzeczywistym
- Zapisywanie historii remantów z możliwością cofnięcia (24h)
- Finalizacja miesiąca z opcją archiwizacji zrealizowanych zleceń
- Podgląd średniego zużycia miesięcznego profili

## Struktura plików

### Backend

```
apps/api/src/routes/warehouse.ts
- GET /api/warehouse/:colorId - Pobiera dane magazynowe dla koloru
- POST /api/remanent - Zapisuje remanent
- POST /api/remanent/finalize - Finalizuje miesiąc
- POST /api/remanent/rollback - Cofa ostatni remanent
- GET /api/remanent/history/:colorId - Historia remantów dla koloru
- GET /api/remanent/history - Historia wszystkich remantów
- GET /api/remanent/average/:colorId - Średnie zużycie miesięczne
```

### Frontend

```
apps/web/src/
├── app/(dashboard)/magazyn/akrobud/remanent/
│   ├── page.tsx                    # Główna strona remanentu
│   └── historia/
│       └── page.tsx                # Historia remantów
│
├── features/warehouse/
│   ├── components/
│   │   └── ColorSidebar.tsx        # Sidebar wyboru koloru
│   ├── hooks/
│   │   └── useWarehouseData.ts     # Hook do pobierania danych magazynu
│   └── remanent/
│       ├── api/
│       │   └── remanentApi.ts      # API client dla remanentu
│       ├── components/
│       │   ├── RemanentTable.tsx           # Tabela wprowadzania stanów
│       │   ├── RemanentConfirmModal.tsx    # Modal potwierdzenia
│       │   └── FinalizeMonthModal.tsx      # Modal finalizacji miesiąca
│       └── hooks/
│           ├── useRemanent.ts              # Mutacje (submit, finalize, average)
│           └── useRemanentHistory.ts       # Historia i rollback
│
├── hooks/
│   ├── useColors.ts                # Hook grupowania kolorów
│   └── useDebounce.ts             # Debouncing dla inputów
│
└── types/warehouse.ts              # Typy TypeScript
```

## Główne komponenty

### 1. Strona remanentu (`page.tsx`)

**Ścieżka:** `/magazyn/akrobud/remanent`

**Funkcjonalność:**
- Wybór koloru z sidebar
- Wprowadzanie rzeczywistych stanów magazynowych
- Podgląd różnic (stan rzeczywisty - stan obliczony)
- Potwierdzenie i zapisanie remanentu
- Przejście do historii remantów
- Finalizacja miesiąca

**Optymalizacje:**
- `useCallback` dla handlerów zdarzeń
- Walidacja przed zapisem (minimum jeden wypełniony wpis)
- Automatyczne czyszczenie formularza po zapisie

### 2. Tabela remanentu (`RemanentTable.tsx`)

**Props:**
- `warehouseData: WarehouseTableRow[]` - dane magazynowe
- `entries: RemanentFormEntry[]` - wprowadzone stany
- `onChange: (entries: RemanentFormEntry[]) => void` - callback zmiany

**Kolumny:**
- Profil (kod + nazwa)
- Stan obliczony
- Stan rzeczywisty (input)
- Różnica (automatycznie obliczana)

**Funkcje:**
- Tylko numeryczne wartości w inputach
- Automatyczne obliczanie różnic
- Kolorowanie różnic (czerwony/zielony)
- Formatowanie liczb

### 3. Modal potwierdzenia (`RemanentConfirmModal.tsx`)

**Wyświetla:**
- Nazwę i kod koloru
- Liczbę wypełnionych wpisów
- Liczbę wpisów z różnicami
- Szczegóły dla każdego profilu z różnicą

**Funkcje:**
- Przycisk anulowania
- Przycisk zapisu z loading state
- Automatyczne filtrowanie wpisów z różnicami

### 4. Modal finalizacji (`FinalizeMonthModal.tsx`)

**Tryby:**

**Podgląd (preview):**
- Wybór miesiąca (format: YYYY-MM)
- Checkbox opcji archiwizacji
- Przycisk "Podgląd" - zwraca statystyki bez zapisu

**Podgląd wyników:**
- Liczba zarchiwizowanych zleceń (jeśli wybrano)
- Lista zarchiwizowanych zleceń z numerami
- Przycisk "Finalizuj" - ostateczne zapisanie

**Funkcje:**
- Walidacja formatu miesiąca
- Informacja o skutkach archiwizacji
- Dwuetapowe zatwierdzanie (bezpieczeństwo)

### 5. Historia remantów (`historia/page.tsx`)

**Ścieżka:** `/magazyn/akrobud/remanent/historia`

**Funkcjonalność:**
- Lista wszystkich remantów pogrupowanych po dacie + kolor
- Rozwijane grupy ze szczegółami profili
- Przycisk cofnięcia (rollback) - tylko dla najnowszego < 24h
- Kolorowe różnice dla każdego profilu
- Informacja o czasie wykonania

**Optymalizacje:**
- `useMemo` dla grupowania historii
- `useCallback` dla toggle i rollback
- Grupowanie po dacie (dokładność do minuty) + kolorze

## Typy danych

### WarehouseDataResponse

```typescript
export interface WarehouseDataResponse {
  color: {
    id: number;
    code: string;
    name: string;
    hexColor?: string;
    type: 'typical' | 'atypical';
  } | null;
  data: WarehouseTableRow[];
}
```

### WarehouseTableRow

```typescript
export interface WarehouseTableRow {
  profileId: number;
  profileCode: string;
  profileName: string;
  currentStock: number;
  demand: number;
  afterDemand: number;
  isNegative: boolean;
  orderedBeams: number | null;
  expectedDeliveryDate: string | null;
  orders: WarehouseOrder[];
  history: WarehouseHistory[];
}
```

### RemanentFormEntry

```typescript
export interface RemanentFormEntry {
  profileId: number;
  profileCode: string;
  profileName: string;
  calculatedStock: number;
  actualStock: string;
  difference: number;
}
```

### RemanentHistoryEntry

```typescript
export interface RemanentHistoryEntry {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
  recordedAt: string;
  color: {
    code: string;
    name: string;
  };
  profile: {
    code: string;
    name: string;
  };
}
```

### RemanentHistoryGroup

```typescript
export interface RemanentHistoryGroup {
  date: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  entries: RemanentHistoryEntry[];
  totalProfiles: number;
  differencesCount: number;
  canRollback: boolean;
}
```

## API Endpoints

### POST /api/remanent

Zapisuje nowy remanent.

**Request body:**
```typescript
{
  colorId: number;
  updates: Array<{
    profileId: number;
    actualStock: number;
  }>;
}
```

**Response:**
```typescript
{
  message: string;
  recordedCount: number;
}
```

**Logika:**
1. Walidacja colorId i updates
2. Pobranie aktualnych stanów magazynu dla każdego profilu
3. Zapisanie rekordów do tabeli `RemanentHistory`
4. Zwrócenie liczby zapisanych rekordów

### POST /api/remanent/finalize

Finalizuje miesiąc i opcjonalnie archiwizuje zlecenia.

**Request body:**
```typescript
{
  month: string;      // Format: YYYY-MM
  archive: boolean;   // true = archiwizuj, false = tylko podgląd
}
```

**Response:**
```typescript
{
  message: string;
  archivedCount?: number;
  archivedOrders?: Array<{
    id: number;
    orderNumber: string;
  }>;
}
```

**Logika:**
1. Parsowanie miesiąca (początek i koniec)
2. Pobranie zleceń z `completedAt` w danym miesiącu
3. Jeśli `archive === false`: zwróć tylko podgląd
4. Jeśli `archive === true`:
   - Ustaw `isArchived = true` dla zleceń
   - Usuń pozycje z magazynu dla tych zleceń
   - Zwróć liczbę i listę zarchiwizowanych zleceń

### POST /api/remanent/rollback

Cofa ostatni remanent dla koloru (tylko < 24h).

**Request body:**
```typescript
{
  colorId: number;
}
```

**Response:**
```typescript
{
  message: string;
  deletedCount: number;
  recordedAt: string;
}
```

**Zabezpieczenia:**
1. Sprawdź czy istnieje remanent dla koloru
2. Sprawdź czy nie minęło 24h od `recordedAt`
3. Jeśli tak - zwróć błąd 400
4. Usuń wszystkie rekordy z tą samą datą `recordedAt` i `colorId`
5. Zwróć liczbę usuniętych rekordów

### GET /api/remanent/history/:colorId

Pobiera historię remantów dla koloru.

**Query params:**
- `limit?: number` - limit rekordów (domyślnie: wszystkie)

**Response:**
```typescript
RemanentHistoryEntry[]
```

### GET /api/remanent/history

Pobiera całą historię remantów (wszystkie kolory).

**Query params:**
- `limit?: number` - limit rekordów (domyślnie: wszystkie)

**Response:**
```typescript
RemanentHistoryEntry[]
```

### GET /api/remanent/average/:colorId

Oblicza średnie miesięczne zużycie dla profili koloru.

**Query params:**
- `months?: number` - liczba miesięcy wstecz (domyślnie: 6)

**Response:**
```typescript
{
  colorId: number;
  months: number;
  averages: Array<{
    profileId: number;
    profileCode: string;
    profileName: string;
    averageBeamsPerMonth: number;
    totalCompleted: number;
  }>;
}
```

**Logika:**
1. Oblicz datę początkową (obecnie - X miesięcy)
2. Pobierz zlecenia z `completedAt` >= data początkowa
3. Dla każdego profilu:
   - Suma prętów z pozycji zleceń
   - Podziel przez liczbę miesięcy
4. Zwróć średnie posortowane po kodzie profilu

## Hooki React Query

### useWarehouseData

```typescript
function useWarehouseData(colorId: number | null)
```

Pobiera dane magazynowe dla koloru.

**Query key:** `['warehouse', colorId]`

**Enabled:** `!!colorId`

**Returns:** `UseQueryResult<WarehouseDataResponse>`

### useRemanentSubmit

```typescript
function useRemanentSubmit()
```

Mutacja do zapisywania remanentu.

**Mutation fn:** `remanentApi.submit`

**On success:**
- Toast sukcesu
- Invalidate `['warehouse']` i `['remanent-history']`

**Returns:** `UseMutationResult`

### useFinalizeMonth

```typescript
function useFinalizeMonth()
```

Mutacja do finalizacji miesiąca.

**Mutation fn:** `remanentApi.finalizeMonth`

**On success:**
- Toast sukcesu
- Invalidate `['orders']` i `['warehouse']`

**Returns:** `UseMutationResult`

### useAverageMonthly

```typescript
function useAverageMonthly(colorId: number | null, months: number)
```

Pobiera średnie zużycie miesięczne.

**Query key:** `['remanent-average', colorId, months]`

**Enabled:** `!!colorId && months > 0`

**Returns:** `UseQueryResult<AverageMonthlyResponse>`

### useRemanentHistory

```typescript
function useRemanentHistory(colorId: number | null, limit?: number)
```

Pobiera historię dla koloru.

**Query key:** `['remanent-history', colorId, limit]`

**Enabled:** `!!colorId`

**Returns:** `UseQueryResult<RemanentHistoryEntry[]>`

### useAllRemanentHistory

```typescript
function useAllRemanentHistory(limit?: number)
```

Pobiera całą historię (wszystkie kolory).

**Query key:** `['remanent-history', 'all', limit]`

**Returns:** `UseQueryResult<RemanentHistoryEntry[]>`

### useRollback

```typescript
function useRollback()
```

Mutacja do cofania remanentu.

**Mutation fn:** `remanentApi.rollback`

**On success:**
- Toast sukcesu
- Invalidate `['warehouse']` i `['remanent-history']`

**On error:**
- Toast błędu z komunikatem

**Returns:** `UseMutationResult`

## Funkcje pomocnicze

### groupRemanentHistory

```typescript
function groupRemanentHistory(entries: RemanentHistoryEntry[]): RemanentHistoryGroup[]
```

Grupuje historię po dacie (dokładność do minuty) + kolorze.

**Algorytm:**
1. Utwórz Map z kluczem: `${dateKey}-${colorId}`
2. Dla każdego wpisu:
   - Oblicz `dateKey` (YYYY-MM-DDTHH:MM)
   - Dodaj do odpowiedniej grupy lub stwórz nową
   - Zlicz profile i różnice
3. Konwertuj Map na tablicę
4. Sortuj po dacie malejąco
5. Oznacz najnowszą grupę jako `canRollback` jeśli < 24h

**Returns:** Posortowana tablica grup

### useColors (custom hook)

```typescript
function useColors()
```

Deduplikuje logikę grupowania kolorów.

**Returns:**
```typescript
{
  colors: Color[];
  typicalColors: Color[];
  atypicalColors: Color[];
  isLoading: boolean;
  error: unknown;
}
```

**Optymalizacja:** Używa `useMemo` do grupowania

### useDebounce (custom hook)

```typescript
function useDebounce<T>(value: T, delay: number = 500): T
```

Debouncing dla inputów (np. liczba miesięcy).

**Logika:**
- Opóźnia aktualizację wartości o `delay` ms
- Anuluje poprzedni timeout przy nowej zmianie
- Redukuje liczbę zapytań API

## Przepływ pracy użytkownika

### Wykonanie remanentu

1. Użytkownik przechodzi na `/magazyn/akrobud/remanent`
2. Wybiera kolor z sidebar
3. Widzi tabelę z profilami i obliczonymi stanami
4. Wprowadza rzeczywiste stany w kolumnie "Stan rzeczywisty"
5. Automatycznie widzi różnice w kolumnie "Różnica"
6. Klika "Zapisz remanent"
7. Potwierdza w modalu ze statystykami
8. Remanent zostaje zapisany do historii

### Finalizacja miesiąca

1. Użytkownik klika "Finalizuj miesiąc"
2. Wybiera miesiąc w formacie YYYY-MM
3. Opcjonalnie zaznacza "Archiwizuj zlecenia"
4. Klika "Podgląd"
5. Widzi liczbę zleceń do archiwizacji
6. Klika "Finalizuj" aby potwierdzić
7. Zlecenia zostają zarchiwizowane (jeśli wybrano)

### Cofnięcie remanentu

1. Użytkownik przechodzi na `/magazyn/akrobud/remanent/historia`
2. Widzi listę wszystkich remantów
3. Najnowszy remanent (< 24h) ma przycisk "Cofnij"
4. Po kliknięciu, potwierdza w confirm dialog
5. Remanent zostaje usunięty z historii
6. Stany magazynowe wracają do poprzednich wartości

## Zabezpieczenia i walidacja

### Backend

- **Rollback**: Maksymalnie 24h od wykonania
- **Finalizacja**: Walidacja formatu miesiąca (YYYY-MM)
- **Remanent**: Wymagane colorId i co najmniej 1 update
- **Średnie**: Walidacja months > 0

### Frontend

- **Input stanów**: Tylko liczby (regex: `/^\d*$/`)
- **Zapisywanie**: Minimum 1 wypełniony wpis
- **Finalizacja**: Dwuetapowe zatwierdzanie (podgląd → finalizacja)
- **Rollback**: Confirm dialog przed usunięciem
- **Typy**: Pełna obsługa TypeScript z strict mode

## Optymalizacje wydajności

### React Query

- **Caching**: Automatyczne cache dla zapytań
- **Invalidation**: Precyzyjne unieważnianie cache po mutacjach
- **Enabled**: Warunkowe wykonywanie zapytań

### React Hooks

- **useCallback**: Wszystkie handlery zdarzeń
- **useMemo**: Grupowanie historii, filtrowanie kolorów
- **useDebounce**: Input liczby miesięcy (500ms delay)

### Rendering

- **Lazy loading**: Rozwijane sekcje historii
- **Minimalizacja re-renderów**: Prawidłowe użycie deps w hookach
- **Type safety**: Eliminacja runtime błędów

## Struktura bazy danych

### Tabela: RemanentHistory

```prisma
model RemanentHistory {
  id              Int      @id @default(autoincrement())
  profileId       Int
  colorId         Int
  calculatedStock Int
  actualStock     Int
  difference      Int
  recordedAt      DateTime @default(now())

  profile Profile @relation(fields: [profileId], references: [id])
  color   Color   @relation(fields: [colorId], references: [id])

  @@index([colorId])
  @@index([profileId])
  @@index([recordedAt])
}
```

**Indeksy:**
- `colorId`: Szybkie pobieranie historii dla koloru
- `profileId`: Szybkie pobieranie historii dla profilu
- `recordedAt`: Sortowanie i filtrowanie po dacie

### Modyfikacje Order

Dodano pole `completedAt` do śledzenia zakończenia zlecenia:

```prisma
model Order {
  // ... inne pola
  completedAt DateTime?
}
```

## Możliwe rozszerzenia

1. **Export do Excel**: Eksport historii remantów
2. **Porównanie okresów**: Wykres zmian w czasie
3. **Automatyczne alerty**: Powiadomienia o dużych różnicach
4. **Bulk edit**: Szybkie wprowadzanie stanów (np. scan kodów)
5. **Komentarze**: Możliwość dodania notatek do remanentu
6. **Zdjęcia**: Załączanie zdjęć stanów magazynowych
7. **Raporty**: PDF z podsumowaniem miesiąca
8. **Uprawnienia**: Różne poziomy dostępu (read/write/finalize)

## Znane ograniczenia

1. **Rollback**: Tylko ostatni remanent, tylko < 24h
2. **Finalizacja**: Bez cofnięcia po archiwizacji
3. **Historia**: Brak filtrowania po zakresie dat w UI
4. **Concurrent editing**: Brak obsługi jednoczesnej edycji przez wielu użytkowników
5. **Offline mode**: Brak obsługi pracy offline

## Testowanie

### Scenariusze testowe

1. **Zapisywanie remanentu**
   - Wprowadź stany dla kilku profili
   - Sprawdź obliczenie różnic
   - Zapisz i sprawdź toast sukcesu
   - Zweryfikuj w historii

2. **Finalizacja bez archiwizacji**
   - Wybierz miesiąc
   - Odznacz checkbox archiwizacji
   - Zobacz podgląd (0 zarchiwizowanych)
   - Finalizuj

3. **Finalizacja z archiwizacją**
   - Ustaw completedAt dla kilku zleceń
   - Wybierz ten miesiąc
   - Zaznacz archiwizację
   - Sprawdź podgląd (liczba > 0)
   - Finalizuj
   - Zweryfikuj że zlecenia mają isArchived = true

4. **Rollback w czasie**
   - Wykonaj remanent
   - Od razu cofnij (powinno działać)
   - Wykonaj remanent
   - Zmień recordedAt w DB na > 24h temu
   - Spróbuj cofnąć (powinno zwrócić błąd)

5. **Średnie miesięczne**
   - Ustaw completedAt dla zleceń w różnych miesiącach
   - Zmień liczbę miesięcy (6, 12, 24)
   - Sprawdź czy debouncing działa (max 1 request na 500ms)
   - Zweryfikuj obliczenia

## Changelog

### v1.0.0 (2025-01-02)

**Dodane:**
- Podstawowa funkcjonalność remanentu
- Historia remantów z rollback
- Finalizacja miesiąca z archiwizacją
- Średnie miesięczne zużycie
- ColorSidebar component
- Wszystkie hooki i typy
- Optymalizacje (useCallback, useMemo, useDebounce)

**Naprawione:**
- Typ WarehouseDataResponse w useWarehouseData
- Export useRollback hook
- Użycie hexColor zamiast code dla kolorów
- Debouncing dla months input

## Autor

Funkcjonalność zaimplementowana w ramach systemu zarządzania magazynem Akrobud.
