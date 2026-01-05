# FAZA 2 - DATA INTEGRITY FIXES

**Data:** 2025-12-29
**Status:** 🟡 IN PROGRESS
**Priority:** P1 (Data Loss Prevention)

---

## 🎯 CEL

Zabezpieczenie integralności danych przez:
1. Dodanie polityk `onDelete` do kluczy obcych
2. Dodanie unique constraints gdzie potrzebne
3. Implementacja optimistic locking z retry logic
4. Dodanie transaction wrappers
5. Walidacja parseInt w całym kodzie

---

## 📋 ANALIZA SCHEMA

### ❌ PROBLEM #1: Missing onDelete Policies - HIGH PRIORITY

**Identyfikowane modele bez onDelete:**

#### 1.1 OrderRequirement → Color/Profile (Lines 131-132)
```prisma
color   Color   @relation(fields: [colorId], references: [id])     // ❌ Missing onDelete
profile Profile @relation(fields: [profileId], references: [id])   // ❌ Missing onDelete
```

**Ryzyko:** Przy usunięciu Color/Profile - orphaned OrderRequirement records
**Fix:** Dodać `onDelete: Cascade` lub `onDelete: Restrict`

#### 1.2 DeliveryOrder → Order (Line 247)
```prisma
order Order @relation(fields: [orderId], references: [id])  // ❌ Missing onDelete
```

**Ryzyko:** Przy usunięciu Order - orphaned DeliveryOrder
**Fix:** Dodać `onDelete: Cascade`

#### 1.3 WarehouseStock → Color/Profile (Lines 169-170)
```prisma
color   Color   @relation(fields: [colorId], references: [id])     // ❌ Missing onDelete
profile Profile @relation(fields: [profileId], references: [id])   // ❌ Missing onDelete
```

**Ryzyko:** Usunięcie Color/Profile usuwa stock - CRITICAL DATA LOSS
**Fix:** Dodać `onDelete: Restrict` (nie pozwalaj usuwać używanych)

#### 1.4 WarehouseOrder → Color/Profile (Lines 189-190)
```prisma
color   Color   @relation(fields: [colorId], references: [id])     // ❌ Missing onDelete
profile Profile @relation(fields: [profileId], references: [id])   // ❌ Missing onDelete
```

**Ryzyko:** Orphaned warehouse orders
**Fix:** Dodać `onDelete: Restrict`

#### 1.5 WarehouseHistory → Color/Profile (Lines 212-213)
```prisma
color   Color   @relation(fields: [colorId], references: [id])     // ❌ Missing onDelete
profile Profile @relation(fields: [profileId], references: [id])   // ❌ Missing onDelete
```

**Ryzyko:** Strata historii magazynowej
**Fix:** Dodać `onDelete: Restrict` (zachowaj historię)

#### 1.6 GlassDeliveryItem → GlassOrder (Line 662)
```prisma
glassOrder GlassOrder? @relation(fields: [glassOrderId], references: [id])  // ❌ Missing onDelete
```

**Ryzyko:** Orphaned delivery items
**Fix:** Dodać `onDelete: SetNull` (bo nullable)

#### 1.7 GlassOrderItem → Order (Line 684)
```prisma
order Order? @relation(fields: [orderNumber], references: [orderNumber], onDelete: Cascade)
```

**Status:** ✅ MA Cascade, ale FOREIGN KEY na orderNumber (String) zamiast ID - potencjalny problem wydajności

#### 1.8 MonthlyReportItem → Order (Line 610)
```prisma
order Order @relation(fields: [orderId], references: [id])  // ❌ Missing onDelete
```

**Ryzyko:** Orphaned report items przy usunięciu order
**Fix:** Dodać `onDelete: Restrict` (nie pozwalaj usuwać zarchiwizowanych orders)

---

### ❌ PROBLEM #2: Missing Unique Constraints - MEDIUM PRIORITY

#### 2.1 WarehouseOrder - Brak unique constraint
```prisma
model WarehouseOrder {
  profileId Int
  colorId   Int
  // ❌ BRAK @@unique([profileId, colorId, expectedDeliveryDate])
}
```

**Ryzyko:** Duplikaty zamówień magazynowych
**Fix:** Dodać `@@unique([profileId, colorId, expectedDeliveryDate])`

#### 2.2 GlassDeliveryItem - Brak unique constraint
```prisma
model GlassDeliveryItem {
  glassDeliveryId Int
  position        String
  // ❌ BRAK @@unique([glassDeliveryId, position])
}
```

**Ryzyko:** Duplikaty pozycji w dostawie
**Fix:** Dodać `@@unique([glassDeliveryId, position])`

#### 2.3 GlassOrderItem - Brak unique constraint
```prisma
model GlassOrderItem {
  glassOrderId Int
  position     String
  // ❌ BRAK @@unique([glassOrderId, position])
}
```

**Ryzyko:** Duplikaty pozycji w zamówieniu
**Fix:** Dodać `@@unique([glassOrderId, position])`

---

### ❌ PROBLEM #3: Optimistic Locking - CRITICAL

