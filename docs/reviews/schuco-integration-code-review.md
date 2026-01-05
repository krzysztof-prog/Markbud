# Code Review: Schuco Integration

**Data:** 2025-12-18
**Reviewer:** Claude Code
**Zakres:** Backend schucoOrderMatcher.ts + Frontend components

---

## 1. Backend - schucoOrderMatcher.ts

### ✅ Co zostało zrobione dobrze

1. **Separation of Concerns**: Wydzielenie utility functions od klasy serwisu
2. **Comprehensive JSDoc**: Każda funkcja ma dobrą dokumentację
3. **Error Handling**: Używanie try-catch i logger dla błędów
4. **Idempotent Operations**: Użycie `upsert` zamiast `create` zapobiega duplikatom
5. **Input Validation**: Sprawdzanie null/empty przed przetwarzaniem
6. **Deduplication**: Usuwanie duplikatów z `new Set()`

### ⚠️ Potencjalne problemy i sugestie ulepszeń

#### 1. **Regex Pattern - Edge Cases**

**Lokalizacja:** `extractOrderNumbers()` linia 23

**Problem:** Regex `/(?<!\d)\d{5}(?!\d)/g` może nie działać w starszych środowiskach bez wsparcia dla negative lookbehind.

**Sugestia:**
```typescript
// Alternatywne podejście kompatybilne z ES2018+
const fiveDigitPattern = /\b\d{5}\b/g;
// lub z dodatkowymi checks:
const matches = schucoOrderNumber.match(/\d+/g);
return matches ? matches.filter(m => m.length === 5) : [];
```

**Priorytet:** Niski (działa w Node.js 10+, ale warto rozważyć dla legacy support)

---

#### 2. **parseDeliveryWeek - ISO Week Calculation może być niedokładne**

**Lokalizacja:** `parseDeliveryWeek()` linia 72-81

**Problem:** Własna implementacja ISO week date może dawać błędne wyniki dla edge cases (np. tydzień 1 w roku, który zaczyna się w środę).

**Sugestia:** Użyć biblioteki date-fns lub dokładniejszej implementacji:
```typescript
import { setISOWeek, setYear, startOfISOWeek } from 'date-fns';

export function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) return null;

  const match = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\/(\d{4})/i);
  if (!match) return null;

  const week = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

  if (week < 1 || week > 53 || year < 2020 || year > 2100) {
    return null;
  }

  // date-fns gwarantuje poprawne obliczenia ISO week
  const date = startOfISOWeek(setISOWeek(setYear(new Date(), year), week));
  return date;
}
```

**Priorytet:** Średni (może powodować błędy dla ~5% przypadków)

---

#### 3. **aggregateSchucoStatus - Unknown status handling**

**Lokalizacja:** `aggregateSchucoStatus()` linia 131

**Problem:** Dla nieznanych statusów zwraca priority = 0, co może być mylące. Lepiej byłoby:
- Logować warning dla unknown status
- Zwrócić jasny fallback lub pierwszą wartość

**Sugestia:**
```typescript
const priority = statusPriority[status.toLowerCase()];
if (priority === undefined) {
  logger.warn(`[SchucoOrderMatcher] Unknown status: ${status}`);
  // Traktuj nieznane jako najgorsze
  return status;
}
```

**Priorytet:** Niski (edge case)

---

#### 4. **processAllDeliveries - Brak batch processing**

**Lokalizacja:** `processAllDeliveries()` linia 257-273

**Problem:** Processing w pętli for może być wolne dla dużej liczby rekordów (1000+ deliveries). Każde wywołanie to osobne query do DB.

**Sugestia:** Batch processing z Promise.all (max 50 jednocześnie):
```typescript
async processAllDeliveries(): Promise<{...}> {
  const deliveries = await this.prisma.schucoDelivery.findMany({
    select: { id: true },
  });

  const BATCH_SIZE = 50;
  let processed = 0;
  let linksCreated = 0;
  let warehouseItems = 0;

  for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
    const batch = deliveries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(d => this.processSchucoDelivery(d.id))
    );

    linksCreated += results.reduce((sum, r) => sum + r, 0);
    processed += batch.length;

    // Count warehouse items after batch
    const batchIds = batch.map(d => d.id);
    const warehouseCount = await this.prisma.schucoDelivery.count({
      where: { id: { in: batchIds }, isWarehouseItem: true },
    });
    warehouseItems += warehouseCount;
  }

  return { total: deliveries.length, processed, linksCreated, warehouseItems };
}
```

