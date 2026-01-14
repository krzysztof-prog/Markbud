# Plan Refaktoryzacji MarkBud - 2026-01-14

## Executive Summary

Projekt MarkBud to monorepo (pnpm workspaces) z backendem Fastify+Prisma i frontendem Next.js 15. Analiza wykazała następujące główne obszary wymagające refaktoryzacji:

1. **Duże pliki monolityczne** - 15+ plików >500 linii (importService.ts: 1188, csv-parser.ts: 887)
2. **Naruszenia architektury** - logika biznesowa w handlerach okuc (articleHandler, stockHandler, locationHandler zamiast services)
3. **Naruszenia architektury w routes** - orders.ts ma PATCH/PDF endpoints z logiką inline zamiast przez handler/service
4. **Duplikacja kodu** - pattern try/catch w handlerach okuc, podobne struktury tabel w komponentach
5. **Monolityczny plik API** - apps/web/src/lib/api.ts (982 linii) z wszystkimi API calls
6. **Duplikacja komponentów OrderDetailModal** - w 2 lokalizacjach (features/orders i components/orders)
7. **Brak spójności w strukturze features** - niektóre mają utils/, niektóre helpers/, niektóre nic

## Current State Analysis

### Backend (apps/api/src)
- **Dobra praktyka:** Architektura Route→Handler→Service→Repository stosowana w orders, deliveries
- **Problem:** Moduł okuc nie przestrzega tej architektury - handlery mają bezpośredni dostęp do prisma
- **Największe pliki:**
  - `services/importService.ts` (1188 linii) - kandydat do podziału
  - `services/parsers/csv-parser.ts` (887 linii) - zbyt wiele odpowiedzialności
  - `services/timesheetsService.ts` (847 linii)
  - `handlers/okuc/articleHandler.ts` (729 linii) - logika powinna być w service

### Frontend (apps/web/src)
- **Dobra praktyka:** Features structure (api/, components/, hooks/)
- **Problem:** Niektóre features mają niespójne struktury
- **Największe pliki:**
  - `MagazynAkrobudPageContent.tsx` (854 linii) - zawiera 3 komponenty które powinny być oddzielne
  - `OrdersTable.tsx` (679 linii)
  - `DeliveryDialogs.tsx` (655 linii)
- **Centralny api.ts** (982 linii) - powinien być podzielony per feature

### Zidentyfikowane naruszenia zasad z COMMON_MISTAKES.md
1. **Hard delete bez soft delete** - znaleziono 30+ wywołań `.delete({...})` w repositories
2. **parseFloat na kwotach** - znaleziono użycia w currency-config.ts i productionReportHandler.ts
3. **Logika w routes** - working-days.ts ma 266 linii z logiką świąt zamiast service

---

## Identified Issues

### P0 - Krytyczne

| ID | Co | Dlaczego | Effort | Ryzyko |
|----|----|---------| ------ | ------ |
| P0-1 | parseFloat w productionReportHandler.ts:230 | Naruszenie money.ts - potencjalnie błędne obliczenia | S (1h) | High |
| P0-2 | parseFloat w currency-config.ts:191,241 | Operacje na kwotach bez money.ts | S (1h) | High |

### P1 - Wysokie

