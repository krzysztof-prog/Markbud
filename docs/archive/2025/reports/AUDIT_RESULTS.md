# TypeScript Types Audit - Wyniki

## Przegląd

Przeprowadzony audyt porównuje interfejsy TypeScript w `apps/web/src/types/` z polami zwracanymi przez repozytoria w `apps/api/src/repositories/`. Znaleziono **12 typów głównych** z **licznymi niezgodności**.

**Data audytu:** 19 grudnia 2025
**Status:** Ukończony
**Wersja raportu:** 1.0

---

## Wyniki podsumowania

| Typ | Status | Krytyczne | Wysokie | Średnie | Niskie |
|-----|--------|-----------|---------|---------|--------|
| Order | ❌ Problemy | - | ✓ | - | - |
| Delivery | ❌ Problemy | - | ✓ | - | - |
| Profile | ⚠️ Minor | - | - | - | ✓ |
| Color | ⚠️ Minor | - | - | - | ✓ |
| WarehouseStock | ❌ Krytyczne | ✓ | - | - | - |
| Requirement | ❌ Krytyczne | ✓ | - | - | - |
| GlassDelivery | ❌ Brakuje | - | ✓ | - | - |
| GlassOrder | ❌ Brakuje | - | ✓ | - | - |
| PalletOptimizer | ✅ OK | - | - | - | - |
| Import | ⚠️ Niezbadane | - | - | - | - |
| Dashboard | ⚠️ Niezbadane | - | - | - | - |
| Settings | ⚠️ Niezbadane | - | - | - | - |

---

## Niezgodności krytyczne (CRITICAL) - Wymagają natychmiastowego naprawy

### 1. Requirement: `quantity` vs `beamsCount`

```
PROBLEM: Typ definiuje "quantity", ale API zwraca "beamsCount"
ZNACZENIE: Zupełnie inne - quantity to liczba, beamsCount to belki profili
WPŁYW: Runtime error - undefined field access
```

**Gdzie zwracane:**
- `OrderRepository.findById().requirements[].beamsCount`
- `DeliveryRepository.findById().deliveryOrders[].order.requirements[].beamsCount`

**Powinno być w typie:**
```typescript
interface Requirement {
  id: ID;
  profileId: ID;
  colorId: ID;
  beamsCount: number;  // NIE quantity!
  meters: number;      // DODAĆ
  restMm?: number;     // DODAĆ
  profile?: Profile;
  color?: Color;
}
```

**Plik:** `apps/web/src/types/requirement.ts`

---

### 2. WarehouseStock: `quantity` vs `currentStockBeams`

```
PROBLEM: Typ definiuje "quantity", ale API zwraca "currentStockBeams"
ZNACZENIE: Zupełnie inne - quantity to liczba, currentStockBeams to dokładne pole bazy
WPŁYW: Runtime error - undefined field access na magazynie
```

**Gdzie zwracane:**
- `WarehouseRepository.getStock().currentStockBeams`

**Powinno być w typie:**
```typescript
interface WarehouseStock {
  id: ID;
  profileId: ID;
  colorId: ID;
  currentStockBeams: number;  // NIE quantity!
  profile?: Profile;
  color?: Color;
  updatedAt?: Timestamp;
}
```

**Plik:** `apps/web/src/types/warehouse.ts`

---

## Niezgodności wysokie (HIGH) - Wymaga rozwiązania w sprint

### 3. Order: Brakujące pola

**Pola zwracane z API, ale brakujące w typie:**
- `notes: string | null`
- `deliveryDate: Date`
- `productionDate: Date`
- `deliveryOrders: Array<{ id, deliveryId, delivery }>`
- `orderNotes: Array<{ id, content, createdAt }>`

**Gdzie zwracane:**
- `OrderRepository.findById()`

**Plik:** `apps/web/src/types/order.ts`

---

### 4. Order: Niekompletne Windows w findAll()

**Problem:**
- `OrderRepository.findAll()` zwraca windows: `{ id, profileType, reference }`
- Powinny być: `{ id, widthMm, heightMm, profileType, quantity, reference }`

**Gdzie:**
- `OrderRepository.findAll()` linia 64-70

**Plik:** `apps/api/src/repositories/OrderRepository.ts`

---

### 5. Delivery: Struktura niezgodna

**Problem:**
- Typ definiuje: `orders?: Order[]`
- API zwraca: `deliveryOrders: Array<{ orderId, position, order }>`
- To **zupełnie inny format**!

**Dodatkowy problem:**
- Zwracane są też `deliveryItems`, ale typ to ignoruje

**Gdzie zwracane:**
- `DeliveryRepository.findById()`

**Plik:** `apps/web/src/types/delivery.ts`

---

### 6. GlassDelivery, GlassOrder: Brakują całe interfejsy

**Problem:** Brakują typy TypeScript dla modeli glass!

**Modele w Prisma:**
- `GlassDelivery`
- `GlassDeliveryItem`
- `GlassOrder`
- `GlassOrderItem`
- `GlassOrderValidation`