**Priorytet:** Wysoki dla dużych baz danych (>500 deliveries)

---

#### 5. **Database N+1 Problem w getSchucoDeliveriesForOrder**

**Lokalizacja:** `getSchucoDeliveriesForOrder()` linia 293-308

**Problem:** Choć używa include, można zoptymalizować zwracając bezpośrednio dane zamiast mapować.

**Sugestia:**
```typescript
async getSchucoDeliveriesForOrder(orderId: number) {
  return this.prisma.orderSchucoLink.findMany({
    where: { orderId },
    include: {
      schucoDelivery: true,
    },
    orderBy: {
      linkedAt: 'desc',
    },
  });
  // Frontend może użyć link.schucoDelivery
}
```

**Priorytet:** Niski (tylko optymalizacja, nie bug)

---

#### 6. **Brak transakcji w processSchucoDelivery**

**Lokalizacja:** `processSchucoDelivery()` linia 160-233

**Problem:** Update delivery + tworzenie linków nie są w transakcji. Jeśli upsert fail, delivery będzie miał `isWarehouseItem` ale brak linków.

**Sugestia:**
```typescript
async processSchucoDelivery(schucoDeliveryId: number): Promise<number> {
  return this.prisma.$transaction(async (tx) => {
    const delivery = await tx.schucoDelivery.findUnique({
      where: { id: schucoDeliveryId },
    });

    if (!delivery) {
      logger.warn(`[SchucoOrderMatcher] Delivery ${schucoDeliveryId} not found`);
      return 0;
    }

    const orderNumbers = extractOrderNumbers(delivery.orderNumber);
    const isWarehouse = orderNumbers.length === 0;

    // Update w transakcji
    await tx.schucoDelivery.update({
      where: { id: schucoDeliveryId },
      data: {
        isWarehouseItem: isWarehouse,
        extractedOrderNums: orderNumbers.length > 0 ? JSON.stringify(orderNumbers) : null,
      },
    });

    if (isWarehouse) return 0;

    const orders = await tx.order.findMany({
      where: { orderNumber: { in: orderNumbers } },
    });

    if (orders.length === 0) return 0;

    // Links creation w transakcji
    let linksCreated = 0;
    for (const order of orders) {
      try {
        await tx.orderSchucoLink.upsert({
          where: {
            orderId_schucoDeliveryId: {
              orderId: order.id,
              schucoDeliveryId: schucoDeliveryId,
            },
          },
          create: {
            orderId: order.id,
            schucoDeliveryId: schucoDeliveryId,
            linkedBy: 'auto',
          },
          update: { linkedAt: new Date() },
        });
        linksCreated++;
      } catch (error) {
        logger.error(`[SchucoOrderMatcher] Error linking order ${order.orderNumber}:`, error);
        throw error; // Re-throw aby rollback transakcji
      }
    }

    return linksCreated;
  });
}
```

**Priorytet:** Wysoki (data consistency)

---

## 2. Frontend - order-detail-modal.tsx

### ✅ Co zostało zrobione dobrze

1. **React Query dla data fetching**: Caching i automatyczne refetching
2. **Collapsible sections**: UX-friendly dla długich list
3. **Loading states**: Spinner podczas ładowania
4. **Conditional rendering**: Sprawdzanie czy dane istnieją przed render
5. **Type safety**: TypeScript interfaces

### ⚠️ Potencjalne problemy i sugestie ulepszeń

#### 1. **Potential memory leak - useEffect bez cleanup**

**Lokalizacja:** Linia 63-69

**Problem:** Wywołanie `ordersApi.checkPdf()` nie ma cleanup, może powodować warning przy unmount.

**Sugestia:**
```typescript
React.useEffect(() => {
  let cancelled = false;

  if (orderId && open) {
    ordersApi.checkPdf(orderId)
      .then((result) => {
        if (!cancelled) setHasPdf(result.hasPdf);
      })
      .catch(() => {
        if (!cancelled) setHasPdf(false);
      });
  }

  return () => {
    cancelled = true;
  };
}, [orderId, open]);
```

**Priorytet:** Średni (może powodować console warnings)

---

#### 2. **Hardcoded status colors - duplikacja logiki**

