# Enums & Statusy - AKROBUD

> Kompletna dokumentacja wszystkich enumow, statusow i stalych wartosci uzywanych w projekcie.
> SQLite nie obsluguje enumow natywnie - walidacja odbywa sie na poziomie aplikacji (Zod + TypeScript).
>
> Ostatnia aktualizacja: 2026-02-25
> Wygenerowano automatycznie przez `node scripts/regen-enums-reference.js`

---

## Quick Lookup

| Enum/Status | Wartosci | Zrodlo | Lokalizacja |
|-------------|----------|--------|-------------|
| **AbsenceType** | `SICK`, `VACATION`, `ABSENT` | Zod | `apps/api/src/validators/timesheets.ts:98`, `apps/api/src/validators/timesheets.ts:195` |
| **Action** | `keep_first`, `keep_last`, `keep_all`, `remove_all` | Zod | `apps/api/src/validators/akrobud-verification.ts:90` |
| **Action** | `overwrite`, `add_new` | Zod | `apps/api/src/validators/import.ts:15` |
| **Action** | `replace_base`, `replace_variant`, `keep_both`, `cancel` | Zod | `apps/api/src/validators/moja-praca.ts:35`, `apps/api/src/validators/moja-praca.ts:46` |
| **AggregatedReadinessStatus** | `ready`, `conditional`, `blocked`, `pending` | type | `apps/api/src/services/readiness/types.ts:58` |
| **AlertPriority** | `critical`, `high`, `medium`, `low` | Zod | `apps/api/src/validators/dashboard.ts:11` |
| **AlertType** | `shortage`, `import`, `delivery` | Zod | `apps/api/src/validators/dashboard.ts:12` |
| **AttendanceType** | `work`, `sick`, `vacation`, `absent` | type | `apps/api/src/services/attendanceService.ts:10` |
| **BasketType** | `typical_standard`, `typical_gabarat`, `atypical` | Zod | `apps/api/src/validators/okuc.ts:14` |
| **CalendarDayStatus** | `empty`, `open`, `closed` | type | `apps/api/src/services/palletStockService.ts:57` |
| **ColorType** | `typical`, `atypical` | type | `packages/shared/src/types/colors.ts:1` |
| **ConflictResolution** | `skip`, `overwrite`, `selective` | Zod | `apps/api/src/validators/okuc.ts:267` |
| **DAY_STATUS** | `OPEN`, `CLOSED` | const obj | `apps/api/src/services/palletStockService.ts:28` |
| **DayType** | `working`, `holiday`, `production_saturday`, `custom_off` | Zod | `apps/api/src/validators/productionPlanning.ts:48` |
| **DELIVERY_STATUSES** | `planned`, `in_progress`, `completed` | const obj | `apps/api/src/utils/delivery-status-machine.ts:27` |
| **DeliveryNumber** | `I`, `II`, `III` | Zod, type | `apps/api/src/validators/import.ts:21`, `apps/api/src/validators/import.ts:37`, `apps/api/src/services/file-watcher/types.ts:48` |
| **DeliveryStatus** | `planned`, `in_preparation`, `ready`, `shipped`, `delivered` | Zod, const obj | `apps/api/src/validators/dashboard.ts:13`, `packages/shared/src/constants.ts:56` |
| **DeliveryStatus** | `ready`, `blocked`, `conditional` | Zod | `apps/api/src/validators/logistics.ts:30` |
| **DemandSource** | `order`, `csv_import`, `manual` | Zod | `apps/api/src/validators/okuc.ts:86` |
| **DemandStatus** | `pending`, `confirmed`, `in_production`, `completed`, `cancelled` | Zod | `apps/api/src/validators/okuc.ts:78` |
| **EventType** | `rw_consumption`, `manual_consumption`, `adjustment`, `transfer`, `delivery`, `return`, `inventory`, `order_placed`, `order_received`, `manual_edit` | Zod | `apps/api/src/validators/okuc.ts:190` |
| **FILE_IMPORT_TYPE** | `uzyte_bele`, `ceny_pdf`, `dostawa_szkla`, `potwierdzenie_zamowienia` | const obj | `packages/shared/src/constants.ts:67` |
| **FilterByUser** | `true`, `false` | Zod | `apps/api/src/validators/operator-dashboard.ts:9` |
| **GlassCategory** | `standard`, `loose`, `aluminum`, `reclamation` | type | `apps/api/src/services/parsers/glass-delivery-csv-parser.ts:5` |
| **HealthStatus** | `ok`, `warning`, `error` | type | `apps/api/src/utils/healthChecks.ts:11` |
| **IMPORT_STATUS** | `pending`, `processing`, `completed`, `error`, `rejected` | const obj | `packages/shared/src/constants.ts:77` |
| **ImportFileType** | `uzyte_bele`, `ceny_pdf`, `unknown` | type | `apps/api/src/services/import/importValidationService.ts:30` |
| **IncludeOverdue** | `true`, `false` | Zod | `apps/api/src/validators/delivery.ts:27` |
| **InputMode** | `textarea`, `single` | Zod | `apps/api/src/validators/akrobud-verification.ts:47` |
| **ItemFlag** | `REQUIRES_MESH`, `MISSING_FILE`, `UNCONFIRMED`, `DIMENSIONS_UNCONFIRMED`, `DRAWING_UNCONFIRMED`, `EXCLUDE_FROM_PRODUCTION`, `SPECIAL_HANDLE`, `CUSTOM_COLOR` | Zod | `apps/api/src/validators/logistics.ts:15` |
| **ItemStatus** | `ok`, `blocked`, `waiting`, `excluded` | Zod | `apps/api/src/validators/logistics.ts:27` |
| **LabelCheckResultStatus** | `OK`, `MISMATCH`, `NO_FOLDER`, `NO_BMP`, `OCR_ERROR` | Zod, Prisma | `apps/api/src/validators/label-check.ts:30`, `apps/api/prisma/schema.prisma:1972` |
| **LabelCheckResultStatus** | `OK`, `MISMATCH`, `NO_FOLDER`, `NO_BMP`, `OCR_ERROR`, `SKIPPED` | type | `apps/api/src/services/label-check/LabelCheckService.ts:20` |
| **LabelCheckStatus** | `pending`, `completed`, `failed` | Zod, Prisma | `apps/api/src/validators/label-check.ts:24`, `apps/api/prisma/schema.prisma:1946` |
| **LogisticsDecisionLog.entityType** | `item`, `delivery` | Prisma | `apps/api/prisma/schema.prisma:2075` |
| **LogLevel** | `debug`, `info`, `warn`, `error` | type | `apps/api/src/utils/logger.ts:8` |
| **ManualStatus** | `do_not_cut`, `cancelled`, `on_hold`, `complaint`, `service` | Zod | `apps/api/src/validators/order.ts:61` |
| **MatchStatus** | `found`, `variant_match`, `not_found` | type | `apps/api/src/services/akrobud-verification/utils/OrderNumberMatcher.ts:20` |
| **MaterialCategory** | `okno`, `montaz`, `dodatki`, `inne` | type | `apps/api/src/services/parsers/types.ts:36` |
| **OkucArticle.orderClass** | `typical`, `atypical` | Prisma | `apps/api/prisma/schema.prisma:1053` |
| **OkucArticle.orderUnit** | `piece`, `pack` | Prisma | `apps/api/prisma/schema.prisma:1057` |
| **OkucArticle.sizeClass** | `standard`, `gabarat` | Prisma | `apps/api/prisma/schema.prisma:1054` |
| **OkucDemand.source** | `order`, `csv_import` | Prisma | `apps/api/prisma/schema.prisma:1182` |
| **OkucDemand.status** | `pending`, `confirmed`, `in_production`, `completed`, `cancelled` | Prisma | `apps/api/prisma/schema.prisma:1181` |
| **OkucHistory.eventType** | `rw`, `manual_consumption`, `adjustment`, `return`, `inventory_count`, `transfer`, `order_received` | Prisma | `apps/api/prisma/schema.prisma:1265` |
| **OkucHistory.warehouseType** | `pvc`, `alu` | Prisma | `apps/api/prisma/schema.prisma:1263` |
| **OkucOrder.basketType** | `typical_standard`, `typical_gabarat`, `atypical` | Prisma | `apps/api/prisma/schema.prisma:1212` |
| **OkucOrder.status** | `draft`, `pending`, `ordered`, `in_transit`, `received`, `cancelled` | Prisma | `apps/api/prisma/schema.prisma:1213` |
| **OkucOrderStatus** | `draft`, `pending_approval`, `approved`, `sent`, `confirmed`, `in_transit`, `received`, `cancelled` | Zod | `apps/api/src/validators/okuc.ts:118` |
| **OkucProportion.proportionType** | `multiplier`, `split` | Prisma | `apps/api/prisma/schema.prisma:1127` |
| **OkucStock.subWarehouse** | `production`, `buffer`, `gabaraty` | Prisma | `apps/api/prisma/schema.prisma:1152` |
| **OkucStock.warehouseType** | `pvc`, `alu` | Prisma | `apps/api/prisma/schema.prisma:1151` |
| **ORDER_STATUS** | `new`, `in_progress`, `completed`, `archived` | const obj | `packages/shared/src/constants.ts:46` |
| **ORDER_STATUSES** | `new`, `in_progress`, `completed`, `archived` | const obj | `apps/api/src/utils/order-status-machine.ts:26` |
| **OrderClass** | `typical`, `atypical` | Zod | `apps/api/src/validators/okuc.ts:9` |
| **OrderMaterial.category** | `okno`, `montaz`, `dodatki`, `inne` | Prisma | `apps/api/prisma/schema.prisma:317` |
| **OrderUnit** | `piece`, `pack` | Zod | `apps/api/src/validators/okuc.ts:11` |
| **PALLET_TYPES** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` | const arr | `apps/api/src/services/palletStockService.ts:24` |
| **PalletAlertConfig.type** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` | Prisma | `apps/api/prisma/schema.prisma:1622` |
| **PalletDayStatus** | `OPEN`, `CLOSED` | Zod | `apps/api/src/validators/pallet-stock.ts:30` |
| **PalletInitialStock.type** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` | Prisma | `apps/api/prisma/schema.prisma:1633` |
| **PalletStockDay.status** | `OPEN`, `CLOSED` | Prisma | `apps/api/prisma/schema.prisma:1587` |
| **PalletStockEntry.type** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` | Prisma | `apps/api/prisma/schema.prisma:1603` |
| **POLISH_DAY_NAMES** | `Niedziela`, `Poniedziałek`, `Wtorek`, `Środa`, `Czwartek`, `Piątek`, `Sobota` | const arr | `apps/api/src/utils/date-helpers.ts:201` |
| **POLISH_MONTH_NAMES** | `Styczeń`, `Luty`, `Marzec`, `Kwiecień`, `Maj`, `Czerwiec`, `Lipiec`, `Sierpień`, `Wrzesień`, `Październik`, `Listopad`, `Grudzień` | const arr | `apps/api/src/utils/date-helpers.ts:214` |
| **Priority** | `critical`, `high`, `medium` | Zod | `apps/api/src/validators/operator-dashboard.ts:46` |
| **ProductionCalendar.dayType** | `working`, `holiday`, `production_saturday`, `custom_off` | Prisma | `apps/api/prisma/schema.prisma:1813` |
| **ProductionEfficiencyConfig.clientType** | `akrobud`, `ct`, `living`, `other` | Prisma | `apps/api/prisma/schema.prisma:1794` |
| **ProductionPalletType** | `MALA`, `P2400`, `P3000`, `P3500`, `P4000` | Zod | `apps/api/src/validators/pallet-stock.ts:17` |
| **PROFILE_NUMBERS** | `9016`, `8866`, `8869`, `9671`, `9677`, `9315` | const arr | `packages/shared/src/constants.ts:2` |
| **Profile.profileType** | `typical`, `atypical` | Prisma | `apps/api/prisma/schema.prisma:83` |
| **ProportionType** | `multiplier`, `split` | Zod | `apps/api/src/validators/okuc.ts:166` |
| **ReadinessCheckStatus** | `ok`, `warning`, `blocking` | type | `apps/api/src/services/readiness/types.ts:22` |
| **ReadinessModule** | `warehouse`, `glass`, `okuc`, `pallet`, `approval`, `variant` | type | `apps/api/src/services/readinessOrchestrator.ts:24` |
| **SchucoOrderItem.changeType** | `new`, `updated` | Prisma | `apps/api/prisma/schema.prisma:748` |
| **Severity** | `error`, `warning`, `info` | Zod | `apps/api/src/validators/glass.ts:40` |
| **SignalStatus** | `ok`, `warning`, `blocking` | type | `apps/api/src/services/readinessOrchestrator.ts:25` |
| **SizeClass** | `standard`, `gabarat` | Zod | `apps/api/src/validators/okuc.ts:10` |
| **SpecialType** | `drzwi`, `psk`, `hs`, `ksztalt` | Zod | `apps/api/src/validators/order.ts:73` |
| **Status** | `draft`, `verified`, `applied` | Zod | `apps/api/src/validators/akrobud-verification.ts:105` |
| **Status** | `planned`, `in_progress`, `completed` | Zod | `apps/api/src/validators/delivery.ts:21` |
| **Status** | `ordered`, `partially_delivered`, `delivered`, `cancelled` | Zod | `apps/api/src/validators/glass.ts:19` |
| **Status** | `pending`, `resolved`, `all` | Zod | `apps/api/src/validators/moja-praca.ts:9` |
| **Status** | `new`, `in_progress`, `completed`, `archived` | Zod | `apps/api/src/validators/order.ts:92` |
| **Status** | `pending`, `received`, `archived` | Zod | `apps/api/src/validators/warehouse.ts:20` |
| **SubWarehouse** | `production`, `buffer`, `gabaraty` | Zod | `apps/api/src/validators/okuc.ts:13` |
| **TimeEntry.absenceType** | `SICK`, `VACATION`, `ABSENT` | Prisma | `apps/api/prisma/schema.prisma:1502` |
| **Type** | `powder`, `ral`, `anodized` | Zod | `apps/api/src/validators/color.ts:19` |
| **Type** | `order_created`, `glass_status_changed`, `hardware_status_changed`, `delivery_assigned` | Zod | `apps/api/src/validators/operator-dashboard.ts:30` |
| **Type** | `missing_files`, `missing_glass`, `missing_hardware`, `pending_conflict` | Zod | `apps/api/src/validators/operator-dashboard.ts:45` |
| **UserRole** | `owner`, `admin`, `kierownik`, `ksiegowa`, `user` | TS enum | `packages/shared/src/types/user-roles.ts:9`, `apps/api/src/validators/auth.ts:8` |
| **VariantType** | `correction`, `additional_file` | Zod, type | `apps/api/src/validators/order.ts:143`, `apps/api/src/services/orderVariantService.ts:11` |
| **WarehouseType** | `pvc`, `alu` | Zod | `apps/api/src/validators/okuc.ts:12` |

