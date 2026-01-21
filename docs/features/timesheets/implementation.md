# Timesheets - Implementacja

## Struktura plików

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

## Responsywność

### Desktop (≥1280px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar │  Lista pracowników (flex-1)  │  Panel boczny (400px) │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1279px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lista pracowników (full width)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Panel boczny jako overlay (z prawej, 80% width)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Lista pracowników (full width, skrócone kolumny)                │
├─────────────────────────────────────────────────────────────────┤
│  Panel boczny jako full-screen modal                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fazy wdrożenia

### FAZA 1 (MVP)
1. **Zatwierdzenie projektu UX** <- aktualny etap
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

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Model danych](data-model.md)
- [Overview modułu](overview.md)
