# Plan Refaktoryzacji - 10 Największych Plików

**Data:** 2026-01-20
**Status:** Zakończony (większość oznaczona jako niski priorytet)

---

## Podsumowanie

| # | Plik | Rozmiar | Typ | Status |
|---|------|---------|-----|--------|
| 1 | palletStockService.ts | 1,337 linii | Service | Niski priorytet |
| 2 | schucoService.ts | 1,086 linii | Service | Niski priorytet |
| 3 | UzyteBeleParser.ts | 1,048 linii | Service | Niski priorytet |
| 4 | settings/page.tsx | 870 linii | Component | Niski priorytet |
| 5 | UzyteBeleWatcher.ts | 862 linii | Service | Niski priorytet |
| 6 | timesheetsService.ts | 832 linii | Service | Niski priorytet |
| 7 | okucApi.ts | 828 → 6 plików | API Client | **UKOŃCZONY** |
| 8 | GlassDeliveryMatchingService.ts | 723 linii | Service | Niski priorytet |
| 9 | OrderRepository.ts | 718 linii | Repository | Niski priorytet |
| 10 | csvImportService.ts | 714 linii | Service | **OK** (już dobrze zorganizowany) |

---

## Wnioski

### Kiedy dzielić pliki ma sens:
- Praca zespołowa (mniej konfliktów git)
- Różne odpowiedzialności w jednym pliku
- Trudności z nawigacją

### Kiedy NIE dzielić:
- **Jeden autor** - brak konfliktów git
- **Spójna logika** - plik robi jedną rzecz dobrze
- **Czas** - lepiej skupić się na nowych funkcjach

### Dla projektu AKROBUD:
Przy 5-10 użytkownikach i jednym autorze, refaktoryzacja większości plików **nie jest priorytetem**. Lepiej skupić się na nowych funkcjonalnościach.

---

## Wykonane prace

### okucApi.ts (828 linii → 6 plików) - UKOŃCZONY

**Lokalizacja:** `apps/web/src/features/okuc/api/`

**Wykonany podział:**
```
apps/web/src/features/okuc/api/
├── index.ts              # Re-eksporty (20 linii)
├── okucArticlesApi.ts    # Artykuły CRUD + aliasy (135 linii)
├── okucStockApi.ts       # Stan magazynowy + historia (143 linii)
├── okucDemandApi.ts      # Zapotrzebowanie (77 linii)
├── okucOrdersApi.ts      # Zamówienia (87 linii)
├── okucProportionsApi.ts # Proporcje (97 linii)
└── okucLocationsApi.ts   # Lokalizacje (56 linii)
```

Ten podział miał sens bo okucApi zawierał 6 niezależnych domen (articles, stock, demand, orders, proportions, locations).

---

## Plany szczegółowe (na później, jeśli będzie potrzeba)

Szczegółowe plany podziału pozostałych plików zachowane na wypadek gdyby w przyszłości była potrzeba refaktoryzacji (np. przy pracy zespołowej).

<details>
<summary>palletStockService.ts (1,337 linii)</summary>

```
apps/api/src/services/pallet/
├── index.ts                      # Re-eksporty
├── palletStockService.ts         # Główna logika (~400 linii)
├── palletDateUtils.ts            # Funkcje pomocnicze dat (~40 linii)
├── palletAlertService.ts         # Logika alertów (~80 linii)
├── palletCalendarService.ts      # Kalendarz i raporty (~120 linii)
├── palletInitialStockService.ts  # Stan początkowy (~60 linii)
└── palletDayLifecycleService.ts  # Cykl życia dnia (~150 linii)
```
</details>

<details>
<summary>schucoService.ts (1,086 linii)</summary>

```
apps/api/src/services/schuco/
├── index.ts                          # Re-eksporty
├── schucoService.ts                  # Orkiestracja (~200 linii)
├── schucoFetchService.ts             # Pobieranie danych (~150 linii)
├── schucoChangeTrackingService.ts    # Śledzenie zmian (~180 linii)
├── schucoOrderLinkingService.ts      # Powiązania ze zleceniami (~120 linii)
├── schucoDeliveryQueryService.ts     # Zapytania o dostawy (~150 linii)
├── schucoArchiveService.ts           # Archiwizacja (~80 linii)
└── schucoLoggingService.ts           # Logi i statystyki (~80 linii)
```
</details>

<details>
<summary>Pozostałe pliki...</summary>

Szczegółowe plany dla UzyteBeleParser.ts, settings/page.tsx, UzyteBeleWatcher.ts, timesheetsService.ts, GlassDeliveryMatchingService.ts, OrderRepository.ts dostępne w historii git tego pliku.
</details>

---

**Autor:** Claude (z pomocą Krzysztofa)
**Ostatnia aktualizacja:** 2026-01-20
