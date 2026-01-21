# Moduł Timesheets - Godzinówki

## Przegląd

Zarządzanie czasem pracy pracowników produkcji - śledzenie godzin produkcyjnych, nieprodukcyjnych i nieobecności.

**Dostęp:** OWNER, ADMIN, KIEROWNIK

**Lokalizacja:** Panel kierownika → zakładka "Godzinówki"

---

## Widoki

### 1. Kalendarz (CalendarView)

**Funkcje:**
- Widok miesięczny ze statusem dni
- Nawigacja między miesiącami
- Kliknięcie dnia otwiera widok szczegółowy

**Statusy dni:**
| Status | Kolor | Opis |
|--------|-------|------|
| empty | Szary | Brak wpisów |
| partial | Żółty | Część pracowników ma wpisy |
| complete | Zielony | Wszyscy pracownicy mają wpisy |

### 2. Widok Dnia (DayView)

**Zawartość:**
- Tabela wszystkich aktywnych pracowników
- Kolumny: Pracownik, Stanowisko, Prod, Nieprod, Suma
- Status każdego pracownika (wpis/brak/nieobecność)
- Podsumowanie godzin dnia

**Akcje:**
- Kliknięcie na pracownika → panel edycji
- "Ustaw standardowy dzień" → bulk create

---

## Panel Edycji (WorkerEditPanel)

### Sekcje

1. **Nieobecność**
   - Choroba (czerwony)
   - Urlop (niebieski)
   - Nieobecność (szary)
   - Dialog tygodniowy (jeśli poniedziałek)

2. **Stanowisko**
   - Dropdown z listą stanowisk
   - Domyślnie z profilu pracownika

3. **Godziny Produkcyjne**
   - Input 0-24h, krok 0.5
   - Główny czas pracy

4. **Godziny Nieprodukcyjne** (collapsible)
   - Lista zadań nieprodukcyjnych
   - Każde z typem i liczbą godzin
   - Przykłady: Czyszczenie, Szkolenie, Administracja

5. **Nietypówki** (collapsible)
   - Dodatkowe prace specjalne
   - Typy: Drzwi, HS, PSK, Szprosy, Trapez, Łuki
   - Do analizy wydajności

6. **Notatki**
   - Opcjonalne uwagi

### Walidacja
- Suma godzin ≤ 24h
- Wymagane stanowisko
- Nieobecność blokuje inne pola

---

## Bulk Operations

### Ustaw Standardowy Dzień

1. Dialog wyświetla pracowników BEZ wpisu
2. Wybierz pracowników (checkboxy)
3. Ustaw liczbę godzin (zapamiętywane)
4. Kliknij "Zapisz" → bulk create

### Nieobecność Tygodniowa

1. Zaznacz nieobecność w poniedziałek
2. Dialog: "Czy do końca tygodnia?"
3. Opcja "Do końca tygodnia" → Pn-Pt

---

## API Endpointy

### Pracownicy

```
GET    /api/timesheets/workers              - Lista pracowników
GET    /api/timesheets/workers/:id          - Szczegóły
POST   /api/timesheets/workers              - Dodaj
PUT    /api/timesheets/workers/:id          - Edytuj
DELETE /api/timesheets/workers/:id          - Dezaktywuj (soft)
```

### Stanowiska

```
GET    /api/timesheets/positions            - Lista stanowisk
POST   /api/timesheets/positions            - Dodaj
PUT    /api/timesheets/positions/:id        - Edytuj
```

### Typy Zadań Nieprodukcyjnych

```
GET    /api/timesheets/task-types           - Lista typów
POST   /api/timesheets/task-types           - Dodaj
PUT    /api/timesheets/task-types/:id       - Edytuj
```

### Typy Nietypówek

```
GET    /api/timesheets/special-work-types   - Lista typów
POST   /api/timesheets/special-work-types   - Dodaj
PUT    /api/timesheets/special-work-types/:id - Edytuj
PATCH  /api/timesheets/special-work-types/:id/toggle - Toggle aktywność
```

### Wpisy Czasu

```
GET    /api/timesheets/entries              - Lista wpisów
GET    /api/timesheets/entries/:id          - Szczegóły
POST   /api/timesheets/entries              - Dodaj
PUT    /api/timesheets/entries/:id          - Edytuj
DELETE /api/timesheets/entries/:id          - Usuń
```

### Bulk Operations

