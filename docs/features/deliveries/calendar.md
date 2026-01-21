# Deliveries Module - Calendar

Dokumentacja widoku kalendarza dostaw w systemie AKROBUD.

## Purpose

Kalendarz dostaw zapewnia wizualne planowanie i zarzadzanie dostawami:
- Widok miesiecy w formacie siatki kalendarza
- Trzy tryby widoku (tydzien, miesiac, 8 tygodni)
- Kodowanie kolorami statusow i swiat
- Drag & drop zlecen miedzy dostawami
- Integracja z optymalizacja palet

## Features

### 1. Tryby widoku kalendarza

Kalendarz oferuje trzy tryby wyswietlania:

**Widok tygodniowy (`week`):**
- Pokazuje 4 kolejne tygodnie
- Kazdy tydzien ma podsumowanie na dole
- Idealne do planowania krotkoterminowego

**Widok miesiecy (`month`):**
- Pokazuje caly miesiac z dniami sprzed i po
- Siatka zaczyna sie od poniedzialku
- Podsumowania tygodniowe na dole widoku

**Widok 8 tygodni (`8weeks`):**
- Rozszerzony widok na 56 dni
- Najlepszy do planowania dlugoterminowego
- Agregowane statystyki dla kazdego tygodnia

```typescript
// apps/web/src/app/dostawy/hooks/useDeliveryFilters.ts
export type CalendarViewMode = 'week' | 'month' | '8weeks';

export interface DateRange {
  startOfWeek: Date;
  endDate: Date;
  totalDays: number;
}
```

### 2. Komorka dnia (DayCell)

Kazdy dzien w kalendarzu wyswietla:
- **Numer dnia** z wyroznieniem dla dzisiejszego dnia
- **Badge liczby dostaw** jesli sa zaplanowane
- **Oznaczenia swiat** (PL - polskie, DE - niemieckie)
- **Statystyki dzienne** (O:okna, S:skrzydla, Sz:szyby)
- **Lista dostaw** jako klikalne elementy

**Kodowanie kolorow:**
```typescript
// Stany komorek dnia
const cellStyles = {
  nonWorking: 'bg-red-200 border-red-500',    // Dzien wolny
  today: 'border-blue-500 bg-blue-50',         // Dzisiejszy dzien
  weekend: 'bg-slate-100',                     // Weekend
  default: 'bg-slate-50'                       // Normalny dzien roboczy
};
```

### 3. Drag & Drop zlecen

System umozliwia przeciaganie zlecen miedzy dostawami:

**Komponenty drag & drop:**
- `DraggableOrder` - Przeciagalne zlecenie
- `DroppableDelivery` - Strefa upuszczania (dostawa)
- `UnassignedOrdersDropzone` - Strefa dla nieprzypisanych zlecen
- `OrderDragOverlay` - Wizualizacja podczas przeciagania

```typescript
// apps/web/src/app/dostawy/DragDropComponents.tsx
export function DraggableOrder({
  order,
  deliveryId,
  onView,
  onRemove,
  compact = false,
  isSelected = false,
  onToggleSelect,
}: DraggableOrderProps)
```

**Funkcjonalnosci:**
- Przeciaganie pojedynczych zlecen
- Wielokrotny wybor (checkbox) i przeciaganie grupowe
- Context menu z opcjami przenoszenia
- Optimistic updates z indykatorem synchronizacji
- Dostepnosc (ARIA labels, klawiatura)

### 4. Swieta i dni wolne

System rozpoznaje dwa typy swiat:

**Swieta polskie (PL):**
- Wyswietlane z czerwonym badge "PL"
- Moga byc oznaczone jako dni wolne

**Swieta niemieckie (DE):**
- Wyswietlane z zoltym badge "DE"
- Wazne dla dostaw do Niemiec

```typescript
// apps/web/src/app/dostawy/hooks/useDeliveryStats.ts
export interface HolidayInfo {
  polishHolidays: Holiday[];
  germanHolidays: Holiday[];
}
```

**Zarzadzanie dniami wolnymi:**
- Prawy przycisk myszy (PPM) na dniu otwiera menu kontekstowe
- Mozliwosc oznaczenia/odznaczenia dnia jako wolnego
- Dni wolne maja czerwone tlo

### 5. Statystyki

