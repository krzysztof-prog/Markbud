# Plan naprawy krytycznych problemów - Security & Database

**Data:** 2025-12-30
**Priorytet:** KRYTYCZNY
**Szacowany czas:** 3-4 godziny

---

## 📋 Podsumowanie problemów

### 1. Settings.ts Security ⚠️ CZĘŚCIOWO ZABEZPIECZONE
**Status:** Podstawowa walidacja istnieje, ale wymaga ulepszeń
**Czas:** 30 minut

### 2. Database Schema Issues 🔴 KRYTYCZNE
**Status:** Wymaga migracji
**Czas:** 2-3 godziny

---

## 1️⃣ Settings.ts Security Fix

### Obecny stan ✅ (linie 82-98)

**Co już jest zrobione:**
```typescript
// ✅ Path normalizacja
const normalizedPath = path.resolve(path.normalize(requestedPath));

// ✅ Sprawdzenie .. sekwencji
if (normalizedPath.includes('..') || normalizedPath !== path.normalize(normalizedPath)) {
  return reply.status(400).send({ error: 'Nieprawidłowa ścieżka' });
}

// ✅ Blokada systemowych ścieżek Windows
const blockedPaths = [
  'C:\\Windows\\System32',
  'C:\\Windows\\SysWOW64',
  'C:\\Program Files\\WindowsApps',
  'C:\\$Windows.~BT',
  'C:\\$Windows.~WS',
];
```

### Co wymaga poprawy ⚠️

#### Problem 1: Słaba walidacja path traversal
```typescript
// ❌ PROBLEM: normalizedPath.includes('..') może być obejścia
if (normalizedPath.includes('..') || normalizedPath !== path.normalize(normalizedPath)) {
  return reply.status(400).send({ error: 'Nieprawidłowa ścieżka' });
}
```

**Rozwiązanie:**
```typescript
// ✅ LEPSZE: Sprawdź czy ścieżka nie wychodzi poza dozwolone dyski
const allowedDrives = ['C:\\', 'D:\\', 'E:\\', 'F:\\', 'G:\\'];
const isDriveAllowed = allowedDrives.some(drive =>
  normalizedPath.toUpperCase().startsWith(drive.toUpperCase())
);

if (!isDriveAllowed) {
  return reply.status(403).send({ error: 'Dostęp tylko do lokalnych dysków' });
}
```

#### Problem 2: Niepełna lista blocked paths
```typescript
// ⚠️ PROBLEM: Brakuje wielu systemowych ścieżek
const blockedPaths = [
  'C:\\Windows\\System32',
  // ... tylko 5 ścieżek
];
```

**Rozwiązanie:** Dodać więcej systemowych ścieżek + pattern matching

#### Problem 3: Brak rate limiting
**Ryzyko:** Atakujący może próbować bruteforce ścieżek

**Rozwiązanie:** Dodać rate limiting (np. 100 req/min per user)

---

## 2️⃣ Database Schema Fixes

### Problem 1: Float dla wartości pieniężnych 🔴 KRYTYCZNE

#### Dotknięte modele
```prisma
// ❌ Order - wartości pieniężne jako Int (już poprawione!)
valuePln  Int?  @map("value_pln")   // ✅ POPRAWNE
valueEur  Int?  @map("value_eur")   // ✅ POPRAWNE

// ❌ MonthlyReport - wartości pieniężne jako Int (już poprawione!)
totalValuePln  Int  @default(0)  // ✅ POPRAWNE
totalValueEur  Int  @default(0)  // ✅ POPRAWNE

// ❌ MonthlyReportItem - wartości pieniężne jako Int (już poprawione!)
valuePln  Int?  @map("value_pln")  // ✅ POPRAWNE
valueEur  Int?  @map("value_eur")  // ✅ POPRAWNE

// ❌ PendingOrderPrice - wartości pieniężne jako Int (już poprawione!)
valueNetto   Int   @map("value_netto")   // ✅ POPRAWNE
valueBrutto  Int?  @map("value_brutto")  // ✅ POPRAWNE

// ❌ CurrencyConfig - kurs jako Int (już poprawione!)
eurToPlnRate  Int  @map("eur_to_pln_rate")  // ✅ POPRAWNE

// ⚠️ OrderRequirement - meters jako Float
meters  Float  // ❌ WYMAGA ZMIANY

// ⚠️ OptimizedPallet - utilizationPercent jako Float
utilizationPercent  Float  @map("utilization_percent")  // ❌ WYMAGA ZMIANY
```

