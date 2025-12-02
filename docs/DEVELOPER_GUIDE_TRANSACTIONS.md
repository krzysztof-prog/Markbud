# Przewodnik: Transakcje i operacje odwrotne dla deweloperów

## Kiedy używać transakcji w Markbud?

### ✅ ZAWSZE używaj transakcji gdy:

1. **Operacja modyfikuje wiele tabel**
   ```typescript
   // ❌ ŹLE - bez transakcji
   await prisma.warehouseStock.update({ ... });
   await prisma.warehouseOrder.update({ ... });

   // ✅ DOBRZE - z transakcją
   await prisma.$transaction(async (tx) => {
     await tx.warehouseStock.update({ ... });
     await tx.warehouseOrder.update({ ... });
   });
   ```

2. **Operacja przenosi dane między rekordami**
   ```typescript
   // Przenoszenie zlecenia między dostawami
   await prisma.$transaction(async (tx) => {
     await tx.deliveryOrder.delete({ ... });  // Usuń z A
     await tx.deliveryOrder.create({ ... });  // Dodaj do B
   });
   ```

3. **Operacja wymaga spójności agregowanych danych**
   ```typescript
   // Aktualizacja zamówienia wpływająca na magazyn
   await prisma.$transaction(async (tx) => {
     await tx.warehouseStock.update({ ... });
     await tx.warehouseOrder.update({ ... });
   });
   ```

### ❌ NIE używaj transakcji gdy:

1. **Pojedyncza operacja na jednej tabeli**
   ```typescript
   // To jest bezpieczne bez transakcji
   await prisma.order.update({
     where: { id },
     data: { notes: "Nowa notatka" }
   });
   ```

2. **Operacja tylko do odczytu**
   ```typescript
   // Odczyt nigdy nie wymaga transakcji
   const orders = await prisma.order.findMany({ ... });
   ```

3. **Dane obliczane dynamicznie**
   ```typescript
   // Agregacje są bezpieczne bez transakcji
   const total = await prisma.orderWindow.aggregate({
     _sum: { quantity: true }
   });
   ```

---

## Pattern: Operacje odwrotne

### Wzorzec 1: Dodaj/Odejmij przy zmianie statusu

```typescript
// PRZYKŁAD: Aktualizacja zamówienia magazynowego
await prisma.$transaction(async (tx) => {
  const existingOrder = await tx.warehouseOrder.findUnique({ ... });

  // Oblicz różnicę dla magazynu
  let stockDelta = 0;

  if (statusChangedTo_Received) {
    stockDelta += orderedBeams;  // DODAJ
  }

  if (statusChangedFrom_Received) {
    stockDelta -= orderedBeams;  // ODEJMIJ
  }

  // Zastosuj zmianę
  if (stockDelta !== 0) {
    await tx.warehouseStock.update({
      data: { currentStockBeams: currentStockBeams + stockDelta }
    });
  }

  await tx.warehouseOrder.update({ ... });
});
```

### Wzorzec 2: Przywracanie poprzedniego stanu

```typescript
// PRZYKŁAD: Rollback inwentaryzacji
await prisma.$transaction(async (tx) => {
  // 1. Zapisz dane potrzebne do rollback
  const historyRecord = await tx.warehouseHistory.findFirst({ ... });

  // 2. Przywróć poprzedni stan
  await tx.warehouseStock.update({
    data: { currentStockBeams: historyRecord.calculatedStock }
  });

  // 3. Usuń wpis który cofamy
  await tx.warehouseHistory.delete({ ... });
});
```

### Wzorzec 3: Przenoszenie między encjami

```typescript
// PRZYKŁAD: Przenoszenie zlecenia
await prisma.$transaction(async (tx) => {
  // 1. Usuń z źródła
  await tx.deliveryOrder.delete({
    where: { deliveryId_orderId: { deliveryId: sourceId, orderId } }
  });

  // 2. Pobierz kontekst dla celu
  const maxPosition = await tx.deliveryOrder.aggregate({ ... });

  // 3. Dodaj do celu
  await tx.deliveryOrder.create({
    data: {
      deliveryId: targetId,
      orderId,
      position: maxPosition._max.position + 1
    }
  });
});
```

---

## Checklist przed dodaniem nowej funkcji

### Czy moja funkcja wymaga operacji odwrotnej?

