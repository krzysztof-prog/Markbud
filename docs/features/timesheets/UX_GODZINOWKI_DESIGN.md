# PROJEKT UX: MODUŁ GODZINÓWKI

## System produkcyjny dla fabryki okien PVC - Panel Kierownika

**Wersja:** 1.1
**Data:** 2026-01-12
**Autor:** Claude Opus 4.5 (Senior UX / Product Designer)

---

## DECYZJE WDROŻENIOWE (v1.1)

### Uproszczenia na start:
- **Brak "zamykania dnia"** - tylko statusy: pusty / częściowy / kompletny
- **CLOSED** - zarezerwowane na przyszły etap (patrz sekcja 9)

### Strategia wdrożenia backend:
1. **FAZA 1:** TimeEntry + NonProductiveTask (podstawowa funkcjonalność)
2. **FAZA 2:** SpecialWork (nietypówki)

### Nietypówki:
> "Nietypówki są rejestrowane do przyszłej analizy wydajności."
> Pełna analityka wydajności nietypówek = osobny etap rozwoju.

---

## SPIS TREŚCI

1. [Filozofia projektowa](#1-filozofia-projektowa)
2. [Architektura ekranów](#2-architektura-ekranów)
3. [Ekran 1: Kalendarz miesięczny](#3-ekran-1-kalendarz-miesięczny)
4. [Ekran 2: Widok dnia](#4-ekran-2-widok-dnia-główny-ekran-pracy)
5. [Panel boczny: Edycja pracownika](#5-panel-boczny-edycja-pracownika)
6. [Słowniki (Admin)](#6-słowniki-admin)
7. [Model danych (Prisma)](#7-model-danych-prisma)
8. [Uzasadnienia decyzji UX](#8-uzasadnienia-decyzji-ux)
9. [Stany i przepływy](#9-stany-i-przepływy)
10. [Responsywność](#10-responsywność)
11. [Implementacja - struktura plików](#11-implementacja---struktura-plików)
12. [Podsumowanie kluczowych decyzji](#12-podsumowanie-kluczowych-decyzji)
13. [Następne kroki](#13-następne-kroki)

---

## 1. FILOZOFIA PROJEKTOWA

### 1.1 Oś systemu

```
CZAS → CZŁOWIEK → STRUKTURA PRACY → EFEKT
```

**Jednostka danych:** Jeden dzień pracy jednego pracownika

### 1.2 Zasada 90/10

90% pracowników ma "standardowy dzień produkcyjny" - kierownik NIE powinien ich dotykać.
10% to wyjątki - kierownik skupia się TYLKO na wyjątkach.

**Konsekwencja UX:**
- Domyślność musi być możliwa jednym kliknięciem
- Wyjątki muszą być widoczne na pierwszy rzut oka
- Edycja pojedynczego pracownika NIE wymaga opuszczania widoku dnia

### 1.3 Oddzielenie warstw

| Warstwa | Co zawiera | Dlaczego osobno |
|---------|------------|-----------------|
| **Czas produkcyjny** | Godziny pracy przy oknach | Wpływa na wskaźnik wydajności |
| **Czas nieprodukcyjny** | Pakowanie, profile, palety, serwis | NIE wpływa na wydajność |
| **Czas nietypówek** | Drzwi, HS, PSK, szprosy, trapez | Osobny wskaźnik wydajności |

**Dlaczego?** Jeśli pracownik spędził 4h na paletach, nie można go karać za niższą wydajność okien.

---

## 2. ARCHITEKTURA EKRANÓW

### 2.1 Hierarchia nawigacji

```
Panel Kierownika
└── Godzinówki                    ← NOWA ZAKŁADKA
    ├── Kalendarz (widok miesięczny)  ← PUNKT WEJŚCIA
    │   └── Widok dnia                ← GŁÓWNY EKRAN PRACY
    │       └── Panel pracownika      ← EDYCJA (BOCZNY PANEL)
    └── Słowniki (Admin)
        ├── Pracownicy
        ├── Stanowiska
        ├── Zadania nieprodukcyjne
        └── Typy nietypówek
```

### 2.2 Mapa przepływu

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KALENDARZ MIESIĘCZNY                               │
│                                                                              │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                               │
│   │ Pn  │ Wt  │ Śr  │ Czw │ Pt  │ Sob │ Ndz │                               │
│   ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                               │
│   │ 1   │ 2   │ 3   │ 4   │ 5   │ 6   │ 7   │                               │
│   │ 8h  │ 8h  │10h  │ 8h  │ 8h  │ --  │ --  │  ← skrót danych               │
│   │ ✓   │ ✓   │ ⚠   │ ○   │ ○   │     │     │  ← status                     │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                               │
│                                                                              │
│   Legenda:  ✓ = kompletny   ⚠ = częściowy   ○ = pusty   -- = wolne          │
│                                                                              │
│                         [KLIK W DZIEŃ]                                       │
│                              ↓                                               │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                           WIDOK DNIA (GŁÓWNY)                                │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────┬────────────┐│
│ │  Header: < 3 Stycznia 2026 >  [Ustaw standard]               │  Panel     ││
│ ├─────────────────────────────────────────────────────────────┤  Pracow-   ││
│ │                                                              │  nika      ││
│ │  Lista pracowników:                                          │            ││
│ │                                                              │  (otwarty  ││
│ │  ┌──────────────────────────────────────────────────────┐   │  po klik   ││
│ │  │ Jan Kowalski    │ 8h prod │ Produkcja │    ✓        │   │  w linię)  ││
│ │  └──────────────────────────────────────────────────────┘   │            ││
│ │  ┌──────────────────────────────────────────────────────┐   │            ││
│ │  │ Anna Nowak      │ 6h+2h   │ Produkcja │    ⚠        │   │  ┌────────┐││
│ │  └──────────────────────────────────────────────────────┘   │  │Formularz│││
│ │  ┌──────────────────────────────────────────────────────┐   │  │edycji  │││
│ │  │ Piotr Wiśniewski│   --    │    --     │    ○        │   │  │godzin  │││
│ │  └──────────────────────────────────────────────────────┘   │  └────────┘││
│ │                                                              │            ││
│ └─────────────────────────────────────────────────────────────┴────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. EKRAN 1: KALENDARZ MIESIĘCZNY

### 3.1 Cel ekranu

- Szybki przegląd całego miesiąca
- Identyfikacja dni wymagających uwagi
- Nawigacja do konkretnego dnia

### 3.2 Struktura layoutu

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  < Grudzień 2025 >        [Poprzedni]  [Dzisiaj]  [Następny]           │  │
│  │                                                                         │  │
│  │  Podsumowanie:  Dni robocze: 22  |  Kompletne: 18  |  Do uzupełnienia: 4│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  KALENDARZ                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │     Pn        Wt        Śr       Czw        Pt        Sob       Ndz    │  │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┬───────┤  │
│  │          │          │          │    1     │    2     │    3    │   4   │  │
│  │          │          │          │  156h    │  148h    │   --    │  --   │  │
│  │          │          │          │  12 prac │  12 prac │  wolne  │ wolne │  │
│  │          │          │          │    ✓     │    ⚠     │         │       │  │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┼───────┤  │
│  │    5     │    6     │    7     │    8     │    9     │   10    │  11   │  │
│  │  160h    │  152h    │  164h    │  158h    │  160h    │   --    │  --   │  │
│  │  12 prac │  12 prac │  12 prac │  12 prac │  12 prac │  wolne  │ wolne │  │
│  │    ✓     │    ✓     │    ⚠     │    ✓     │    ○     │         │       │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴─────────┴───────┘  │
│                                                                               │
│  LEGENDA                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ Kompletny (wszyscy)   ⚠ Częściowy (są braki)   ○ Pusty (brak wpisów)│  │
│  │  -- Dzień wolny          Kliknij dzień aby otworzyć                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Komórka dnia - szczegóły

```typescript
interface DayCell {
  date: Date;
  totalHours: number;        // Suma godzin wszystkich pracowników
  workerCount: number;       // Liczba pracowników z wpisami
  activeWorkerCount: number; // Liczba aktywnych pracowników
  status: 'complete' | 'partial' | 'empty' | 'holiday';
}

// Status dnia obliczany automatycznie:
// - complete: workerCount === activeWorkerCount (wszyscy mają wpisy)
// - partial: workerCount > 0 && workerCount < activeWorkerCount
// - empty: workerCount === 0
// - holiday: dzień oznaczony jako wolny
```

**Kolory komórek:**

| Status | Background | Border | Ikona | Opis |
|--------|------------|--------|-------|------|
| `complete` | `bg-green-50` | `border-green-200` | ✓ zielony | Wszyscy pracownicy mają wpisy |
| `partial` | `bg-amber-50` | `border-amber-200` | ⚠ pomarańczowy | Część pracowników bez wpisów |
| `empty` | `bg-white` | `border-gray-200` | ○ szary | Brak jakichkolwiek wpisów |
| `holiday` | `bg-gray-100` | `border-gray-300` | -- | Dzień wolny |

### 3.4 Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik w dzień roboczy | Przejście do Widoku Dnia |
| Klik w dzień wolny | Dialog: "Oznaczyć jako roboczy?" |
| Hover na dzień | Tooltip z dodatkowymi info |

### 3.5 Implementacja - pseudokod komponentu

```tsx
// features/manager/components/timesheets/TimesheetCalendar.tsx

interface TimesheetCalendarProps {
  month: Date;
  onDayClick: (date: Date) => void;
  onMonthChange: (month: Date) => void;
}

export const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({
  month,
  onDayClick,
  onMonthChange,
}) => {
  const { data: monthData } = useSuspenseQuery({
    queryKey: ['timesheets', 'month', format(month, 'yyyy-MM')],
    queryFn: () => timesheetsApi.getMonthSummary(month),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => onMonthChange(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{format(month, 'LLLL yyyy', { locale: pl })}</CardTitle>
            <Button variant="outline" onClick={() => onMonthChange(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <MonthSummaryBadges data={monthData.summary} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Header z dniami tygodnia */}
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Komórki dni */}
          {monthData.days.map(day => (
            <DayCell
              key={day.date}
              day={day}
              onClick={() => day.status !== 'holiday' && onDayClick(day.date)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 4. EKRAN 2: WIDOK DNIA (GŁÓWNY EKRAN PRACY)

### 4.1 Cel ekranu

- Szybki przegląd wszystkich pracowników
- Identyfikacja wyjątków na pierwszy rzut oka
- Akcja "Ustaw standard" dla 90% przypadków
- Edycja pojedynczych pracowników bez opuszczania widoku

### 4.2 Struktura layoutu

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ← Powrót do kalendarza                                                │  │
│  │                                                                         │  │
│  │  < Czwartek, 3 stycznia 2026 >      [◄ Poprzedni]  [Następny ►]        │  │
│  │                                                                         │  │
│  │  Podsumowanie:  12 pracowników  |  156h łącznie  |  3 wyjątki          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ACTION BAR                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  [⚡ Ustaw standardowy dzień]                     [📊 Statystyki dnia] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  MAIN CONTENT                                                                 │
│  ┌─────────────────────────────────────────────────────┬──────────────────┐  │
│  │  LISTA PRACOWNIKÓW                                   │  PANEL BOCZNY   │  │
│  │                                                      │  (gdy wybrany)  │  │
│  │  ┌────────────────────────────────────────────────┐ │                  │  │
│  │  │ #  │ Pracownik       │ Godziny     │ Stanow. │⚡│ │  ┌────────────┐ │  │
│  │  ├────┼─────────────────┼─────────────┼─────────┼──┤ │  │ Edycja     │ │  │
│  │  │ 1  │ Jan Kowalski    │ 8h          │ Prod.   │✓ │ │  │ pracownika │ │  │
│  │  │ 2  │ Anna Nowak      │ 6h+2h nieprod│ Prod.  │⚠ │ │  │            │ │  │
│  │  │ 3  │ Piotr Wiśniewski│ 4h+4h nietypów│ Prod. │⚠ │ │  │ [Formularz]│ │  │
│  │  │ 4  │ Maria Zielińska │ --          │ --      │○ │ │  │            │ │  │
│  │  │ ...│ ...             │ ...         │ ...     │..│ │  │            │ │  │
│  │  └────────────────────────────────────────────────┘ │  │            │ │  │
│  │                                                      │  └────────────┘ │  │
│  └──────────────────────────────────────────────────────┴──────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Lista pracowników - kolumny

| Kolumna | Zawartość | Szerokość |
|---------|-----------|-----------|
| **#** | Numer porządkowy | 48px |
| **Pracownik** | Imię i nazwisko | flex-1 |
| **Godziny** | Suma z rozbiciem (8h lub 6h+2h nieprod) | 150px |
| **Stanowisko** | Nazwa stanowiska | 120px |
| **Status** | Ikona: ✓ / ⚠ / ○ | 48px |

### 4.4 Statusy pracowników

```typescript
type WorkerDayStatus =
  | 'standard'    // Tylko godziny produkcyjne, domyślne stanowisko
  | 'exception'   // Ma nieprodukcyjne LUB nietypówki LUB zmienione stanowisko
  | 'empty';      // Brak wpisów

function getWorkerStatus(entry: WorkerDayEntry): WorkerDayStatus {
  if (!entry.hasData) return 'empty';
  if (
    entry.nonProductiveHours.length > 0 ||
    entry.specialHours.length > 0 ||
    entry.position !== entry.defaultPosition
  ) {
    return 'exception';
  }
  return 'standard';
}
```

### 4.5 Przycisk "Ustaw standardowy dzień"

**To jest KLUCZOWA funkcjonalność UX.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DIALOG: Ustaw standardowy dzień                                         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Ta akcja ustawi WSZYSTKIM aktywnym pracownikom:                   │ │
│  │                                                                     │ │
│  │  • Godziny produkcyjne: [8] h                                      │ │
│  │  • Stanowisko: domyślne dla każdego                                │ │
│  │                                                                     │ │
│  │  Pracownicy do uzupełnienia: 12                                    │ │
│  │  Pracownicy już uzupełnieni: 0 (zostaną nadpisani)                 │ │
│  │                                                                     │ │
│  │  ☐ Nie nadpisuj pracowników z istniejącymi wpisami                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│                              [Anuluj]   [Ustaw standard]                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Logika:**
1. Pobiera listę aktywnych pracowników
2. Dla każdego ustawia godziny produkcyjne = 8h (lub wartość z inputa)
3. Przypisuje domyślne stanowisko
4. To jest PRE-FILL, nie zamknięcie dnia
5. Kierownik może potem poprawić wyjątki

### 4.6 Interakcje na liście

| Akcja | Efekt |
|-------|-------|
| Klik w wiersz pracownika | Otwiera Panel Boczny z edycją |
| Hover na godziny | Tooltip z rozbiciem |
| Klik w status ⚠ | Otwiera Panel z zaznaczeniem wyjątków |

---

## 5. PANEL BOCZNY: EDYCJA PRACOWNIKA

### 5.1 Cel panelu

- Edycja WSZYSTKICH danych pracownika na dany dzień
- Widoczność struktury czasu pracy
- Możliwość dodania wielu zadań nieprodukcyjnych
- Możliwość dodania wielu nietypówek

### 5.2 Struktura layoutu

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PANEL BOCZNY (szerokość: 400px, fixed right)                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  HEADER                                                             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ← Zamknij                              Jan Kowalski          │  │ │
│  │  │                                          3 stycznia 2026      │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 1: STANOWISKO                                               │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Stanowisko                                                   │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Produkcja ▼ (domyślne)                                  ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 2: CZAS PRODUKCYJNY                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Godziny produkcyjne                                          │  │ │
│  │  │  ┌─────────────┐                                              │  │ │
│  │  │  │    8      h │  ← input numeryczny                          │  │ │
│  │  │  └─────────────┘                                              │  │ │
│  │  │  Czas pracy przy standardowych oknach                         │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 3: CZAS NIEPRODUKCYJNY (collapsible)                        │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ▼ Godziny nieprodukcyjne (2h)                    [+ Dodaj]  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Pakowanie          │   1h   │  [🗑️]                     ││  │ │
│  │  │  │  Przygotowanie prof.│   1h   │  [🗑️]                     ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 4: NIETYPÓWKI (collapsible)                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ▼ Nietypówki (4h)                                [+ Dodaj]  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Drzwi              │   2h   │  [🗑️]                     ││  │ │
│  │  │  │  HS                 │   2h   │  [🗑️]                     ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  │                                                               │  │ │
│  │  │  ℹ️ Nietypówki nie wliczają się do standardowej wydajności    │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  PODSUMOWANIE                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │ │
│  │  │  Produkcyjne:      8h  ████████████░░░░░░░░                  │  │ │
│  │  │  Nieprodukcyjne:   2h  ██░░░░░░░░░░░░░░░░░░                  │  │ │
│  │  │  Nietypówki:       4h  ████░░░░░░░░░░░░░░░░                  │  │ │
│  │  │  ─────────────────────────────────────────                   │  │ │
│  │  │  RAZEM:           14h                                        │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  FOOTER                                                             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │                [Anuluj]        [Zapisz zmiany]               │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Sekcje szczegółowo

#### SEKCJA 1: Stanowisko

```tsx
<FormField label="Stanowisko">
  <Select
    value={position}
    onChange={setPosition}
    options={[
      { value: 'production', label: 'Produkcja', isDefault: true },
      { value: 'montaz', label: 'Montaż' },
      { value: 'szklarnia', label: 'Szklarnia' },
      // ... lista ze słownika
    ]}
  />
  {position !== defaultPosition && (
    <span className="text-amber-600 text-sm">
      ⚠ Zmienione z domyślnego
    </span>
  )}
</FormField>
```

#### SEKCJA 2: Czas produkcyjny

```tsx
<FormField label="Godziny produkcyjne" hint="Czas pracy przy standardowych oknach">
  <div className="flex items-center gap-2">
    <Input
      type="number"
      value={productiveHours}
      onChange={(e) => setProductiveHours(Number(e.target.value))}
      min={0}
      max={24}
      step={0.5}
      className="w-20"
    />
    <span className="text-gray-500">h</span>
  </div>
</FormField>
```

**Uwaga:** Brak limitu 8h - pracownik może mieć 12h produkcyjnych.

#### SEKCJA 3: Czas nieprodukcyjny

```tsx
<Collapsible open={nonProductiveOpen} onOpenChange={setNonProductiveOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full">
    <span>
      Godziny nieprodukcyjne
      {totalNonProductive > 0 && (
        <Badge variant="secondary" className="ml-2">{totalNonProductive}h</Badge>
      )}
    </span>
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addTask(); }}>
      + Dodaj
    </Button>
  </CollapsibleTrigger>

  <CollapsibleContent>
    {nonProductiveTasks.map((task, index) => (
      <div key={index} className="flex items-center gap-2 py-2 border-b">
        <Select
          value={task.type}
          onChange={(value) => updateTask(index, 'type', value)}
          options={nonProductiveTypes}
          className="flex-1"
        />
        <Input
          type="number"
          value={task.hours}
          onChange={(e) => updateTask(index, 'hours', Number(e.target.value))}
          className="w-16"
          min={0}
          step={0.5}
        />
        <span className="text-gray-500">h</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeTask(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </CollapsibleContent>
</Collapsible>
```

**Lista zadań nieprodukcyjnych (ze słownika):**
- Pakowanie
- Przygotowanie profili
- Serwis
- Palety
- Inne

#### SEKCJA 4: Nietypówki

Identyczna struktura jak nieprodukcyjne, ale z inną listą typów:
- Drzwi
- HS
- PSK
- Szprosy
- Trapez

**Uwaga w UI:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
  ℹ️ Nietypówki są rejestrowane do przyszłej analizy wydajności.
</div>
```

### 5.4 Wizualizacja podsumowania

```tsx
<div className="bg-gray-50 rounded-lg p-4">
  <h4 className="font-medium mb-3">Struktura dnia pracy</h4>

  <div className="space-y-2">
    <ProgressBar
      label="Produkcyjne"
      value={productiveHours}
      max={14}
      color="green"
    />
    <ProgressBar
      label="Nieprodukcyjne"
      value={totalNonProductive}
      max={14}
      color="amber"
    />
    <ProgressBar
      label="Nietypówki"
      value={totalSpecial}
      max={14}
      color="blue"
    />
  </div>

  <div className="border-t mt-3 pt-3 flex justify-between font-medium">
    <span>RAZEM:</span>
    <span>{totalHours}h</span>
  </div>
</div>
```

---

## 6. SŁOWNIKI (ADMIN)

### 6.1 Nawigacja

```
Godzinówki
├── Kalendarz
└── Słowniki ← dostępne tylko dla admina/kierownika
    ├── Pracownicy
    ├── Stanowiska
    ├── Zadania nieprodukcyjne
    └── Typy nietypówek
```

### 6.2 Struktura widoku słownika

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Pracownicy                                         [+ Dodaj nowego]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  TABELA                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Imię i nazwisko    │ Stanowisko domyślne │ Aktywny  │ Akcje           │  │
│  ├─────────────────────┼────────────────────┼──────────┼─────────────────┤  │
│  │  Jan Kowalski       │ Produkcja           │    ✓     │ [Edytuj] [↓]   │  │
│  │  Anna Nowak         │ Produkcja           │    ✓     │ [Edytuj] [↓]   │  │
│  │  Piotr Wiśniewski   │ Montaż              │    ✓     │ [Edytuj] [↓]   │  │
│  │  ─ Maria Zielińska  │ Produkcja           │    ✗     │ [Edytuj] [↑]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Legenda:  [↓] = Dezaktywuj   [↑] = Aktywuj   ─ = Nieaktywny (przyszarzony) │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Zasady CRUD

| Operacja | Dozwolona | Uwagi |
|----------|-----------|-------|
| **Create** | ✓ | Normalne dodawanie |
| **Read** | ✓ | Lista z filtrem aktywny/nieaktywny |
| **Update** | ✓ | Edycja danych |
| **Delete** | ✗ | **NIE KASUJ** - tylko dezaktywuj |

**Dlaczego brak delete?**
Historyczne dane godzinówek muszą zachować odniesienie do pracownika/stanowiska.
Zamiast delete → `isActive: false` + element przyszarzony na liście.

---

## 7. MODEL DANYCH (Prisma)

```prisma
// Pracownik
model Worker {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  defaultPosition String   // ID pozycji domyślnej
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  timeEntries     TimeEntry[]
}

// Stanowisko
model Position {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Zadanie nieprodukcyjne (typ)
model NonProductiveTaskType {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Typ nietypówki
model SpecialWorkType {
  id        String   @id @default(cuid())
  name      String   @unique  // np. "Drzwi", "HS", "PSK"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Główny wpis godzinówki (dzień + pracownik)
model TimeEntry {
  id               String   @id @default(cuid())
  date             DateTime @db.Date
  workerId         String
  worker           Worker   @relation(fields: [workerId], references: [id])

  positionId       String
  productiveHours  Decimal  @default(0) @db.Decimal(4, 1)  // np. 8.5

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  nonProductiveTasks NonProductiveTask[]
  specialWorks       SpecialWork[]

  @@unique([date, workerId])
}

// Zadanie nieprodukcyjne (wiele na jeden TimeEntry)
model NonProductiveTask {
  id           String   @id @default(cuid())
  timeEntryId  String
  timeEntry    TimeEntry @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)

  taskTypeId   String
  hours        Decimal  @db.Decimal(4, 1)

  createdAt    DateTime @default(now())
}

// Nietypówka (wiele na jeden TimeEntry)
model SpecialWork {
  id           String   @id @default(cuid())
  timeEntryId  String
  timeEntry    TimeEntry @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)

  specialTypeId String
  hours         Decimal  @db.Decimal(4, 1)

  createdAt     DateTime @default(now())
}

// Konfiguracja dni wolnych
model WorkingDay {
  id        String   @id @default(cuid())
  date      DateTime @db.Date @unique
  isHoliday Boolean  @default(false)
  note      String?  // np. "Boże Narodzenie"
}
```

---

## 8. UZASADNIENIA DECYZJI UX

### 8.1 Dlaczego domyślność + wyjątki?

**Problem:** Kierownik ma 12-15 pracowników. Wpisywanie danych dla każdego CODZIENNIE to 15 × 250 dni roboczych = **3750 operacji rocznie**.

**Rozwiązanie:**
- "Ustaw standard" = 1 klik dla 90% przypadków
- Kierownik dotyka TYLKO wyjątki (10%)
- **Efekt:** ~400 operacji zamiast 3750

### 8.2 Dlaczego panel boczny (nie nowa strona)?

**Problem:** Przeskakiwanie między stronami przy edycji pojedynczych pracowników:
- Tracisz kontekst listy
- Musisz klikać "Wróć"
- Nie widzisz jak wygląda dzień globalnie

**Rozwiązanie:**
- Panel boczny = edycja bez opuszczania widoku dnia
- Lista cały czas widoczna (choć węższa)
- Zmiana pracownika = jedno kliknięcie na liście

### 8.3 Dlaczego rozdział: produkcyjne / nieprodukcyjne / nietypowe?

**Problem biznesowy:** Wydajność = jednostki / godzina.

Ale:
- Jeśli pracownik spędził 4h na paletach → jego wydajność okien NIE może być liczona z 8h
- Jeśli robił drzwi (nietypówka) → standardowa wydajność też nie ma sensu

**Rozwiązanie (v1 - uproszczone):**
```
Wydajność standard = jednostki / godziny_produkcyjne
Godziny nieprodukcyjne = NIE wliczane do wskaźnika wydajności
Nietypówki = rejestrowane do przyszłej analizy (FAZA 2)
```

> **Uwaga:** Pełna analityka wydajności nietypówek = osobny etap rozwoju.

### 8.4 Dlaczego kalendarz miesięczny jako punkt wejścia?

**Problem:** Godzinówki dotyczą KONKRETNYCH DNI. Bez kontekstu kalendarza:
- Nie wiesz które dni już uzupełnione
- Nie wiesz gdzie są luki
- Nie widzisz wzorców (np. piątki zawsze mniej godzin)

**Rozwiązanie:** Kalendarz daje:
- Przegląd całego miesiąca
- Wizualne oznaczenie statusów
- Łatwa nawigacja do dowolnego dnia

### 8.5 Dlaczego brak limitów godzin?

**Problem:** Produkcja jest NIEREGULARNA. Ludzie pracują:
- 6h (krótszy dzień)
- 8h (standard)
- 10-12h (nadgodziny, sezon)

**Rozwiązanie:** System NIE wymusza norm:
- Można wpisać dowolną liczbę godzin
- Suma może przekroczyć 8h
- To jest RZECZYWISTOŚĆ, nie ideał

### 8.6 Dlaczego wiele zadań nieprodukcyjnych / nietypówek na dzień?

**Problem:** Jeden pracownik jednego dnia może:
- 2h pakować
- 1h serwis
- 4h produkcja standardowa
- 1h drzwi (nietypówka)

**Rozwiązanie:**
- Każda sekcja może mieć WIELE wpisów
- Każdy wpis = typ + godziny
- UI umożliwia dodawanie/usuwanie dynamicznie

---

## 9. STANY I PRZEPŁYWY

### 9.1 Stany dnia (v1 - uproszczone)

```typescript
enum DayStatus {
  EMPTY = 'empty',        // Brak wpisów dla żadnego pracownika
  PARTIAL = 'partial',    // Część pracowników uzupełniona
  COMPLETE = 'complete',  // Wszyscy aktywni pracownicy mają wpisy
}

// Obliczanie statusu:
function getDayStatus(workerCount: number, activeWorkerCount: number): DayStatus {
  if (workerCount === 0) return 'empty';
  if (workerCount < activeWorkerCount) return 'partial';
  return 'complete';
}
```

### 9.2 Przepływ stanów (v1)

```
EMPTY → PARTIAL → COMPLETE
  │         │          │
  └─────────┴──────────┘
     Zawsze można edytować
     Brak blokowania
```

**Wszystkie dni są ZAWSZE edytowalne** - brak mechanizmu zamykania w v1.

### 9.3 PRZYSZŁY ETAP: Zamykanie dnia (CLOSED)

> **UWAGA:** Poniższy kod to PLANOWANA funkcjonalność na przyszłość.
> NIE implementować w pierwszej wersji.

```typescript
// === PRZYSZŁY ETAP ===
enum DayStatusFuture {
  EMPTY = 'empty',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  CLOSED = 'closed',      // PRZYSZŁOŚĆ: Dzień zamknięty (zablokowany)
}

// Przepływ z zamykaniem:
// EMPTY → PARTIAL → COMPLETE → CLOSED
//   │         │          │         │
//   └─────────┴──────────┘         │
//         Można edytować           ▼
//                             Po CLOSED:
//                        tylko admin może odblokować

// Walidacja przed zamknięciem (PRZYSZŁOŚĆ):
function validateBeforeClose(dayData: DayData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const activeWorkers = getActiveWorkers();
  const workersWithEntries = dayData.entries.map(e => e.workerId);
  const missing = activeWorkers.filter(w => !workersWithEntries.includes(w.id));

  if (missing.length > 0) {
    warnings.push(`${missing.length} pracowników bez wpisów`);
  }

  dayData.entries.forEach(entry => {
    const total = entry.productiveHours + entry.nonProductiveTotal + entry.specialTotal;
    if (total > 12) {
      warnings.push(`${entry.workerName}: ${total}h - nietypowo dużo`);
    }
  });

  return { canClose: errors.length === 0, errors, warnings };
}
```

---

## 10. RESPONSYWNOŚĆ

### 10.1 Desktop (≥1280px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar │  Lista pracowników (flex-1)  │  Panel boczny (400px) │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Tablet (768px - 1279px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lista pracowników (full width)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Panel boczny jako overlay (z prawej, 80% width)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Mobile (<768px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lista pracowników (full width, skrócone kolumny)                │
├─────────────────────────────────────────────────────────────────┤
│  Panel boczny jako full-screen modal                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. IMPLEMENTACJA - STRUKTURA PLIKÓW

```
apps/web/src/features/manager/
├── components/
│   └── timesheets/
│       ├── TimesheetCalendar.tsx         # Kalendarz miesięczny
│       ├── DayCell.tsx                   # Komórka kalendarza
│       ├── DayView.tsx                   # Widok dnia (główny)
│       ├── WorkersList.tsx               # Lista pracowników
│       ├── WorkerRow.tsx                 # Wiersz pracownika
│       ├── WorkerEditPanel.tsx           # Panel boczny edycji
│       ├── NonProductiveSection.tsx      # Sekcja nieprodukcyjnych
│       ├── SpecialWorkSection.tsx        # Sekcja nietypówek
│       ├── DaySummary.tsx                # Podsumowanie dnia
│       ├── SetStandardDialog.tsx         # Dialog "Ustaw standard"
│       └── dictionaries/
│           ├── WorkersDict.tsx           # Słownik pracowników
│           ├── PositionsDict.tsx         # Słownik stanowisk
│           ├── NonProductiveTypesDict.tsx
│           └── SpecialTypesDict.tsx
├── api/
│   └── timesheetsApi.ts                  # API client
├── hooks/
│   ├── useTimesheetMonth.ts
│   ├── useTimesheetDay.ts
│   ├── useWorkerEntry.ts
│   └── useDictionaries.ts
├── helpers/
│   ├── calculateTotals.ts
│   ├── validateDay.ts
│   └── formatTimeEntry.ts
└── types/
    └── timesheet.types.ts

apps/api/src/
├── routes/
│   └── timesheetRoutes.ts
├── handlers/
│   └── timesheetHandler.ts
├── services/
│   └── timesheetService.ts
├── repositories/
│   └── TimesheetRepository.ts
└── validators/
    └── timesheetValidators.ts
```

---

## 12. PODSUMOWANIE KLUCZOWYCH DECYZJI

| Decyzja | Uzasadnienie |
|---------|--------------|
| Kalendarz jako punkt wejścia | Kontekst czasowy, widoczność statusów |
| "Ustaw standard" jednym klikiem | 90% pracowników = standard |
| Panel boczny (nie nowa strona) | Szybkość edycji, zachowanie kontekstu |
| Trzy typy godzin | Różne wpływy na wskaźniki wydajności |
| Brak limitów godzin | Realistyczna produkcja, nie idealna |
| Wiele zadań na dzień | Rzeczywistość pracy produkcyjnej |
| Soft delete w słownikach | Zachowanie historii danych |
| Statusy wizualne (✓ ⚠ ○) | Szybka identyfikacja wyjątków |

---

## 13. NASTĘPNE KROKI

### FAZA 1 (MVP)
1. **Zatwierdzenie projektu UX** ← aktualny etap
2. **Migracja bazy danych** - Worker, Position, TimeEntry, NonProductiveTask, NonProductiveTaskType
3. **Backend API FAZA 1** - CRUD dla podstawowych godzinówek (bez SpecialWork)
4. **Frontend** - komponenty według specyfikacji
5. **Testowanie z kierownikiem** - feedback i iteracje

### FAZA 2 (Nietypówki)
6. **Migracja bazy** - SpecialWork, SpecialWorkType
7. **Backend API FAZA 2** - CRUD dla nietypówek
8. **Frontend** - sekcja nietypówek w panelu pracownika

### PRZYSZŁOŚĆ (opcjonalnie)
- Zamykanie dnia (CLOSED status)
- Analityka wydajności nietypówek
- Raporty miesięczne

---

## CHANGELOG

| Data | Wersja | Zmiany |
|------|--------|--------|
| 2026-01-12 | 1.1 | Uproszczenie: brak CLOSED, iteracyjne wdrożenie backend |
| 2026-01-12 | 1.0 | Inicjalna wersja projektu UX |