**Statystyki dzienne:**
```typescript
export interface DayStats {
  windows: number;   // Liczba okien
  sashes: number;    // Liczba skrzydel
  glasses: number;   // Liczba szyb
}
```

**Podsumowanie tygodniowe:**
- Agregowane statystyki dla 7 dni
- Wyswietlane pod kazda sekcja tygodnia
- Dwa warianty kolorystyczne (green/blue)

## API Endpoints

### GET /api/deliveries/calendar

Pobiera dane kalendarza dla pojedynczego miesiaca.

**Query Parameters:**
- `month` (string, required) - Miesiac (1-12)
- `year` (string, required) - Rok

**Response:**
```json
{
  "deliveries": [
    {
      "id": 1,
      "deliveryNumber": "D-2026-01-001",
      "deliveryDate": "2026-01-15",
      "status": "planned",
      "deliveryOrders": [...]
    }
  ],
  "unassignedOrders": [...],
  "workingDays": [...],
  "holidays": [...]
}
```

### GET /api/deliveries/calendar-batch

Pobiera dane kalendarza dla wielu miesiecy jednoczesnie (optymalizacja).

**Query Parameters:**
- `months` (string, required) - JSON array, np. `[{"month":1,"year":2026}]`

**Response:**
```json
{
  "deliveries": [...],
  "unassignedOrders": [...],
  "workingDays": [...],
  "holidays": [...]
}
```

**Handler:**
```typescript
// apps/api/src/handlers/deliveryHandler.ts
async getCalendarBatch(request, reply) {
  const monthsParam = request.query.months;
  let months: Array<{ month: number; year: number }>;
  months = JSON.parse(monthsParam);

  const data = await this.service.getCalendarDataBatch(months);
  return reply.send(data);
}
```

### GET /api/deliveries/stats/windows/by-weekday

Statystyki okien w podziale na dni tygodnia.

**Query Parameters:**
- `months` (string, optional) - Ile miesiecy wstecz (domyslnie 6, max 60)

### GET /api/deliveries/stats/windows

Miesieczne statystyki okien.

### GET /api/deliveries/stats/profiles

Miesieczne statystyki profili.

## Integracja z optymalizacja palet

Kalendarz integruje sie z modulem optymalizacji pakowania palet:

**Sciezka:** `/dostawy/[id]/optymalizacja`

**Funkcjonalnosci:**
- Automatyczne obliczanie ukladu okien na paletach
- Konfiguracja opcji optymalizacji (sortowanie, wykorzystanie przestrzeni)
- Wizualizacja rozmieszczenia okien
- Eksport do PDF

```typescript
// apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx
interface OptimizationOptions {
  sortByHeightWhenWidthSimilar: boolean;
  widthSimilarityThreshold: number;
  preferStandardPallets: boolean;
  maximizeUtilization: boolean;
  minimizeOverhang: boolean;
  maxOverhangMm: number;
  allowSideBySide: boolean;
  sideBySideMaxGap: number;
}
```

## Frontend Components

### DeliveryCalendar

Glowny komponent kalendarza.

**Lokalizacja:** `apps/web/src/app/dostawy/components/DeliveryCalendar.tsx`

**Props:**
```typescript
interface DeliveryCalendarProps {
  continuousDays: Date[];
  viewMode: CalendarViewMode;
  dateRange: DateRange;
  weekOffset: number;
  isLoading: boolean;
  error: Error | null;
  stats: UseDeliveryStatsReturn;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  onGoToToday: () => void;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  onDayClick: (date: Date) => void;
  onDayRightClick: (e: React.MouseEvent, date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
  onShowNewDeliveryDialog: () => void;
  onShowWindowStatsDialog: () => void;
  onShowBulkUpdateDatesDialog: () => void;
  onRefresh: () => void;
}
```

### DayCell

Komponent pojedynczego dnia.

**Lokalizacja:** `apps/web/src/app/dostawy/components/DayCell.tsx`

### WeekSummary

Podsumowanie tygodnia.

**Lokalizacja:** `apps/web/src/app/dostawy/components/WeekSummary.tsx`

## Custom Hooks

### useDeliveryFilters

Zarzadzanie filtrami i nawigacja kalendarza.

```typescript
// Zwracane wartosci
{
  pageViewMode: PageViewMode;
  viewMode: CalendarViewMode;
  weekOffset: number;
  dateRange: DateRange;
  continuousDays: Date[];
  monthsToFetch: MonthToFetch[];
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  changeViewMode: (mode: CalendarViewMode) => void;
}
```