```
POST   /api/timesheets/set-standard-day     - Standardowy dzień
POST   /api/timesheets/set-absence-range    - Nieobecność zakresem
```

### Kalendarz

```
GET    /api/timesheets/calendar?year=X&month=Y - Podsumowanie miesiąca
GET    /api/timesheets/day-summary?date=X      - Szczegóły dnia
```

---

## Request: Wpis czasu

```json
{
  "date": "2026-01-14",
  "workerId": 1,
  "positionId": 2,
  "productiveHours": 7.5,
  "absenceType": null,
  "notes": "Opcjonalna notatka",
  "nonProductiveTasks": [
    { "taskTypeId": 1, "hours": 0.5, "notes": null }
  ],
  "specialWorks": [
    { "specialTypeId": 1, "hours": 1.0, "notes": "Drzwi XXL" }
  ]
}
```

---

## Typy Danych

### Worker

```typescript
interface Worker {
  id: number;
  firstName: string;
  lastName: string;
  defaultPosition: string;
  isActive: boolean;
  sortOrder: number;
}
```

### TimeEntry

```typescript
interface TimeEntry {
  id: number;
  date: string;
  workerId: number;
  positionId: number;
  productiveHours: number;
  absenceType: 'SICK' | 'VACATION' | 'ABSENT' | null;
  notes: string | null;
  nonProductiveTasks?: NonProductiveTask[];
  specialWorks?: SpecialWork[];
}
```

### DaySummary

```typescript
interface DaySummary {
  date: string;
  status: 'empty' | 'partial' | 'complete';
  workers: WorkerDaySummary[];
  totals: {
    entriesCount: number;
    totalWorkers: number;
    totalProductiveHours: number;
    totalNonProductiveHours: number;
    totalHours: number;
  };
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `CalendarView` | Kalendarz miesiąca |
| `DayView` | Widok dnia |
| `WorkerRow` | Wiersz pracownika |
| `WorkerEditPanel` | Panel edycji |
| `NonProductiveSection` | Sekcja nieprodukcji |
| `SpecialWorkSection` | Sekcja nietypówek |
| `SetStandardDialog` | Dialog standardowego dnia |
| `AbsenceWeekDialog` | Dialog nieobecności tyg. |
| `SettingsPanel` | Panel ustawień |
| `WorkersManagement` | CRUD pracowników |
| `PositionsManagement` | CRUD stanowisk |
| `TaskTypesManagement` | CRUD typów nieprodukcji |
| `SpecialWorkTypesManagement` | CRUD nietypówek |

---

## Hooki

```typescript
// Query
useWorkers()
usePositions()
useTaskTypes()
useSpecialWorkTypes()
useTimeEntries()
useCalendarSummary()
useDaySummary()

// Mutations
useCreateTimeEntry()
useUpdateTimeEntry()
useDeleteTimeEntry()
useSetStandardDay()
useSetAbsenceRange()
```

---

## LocalStorage

System zapamiętuje:
- Domyślne godziny standardowego dnia
- Wybór pracowników w dialogu standardowym

---

## Pliki

**Frontend:**
- `apps/web/src/features/timesheets/`

**Backend:**
- `apps/api/src/handlers/timesheetsHandler.ts`
- `apps/api/src/services/timesheetsService.ts`
- `apps/api/src/routes/timesheets.ts`
- `apps/api/src/validators/timesheets.ts`

---

## Zobacz też

- [Panel kierownika](../manager/overview.md)

---

## Dokumentacja szczegółowa

Pełna dokumentacja UX została podzielona na mniejsze pliki:

| Plik | Opis |
|------|------|
| [design-philosophy.md](design-philosophy.md) | Filozofia projektowa, decyzje UX, zasada 90/10 |
| [screens-calendar.md](screens-calendar.md) | Ekran kalendarza miesięcznego |
| [screens-day-view.md](screens-day-view.md) | Ekran widoku dnia (główny) |
| [screens-worker-panel.md](screens-worker-panel.md) | Panel edycji pracownika |
| [data-model.md](data-model.md) | Model danych Prisma |
| [admin-dictionaries.md](admin-dictionaries.md) | Słowniki (Admin) - pracownicy, stanowiska, typy |
| [implementation.md](implementation.md) | Struktura plików, responsywność, fazy wdrożenia |

**Archiwum:** [UX_GODZINOWKI_DESIGN.md](UX_GODZINOWKI_DESIGN.md) - oryginalny plik (1053 linie)