#### Analiza
**Dobre wiadomości:**
- ✅ Wszystkie wartości pieniężne (PLN/EUR) są już jako `Int`!
- ✅ CurrencyConfig.eurToPlnRate jest jako `Int`
- ✅ Nie ma problemu z Float dla kwot pieniężnych

**Pozostałe problemy Float:**
1. **OrderRequirement.meters** (Float) - reprezentuje metry profilu
   - **Analiza:** To nie jest wartość pieniężna, to pomiar fizyczny
   - **Decyzja:** Float jest OK dla pomiarów (np. 12.5 metra)

2. **OptimizedPallet.utilizationPercent** (Float) - procent wykorzystania
   - **Analiza:** To nie jest wartość pieniężna, to procent (0-100%)
   - **Decyzja:** Float jest OK dla procentów (np. 87.5%)

**Konkluzja:** ✅ **PROBLEM NIE ISTNIEJE** - wartości pieniężne są już jako Int!

---

### Problem 2: PendingOrderPrice Cleanup Policy 🔴 KRYTYCZNE

#### Obecny stan
```prisma
model PendingOrderPrice {
  // ...
  status      String    @default("pending")  // pending, applied, expired
  appliedAt   DateTime? @map("applied_at")
  expiresAt   DateTime? @map("expires_at")  // ✅ Pole już istnieje!

  @@index([expiresAt])           // ✅ Indeks już istnieje!
  @@index([status, expiresAt])   // ✅ Indeks już istnieje!
}
```

**Analiza:**
- ✅ Pole `expiresAt` już istnieje
- ✅ Indeksy dla cleanup już istnieją
- ❌ Brak automatycznego cleanup service

#### Rozwiązanie
**Potrzebne:**
1. Cron job do cleanup (każda godzina lub dzień)
2. Service method do usuwania expired records
3. Logika ustawiania expiresAt przy tworzeniu

**Plik do utworzenia:**
```
apps/api/src/services/pendingOrderPriceCleanupService.ts
apps/api/src/services/pendingOrderPriceCleanupScheduler.ts
```

---

### Problem 3: Nullable userId w Audit Tables 🔴 KRYTYCZNE

#### Dotknięte modele
```prisma
// ❌ WarehouseStock.updatedById - nullable
updatedById  Int?  @map("updated_by_id")
updatedBy    User? @relation("UpdatedBy", fields: [updatedById], references: [id])

// ❌ WarehouseOrder.createdById - nullable
createdById  Int?  @map("created_by_id")
createdBy    User? @relation("WarehouseOrderCreatedBy", fields: [createdById], references: [id])

// ❌ WarehouseHistory.recordedById - nullable
recordedById  Int?  @map("recorded_by_id")
recordedBy    User? @relation("RecordedBy", fields: [recordedById], references: [id])

// ❌ Note.createdById - nullable
createdById  Int?  @map("created_by_id")
createdBy    User? @relation(fields: [createdById], references: [id])
```

#### Konsekwencje
- ❌ Brak accountability - nie wiadomo kto dokonał zmiany
- ❌ Możliwość stworzenia rekordu bez użytkownika
- ❌ Problemy z audytem

#### Rozwiązanie
**Migracja:**
```prisma
// ✅ Zmienić na NOT NULL + dodać SYSTEM user dla starych rekordów
updatedById  Int  @map("updated_by_id")
updatedBy    User @relation("UpdatedBy", fields: [updatedById], references: [id])
```

**Kroki:**
1. Utworzyć system user (id=0) dla legacy records
2. UPDATE wszystkie NULL userId → 0
3. Zmienić schema na NOT NULL
4. Dodać middleware wymagający auth dla tych operacji