| ID | Co | Dlaczego | Effort | Ryzyko |
|----|----|---------| ------ | ------ |
| P1-1 | handlers/okuc/* mają logikę biznesową | Naruszenie architektury Route→Handler→Service | L (10h) | Medium |
| P1-2 | routes/orders.ts PATCH endpoint inline | Logika powinna być w OrderHandler/OrderService | M (3h) | Low |
| P1-3 | importService.ts (1188 linii) | God object - trudny do testowania i utrzymania | L (8h) | Medium |
| P1-4 | csv-parser.ts (887 linii) | Zbyt wiele odpowiedzialności w jednej klasie | M (6h) | Medium |
| P1-5 | working-days.ts logika świąt | Powinna być w HolidayService | M (4h) | Low |
| P1-6 | Hard delete w wielu miejscach | Brak soft delete = utrata danych | L (12h) | High |

### P2 - Normalne

| ID | Co | Dlaczego | Effort | Ryzyko |
|----|----|---------| ------ | ------ |
| P2-1 | MagazynAkrobudPageContent.tsx (854 linii) | 3 komponenty w jednym pliku - rozdzielenie | M (4h) | Low |
| P2-2 | api.ts (982 linii) | Centralny plik - podział per feature | M (5h) | Low |
| P2-3 | Duplikacja OrderDetailModal | 2 wersje tego samego komponentu | S (2h) | Low |
| P2-4 | DeliveryDialogs.tsx (655 linii) | Monolityczny plik z wieloma dialogami | M (4h) | Low |
| P2-5 | try/catch w handlerach okuc | Niepotrzebne - middleware obsługuje błędy | M (3h) | Low |
| P2-6 | Niespójne nazewnictwo helpers/utils | Standaryzacja do helpers/ | S (2h) | Low |
| P2-7 | OrdersTable.tsx (679 linii) | Rozdzielenie na mniejsze komponenty | M (5h) | Low |

---

## Proposed Refactoring Plan

### Faza 1: Naprawa krytycznych błędów (P0) - 2h

**Cel:** Naprawić naruszenia money.ts które mogą powodować błędne obliczenia finansowe.

#### 1.1 P0-1: productionReportHandler.ts
- **Plik:** `apps/api/src/handlers/productionReportHandler.ts`
- **Linia:** ~230
- **Problem:** `parseFloat(eurRateStr)`
- **Fix:** Użyj odpowiedniej funkcji konwersji z money.ts
- **Effort:** S (1h)

#### 1.2 P0-2: currency-config.ts
- **Plik:** `apps/web/src/lib/currency-config.ts`
- **Linie:** 191, 241
- **Problem:** `parseFloat(pln.toFixed(2))`
- **Fix:** Użyj `groszeToPln/plnToGrosze` z money.ts
- **Effort:** S (1h)

---

### Faza 2: Naprawa architektury backend (P1) - 25h

**Cel:** Przywrócić poprawną architekturę Route→Handler→Service→Repository.

#### 2.1 P1-1: Refaktoryzacja modułu okuc (10h)

**Obecny stan:**
```
handlers/okuc/articleHandler.ts (729 linii) -> prisma bezpośrednio
handlers/okuc/stockHandler.ts -> prisma bezpośrednio
handlers/okuc/locationHandler.ts -> prisma bezpośrednio
```

**Docelowy stan:**
```
handlers/okuc/articleHandler.ts (~150 linii) -> OkucArticleService
services/okuc/OkucArticleService.ts (nowy, ~400 linii)
services/okuc/OkucStockService.ts (nowy)
services/okuc/OkucLocationService.ts (nowy)
```

**Kroki:**
1. Stwórz `services/okuc/OkucArticleService.ts`
2. Przenieś logikę biznesową z articleHandler.ts
3. Handler tylko: walidacja → wywołaj service → zwróć response
4. Powtórz dla stockHandler i locationHandler
5. Usuń try/catch z handlerów (middleware obsłuży)

#### 2.2 P1-2: orders.ts PATCH endpoint (3h)

**Plik:** `apps/api/src/routes/orders.ts`

**Problem:** Logika PATCH inline w routes zamiast przez handler/service

**Fix:**
1. Stwórz `OrderHandler.partialUpdate()`
2. Przenieś logikę do `OrderService.partialUpdate()`
3. Routes tylko wywołuje handler

#### 2.3 P1-3: Podział importService.ts (8h)

**Obecny stan:**
```
services/importService.ts (1188 linii) - God object
```

**Docelowy stan:**
```
services/import/
├── ImportOrchestrator.ts (~300 linii) - koordynacja
├── UzyteBeleProcessor.ts (~400 linii) - logika uzyte bele
├── CenyProcessor.ts (~200 linii) - logika ceny
├── ImportValidationService.ts (~200 linii) - walidacja
└── index.ts - re-export
```

#### 2.4 P1-4: Podział csv-parser.ts (6h)

**Obecny stan:**
```
services/parsers/csv-parser.ts (887 linii)
```

**Docelowy stan:**
```
services/parsers/
├── CsvParser.ts (~200 linii) - bazowy parser
├── UzyteBeleParser.ts (~300 linii) - parse uzyte bele
├── OrderNumberParser.ts (~100 linii) - parse numery zleceń
├── ArticleNumberParser.ts (~100 linii) - parse artykuły
└── index.ts - re-export
```

#### 2.5 P1-5: HolidayService (4h)

**Obecny stan:**
```
routes/working-days.ts (266 linii) - logika świąt w routes
```

**Docelowy stan:**
```
services/HolidayService.ts (nowy, ~200 linii)
routes/working-days.ts (~50 linii) - tylko routing
```

#### 2.6 P1-6: Soft delete audit (12h - rozproszone)

**Kroki:**
1. `grep -r "\.delete\(" apps/api/src/repositories/` - znajdź wszystkie
2. Dla każdego sprawdź czy model ma `deletedAt`
3. Jeśli nie ma - dodaj migrację
4. Zamień `delete()` na `update({ deletedAt: new Date() })`
5. Zaktualizuj wszystkie queries o `where: { deletedAt: null }`

---

### Faza 3: Refaktoryzacja frontend (P2) - 25h

**Cel:** Poprawa czytelności i utrzymywalności komponentów.

#### 3.1 P2-1: MagazynAkrobudPageContent.tsx (4h)

**Obecny stan:**
```
MagazynAkrobudPageContent.tsx (854 linii) - 3 komponenty w jednym pliku
```

**Docelowy stan:**
```
features/warehouse/components/
├── MagazynAkrobudPageContent.tsx (~200 linii) - główna strona
├── WarehouseOrdersTable.tsx (~250 linii) - tabela zleceń
└── WarehouseStockTable.tsx (~400 linii) - tabela magazynu
```

#### 3.2 P2-2: Podział api.ts (5h)

**Obecny stan:**
```
lib/api.ts (982 linii) - wszystkie API calls w jednym pliku
```

**Docelowy stan:**
```
lib/api/
├── index.ts - re-export
├── orders.ts
├── deliveries.ts
├── warehouse.ts
├── settings.ts
├── schuco.ts
├── pallets.ts
└── monthly-reports.ts
```

#### 3.3 P2-3: Deduplikacja OrderDetailModal (2h)

**Problem:** 2 wersje tego samego komponentu:
- `features/orders/components/OrderDetailModal.tsx`
- `components/orders/order-detail-modal.tsx`

**Fix:**
1. Zachowaj `features/orders/components/OrderDetailModal.tsx`
2. Usuń `components/orders/order-detail-modal.tsx`
3. Zaktualizuj wszystkie importy

#### 3.4 P2-4: DeliveryDialogs.tsx (4h)

**Obecny stan:**
```
DeliveryDialogs.tsx (655 linii) - wszystkie dialogi w jednym pliku
```

**Docelowy stan:**
```
features/deliveries/components/dialogs/
├── CreateDeliveryDialog.tsx
├── EditDeliveryDialog.tsx
├── DeleteDeliveryConfirmDialog.tsx
├── MoveOrderDialog.tsx
└── index.ts - re-export
```

#### 3.5 P2-5: Usunięcie try/catch z okuc handlers (3h)

**Warunek:** Po przeniesieniu logiki do services (P1-1)

**Fix:** Usuń wszystkie try/catch z handlerów okuc - middleware złapie błędy automatycznie

#### 3.6 P2-6: Standaryzacja helpers/utils (2h)

**Zasada:** features/* używa `helpers/` (nie `utils/`)

**Kroki:**
1. Znajdź wszystkie `utils/` w features/
2. Przenieś do `helpers/`
3. Zaktualizuj importy

#### 3.7 P2-7: OrdersTable.tsx (5h)

**Obecny stan:**
```
OrdersTable.tsx (679 linii)
```

**Docelowy stan:**
```
features/orders/components/
├── OrdersTable.tsx (~300 linii) - główna tabela
├── OrderTableRow.tsx (~150 linii) - wiersz tabeli
├── OrderTableFilters.tsx (~150 linii) - filtry
└── OrderTableActions.tsx (~100 linii) - akcje
```

---

### Faza 4: Testy i dokumentacja - 10h

#### 4.1 Testy jednostkowe dla nowych services (6h)

Stwórz testy dla:
- `OkucArticleService.test.ts`
- `OkucStockService.test.ts`
- `HolidayService.test.ts`
- `ImportOrchestrator.test.ts`

#### 4.2 Aktualizacja dokumentacji (4h)

- `ARCHITECTURE.md` - dodaj nowe services
- `docs/features/okuc.md` - architektura modułu
- `COMMON_MISTAKES.md` - nowe zasady (jeśli odkryte)

---

## Risk Assessment

| Ryzyko | Prawdop. | Wpływ | Mitygacja |
|--------|----------|-------|-----------|
| Regresja w module okuc | Medium | High | Kompleksowe testy przed i po |
| Złamanie importów | Low | Medium | Aktualizacja wszystkich importów + grep |
| Wydłużenie czasu | Medium | Low | Fazy niezależne - można przerwać |
| Konflikty przy merge | Low | Low | Mniejsze PR-y, częste merge |

---

## Testing Strategy

### Przed refaktoryzacją:
1. Snapshot testów dla każdego modułu
2. Manual test critical paths (import, delivery, orders)
3. Lista wszystkich importów modyfikowanych plików

### W trakcie:
1. Testy jednostkowe dla nowych services
2. Integration tests dla zmienionych endpoints
3. Sprawdzenie każdego PR przez manual test

### Po refaktoryzacji:
1. Full regression test
2. Performance test (czy nie wolniejsze)
3. Code review przez użytkownika

---

## Success Metrics

| Metryka | Przed | Cel |
|---------|-------|-----|
| Max file size (LOC) | 1188 | <500 |
| Files >500 LOC | 15 | 5 |
| okuc handlers with prisma | 5 | 0 |
| parseFloat on money | 3 | 0 |
| Hard delete without soft delete | 30+ | 0 |
| Duplicated components | 2 | 0 |
| Test coverage backend | ~30% | 50% |

---

## Timeline Summary

| Faza | Effort | Priorytet |
|------|--------|-----------|
| Faza 1: P0 - Krytyczne błędy | 2h | Natychmiast |
| Faza 2: P1 - Architektura backend | 25h | Tydzień 1-2 |
| Faza 3: P2 - Frontend | 25h | Tydzień 2-3 |
| Faza 4: Testy i dokumentacja | 10h | Tydzień 3-4 |
| **Total** | **62h** | **4 tygodnie** |

---

## Critical Files Reference

Lista najważniejszych plików dla realizacji tego planu:

### Backend - do refaktoryzacji:
1. `apps/api/src/handlers/okuc/articleHandler.ts` (729 linii)
2. `apps/api/src/services/importService.ts` (1188 linii)
3. `apps/api/src/services/parsers/csv-parser.ts` (887 linii)
4. `apps/api/src/routes/working-days.ts` (266 linii)
5. `apps/api/src/handlers/productionReportHandler.ts` (P0 - parseFloat)

### Frontend - do refaktoryzacji:
1. `apps/web/src/lib/api.ts` (982 linii)
2. `apps/web/src/features/warehouse/components/MagazynAkrobudPageContent.tsx` (854 linii)
3. `apps/web/src/features/orders/components/OrdersTable.tsx` (679 linii)
4. `apps/web/src/features/deliveries/components/DeliveryDialogs.tsx` (655 linii)
5. `apps/web/src/lib/currency-config.ts` (P0 - parseFloat)

---

**Wersja:** 1.0
**Data utworzenia:** 2026-01-14
**Autor:** Claude (Plan Agent)