Odpowiedz na pytania:

- [ ] Czy operacja **modyfikuje wartość liczbową** która jest sumą/agregacją?
  - TAK → Potrzebujesz operacji odwrotnej
  - NIE → Przejdź dalej

- [ ] Czy ta wartość jest **persystowana w bazie**?
  - TAK → Potrzebujesz operacji odwrotnej
  - NIE → Czy jest obliczana dynamicznie? Jeśli tak, nie potrzebujesz

- [ ] Czy operacja **przenosi dane między rekordami**?
  - TAK → Użyj transakcji
  - NIE → Przejdź dalej

- [ ] Czy operacja **zmienia status wpływający na inne tabele**?
  - TAK → Potrzebujesz operacji odwrotnej + transakcja
  - NIE → Pojedyncza operacja może być OK

### Przykłady:

#### ✅ Wymaga operacji odwrotnej:
- Dodawanie produktu do koszyka → zwiększ `cartTotal`
- Usuwanie produktu z koszyka → zmniejsz `cartTotal`
- Zmiana statusu zamówienia → wpływ na stan magazynu

#### ❌ Nie wymaga operacji odwrotnej:
- Zmiana opisu produktu
- Dodanie komentarza do zlecenia
- Aktualizacja daty dostawy (bez wpływu na inne dane)

---

## Częste błędy i jak ich unikać

### Błąd 1: Operacje poza transakcją

```typescript
// ❌ ŹLE
async function updateOrderAndStock(orderId: number) {
  await prisma.warehouseStock.update({ ... });
  // 💥 Jeśli tutaj wystąpi błąd, magazyn jest zaktualizowany, ale zamówienie nie!
  await prisma.warehouseOrder.update({ ... });
}

// ✅ DOBRZE
async function updateOrderAndStock(orderId: number) {
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.update({ ... });
    await tx.warehouseOrder.update({ ... });
    // Jeśli cokolwiek się nie uda, wszystko zostanie wycofane
  });
}
```

### Błąd 2: Zapomnienie o operacji odwrotnej

```typescript
// ❌ ŹLE
async function receiveOrder(orderId: number) {
  await prisma.warehouseStock.update({
    data: { currentStockBeams: { increment: orderedBeams } }
  });
  await prisma.warehouseOrder.update({
    data: { status: 'received' }
  });
  // Co jeśli potem zmienię status z powrotem na 'pending'?
  // Bele zostają w magazynie! ❌
}

// ✅ DOBRZE
async function updateOrderStatus(orderId: number, newStatus: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.warehouseOrder.findUnique({ ... });

    let stockDelta = 0;
    if (order.status === 'received' && newStatus !== 'received') {
      stockDelta -= order.orderedBeams; // ODEJMIJ
    }
    if (order.status !== 'received' && newStatus === 'received') {
      stockDelta += order.orderedBeams; // DODAJ
    }

    if (stockDelta !== 0) {
      await tx.warehouseStock.update({ ... });
    }

    await tx.warehouseOrder.update({ data: { status: newStatus } });
  });
}
```

### Błąd 3: Race condition przy agregacjach

```typescript
// ❌ ŹLE - dwa requesty jednocześnie mogą nadpisać dane
const current = await prisma.cart.findUnique({ ... });
await prisma.cart.update({
  data: { total: current.total + itemPrice }
});

// ✅ DOBRZE - atomowa operacja
await prisma.cart.update({
  data: { total: { increment: itemPrice } }
});

// ✅ JESZCZE LEPIEJ - transakcja z izolacją
await prisma.$transaction(async (tx) => {
  const current = await tx.cart.findUnique({ ... });
  await tx.cart.update({
    data: { total: current.total + itemPrice }
  });
});
```

---

## Template dla nowej funkcji z operacją odwrotną

