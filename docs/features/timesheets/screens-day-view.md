# Timesheets - Ekran Widoku Dnia

## Cel ekranu

- Szybki przegląd wszystkich pracowników
- Identyfikacja wyjątków na pierwszy rzut oka
- Akcja "Ustaw standard" dla 90% przypadków
- Edycja pojedynczych pracowników bez opuszczania widoku

---

## Struktura layoutu

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

---

## Lista pracowników - kolumny

| Kolumna | Zawartość | Szerokość |
|---------|-----------|-----------|
| **#** | Numer porządkowy | 48px |
| **Pracownik** | Imię i nazwisko | flex-1 |
| **Godziny** | Suma z rozbiciem (8h lub 6h+2h nieprod) | 150px |
| **Stanowisko** | Nazwa stanowiska | 120px |
| **Status** | Ikona: ✓ / ⚠ / ○ | 48px |

---

## Statusy pracowników

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

---

## Przycisk "Ustaw standardowy dzień"

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

---

## Interakcje na liście

| Akcja | Efekt |
|-------|-------|
| Klik w wiersz pracownika | Otwiera Panel Boczny z edycją |
| Hover na godziny | Tooltip z rozbiciem |
| Klik w status ⚠ | Otwiera Panel z zaznaczeniem wyjątków |

---

## Stany dnia (v1 - uproszczone)

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

---

## Przepływ stanów (v1)

```
EMPTY → PARTIAL → COMPLETE
  │         │          │
  └─────────┴──────────┘
     Zawsze można edytować
     Brak blokowania
```

**Wszystkie dni są ZAWSZE edytowalne** - brak mechanizmu zamykania w v1.

---

## PRZYSZŁY ETAP: Zamykanie dnia (CLOSED)

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

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Kalendarz miesięczny](screens-calendar.md)
- [Panel edycji pracownika](screens-worker-panel.md)