---

## Status Enums

> Enumy opisujace stan/status encji (zlecenia, dostawy, importy itp.).

### AggregatedReadinessStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ready` | |
| `conditional` | |
| `blocked` | |
| `pending` | |

**Lokalizacja:** `apps/api/src/services/readiness/types.ts:58`
**Typ definicji:** type

---

### CalendarDayStatus

| Wartosc | Zrodlo |
|---------|--------|
| `empty` | |
| `open` | |
| `closed` | |

**Lokalizacja:** `apps/api/src/services/palletStockService.ts:57`
**Typ definicji:** type

---

### DAY_STATUS

| Wartosc | Zrodlo |
|---------|--------|
| `OPEN` | |
| `CLOSED` | |

**Lokalizacja:** `apps/api/src/services/palletStockService.ts:28`
**Typ definicji:** const obj

---

### DELIVERY_STATUSES

| Wartosc | Zrodlo |
|---------|--------|
| `planned` | |
| `in_progress` | |
| `completed` | |

**Lokalizacja:** `apps/api/src/utils/delivery-status-machine.ts:27`
**Typ definicji:** const obj

---

### DeliveryStatus

| Wartosc | Zrodlo |
|---------|--------|
| `planned` | |
| `in_preparation` | |
| `ready` | |
| `shipped` | |
| `delivered` | |

