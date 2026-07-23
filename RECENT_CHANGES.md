# AKROBUD - Ostatnie zmiany

> Automatycznie wygenerowano z historii git (ostatnie 14 dni)
> Data: 2026-02-25

---

## Statystyki

| Metryka | Wartosc |
|---------|---------|
| Commitow | 5 |
| Zmienionych plikow | 133 |
| Aktywnych modulow | 13 |
| Okres | ostatnie 14 dni |

---

## Spis tresci

1. [Auth](#auth)
2. [Deliveries](#deliveries)
3. [Glass](#glass)
4. [Imports](#imports)
5. [Label-Checks](#label-checks)
6. [Moja-Praca](#moja-praca)
7. [OKUC](#okuc)
8. [Orders](#orders)
9. [Other](#other)
10. [Production](#production)
11. [Schuco](#schuco)
12. [Timesheets](#timesheets)
13. [Warehouse](#warehouse)
14. [Chronologiczna lista commitow](#chronologiczna-lista-commitow)

---

## Zmiany wg modulow

### Auth

**1 commit**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/web/src/features/auth/components/LoginForm.tsx

### Deliveries

**2 commitow**

- `90faeb5` feat: invalidate label checks when delivery composition or date changes
  - apps/api/src/services/delivery/DeliveryService.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/services/alerts/DeliveryAlertScheduler.ts
  - apps/api/src/services/delivery/DeliveryStatisticsService.ts
  - apps/api/src/services/readiness/DeliveryReadinessAggregator.ts
  - apps/api/src/services/readiness/modules/GlassDeliveryCheck.ts
  - apps/web/src/features/deliveries/components/DeliveryAlerts.tsx

### Glass

**2 commitow**

- `48178f0` feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix
  - apps/api/scripts/recalculate-total-glasses.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/services/file-watcher/GlassWatcher.ts
  - apps/web/src/features/glass/components/GlassDeliveriesTable.tsx

### Imports

**2 commitow**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/services/import/CenyProcessor.ts
  - apps/api/src/services/import/UzyteBeleProcessor.ts
  - apps/api/src/services/import/parsers/csvImportService.ts
  - apps/api/src/services/import/parsers/pdfImportService.ts
- `0cc4bc3` feat: add special order types, flagged orders page, and production report improvements
  - apps/api/src/services/import/parsers/pdfImportService.ts

### Label-Checks

**1 commit**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/web/src/features/label-checks/hooks/useLabelChecks.ts
  - apps/web/src/features/label-checks/types.ts

### Moja-Praca

**2 commitow**

- `48178f0` feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix
  - apps/web/src/features/moja-praca/api/mojaPracaApi.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/web/src/features/moja-praca/components/AlertsSection.tsx
  - apps/web/src/features/moja-praca/types/index.ts

### OKUC

**1 commit**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/services/file-watcher/OkucZapotrzebowaWatcher.ts

### Orders

**4 commitow**

- `1c76a7f` feat: PVC remanent date picker, okuc auto-receive scheduler, production fixes
  - apps/api/src/services/okuc/OkucOrderImportService.ts
  - apps/api/src/services/okuc/OkucOrderStatusScheduler.ts
- `90faeb5` feat: invalidate label checks when delivery composition or date changes
  - apps/api/src/services/delivery/DeliveryOrderService.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/handlers/glassOrderHandler.ts
  - apps/api/src/handlers/pendingOrderPriceCleanupHandler.ts
  - apps/api/src/repositories/OrderRepository.ts
  - apps/api/src/routes/glass-orders.ts
  - apps/api/src/routes/pending-order-price-cleanup.ts
  - apps/api/src/services/glassOrderService.ts
  - apps/api/src/services/parsers/glass-order-txt-parser.ts
  - apps/api/src/services/pendingOrderPriceRematchService.ts
  - apps/web/src/features/manager/components/CompleteOrdersTab.tsx
  - apps/web/src/features/orders/components/OrderDetailModal.tsx
  - apps/web/src/features/orders/components/OrderTableRow.tsx
  - apps/web/src/features/orders/components/OrdersFilterBar.tsx
  - apps/web/src/features/orders/helpers/index.ts
  - apps/web/src/features/orders/helpers/orderHelpers.ts
  - apps/web/src/features/orders/types/index.ts
  - apps/web/src/features/production-reports/components/FlaggedOrdersPage.tsx
  - apps/web/src/features/production-reports/components/OrdersTable/OrderRow.tsx
- `0cc4bc3` feat: add special order types, flagged orders page, and production report improvements
  - apps/api/downloads/schuco/orders-page.png
  - apps/api/prisma/migrations/20260210120000_add_special_type_to_orders/migration.sql
  - apps/api/src/handlers/orderHandler.ts
  - apps/api/src/repositories/OrderRepository.ts
  - apps/api/src/routes/orders.ts
  - apps/api/src/services/orderService.ts
  - apps/api/src/validators/order.ts
  - apps/web/src/features/okuc/components/OrderForm.tsx
  - apps/web/src/features/orders/api/ordersApi.ts
  - apps/web/src/features/orders/components/OrderTableRow.tsx
  - apps/web/src/features/orders/components/OrdersTable.tsx
  - apps/web/src/features/production-reports/components/FlaggedOrdersPage.tsx
  - apps/web/src/features/production-reports/components/OrdersTable/OrderRow.tsx
  - apps/web/src/features/production-reports/components/OrdersTable/OrdersTable.tsx
  - apps/web/src/lib/api/orders.ts
  - apps/web/src/types/order.ts

### Other

**5 commitow**

- `48178f0` feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix
  - .husky/pre-commit
  - FUNCTION_INDEX.md
  - apps/api/src/routes/settings.ts
  - apps/api/src/services/parsers/UzyteBeleParser.ts
  - apps/api/src/services/parsers/pdf-parser.ts
  - apps/web/src/app/magazyn/pvc/remanent/page.tsx
  - apps/web/src/middleware.ts
  - package.json
- `1c76a7f` feat: PVC remanent date picker, okuc auto-receive scheduler, production fixes
  - SESSION_STATE.md
  - apps/api/src/index.ts
  - apps/api/src/services/parsers/pdf-parser.ts
  - apps/web/src/app/magazyn/pvc/remanent/page.tsx
  - ecosystem.config.js
- `90faeb5` feat: invalidate label checks when delivery composition or date changes
  - apps/api/src/repositories/LabelCheckRepository.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - CLAUDE.md
  - CLAUDE_START.md
  - SESSION_STATE.md
  - apps/api/package.json
  - apps/api/prisma/schema.prisma
  - apps/api/src/repositories/MojaPracaRepository.ts
  - apps/api/src/routes/settings.ts
  - apps/api/src/services/alerts/LabelCheckScheduler.ts
  - apps/api/src/services/file-watcher/CenyWatcher.ts
  - apps/api/src/services/file-watcher/UzyteBeleWatcher.ts
  - apps/api/src/services/file-watcher/utils.ts
  - apps/api/src/services/label-check/LabelCheckService.ts
  - apps/api/src/services/mojaPracaService.ts
  - apps/api/src/services/parsers/UzyteBeleParser.ts
  - apps/api/src/services/parsers/pdf-parser.ts
  - apps/api/src/services/readiness/modules/LabelCheckModule.ts
  - apps/web/src/app/dostawy/DostawyPageContent.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx
  - apps/web/src/app/magazyn/pvc/remanent/page.tsx
  - apps/web/src/app/moja-praca/page.tsx
  - apps/web/src/app/zestawienia/zlecenia/page.tsx
  - apps/web/src/components/ReadinessChecklist.tsx
  - apps/web/src/lib/api-client.ts
  - apps/web/src/middleware.ts
  - pnpm-lock.yaml
  - scripts/validate-config.js
- `0cc4bc3` feat: add special order types, flagged orders page, and production report improvements
  - .claude/settings.local.json
  - .turbo/daemon/216f11b8ff06453f-turbo.log.2026-02-10
  - .turbo/daemon/216f11b8ff06453f-turbo.log.2026-02-11
  - apps/api/prisma/dev.db
  - apps/api/prisma/dev.db-shm
  - apps/api/prisma/dev.db-wal
  - apps/api/prisma/migrations/20260211120000_add_override_material_value/migration.sql
  - apps/api/prisma/schema.prisma
  - apps/api/scripts/fix-akrobud-windows-net-value.ts
  - apps/api/src/services/parsers/UzyteBeleParser.ts
  - apps/api/src/services/parsers/pdf-parser.ts
  - apps/web/src/app/zestawienia/do-sprawdzenia/page.tsx
  - apps/web/src/app/zestawienia/zlecenia/page.tsx
  - apps/web/src/components/layout/sidebar.tsx
  - apps/web/tsconfig.tsbuildinfo
  - scripts/fix-material-category.js

### Production

**3 commitow**

- `48178f0` feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix
  - apps/api/src/repositories/ProductionReportRepository.ts
  - apps/api/src/services/productionReportService.ts
  - apps/web/src/features/production-reports/api/productionReportsApi.ts
  - apps/web/src/features/production-reports/components/SummarySection.tsx
  - apps/web/src/features/production-reports/helpers/calculations.ts
  - apps/web/src/features/production-reports/types/index.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/prisma/migrations/20260213153000_add_verified_to_production_report_items/migration.sql
  - apps/api/src/handlers/productionReportHandler.ts
  - apps/api/src/repositories/ProductionReportRepository.ts
  - apps/api/src/routes/production-reports.ts
  - apps/api/src/services/productionReportPdfService.ts
  - apps/api/src/services/productionReportService.ts
  - apps/web/src/features/manager/components/AddToProductionTab.tsx
  - apps/web/src/features/production-reports/api/productionReportsApi.ts
  - apps/web/src/features/production-reports/components/SummarySection.tsx
  - apps/web/src/features/production-reports/helpers/permissions.ts
  - apps/web/src/features/production-reports/hooks/index.ts
  - apps/web/src/features/production-reports/types/index.ts
- `0cc4bc3` feat: add special order types, flagged orders page, and production report improvements
  - apps/api/src/repositories/ProductionReportRepository.ts
  - apps/api/src/services/productionReportService.ts
  - apps/api/src/validators/production-reports.ts
  - apps/web/src/features/production-reports/api/productionReportsApi.ts
  - apps/web/src/features/production-reports/types/index.ts

### Schuco

**2 commitow**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/services/schuco/schucoItemScraper.ts
  - apps/api/src/services/schuco/schucoScraper.ts
- `0cc4bc3` feat: add special order types, flagged orders page, and production report improvements
  - apps/api/downloads/schuco/after-data-load.png
  - apps/api/downloads/schuco/after-login.png
  - apps/api/downloads/schuco/before-table-wait.png
  - apps/api/downloads/schuco/debug-01-before-filter.png
  - apps/api/downloads/schuco/debug-02-after-dropdown-click.png
  - apps/api/downloads/schuco/debug-03-after-option-select.png
  - apps/api/downloads/schuco/debug-04-after-date-input.png
  - apps/api/downloads/schuco/debug-05-after-click-outside.png
  - apps/api/downloads/schuco/debug-06-after-filter-submit.png
  - apps/api/downloads/schuco/debug-06-final-after-filter.png

### Timesheets

**1 commit**

- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/web/src/features/timesheets/components/DayView.tsx

### Warehouse

**3 commitow**

- `48178f0` feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix
  - apps/api/src/routes/pvc-warehouse.ts
- `1c76a7f` feat: PVC remanent date picker, okuc auto-receive scheduler, production fixes
  - apps/api/src/handlers/warehouse-handler.ts
  - apps/api/src/services/warehouse/WarehouseInventoryService.ts
  - apps/api/src/services/warehouse/index.ts
  - apps/api/src/validators/warehouse.ts
  - apps/web/src/app/magazyn/pvc/PvcWarehousePageContent.tsx
  - apps/web/src/types/warehouse.ts
- `c68975e` feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts
  - apps/api/src/routes/pvc-warehouse.ts
  - apps/api/src/services/warehouse/WarehouseInventoryService.ts
  - apps/web/src/features/warehouse/remanent/hooks/useRemanent.ts
  - apps/web/src/features/warehouse/remanent/hooks/useRemanentHistory.ts

---

## Chronologiczna lista commitow

| Hash | Opis | Plikow | Moduly |
|------|------|--------|--------|
| `48178f0` | feat: PDF parser order suffix support, small glass stats, settings route fix, glass count fix | 17 | Glass, Moja-Praca, Other, Production, Warehouse |
| `1c76a7f` | feat: PVC remanent date picker, okuc auto-receive scheduler, production fixes | 13 | Orders, Other, Warehouse |
| `90faeb5` | feat: invalidate label checks when delivery composition or date changes | 3 | Deliveries, Orders, Other |
| `c68975e` | feat: label checks improvements, verified checkbox fix, PVC date format, Moja Praca alerts | 80 | Auth, Deliveries, Glass, Imports, Label-Checks, Moja-Praca, OKUC, Orders, Other, Production, Schuco, Timesheets, Warehouse |
| `0cc4bc3` | feat: add special order types, flagged orders page, and production report improvements | 48 | Imports, Orders, Other, Production, Schuco |
