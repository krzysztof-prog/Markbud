# Raport Długu Technologicznego - AKROBUD

**Data:** 2026-01-15
**Autor:** Claude Opus 4.5
**Wersja:** 1.0

---

## Podsumowanie wykonawcze

Przeprowadzono kompleksową analizę projektu AKROBUD pod kątem długu technologicznego. Projekt ma **solidne fundamenty** (architektura warstwowa, money.ts, Zod walidacja), ale zawiera znaczące **naruszenia zadeklarowanych standardów**.

| Obszar | Critical | High | Medium | Low | Suma |
|--------|----------|------|--------|-----|------|
| **Backend** | 2 | 18 | 18 | 12 | **50** |
| **Frontend** | 2 | 12 | 35 | 15 | **64** |
| **Database** | 2 | 6 | 5 | 5 | **18** |
| **RAZEM** | **6** | **36** | **58** | **32** | **132** |

---

## CRITICAL (6 problemów) - Wymagają natychmiastowej uwagi

### 1. Prisma bezpośrednio w routes (zamiast Service/Repository)
**Backend** | `apps/api/src/routes/warehouse-orders.ts`, `orders.ts`, `health.ts`, `bug-reports.ts`

Bezpośrednie zapytania `prisma.findMany()` w plikach route zamiast delegacji do warstwy Service → Repository. **Łamie zadeklarowaną architekturę projektu.**

**Pliki do naprawy:**
- `apps/api/src/routes/warehouse-orders.ts:34, 73, 139` - prisma.warehouseOrder.*
- `apps/api/src/routes/orders.ts:307-320` - prisma.orderRequirement.findMany()
- `apps/api/src/routes/bug-reports.ts:191-193` - prisma.user.findUnique()
- `apps/api/src/routes/health.ts:43-46` - prisma.user.findUnique()

### 2. Brakujące `disabled={isPending}` na przyciskach mutacji
**Frontend** | `apps/web/src/app/admin/settings/page.tsx`, `apps/web/src/app/ustawienia/page.tsx`

Formularze do tworzenia/edycji Palet, Kolorów, Profili **nie blokują przycisków podczas wysyłania**. Użytkownik może kliknąć wielokrotnie i stworzyć duplikaty.

### 3. Brakujące FK constraints na polach audytu
**Database** | WarehouseOrder, WarehouseHistory, OkucOrder, OkucHistory

Pola `createdById`, `recordedById` są `Int?` (nullable) bez explicit onDelete rule. Usunięcie użytkownika może usunąć ścieżkę audytu.

---

## HIGH (36 problemów) - Do naprawy w najbliższym sprincie

### Backend (18)

| # | Problem | Lokalizacja | Opis |
|---|---------|-------------|------|
| 1 | Try-catch w handlerach | `authHandler.ts:20-50` | Powinno być w middleware |
| 2 | Logika biznesowa w routes | `orders.ts:264-299` | Mapowanie requirements w route |
| 3 | Duży plik | `palletStockService.ts` (840 linii) | Trudne w testowaniu |
| 4 | Duży plik | `UzyteBeleWatcher.ts` (790 linii) | Mieszanie odpowiedzialności |
| 5 | Duży plik | `schucoService.ts` (784 linii) | Scraping + matching + state |
| 6 | Duży plik | `timesheetsService.ts` (762 linii) | CRUD + validation + reporting |
| 7 | Duży plik | `csvImportService.ts` (714 linii) | Parsing + conflicts + import |
| 8 | Duży plik | `WarehouseRepository.ts` (714 linii) | 20+ query methods |
| 9 | parseFloat na Decimal | `WarehouseStockService.ts:65` | Błędy precyzji |
| 10 | parseFloat w parserach | `UzyteBeleParser.ts:56`, `schucoParser.ts:169` | Floating point issues |
| 11 | Brak DI | Wszystkie handlery | Services tworzone inline |
| 12 | Manualne błędy HTTP | `articleHandler.ts:52-54, 86-88` | Zamiast AppError |
| 13 | Admin check inline | `bug-reports.ts:190-200` | Powinno być middleware |
| 14 | Admin check inline | `health.ts:42-52` | Powinno być middleware |
| 15 | Prisma w handler | `mojaPracaHandler.ts:44, 57, 73` | Passes prisma instead of repo |
| 16 | Repo w handler | `articleHandler.ts:17` | Creates repo in handler |
| 17 | Query building w route | `warehouse-orders.ts:17-32` | WhereInput w route |
| 18 | Missing validation | `warehouse-orders.ts` | Manual isNaN() instead of Zod |