**Gdzie używane:**
- Routes: `/glass-deliveries`, `/glass-orders`, `/glass-validations`
- Service: `apps/api/src/services/glassDeliveryService.ts`

**Akcja:**
Utworzyć `apps/web/src/types/glass-delivery.ts`

---

## Niezgodności średnie (MEDIUM) - Zaleca się rozwiązanie

### 7. Delivery: 10+ nieużywanych pól

Pola definiowane w typie, ale **nigdy nie zwracane z API:**
- `weekNumber`, `year`, `colorId`, `isUnassigned`
- `orders`, `ordersCount`
- `totalWindows`, `totalGlass`, `totalPallets`, `totalValue`

**Potwierdzić:**
Czy te pola są faktycznie używane na froncie? Jeśli nie, usunąć z typu.

**Plik:** `apps/web/src/types/delivery.ts`

---

### 8. Order: Pola niedostarczane

Pola definiowane w typie, ale nigdy nie zwracane:
- `deliveryId`
- `clientName`
- `priority`
- `updatedAt` (bak w findAll, jest w findById)

**Potwierdzić:**
Czy te pola są faktycznie używane? Jeśli nie, usunąć z typu.

**Plik:** `apps/web/src/types/order.ts`

---

## Niezgodności niskie (LOW) - Optymalizacja

### 9. Profile: Brakuje `articleNumber`

**Zwracane w:**
- `ProfileRepository.findById()`

**Plik:** `apps/web/src/types/profile.ts`

---

### 10. Profile & Color: Brakuje `profileColors`

**Zwracane w:**
- `ProfileRepository.findById().profileColors`
- `ColorRepository.findById().profileColors`

**Plik:** `apps/web/src/types/profile.ts`, `apps/web/src/types/color.ts`

---

## Plan naprawczy

### Faza 1: CRITICAL (Tydzień 1-2)

1. ✅ **Requirement: Zmień `quantity` na `beamsCount`**
   - Dodaj: `meters`, `restMm`
   - Plik: `apps/web/src/types/requirement.ts`

2. ✅ **WarehouseStock: Zmień `quantity` na `currentStockBeams`**
   - Plik: `apps/web/src/types/warehouse.ts`

### Faza 2: HIGH (Tydzień 3-4)

3. ✅ **Order: Dodaj brakujące pola**
   - `notes`, `deliveryDate`, `productionDate`, `deliveryOrders`, `orderNotes`
   - Plik: `apps/web/src/types/order.ts`

4. ✅ **Order.Window: Popraw `findAll()` w repository**
   - Dodaj: `widthMm`, `heightMm`, `quantity` do select
   - Plik: `apps/api/src/repositories/OrderRepository.ts`

5. ✅ **Delivery: Zmień strukturę**
   - Zmień `orders` na `deliveryOrders`
   - Dodaj `deliveryItems`
   - Plik: `apps/web/src/types/delivery.ts`

6. ✅ **Glass: Utwórz nowy plik z interfejsami**
   - Plik: `apps/web/src/types/glass-delivery.ts` (create)
   - Update: `apps/web/src/types/index.ts`

### Faza 3: MEDIUM & LOW (Tydzień 5+)

7. ✅ **Delivery & Order: Wyjaśnij nieużywane pola**
   - Potwierdź wykorzystanie w kodzie
   - Usuń lub dokumentuj

8. ✅ **Profile & Color: Dodaj zagnieżdżone pola**
   - `articleNumber`, `profileColors`

---

## Pliki do modyfikacji

```
NOWE PLIKI:
  + apps/web/src/types/glass-delivery.ts

MODYFIKACJA:
  ~ apps/web/src/types/order.ts
  ~ apps/web/src/types/delivery.ts
  ~ apps/web/src/types/requirement.ts
  ~ apps/web/src/types/warehouse.ts
  ~ apps/web/src/types/profile.ts
  ~ apps/web/src/types/color.ts
  ~ apps/web/src/types/index.ts
  ~ apps/api/src/repositories/OrderRepository.ts (select dla findAll)
```

---

## Detailed Reports

Dostępne są szczegółowe raporty:

1. **TYPESCRIPT_TYPES_AUDIT.md** - Kompletny audyt z analizą każdego typu
2. **TYPES_AUDIT_SUMMARY.txt** - Krótka lista niezgodności
3. **TYPES_AUDIT_DETAILED.json** - Struktura JSON dla toolingu
4. **AUDIT_RESULTS.md** - Ten dokument

---

## Metryki

- **Typy audytowane:** 9 głównych + 3 dodatkowe
- **Pola sprawdzone:** ~150+
- **Niezgodności znalezione:** 32+
- **Krytyczne:** 2
- **Wysokie:** 4
- **Średnie:** 3
- **Niskie:** 5+

---

## Kontakt

Audyt przeprowadzony przez: Claude Code
Data: 19.12.2025
Typ: TypeScript Types Synchronization Audit
