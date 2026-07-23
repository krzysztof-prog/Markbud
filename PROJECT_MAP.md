# AKROBUD - Mapa Projektu

> Dokument referencyjny do szybkiego zorientowania się gdzie co jest.
> Ostatnia aktualizacja: 2026-02-24

---

## Spis treści

1. [Architektura i tech stack](#architektura-i-tech-stack)
2. [Struktura katalogów](#struktura-katalogów)
3. [Backend API](#backend-api)
   - [Routes (endpointy)](#routes-endpointy)
   - [Handlers](#handlers)
   - [Services](#services)
   - [Repositories](#repositories)
   - [Validators (Zod)](#validators-zod)
   - [Middleware](#middleware)
   - [Plugins](#plugins)
   - [Utils](#utils)
4. [Frontend Web](#frontend-web)
   - [Strony (App Router)](#strony-app-router)
   - [Features](#features)
   - [Komponenty UI (Shadcn)](#komponenty-ui-shadcn)
   - [Hooki współdzielone](#hooki-współdzielone)
   - [Lib / API Client](#lib--api-client)
5. [Baza danych (Prisma)](#baza-danych-prisma)
   - [Modele](#modele)
   - [Enumy](#enumy)
   - [Kluczowe relacje](#kluczowe-relacje)
6. [Shared Package](#shared-package)
7. [Schedulery (Cron jobs)](#schedulery-cron-jobs)
8. [Skrypty pomocnicze](#skrypty-pomocnicze)
9. [Zależności (Handler → Service → Repository)](#zależności-handler--service--repository)
10. [Zależności cross-service](#zależności-cross-service)
11. [Zależności @markbud/shared](#zależności-markbudshared)
12. [Frontend → Backend endpoint mapping](#frontend--backend-endpoint-mapping)

> **Powiązany dokument:** [FUNCTION_INDEX.md](FUNCTION_INDEX.md) - Kompletny indeks eksportowanych funkcji z numerami linii

---

## Architektura i tech stack

| Warstwa | Technologia |
|---------|-------------|
| Backend | Fastify 4.x, TypeScript, Prisma 5.x, SQLite |
| Frontend | Next.js 15, React 19, TailwindCSS, Shadcn/ui, React Query v5 |
| Monorepo | pnpm workspaces + Turbo |
| Testy | Vitest, Playwright (e2e) |
| Walidacja | Zod (backend + frontend) |
| Tooling | ESLint, Prettier, Husky, PM2 (prod) |

**Request flow:** `Route → Handler → Service → Repository → Prisma → SQLite`

**Porty:** Dev: frontend 3000, backend 3001 | Prod: frontend 5001, backend 5000

---

## Struktura katalogów

```
AKROBUD/
├── apps/
│   ├── api/                    # Backend Fastify
│   │   ├── src/
│   │   │   ├── handlers/       # HTTP handlers
│   │   │   ├── services/       # Logika biznesowa
│   │   │   ├── repositories/   # Warstwa bazy danych
│   │   │   ├── routes/         # Definicje endpointów
│   │   │   ├── validators/     # Schematy Zod
│   │   │   ├── middleware/     # Auth, error handler, logging
│   │   │   ├── plugins/        # Swagger, WebSocket
│   │   │   ├── utils/          # money.ts, errors, jwt, logger
│   │   │   ├── types/          # Typy TypeScript
│   │   │   ├── config/         # Konfiguracja
│   │   │   └── index.ts        # Entry point serwera
│   │   └── prisma/
│   │       ├── schema.prisma   # Schemat bazy (~87 modeli)
│   │       ├── migrations/     # Migracje
│   │       └── seed*.ts        # Seedy
│   │
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/            # Strony (App Router)
│           ├── features/       # 25+ modułów feature-based
│           ├── components/ui/  # Komponenty Shadcn
│           ├── hooks/          # Współdzielone hooki
│           ├── lib/            # API client, utils
│           ├── types/          # Współdzielone typy
│           └── middleware.ts   # Auth + RBAC
│
├── packages/shared/            # Współdzielone typy i utils
├── docs/                       # Dokumentacja
├── scripts/                    # Skrypty pomocnicze (40+)
├── CLAUDE.md                   # Kontekst dla Claude
├── COMMON_MISTAKES.md          # Anty-patterny
└── ARCHITECTURE.md             # Architektura
```

---

## Backend API

### Routes (endpointy)

Lokalizacja: `apps/api/src/routes/`

#### Autoryzacja (`auth.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/api/auth/login` | Logowanie użytkownika |
| POST | `/api/auth/logout` | Wylogowanie |
| GET | `/api/auth/me` | Aktualny użytkownik |

#### Zlecenia (`orders.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/orders` | Lista zleceń (filtry: status, archived, colorId) |
| GET | `/api/orders/search?q=...` | Wyszukiwanie zleceń |
| GET | `/api/orders/completeness-stats` | Statystyki kompletności |
| GET | `/api/orders/:id` | Szczegóły zlecenia |
| GET | `/api/orders/by-number/:orderNumber` | Zlecenie po numerze |
| POST | `/api/orders` | Nowe zlecenie |
| PUT | `/api/orders/:id` | Aktualizacja zlecenia |
| DELETE | `/api/orders/:id` | Soft delete |
| POST | `/api/orders/:id/archive` | Archiwizuj |
| POST | `/api/orders/:id/unarchive` | Przywróć z archiwum |
| PATCH | `/api/orders/:id/manual-status` | Status manualny (do_not_cut, cancelled, on_hold, complaint, service) |
| PATCH | `/api/orders/:id/special-type` | Typ specjalny (drzwi, psk, hs, ksztalt) |
| POST | `/api/orders/bulk-update-status` | Masowa zmiana statusu |
| POST | `/api/orders/revert-production` | Cofnij produkcję |
| GET | `/api/orders/for-production` | Zlecenia do produkcji |
| GET | `/api/orders/monthly-production` | Statystyki miesięczne |
| GET | `/api/orders/:id/pdf` | PDF zlecenia |
| GET | `/api/orders/:id/has-glass-order-txt` | Sprawdź TXT szyb |

#### Dostawy (`deliveries.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/deliveries` | Lista dostaw |
| GET | `/api/deliveries/calendar` | Kalendarz miesięczny |
| GET | `/api/deliveries/calendar-batch` | Kalendarz wielu miesięcy |
| GET | `/api/deliveries/for-date?date=...` | Dostawy na datę |
| GET | `/api/deliveries/preview-number` | Podgląd kolejnego numeru |
| GET | `/api/deliveries/readiness/batch` | Batch sprawdzenie gotowości |
| GET | `/api/deliveries/profile-requirements` | Zapotrzebowanie profili |
| GET | `/api/deliveries/stats/*` | Statystyki (windows, profiles, weekday) |
| GET | `/api/deliveries/:id` | Szczegóły dostawy |
| GET | `/api/deliveries/:id/readiness` | Status gotowości |
| POST | `/api/deliveries` | Nowa dostawa |
| PUT | `/api/deliveries/:id` | Aktualizacja dostawy |
| DELETE | `/api/deliveries/:id` | Soft delete |
| POST | `/api/deliveries/:id/orders` | Przypisz zlecenie |
| DELETE | `/api/deliveries/:id/orders/:orderId` | Odpisz zlecenie |
| PUT | `/api/deliveries/:id/orders/reorder` | Zmień kolejność |
| POST | `/api/deliveries/:id/move-order` | Przenieś do innej dostawy |
| POST | `/api/deliveries/validate-orders` | Waliduj numery zleceń |
| POST | `/api/deliveries/bulk-assign` | Masowe przypisanie |

#### Magazyn profili (`warehouse.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/warehouse` | Podsumowanie magazynu |
| GET | `/api/warehouse/color/:colorId` | Stan wg koloru |
| PUT | `/api/warehouse/stock` | Ręczna aktualizacja |
| POST | `/api/warehouse/monthly` | Inwentaryzacja miesięczna |
| POST | `/api/warehouse/rollback` | Cofnij miesiąc |
| GET | `/api/warehouse/shortages` | Braki magazynowe |
| GET | `/api/warehouse/monthly-avg` | Średnie miesięczne |
| GET | `/api/warehouse/history` | Historia zmian |
| POST | `/api/warehouse/finalize-month` | Zamknij miesiąc |

#### Zamówienia magazynowe (`warehouse-orders.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/warehouse-orders` | Lista zamówień |
| POST | `/api/warehouse-orders` | Nowe zamówienie |
| PUT | `/api/warehouse-orders/:id` | Aktualizacja |
| DELETE | `/api/warehouse-orders/:id` | Usunięcie |

#### Profile (`profiles.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/profiles` | Lista profili |
| GET | `/api/profiles/:id` | Szczegóły profilu |
| GET | `/api/profiles/by-number/:number` | Profil po numerze |
| POST | `/api/profiles` | Nowy profil |
| PUT | `/api/profiles/:id` | Aktualizacja |
| DELETE | `/api/profiles/:id` | Soft delete |

#### Kolory (`colors.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/colors` | Lista kolorów (filtr: type) |
| GET | `/api/colors/:id` | Szczegóły koloru |
| POST | `/api/colors` | Nowy kolor |
| PUT | `/api/colors/:id` | Aktualizacja |
| DELETE | `/api/colors/:id` | Soft delete |
| PUT | `/api/colors/:colorId/profiles/:profileId/visibility` | Widoczność profilu |

#### Palety (`pallets.ts`, `pallet-stock.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/pallets` | Lista palet |
| GET/POST/PUT/DELETE | `/api/pallets/:id` | CRUD palet |
| GET | `/api/pallet-stock/day/:date` | Stan palet na dzień |
| PUT | `/api/pallet-stock/day/:date` | Aktualizuj stan |
| POST | `/api/pallet-stock/day/:date/close` | Zamknij dzień |

#### Importy (`imports.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/api/imports/upload` | Upload pliku |
| GET | `/api/imports` | Lista importów |
| GET | `/api/imports/pending` | Oczekujące importy |
| GET | `/api/imports/list-folders` | Lista folderów |
| GET | `/api/imports/scan-folder` | Skanuj folder |
| POST | `/api/imports/folder` | Import folderu (batch) |
| POST | `/api/imports/archive-folder` | Archiwizuj folder |
| GET | `/api/imports/preview` | Podgląd importu |
| POST | `/api/imports/bulk` | Masowy approve/reject |
| GET | `/api/imports/:id` | Szczegóły importu |
| GET | `/api/imports/:id/preview` | Podgląd |
| POST | `/api/imports/:id/approve` | Zatwierdź |
| POST | `/api/imports/:id/reject` | Odrzuć |
| DELETE | `/api/imports/:id` | Usuń |
| GET/POST/DELETE | `/api/imports/queue/*` | Kolejka importów |

#### Dashboard (`dashboard.ts`)
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/dashboard` | Główny dashboard |
| GET | `/api/dashboard/alerts` | Alerty |
| GET | `/api/dashboard/stats/weekly` | Statystyki tygodniowe |
| GET | `/api/dashboard/stats/monthly` | Statystyki miesięczne |
| GET | `/api/dashboard/operator` | Dashboard operatora |

#### Pozostałe route files
| Plik | Opis |
|------|------|
| `glass-orders.ts` | Import/tracking zamówień szyb |
| `glass-deliveries.ts` | Dostawy szyb |
| `glass-validations.ts` | Reguły walidacji szyb |
| `label-checks.ts` | Kontrola etykiet (OCR) |
| `steel.ts` | Magazyn stali (zbrojenia) |
| `schuco.ts` | Integracja Schuco Connect |
| `timesheets.ts` | Godzinówki pracowników |
| `production-reports.ts` | Raporty produkcji |
| `production-planning.ts` | Planowanie produkcji |
| `logistics.ts` | Logistyka (parsowanie maili) |
| `moja-praca.ts` | Moja praca (panel pracownika) |
| `users.ts` | Zarządzanie użytkownikami |
| `attendance.ts` | Obecność (BZ) |
| `settings.ts` | Ustawienia aplikacji |
| `gmail.ts` | Integracja Gmail IMAP |
| `bug-reports.ts` | Zgłoszenia błędów |
| `help.ts` | Pomoc (generacja PDF) |
| `currency-config.ts` | Kursy walut |
| `monthly-reports.ts` | Zestawienia miesięczne |
| `profile-depths.ts` | Głębokości profili |
| `profile-pallet-config.ts` | Konfiguracja palet profili |
| `pending-order-price-cleanup.ts` | Czyszczenie cen |
| `akrobud-verification.ts` | Weryfikacja list Akrobud |
| `working-days.ts` | Kalendarz dni roboczych |
| `private-colors.ts` | Kolory prywatne |
| `pvc-warehouse.ts` | Magazyn PVC |
| `health.ts` | Health check (`/api/health`, `/api/ready`) |
| `okuc/articles.ts` | Artykuły okuć |
| `okuc/demand.ts` | Zapotrzebowanie okuć |
| `okuc/locations.ts` | Lokalizacje okuć |
| `okuc/orders.ts` | Zamówienia okuć |
| `okuc/proportions.ts` | Proporcje okuć |
| `okuc/replacements.ts` | Zamienniki okuć |
| `okuc/stock.ts` | Stany magazynowe okuć |

---

### Handlers

Lokalizacja: `apps/api/src/handlers/`

| Plik | Klasa/export | Kluczowe metody |
|------|-------------|-----------------|
| `authHandler.ts` | - | `loginHandler`, `logoutHandler`, `meHandler` |
| `orderHandler.ts` | OrderHandler | `getAll`, `search`, `getById`, `getByNumber`, `create`, `update`, `delete`, `archive`, `unarchive`, `getCompletenessStats` |
| `deliveryHandler.ts` | DeliveryHandler | `validateOrderNumbers`, `bulkAssignOrders`, `getDeliveriesForDate`, `previewDeliveryNumber`, `getReadiness`, `getReadinessBatch`, `getAll`, `getCalendar`, `getCalendarBatch`, `getProfileRequirements`, `getStats`, `getById`, `create`, `update`, `delete`, `assignOrder`, `unassignOrder`, `moveOrder` |
| `profileHandler.ts` | ProfileHandler | `getAll`, `getById`, `create`, `update`, `delete` |
| `colorHandler.ts` | ColorHandler | `getAll`, `getById`, `create`, `update`, `delete`, `setProfileVisibility` |
| `warehouse-handler.ts` | - | `getColorData`, `updateStock`, `monthlyUpdate`, `rollbackInventory`, `getShortages`, `getMonthlyAverage`, `getHistoryByColor`, `getAllHistory`, `finalizeMonth` |
| `warehouseOrderHandler.ts` | - | `getAll`, `create`, `update`, `delete` |
| `palletHandler.ts` | PalletHandler | `getAll`, `getById`, `create`, `update`, `delete` |
| `palletStockHandler.ts` | PalletStockHandler | `getAll`, `getByDate`, `updateByDate`, `closeDay` |
| `importHandler.ts` | ImportHandler | `upload`, `getAll`, `getPending`, `listFolders`, `scanFolder`, `importFolder`, `archiveFolder`, `deleteFolder`, `previewByFilepath`, `getById`, `getPreview`, `approve`, `reject`, `delete`, `bulkAction` |
| `dashboard-handler.ts` | - | `getDashboardData`, `getAlerts`, `getWeeklyStats`, `getMonthlyStats` |
| `userHandler.ts` | - | `listUsersHandler`, `getUserHandler`, `createUserHandler`, `updateUserHandler`, `deleteUserHandler` |
| `glass-deliveries.ts` | GlassDeliveryHandler | Import/zarządzanie dostawami szyb |
| `glass-orders.ts` | GlassOrderHandler | Tracking zamówień szyb |
| `glass-validations.ts` | GlassValidationHandler | Reguły walidacji szyb |
| `steel.ts` | SteelHandler | Zarządzanie magazynem stali |
| `schuco.ts` | SchucoHandler | Integracja Schuco Connect |
| `settings.ts` | - | Zarządzanie ustawieniami |
| `label-checks.ts` | - | Kontrola etykiet |
| `label-check.ts` | - | `getLatestForDelivery`, `getDeliverySummary` |
| `timesheets.ts` | - | Godzinówki pracowników |
| `production-reports.ts` | - | Raporty produkcji |
| `logistics.ts` | LogisticsHandler | Parsowanie maili, logistyka |
| `moja-praca.ts` | MojaPracaHandler | Konflikty i zlecenia pracownika |
| `operator-dashboard.ts` | - | Dashboard operatora |
| `product-planning.ts` | - | Planowanie produkcji |
| `bug-report.ts` | - | Zgłoszenia błędów |
| `help.ts` | - | Generacja PDF instrukcji |
| `gmail.ts` | - | Import CSV z Gmail |
| `attendance.ts` | - | Obecność pracowników |
| `color-validation.ts` | - | Walidacja kolorów |
| `akrobud-verification.ts` | AkrobudVerificationHandler | Weryfikacja list |
| `profile-depth.ts` | - | Głębokości profili |
| `profile-pallet-config.ts` | - | Konfiguracja palet |
| `pending-order-price-cleanup.ts` | - | Czyszczenie cen, status schedulera |
| `okuc/articleHandler.ts` | okucArticleHandler | Artykuły okuć |
| `okuc/demandHandler.ts` | okucDemandHandler | Zapotrzebowanie okuć |
| `okuc/locationHandler.ts` | okucLocationHandler | Lokalizacje okuć |
| `okuc/orderHandler.ts` | okucOrderHandler | Zamówienia okuć |
| `okuc/proportionHandler.ts` | okucProportionHandler | Proporcje okuć |
| `okuc/replacementHandler.ts` | replacementHandler | Zamienniki okuć |
| `okuc/stockHandler.ts` | okucStockHandler | Stany magazynowe okuć |

---

### Services

Lokalizacja: `apps/api/src/services/`

#### Core services
| Plik/katalog | Klasa | Kluczowe metody |
|-------------|-------|-----------------|
| `authService.ts` | - | `login`, `getCurrentUser`, `hashPassword` |
| `orderService.ts` | OrderService | `getAllOrders`, `searchOrders`, `getOrderById`, `getOrderByNumber`, `createOrder`, `updateOrder`, `deleteOrder`, `archiveOrder`, `unarchiveOrder`, `applyPendingPriceIfExists`, `inheritPriceFromBaseOrder`, `getCompletenessStats` |
| `deliveryService.ts` | DeliveryService | `getDeliveriesForDate`, `getDeliveriesForMonth`, `previewDeliveryNumber`, `validateOrderNumbers`, `bulkAssignOrders`, `getDeliveryById`, `createDelivery`, `updateDelivery`, `deleteDelivery`, `assignOrderToDelivery`, `unassignOrder`, `moveOrderToDelivery`, `getReadinessStatus`, `getReadinessBatch` |
| `profileService.ts` | - | `getAllProfiles`, `getProfileById`, `createProfile`, `updateProfile`, `deleteProfile`, `getProfilesByColor`, `getProfilesByNumbers` |
| `colorService.ts` | - | `getAllColors`, `getColorById`, `createColor`, `updateColor`, `deleteColor`, `setProfileVisibility` |
| `userService.ts` | - | Zarządzanie użytkownikami |
| `settingsService.ts` | - | Ustawienia aplikacji |
| `dashboard-service.ts` | - | Główny dashboard |
| `operatorDashboardService.ts` | - | Dashboard operatora |
| `cache.ts` | - | In-memory LRU cache |
| `event-emitter.ts` | - | Globalny event bus |

#### Delivery module (`delivery/`)
| Plik | Opis |
|------|------|
| `DeliveryCalendarService` | Generacja i cache kalendarza |
| `DeliveryEventEmitter` | Emisja eventów zmian |
| `DeliveryNotificationService` | Powiadomienia |
| `DeliveryNumberGenerator` | Generator numerów dostaw |
| `DeliveryOptimizationService` | Optymalizacja układu palet |
| `DeliveryOrderService` | Relacje zamówienie-dostawa |
| `DeliveryStatisticsService` | Obliczanie statystyk |
| `QuickDeliveryService` | Szybkie tworzenie dostawy |

#### Warehouse module (`warehouse/`)
| Plik | Opis |
|------|------|
| `WarehouseInventoryService` | Zarządzanie inwentarzem |
| `WarehouseOrderService` | Zamówienia magazynowe |
| `WarehouseRwService` | Operacje R/W (transakcyjne) |
| `WarehouseShortageService` | Wykrywanie braków |
| `WarehouseStockService` | Zapytania stanów |
| `WarehouseUsageService` | Śledzenie zużycia |

#### Import module (`import/`)
| Plik | Opis |
|------|------|
| `ImportOrchestrator` | Orkiestracja procesu importu |
| `ImportQueueService` | Kolejka importów (background) |
| `ImportWebSocketBridge` | Streaming eventów przez WS |
| `MatchingQueueService` | Kolejka matchowania |
| `CenyProcessor` | Procesor plików cenowych |
| `UzyteBeleProcessor` | Procesor plików użytych beli |
| `importConflictService` | Zarządzanie konfliktami |
| `importFileSystemService` | Operacje I/O plików |
| `importSettingsService` | Konfiguracja importu |
| `importTransactionService` | Import transakcyjny |
| `importValidationService` | Walidacja danych |
| `csvImportService`, `excelImportService`, `pdfImportService` | Parsery formatów |

#### Readiness module (`readiness/`)
| Plik | Opis |
|------|------|
| `DeliveryReadinessAggregator` | Agregacja statusu gotowości |
| Moduły: | DeliveryDateMismatch, GlassDelivery, LabelCheck, MailCompleteness, MissingDeliveryDate, OkucDelivery, OrdersCompleted, PalletValidation |

#### Glass module
| Plik | Opis |
|------|------|
| `GlassDeliveryService` | Zarządzanie dostawami szyb |
| `GlassOrderService` | Zamówienia szyb |
| `GlassValidationService` | Walidacja szyb |
| `glassDelivery/` | GlassDeliveryImportService, GlassDeliveryMatchingService, GlassDeliveryQueryService |

#### Pallet module
| Plik | Opis |
|------|------|
| `palletStockService` | Zarządzanie stanami palet |
| `palletValidationService` | Walidacja ograniczeń palet |
| `pallet-optimizer/` | PalletOptimizerService, PdfExportService |

#### OKUC module (`okuc/`)
| Plik | Opis |
|------|------|
| `OkucArticleService` | Artykuły okuć |
| `OkucLocationService` | Lokalizacje |
| `OkucOrderImportService` | Import zamówień |
| `OkucRwService` | Operacje R/W |
| `OkucStockService` | Stany magazynowe |
| `ArticleReplacementService` | Zamienniki |

#### Specialty services
| Plik | Opis |
|------|------|
| `steelService` | Magazyn stali |
| `SteelRwService` | Operacje R/W stali |
| `schuco/` | schucoScraper, schucoScheduler, schucoParser |
| `label-check/` | LabelCheckService, OCR, Export |
| `logisticsService` | Logistyka dostaw |
| `timesheetsService` | Godzinówki |
| `productionReportService` | Raporty produkcji |
| `productionPlanningService` | Planowanie produkcji |
| `bugReportService` | Zgłoszenia błędów |
| `mojaPracaService` | Panel pracownika |
| `attendanceService` | Obecność |
| `monthlyReportService` | Zestawienia miesięczne |
| `currencyConfigService` | Kursy walut |
| `HolidayService` | Kalendarz świąt |
| `CalendarService` | Utilities kalendarza |
| `gmail/` | GmailFetcher, GmailScheduler |
| `help/` | Generacja PDF instrukcji |
| `akrobud-verification/` | Weryfikacja list Akrobud |
| `file-watcher/` | Monitoring folderów importu |
| `parsers/` | Parsery (article number, order number, CSV, PDF, TXT) |

---

### Repositories

Lokalizacja: `apps/api/src/repositories/`

| Plik | Klasa | Obsługuje model |
|------|-------|----------------|
| `OrderRepository` | OrderRepository | Order |
| `DeliveryRepository` | DeliveryRepository | Delivery, DeliveryOrder |
| `ProfileRepository` | ProfileRepository | Profile |
| `ColorRepository` | ColorRepository | Color, ProfileColor |
| `WarehouseRepository` | WarehouseRepository | WarehouseStock, WarehouseHistory |
| `ImportRepository` | ImportRepository | FileImport |
| `PalletRepository` | PalletRepository | PalletType, PalletOptimization |
| `PalletStockRepository` | PalletStockRepository | PalletStockDay, PalletStockEntry |
| `ProfileDepthRepository` | ProfileDepthRepository | ProfileDepth |
| `ProfilePalletConfigRepository` | ProfilePalletConfigRepository | ProfilePalletConfig |
| `LabelCheckRepository` | LabelCheckRepository | LabelCheck, LabelCheckResult |
| `DeliveryReadinessRepository` | DeliveryReadinessRepository | DeliveryReadiness |
| `AkrobudVerificationRepository` | AkrobudVerificationRepository | AkrobudVerification* |
| `BugReportRepository` | BugReportRepository | BugReport |
| `DashboardRepository` | DashboardRepository | Agregowane dane |
| `LogisticsRepository` | LogisticsRepository | LogisticsMailList, LogisticsMailItem |
| `MojaPracaRepository` | MojaPracaRepository | Order (widok pracownika) |
| `OperatorDashboardRepository` | OperatorDashboardRepository | Agregowane dane |
| `PalletOptimizerRepository` | PalletOptimizerRepository | PalletOptimization, OptimizedPallet |
| `PendingOrderPriceRepository` | PendingOrderPriceRepository | PendingOrderPrice |
| `ProductionReportRepository` | ProductionReportRepository | ProductionReport, ProductionReportItem |
| `SettingsRepository` | SettingsRepository | Setting |
| `SteelRepository` | SteelRepository | Steel, SteelStock, SteelOrder, SteelHistory |
| `okuc/OkucArticleRepository` | - | OkucArticle |
| `okuc/OkucDemandRepository` | - | OkucDemand |
| `okuc/OkucOrderRepository` | - | OkucOrder, OkucOrderItem |
| `okuc/OkucProportionRepository` | - | OkucProportion |
| `okuc/OkucStockRepository` | - | OkucStock |

---

### Validators (Zod)

Lokalizacja: `apps/api/src/validators/`

| Plik | Kluczowe schematy |
|------|------------------|
| `auth.ts` | `userRoleSchema`, `loginSchema`, `loginResponseSchema` |
| `order.ts` | `createOrderSchema`, `updateOrderSchema`, `patchOrderSchema`, `manualStatusSchema`, `specialTypeSchema` |
| `delivery.ts` | `createDeliverySchema`, `updateDeliverySchema`, `assignOrderSchema` |
| `profile.ts` | `createProfileSchema`, `updateProfileSchema` |
| `color.ts` | `createColorSchema`, `updateColorSchema` |
| `common.ts` | `idParamsSchema`, `paginationQuerySchema`, `optionalDateSchema` |
| `warehouse.ts` | `updateStockSchema` |
| `pallet.ts` | `createPalletSchema`, `updatePalletSchema` |
| `pallet-stock.ts` | Schematy stanów palet |
| `import.ts` | `importApproveSchema`, `importBulkSchema` |
| `label-check.ts` | `createLabelCheckSchema`, `resolveLabelCheckSchema` |
| `logistics.ts` | `parseEmailSchema`, `saveMailListSchema` |
| `glass.ts` | Schematy zamówień/dostaw szyb |
| `glass-validations.ts` | Reguły walidacji szyb |
| `okuc.ts` | Operacje okuć |
| `okuc-location.ts` | Lokalizacje okuć |
| `settings.ts` | Aktualizacja ustawień |
| `dashboard.ts` | Zapytania dashboard |
| `timesheets.ts` | Wpisy godzinówek |
| `steel.ts` | Magazyn stali |
| `schuco.ts` | Integracja Schuco |
| `moja-praca.ts` | Panel pracownika |
| `warehouse-orders.ts` | Zamówienia magazynowe |
| `currencyConfig.ts` | Konfiguracja walut |
| `bugReport.ts` | Zgłoszenia błędów |
| `akrobud-verification.ts` | Weryfikacja |
| `profileDepth.ts` | Głębokości profili |
| `profilePalletConfig.ts` | Konfiguracja palet |
| `productionPlanning.ts` | Planowanie produkcji |
| `production-reports.ts` | Raporty produkcji |
| `operator-dashboard.ts` | Dashboard operatora |

---

### Middleware

Lokalizacja: `apps/api/src/middleware/`

| Plik | Eksport | Opis |
|------|---------|------|
| `auth.ts` | `verifyAuth`, `withAuth` | Walidacja JWT, dołączenie usera do request |
| `error-handler.ts` | `setupErrorHandler` | Globalny error handler (Zod 400, Prisma P2002/P2025 itp., AppError, 500) |
| `request-logger.ts` | `setupRequestLogging` | Logowanie request/response (onRequest, onResponse, onError) |
| `role-check.ts` | `requireUserManagement`, `requireManagerAccess`, `requireAdmin`, `requirePermission` | RBAC: owner > admin > kierownik > ksiegowa > user |

---

### Plugins

Lokalizacja: `apps/api/src/plugins/`

| Plik | Opis |
|------|------|
| `swagger.ts` | OpenAPI/Swagger UI na `/api/docs` |
| `websocket.ts` | WebSocket na `/ws` - auth JWT, rate limiting (100 msg/min), heartbeat, max 100 połączeń |

---

### Utils

Lokalizacja: `apps/api/src/utils/`

| Plik | Eksporty | Opis |
|------|----------|------|
| **`money.ts`** | `groszeToPln`, `plnToGrosze` | **KRYTYCZNE** - wszystkie operacje pieniężne |
| `errors.ts` | `AppError`, `ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError` | Klasy błędów (400-500) |
| `jwt.ts` | `generateToken`, `extractToken`, `decodeToken`, `decodeTokenWithError` | Zarządzanie tokenami JWT |
| `logger.ts` | `logger` | Winston: info, warn, error, debug |
| `config.ts` | `config` | Konfiguracja env (port, host, cors, isDev) |
| `prisma.ts` | `prisma`, `initializeSQLiteOptimizations` | Klient Prisma, WAL mode |
| `date-helpers.ts` | `isWorkingDay`, `getNextWorkingDay`, `addWorkingDays`, `getWorkingDaysInRange`, `formatDatePL`, `parseDateString`, `getWeekNumber` | Operacje na datach |
| `order-status-machine.ts` | `validateStatusTransition`, `ORDER_STATUSES`, `DELIVERY_STATUSES` | Maszyna stanów zleceń |
| `delivery-status-machine.ts` | - | Maszyna stanów dostaw |
| `validation.ts` | `validateEmail`, `validatePhoneNumber`, `validatePLN` | Walidacja danych |
| `file-validation.ts` | `validateFileType`, `validateFileSize`, `validateCsvFile`, `validateExcelFile`, `validatePdfFile` | Walidacja plików |
| `warehouse-validation.ts` | `validateSufficientStock`, `validateWarehouseOperation` | Walidacja magazynu |
| `warehouse-utils.ts` | `calculateInventoryValue`, `getMonthlyConsumption`, `predictShortage` | Narzędzia magazynowe |
| `optimistic-locking.ts` | - | Optimistic concurrency control |
| `transaction.ts` | `withTransaction` | Helper transakcji DB |
| `safe-transaction.ts` | - | Bezpieczne transakcje z rollback |
| `prisma-selects.ts` | - | Predefiniowane Prisma select (optymalizacja) |
| `string-utils.ts` | `slugify`, `trimWhitespace`, `capitalizeFirst` | Operacje na stringach |
| `eager-import.ts` | `preloadHeavyModules` | Preload exceljs, pdfkit |
| `healthChecks.ts` | `checkDatabaseHealth`, `checkFileSystemHealth`, `checkMemoryUsage` | Health checks |
| `zod-openapi.ts` | - | Konwersja Zod → OpenAPI |

---

## Frontend Web

### Strony (App Router)

Lokalizacja: `apps/web/src/app/`

| Ścieżka URL | Opis | Role |
|-------------|------|------|
| `/login` | Logowanie | Publiczna |
| `/` | Dashboard (admin) / redirect do /moja-praca | Admin/Owner |
| `/operator` | Dashboard operatora | Admin/Owner |
| `/moja-praca` | Panel pracownika | Wszyscy |
| `/kierownik` | Panel kierownika | Owner/Admin/Kierownik |
| `/dostawy` | Lista dostaw | Wszyscy |
| `/dostawy/weryfikacja` | Weryfikacja dostaw | - |
| `/dostawy/[id]/optymalizacja` | Optymalizacja palet | - |
| `/dostawy-szyb` | Dostawy szyb | - |
| `/zamowienia-szyb` | Zamówienia szyb | - |
| `/magazyn/akrobud` | Magazyn AKROBUD | - |
| `/magazyn/akrobud/profile-na-dostawy` | Profile na dostawy | - |
| `/magazyn/akrobud/remanent` | Remanent AKROBUD | - |
| `/magazyn/okuc` | Magazyn okuć | - |
| `/magazyn/okuc/artykuly` | Artykuły okuć | - |
| `/magazyn/okuc/stan` | Stany okuć | - |
| `/magazyn/okuc/zamowienia` | Zamówienia okuć | - |
| `/magazyn/okuc/zapotrzebowanie` | Zapotrzebowanie okuć | - |
| `/magazyn/okuc/rw` | RW okuć | - |
| `/magazyn/okuc/zastepstwa` | Zamienniki okuć | - |
| `/magazyn/okuc/remanent` | Remanent okuć | - |
| `/magazyn/pvc` | Magazyn PVC | - |
| `/magazyn/pvc/remanent` | Remanent PVC | - |
| `/magazyn/pvc/zapotrzebowanie` | Zapotrzebowanie PVC | - |
| `/magazyn/schuco` | Dostawy Schuco | - |
| `/magazyn/stal` | Magazyn stali | - |
| `/szyby` | Szyby (zamówienia/dostawy) | - |
| `/logistyka` | Dashboard logistyki | - |
| `/logistyka/[deliveryCode]` | Szczegóły dostawy | - |
| `/importy` | Zarządzanie importami | Admin/Owner |
| `/kontrola-etykiet` | Kontrola etykiet | - |
| `/kontrola-etykiet/[id]` | Szczegóły kontroli | - |
| `/zestawienia` | Zestawienia (home) | - |
| `/zestawienia/zlecenia` | Zestawienie zleceń | Owner/Admin/Kierownik/User |
| `/zestawienia/miesieczne` | Zestawienie miesięczne | - |
| `/zestawienia/do-sprawdzenia` | Do sprawdzenia | - |
| `/zestawienia/archiwum` | Archiwum zestawień | - |
| `/planowanie-produkcji` | Planowanie produkcji | - |
| `/archiwum` | Archiwum zleceń | - |
| `/ustawienia` | Ustawienia globalne | - |
| `/admin` | Panel admina | Owner/Admin |
| `/admin/users` | Zarządzanie użytkownikami | Owner/Admin |
| `/admin/settings` | Ustawienia admina | Owner/Admin |
| `/admin/pending-prices` | Oczekujące ceny | Owner/Admin |
| `/admin/private-colors` | Kolory prywatne | Owner/Admin |
| `/admin/health` | Health systemu | Owner/Admin |
| `/admin/bug-reports` | Zgłoszenia błędów | Owner/Admin |

---

### Features

Lokalizacja: `apps/web/src/features/`

Każdy feature ma strukturę: `api/`, `components/`, `hooks/`, `types/`

| Feature | Katalog | Opis | Kluczowe komponenty/hooki |
|---------|---------|------|--------------------------|
| **Admin** | `admin/` | Panel administracyjny | `UsersList`, `UserFormDialog` |
| **Auth** | `auth/` | Autoryzacja | `LoginForm`, `UserMenu`, `useAuth()`, `AuthProvider` |
| **Dashboard** | `dashboard/` | Dashboardy | `DashboardContent`, `NewOperatorDashboard`, `useDashboard()`, `useOperatorDashboard()` |
| **Deliveries** | `deliveries/` | Zarządzanie dostawami | `useDeliveriesCalendar()`, `useDeliveryMutations()`, `useDownloadDeliveryProtocol()` |
| **Orders** | `orders/` | Zarządzanie zleceniami | `ordersApi`, hooki zamówień |
| **Warehouse** | `warehouse/` | Magazyn profili | `ColorSidebar`, `WarehouseHistory`, `useWarehouseData()`, `useFinalizeMonth()` |
| **Glass** | `glass/` | Szyby (zamówienia/dostawy) | `GlassOrdersTable`, `GlassDeliveriesTable`, `GlassValidationPanel`, `useGlassOrders()` |
| **Imports** | `imports/` | System importów | `importsApi`, `useImports()` |
| **Logistics** | `logistics/` | Logistyka (maile) | Parsowanie maili, wersjonowanie list |
| **Attendance** | `attendance/` | Obecność (BZ) | `useMonthlyAttendance()`, `useUpdateDay()` |
| **OKUC** | `okuc/` | Okucia (DualStock) | PVC/ALU, 3 podmagazyny |
| **Label Checks** | `label-checks/` | Kontrola etykiet OCR | `LabelStatusBadge`, `CheckLabelsButton`, `LabelCheckResultsTable` |
| **Private Colors** | `private-colors/` | Kolory prywatne | `PrivateColorsList`, `usePrivateColors()` |
| **PVC Warehouse** | `pvc-warehouse/` | Magazyn PVC | `SystemFilters`, `PvcStockTable`, `PvcDemandTable`, `usePvcStock()` |
| **Steel** | `steel/` | Magazyn stali | Komponenty stali |
| **Schuco** | `schuco/` | Integracja Schuco | `DeliveryListTab`, `FetchLogsTab`, `useSchucoData()`, `useSchucoRealtimeProgress()` |
| **Pallets** | `pallets/` | Zarządzanie paletami | `palletsApi`, `usePalletOptimization()`, visualization helpers |
| **Production Planning** | `production-planning/` | Planowanie produkcji | API, hooks, components |
| **Production Reports** | `production-reports/` | Raporty produkcji | `ProductionReportPage`, `productionReportsApi` |
| **Timesheets** | `timesheets/` | Godzinówki | `CalendarView`, `DayView`, `WorkerRow`, `WorkersManagement`, `PositionsManagement` |
| **Weather** | `weather/` | Widget pogody | `WeatherWidget`, `useWeather()` |
| **Moja Praca** | `moja-praca/` | Panel pracownika | Konflikty import/zamówienia/dostawy |
| **Manager** | `manager/` | Panel kierownika | `AddToProductionTab`, `CompleteOrdersTab`, `TimeTrackerTab`, `PalletsTab`, `BZTab` |
| **Akrobud Verification** | `akrobud-verification/` | Weryfikacja list | API, hooks, components |
| **Settings** | `settings/` | Ustawienia | `ProfileDepthsTab`, `useSettingsMutations()` |
| **Help** | `help/` | Pomoc/instrukcje | `HELP_CONTENT_REGISTRY`, `useHelpContent()`, generacja PDF |

---

### Komponenty UI (Shadcn)

Lokalizacja: `apps/web/src/components/ui/`

| Kategoria | Komponenty |
|-----------|-----------|
| **Formularze** | `Input`, `Label`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Switch`, `Slider`, `FormField` |
| **Dialogi** | `Dialog`, `AlertDialog`, `ConfirmDialog`, `DestructiveActionDialog`, `Sheet`, `Popover`, `Tooltip` |
| **Layout** | `Card`, `Breadcrumb`, `Separator`, `Tabs`, `Collapsible`, `ScrollArea`, `ContextMenu`, `DropdownMenu`, `BackButton` |
| **Dane** | `Table`, `Progress`, `Badge`, `Skeleton`, `Calendar`, `PeriodSelector`, `EmptyState`, `ErrorUI` |
| **Powiadomienia** | `Toast`, `Toaster`, `ToastProgress`, `Alert`, `ContextualAlert`, `SyncIndicator` |
| **Specjalne** | `Button`, `SearchInput`, `LoadingOverlay`, `MobileScrollHint`, `FolderBrowser`, `VariantTypeSelectionDialog` |

---

### Hooki współdzielone

Lokalizacja: `apps/web/src/hooks/`

| Hook | Opis |
|------|------|
| `useColors()` | Kolory z cache i grupowaniem (typical/atypical) |
| `useDebounce<T>(value, delay)` | Debounce zmian wartości |
| `useRealtimeSync(options)` | WebSocket sync (invaliduje React Query) |
| `useWebSocket()` | Prosty hook WebSocket |
| `useToast()` | System powiadomień toast |
| `useFormValidation<T>(schema)` | Walidacja formularzy z Zod |
| `useDestructiveAction(config)` | Akcje destrukcyjne z potwierdzeniem |
| `useToastMutation()` | Mutacja z auto-toastem |
| `useUndoableAction()` | Akcja z możliwością cofnięcia |
| `useContextualToast()` | Context-aware toasty |
| `useWindowStats()` | Rozmiar okna i scroll |
| `useProfileStats()` | Statystyki profili |

---

### Lib / API Client

Lokalizacja: `apps/web/src/lib/`

#### Klient API (`api-client.ts`)
| Funkcja | Opis |
|---------|------|
| `fetchApi<T>(endpoint, options)` | Główny klient z auth headers i error handling |
| `uploadFile<T>(endpoint, file)` | Upload pliku (FormData) |
| `fetchBlob(endpoint)` | Download binarny (PDF, Excel) |
| `checkExists(endpoint)` | HEAD request (sprawdź istnienie) |
| `API_URL` | Base URL API |

#### Moduły API (`api/`)
| Plik | Opis |
|------|------|
| `dashboard.ts` | Dashboard API |
| `deliveries.ts` | Dostawy API |
| `orders.ts` | Zlecenia API + readiness |
| `warehouse.ts` | Magazyn (profili, zamówień, remanent, okuc) |
| `settings.ts` | Ustawienia, kolory, profile, dni robocze, waluty, stal |
| `pallets.ts` | Palety API |
| `schuco.ts` | Schuco API |
| `imports.ts` | Import API |
| `monthly-reports.ts` | Zestawienia miesięczne |
| `gmail.ts` | Gmail IMAP API |
| `users.ts` | Użytkownicy API |

#### Narzędzia
| Plik | Opis |
|------|------|
| `auth-token.ts` | `getAuthToken()`, `setAuthToken()`, `clearAuthToken()` |
| `date-utils.ts` | `formatDateWarsaw()`, `formatDateWarsawPolish()`, `getTodayWarsaw()` (Europe/Warsaw) |
| `money.ts` | Re-export z @markbud/shared: `plnToGrosze`, `groszeToPln`, `eurToCenty`, `centyToEur`, `formatGrosze`, `formatCenty` |
| `toast-helpers.ts` | `showInfoToast`, `showSuccessToast`, `showErrorToast`, `showWarningToast` |
| `utils.ts` | `cn()` (clsx + tailwind-merge), `formatDate()`, `formatCurrency()`, `formatDateShort()` |
| `design-tokens.ts` | Tokeny design systemu |
| `error-messages.ts` | User-friendly komunikaty błędów |
| `error-logger.ts` | Client-side error logging |
| `logger.ts` | Logging + WSLogger |
| `dynamic-import.tsx` | Dynamic import helper (code splitting) |

---

## Baza danych (Prisma)

Lokalizacja: `apps/api/prisma/schema.prisma`

### Modele

#### Użytkownicy i autoryzacja
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `User` | Użytkownicy systemu | id, email, name, role (owner/admin/kierownik/ksiegowa/user), passwordHash |
| `DocumentAuthorMapping` | Mapowanie autorów CSV → User | authorName, userId |
| `UserFolderSettings` | Ustawienia folderów per user | userId, importsBasePath |
| `ImportLock` | Blokada importu (race condition) | folderPath, userId, expiresAt |

#### Produkty i materiały
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `Profile` | Profile aluminiowe | number (unique), name, articleNumber, isAkrobud, isLiving, isBlok, isVlak, isCt70, isFocusing, profileType, isPalletized |
| `Color` | Kolory | code (unique), name, type, hexColor, isAkrobud, isTypical |
| `PrivateColor` | Kolory prywatne (z importów) | code (unique), name |
| `ProfileColor` | Junction Profile-Color | profileId, colorId, isVisible |
| `ProfilePalletConfig` | Konfiguracja palet profilu | profileId, beamsPerPallet |
| `ProfileDepth` | Głębokości profili | profileType, depthMm |

#### Zlecenia
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `Order` | Zlecenia produkcyjne (GŁÓWNA ENCJA) | orderNumber (unique), status, client, project, system, deadline, deliveryDate, productionDate, valuePln, valueEur, manualStatus, specialType, deletedAt |
| `OrderRequirement` | Zapotrzebowanie profili per zlecenie | orderId, profileId, colorId, beamsCount, meters, restMm, status |
| `OrderWindow` | Okna (do optymalizacji palet) | orderId, widthMm, heightMm, profileType, quantity |
| `OrderGlass` | Zapotrzebowanie szyb z CSV | orderId, widthMm, heightMm, quantity, areaSqm |
| `OrderMaterial` | BOM (kosztorys) | orderId, category (okno/montaz/dodatki/inne), netValue, totalNet |
| `OrderSchucoLink` | Link zlecenie-Schuco | orderId, schucoDeliveryId |

#### Dostawy
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `Delivery` | Dostawy/wysyłki | deliveryDate, deliveryNumber, status (planned/in_preparation/ready/shipped/delivered), deletedAt |
| `DeliveryOrder` | Junction Delivery-Order | deliveryId, orderId, position |
| `DeliveryItem` | Fizyczne pozycje dostawy | deliveryId, itemType, quantity |
| `DeliveryReadiness` | Zagregowany status gotowości | deliveryId, aggregatedStatus (ready/conditional/blocked/pending), moduleResults (JSON) |

#### Palety
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `PalletType` | Typy palet | name, lengthMm, widthMm, heightMm |
| `PalletOptimization` | Wynik optymalizacji | deliveryId, totalPallets, optimizationData (JSON), validationStatus |
| `OptimizedPallet` | Pojedyncza paleta w optymalizacji | optimizationId, palletNumber, utilizationPercent, windowsData (JSON) |
| `PalletStockDay` | Dzienny stan palet | date (unique), status (OPEN/CLOSED) |
| `PalletStockEntry` | Stan per typ palety | palletDayId, type (MALA/P2400/P3000/P3500/P4000), morningStock, used, produced |
| `PalletAlertConfig` | Progi alertów | type, criticalThreshold |
| `PalletInitialStock` | Stan początkowy | startDate, type, initialStock |
| `PackingRule` | Reguły pakowania | name, ruleConfig (JSON) |

#### Magazyn profili
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `WarehouseStock` | Bieżący stan magazynowy | profileId, colorId, currentStockBeams, initialStockBeams, version (optimistic locking) |
| `WarehouseOrder` | Zamówienia u dostawcy | profileId, colorId, orderedBeams, expectedDeliveryDate, status |
| `WarehouseHistory` | Historia zmian | profileId, colorId, calculatedStock, actualStock, difference, changeType |

#### Szyby
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `GlassDelivery` | Dostawy szyb | rackNumber, customerOrderNumber, deliveryDate |
| `GlassDeliveryItem` | Pozycje dostawy szyb | glassDeliveryId, orderNumber, widthMm, heightMm, quantity, matchStatus |
| `GlassOrder` | Zamówienia szyb | glassOrderNumber (unique), supplier, status |
| `GlassOrderItem` | Pozycje zamówienia szyb | glassOrderId, glassType, widthMm, heightMm, quantity |
| `GlassOrderValidation` | Walidacja szyb | glassOrderId, validationType, severity, expectedQuantity, orderedQuantity |
| `LooseGlass` | Szyby luźne | glassDeliveryId, widthMm, heightMm |
| `AluminumGlass` | Szyby aluminiowe | glassDeliveryId, widthMm, heightMm |
| `ReclamationGlass` | Szyby reklamacyjne | glassDeliveryId, widthMm, heightMm |

#### Schuco
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `SchucoDelivery` | Dostawy od Schuco | orderNumber (unique), shippingStatus, deliveryDate, isWarehouseItem, archivedAt |
| `SchucoOrderItem` | Pozycje zamówienia Schuco | schucoDeliveryId, articleNumber, orderedQty, shippedQty |
| `SchucoFetchLog` | Log pobierania danych | status, triggerType, recordsCount, durationMs |
| `GmailFetchLog` | Log pobierania z Gmail | messageUid, subject, attachmentName, status |

#### Weryfikacja Akrobud
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `AkrobudVerificationList` | Listy weryfikacyjne | deliveryDate, deliveryId, status (draft/verified/applied), version |
| `AkrobudVerificationItem` | Pozycje listy | listId, orderNumberInput, matchedOrderId, matchStatus |
| `VerificationItemOrder` | Junction weryfikacja-zlecenie (N:M) | itemId, orderId |

#### Okucia (DualStock)
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `OkucLocation` | Lokalizacje magazynowe | name (unique), sortOrder |
| `OkucArticle` | Artykuły okuć | articleId (unique), name, usedInPvc, usedInAlu, orderClass, sizeClass, orderUnit, priceEur, isPhaseOut, replacedByArticleId |
| `OkucArticleAlias` | Stare numery artykułów | articleId, aliasNumber (unique) |
| `OkucProportion` | Proporcje (mnożnik/podział) | sourceArticleId, targetArticleId, proportionType, ratio, splitPercent |
| `OkucStock` | Stan magazynowy okuć | articleId, warehouseType (pvc/alu), subWarehouse (production/buffer/gabaraty), currentQuantity, version |
| `OkucDemand` | Zapotrzebowanie okuć | articleId, orderId, expectedWeek, quantity, status |
| `OkucOrder` | Zamówienia okuć | orderNumber (unique), basketType, status, expectedDeliveryDate |
| `OkucOrderItem` | Pozycje zamówienia | okucOrderId, articleId, orderedQty, receivedQty |
| `OkucHistory` | Historia zmian okuć | articleId, warehouseType, eventType, previousQty, changeQty, newQty |

#### Stal
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `Steel` | Artykuły stali | number (unique), articleNumber, name |
| `SteelStock` | Stan stali | steelId (unique), currentStockBeams, version |
| `SteelOrder` | Zamówienia stali | steelId, orderedBeams, status |
| `SteelHistory` | Historia zmian stali | steelId, calculatedStock, actualStock, changeType |
| `OrderSteelRequirement` | Zapotrzebowanie stali per zlecenie | orderId, steelId, beamsCount, meters |

#### Raporty i produkcja
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `ProductionReport` | Raport miesięczny | year, month, status (open/closed), atypicalWindows/Units/Sashes/ValuePln |
| `ProductionReportItem` | Pozycje raportu | reportId, orderId, overrideWindows/Units/Sashes, rwOkucia, rwProfile, invoiceNumber |
| `MonthlyReport` | Legacy zestawienia | year, month, totalOrders/Windows/Sashes/ValuePln/ValueEur |
| `MonthlyReportItem` | Pozycje zestawienia | reportId, orderId, windowsCount, sashesCount |
| `ProductionEfficiencyConfig` | Wydajność per klient | clientType, glazingsPerHour, wingsPerHour |
| `ProductionCalendar` | Kalendarz produkcji | date (unique), dayType (working/holiday/production_saturday/custom_off) |
| `ProductionSettings` | Ustawienia produkcji | key (unique), value (JSON) |

#### Godzinówki
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `Worker` | Pracownicy | firstName, lastName, defaultPosition, isActive |
| `Position` | Stanowiska | name (unique), shortName |
| `TimeEntry` | Wpis czasu pracy | date, workerId, positionId, productiveHours, absenceType |
| `NonProductiveTaskType` | Typy zadań nieprodukcyjnych | name (unique) |
| `NonProductiveTask` | Zadania nieprodukcyjne | timeEntryId, taskTypeId, hours |
| `SpecialWorkType` | Typy prac specjalnych | name (unique), shortName |
| `SpecialWork` | Prace specjalne | timeEntryId, specialTypeId, hours |

#### Etykiety
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `LabelCheck` | Kontrola etykiet | deliveryId, deliveryDate, status (pending/completed/failed), totalOrders, okCount, mismatchCount |
| `LabelCheckResult` | Wyniki kontroli | labelCheckId, orderId, status (OK/MISMATCH/NO_FOLDER/NO_BMP/OCR_ERROR), expectedDate, detectedDate |

#### Logistyka
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `LogisticsMailList` | Listy z maili | deliveryDate, deliveryCode, version, deliveryId |
| `LogisticsMailItem` | Pozycje list | mailListId, projectNumber, requiresMesh, missingFile, orderId |
| `LogisticsDecisionLog` | Audit trail logistyki | entityType, action, metadata (JSON) |

#### Pozostałe
| Model | Opis | Kluczowe pola |
|-------|------|---------------|
| `FileImport` | Rekordy importów | filename, filepath, fileType, status, metadata (JSON) |
| `Setting` | Ustawienia key-value | key (PK), value |
| `PendingOrderPrice` | Ceny oczekujące na zlecenie | orderNumber, currency, valueNetto, status (pending/applied/expired) |
| `PendingImportConflict` | Konflikty wariantów | orderNumber, baseOrderNumber, suffix, status, resolution |
| `Note` | Notatki | orderId, content, createdById |
| `WorkingDay` | Kalendarz dni roboczych | date (unique), isWorking, isHoliday |
| `CurrencyConfig` | Historia kursów walut | eurToPlnRate, effectiveDate |

---

### Enumy

| Enum | Wartości |
|------|---------|
| **Order Status** | `new`, `in_progress`, `completed`, `archived` |
| **Delivery Status** | `planned`, `in_preparation`, `ready`, `shipped`, `delivered` |
| **Manual Status** | `do_not_cut`, `cancelled`, `on_hold`, `complaint`, `service`, `null` |
| **Special Type** | `drzwi`, `psk`, `hs`, `ksztalt`, `null` |
| **User Role** | `owner`, `admin`, `kierownik`, `ksiegowa`, `user` |
| **Profile Type** | `typical`, `atypical` |
| **Import Status** | `pending`, `processing`, `completed`, `error`, `rejected` |
| **File Type** | `uzyte_bele`, `ceny_pdf`, `dostawa_szkla`, `potwierdzenie_zamowienia` |
| **Glass Order Status** | `not_ordered`, `ordered`, `partial_delivered`, `delivered` |
| **Okuc Demand Status** | `none`, `no_okuc`, `imported`, `has_atypical`, `pending` |
| **Okuc Basket Type** | `typical_standard`, `typical_gabarat`, `atypical` |
| **Okuc Order Status** | `draft`, `pending`, `ordered`, `in_transit`, `received`, `cancelled` |
| **Warehouse Order Status** | `pending`, `received`, `cancelled` |
| **Pallet Stock Status** | `OPEN`, `CLOSED` |
| **Pallet Type** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` |
| **Readiness Status** | `ready`, `conditional`, `blocked`, `pending` |
| **Label Check Status** | `OK`, `MISMATCH`, `NO_FOLDER`, `NO_BMP`, `OCR_ERROR` |
| **Absence Type** | `SICK`, `VACATION`, `ABSENT` |
| **Day Type** | `working`, `holiday`, `production_saturday`, `custom_off` |
| **Report Status** | `open`, `closed` |

---

### Kluczowe relacje

```
Order (CENTRALNA ENCJA)
├── OrderRequirement → Profile, Color/PrivateColor
├── OrderWindow, OrderGlass, OrderMaterial
├── DeliveryOrder → Delivery
├── OkucDemand → OkucArticle
├── OrderSchucoLink → SchucoDelivery
├── OrderSteelRequirement → Steel
├── ProductionReportItem → ProductionReport
├── AkrobudVerificationItem → AkrobudVerificationList
├── LogisticsMailItem → LogisticsMailList
└── Note → User

Delivery
├── DeliveryOrder → Order (N:M)
├── PalletOptimization → OptimizedPallet
├── LabelCheck → LabelCheckResult
├── DeliveryReadiness
├── AkrobudVerificationList
└── LogisticsMailList → LogisticsMailItem

3 magazyny z analogiczną strukturą:
  Profile:  WarehouseStock / WarehouseOrder / WarehouseHistory
  Okucia:   OkucStock / OkucOrder / OkucHistory
  Stal:     SteelStock / SteelOrder / SteelHistory
```

---

## Shared Package

Lokalizacja: `packages/shared/src/`

### Typy
| Plik | Kluczowe typy |
|------|--------------|
| `types/profiles.ts` | `Profile`, `CreateProfileDto`, `UpdateProfileDto` |
| `types/colors.ts` | `Color`, `ColorType`, `ProfileColor` |
| `types/orders.ts` | `Order`, `OrderRequirement`, `OrderWindow`, `OrderRequirementTableRow` |
| `types/warehouse.ts` | `WarehouseStock`, `WarehouseOrder`, `WarehouseHistory`, `WarehouseTableRow`, `MaterialShortageAlert` |
| `types/deliveries.ts` | `Delivery`, `DeliveryOrder`, `PalletType`, `PackingRule`, `PalletOptimizationResult`, `DeliveryProtocol` |
| `types/settings.ts` | `AppSettings`, `FileImport`, `Note`, `MonthlyReport` |
| `types/user-roles.ts` | `UserRole` enum, `ROLE_PERMISSIONS`, `hasPermission()`, `canManageUsers()`, `canAccessManagerPanel()` |

### Stałe (`constants.ts`)
| Stała | Opis |
|-------|------|
| `PROFILE_NUMBERS` | `['9016', '8866', '8869', '9671', '9677', '9315']` |
| `TYPICAL_COLORS` | 12 kolorów typowych (000 biały, 050 kremowy, 730 antracyt, ...) |
| `ATYPICAL_COLORS` | 6 kolorów atypowych |
| `BEAM_LENGTH_MM` | `6000` (długość belki w mm) |
| `REST_ROUNDING_MM` | `500` (jednostka zaokrąglenia reszty) |
| `ORDER_STATUS` | `{ NEW, IN_PROGRESS, COMPLETED, ARCHIVED }` |
| `DELIVERY_STATUS` | `{ PLANNED, IN_PREPARATION, READY, SHIPPED, DELIVERED }` |
| `FILE_IMPORT_TYPE` | `{ UZYTE_BELE, CENY_PDF, DOSTAWA_SZKLA, POTWIERDZENIE_ZAMOWIENIA }` |
| `IMPORT_STATUS` | `{ PENDING, PROCESSING, COMPLETED, ERROR, REJECTED }` |

### Narzędzia pieniężne (`utils/money.ts`)
| Funkcja | Opis |
|---------|------|
| `plnToGrosze(pln)` | PLN → grosze (np. 123.45 → 12345) |
| `groszeToPln(grosze)` | grosze → PLN (np. 12345 → 123.45) |
| `eurToCenty(eur)` | EUR → centy |
| `centyToEur(centy)` | centy → EUR |
| `convertEurToPlnGrosze(centy, rate)` | Przeliczenie walut EUR→PLN |
| `convertPlnToEurCenty(grosze, rate)` | Przeliczenie walut PLN→EUR |
| `formatGrosze(grosze)` | Formatowanie: "123,45 zł" |
| `formatCenty(centy)` | Formatowanie: "123,45 €" |
| `validateMonetaryValue(value)` | Walidacja kwoty |
| `sumMonetary(...values)` | Bezpieczne sumowanie |

---

## Schedulery (Cron jobs)

Zdefiniowane w `apps/api/src/index.ts`, implementacja w `services/`

| Scheduler | Częstotliwość | Opis |
|-----------|--------------|------|
| Schuco Fetch | 3x dziennie (8:00, 12:00, 15:00) | Pobieranie danych ze Schuco Connect |
| Pending Price Cleanup | Codziennie 2:00 | Usuwanie starych oczekujących cen |
| Import Lock Cleanup | Co godzinę | Czyszczenie wygasłych blokad importu |
| Order Archive | Codziennie 2:30 | Archiwizacja starych zleceń |
| Soft Delete Cleanup | Niedziela 3:00 | Trwałe usunięcie soft-deleted rekordów |
| Delivery Alerts | Codziennie 8:00 | Alerty gotowości dostaw |
| Label Check Alerts | Codziennie 7:00 | Alerty kontroli etykiet |
| Gmail Import | Co godzinę | Import CSV z załączników Gmail |

---

## Skrypty pomocnicze

Lokalizacja: `scripts/`

Katalog zawiera 40+ skryptów `.cjs`, `.ts`, `.js` do:
- Sprawdzania spójności danych
- Naprawy danych w bazie
- Migracji danych
- Testowania integracji
- Narzędzi deweloperskich

---

## Szybki przewodnik: Gdzie szukać

| Chcesz zmienić... | Szukaj w... |
|-------------------|-------------|
| Endpoint API | `apps/api/src/routes/` |
| Logikę biznesową | `apps/api/src/services/` |
| Walidację danych | `apps/api/src/validators/` |
| Obsługę HTTP | `apps/api/src/handlers/` |
| Zapytania do bazy | `apps/api/src/repositories/` |
| Schemat bazy | `apps/api/prisma/schema.prisma` |
| Operacje pieniężne | `apps/api/src/utils/money.ts` + `packages/shared/src/utils/money.ts` |
| Stronę/widok | `apps/web/src/app/` (routing) + `apps/web/src/features/` (logika) |
| Komponent React | `apps/web/src/features/<feature>/components/` |
| Hook React Query | `apps/web/src/features/<feature>/api/` lub `hooks/` |
| Komponent UI (Button, Dialog) | `apps/web/src/components/ui/` |
| Współdzielone hooki | `apps/web/src/hooks/` |
| Klient API frontend | `apps/web/src/lib/api-client.ts` + `apps/web/src/lib/api/` |
| Autoryzację | `apps/api/src/middleware/auth.ts` + `apps/web/src/features/auth/` |
| RBAC (role) | `apps/api/src/middleware/role-check.ts` + `packages/shared/src/types/user-roles.ts` |
| Typy współdzielone | `packages/shared/src/` |
| Stałe (kolory, profile) | `packages/shared/src/constants.ts` |
| Middleware frontendu | `apps/web/src/middleware.ts` |
| Konfigurację serwera | `apps/api/src/utils/config.ts` + `apps/api/src/index.ts` |
| Scheduler/cron | `apps/api/src/services/` (szukaj *Scheduler) |
| WebSocket | `apps/api/src/plugins/websocket.ts` |
| Error handling | `apps/api/src/middleware/error-handler.ts` + `apps/api/src/utils/errors.ts` |
| Importy plików | `apps/api/src/services/import/` |
| Kontrolę etykiet (OCR) | `apps/api/src/services/label-check/` |
| Optymalizację palet | `apps/api/src/services/pallet-optimizer/` |

---

## Zależności (Handler → Service → Repository)

Każdy łańcuch pokazuje przepływ od HTTP handlera przez logikę biznesową do bazy danych.

### Zlecenia (Orders)
```
handlers/orderHandler.ts
  → services/orderService.ts (OrderService)
    → repositories/OrderRepository.ts
  → services/readinessOrchestrator.ts
  → services/event-emitter.ts (emitOrderUpdated)
```

### Dostawy (Deliveries)
```
handlers/deliveryHandler.ts
  → services/deliveryService.ts (DeliveryService)
    → repositories/DeliveryRepository.ts
    → repositories/OrderRepository.ts
    → repositories/PalletOptimizerRepository.ts
    → repositories/LabelCheckRepository.ts
  → services/delivery-protocol-service.ts (DeliveryProtocolService)
  → services/delivery/QuickDeliveryService.ts
    → repositories/DeliveryRepository.ts
```

### Profile
```
handlers/profileHandler.ts
  → services/profileService.ts (ProfileService)
    → repositories/ProfileRepository.ts
```

### Kolory
```
handlers/colorHandler.ts
  → services/colorService.ts (ColorService)
    → repositories/ColorRepository.ts
```

### Magazyn profili
```
handlers/warehouse-handler.ts
  → services/warehouse/WarehouseInventoryService.ts
  → services/warehouse/WarehouseShortageService.ts
  → services/warehouse/WarehouseStockService.ts
  → services/warehouse/WarehouseUsageService.ts
    → (wszystkie) repositories/WarehouseRepository.ts
```

### Zamówienia magazynowe
```
handlers/warehouseOrderHandler.ts
  → services/warehouse/WarehouseOrderService.ts
    → repositories/WarehouseRepository.ts
```

### Importy
```
handlers/importHandler.ts
  → services/importService.ts (ImportService)
    → services/import/ImportOrchestrator.ts
    → services/import/importConflictService.ts
    → services/import/CenyProcessor.ts
    → services/import/importTransactionService.ts
    → services/import/importValidationService.ts
      → repositories/ImportRepository.ts
```

### Szyby
```
handlers/glassDeliveryHandler.ts
  → services/glass-delivery/GlassDeliveryImportService.ts
  → services/glass-delivery/GlassDeliveryMatchingService.ts
  → services/glass-delivery/GlassDeliveryQueryService.ts

handlers/glassOrderHandler.ts
  → services/glassOrderService.ts

handlers/glassValidationHandler.ts
  → services/glassValidationService.ts
```

### Kontrola etykiet
```
handlers/labelCheckHandler.ts
  → services/label-check/LabelCheckService.ts
    → repositories/LabelCheckRepository.ts
  → services/label-check/LabelCheckExportService.ts
```

### Palety
```
handlers/palletHandler.ts
  → services/pallet-optimizer/PalletOptimizerService.ts
    → repositories/PalletOptimizerRepository.ts
  → services/pallet-optimizer/PdfExportService.ts

handlers/palletStockHandler.ts
  → services/palletStockService.ts
```

### Logistyka
```
handlers/logisticsHandler.ts
  → services/logistics/LogisticsMailService.ts
    → repositories/LogisticsRepository.ts
    → repositories/DeliveryRepository.ts
```

### Okucia (OKUC)
```
handlers/okuc/articleHandler.ts
  → services/okuc/OkucArticleService.ts
    → repositories/okuc/OkucArticleRepository.ts

handlers/okuc/stockHandler.ts
  → services/okuc/OkucStockService.ts
    → repositories/okuc/OkucStockRepository.ts

handlers/okuc/orderHandler.ts
  → repositories/okuc/OkucOrderRepository.ts (bezpośrednio!)
  → services/okuc/OkucOrderImportService.ts

handlers/okuc/demandHandler.ts
  → repositories/okuc/OkucDemandRepository.ts (bezpośrednio!)

handlers/okuc/proportionHandler.ts
  → repositories/okuc/OkucProportionRepository.ts (bezpośrednio!)

handlers/okuc/replacementHandler.ts
  → services/okuc/ArticleReplacementService.ts
    → repositories/okuc/OkucArticleRepository.ts

handlers/okuc/locationHandler.ts
  → services/okuc/OkucLocationService.ts
```

### Stal
```
handlers/steelHandler.ts
  → services/steelService.ts
    → repositories/SteelRepository.ts
```

### Schuco
```
handlers/schucoHandler.ts
  → services/schuco/schucoService.ts
  → services/schuco/schucoScraper.ts
  → services/schuco/schucoScheduler.ts
```

### Dashboard
```
handlers/dashboard-handler.ts
  → services/dashboard-service.ts (DashboardService)
    → repositories/DashboardRepository.ts

handlers/operatorDashboardHandler.ts
  → services/operatorDashboardService.ts
    → repositories/OperatorDashboardRepository.ts
```

### Raporty produkcji
```
handlers/productionReportHandler.ts
  → services/productionReportService.ts
    → repositories/ProductionReportRepository.ts
  → services/productionReportPdfService.ts
```

### Weryfikacja Akrobud
```
handlers/akrobudVerificationHandler.ts
  → services/akrobud-verification/AkrobudVerificationService.ts
    → repositories/AkrobudVerificationRepository.ts
    → repositories/DeliveryRepository.ts
```

### Moja Praca
```
handlers/mojaPracaHandler.ts
  → services/mojaPracaService.ts
    → repositories/MojaPracaRepository.ts
```

### Oczekujące ceny
```
handlers/pendingOrderPriceCleanupHandler.ts
  → services/pendingOrderPriceCleanupService.ts
    → repositories/PendingOrderPriceRepository.ts
  → services/pendingOrderPriceRematchService.ts
```

### Pozostałe (bezpośredni dostęp do repo)
```
handlers/profileDepthHandler.ts → repositories/ProfileDepthRepository.ts
handlers/profilePalletConfigHandler.ts → repositories/ProfilePalletConfigRepository.ts
```

---

## Zależności cross-service

Serwisy które importują inne serwisy:

```
DeliveryService
  → DeliveryCalendarService (cross)
  → DeliveryOrderService (cross)
  → DeliveryOptimizationService (cross)
  → DeliveryStatisticsService (cross)

DeliveryOrderService
  → OrderRepository (cross-layer)
  → PalletOptimizerRepository (cross-layer)
  → LabelCheckRepository (cross-layer)

ImportOrchestrator
  → importConflictService (cross)
  → CenyProcessor (cross)
  → importTransactionService (cross)
  → importValidationService (cross)

LogisticsMailService
  → DeliveryRepository (cross-layer)
```

---

## Zależności @markbud/shared

### Backend (apps/api)
- `services/import/CenyProcessor.ts` → `plnToGrosze`, `eurToCenty`
- `services/import/parsers/pdfImportService.ts` → `plnToGrosze`, `eurToCenty`
- `services/pendingOrderPriceRematchService.ts` → `plnToGrosze`, `eurToCenty`
- `utils/money.ts` → re-export wszystkich funkcji pieniężnych

### Frontend (apps/web)
- `middleware.ts` → `UserRole`
- `features/auth/hooks/useRoleCheck.ts` → `UserRole`, `hasPermission`
- `components/auth/RoleGate.tsx` → `UserRole`, `hasPermission`
- `components/layout/sidebar.tsx` → `UserRole`, `hasPermission`
- `lib/money.ts` → re-export wszystkich funkcji pieniężnych

---

## Frontend → Backend endpoint mapping

Pełne mapowanie które feature trafia do których endpointów API.

| Feature frontend | Endpoint backend |
|-----------------|-----------------|
| `features/admin/api` | `/api/users/*` |
| `features/auth/api` | `/auth/login`, `/auth/logout`, `/auth/me` |
| `features/orders/api` | `/api/orders/*` |
| `features/deliveries/api` | `/api/deliveries/*` |
| `features/warehouse/api` | `/api/warehouse/*` |
| `features/warehouse/remanent/api` | `/api/warehouse/remanent/*` |
| `features/glass/api` | `/api/glass-orders/*`, `/api/glass-deliveries/*` |
| `features/imports/api` | `/api/imports/*` |
| `features/okuc/api` | `/api/okuc/articles/*`, `/api/okuc/stock/*`, `/api/okuc/demand/*`, `/api/okuc/orders/*`, `/api/okuc/proportions/*`, `/api/okuc/replacements/*`, `/api/okuc/locations/*` |
| `features/schuco/api` | `/api/schuco/*` |
| `features/pallets/api` | `/api/pallets/*`, `/api/pallet-stock/*` |
| `features/label-checks/api` | `/api/label-checks/*` |
| `features/logistics/api` | `/api/logistics/*` |
| `features/timesheets/api` | `/api/timesheets/*` |
| `features/production-reports/api` | `/api/production-reports/*` |
| `features/production-planning/api` | `/api/production-planning/*` |
| `features/attendance/api` | `/attendance/*` |
| `features/moja-praca/api` | `/api/moja-praca/*` |
| `features/akrobud-verification/api` | `/api/akrobud-verification/*` |
| `features/settings/api` | `/api/colors/*`, `/api/profiles/*`, `/api/profile-depths/*`, `/api/profile-pallet-configs/*` |
| `features/dashboard/api` | `/api/dashboard/*`, `/api/dashboard/operator` |
| `features/help/api` | `/api/help/*` |
| `lib/api/gmail.ts` | `/api/gmail/*` |
| `lib/api/monthly-reports.ts` | `/api/monthly-reports/*` |

---

## Drzewa decyzyjne — gdzie szukac per modul

> **Cel:** Gdy chcesz zmienic cos w konkretnym module, ta sekcja mowi dokladnie GDZIE szukac w kodzie.
> Kolumna "Backend" = sciezka wzgledem `apps/api/src/`, kolumna "Frontend" = wzgledem `apps/web/src/`.

### 1. Orders (Zlecenia)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Liste zlecen / filtry / query | `handlers/orderHandler.ts → getAll` + `services/orderService.ts → getAllOrders` | `features/orders/components/OrdersTable.tsx` + `features/orders/components/OrdersFilterBar.tsx` + `features/orders/hooks/useOrderFilters.ts` |
| Szczegoly zlecenia (modal) | `handlers/orderHandler.ts → getById` | `features/orders/components/OrderDetailModal.tsx` |
| Tworzenie/edycje zlecenia | `handlers/orderHandler.ts → create/update/patch` + `validators/order.ts` | `features/orders/hooks/useOrderEdit.ts` |
| Status reczny (NIE CIAC, Anulowane, Wstrzymane) | `handlers/orderHandler.ts → updateManualStatus` + `services/orderService.ts → updateManualStatus` | `features/orders/components/OrderTableActions.tsx` |
| Typ specjalny (nietypowka: drzwi, PSK, HS, Ksztalt) | `handlers/orderHandler.ts → updateSpecialType` | `features/orders/components/OrderTableActions.tsx` |
| Usuwanie zlecenia (soft delete) | `handlers/orderHandler.ts → delete` (tylko admin/kierownik, status new) | `features/orders/components/OrderTableActions.tsx` |
| Archiwizacje / przywracanie | `handlers/orderHandler.ts → archive/unarchive` | `features/orders/components/OrderTableActions.tsx` |
| Masowa zmiane statusu (bulk) | `handlers/orderHandler.ts → bulkUpdateStatus` + `services/orderService.ts → bulkUpdateStatus` | `features/manager/components/CompleteOrdersTab.tsx` + `features/manager/components/AddToProductionTab.tsx` |
| Cofanie produkcji | `handlers/orderHandler.ts → revertProduction` (admin/kierownik) | `features/manager/components/CompleteOrdersTab.tsx` |
| Widok produkcji (na dzien/miesiac) | `handlers/orderHandler.ts → getForProduction/getMonthlyProduction` | `features/manager/components/AddToProductionTab.tsx` |
| Wyszukiwanie zlecen (GlobalSearch) | `handlers/orderHandler.ts → search` | komponent wyszukiwania globalnego |
| Walidacje pol (Zod schemas) | `validators/order.ts` (createOrderSchema, updateOrderSchema, patchOrderSchema) | react-hook-form w komponentach |
| Wymagania profilowe (tabela magazyn) | `handlers/orderHandler.ts → getTableByColor/getRequirementsTotals` | `app/magazyn/akrobud/MagazynAkrobudPageContent.tsx` |
| Gotowosc produkcyjna (System Brain) | `services/readinessOrchestrator.ts → canStartProduction` + `handlers/orderHandler.ts → getReadiness` | `features/deliveries/hooks/useBatchReadiness.ts` |
| Warianty (korekta/dodatkowy plik) | `handlers/orderHandler.ts → setVariantType` | `features/orders/components/OrderVariantConflictModal.tsx` |
| PDF (sprawdzanie/pobieranie) | `handlers/orderHandler.ts → hasPdf/downloadPdf` | `features/orders/components/OrderDetailModal.tsx` |
| Plik TXT zamowienia szyb | `handlers/orderHandler.ts → hasGlassOrderTxt/downloadGlassOrderTxt` | `features/orders/components/OrderDetailModal.tsx` |
| Statystyki kompletnosci | `handlers/orderHandler.ts → getCompletenessStats` | `features/dashboard/components/OperatorDashboard.tsx` |
| Statystyki tabeli zlecen | - | `features/orders/components/OrdersStatsModal.tsx` + `features/orders/hooks/useOrdersStats.ts` |
| Kolumny widoczne w tabeli | - | `features/orders/components/ColumnSettingsPanel.tsx` |
| Grupowanie zlecen | - | `features/orders/hooks/useOrderGrouping.ts` |

### 2. Deliveries (Dostawy)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Liste dostaw / filtry | `handlers/deliveryHandler.ts → getAll` + `services/deliveryService.ts → getAllDeliveries` | `app/dostawy/components/DeliveriesTable.tsx` + `app/dostawy/components/DeliveryFilters.tsx` |
| Kalendarz dostaw | `handlers/deliveryHandler.ts → getCalendar/getCalendarBatch` + `services/delivery/DeliveryCalendarService.ts` | `app/dostawy/components/DeliveryCalendar.tsx` + `app/dostawy/components/DayCell.tsx` |
| Tworzenie dostawy | `handlers/deliveryHandler.ts → create` + `validators/delivery.ts` | `app/dostawy/components/dialogs/CreateDeliveryDialog.tsx` |
| Edycje dostawy (data, status, notatki) | `handlers/deliveryHandler.ts → update` | `app/dostawy/components/dialogs/DeliveryDetailsDialog.tsx` |
| Usuwanie dostawy | `handlers/deliveryHandler.ts → delete` | `app/dostawy/components/dialogs/DeleteDeliveryConfirmDialog.tsx` |
| Status dostawy (state machine) | `utils/delivery-status-machine.ts` + `services/deliveryService.ts → updateDelivery` | `app/dostawy/components/DeliveryActions.tsx` |
| Przypisanie zlecenia do dostawy | `handlers/deliveryHandler.ts → addOrder` + `services/delivery/DeliveryOrderService.ts` | `app/dostawy/components/dialogs/AssignOrderDialog.tsx` |
| Odpiecie zlecenia od dostawy | `handlers/deliveryHandler.ts → removeOrder` | `app/dostawy/components/DeliveryActions.tsx` |
| Przenoszenie zlecen miedzy dostawami | `handlers/deliveryHandler.ts → moveOrder` | `app/dostawy/DragDropComponents.tsx` |
| Kolejnosc zlecen w dostawie | `handlers/deliveryHandler.ts → reorderOrders` | `app/dostawy/DragDropComponents.tsx` |
| Dodatkowe pozycje (items) | `handlers/deliveryHandler.ts → addItem/removeItem` | `app/dostawy/components/dialogs/AddItemDialog.tsx` |
| Kompletowanie dostawy | `handlers/deliveryHandler.ts → complete/completeAllOrders` | `app/dostawy/components/dialogs/CompleteOrdersDialog.tsx` |
| Protokol dostawy (dane + PDF) | `handlers/deliveryHandler.ts → getProtocol/getProtocolPdf` + `services/delivery-protocol-service.ts` | podglad w `DeliveryDetailsDialog.tsx` |
| Szybka dostawa (bulk assign) | `handlers/deliveryHandler.ts → validateOrderNumbers/bulkAssignOrders` + `services/delivery/QuickDeliveryService.ts` | `app/dostawy/components/QuickDeliveryDialog.tsx` |
| Masowa zmiana dat dostaw | `handlers/deliveryHandler.ts → bulkUpdateDates` | `app/dostawy/components/BulkUpdateDatesDialog.tsx` |
| Statystyki okien (weekday/monthly/profile) | `handlers/deliveryHandler.ts → getWindowsStatsByWeekday/getMonthlyWindowsStats/getMonthlyProfileStats` + `services/delivery/DeliveryStatisticsService.ts` | `app/dostawy/hooks/useDeliveryStats.ts` + `app/dostawy/components/DeliveryStats.tsx` |
| Wymagania profilowe per dostawy | `handlers/deliveryHandler.ts → getProfileRequirements` | `app/magazyn/akrobud/profile-na-dostawy/page.tsx` |
| Nieprzypisane zlecenia | - | `app/dostawy/components/UnassignedOrdersPanel.tsx` |
| Alerty gotowosci | - | `features/deliveries/components/DeliveryAlerts.tsx` + `features/deliveries/hooks/useBatchReadiness.ts` |
| Zablokowane pozycje (blocked items) | - | `app/dostawy/components/BlockedItemsAlert.tsx` |
| Weryfikacja dostawy (Akrobud) | `handlers/akrobudVerificationHandler.ts` + `services/akrobud-verification/AkrobudVerificationService.ts` | `app/dostawy/weryfikacja/VerificationPageContent.tsx` + `features/akrobud-verification/components/` |

### 3. Warehouse / Magazyn (Akrobud Profile)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Tabele profilowa per kolor | `handlers/orderHandler.ts → getTableByColor` | `app/magazyn/akrobud/MagazynAkrobudPageContent.tsx` |
| Stan magazynu (stock) | `services/warehouse/WarehouseStockService.ts` | `app/magazyn/akrobud/page.tsx` |
| Zamowienia magazynowe (CRUD) | `handlers/warehouseOrderHandler.ts → getAll/getById/create/update/delete` + `services/warehouse/WarehouseOrderService.ts` | `app/magazyn/pvc/page.tsx` |
| Braki magazynowe (shortages) | `services/warehouse/WarehouseShortageService.ts` | `app/magazyn/pvc/zapotrzebowanie/PvcZapotrzebowanieContent.tsx` |
| Zuzycie materialow (usage) | `services/warehouse/WarehouseUsageService.ts` | strony magazynu |
| RW (dokumenty rozchodowe) | `services/warehouse/WarehouseRwService.ts` | strony magazynu |
| Remanent / inwentaryzacja | `services/warehouse/WarehouseInventoryService.ts` | `app/magazyn/akrobud/remanent/page.tsx` |
| Walidacje magazynowe | `validators/warehouse.ts` + `validators/warehouse-orders.ts` | - |
| Magazyn PVC - widok ogolny | - | `app/magazyn/pvc/page.tsx` |

### 4. Glass / Szyby (Zamowienia + Dostawy)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Liste zamowien szyb | `handlers/glassOrderHandler.ts → getAll` + `services/glassOrderService.ts → findAll` | `features/glass/components/GlassOrdersTable.tsx` |
| Szczegoly zamowienia szyb | `handlers/glassOrderHandler.ts → getById/getSummary` | `features/glass/components/GlassOrderDetailModal.tsx` |
| Import z pliku TXT | `handlers/glassOrderHandler.ts → importFromTxt` + `services/glassOrderService.ts → importFromTxt` | `features/glass/components/GlassOrderImportSection.tsx` + `features/glass/components/GlassOrderConflictModal.tsx` |
| Usuwanie zamowienia szyb | `handlers/glassOrderHandler.ts → delete` | `features/glass/components/GlassOrdersTable.tsx` |
| Status zamowienia szyb | `handlers/glassOrderHandler.ts → updateStatus` | `features/glass/components/GlassOrdersTable.tsx` |
| Walidacje szyb (porownanie z zleceniami) | `handlers/glassValidationHandler.ts` + `services/glassValidationService.ts` | `features/glass/components/GlassValidationPanel.tsx` + `features/glass/components/GlassValidationBadge.tsx` |
| Rematch (ponowne dopasowanie) | `handlers/glassOrderHandler.ts → rematchAll` | - |
| Dostawy szyb (lista) | `handlers/glassDeliveryHandler.ts → getAll` + `services/glass-delivery/GlassDeliveryQueryService.ts` | `features/glass/components/GlassDeliveriesTable.tsx` |
| Import dostawy szyb (CSV) | `handlers/glassDeliveryHandler.ts → importFromCsv` + `services/glass-delivery/GlassDeliveryImportService.ts` | `app/dostawy-szyb/page.tsx` |
| Szyby luzem | `handlers/glassDeliveryHandler.ts → getLooseGlasses` | `features/glass/components/LooseGlassTable.tsx` |
| Szyby aluminiowe | `handlers/glassDeliveryHandler.ts → getAluminumGlasses/getAluminumGlassesSummary` | `features/glass/components/AluminumGlassTable.tsx` + `features/glass/components/AluminumGlassSummary.tsx` |
| Szyby reklamacyjne | `handlers/glassDeliveryHandler.ts → getReclamationGlasses` | `features/glass/components/ReclamationGlassTable.tsx` |
| Kategoryzowane tabele szyb | - | `features/glass/components/CategorizedGlassTable.tsx` |
| Podsumowanie ostatniego importu | `handlers/glassDeliveryHandler.ts → getLatestImportSummary` | `features/glass/components/LatestImportSummary.tsx` |
| Dopasowanie szyb do zlecen | `services/glass-delivery/GlassDeliveryMatchingService.ts` | - |
| Walidatory | `validators/glass.ts` | - |
| Rozbieznosci szyb (glass discrepancy) | - | `features/orders/components/GlassDiscrepancyModal.tsx` |

### 5. Imports (Importy plikow)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Upload pliku | `handlers/importHandler.ts → upload` + `services/importService.ts → uploadFile` | `app/importy/components/CsvImportPanel.tsx` + `app/importy/components/PdfImportPanel.tsx` |
| Liste importow / historia | `handlers/importHandler.ts → getAll/getPending` | `app/importy/components/ImportHistoryTable.tsx` |
| Podglad importu | `handlers/importHandler.ts → getPreview/previewByFilepath` | `app/importy/components/ImportPreviewCard.tsx` |
| Zatwierdzanie / odrzucanie importu | `handlers/importHandler.ts → approve/reject` | `app/importy/components/ImportHistoryTable.tsx` |
| Masowe akcje (bulk approve/reject) | `handlers/importHandler.ts → bulkAction` | `app/importy/components/ImportHistoryTable.tsx` |
| Usuwanie importu | `handlers/importHandler.ts → delete` | `app/importy/components/ImportHistoryTable.tsx` |
| Import z folderu (CSV batch) | `handlers/importHandler.ts → importFolder/listFolders/scanFolder` | `app/importy/components/FolderImportSection.tsx` |
| Archiwizacja/usuwanie folderu | `handlers/importHandler.ts → archiveFolder/deleteFolder` | `app/importy/components/FolderImportSection.tsx` |
| Przetwarzanie z rozwiazywaniem wariantow | `handlers/importHandler.ts → processImport` | `app/importy/components/FolderImportSection.tsx` |
| Parser CSV | `services/import/parsers/csvImportService.ts` + `services/import/parsers/transformers/CsvDataTransformer.ts` | - |
| Parser PDF (ceny) | `services/import/parsers/pdfImportService.ts` | - |
| Parser Excel | `services/import/parsers/excelImportService.ts` | - |
| Orkiestracja importu | `services/import/ImportOrchestrator.ts` | - |
| Kolejka importow | `services/import/ImportQueueService.ts` + `services/import/MatchingQueueService.ts` | - |
| Konflikty importu | `services/import/importConflictService.ts` | - |
| Walidacja importu | `services/import/importValidationService.ts` + `validators/import.ts` | - |
| System plikow (sciezki) | `services/import/importFileSystemService.ts` | - |
| Transakcje importu | `services/import/importTransactionService.ts` | - |
| WebSocket bridge (powiadomienia) | `services/import/ImportWebSocketBridge.ts` | - |
| Feature flags parserow | `services/import/parsers/feature-flags.ts` | - |
| Status uploadu | - | `app/importy/components/UploadStatus.tsx` |

### 6. Dashboard

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Dashboard glowny (kierownik) | brak dedykowanego handlera — dane z wielu endpointow | `features/dashboard/components/DashboardContent.tsx` + `features/dashboard/api/dashboardApi.ts` |
| Dashboard operatora | `handlers/operatorDashboardHandler.ts → getOperatorDashboard` + `services/operatorDashboardService.ts` | `features/dashboard/components/OperatorDashboard.tsx` + `features/dashboard/components/NewOperatorDashboard.tsx` |
| Hook dashboard | - | `features/dashboard/hooks/useDashboard.ts` + `features/dashboard/hooks/useOperatorDashboard.ts` |
| API dashboard | `features/dashboard/api/dashboardApi.ts` + `features/dashboard/api/operatorDashboardApi.ts` | - |

### 7. Pallets / Pallet Stock (Optymalizacja pakowania + Paletweki)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Optymalizacje pakowania dla dostawy | `handlers/palletHandler.ts → optimizeDelivery` + `services/pallet-optimizer/PalletOptimizerService.ts` | `app/dostawy/[id]/optymalizacja/page.tsx` |
| Pobranie zapisanej optymalizacji | `handlers/palletHandler.ts → getOptimization` | `app/dostawy/[id]/optymalizacja/page.tsx` |
| Usuniecie optymalizacji | `handlers/palletHandler.ts → deleteOptimization` | `app/dostawy/[id]/optymalizacja/page.tsx` |
| Eksport optymalizacji do PDF | `handlers/palletHandler.ts → exportToPdf` + `services/pallet-optimizer/PdfExportService.ts` | `app/dostawy/[id]/optymalizacja/page.tsx` |
| Typy palet (CRUD) | `handlers/palletHandler.ts → getPalletTypes/createPalletType/updatePalletType/deletePalletType` | `app/ustawienia/page.tsx` |
| Dzien paletowy (stan/zuzycie/produkcja) | `handlers/palletStockHandler.ts → getDay/updateDay/closeDay` + `services/palletStockService.ts` | `features/manager/components/PalletsTab.tsx` |
| Korekta stanu porannego | `handlers/palletStockHandler.ts → correctMorningStock` | `features/manager/components/PalletsTab.tsx` |
| Podsumowanie miesiaca palet | `handlers/palletStockHandler.ts → getMonthSummary` | `features/manager/components/PalletsTab.tsx` |
| Kalendarz palet | `handlers/palletStockHandler.ts → getCalendar` | `features/manager/components/PalletsTab.tsx` |
| Alerty stanow krytycznych | `handlers/palletStockHandler.ts → getAlertConfig/updateAlertConfig` | `features/manager/components/PalletsTab.tsx` |
| Stany poczatkowe palet | `handlers/palletStockHandler.ts → getInitialStocks/setInitialStocks` | `features/manager/components/PalletsTab.tsx` |
| Walidatory | `validators/pallet.ts` + `validators/pallet-stock.ts` | - |
| API frontend | - | `features/pallets/api/palletsApi.ts` + `features/pallets/api/palletStockApi.ts` |

### 8. Timesheets / Godzinowki

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Pracownikow (CRUD) | `handlers/timesheetsHandler.ts → getAllWorkers/createWorker/updateWorker/deactivateWorker` + `services/timesheetsService.ts` | `features/timesheets/components/WorkersManagement.tsx` + `features/timesheets/components/WorkerEditPanel.tsx` |
| Stanowiska (CRUD) | `handlers/timesheetsHandler.ts → getAllPositions/createPosition/updatePosition` | `features/timesheets/components/PositionsManagement.tsx` |
| Typy zadan nieprodukcyjnych | `handlers/timesheetsHandler.ts → getAllNonProductiveTaskTypes/createNonProductiveTaskType/updateNonProductiveTaskType` | `features/timesheets/components/TaskTypesManagement.tsx` |
| Typy nietypowek (special work) | `handlers/timesheetsHandler.ts → getAllSpecialWorkTypes/createSpecialWorkType/updateSpecialWorkType/toggleSpecialWorkType` | `features/timesheets/components/SpecialWorkTypesManagement.tsx` |
| Wpisy czasu (time entries) | `handlers/timesheetsHandler.ts → getTimeEntries/createTimeEntry/updateTimeEntry/deleteTimeEntry` | `features/timesheets/components/DayView.tsx` + `features/timesheets/components/WorkerRow.tsx` |
| Standardowy dzien (bulk) | `handlers/timesheetsHandler.ts → setStandardDay` | `features/timesheets/components/SetStandardDialog.tsx` |
| Zakres nieobecnosci (bulk) | `handlers/timesheetsHandler.ts → setAbsenceRange` | `features/timesheets/components/AbsenceWeekDialog.tsx` |
| Kalendarz/podsumowanie miesieczne | `handlers/timesheetsHandler.ts → getCalendarSummary` | `features/timesheets/components/CalendarView.tsx` |
| Podsumowanie dnia | `handlers/timesheetsHandler.ts → getDaySummary` | `features/timesheets/components/DayView.tsx` |
| Sekcja pracy nieprodukcyjnej | - | `features/timesheets/components/NonProductiveSection.tsx` |
| Sekcja pracy specjalnej | - | `features/timesheets/components/SpecialWorkSection.tsx` |
| Panel ustawien godzinowek | - | `features/timesheets/components/SettingsPanel.tsx` |
| Walidatory | `validators/timesheets.ts` | - |

### 9. Attendance / BZ (Obecnosci)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Dane obecnosci miesieczne | `handlers/attendanceHandler.ts → getMonthlyAttendance` + `services/attendanceService.ts` | `features/attendance/components/MonthlyAttendanceTable.tsx` |
| Aktualizacje dnia (praca/choroba/urlop/nieobecnosc) | `handlers/attendanceHandler.ts → updateDay` | `features/attendance/components/AttendanceCell.tsx` |
| Eksport (Excel/PDF) | `handlers/attendanceHandler.ts → exportAttendance` | `features/attendance/components/ExportButtons.tsx` |
| Wybor miesiaca | - | `features/attendance/components/MonthSelector.tsx` |
| Tab BZ w panelu kierownika | - | `features/manager/components/BZTab.tsx` |

### 10. Production Reports / Zestawienia miesieczne

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Raport miesieczny (pelny) | `handlers/productionReportHandler.ts → getReport` + `services/productionReportService.ts → getReport` | `features/production-reports/ProductionReportPage.tsx` + `features/production-reports/components/OrdersTable/OrdersTable.tsx` |
| Podsumowanie raportu | `handlers/productionReportHandler.ts → getSummary` | `features/production-reports/components/SummarySection.tsx` |
| Edycje pozycji (ilosci, RW checkboxy) | `handlers/productionReportHandler.ts → updateReportItem` | `features/production-reports/components/OrdersTable/EditableCell.tsx` + `features/production-reports/components/OrdersTable/CheckboxCell.tsx` |
| Weryfikacja pozycji (verified lock) | `handlers/productionReportHandler.ts → verifyItem` | `features/production-reports/components/OrdersTable/OrderRow.tsx` |
| Dane faktur | `handlers/productionReportHandler.ts → updateInvoice` | `features/production-reports/components/OrdersTable/OrderRow.tsx` |
| Auto-fill numeru FV | `handlers/productionReportHandler.ts → getInvoiceAutoFillPreview/executeInvoiceAutoFill` | `features/production-reports/components/InvoiceAutoFillDialog.tsx` |
| Nietypowki (atypical) | `handlers/productionReportHandler.ts → updateAtypical` | `features/production-reports/components/AtypicalSection.tsx` |
| Zamykanie/otwieranie miesiaca | `handlers/productionReportHandler.ts → closeMonth/reopenMonth` | `features/production-reports/components/CloseMonthDialog.tsx` + `features/production-reports/components/ReopenMonthDialog.tsx` |
| Eksport raportu do PDF | `handlers/productionReportHandler.ts → exportPdf` + `services/productionReportPdfService.ts` | `features/production-reports/ProductionReportPage.tsx` |
| Wybor miesiaca | - | `features/production-reports/components/MonthSelector.tsx` |
| Status badge | - | `features/production-reports/components/ReportStatusBadge.tsx` |
| Grupowanie po dostawach | - | `features/production-reports/components/OrdersTable/DeliveryGroup.tsx` |
| Walidatory | `validators/production-reports.ts` | - |
| Obliczenia/helpery | - | `features/production-reports/helpers/calculations.ts` + `features/production-reports/helpers/permissions.ts` |
| Zlecenia do sprawdzenia (flagged) | - | `features/production-reports/components/FlaggedOrdersPage.tsx` |

### 11. Production Planning / Planowanie Produkcji

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Konfiguracje wydajnosci | `handlers/productionPlanningHandler.ts → getAllEfficiencyConfigs/createEfficiencyConfig/updateEfficiencyConfig/deleteEfficiencyConfig` + `services/productionPlanningService.ts` | `app/planowanie-produkcji/page.tsx` |
| Ustawienia produkcji | `handlers/productionPlanningHandler.ts → getAllSettings/getSettingByKey/upsertSetting/updateSetting/deleteSetting` | `app/planowanie-produkcji/page.tsx` |
| Kalendarz produkcji (dni robocze) | `handlers/productionPlanningHandler.ts → getCalendarDays/upsertCalendarDay/deleteCalendarDay` | `app/planowanie-produkcji/page.tsx` |
| Profile isPalletized | `handlers/productionPlanningHandler.ts → getProfilesWithPalletized/updateProfilePalletized/bulkUpdateProfilePalletized` | `app/planowanie-produkcji/page.tsx` |
| Kolory isTypical | `handlers/productionPlanningHandler.ts → getColorsWithTypical/updateColorTypical/bulkUpdateColorTypical` | `app/planowanie-produkcji/page.tsx` |
| Walidatory | `validators/productionPlanning.ts` | - |

### 12. Logistics (Logistyka — parsowanie maili)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Parsowanie tekstu maila | `handlers/logisticsHandler.ts → parseEmail` + `services/logistics/LogisticsMailParser.ts` | `features/logistics/components/MailParserForm.tsx` + `features/logistics/components/ParsedMailPreview.tsx` |
| Zapis sparsowanej listy | `handlers/logisticsHandler.ts → saveMailList` + `services/logistics/LogisticsMailService.ts` | `features/logistics/components/ParsedMailPreview.tsx` |
| Liste mailowe (getAll/getById) | `handlers/logisticsHandler.ts → getMailLists/getMailListById` | `features/logistics/components/LogisticsLeftPanel.tsx` |
| Usuwanie listy mailowej (soft) | `handlers/logisticsHandler.ts → deleteMailList` | `features/logistics/components/LogisticsLeftPanel.tsx` |
| Wersje dostaw | `handlers/logisticsHandler.ts → getVersionsByDeliveryCode/getLatestVersion` | `features/logistics/components/LogisticsRightPanel.tsx` |
| Porownanie wersji (diff) | `handlers/logisticsHandler.ts → getVersionDiff` | `features/logistics/components/DeliveryVersionDiff.tsx` |
| Kalendarz logistyki | `handlers/logisticsHandler.ts → getCalendar` | `features/logistics/components/LogisticsCalendarView.tsx` |
| Edycja pozycji mailowej | `handlers/logisticsHandler.ts → updateMailItem` | `features/logistics/components/LogisticsItemsList.tsx` + `features/logistics/components/ParsedItemEditor.tsx` |
| Akcje diff (usun/potwierdz/odrzuc/akceptuj zmiane/przywroc) | `handlers/logisticsHandler.ts → removeItemFromDelivery/confirmAddedItem/rejectAddedItem/acceptItemChange/restoreItemValue` | `features/logistics/components/DeliveryVersionDiff.tsx` |
| Ustawienie daty dostawy dla zlecenia | `handlers/logisticsHandler.ts → setOrderDeliveryDate` | `features/logistics/components/LogisticsItemsList.tsx` |
| Orphan orders (zlecenia bez pozycji na liscie) | `handlers/logisticsHandler.ts → getOrphanOrders/removeOrderFromDelivery` | `features/logistics/components/LogisticsRightPanel.tsx` |
| Widok szczegolowy dostawy | - | `app/logistyka/[deliveryCode]/DeliveryDetailContent.tsx` |
| Strona glowna logistyki | - | `features/logistics/components/LogistykaPageContent.tsx` |
| Walidatory | `validators/logistics.ts` | - |

### 13. Schuco (Dostawy Schuco)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Liste dostaw Schuco | `handlers/schucoHandler.ts → getDeliveries` + `services/schuco/schucoService.ts → getDeliveries` | `app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` |
| Reczne odswiezenie (scraping) | `handlers/schucoHandler.ts → refreshDeliveries` + `services/schuco/schucoScraper.ts` + `services/schuco/schucoParser.ts` | `app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` |
| Status ostatniego pobrania | `handlers/schucoHandler.ts → getStatus` | `app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` |
| Logi pobierania | `handlers/schucoHandler.ts → getLogs` | `app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` |
| Statystyki dostaw | `handlers/schucoHandler.ts → getStatistics` | `app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` |
| Scraper HTML | `services/schuco/schucoScraper.ts` + `services/schuco/schucoItemScraper.ts` | - |
| Parser danych | `services/schuco/schucoParser.ts` + `services/schuco/schucoItemParser.ts` | - |
| Dopasowanie do zlecen | `services/schuco/schucoOrderMatcher.ts` | - |
| Scheduler automatyczny | `services/schuco/schucoScheduler.ts` | - |
| Linkowanie pozycji | `services/schuco/schucoLinkService.ts` + `services/schuco/schucoItemService.ts` | - |
| Walidatory | `validators/schuco.ts` | - |
| Modal Schuco w zleceniach | - | `features/orders/components/SchucoDeliveriesModal.tsx` |

### 14. OKUC (Magazyn okucia)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| **Artykuly** | | |
| Liste artykulow / filtry | `handlers/okuc/articleHandler.ts → list` + `services/okuc/OkucArticleService.ts` | `features/okuc/components/ArticlesTable.tsx` |
| CRUD artykulow | `handlers/okuc/articleHandler.ts → getById/create/update/delete` | `features/okuc/components/ArticleForm.tsx` + `features/okuc/components/DeleteArticleDialog.tsx` |
| Aliasy artykulow | `handlers/okuc/articleHandler.ts → addAlias/getAliases` | `features/okuc/components/ArticleForm.tsx` |
| Import artykulow (CSV preview + confirm) | `handlers/okuc/articleHandler.ts → importPreview/importArticles` | `features/okuc/components/ImportArticlesDialog.tsx` |
| Eksport artykulow (CSV) | `handlers/okuc/articleHandler.ts → exportCsv` | `features/okuc/components/ArticlesTable.tsx` |
| Artykuly do przejrzenia (pending review) | `handlers/okuc/articleHandler.ts → listPendingReview/batchUpdateOrderClass` | `features/okuc/components/NewArticlesReviewModal.tsx` |
| **Stan magazynowy** | | |
| Lista stanow / filtry | `handlers/okuc/stockHandler.ts → list` + `services/okuc/OkucStockService.ts` | `features/okuc/components/StockTable.tsx` |
| Aktualizacja stanu (optimistic locking) | `handlers/okuc/stockHandler.ts → update/adjust` | `features/okuc/components/StockTable.tsx` |
| Podsumowanie stanow | `handlers/okuc/stockHandler.ts → summary` | `features/okuc/components/StockSummaryCards.tsx` |
| Stany ponizej minimum | `handlers/okuc/stockHandler.ts → belowMinimum` | `features/okuc/components/StockTable.tsx` |
| Import stanow (CSV preview + confirm) | `handlers/okuc/stockHandler.ts → importPreview/importStock` | `features/okuc/components/ImportStockDialog.tsx` |
| Eksport stanow (CSV) | `handlers/okuc/stockHandler.ts → exportCsv` | `features/okuc/components/StockTable.tsx` |
| Historia zmian stanow | `handlers/okuc/stockHandler.ts → getHistory` | `features/okuc/components/StockTable.tsx` |
| **Zamowienia do dostawcow** | | |
| Lista zamowien / filtry | `handlers/okuc/orderHandler.ts → list` + `repositories/okuc/OkucOrderRepository.ts` | `features/okuc/components/OrdersTable.tsx` |
| CRUD zamowien | `handlers/okuc/orderHandler.ts → getById/create/update/delete` | `features/okuc/components/OrderForm.tsx` |
| Przyjecie zamowienia (receive) | `handlers/okuc/orderHandler.ts → receive` | `features/okuc/components/OrdersTable.tsx` |
| Statystyki zamowien | `handlers/okuc/orderHandler.ts → getStats` | `features/okuc/components/OrdersTable.tsx` |
| Import zamowien (XLSX parse + confirm) | `handlers/okuc/orderHandler.ts → parseImport/confirmImport` + `services/okuc/OkucOrderImportService.ts` | `features/okuc/components/ImportOrderDialog.tsx` |
| Pozycje zamowienia | - | `features/okuc/components/OrderItemsTable.tsx` |
| **Zapotrzebowanie** | | |
| Lista zapotrzebowan | `handlers/okuc/demandHandler.ts → list/getSummary` + `repositories/okuc/OkucDemandRepository.ts` | `features/okuc/components/DemandTable.tsx` |
| CRUD zapotrzebowania | `handlers/okuc/demandHandler.ts → getById/create/update/delete` | `features/okuc/components/DemandForm.tsx` + `features/okuc/components/DeleteDemandDialog.tsx` |
| **Proporcje** | | |
| Lista proporcji | `handlers/okuc/proportionHandler.ts → list/getByArticle/getChains` + `repositories/okuc/OkucProportionRepository.ts` | strona proporcji w `app/magazyn/okuc/` |
| CRUD proporcji | `handlers/okuc/proportionHandler.ts → create/update/delete/activate/deactivate` | strona proporcji w `app/magazyn/okuc/` |
| **Zastepstwa artykulow** | | |
| Lista zastepstw | `handlers/okuc/replacementHandler.ts → list` + `services/okuc/ArticleReplacementService.ts` | strona zastepstw w `app/magazyn/okuc/zastepstwa/page.tsx` + `features/okuc/components/AddReplacementDialog.tsx` |
| Ustawianie/usuwanie zastepstwa | `handlers/okuc/replacementHandler.ts → set/remove` | `features/okuc/components/AddReplacementDialog.tsx` |
| Transfer zapotrzebowania | `handlers/okuc/replacementHandler.ts → transferDemand` | strona zastepstw |
| **Lokalizacje magazynowe** | | |
| Lista lokalizacji | `handlers/okuc/locationHandler.ts → list` + `services/okuc/OkucLocationService.ts` | strona lokalizacji w `app/magazyn/okuc/` |
| CRUD lokalizacji | `handlers/okuc/locationHandler.ts → create/update/delete` | strona lokalizacji |
| Zmiana kolejnosci | `handlers/okuc/locationHandler.ts → reorder` | strona lokalizacji |
| **RW (dokumenty rozchodowe OKUC)** | `services/okuc/OkucRwService.ts` | `app/magazyn/okuc/rw/page.tsx` |
| **Walidatory** | `validators/okuc.ts` + `validators/okuc-location.ts` | - |

### 15. Settings / Ustawienia

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Ustawienia ogolne (key-value) | `handlers/settingsHandler.ts → getAll/getByKey/upsertOne/upsertMany` + `services/settingsService.ts` | `app/ustawienia/page.tsx` + `app/ustawienia/hooks/useSettingsMutations.ts` |
| Typy palet (settings-level) | `handlers/settingsHandler.ts → getAllPalletTypes/createPalletType/updatePalletType/deletePalletType` | `app/ustawienia/page.tsx` |
| Reguly pakowania | `handlers/settingsHandler.ts → getAllPackingRules/createPackingRule/updatePackingRule/deletePackingRule` | `app/ustawienia/page.tsx` |
| Sciezka folderu importu (per user) | `handlers/settingsHandler.ts → getUserFolderPath/updateUserFolderPath` | `app/ustawienia/page.tsx` |
| Mapowania autor dokumentu ↔ user | `handlers/settingsHandler.ts → getAllDocumentAuthorMappings/createDocumentAuthorMapping/updateDocumentAuthorMapping/deleteDocumentAuthorMapping` | `app/ustawienia/page.tsx` |
| Glebokosci profili | `handlers/profileDepthHandler.ts` | `app/ustawienia/ProfileDepthsTab.tsx` |
| Konfiguracja profil-paleta | `handlers/profilePalletConfigHandler.ts` | `app/ustawienia/page.tsx` |
| Profile (CRUD) | `handlers/profileHandler.ts` + `services/profileService.ts` | `app/ustawienia/page.tsx` |
| Kolory (CRUD) | `handlers/colorHandler.ts` + `services/colorService.ts` | `app/ustawienia/page.tsx` |
| Ustawienia admin | - | `app/admin/settings/page.tsx` |
| Walidatory | `validators/settings.ts` + `validators/profile.ts` + `validators/profileDepth.ts` + `validators/color.ts` | - |

### 16. Label Checks / Kontrola etykiet

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Liste sprawdzen / filtry / paginacja | `handlers/labelCheckHandler.ts → getAll` + `services/label-check/LabelCheckService.ts` | `app/kontrola-etykiet/LabelChecksPageContent.tsx` |
| Szczegoly sprawdzenia | `handlers/labelCheckHandler.ts → getById` | `app/kontrola-etykiet/[id]/LabelCheckDetailContent.tsx` |
| Uruchomienie sprawdzania (create) | `handlers/labelCheckHandler.ts → create` | `features/label-checks/components/CheckLabelsButton.tsx` |
| Usuwanie sprawdzenia (soft) | `handlers/labelCheckHandler.ts → remove` | `app/kontrola-etykiet/LabelChecksPageContent.tsx` |
| Eksport do Excel | `handlers/labelCheckHandler.ts → exportExcel` + `services/label-check/LabelCheckExportService.ts` | `app/kontrola-etykiet/[id]/LabelCheckDetailContent.tsx` |
| Najnowsze sprawdzenie dla dostawy | `handlers/labelCheckHandler.ts → getLatestForDelivery` | `features/label-checks/components/LabelCheckSummary.tsx` |
| Statystyki sprawdzen | `handlers/labelCheckHandler.ts → getStatistics` | `app/kontrola-etykiet/LabelChecksPageContent.tsx` |
| Podsumowanie dla dostawy | `handlers/labelCheckHandler.ts → getDeliverySummary` | `features/label-checks/components/LabelCheckSummary.tsx` |
| OCR (rozpoznawanie tekstu z etykiet) | `services/label-check/OcrService.ts` | - |
| Tabela wynikow | - | `features/label-checks/components/LabelCheckResultsTable.tsx` |
| Badge statusu etykiety | - | `features/label-checks/components/LabelStatusBadge.tsx` |
| Walidatory | `validators/label-check.ts` | - |

### 17. Users / Auth (Uzytkownicy i autoryzacja)

| Chce zmienic... | Backend | Frontend |
|-----------------|---------|----------|
| Logowanie (login) | `handlers/authHandler.ts → loginHandler` + `services/authService.ts → login` | `app/login/page.tsx` + `features/auth/api/authApi.ts` |
| Wylogowanie (logout) | `handlers/authHandler.ts → logoutHandler` | `features/auth/components/UserMenu.tsx` |
| Dane zalogowanego usera (/me) | `handlers/authHandler.ts → meHandler` + `services/authService.ts → getCurrentUser` | `features/auth/context/AuthContext.tsx` + `features/auth/hooks/useAuth.ts` |
| Lista uzytkownikow | `handlers/userHandler.ts → listUsersHandler` + `services/userService.ts → getAllUsers` | `features/admin/components/UsersList.tsx` |
| CRUD uzytkownikow | `handlers/userHandler.ts → getUserHandler/createUserHandler/updateUserHandler/deleteUserHandler` | `features/admin/components/UserFormDialog.tsx` |
| Sprawdzanie rol | middleware `middleware/auth.ts` | `features/auth/hooks/useRoleCheck.ts` |
| Kontekst autoryzacji | - | `features/auth/context/AuthContext.tsx` |
| Walidatory | `validators/auth.ts` (loginSchema, createUserSchema, updateUserSchema) | - |
| Strona admin | - | `app/admin/page.tsx` + `app/admin/users/page.tsx` |

### 18. Dodatkowe moduly

| Modul | Backend | Frontend |
|-------|---------|----------|
| **Stal (magazyn)** | `handlers/steelHandler.ts` + `services/steelService.ts` + `services/SteelRwService.ts` | `app/magazyn/stal/MagazynStalPageContent.tsx` |
| **Moja Praca (widok operatora)** | `handlers/mojaPracaHandler.ts` + `services/mojaPracaService.ts` | `features/moja-praca/components/` (UserOrdersList, UserDeliveriesList, UserGlassOrdersList, ConflictsList) |
| **Bug reports** | `handlers/bugReportHandler.ts` + `services/bugReportService.ts` | `app/admin/bug-reports/BugReportsList.tsx` |
| **Gmail (pobieranie maili)** | `handlers/gmailHandler.ts` + `services/gmail/GmailFetcherService.ts` | - |
| **Help (pomoc PDF)** | `handlers/helpHandler.ts` + `services/help/HelpPdfService.ts` | - |
| **Pending Order Prices** | `handlers/pendingOrderPriceCleanupHandler.ts` + `services/pendingOrderPriceCleanupService.ts` + `services/pendingOrderPriceRematchService.ts` | `app/admin/pending-prices/PendingPricesList.tsx` |
| **Kierownik (panel)** | endpointy z orders, deliveries, timesheets | `app/kierownik/page.tsx` + `features/manager/components/` (AddToProductionTab, CompleteOrdersTab, TimeTrackerTab, PalletsTab, BZTab) |
| **Operator (panel)** | `handlers/operatorDashboardHandler.ts` | `app/operator/page.tsx` |
| **Archiwum** | `handlers/orderHandler.ts → getAll(archived)` | `app/archiwum/page.tsx` |
| **Waluty / kurs** | `services/currencyConfigService.ts` | - |
| **Holidays** | `services/HolidayService.ts` | - |
| **Soft delete cleanup** | `services/softDeleteCleanupService.ts` | - |