**Tylko WarehouseStock ma `version` field (line 167):**
```prisma
model WarehouseStock {
  version Int @default(0)  // ✅ Jest!
}
```

**Ale brakuje w kodzie:**
- ❌ Retry logic przy conflict
- ❌ Proper error handling dla version mismatch
- ❌ Transaction wrapper

**Pliki do naprawy:**
- `apps/api/src/services/warehouseService.ts` - updateStock method
- `apps/api/src/repositories/WarehouseRepository.ts` - update operations

---

### ❌ PROBLEM #4: Transaction Wrappers - HIGH PRIORITY

**Miejsca wymagające transakcji:**

#### 4.1 deliveryService.ts - createDelivery
```typescript
// Tworzy Delivery + DeliveryOrders + DeliveryItems
// ❌ BRAK transaction wrapper
```

#### 4.2 importService.ts - processImport
```typescript
// Tworzy FileImport + Orders + OrderRequirements
// ❌ BRAK transaction wrapper
```

#### 4.3 warehouseService.ts - recordHistory
```typescript
// Aktualizuje WarehouseStock + tworzy WarehouseHistory
// ❌ BRAK transaction wrapper (partial updates możliwe!)
```

#### 4.4 glassDeliveryService.ts - createGlassDelivery
```typescript
// Tworzy GlassDelivery + GlassDeliveryItems
// ❌ BRAK transaction wrapper
```

#### 4.5 schucoService.ts - storeDeliveries
```typescript
// Bulk insert SchucoDelivery records
// ❌ BRAK transaction wrapper
```

---

### ❌ PROBLEM #5: parseInt Validation - MEDIUM PRIORITY

**Grep results pokazują 10+ miejsc gdzie używane jest parseInt bez walidacji:**

Przykłady do naprawy:
```typescript
// ❌ Może zwrócić NaN
const id = parseInt(req.params.id);

// ✅ Powinno być:
const id = parseInt(req.params.id, 10);
if (isNaN(id)) {
  throw new ValidationError('Invalid ID');
}
```

**Pliki do sprawdzenia:**
- `apps/api/src/handlers/*.ts` - wszystkie handlers z params
- `apps/api/src/services/*.ts` - parsowanie user input

---

## 📊 PRIORYTET NAPRAW

### P1 - CRITICAL (Rozpocznij teraz)
1. ✅ WarehouseStock/WarehouseHistory onDelete: Restrict (data loss prevention)
2. ✅ WarehouseOrder onDelete: Restrict
3. ✅ Optimistic locking retry logic w warehouseService
4. ✅ Transaction wrapper dla warehouse operations

### P2 - HIGH (Następny krok)
5. ✅ OrderRequirement onDelete policies
6. ✅ DeliveryOrder onDelete: Cascade
7. ✅ Transaction wrappers dla delivery/import services
8. ✅ MonthlyReportItem onDelete: Restrict

### P3 - MEDIUM (Gdy P1+P2 gotowe)
9. ✅ GlassDeliveryItem/GlassOrderItem unique constraints
10. ✅ WarehouseOrder unique constraint
11. ✅ parseInt validation w handlers

---

## 🚀 PLAN IMPLEMENTACJI

### Krok 1: Schema Updates (Migration)
```bash
# Utworzenie nowej migracji z onDelete policies
apps/api/prisma/migrations/20251229100000_add_ondelete_policies/migration.sql
```

### Krok 2: Service Layer Updates
- Dodanie optimistic locking retry w WarehouseRepository
- Dodanie transaction wrappers w services
- Dodanie parseInt validation helpers

### Krok 3: Testing
- Unit tests dla retry logic
- Integration tests dla transactions
- Manual testing critical paths

---

## ⚠️ DECYZJE WYMAGANE

### Pytanie 1: onDelete policy dla OrderRequirement → Color/Profile
**Opcje:**
- A) `onDelete: Restrict` - nie pozwalaj usuwać używanych Colors/Profiles ✅ BEZPIECZNIEJSZE
- B) `onDelete: Cascade` - usuń wszystkie requirements przy usunięciu Color/Profile ❌ RYZYKOWNE

**Zalecenie:** OPTION A

### Pytanie 2: onDelete policy dla MonthlyReportItem → Order
**Opcje:**
- A) `onDelete: Restrict` - nie pozwalaj usuwać Orders w raportach ✅ BEZPIECZNE
- B) `onDelete: SetNull` - zachowaj item, usuń reference ❌ Straci dane

**Zalecenie:** OPTION A

### Pytanie 3: Unique constraint dla WarehouseOrder
**Opcje:**
- A) `@@unique([profileId, colorId, expectedDeliveryDate])` ✅ Zapobiega duplikatom
- B) Brak constraint ❌ Możliwe duplikaty

**Zalecenie:** OPTION A

---

## 📝 NASTĘPNE KROKI

1. ✅ Uzyskaj potwierdzenie decyzji od użytkownika
2. ⏳ Rozpocznij implementację P1 fixes
3. ⏳ Testy i weryfikacja
4. ⏳ Deploy do dev environment

---

**Estimated Time:** 2-3 godziny (z testami)
**Risk Level:** 🟡 MEDIUM (schema changes wymagają ostrożności)
