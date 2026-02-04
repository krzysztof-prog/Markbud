# Plan: Event Handlers dla DeliveryReadiness

## Cel
Dodać automatyczne przeliczanie statusu gotowości dostawy (DeliveryReadiness) przy zmianach w powiązanych serwisach.

## Kontekst
System `DeliveryReadinessAggregator` jest już zaimplementowany. Teraz trzeba dodać wywołania `recalculateReadiness()` w istniejących serwisach, aby status aktualizował się automatycznie.

---

## Punkty integracji

### 1. DeliveryOrderService (PRIORYTET)
**Plik:** `apps/api/src/services/delivery/DeliveryOrderService.ts`

| Metoda | Linia | Akcja |
|--------|-------|-------|
| `addOrderToDelivery()` | ~125 | Po dodaniu zlecenia |
| `removeOrderFromDelivery()` | ~139 | Po usunięciu zlecenia |
| `reorderDeliveryOrders()` | ~181 | Po zmianie kolejności |
| `moveOrderBetweenDeliveries()` | ~208 | Po przeniesieniu (2x dla obu dostaw) |

**Implementacja:**
```typescript
import { DeliveryReadinessAggregator } from '../readiness/index.js';

// W konstruktorze lub jako lazy init
private getReadinessAggregator() {
  return new DeliveryReadinessAggregator(this.prisma);
}

// Po operacji:
await this.getReadinessAggregator().recalculateIfNeeded(deliveryId);
```

### 2. LabelCheckService
**Plik:** `apps/api/src/services/label-check/LabelCheckService.ts`

| Metoda | Linia | Akcja |
|--------|-------|-------|
| `checkDelivery()` | ~165 | Po zakończeniu sprawdzania (status: 'completed') |

**Implementacja:**
```typescript
// Po updateStatus() z status: 'completed' lub 'failed'
await this.getReadinessAggregator().recalculateIfNeeded(deliveryId);
```

### 3. OrderService
**Plik:** `apps/api/src/services/orderService.ts`

| Metoda | Linia | Akcja |
|--------|-------|-------|
| `updateOrder()` | ~101 | Po zmianie statusu zlecenia |
| `bulkUpdateStatus()` | ~243 | Po masowej zmianie statusu |

**Implementacja:**
Wymaga znalezienia dostaw powiązanych ze zleceniem:
```typescript
// Znajdź dostawy dla zlecenia
const deliveryOrders = await this.prisma.deliveryOrder.findMany({
  where: { orderId },
  select: { deliveryId: true }
});

// Przelicz dla każdej dostawy
for (const { deliveryId } of deliveryOrders) {
  await this.getReadinessAggregator().recalculateIfNeeded(deliveryId);
}
```

### 4. PalletValidationService
**Plik:** `apps/api/src/services/palletValidationService.ts`

| Metoda | Linia | Akcja |
|--------|-------|-------|
| `markAsValidated()` | ~162 | Po oznaczeniu palet jako zwalidowane |
| `validatePalletOptimization()` | ~137 | Po zakończeniu walidacji |

**Implementacja:**
```typescript
// Ma już deliveryId
await this.getReadinessAggregator().recalculateIfNeeded(deliveryId);
```

### 5. LogisticsMailService
**Plik:** `apps/api/src/services/logistics/LogisticsMailService.ts`

| Metoda | Linia | Akcja |
|--------|-------|-------|
| `saveMailList()` | ~229 | Po zapisaniu listy |
| `confirmAddedItem()` | ~547 | Po potwierdzeniu pozycji |
| `acceptItemChange()` | ~626 | Po akceptacji zmiany |

**Implementacja:**
Wymaga znalezienia dostawy po deliveryCode:
```typescript
// Znajdź dostawę po kodzie
const delivery = await this.prisma.delivery.findFirst({
  where: {
    deliveryNumber: deliveryCode // lub inny sposób mapowania
  }
});
if (delivery) {
  await this.getReadinessAggregator().recalculateIfNeeded(delivery.id);
}
```

---

## Metoda pomocnicza w Aggregator

Dodać do `DeliveryReadinessAggregator.ts`:
```typescript
/**
 * Przelicza readiness tylko jeśli minął minimalny czas od ostatniego przeliczenia
 * Zapobiega nadmiernemu przeliczaniu przy wielu operacjach naraz
 */
async recalculateIfNeeded(deliveryId: number, minIntervalMs = 5000): Promise<void> {
  const existing = await this.repository.findByDeliveryId(deliveryId);

  if (existing) {
    const timeSinceLastCalc = Date.now() - existing.lastCalculatedAt.getTime();
    if (timeSinceLastCalc < minIntervalMs) {
      return; // Pomiń - niedawno przeliczone
    }
  }

  await this.calculateAndPersist(deliveryId);
}
```

---

## Kolejność implementacji

1. **Dodać `recalculateIfNeeded()` do Aggregator** (5 min)
2. **DeliveryOrderService** - najczęściej używany (10 min)
3. **LabelCheckService** - prosty, ma deliveryId (5 min)
4. **PalletValidationService** - prosty, ma deliveryId (5 min)
5. **OrderService** - wymaga query dla dostaw (10 min)
6. **LogisticsMailService** - wymaga mapowania kodu dostawy (15 min)

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `apps/api/src/services/readiness/DeliveryReadinessAggregator.ts` | Dodać `recalculateIfNeeded()` |
| `apps/api/src/services/delivery/DeliveryOrderService.ts` | Import + wywołania |
| `apps/api/src/services/label-check/LabelCheckService.ts` | Import + wywołanie |
| `apps/api/src/services/palletValidationService.ts` | Import + wywołanie |
| `apps/api/src/services/orderService.ts` | Import + wywołania z query |
| `apps/api/src/services/logistics/LogisticsMailService.ts` | Import + wywołania z mapowaniem |

---

## Weryfikacja

1. Dodaj zlecenie do dostawy → sprawdź czy readiness się przelicza
2. Zmień status zlecenia na 'completed' → sprawdź czy readiness się aktualizuje
3. Uruchom sprawdzanie etykiet → sprawdź czy status po checkDelivery() się zmienia
4. Zwaliduj palety → sprawdź czy pallet_validation module się aktualizuje
5. Sprawdź logi czy nie ma nadmiernego przeliczania (debounce działa)

---

## Uwagi techniczne

- **Debounce**: `recalculateIfNeeded()` z minIntervalMs zapobiega nadmiernemu przeliczaniu
- **Async**: Wszystkie wywołania są async, ale nie blokują głównej operacji
- **Błędy**: Błędy w recalculate nie powinny przerywać głównej operacji (try-catch)
- **Performance**: Cache w DeliveryReadiness minimalizuje koszty