**Lokalizacja:** `apps/api/src/validators/dashboard.ts:13`, `packages/shared/src/constants.ts:56`
**Typ definicji:** Zod, const obj
**Nazwa w kodzie:** `deliveryStatusSchema`

---

### DeliveryStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ready` | |
| `blocked` | |
| `conditional` | |

**Lokalizacja:** `apps/api/src/validators/logistics.ts:30`
**Typ definicji:** Zod
**Nazwa w kodzie:** `deliveryStatusSchema`

---

### DemandStatus

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `confirmed` | |
| `in_production` | |
| `completed` | |
| `cancelled` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:78`
**Typ definicji:** Zod
**Nazwa w kodzie:** `demandStatusSchema`

---

### HealthStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ok` | |
| `warning` | |
| `error` | |

**Lokalizacja:** `apps/api/src/utils/healthChecks.ts:11`
**Typ definicji:** type

---

### IMPORT_STATUS

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `processing` | |
| `completed` | |
| `error` | |
| `rejected` | |

**Lokalizacja:** `packages/shared/src/constants.ts:77`
**Typ definicji:** const obj

---

### ItemStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ok` | |
| `blocked` | |
| `waiting` | |
| `excluded` | |

**Lokalizacja:** `apps/api/src/validators/logistics.ts:27`
**Typ definicji:** Zod
**Nazwa w kodzie:** `itemStatusSchema`

