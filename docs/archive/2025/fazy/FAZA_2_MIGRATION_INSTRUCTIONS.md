# FAZA 2 - Instrukcje Migracji

**Data:** 2025-12-29
**Status:** ⏳ OCZEKUJE NA APLIKACJĘ

---

## ✅ CO ZOSTAŁO ZROBIONE

1. **Schema.prisma zaktualizowane** z następującymi zmianami:
   - ✅ OrderRequirement → Color/Profile: `onDelete: Restrict`
   - ✅ WarehouseStock → Color/Profile: `onDelete: Restrict`
   - ✅ WarehouseOrder → Color/Profile: `onDelete: Restrict`
   - ✅ WarehouseOrder: Dodano `@@unique([profileId, colorId, expectedDeliveryDate])`
   - ✅ WarehouseHistory → Color/Profile: `onDelete: Restrict`
   - ✅ DeliveryOrder → Order: `onDelete: Cascade`
   - ✅ GlassDeliveryItem → GlassOrder: `onDelete: SetNull`
   - ✅ GlassDeliveryItem: Dodano `@@unique([glassDeliveryId, position])`
   - ✅ GlassOrderItem: Dodano `@@unique([glassOrderId, position])`
   - ✅ MonthlyReportItem → Order: `onDelete: Restrict`

---

## 📋 NASTĘPNE KROKI - MUSISZ WYKONAĆ MANUALNIE

Prisma migrate nie działa w non-interactive environment (hooks blokują). Musisz zastosować migrację manualnie:

### OPTION 1: Przez Prisma CLI (ZALECANE)

```bash
cd apps/api
npx prisma migrate dev --name add_data_integrity_policies
```

Gdy zapyta o reset shadow database - wybierz **Yes** (y).

### OPTION 2: Przez Prisma Studio

1. Otwórz: `npx prisma studio`
2. Użyj SQL Console do wykonania manual migration

### OPTION 3: Przez `prisma db push` (SZYBKIE, ale bez historii migracji)

```bash
cd apps/api
npx prisma db push
```

**UWAGA:** To pominie historię migracji, ale zastosuje zmiany schema.

---

## 🔍 WERYFIKACJA

Po zastosowaniu migracji, zweryfikuj zmiany:

### 1. Sprawdź Foreign Keys

```bash
cd apps/api
npx prisma db execute --stdin <<< "
SELECT sql FROM sqlite_master
WHERE type='table' AND name='warehouse_stock';
"
```

Powinno zawierać `ON DELETE RESTRICT` dla color_id i profile_id.

### 2. Sprawdź Unique Constraints

```sql
-- WarehouseOrder unique constraint
SELECT sql FROM sqlite_master
WHERE type='index' AND name LIKE 'warehouse_orders%unique%';

-- GlassDeliveryItem unique constraint
SELECT sql FROM sqlite_master
WHERE type='index' AND name LIKE 'glass_delivery_items%unique%';

-- GlassOrderItem unique constraint
SELECT sql FROM sqlite_master
WHERE type='index' AND name LIKE 'glass_order_items%unique%';
```

### 3. Test Foreign Key Constraints

```bash
# Próba usunięcia Color używanego w WarehouseStock powinna zostać zablokowana
# To powinno rzucić błąd: FOREIGN KEY constraint failed
```

---

## ⚠️ OCZEKIWANE EFEKTY MIGRACJI

### Bezpieczeństwo Danych

1. **Nie można usunąć Color/Profile używanych w:**
   - OrderRequirement
   - WarehouseStock
   - WarehouseOrder
   - WarehouseHistory

2. **Cascade delete działa dla:**
   - Order → DeliveryOrder (usunięcie Order usuwa delivery orders)
   - GlassOrder → GlassDeliveryItem (SetNull - zachowuje item, usuwa FK)

3. **Nie można tworzyć duplikatów:**
   - WarehouseOrder: ten sam profile+color+date
   - GlassDeliveryItem: ta sama delivery+position
   - GlassOrderItem: ten sam order+position

---

## 📊 CO DALEJ (Po migracji)

Gdy migracja zostanie zastosowana, następne zadania to:

### P1 - Optimistic Locking (HIGH)
- Implementacja retry logic w WarehouseRepository
- Transaction wrapper dla warehouse operations

### P2 - Transaction Wrappers (HIGH)
- deliveryService.createDelivery
- importService.processImport
- warehouseService.recordHistory
- glassDeliveryService.createGlassDelivery

### P3 - parseInt Validation (MEDIUM)
- Dodanie validation helpers
- Refactoring handlers z parseInt

---

## ❓ PYTANIA

**Q: Czy mogę pominąć migrację i użyć tylko `db push`?**
A: Tak, ale stracisz historię migracji. Dla dev OK, dla production NIE.

**Q: Co jeśli migracja się nie powiedzie?**
A: Sprawdź czy masz duplikaty danych (np. 2x warehouse order z tym samym profile+color+date). Usuń duplikaty przed migracją.

**Q: Czy muszę zatrzymać serwery przed migracją?**
A: Tak, zatrzymaj `pnpm dev` przed zastosowaniem migracji.

---

**Daj znać gdy zastosowałeś migrację - wtedy przejdę do kolejnych kroków FAZY 2.**