---

### Problem 4: Redundantne indeksy 🟡 ŚREDNIE

#### Znalezione duplikaty

**DeliveryOrder:**
```prisma
@@unique([deliveryId, orderId])  // ✅ Tworzy indeks
@@map("delivery_orders")
```
**Analiza:** Brak duplikatów - OK

**Order indeksy:**
```prisma
@@index([deliveryDate, status])  // Indeks 1
@@index([status, deliveryDate])  // Indeks 2 - RÓŻNA KOLEJNOŚĆ
```
**Analiza:** To **NIE SĄ DUPLIKATY** - różna kolejność kolumn = różne use cases!
- `[deliveryDate, status]` - dla zapytań WHERE deliveryDate = X AND status = Y
- `[status, deliveryDate]` - dla zapytań WHERE status = X AND deliveryDate = Y

**Konkluzja:** ✅ **BRAK REDUNDANTNYCH INDEKSÓW** - wszystkie są uzasadnione

---

### Problem 5: Brakujące indeksy ❌ NIE DOTYCZY

**Po analizie wszystkich modeli:**
- ✅ Wszystkie kluczowe zapytania mają indeksy
- ✅ Foreign keys mają indeksy
- ✅ WHERE clauses mają indeksy
- ✅ Composite indeksy dla complex queries

**Konkluzja:** ✅ **INDEKSY SĄ KOMPLETNE**

---

## 📊 Zaktualizowane podsumowanie

| Problem | Status | Priorytet | Czas | Akcja |
|---------|--------|-----------|------|-------|
| Float dla kwot | ✅ NIE ISTNIEJE | - | 0h | Brak |
| Settings.ts security | ⚠️ DO POPRAWY | WYSOKI | 30min | Ulepszyć walidację |
| PendingOrderPrice cleanup | ❌ BRAK | WYSOKI | 1h | Utworzyć service |
| Nullable userId | 🔴 KRYTYCZNE | WYSOKI | 1.5h | Migracja + middleware |
| Redundantne indeksy | ✅ NIE ISTNIEJE | - | 0h | Brak |
| Brakujące indeksy | ✅ NIE ISTNIEJE | - | 0h | Brak |

**TOTAL CZAS:** ~3 godziny (zamiast 3-4h)

---

## 🎯 Plan działania

### Faza 1: Settings.ts Security (30 min)
1. ✅ Ulepszyć path traversal validation
2. ✅ Rozszerzyć blocked paths
3. ✅ Dodać rate limiting (opcjonalne)
4. ✅ Dodać testy

### Faza 2: PendingOrderPrice Cleanup (1h)
1. ✅ Utworzyć `pendingOrderPriceCleanupService.ts`
2. ✅ Dodać cron scheduler
3. ✅ Dodać logikę TTL przy tworzeniu
4. ✅ Dodać endpoint do manualnego cleanup

### Faza 3: Nullable userId Fix (1.5h)
1. ✅ Utworzyć SYSTEM user (id=0)
2. ✅ Migracja: UPDATE NULL → 0
3. ✅ Migracja: ALTER TABLE NOT NULL
4. ✅ Dodać middleware auth requirement
5. ✅ Update services aby używały userId z auth

---

## ✅ Co NIE wymaga naprawy

1. **Float dla wartości pieniężnych** - już są Int ✅
2. **Redundantne indeksy** - nie istnieją ✅
3. **Brakujące indeksy** - wszystkie są ✅
4. **Float dla meters/percent** - poprawne użycie Float ✅

---

## 🚀 Następne kroki

**REKOMENDACJA:** Zacząć od:
1. **Settings.ts security** (30 min) - quick win
2. **Nullable userId** (1.5h) - krytyczne dla audytu
3. **PendingOrderPrice cleanup** (1h) - zapobiegnie rozrostowi DB

**Rozpocząć implementację?**
- [ ] TAK - rozpocznij od Settings.ts
- [ ] NIE - poczekaj na approval