---

### LabelCheckResultStatus

| Wartosc | Zrodlo |
|---------|--------|
| `OK` | |
| `MISMATCH` | |
| `NO_FOLDER` | |
| `NO_BMP` | |
| `OCR_ERROR` | |

**Lokalizacja:** `apps/api/src/validators/label-check.ts:30`, `apps/api/prisma/schema.prisma:1972`
**Typ definicji:** Zod, Prisma
**Nazwa w kodzie:** `labelCheckResultStatusSchema`

---

### LabelCheckResultStatus

| Wartosc | Zrodlo |
|---------|--------|
| `OK` | |
| `MISMATCH` | |
| `NO_FOLDER` | |
| `NO_BMP` | |
| `OCR_ERROR` | |
| `SKIPPED` | |

**Lokalizacja:** `apps/api/src/services/label-check/LabelCheckService.ts:20`
**Typ definicji:** type

---

### LabelCheckStatus

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `completed` | |
| `failed` | |

**Lokalizacja:** `apps/api/src/validators/label-check.ts:24`, `apps/api/prisma/schema.prisma:1946`
**Typ definicji:** Zod, Prisma
**Nazwa w kodzie:** `labelCheckStatusSchema`

---

### ManualStatus

| Wartosc | Zrodlo |
|---------|--------|
| `do_not_cut` | |
| `cancelled` | |
| `on_hold` | |
| `complaint` | |
| `service` | |

**Lokalizacja:** `apps/api/src/validators/order.ts:61`
**Typ definicji:** Zod

---

### MatchStatus

| Wartosc | Zrodlo |
|---------|--------|
| `found` | |
| `variant_match` | |
| `not_found` | |

**Lokalizacja:** `apps/api/src/services/akrobud-verification/utils/OrderNumberMatcher.ts:20`
**Typ definicji:** type

---

### OkucDemand.status

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `confirmed` | |
| `in_production` | |
| `completed` | |
| `cancelled` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1181`
**Typ definicji:** Prisma

---

### OkucOrder.status

| Wartosc | Zrodlo |
|---------|--------|
| `draft` | |
| `pending` | |
| `ordered` | |
| `in_transit` | |
| `received` | |
| `cancelled` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1213`
**Typ definicji:** Prisma

---

### OkucOrderStatus

| Wartosc | Zrodlo |
|---------|--------|
| `draft` | |
| `pending_approval` | |
| `approved` | |
| `sent` | |
| `confirmed` | |
| `in_transit` | |
| `received` | |
| `cancelled` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:118`
**Typ definicji:** Zod
**Nazwa w kodzie:** `okucOrderStatusSchema`

---

### ORDER_STATUS

| Wartosc | Zrodlo |
|---------|--------|
| `new` | |
| `in_progress` | |
| `completed` | |
| `archived` | |

**Lokalizacja:** `packages/shared/src/constants.ts:46`
**Typ definicji:** const obj

---

### ORDER_STATUSES

| Wartosc | Zrodlo |
|---------|--------|
| `new` | |
| `in_progress` | |
| `completed` | |
| `archived` | |

**Lokalizacja:** `apps/api/src/utils/order-status-machine.ts:26`
**Typ definicji:** const obj

---

### PalletDayStatus

| Wartosc | Zrodlo |
|---------|--------|
| `OPEN` | |
| `CLOSED` | |

**Lokalizacja:** `apps/api/src/validators/pallet-stock.ts:30`
**Typ definicji:** Zod
**Nazwa w kodzie:** `PalletDayStatusSchema`

---

### PalletStockDay.status

| Wartosc | Zrodlo |
|---------|--------|
| `OPEN` | |
| `CLOSED` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1587`
**Typ definicji:** Prisma

---

### ReadinessCheckStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ok` | |
| `warning` | |
| `blocking` | |

**Lokalizacja:** `apps/api/src/services/readiness/types.ts:22`
**Typ definicji:** type

---

### SignalStatus

| Wartosc | Zrodlo |
|---------|--------|
| `ok` | |
| `warning` | |
| `blocking` | |

**Lokalizacja:** `apps/api/src/services/readinessOrchestrator.ts:25`
**Typ definicji:** type

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `draft` | |
| `verified` | |
| `applied` | |

**Lokalizacja:** `apps/api/src/validators/akrobud-verification.ts:105`
**Typ definicji:** Zod

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `planned` | |
| `in_progress` | |
| `completed` | |

**Lokalizacja:** `apps/api/src/validators/delivery.ts:21`
**Typ definicji:** Zod

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `ordered` | |
| `partially_delivered` | |
| `delivered` | |
| `cancelled` | |