### Frontend (12)

| # | Problem | Lokalizacja | Opis |
|---|---------|-------------|------|
| 1 | Duży komponent | `admin/settings/page.tsx` (756 linii) | 11 useState, wszystko inline |
| 2 | Duży komponent | `ustawienia/page.tsx` (619 linii) | Duplikat admin/settings |
| 3 | Duży komponent | `ProfileDeliveryTable.tsx` (619 linii) | Drag-drop + state |
| 4 | Prop drilling | `WorkerEditPanel.tsx` | 9 useState, callbacks przez poziomy |
| 5 | Direct fetch | `admin/settings/page.tsx:220-246` | Zamiast API wrapper |
| 6 | Brak useMemo | `NewOperatorDashboard.tsx` | Kalkulacje na każdy render |
| 7 | Brak useMemo | `admin/settings/page.tsx` | 0 optymalizacji |
| 8 | Brak loading | `WarehouseStockTable.tsx` | Brak visual feedback |
| 9 | Brak lazy loading | `admin/settings/page.tsx` | 756 linii od razu |
| 10 | Duży komponent | `WorkerEditPanel.tsx` (605 linii) | 9 useState |
| 11 | Duży komponent | `ImportArticlesDialog.tsx` (568 linii) | Multi-step inline |
| 12 | Duży komponent | `OrderDetailModal.tsx` (551 linii) | Nested sections |

### Database (6)

| # | Problem | Lokalizacja | Opis |
|---|---------|-------------|------|
| 1 | Cascade delete | DeliveryOrder, DeliveryItem | Utrata danych przy usuwaniu |
| 2 | Niespójny soft delete | WarehouseStock | Brak deletedAt |
| 3 | Niespójny soft delete | WarehouseOrder | Brak deletedAt |
| 4 | Niespójny soft delete | MonthlyReport | Brak deletedAt |
| 5 | Brakujące indeksy FK | WarehouseHistory.recordedById | Wolne zapytania |
| 6 | onDelete nie zdefiniowane | OkucStock.updatedBy | Niespójne zachowanie |

---

## MEDIUM (58 problemów) - Do backlogu

### Backend (18)
- `as` type assertions po Zod parse (zbędne) - 6 miejsc
- Powtarzające się `.toFixed(2)` zamiast funkcji formatującej - 15+ miejsc
- TODO/FIXME komentarze - 9 miejsc:
  - Optimistic locking (orderService.integration.test.ts)
  - Soft delete GlassDelivery (GlassDeliveryQueryService.ts)
  - Excel import incomplete (excelImportService.ts)
  - Email sending (DeliveryNotificationService.ts)
  - Auth replacement - 5 miejsc
- Brak testów middleware (error-handler, role-check)
- Magic numbers bez komentarzy
- Large test files (>700 linii) - trudne do utrzymania

