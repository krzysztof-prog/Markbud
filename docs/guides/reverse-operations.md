# Dokumentacja odwrotnych operacji w systemie Markbud

## Przegląd

System Markbud zawiera mechanizmy odwrotnych operacji zapewniające spójność danych przy wszystkich operacjach związanych z magazynem, zamówieniami materiałów i dostawami.

## 1. Operacje na zamówieniach magazynowych (Warehouse Orders)

### 1.1 Aktualizacja zamówienia (PUT /api/warehouse-orders/:id)

**Plik:** `apps/api/src/routes/warehouse-orders.ts:152-277`

#### Obsługiwane scenariusze:

| Scenariusz | Przed | Po | Wpływ na magazyn | Transakcja |
|------------|-------|-----|------------------|------------|
| Zmiana statusu: pending → received | 0 bel | +100 bel | **+100** | ✅ |
| Zmiana statusu: received → pending | +100 bel | 0 bel | **-100** | ✅ |
| Zmiana statusu: received → cancelled | +100 bel | 0 bel | **-100** | ✅ |
| Zmiana liczby bel: 100→150 (status=received) | +100 bel | +150 bel | **+50** | ✅ |
| Zmiana liczby bel: 150→100 (status=received) | +150 bel | +100 bel | **-50** | ✅ |
| Jednoczesna zmiana statusu i liczby bel | zależy | zależy | obliczone | ✅ |

#### Implementacja:

```typescript
// Obliczanie różnicy w belach (stockDelta)
let stockDelta = 0;

// Przypadek 1: Zmiana z 'received' na inny status
if (wasPreviouslyReceived && !isNowReceived) {
  stockDelta -= existingOrder.orderedBeams; // Odejmij wszystkie bele
}

// Przypadek 2: Zmiana na 'received' z innego statusu
else if (!wasPreviouslyReceived && isNowReceived) {
  const newBeamsCount = orderedBeams ?? existingOrder.orderedBeams;
  stockDelta += newBeamsCount; // Dodaj nowe bele
}

// Przypadek 3: Status pozostaje 'received', zmiana liczby bel
else if (wasPreviouslyReceived && isNowReceived && beamsChanged) {
  stockDelta -= existingOrder.orderedBeams; // Odejmij stare
  stockDelta += Number(orderedBeams);       // Dodaj nowe
}

// Aktualizacja magazynu w transakcji
if (stockDelta !== 0) {
  await tx.warehouseStock.update({
    data: { currentStockBeams: currentStockBeams + stockDelta }
  });
}
```

#### Bezpieczeństwo:
- ✅ Wszystkie operacje wykonywane w transakcji Prisma
- ✅ Rollback automatyczny przy błędzie
- ✅ Atomowość operacji (albo wszystko, albo nic)

---

### 1.2 Usuwanie zamówienia (DELETE /api/warehouse-orders/:id)

**Plik:** `apps/api/src/routes/warehouse-orders.ts:279-322`

#### Zachowanie:

```typescript
// Jeśli zamówienie było odebrane (status='received')
if (existingOrder.status === 'received') {
  // ODEJMIJ bele z magazynu przed usunięciem
  currentStockBeams -= existingOrder.orderedBeams;
}

// Następnie usuń zamówienie
await tx.warehouseOrder.delete({ where: { id } });
```

#### Przykład:

```
Stan początkowy:
- Zamówienie #123: status='received', orderedBeams=50
- Magazyn profil 60 RAL9016: currentStockBeams=200

DELETE /api/warehouse-orders/123

Stan końcowy:
- Zamówienie #123: USUNIĘTE
- Magazyn profil 60 RAL9016: currentStockBeams=150 ✅ (-50)
```

#### Bezpieczeństwo:
- ✅ Operacja w transakcji
- ✅ Sprawdzanie istnienia zamówienia przed usunięciem
- ✅ Automatyczne odejmowanie bel tylko dla statusu 'received'

---

## 2. Rollback inwentaryzacji magazynu

### 2.1 Cofanie miesięcznej inwentaryzacji (POST /api/warehouse/rollback-inventory)

**Plik:** `apps/api/src/routes/warehouse.ts:286-380`

#### Cel:
Umożliwia cofnięcie ostatniej inwentaryzacji w przypadku błędnego wprowadzenia danych z natury.

#### Mechanizm:

```typescript
// 1. Znajdź ostatnie wpisy z historii dla koloru
const lastInventoryRecords = await prisma.warehouseHistory.findMany({
  where: { colorId },
  orderBy: { recordedAt: 'desc' },
  take: 100
});

// 2. Grupuj wpisy z tej samej inwentaryzacji (w ciągu 1 minuty)
const inventoryToRollback = lastInventoryRecords.filter(record => {
  const timeDiff = Math.abs(latestDate.getTime() - record.recordedAt.getTime());
  return timeDiff < 60000; // 60 sekund
});

// 3. W transakcji:
await prisma.$transaction(async (tx) => {
  // a) Przywróć stany magazynowe do wartości obliczonych
  await tx.warehouseStock.update({
    data: { currentStockBeams: record.calculatedStock }
  });

  // b) Usuń wpisy z historii
  await tx.warehouseHistory.delete({ where: { id: record.id } });

  // c) Przywróć zarchiwizowane zlecenia
  await tx.order.updateMany({
    where: { status: 'archived', archivedAt: [w czasie inwentaryzacji] },
    data: { status: 'completed', archivedAt: null }
  });
});
```

#### Co zostaje cofnięte:

| Element | Stan przed rollback | Stan po rollback |
|---------|-------------------|------------------|
| **Stan magazynowy** | Wartość z natury (actualStock) | Wartość obliczona (calculatedStock) |
| **Historia** | Wpis w warehouse_history | Wpis usunięty |
| **Zlecenia** | status='archived' | status='completed' |

#### Przykład użycia:

```bash
POST /api/warehouse/rollback-inventory
Content-Type: application/json

{
  "colorId": 1
}

# Odpowiedź:
{
  "success": true,
  "message": "Cofnięto inwentaryzację z 2025-12-01T20:15:30.000Z",
  "rolledBackRecords": [
    {
      "profileId": 60,
      "restoredStock": 145,
      "removedActualStock": 150
    },
    ...
  ],
  "restoredOrdersCount": 8
}
```

#### Ograniczenia:
- Cofa TYLKO ostatnią inwentaryzację dla danego koloru
- Nie można cofnąć starszych inwentaryzacji
- Jeśli od inwentaryzacji minęło dużo czasu i dodano nowe zamówienia, rollback może nie być bezpieczny

#### Bezpieczeństwo:
- ✅ Wszystkie operacje w transakcji
- ✅ Znajdowanie powiązanych zleceń po czasie
- ✅ Przywracanie kompletnego stanu sprzed inwentaryzacji

---

## 3. Przenoszenie zleceń między dostawami

### 3.1 Przeniesienie zlecenia (POST /api/deliveries/:id/move-order)

**Plik:** `apps/api/src/routes/deliveries.ts:456-498`

#### Problem przed poprawką:
```typescript
// ❌ BEZ TRANSAKCJI - możliwa utrata zlecenia
await prisma.deliveryOrder.delete({ ... }); // Usuń z dostawy A
// 💥 Jeśli tutaj wystąpi błąd, zlecenie zniknie!
await prisma.deliveryOrder.create({ ... }); // Dodaj do dostawy B
```

#### Rozwiązanie:
```typescript
// ✅ Z TRANSAKCJĄ - bezpieczne przeniesienie
const deliveryOrder = await prisma.$transaction(async (tx) => {
  // 1. Usuń z obecnej dostawy
  await tx.deliveryOrder.delete({
    where: { deliveryId_orderId: { deliveryId: sourceId, orderId } }
  });

  // 2. Pobierz maksymalną pozycję w docelowej dostawie
  const maxPosition = await tx.deliveryOrder.aggregate({
    where: { deliveryId: targetDeliveryId },
    _max: { position: true }
  });

  // 3. Dodaj do docelowej dostawy
  return await tx.deliveryOrder.create({
    data: {
      deliveryId: targetDeliveryId,
      orderId,
      position: (maxPosition._max.position || 0) + 1
    }
  });
});
```

#### Zachowanie:

| Scenariusz | Bez transakcji | Z transakcją |
|------------|----------------|--------------|
| Usunięcie z A: ✅, Dodanie do B: ✅ | Sukces | Sukces ✅ |
| Usunięcie z A: ✅, Dodanie do B: ❌ | Zlecenie znika ❌ | Rollback - zlecenie zostaje w A ✅ |
| Usunięcie z A: ❌ | Błąd ❌ | Błąd (zlecenie w A) ✅ |

#### Przykład:

```bash
POST /api/deliveries/5/move-order
Content-Type: application/json

{
  "orderId": 123,
  "targetDeliveryId": 8
}

# Przed:
# Dostawa #5: [order 120, order 123, order 125]
# Dostawa #8: [order 130, order 135]

# Po (sukces):
# Dostawa #5: [order 120, order 125]
# Dostawa #8: [order 130, order 135, order 123]

# Po (błąd w transakcji):
# Dostawa #5: [order 120, order 123, order 125] ✅ Bez zmian
# Dostawa #8: [order 130, order 135] ✅ Bez zmian
```

---

## 4. Operacje dynamiczne (bez potrzeby odwrotnych operacji)

### Dlaczego niektóre operacje NIE wymagają odwrotnych działań?

Następujące statystyki są **obliczane dynamicznie** przy każdym zapytaniu, więc automatycznie reagują na zmiany:

#### 4.1 Liczba okien w zleceniach
```typescript
// Obliczane z order_windows przy każdym GET /api/orders/:id
const totalWindows = await prisma.orderWindow.aggregate({
  where: { orderId },
  _sum: { quantity: true }
});
```

**Zachowanie:**
- Dodanie okna do zlecenia → następne zapytanie zwraca nową sumę ✅
- Usunięcie okna → następne zapytanie zwraca pomniejszoną sumę ✅
- Brak potrzeby odwrotnych operacji ✅

#### 4.2 Suma wartości dostaw
```typescript
// Obliczane przy każdym GET /api/deliveries/:id
delivery.deliveryOrders.forEach(dOrder => {
  totalValuePln += parseFloat(dOrder.order.valuePln);
  totalValueEur += parseFloat(dOrder.order.valueEur);
});
```

**Zachowanie:**
- Dodanie zlecenia do dostawy → suma automatycznie rośnie ✅
- Usunięcie zlecenia z dostawy → suma automatycznie maleje ✅

#### 4.3 Zapotrzebowanie materiałowe
```typescript
// Obliczane przez groupBy przy każdym zapytaniu
const demands = await prisma.orderRequirement.groupBy({
  by: ['profileId', 'colorId'],
  where: { order: { status: { notIn: ['archived', 'completed'] } } },
  _sum: { beamsCount: true, meters: true }
});
```

**Zachowanie:**
- Zmiana statusu zlecenia → zapotrzebowanie automatycznie się przelicza ✅
- Dodanie/usunięcie requirementu → natychmiastowy wpływ na sumę ✅

---

## 5. Best Practices

### ✅ Kiedy stosować odwrotne operacje:

1. **Dane persystowane** (zapisywane w bazie jako wartości)
   - Stan magazynowy (`currentStockBeams`)
   - Historia inwentaryzacji (`warehouseHistory`)
   - Statusy zleceń

2. **Operacje dwukierunkowe**
   - Dodawanie/odejmowanie
   - Przenoszenie między encjami
   - Zmiana statusów wpływająca na inne tabele

3. **Operacje transakcyjne**
   - Wymagające spójności danych
   - Potencjalnie częściowe niepowodzenie

### ❌ Kiedy NIE stosować odwrotnych operacji:

1. **Dane obliczane dynamicznie**
   - Agregacje przez `groupBy`
   - Sumy przy pobieraniu danych
   - Liczniki generowane w locie

2. **Operacje tylko do odczytu**
   - Wyszukiwanie
   - Filtrowanie
   - Sortowanie

---

## 6. Schemat przepływu danych

```
┌─────────────────────────────────────────────────────────┐
│         WAREHOUSE ORDER LIFECYCLE                        │
└─────────────────────────────────────────────────────────┘

CREATE ORDER (status=pending)
    │
    ├──> orderedBeams: 100
    └──> magazyn: 0 (bez zmian)

UPDATE: status → received
    │
    ├──> magazyn: +100 ✅
    └──> historia: brak

UPDATE: orderedBeams 100 → 150 (status=received)
    │
    ├──> magazyn: +50 ✅ (razem +150)
    └──> historia: brak

UPDATE: status → cancelled
    │
    ├──> magazyn: -150 ✅ (powrót do 0)
    └──> historia: brak

DELETE ORDER
    │
    └──> magazyn: już 0 (bez zmian)

┌─────────────────────────────────────────────────────────┐
│         MONTHLY INVENTORY LIFECYCLE                      │
└─────────────────────────────────────────────────────────┘

MONTHLY UPDATE
    │
    ├──> warehouseStock.currentStockBeams: actualStock
    ├──> warehouseHistory: CREATE (calculatedStock, actualStock, difference)
    └──> orders (status=completed): UPDATE status=archived

ROLLBACK INVENTORY
    │
    ├──> warehouseStock.currentStockBeams: calculatedStock (z historii)
    ├──> warehouseHistory: DELETE ostatnie wpisy
    └──> orders (status=archived): UPDATE status=completed
```