**Lokalizacja:** `apps/api/src/validators/glass.ts:19`
**Typ definicji:** Zod

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `resolved` | |
| `all` | |

**Lokalizacja:** `apps/api/src/validators/moja-praca.ts:9`
**Typ definicji:** Zod

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `new` | |
| `in_progress` | |
| `completed` | |
| `archived` | |

**Lokalizacja:** `apps/api/src/validators/order.ts:92`
**Typ definicji:** Zod

---

### Status

| Wartosc | Zrodlo |
|---------|--------|
| `pending` | |
| `received` | |
| `archived` | |

**Lokalizacja:** `apps/api/src/validators/warehouse.ts:20`
**Typ definicji:** Zod

---

## Type / Classification Enums

> Enumy klasyfikujace typ, rodzaj, kategorie lub priorytet.

### AbsenceType

| Wartosc | Zrodlo |
|---------|--------|
| `SICK` | |
| `VACATION` | |
| `ABSENT` | |

**Lokalizacja:** `apps/api/src/validators/timesheets.ts:98`, `apps/api/src/validators/timesheets.ts:195`
**Typ definicji:** Zod
**Nazwa w kodzie:** `absenceTypeSchema`

---

### AlertPriority

| Wartosc | Zrodlo |
|---------|--------|
| `critical` | |
| `high` | |
| `medium` | |
| `low` | |

**Lokalizacja:** `apps/api/src/validators/dashboard.ts:11`
**Typ definicji:** Zod
**Nazwa w kodzie:** `alertPrioritySchema`

---

### AlertType

| Wartosc | Zrodlo |
|---------|--------|
| `shortage` | |
| `import` | |
| `delivery` | |

**Lokalizacja:** `apps/api/src/validators/dashboard.ts:12`
**Typ definicji:** Zod
**Nazwa w kodzie:** `alertTypeSchema`

---

### AttendanceType

| Wartosc | Zrodlo |
|---------|--------|
| `work` | |
| `sick` | |
| `vacation` | |
| `absent` | |

**Lokalizacja:** `apps/api/src/services/attendanceService.ts:10`
**Typ definicji:** type

---

### BasketType

| Wartosc | Zrodlo |
|---------|--------|
| `typical_standard` | |
| `typical_gabarat` | |
| `atypical` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:14`
**Typ definicji:** Zod
**Nazwa w kodzie:** `basketTypeSchema`

---

### ColorType

| Wartosc | Zrodlo |
|---------|--------|
| `typical` | |
| `atypical` | |

**Lokalizacja:** `packages/shared/src/types/colors.ts:1`
**Typ definicji:** type

---

### DayType

| Wartosc | Zrodlo |
|---------|--------|
| `working` | |
| `holiday` | |
| `production_saturday` | |
| `custom_off` | |

**Lokalizacja:** `apps/api/src/validators/productionPlanning.ts:48`
**Typ definicji:** Zod

---

### EventType

| Wartosc | Zrodlo |
|---------|--------|
| `rw_consumption` | |
| `manual_consumption` | |
| `adjustment` | |
| `transfer` | |
| `delivery` | |
| `return` | |
| `inventory` | |
| `order_placed` | |
| `order_received` | |
| `manual_edit` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:190`
**Typ definicji:** Zod
**Nazwa w kodzie:** `eventTypeSchema`

---

### FILE_IMPORT_TYPE

| Wartosc | Zrodlo |
|---------|--------|
| `uzyte_bele` | |
| `ceny_pdf` | |
| `dostawa_szkla` | |
| `potwierdzenie_zamowienia` | |

**Lokalizacja:** `packages/shared/src/constants.ts:67`
**Typ definicji:** const obj

---

### GlassCategory

| Wartosc | Zrodlo |
|---------|--------|
| `standard` | |
| `loose` | |
| `aluminum` | |
| `reclamation` | |

**Lokalizacja:** `apps/api/src/services/parsers/glass-delivery-csv-parser.ts:5`
**Typ definicji:** type

---

### ImportFileType

| Wartosc | Zrodlo |
|---------|--------|
| `uzyte_bele` | |
| `ceny_pdf` | |
| `unknown` | |

**Lokalizacja:** `apps/api/src/services/import/importValidationService.ts:30`
**Typ definicji:** type

---

### ItemFlag

| Wartosc | Zrodlo |
|---------|--------|
| `REQUIRES_MESH` | |
| `MISSING_FILE` | |
| `UNCONFIRMED` | |
| `DIMENSIONS_UNCONFIRMED` | |
| `DRAWING_UNCONFIRMED` | |
| `EXCLUDE_FROM_PRODUCTION` | |
| `SPECIAL_HANDLE` | |
| `CUSTOM_COLOR` | |

**Lokalizacja:** `apps/api/src/validators/logistics.ts:15`
**Typ definicji:** Zod
**Nazwa w kodzie:** `itemFlagSchema`

---

### LogisticsDecisionLog.entityType

| Wartosc | Zrodlo |
|---------|--------|
| `item` | |
| `delivery` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:2075`
**Typ definicji:** Prisma

---

### MaterialCategory

| Wartosc | Zrodlo |
|---------|--------|
| `okno` | |
| `montaz` | |
| `dodatki` | |
| `inne` | |

**Lokalizacja:** `apps/api/src/services/parsers/types.ts:36`
**Typ definicji:** type

---

### OkucArticle.orderClass

| Wartosc | Zrodlo |
|---------|--------|
| `typical` | |
| `atypical` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1053`
**Typ definicji:** Prisma

---

### OkucArticle.orderUnit