### Frontend (35)
- Dialog state rozrzucony po komponentach (5 miejsc)
- CSV generation inline zamiast utility (3 miejsca)
- Brakujące Error Boundaries na ciężkich komponentach
- Brakujące skeletony (TableSkeleton nieużywany)
- Inconsistent file organization (app/* vs features/*)
- Date formatting functions powtórzone w wielu plikach
- Type assertions missing on fetch response
- Loose typing na interfaces
- Inline type definitions zamiast shared types
- Backup files w repo (.backup) - 2 pliki
- Missing JSDoc na complex logic

### Database (5)
- Float zamiast Int dla non-currency (meters, hours) - 7 pól
- Brak createdAt na PalletAlertConfig, Setting
- Brakujące composite indexes (2)
- JSON storage zamiast proper relations (rawData, parsedData, windowsData)
- Text search optimization needed

---

## LOW (32 problemy) - Ongoing improvements

- Naming conventions inconsistencies (userId vs createdById vs recordedById)
- Tmp directories (tmpclaude-*) - do usunięcia
- Missing JSDoc comments na complex functions
- Optional chaining could be more aggressive
- Some routes use inline types without reusing validators
- Status values as scattered string literals instead of enum

---

## Quick Wins (do zrobienia w <1h)

| # | Zadanie | Czas | Priorytet |
|---|---------|------|-----------|
| 1 | Dodaj `disabled={isPending}` do przycisków w admin/settings | 5 min | CRITICAL |
| 2 | Usuń pliki .backup z repo | 2 min | LOW |
| 3 | Dodaj useMemo do kalkulacji w NewOperatorDashboard | 15 min | HIGH |
| 4 | Wydziel dialog state do hooków w DostawyPageContent | 30 min | MEDIUM |

---

## Rekomendowane fazy naprawy

### Faza 1 (Critical) - Tydzień 1
1. ✅ Przenieś Prisma z routes do Service/Repository
2. ✅ Dodaj `disabled={isPending}` do wszystkich mutation buttons
3. Napraw FK constraints w bazie (wymaga migracji)

### Faza 2 (High) - Tydzień 2-3
1. Rozbij duże pliki (>600 linii) na mniejsze
2. Wydziel logikę biznesową z routes do Services
3. Dodaj brakujące indeksy do bazy
4. Napraw cascade deletes → soft deletes
5. Dodaj role-check middleware zamiast inline checks

### Faza 3 (Medium) - Tydzień 4+
1. Przenieś app/*/components do features/
2. Dodaj Error Boundaries
3. Standaryzuj formatowanie (utilities zamiast inline)
4. Uzupełnij testy middleware
5. Resolve TODO/FIXME comments

---

## Pliki wymagające natychmiastowej uwagi

### Critical Priority:
- `apps/api/src/routes/warehouse-orders.ts` - Prisma w route
- `apps/api/src/routes/orders.ts` - Business logic w route
- `apps/api/src/routes/bug-reports.ts` - Prisma + error handling
- `apps/api/src/routes/health.ts` - Prisma w route
- `apps/web/src/app/admin/settings/page.tsx` - Missing isPending
- `apps/web/src/app/ustawienia/page.tsx` - Missing isPending

### High Priority:
- `apps/api/src/services/palletStockService.ts` - 840 linii
- `apps/api/src/handlers/authHandler.ts` - Try-catch pattern
- `apps/api/src/repositories/DeliveryRepository.ts` - 673 linii
- `apps/api/src/repositories/OrderRepository.ts` - 614 linii
- `apps/web/src/features/timesheets/components/WorkerEditPanel.tsx` - 605 linii

---

## Zgodność z COMMON_MISTAKES.md

| Zasada | Status | Komentarz |
|--------|--------|-----------|
| money.ts dla kwot | ✅ OK | Wszystkie pola monetary jako Int (grosze) |
| Soft delete | ⚠️ CZĘŚCIOWO | Niektóre modele brakuje deletedAt |
| disabled={isPending} | ❌ ŁAMANE | admin/settings, ustawienia |
| Confirmation dialog | ✅ OK | Destructive actions mają dialogi |
| No try-catch w handlerach | ❌ ŁAMANE | authHandler ma try-catch |
| Route → Handler → Service | ❌ ŁAMANE | 4 routes z Prisma inline |

---

## Metryki do śledzenia

| Metryka | Obecna wartość | Cel |
|---------|----------------|-----|
| Pliki >600 linii (backend) | 12 | <5 |
| Pliki >500 linii (frontend) | 8 | <3 |
| Routes z Prisma inline | 4 | 0 |
| Buttons bez isPending | ~20 | 0 |
| TODO/FIXME komentarzy | 9 | <3 |

---

**Następna rewizja:** 2026-02-01