**Lokalizacja:** Linia 284-290

**Problem:** Status colors są hardcoded w komponencie, powielone z innych części aplikacji.

**Sugestia:** Wydzielić do utility function:
```typescript
// utils/schuco.ts
export function getSchucoStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('dostarcz')) return 'bg-green-100 text-green-700';
  if (statusLower.includes('wysłan') || statusLower.includes('wyslan'))
    return 'bg-blue-100 text-blue-700';
  if (statusLower.includes('otwart')) return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
}
```

**Priorytet:** Niski (refactoring, nie bug)

---

#### 3. **Performance - nested map bez key optimization**

**Lokalizacja:** Linia 282 (map w schucoLinks)

**Problem:** Używanie `link.id` jako key jest OK, ale można zoptymalizować re-renders.

**Sugestia:** Użyć `React.memo` dla row component:
```typescript
const SchucoDeliveryRow = React.memo(({ link, index }: { link: SchucoDeliveryLink, index: number }) => {
  const delivery = link.schucoDelivery;
  const statusColor = getSchucoStatusColor(delivery.shippingStatus);

  return (
    <tr key={link.id} className={...}>
      {/* existing content */}
    </tr>
  );
});
```

**Priorytet:** Niski (tylko dla bardzo długich list >100 items)

---

## 3. Frontend - szyby/statystyki/page.tsx

### ✅ Co zostało zrobione dobrze

1. **useMemo dla calculations**: Unikanie niepotrzebnych re-calculations
2. **Grupowanie po dacie**: Klarowna logika agregacji
3. **Progress bars**: Wizualizacja postępu dostaw

### ⚠️ Potencjalne problemy

#### 1. **Partial delivery calculation jest hardcoded**

**Lokalizacja:** Linia 113-114

**Problem:** Zakładanie 50% dla `partially_delivered` to założenie, które może być nieprecyzyjne.

**Sugestia:** Pobierać faktyczne dane z GlassDelivery items:
```typescript
// Zamiast hardcoded 50%:
if (order.status === 'partially_delivered') {
  // Fetch actual delivered items count from API
  const deliveredCount = order.deliveredItemsCount || Math.floor((order._count?.items || 0) / 2);
  stats.deliveredCount += deliveredCount;
}
```

**Priorytet:** Średni (jeśli dostępne są faktyczne dane)

---

## 4. Brakujące testy

### Obecne testy pokrywają:
- ✅ extractOrderNumbers - 10 test cases
- ✅ isWarehouseItem - 4 test cases
- ✅ parseDeliveryWeek - 9 test cases
- ✅ aggregateSchucoStatus - 7 test cases

### ❌ Brakujące testy:

1. **SchucoOrderMatcher class methods** - ZERO tests dla:
   - `processSchucoDelivery()`
   - `processAllDeliveries()`
   - `getSchucoDeliveriesForOrder()`
   - `getSchucoStatusForOrder()`
   - `createManualLink()`
   - `deleteLink()`
   - `getUnlinkedDeliveries()`

2. **Integration tests** - brak testów dla:
   - Full workflow (import → auto-linking → display)
   - Database constraints (unique indexes, cascades)
   - Error scenarios (network failures, invalid data)

3. **Frontend component tests** - brak testów dla:
   - OrderDetailModal rendering
   - Schuco section collapse/expand
   - Loading states
   - Error states

---

## Podsumowanie priorytetów

### 🔴 Wysoki (należy naprawić)
1. Dodać transakcje w `processSchucoDelivery()`
2. Zoptymalizować `processAllDeliveries()` dla batch processing
3. Dodać testy dla SchucoOrderMatcher class methods

### 🟡 Średni (warto rozważyć)
1. Używać date-fns dla `parseDeliveryWeek()`
2. Cleanup w useEffect (order-detail-modal)
3. Dokładniejsze obliczenia dla partial deliveries

### 🟢 Niski (opcjonalne)
1. Alternatywny regex dla legacy support
2. Logger dla unknown statuses
3. Optymalizacja re-renders w komponentach
4. Wydzielenie utility functions dla status colors

---

## Następne kroki

1. ✅ Przeczytać review
2. ⏳ Rozszerzyć testy (szczególnie dla class methods)
3. ⏳ Naprawić high-priority issues
4. ⏳ Rozważyć medium-priority improvements