---

## 7. Testowanie

### Testy manualne:

#### Test 1: Zmiana statusu zamówienia
```bash
# 1. Utwórz zamówienie
POST /api/warehouse-orders
{ "profileId": 60, "colorId": 1, "orderedBeams": 100, ... }
# magazyn: 200 bel

# 2. Zmień status na 'received'
PUT /api/warehouse-orders/1
{ "status": "received" }
# magazyn: 300 bel ✅

# 3. Zmień status na 'cancelled'
PUT /api/warehouse-orders/1
{ "status": "cancelled" }
# magazyn: 200 bel ✅ (powrót do stanu sprzed)

# 4. Zmień ponownie na 'received'
PUT /api/warehouse-orders/1
{ "status": "received" }
# magazyn: 300 bel ✅

# 5. Usuń zamówienie
DELETE /api/warehouse-orders/1
# magazyn: 200 bel ✅
```

#### Test 2: Zmiana liczby bel
```bash
# 1. Zamówienie received z 100 belami
# magazyn: 300 bel

# 2. Zmień na 150 bel
PUT /api/warehouse-orders/1
{ "orderedBeams": 150 }
# magazyn: 350 bel ✅ (+50)

# 3. Zmień na 80 bel
PUT /api/warehouse-orders/1
{ "orderedBeams": 80 }
# magazyn: 280 bel ✅ (-70)
```

#### Test 3: Rollback inwentaryzacji
```bash
# 1. Stan przed inwentaryzacją
# Profil 60: 145 bel (obliczony)

# 2. Inwentaryzacja
POST /api/warehouse/monthly-update
{ "colorId": 1, "updates": [{ "profileId": 60, "actualStock": 150 }] }
# Profil 60: 150 bel

# 3. Rollback
POST /api/warehouse/rollback-inventory
{ "colorId": 1 }
# Profil 60: 145 bel ✅ (przywrócony stan obliczony)
```

---

## 8. Troubleshooting

### Problem: Stan magazynowy ujemny po operacjach

**Przyczyna:** Brak odwrotnej operacji lub błąd w obliczeniach

**Rozwiązanie:**
1. Sprawdź historię zamówień dla danego profilu/koloru
2. Zweryfikuj wszystkie zamówienia ze statusem 'received'
3. Przeliczy stan magazynowy ręcznie
4. Skoryguj przez inwentaryzację lub bezpośrednią aktualizację

### Problem: Zlecenie zniknęło podczas przenoszenia

**Przyczyna:** Błąd przed wdrożeniem transakcji (stare wersje kodu)

**Rozwiązanie:**
1. Sprawdź logi API (błędy podczas operacji)
2. Przeszukaj tabelę `delivery_order` przez `orderId`
3. W razie potrzeby odtwórz ręcznie przez POST do dostawy

### Problem: Rollback inwentaryzacji nie działa

**Przyczyna:** Brak wpisów w historii lub niewłaściwy colorId

**Rozwiązanie:**
1. Sprawdź `warehouse_history` dla danego koloru:
   ```sql
   SELECT * FROM warehouse_history WHERE colorId = X ORDER BY recordedAt DESC;
   ```
2. Upewnij się, że używasz właściwego colorId
3. Sprawdź czy inwentaryzacja została zapisana w historii

---

## 9. Podsumowanie gwarancji spójności danych

| Operacja | Transakcja | Odwrotna operacja | Spójność danych |
|----------|-----------|-------------------|-----------------|
| Create warehouse order | - | - | ✅ |
| Update order: status change | ✅ | ✅ (dodaj/odejmij bele) | ✅ |
| Update order: beams change | ✅ | ✅ (różnica bel) | ✅ |
| Delete warehouse order | ✅ | ✅ (odejmij bele) | ✅ |
| Monthly inventory | ✅ | ✅ (rollback) | ✅ |
| Move order between deliveries | ✅ | - (rollback transakcji) | ✅ |
| Calculate totals | - | - (dynamiczne) | ✅ |

**Status:** Wszystkie krytyczne operacje mają pełną ochronę spójności danych.

---

**Wersja dokumentu:** 1.0
**Data utworzenia:** 2025-12-01
**Ostatnia aktualizacja:** 2025-12-01