### useDeliveryStats

Obliczanie statystyk i sprawdzanie dni.

```typescript
// Zwracane funkcje
{
  getDeliveriesForDay: (date: Date) => Delivery[];
  getDayStats: (date: Date) => DayStats;
  getWeekStats: (dates: Date[]) => DayStats;
  getHolidayInfo: (date: Date) => HolidayInfo;
  isHolidayNonWorking: (date: Date, holidayInfo: HolidayInfo) => boolean;
  isNonWorkingDay: (date: Date) => boolean;
  isToday: (date: Date) => boolean;
  isWeekend: (date: Date) => boolean;
}
```

## Interakcje uzytkownika

### Nawigacja

1. **Strzalki < >** - Przechodzenie do poprzedniego/nastepnego okresu
2. **Przycisk "Dzisiaj"** - Powrot do biezacego tygodnia (gdy offset != 0)
3. **Przyciski widoku** - Przelaczanie miedzy trybami (Tydzien/Miesiac/8 tygodni)

### Tworzenie dostaw

1. Kliknij przycisk **"Nowa dostawa"** w naglowku
2. Wypelnij date i opcjonalny numer dostawy
3. Dostawa pojawi sie w kalendarzu

### Przypisywanie zlecen

**Metoda 1: Drag & drop**
1. Chwyc zlecenie z panelu bocznego lub innej dostawy
2. Przeciagnij na docelowa dostawe w kalendarzu
3. Upusc - zlecenie zostanie przeniesione

**Metoda 2: Context menu**
1. Kliknij prawym przyciskiem na zlecenie
2. Wybierz "Przenies do dostawy"
3. Wybierz docelowa dostawe z listy

### Oznaczanie dni wolnych

1. Kliknij prawym przyciskiem na dzien
2. Wybierz "Oznacz jako wolny" / "Oznacz jako roboczy"
3. Dzien zmieni kolor na czerwony (wolny) lub normalny (roboczy)

## Google Calendar Integration

> **UWAGA:** Integracja z Google Calendar jest planowana, ale jeszcze NIE zaimplementowana.

**Planowana funkcjonalnosc:**
- Synchronizacja dostaw jako wydarzenia w Google Calendar
- Jednokierunkowa synchronizacja (AKROBUD -> Google)
- Automatyczne tworzenie/aktualizacja/usuwanie wydarzen

**Status:** TODO - wymaga implementacji OAuth2 i Google Calendar API.

## Backend Services

### DeliveryCalendarService

**Lokalizacja:** `apps/api/src/services/delivery/DeliveryCalendarService.ts`

Odpowiedzialnosci:
- Pobieranie danych kalendarza dla pojedynczego miesiaca
- Batch fetch dla wielu miesiecy (optymalizacja)
- Laczenie dostaw, dni roboczych i swiat

```typescript
export class DeliveryCalendarService {
  async getCalendarData(year: number, month: number): Promise<CalendarDataResult>;
  async getCalendarDataBatch(months: CalendarMonth[]): Promise<CalendarDataResult>;
}
```

## Performance

### Optymalizacje

1. **Batch API** - Pobieranie danych dla wielu miesiecy w jednym zapytaniu
2. **Memoizacja** - useMemo/useCallback dla obliczen statystyk
3. **Lazy loading** - Komponenty ladowane na zadanie
4. **Optimistic updates** - Natychmiastowa aktualizacja UI podczas drag & drop

### Cache

- React Query cache dla danych kalendarza
- Automatyczna invalidacja przy zmianach

## Troubleshooting

### Drag & drop nie dziala

1. Sprawdz czy @dnd-kit jest poprawnie zainstalowany
2. Upewnij sie, ze DndContext opakowuje komponenty
3. Sprawdz konsole pod katem bledow

### Statystyki sie nie aktualizuja

1. Sprawdz czy React Query invaliduje cache
2. Weryfikuj poprawnosc monthsToFetch
3. Sprawdz odpowiedz API

### Swieta nie wyswietlaja sie

1. Sprawdz czy CalendarService zwraca swieta dla danego roku
2. Weryfikuj format daty w odpowiedzi API

---

*Last updated: 2026-01-20*