| Wartosc | Zrodlo |
|---------|--------|
| `piece` | |
| `pack` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1057`
**Typ definicji:** Prisma

---

### OkucArticle.sizeClass

| Wartosc | Zrodlo |
|---------|--------|
| `standard` | |
| `gabarat` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1054`
**Typ definicji:** Prisma

---

### OkucHistory.eventType

| Wartosc | Zrodlo |
|---------|--------|
| `rw` | |
| `manual_consumption` | |
| `adjustment` | |
| `return` | |
| `inventory_count` | |
| `transfer` | |
| `order_received` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1265`
**Typ definicji:** Prisma

---

### OkucHistory.warehouseType

| Wartosc | Zrodlo |
|---------|--------|
| `pvc` | |
| `alu` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1263`
**Typ definicji:** Prisma

---

### OkucOrder.basketType

| Wartosc | Zrodlo |
|---------|--------|
| `typical_standard` | |
| `typical_gabarat` | |
| `atypical` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1212`
**Typ definicji:** Prisma

---

### OkucProportion.proportionType

| Wartosc | Zrodlo |
|---------|--------|
| `multiplier` | |
| `split` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1127`
**Typ definicji:** Prisma

---

### OkucStock.warehouseType

| Wartosc | Zrodlo |
|---------|--------|
| `pvc` | |
| `alu` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1151`
**Typ definicji:** Prisma

---

### OrderClass

| Wartosc | Zrodlo |
|---------|--------|
| `typical` | |
| `atypical` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:9`
**Typ definicji:** Zod
**Nazwa w kodzie:** `orderClassSchema`

---

### OrderMaterial.category

| Wartosc | Zrodlo |
|---------|--------|
| `okno` | |
| `montaz` | |
| `dodatki` | |
| `inne` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:317`
**Typ definicji:** Prisma

---

### OrderUnit

| Wartosc | Zrodlo |
|---------|--------|
| `piece` | |
| `pack` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:11`
**Typ definicji:** Zod
**Nazwa w kodzie:** `orderUnitSchema`

---

### PALLET_TYPES

| Wartosc | Zrodlo |
|---------|--------|
| `MALA` | |
| `P2400` | |
| `P3000` | |
| `P3500` | |
| `P4000` | |

**Lokalizacja:** `apps/api/src/services/palletStockService.ts:24`
**Typ definicji:** const arr

---

### PalletAlertConfig.type

| Wartosc | Zrodlo |
|---------|--------|
| `MALA` | |
| `P2400` | |
| `P3000` | |
| `P3500` | |
| `P4000` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1622`
**Typ definicji:** Prisma

---

### PalletInitialStock.type

| Wartosc | Zrodlo |
|---------|--------|
| `MALA` | |
| `P2400` | |
| `P3000` | |
| `P3500` | |
| `P4000` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1633`
**Typ definicji:** Prisma

---

### PalletStockEntry.type

| Wartosc | Zrodlo |
|---------|--------|
| `MALA` | |
| `P2400` | |
| `P3000` | |
| `P3500` | |
| `P4000` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1603`
**Typ definicji:** Prisma

---

### Priority

| Wartosc | Zrodlo |
|---------|--------|
| `critical` | |
| `high` | |
| `medium` | |

**Lokalizacja:** `apps/api/src/validators/operator-dashboard.ts:46`
**Typ definicji:** Zod

---

### ProductionCalendar.dayType

| Wartosc | Zrodlo |
|---------|--------|
| `working` | |
| `holiday` | |
| `production_saturday` | |
| `custom_off` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1813`
**Typ definicji:** Prisma

---

### ProductionEfficiencyConfig.clientType

| Wartosc | Zrodlo |
|---------|--------|
| `akrobud` | |
| `ct` | |
| `living` | |
| `other` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1794`
**Typ definicji:** Prisma

---

### ProductionPalletType

| Wartosc | Zrodlo |
|---------|--------|
| `MALA` | |
| `P2400` | |
| `P3000` | |
| `P3500` | |
| `P4000` | |

**Lokalizacja:** `apps/api/src/validators/pallet-stock.ts:17`
**Typ definicji:** Zod
**Nazwa w kodzie:** `ProductionPalletTypeSchema`

---

### Profile.profileType

| Wartosc | Zrodlo |
|---------|--------|
| `typical` | |
| `atypical` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:83`
**Typ definicji:** Prisma

---

### ProportionType

| Wartosc | Zrodlo |
|---------|--------|
| `multiplier` | |
| `split` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:166`
**Typ definicji:** Zod
**Nazwa w kodzie:** `proportionTypeSchema`

---

### SchucoOrderItem.changeType

| Wartosc | Zrodlo |
|---------|--------|
| `new` | |
| `updated` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:748`
**Typ definicji:** Prisma

---

### Severity

| Wartosc | Zrodlo |
|---------|--------|
| `error` | |
| `warning` | |
| `info` | |

**Lokalizacja:** `apps/api/src/validators/glass.ts:40`
**Typ definicji:** Zod

---

### SizeClass

| Wartosc | Zrodlo |
|---------|--------|
| `standard` | |
| `gabarat` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:10`
**Typ definicji:** Zod
**Nazwa w kodzie:** `sizeClassSchema`

---

### SpecialType

| Wartosc | Zrodlo |
|---------|--------|
| `drzwi` | |
| `psk` | |
| `hs` | |
| `ksztalt` | |

**Lokalizacja:** `apps/api/src/validators/order.ts:73`
**Typ definicji:** Zod

---

### TimeEntry.absenceType

| Wartosc | Zrodlo |
|---------|--------|
| `SICK` | |
| `VACATION` | |
| `ABSENT` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1502`
**Typ definicji:** Prisma

