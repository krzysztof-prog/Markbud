# Timesheets - Ekran Kalendarza Miesięcznego

## Cel ekranu

- Szybki przegląd całego miesiąca
- Identyfikacja dni wymagających uwagi
- Nawigacja do konkretnego dnia

---

## Architektura nawigacji

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

---

## Struktura layoutu

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

---

## Komórka dnia - szczegóły

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

---

## Kolory komórek

| Status | Background | Border | Ikona | Opis |
|--------|------------|--------|-------|------|
| `complete` | `bg-green-50` | `border-green-200` | ✓ zielony | Wszyscy pracownicy mają wpisy |
| `partial` | `bg-amber-50` | `border-amber-200` | ⚠ pomarańczowy | Część pracowników bez wpisów |
| `empty` | `bg-white` | `border-gray-200` | ○ szary | Brak jakichkolwiek wpisów |
| `holiday` | `bg-gray-100` | `border-gray-300` | -- | Dzień wolny |

---

## Interakcje

| Akcja | Efekt |
|-------|-------|
| Klik w dzień roboczy | Przejście do Widoku Dnia |
| Klik w dzień wolny | Dialog: "Oznaczyć jako roboczy?" |
| Hover na dzień | Tooltip z dodatkowymi info |

---

## Mapa przepływu

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
│                        WIDOK DNIA                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementacja - pseudokod komponentu

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

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Widok dnia](screens-day-view.md)
- [Panel edycji pracownika](screens-worker-panel.md)