```typescript
/**
 * Template dla funkcji modyfikującej dane agregowane
 */
async function updateAggregatedData(
  id: number,
  oldValue: number,
  newValue: number
) {
  // 1. Walidacja
  if (!id || oldValue === newValue) {
    return; // Brak zmian
  }

  // 2. Transakcja
  return await prisma.$transaction(async (tx) => {
    // 3. Pobierz obecny stan
    const currentRecord = await tx.yourTable.findUnique({
      where: { id }
    });

    if (!currentRecord) {
      throw new Error('Record not found');
    }

    // 4. Oblicz różnicę (delta)
    const delta = newValue - oldValue;

    // 5. Aktualizuj zagregowane dane
    if (delta !== 0) {
      await tx.aggregatedTable.update({
        where: { relatedId: currentRecord.relatedId },
        data: {
          aggregatedField: {
            increment: delta  // Prisma automatycznie obsłuży dodawanie/odejmowanie
          }
        }
      });
    }

    // 6. Aktualizuj główny rekord
    const updated = await tx.yourTable.update({
      where: { id },
      data: { value: newValue }
    });

    return updated;
  });
}
```

---

## Debugging transakcji

### Włączanie logów Prisma

```typescript
// apps/api/src/index.ts
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', e.duration + 'ms');
});
```

### Testowanie rollback

```typescript
// Test czy transakcja naprawdę wycofuje zmiany
async function testTransactionRollback() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.warehouseStock.update({
        where: { id: 1 },
        data: { currentStockBeams: 999 }
      });

      // Wymuś błąd
      throw new Error('Test rollback');
    });
  } catch (error) {
    console.log('Transaction rolled back');
  }

  // Sprawdź czy wartość się nie zmieniła
  const stock = await prisma.warehouseStock.findUnique({ where: { id: 1 } });
  console.log('Stock after rollback:', stock.currentStockBeams);
  // Powinno być oryginalną wartością, NIE 999
}
```

---

## Najlepsze praktyki

### 1. Zawsze sprawdzaj istnienie rekordu przed modyfikacją

```typescript
await prisma.$transaction(async (tx) => {
  const record = await tx.table.findUnique({ where: { id } });

  if (!record) {
    throw new Error('Record not found');
  }

  // ... reszta operacji
});
```

### 2. Używaj increment/decrement dla liczb

```typescript
// ✅ DOBRZE - atomowe
await prisma.table.update({
  data: { count: { increment: 1 } }
});

// ❌ ŹLE - race condition
const record = await prisma.table.findUnique({ ... });
await prisma.table.update({
  data: { count: record.count + 1 }
});
```

### 3. Dokumentuj operacje odwrotne w komentarzach

```typescript
// UPDATE zamówienia magazynowego
// OPERACJE ODWROTNE:
// - status pending→received: DODAJ bele do magazynu
// - status received→pending: ODEJMIJ bele z magazynu
// - zmiana orderedBeams: AKTUALIZUJ różnicę w magazynie
async function updateWarehouseOrder(...) {
  // ...
}
```

### 4. Loguj krytyczne operacje

```typescript
await prisma.$transaction(async (tx) => {
  console.log(`[WAREHOUSE] Updating order ${id}: ${oldStatus} → ${newStatus}`);
  console.log(`[WAREHOUSE] Stock delta: ${stockDelta}`);

  await tx.warehouseStock.update({ ... });
  await tx.warehouseOrder.update({ ... });

  console.log(`[WAREHOUSE] Update completed successfully`);
});
```

---

## Pomocne komendy SQL do debugowania

```sql
-- Sprawdź stan magazynu dla profilu
SELECT
  ws.currentStockBeams,
  p.number as profile_number,
  c.code as color_code
FROM warehouse_stock ws
JOIN profile p ON ws.profileId = p.id
JOIN color c ON ws.colorId = c.id
WHERE ws.profileId = 60 AND ws.colorId = 1;

-- Znajdź wszystkie otrzymane zamówienia dla profilu
SELECT
  id,
  orderedBeams,
  status,
  createdAt
FROM warehouse_order
WHERE profileId = 60
  AND colorId = 1
  AND status = 'received';

-- Suma bel z otrzymanych zamówień (powinna być <= currentStockBeams)
SELECT
  SUM(orderedBeams) as total_received_beams
FROM warehouse_order
WHERE profileId = 60
  AND colorId = 1
  AND status = 'received';

-- Historia inwentaryzacji
SELECT
  calculatedStock,
  actualStock,
  difference,
  recordedAt
FROM warehouse_history
WHERE profileId = 60 AND colorId = 1
ORDER BY recordedAt DESC
LIMIT 5;
```

---

**Pamiętaj:** Każda operacja modyfikująca zagregowane dane powinna mieć przemyślaną ścieżkę wycofania!