---

### Type

| Wartosc | Zrodlo |
|---------|--------|
| `powder` | |
| `ral` | |
| `anodized` | |

**Lokalizacja:** `apps/api/src/validators/color.ts:19`
**Typ definicji:** Zod

---

### Type

| Wartosc | Zrodlo |
|---------|--------|
| `order_created` | |
| `glass_status_changed` | |
| `hardware_status_changed` | |
| `delivery_assigned` | |

**Lokalizacja:** `apps/api/src/validators/operator-dashboard.ts:30`
**Typ definicji:** Zod

---

### Type

| Wartosc | Zrodlo |
|---------|--------|
| `missing_files` | |
| `missing_glass` | |
| `missing_hardware` | |
| `pending_conflict` | |

**Lokalizacja:** `apps/api/src/validators/operator-dashboard.ts:45`
**Typ definicji:** Zod

---

### VariantType

| Wartosc | Zrodlo |
|---------|--------|
| `correction` | |
| `additional_file` | |

**Lokalizacja:** `apps/api/src/validators/order.ts:143`, `apps/api/src/services/orderVariantService.ts:11`
**Typ definicji:** Zod, type

---

### WarehouseType

| Wartosc | Zrodlo |
|---------|--------|
| `pvc` | |
| `alu` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:12`
**Typ definicji:** Zod
**Nazwa w kodzie:** `warehouseTypeSchema`

---

## Role Enums

> Enumy ról uzytkownikow i uprawnien.

### UserRole

| Wartosc | Zrodlo |
|---------|--------|
| `owner` | |
| `admin` | |
| `kierownik` | |
| `ksiegowa` | |
| `user` | |

**Lokalizacja:** `packages/shared/src/types/user-roles.ts:9`, `apps/api/src/validators/auth.ts:8`
**Typ definicji:** TS enum

---

## Other Enums

> Pozostale enumy i stale (kolory, profile, flagi itp.).

### Action

| Wartosc | Zrodlo |
|---------|--------|
| `keep_first` | |
| `keep_last` | |
| `keep_all` | |
| `remove_all` | |

**Lokalizacja:** `apps/api/src/validators/akrobud-verification.ts:90`
**Typ definicji:** Zod

---

### Action

| Wartosc | Zrodlo |
|---------|--------|
| `overwrite` | |
| `add_new` | |

**Lokalizacja:** `apps/api/src/validators/import.ts:15`
**Typ definicji:** Zod

---

### Action

| Wartosc | Zrodlo |
|---------|--------|
| `replace_base` | |
| `replace_variant` | |
| `keep_both` | |
| `cancel` | |

**Lokalizacja:** `apps/api/src/validators/moja-praca.ts:35`, `apps/api/src/validators/moja-praca.ts:46`
**Typ definicji:** Zod

---

### ConflictResolution

| Wartosc | Zrodlo |
|---------|--------|
| `skip` | |
| `overwrite` | |
| `selective` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:267`
**Typ definicji:** Zod

---

### DeliveryNumber

| Wartosc | Zrodlo |
|---------|--------|
| `I` | |
| `II` | |
| `III` | |

**Lokalizacja:** `apps/api/src/validators/import.ts:21`, `apps/api/src/validators/import.ts:37`, `apps/api/src/services/file-watcher/types.ts:48`
**Typ definicji:** Zod, type

---

### DemandSource

| Wartosc | Zrodlo |
|---------|--------|
| `order` | |
| `csv_import` | |
| `manual` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:86`
**Typ definicji:** Zod
**Nazwa w kodzie:** `demandSourceSchema`

---

### FilterByUser

| Wartosc | Zrodlo |
|---------|--------|
| `true` | |
| `false` | |

**Lokalizacja:** `apps/api/src/validators/operator-dashboard.ts:9`
**Typ definicji:** Zod

---

### IncludeOverdue

| Wartosc | Zrodlo |
|---------|--------|
| `true` | |
| `false` | |

**Lokalizacja:** `apps/api/src/validators/delivery.ts:27`
**Typ definicji:** Zod

---

### InputMode

| Wartosc | Zrodlo |
|---------|--------|
| `textarea` | |
| `single` | |

**Lokalizacja:** `apps/api/src/validators/akrobud-verification.ts:47`
**Typ definicji:** Zod

---

### LogLevel

| Wartosc | Zrodlo |
|---------|--------|
| `debug` | |
| `info` | |
| `warn` | |
| `error` | |

**Lokalizacja:** `apps/api/src/utils/logger.ts:8`
**Typ definicji:** type

---

### OkucDemand.source

| Wartosc | Zrodlo |
|---------|--------|
| `order` | |
| `csv_import` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1182`
**Typ definicji:** Prisma

---

### OkucStock.subWarehouse

| Wartosc | Zrodlo |
|---------|--------|
| `production` | |
| `buffer` | |
| `gabaraty` | |

**Lokalizacja:** `apps/api/prisma/schema.prisma:1152`
**Typ definicji:** Prisma

---

### POLISH_DAY_NAMES

| Wartosc | Zrodlo |
|---------|--------|
| `Niedziela` | |
| `Poniedziałek` | |
| `Wtorek` | |
| `Środa` | |
| `Czwartek` | |
| `Piątek` | |
| `Sobota` | |

**Lokalizacja:** `apps/api/src/utils/date-helpers.ts:201`
**Typ definicji:** const arr

---

### POLISH_MONTH_NAMES

| Wartosc | Zrodlo |
|---------|--------|
| `Styczeń` | |
| `Luty` | |
| `Marzec` | |
| `Kwiecień` | |
| `Maj` | |
| `Czerwiec` | |
| `Lipiec` | |
| `Sierpień` | |
| `Wrzesień` | |
| `Październik` | |
| `Listopad` | |
| `Grudzień` | |

**Lokalizacja:** `apps/api/src/utils/date-helpers.ts:214`
**Typ definicji:** const arr

---

### PROFILE_NUMBERS

| Wartosc | Zrodlo |
|---------|--------|
| `9016` | |
| `8866` | |
| `8869` | |
| `9671` | |
| `9677` | |
| `9315` | |

**Lokalizacja:** `packages/shared/src/constants.ts:2`
**Typ definicji:** const arr

---

### ReadinessModule

| Wartosc | Zrodlo |
|---------|--------|
| `warehouse` | |
| `glass` | |
| `okuc` | |
| `pallet` | |
| `approval` | |
| `variant` | |

**Lokalizacja:** `apps/api/src/services/readinessOrchestrator.ts:24`
**Typ definicji:** type

---

### SubWarehouse

| Wartosc | Zrodlo |
|---------|--------|
| `production` | |
| `buffer` | |
| `gabaraty` | |

**Lokalizacja:** `apps/api/src/validators/okuc.ts:13`
**Typ definicji:** Zod
**Nazwa w kodzie:** `subWarehouseSchema`

---

## Podsumowanie Zrodel

| Lokalizacja | Enumy |
|-------------|-------|
| `apps/api/prisma/schema.prisma` | LabelCheckResultStatus, LabelCheckStatus, LogisticsDecisionLog.entityType, OkucArticle.orderClass, OkucArticle.orderUnit, OkucArticle.sizeClass, OkucDemand.source, OkucDemand.status, OkucHistory.eventType, OkucHistory.warehouseType, OkucOrder.basketType, OkucOrder.status, OkucProportion.proportionType, OkucStock.subWarehouse, OkucStock.warehouseType, OrderMaterial.category, PalletAlertConfig.type, PalletInitialStock.type, PalletStockDay.status, PalletStockEntry.type, ProductionCalendar.dayType, ProductionEfficiencyConfig.clientType, Profile.profileType, SchucoOrderItem.changeType, TimeEntry.absenceType |
| `apps/api/src/services/akrobud-verification/utils/OrderNumberMatcher.ts` | MatchStatus |
| `apps/api/src/services/attendanceService.ts` | AttendanceType |
| `apps/api/src/services/file-watcher/types.ts` | DeliveryNumber |
| `apps/api/src/services/import/importValidationService.ts` | ImportFileType |
| `apps/api/src/services/label-check/LabelCheckService.ts` | LabelCheckResultStatus |
| `apps/api/src/services/orderVariantService.ts` | VariantType |
| `apps/api/src/services/palletStockService.ts` | CalendarDayStatus, DAY_STATUS, PALLET_TYPES |
| `apps/api/src/services/parsers/glass-delivery-csv-parser.ts` | GlassCategory |
| `apps/api/src/services/parsers/types.ts` | MaterialCategory |
| `apps/api/src/services/readiness/types.ts` | AggregatedReadinessStatus, ReadinessCheckStatus |
| `apps/api/src/services/readinessOrchestrator.ts` | ReadinessModule, SignalStatus |
| `apps/api/src/utils/date-helpers.ts` | POLISH_DAY_NAMES, POLISH_MONTH_NAMES |
| `apps/api/src/utils/delivery-status-machine.ts` | DELIVERY_STATUSES |
| `apps/api/src/utils/healthChecks.ts` | HealthStatus |
| `apps/api/src/utils/logger.ts` | LogLevel |
| `apps/api/src/utils/order-status-machine.ts` | ORDER_STATUSES |
| `apps/api/src/validators/akrobud-verification.ts` | Action, InputMode, Status |
| `apps/api/src/validators/auth.ts` | UserRole |
| `apps/api/src/validators/color.ts` | Type |
| `apps/api/src/validators/dashboard.ts` | AlertPriority, AlertType, DeliveryStatus |
| `apps/api/src/validators/delivery.ts` | IncludeOverdue, Status |
| `apps/api/src/validators/glass.ts` | Severity, Status |
| `apps/api/src/validators/import.ts` | Action, DeliveryNumber |
| `apps/api/src/validators/label-check.ts` | LabelCheckResultStatus, LabelCheckStatus |
| `apps/api/src/validators/logistics.ts` | DeliveryStatus, ItemFlag, ItemStatus |
| `apps/api/src/validators/moja-praca.ts` | Action, Status |
| `apps/api/src/validators/okuc.ts` | BasketType, ConflictResolution, DemandSource, DemandStatus, EventType, OkucOrderStatus, OrderClass, OrderUnit, ProportionType, SizeClass, SubWarehouse, WarehouseType |
| `apps/api/src/validators/operator-dashboard.ts` | FilterByUser, Priority, Type |
| `apps/api/src/validators/order.ts` | ManualStatus, SpecialType, Status, VariantType |
| `apps/api/src/validators/pallet-stock.ts` | PalletDayStatus, ProductionPalletType |
| `apps/api/src/validators/productionPlanning.ts` | DayType |
| `apps/api/src/validators/timesheets.ts` | AbsenceType |
| `apps/api/src/validators/warehouse.ts` | Status |
| `packages/shared/src/constants.ts` | DeliveryStatus, FILE_IMPORT_TYPE, IMPORT_STATUS, ORDER_STATUS, PROFILE_NUMBERS |
| `packages/shared/src/types/colors.ts` | ColorType |
| `packages/shared/src/types/user-roles.ts` | UserRole |
