# Edge Cases Analysis - System AKROBUD

> Analiza potencjalnych edge cases w kluczowych modułach systemu
> Data utworzenia: 2025-12-29

---

## Spis treści

1. [Moduł Zleceń (Orders)](#moduł-zleceń-orders)
2. [Moduł Dostaw (Deliveries)](#moduł-dostaw-deliveries)
3. [Moduł Magazynu (Warehouse)](#moduł-magazynu-warehouse)
4. [Integracja Schuco](#integracja-schuco)
5. [Parsowanie CSV i Importy](#parsowanie-csv-i-importy)
6. [Obsługa Dostaw Szyb](#obsługa-dostaw-szyb)
7. [Rekomendacje](#rekomendacje)

---

## Moduł Zleceń (Orders)

### Pliki:
- [apps/api/src/services/orderService.ts](../../apps/api/src/services/orderService.ts)
- [apps/api/src/repositories/OrderRepository.ts](../../apps/api/src/repositories/OrderRepository.ts)

### Edge Cases Zidentyfikowane

#### 1. **Brak walidacji numerów zleceń**
**Lokalizacja:** `orderService.ts:41-47` (createOrder)

**Problem:**
```typescript
async createOrder(data: { orderNumber: string; status?: string; valuePln?: number; valueEur?: number }) {
  const order = await this.repository.create(data);
  emitOrderCreated(order);
  return order;
}
```

**Edge Cases:**
- ✅ Duplikaty numerów zleceń - chronione przez `@@unique` w Prisma schema
- ❌ Puste stringi `""` jako orderNumber - BRAK WALIDACJI
- ❌ Bardzo długie numery (>100 znaków) - BRAK LIMITU
- ❌ Znaki specjalne w numerach - BRAK SANITYZACJI
- ❌ Tylko whitespace `"   "` - BRAK TRIM

**Rekomendacja:**
```typescript
// Dodać walidację w Zod schema
const orderNumberSchema = z.string()
  .trim()
  .min(1, "Numer zlecenia nie może być pusty")
  .max(50, "Numer zlecenia zbyt długi")
  .regex(/^[\w\s-]+$/, "Niedozwolone znaki w numerze zlecenia");
```

---

#### 2. **Race Condition przy usuwaniu zlecenia powiązanego z dostawą**
**Lokalizacja:** `orderService.ts:60-67` (deleteOrder)

**Problem:**
```typescript
async deleteOrder(id: number) {
  await this.getOrderById(id); // Check 1
  await this.repository.delete(id); // Delete - może się zmienić między sprawdzeniem
  emitOrderDeleted(id);
}
```

**Edge Cases:**
- ❌ Zlecenie dodane do dostawy między sprawdzeniem a usunięciem
- ❌ Zlecenie powiązane z DeliveryOrder może zablokować usunięcie (foreign key)
- ✅ Obsługiwane przez Prisma onDelete: Cascade w schema

**Obecna ochrona:**
```prisma
// schema.prisma
model DeliveryOrder {
  delivery   Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

**Potencjalny problem:**
Jeśli zlecenie jest w trakcie produkcji lub już wysłane, usunięcie może spowodować utratę danych historycznych.

**Rekomendacja:**
Zamiast usuwania, wprowadzić soft delete lub dodać walidację:
```typescript
async deleteOrder(id: number) {
  const order = await this.getOrderById(id);

  // Sprawdź czy można usunąć
  const deliveries = await this.repository.getOrderDeliveries(id);
  if (deliveries.some(d => d.status === 'shipped' || d.status === 'delivered')) {
    throw new ValidationError('Nie można usunąć zlecenia przypisanego do wysłanej/dostarczonej dostawy');
  }

  await this.repository.delete(id);
  emitOrderDeleted(id);
}
```

---

#### 3. **Brak walidacji wartości finansowych**
**Lokalizacja:** `orderService.ts:41-47` (createOrder)

**Edge Cases:**
- ❌ Wartości ujemne: `valuePln: -1000`
- ❌ Wartości `Infinity` lub `NaN`
- ❌ Bardzo duże liczby przekraczające zakres Float w DB
- ❌ Nieprawidłowe formatowanie: `"1,234.56"` vs `1234.56`

**Rekomendacja:**
```typescript
const financialValueSchema = z.number()
  .nonnegative("Wartość nie może być ujemna")
  .finite("Wartość musi być liczbą skończoną")
  .max(999999999.99, "Wartość zbyt duża");
```

---

## Moduł Dostaw (Deliveries)

### Pliki:
- [apps/api/src/services/deliveryService.ts](../../apps/api/src/services/deliveryService.ts)
- [apps/api/src/repositories/DeliveryRepository.ts](../../apps/api/src/repositories/DeliveryRepository.ts)

### Edge Cases Zidentyfikowane

#### 1. **Generowanie numerów dostaw - Race Condition**
**Lokalizacja:** `deliveryService.ts:80-94` (generateDeliveryNumber)

**Problem:**
```typescript
private async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
  const datePrefix = formatPolishDate(deliveryDate);
  const { start, end } = getDayRange(deliveryDate);

  const existingDeliveries = await this.repository.findAll({
    from: start,
    to: end,
  }); // Race: dwie dostawy mogą zobaczyć tę samą liczbę

  const count = existingDeliveries.data.length + 1;
  const suffix = toRomanNumeral(count);

  return `${datePrefix}_${suffix}`;
}
```

**Edge Cases:**
- ❌ **CRITICAL RACE CONDITION**: Dwie równoczesne dostawy na ten sam dzień mogą dostać ten sam numer
- ❌ Jeśli dostawa zostanie usunięta, następna dostawa "wypełni dziurę" w numeracji (np. I, III → tworzy II)

**Scenariusz problemu:**
```
Request A: Tworzy dostawę na 2025-01-15 → Widzi 0 dostaw → Tworzy "15.01.2025_I"
Request B: Tworzy dostawę na 2025-01-15 (równocześnie) → Widzi 0 dostaw → Tworzy "15.01.2025_I" ❌ DUPLIKAT
```

**Rekomendacja:**
```typescript
// Użyć transakcji z SELECT FOR UPDATE lub unique constraint
private async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
  return this.repository.prisma.$transaction(async (tx) => {
    const datePrefix = formatPolishDate(deliveryDate);
    const { start, end } = getDayRange(deliveryDate);

    // Lock rows to prevent concurrent reads
    const existingDeliveries = await tx.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Delivery"
      WHERE "deliveryDate" >= ${start} AND "deliveryDate" <= ${end}
      FOR UPDATE
    `;

    const count = existingDeliveries[0].count + 1;
    const suffix = toRomanNumeral(count);

    return `${datePrefix}_${suffix}`;
  });
}
```

**Alternatywna metoda:** Dodać `@@unique([deliveryDate, deliveryNumber])` i retry przy konflikcie.

---

#### 2. **Zmiana kolejności zleceń w dostawie - Dirty Read**
**Lokalizacja:** `deliveryService.ts:142-145` (reorderDeliveryOrders)

**Problem:**
```typescript
async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
  await this.repository.reorderDeliveryOrders(deliveryId, orderIds);
  return { success: true };
}

// Repository:
async reorderDeliveryOrders(deliveryId: number, orderIds: number[]): Promise<void> {
  const updates = orderIds.map((orderId, index) =>
    this.prisma.deliveryOrder.update({
      where: { deliveryId_orderId: { deliveryId, orderId } },
      data: { position: index + 1 },
    })
  );
  await this.prisma.$transaction(updates);
}
```

**Edge Cases:**
- ✅ Używa transakcji - bezpieczne
- ❌ **BRAK WALIDACJI:** Czy wszystkie orderIds należą do tego deliveryId?
- ❌ Jeśli lista orderIds jest niepełna, niektóre zlecenia pozostaną z starymi pozycjami
- ❌ Duplikaty w orderIds spowodują błąd unique constraint

**Rekomendacja:**
```typescript
async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
  // Walidacja 1: Usuń duplikaty
  const uniqueOrderIds = [...new Set(orderIds)];

  // Walidacja 2: Sprawdź czy wszystkie zlecenia należą do tej dostawy
  const existingOrders = await this.repository.getDeliveryOrders(deliveryId);
  const existingOrderIds = new Set(existingOrders.map(o => o.orderId));

  const invalidOrders = uniqueOrderIds.filter(id => !existingOrderIds.has(id));
  if (invalidOrders.length > 0) {
    throw new ValidationError(`Zlecenia nie należą do tej dostawy: ${invalidOrders.join(', ')}`);
  }

  // Walidacja 3: Czy wszystkie zlecenia są uwzględnione?
  if (uniqueOrderIds.length !== existingOrderIds.size) {
    throw new ValidationError('Lista zleceń jest niepełna');
  }

  await this.repository.reorderDeliveryOrders(deliveryId, uniqueOrderIds);
  return { success: true };
}
```

---

#### 3. **Przenoszenie zlecenia między dostawami - Lost Update**
**Lokalizacja:** `deliveryService.ts:147-165` (moveOrderBetweenDeliveries)

**Problem:**
```typescript
async moveOrderBetweenDeliveries(
  sourceDeliveryId: number,
  targetDeliveryId: number,
  orderId: number
) {
  // Execute as atomic transaction to prevent data loss
  const deliveryOrder = await this.repository.moveOrderBetweenDeliveries(
    sourceDeliveryId,
    targetDeliveryId,
    orderId
  );

  emitDeliveryUpdated({ id: sourceDeliveryId });
  emitDeliveryUpdated({ id: targetDeliveryId });
  emitOrderUpdated({ id: orderId });

  return deliveryOrder;
}
```

**Edge Cases:**
- ✅ Używa transakcji w repository
- ❌ **BRAK WALIDACJI:** Czy source i target to różne dostawy?
- ❌ Czy obie dostawy istnieją?
- ❌ Czy zlecenie faktycznie należy do source delivery?
- ❌ Czy target delivery ma status pozwalający na dodanie zlecenia?

**Rekomendacja:**
```typescript
async moveOrderBetweenDeliveries(
  sourceDeliveryId: number,
  targetDeliveryId: number,
  orderId: number
) {
  // Walidacja 1: Różne dostawy
  if (sourceDeliveryId === targetDeliveryId) {
    throw new ValidationError('Dostawy źródłowa i docelowa muszą być różne');
  }

  // Walidacja 2: Sprawdź czy dostawy istnieją
  const [source, target] = await Promise.all([
    this.getDeliveryById(sourceDeliveryId),
    this.getDeliveryById(targetDeliveryId)
  ]);

  // Walidacja 3: Status
  if (source.status === 'delivered' || target.status === 'delivered') {
    throw new ValidationError('Nie można przenosić zleceń do/z dostarczonych dostaw');
  }

  // Walidacja 4: Czy zlecenie należy do source
  const orderInSource = source.deliveryOrders.some(d => d.orderId === orderId);
  if (!orderInSource) {
    throw new ValidationError('Zlecenie nie należy do dostawy źródłowej');
  }

  const deliveryOrder = await this.repository.moveOrderBetweenDeliveries(
    sourceDeliveryId,
    targetDeliveryId,
    orderId
  );

  // Events...
  return deliveryOrder;
}
```

---

#### 4. **Agregacja wymagań profili - Division by Zero**
**Lokalizacja:** `deliveryService.ts:256-306` (getProfileRequirements)

**Problem:**
```typescript
// Add beams from meters: sum meters / 6m, rounded up
const beamsFromMeters = Math.ceil(data.meters / 6); // ✅ Bezpieczne - nie dzieli przez zero
const totalBeams = data.beams + beamsFromMeters;

const [profileIdStr, colorCode] = key.split('-');
const profileIdNum = parseInt(profileIdStr, 10);

if (isNaN(profileIdNum)) { // ✅ Sprawdza NaN
  return;
}
```

**Edge Cases:**
- ✅ Zabezpieczone przed NaN
- ❌ **BRAK WALIDACJI:** Jeśli `key` nie zawiera `-`, split zwróci tylko 1 element
- ❌ `colorCode` może być `undefined`

**Scenariusz problemu:**
```typescript
const key = "12345"; // Brak separatora '-'
const [profileIdStr, colorCode] = key.split('-');
// profileIdStr = "12345"
// colorCode = undefined ❌

result.push({
  colorCode, // undefined!
  // ...
});
```

**Rekomendacja:**
```typescript
profileMap.forEach((data, key) => {
  const parts = key.split('-');
  if (parts.length !== 2) {
    logger.warn(`Invalid profile key format: ${key}`);
    return;
  }

  const [profileIdStr, colorCode] = parts;
  const profileIdNum = parseInt(profileIdStr, 10);

  if (isNaN(profileIdNum) || !colorCode) {
    logger.warn(`Invalid profile data: profileId=${profileIdStr}, colorCode=${colorCode}`);
    return;
  }

  // ...
});
```

---

#### 5. **Statystyki okien wg dni tygodnia - Overflow w agregacji**
**Lokalizacja:** `deliveryService.ts:311-368` (getWindowsStatsByWeekday)

**Problem:**
```typescript
deliveries.forEach((delivery) => {
  const weekday = getDay(delivery.deliveryDate);
  const stats = weekdayStats.get(weekday)!; // ❌ Non-null assertion bez sprawdzenia

  stats.deliveriesCount += 1;

  delivery.deliveryOrders.forEach((dOrder) => {
    stats.totalWindows += dOrder.order.totalWindows || 0;
    stats.totalSashes += dOrder.order.totalSashes || 0;
    stats.totalGlasses += dOrder.order.totalGlasses || 0;
  });
});
```

**Edge Cases:**
- ❌ **Potential overflow:** Jeśli `totalWindows` jest bardzo duże, suma może przekroczyć `Number.MAX_SAFE_INTEGER`
- ❌ `getDay()` może zwrócić wartość spoza zakresu 0-6 (edge case w date handling)
- ❌ Non-null assertion `!` może rzucić błąd jeśli `weekday` jest nieprawidłowy

**Rekomendacja:**
```typescript
deliveries.forEach((delivery) => {
  const weekday = getDay(delivery.deliveryDate);

  // Sprawdź zakres
  if (weekday < 0 || weekday > 6) {
    logger.warn(`Invalid weekday: ${weekday} for delivery ${delivery.id}`);
    return;
  }

  const stats = weekdayStats.get(weekday);
  if (!stats) {
    logger.error(`Missing stats for weekday ${weekday}`);
    return;
  }

  stats.deliveriesCount += 1;

  delivery.deliveryOrders.forEach((dOrder) => {
    const windows = dOrder.order.totalWindows || 0;
    const sashes = dOrder.order.totalSashes || 0;
    const glasses = dOrder.order.totalGlasses || 0;

    // Sprawdź overflow (dla bezpieczeństwa)
    if (stats.totalWindows + windows > Number.MAX_SAFE_INTEGER) {
      logger.warn('Total windows overflow detected');
    } else {
      stats.totalWindows += windows;
    }

    stats.totalSashes += sashes;
    stats.totalGlasses += glasses;
  });
});
```

---

## Moduł Magazynu (Warehouse)

### Pliki:
- [apps/api/src/services/warehouseService.ts](../../apps/api/src/services/warehouseService.ts)
- [apps/api/src/repositories/WarehouseRepository.ts](../../apps/api/src/repositories/WarehouseRepository.ts)

### Edge Cases Zidentyfikowane

#### 1. **Aktualizacja stanu magazynu - Brak transakcji**
**Lokalizacja:** `warehouseService.ts:14-16` (updateStock)

**Problem:**
```typescript
async updateStock(id: number, currentStockBeams: number) {
  return this.repository.updateStock(id, currentStockBeams);
}
```

**Edge Cases:**
- ❌ **CRITICAL:** Brak transakcji przy jednoczesnych aktualizacjach
- ❌ Brak walidacji wartości ujemnych
- ❌ Brak historii zmian stanu magazynu (audit log)
- ❌ Brak mechanizmu optymistic locking

**Scenariusz problemu:**
```
Stan początkowy: 100 bel

Request A: Odejmuje 50 → czyta 100, zapisuje 50
Request B: Odejmuje 30 → czyta 100 (równocześnie), zapisuje 70

Wynik: Stan = 70 zamiast 20 ❌ LOST UPDATE
```

**Rekomendacja:**
```typescript
async updateStock(id: number, currentStockBeams: number) {
  if (currentStockBeams < 0) {
    throw new ValidationError('Stan magazynu nie może być ujemny');
  }

  return this.repository.prisma.$transaction(async (tx) => {
    // Odczytaj aktualny stan
    const current = await tx.warehouseStock.findUnique({
      where: { id },
      select: { currentStockBeams: true, version: true }
    });

    if (!current) {
      throw new NotFoundError('WarehouseStock');
    }

    // Aktualizuj z optimistic locking
    const updated = await tx.warehouseStock.updateMany({
      where: {
        id,
        version: current.version // Tylko jeśli wersja się nie zmieniła
      },
      data: {
        currentStockBeams,
        version: { increment: 1 }
      }
    });

    if (updated.count === 0) {
      throw new ConflictError('Stan magazynu został zmieniony przez inny proces');
    }

    // Zapisz historię
    await tx.warehouseHistory.create({
      data: {
        warehouseStockId: id,
        previousStock: current.currentStockBeams,
        newStock: currentStockBeams,
        changeType: 'manual_update',
        changedBy: 'system'
      }
    });

    return tx.warehouseStock.findUnique({ where: { id } });
  });
}
```

**Wymagana zmiana w schema:**
```prisma
model WarehouseStock {
  id                 Int      @id @default(autoincrement())
  currentStockBeams  Int
  version            Int      @default(0) // Dodać dla optimistic locking
  // ...
}
```

---

## Integracja Schuco

### Pliki:
- [apps/api/src/services/schuco/schucoOrderMatcher.ts](../../apps/api/src/services/schuco/schucoOrderMatcher.ts)
- [apps/api/src/services/schuco/schucoService.ts](../../apps/api/src/services/schuco/schucoService.ts)

### Edge Cases Zidentyfikowane

#### 1. **Ekstrakcja numerów zleceń - Regex Edge Cases**
**Lokalizacja:** `schucoOrderMatcher.ts:16-32` (extractOrderNumbers)

**Problem:**
```typescript
export function extractOrderNumbers(schucoOrderNumber: string): string[] {
  if (!schucoOrderNumber) {
    return [];
  }

  // Znajdź wszystkie 5-cyfrowe liczby w tekście
  const fiveDigitPattern = /(?<!\d)\d{5}(?!\d)/g;
  const matches = schucoOrderNumber.match(fiveDigitPattern);

  if (!matches) {
    return [];
  }

  return [...new Set(matches)];
}
```

**Edge Cases pokryte przez testy:** ✅
- Pojedynczy numer: `'23/2026/54255'` → `['54255']`
- Wiele numerów: `'123/2026/54255/54365'` → `['54255', '54365']`
- Duplikaty: `'123/2026/54255/54255'` → `['54255']`
- Tylko 4 cyfry: `'456/2027/5463'` → `[]`
- Puste: `''` → `[]`

**Dodatkowe edge cases NIE pokryte:**
- ❌ Bardzo długie stringi (>10000 znaków) - potencjalne ReDoS
- ❌ Unicode/emoji w numerze: `'54255😀54256'` - czy regex zadziała?
- ❌ Numery z zerem wiodącym: `'00123'` - czy to 5 cyfr?

**Test ReDoS:**
```typescript
const malicious = 'a'.repeat(100000) + '54255';
extractOrderNumbers(malicious); // Czy nie spowolni?
```

**Rekomendacja:**
```typescript
export function extractOrderNumbers(schucoOrderNumber: string): string[] {
  if (!schucoOrderNumber || schucoOrderNumber.length > 1000) {
    // Ogranicz długość dla bezpieczeństwa
    return [];
  }

  // Sanityzuj input - usuń znaki specjalne
  const sanitized = schucoOrderNumber.replace(/[^\d\s\/\-]/g, '');

  const fiveDigitPattern = /(?<!\d)\d{5}(?!\d)/g;
  const matches = sanitized.match(fiveDigitPattern);

  if (!matches) {
    return [];
  }

  return [...new Set(matches)];
}
```

---

#### 2. **Parsowanie tygodnia dostawy - Invalid Date**
**Lokalizacja:** `schucoOrderMatcher.ts:52-84` (parseDeliveryWeek)

**Problem:**
```typescript
export function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) {
    return null;
  }

  const match = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\s*\/\s*(\d{4})/i);

  if (!match) {
    return null;
  }

  const week = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

  if (week < 1 || week > 53 || year < 2020 || year > 2100) { // ✅ Walidacja zakresu
    return null;
  }

  // Oblicz datę pierwszego dnia tygodnia (poniedziałek)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);

  return targetDate;
}
```

**Edge Cases pokryte:** ✅
- Null/empty: `null`, `''` → `null`
- Nieprawidłowy tydzień: `'KW 55/2026'` → `null`
- Nieprawidłowy rok: `'KW 03/1999'` → `null`

**Dodatkowe edge cases NIE pokryte:**
- ❌ Tydzień 53 w roku, który ma tylko 52 tygodnie (np. 2026 ma 53, ale 2025 ma 52)
- ❌ Overflow przy dodawaniu tygodni (bardzo duży week number)
- ❌ Timezone issues - czy data jest w UTC czy local?

**Rekomendacja:**
```typescript
export function parseDeliveryWeek(deliveryWeek: string | null): Date | null {
  if (!deliveryWeek) {
    return null;
  }

  const match = deliveryWeek.match(/(?:KW\s*)?(\d{1,2})\s*\/\s*(\d{4})/i);

  if (!match) {
    return null;
  }

  const week = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);

  // Walidacja podstawowa
  if (week < 1 || week > 53 || year < 2020 || year > 2100) {
    return null;
  }

  // Sprawdź czy rok faktycznie ma 53 tygodnie
  const weeksInYear = getISOWeeksInYear(year);
  if (week > weeksInYear) {
    return null;
  }

  try {
    const jan4 = new Date(Date.UTC(year, 0, 4)); // Użyj UTC dla spójności
    const dayOfWeek = jan4.getUTCDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

    const targetDate = new Date(firstMonday);
    targetDate.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

    // Sprawdź czy wynik jest poprawną datą
    if (isNaN(targetDate.getTime())) {
      return null;
    }

    return targetDate;
  } catch (error) {
    logger.error('Error parsing delivery week:', error);
    return null;
  }
}

function getISOWeeksInYear(year: number): number {
  const lastDayOfYear = new Date(Date.UTC(year, 11, 31));
  const lastWeekDay = lastDayOfYear.getUTCDay() || 7;

  // Jeśli 31 grudnia to czwartek lub wcześniej, rok ma 53 tygodnie
  return lastWeekDay >= 4 ? 53 : 52;
}
```

---

#### 3. **Agregacja statusów - Edge Cases w mapowaniu**
**Lokalizacja:** `schucoOrderMatcher.ts:96-145` (aggregateSchucoStatus)

**Problem:**
```typescript
export function aggregateSchucoStatus(statuses: string[]): string {
  if (!statuses || statuses.length === 0) {
    return '';
  }

  const statusPriority: Record<string, number> = {
    'otwarte': 1,
    'open': 1,
    // ...
  };

  let worstStatus = statuses[0];
  if (!worstStatus) { // ✅ Sprawdza undefined
    return '';
  }
  let worstPriority = statusPriority[worstStatus.toLowerCase()] ?? 0;

  for (const status of statuses) {
    const priority = statusPriority[status.toLowerCase()] ?? 0;
    if (priority < worstPriority || worstPriority === 0) {
      worstPriority = priority;
      worstStatus = status;
    }
  }

  return worstStatus;
}
```

**Edge Cases pokryte:** ✅
- Pusta tablica: `[]` → `''`
- Nieznany status: `['Unknown']` → `'Unknown'`
- Wiele nieznanych: wybiera pierwszy

**Dodatkowe edge cases NIE pokryte:**
- ❌ Bardzo długa lista statusów (>1000) - czy będzie wolno?
- ❌ Statusy z wiodącymi/końcowymi spacjami: `' Otwarte '` - nie dopasuje się do mapy
- ❌ Null/undefined w tablicy: `['Open', null, 'Shipped']` - spowoduje błąd

**Rekomendacja:**
```typescript
export function aggregateSchucoStatus(statuses: string[]): string {
  if (!statuses || statuses.length === 0) {
    return '';
  }

  // Filtruj i oczyść
  const cleanStatuses = statuses
    .filter(s => s != null && typeof s === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (cleanStatuses.length === 0) {
    return '';
  }

  const statusPriority: Record<string, number> = {
    'otwarte': 1,
    'open': 1,
    // ...
  };

  let worstStatus = cleanStatuses[0];
  let worstPriority = statusPriority[worstStatus.toLowerCase()] ?? 0;

  for (const status of cleanStatuses) {
    const priority = statusPriority[status.toLowerCase()] ?? 0;
    if (priority < worstPriority || worstPriority === 0) {
      worstPriority = priority;
      worstStatus = status;
    }
  }

  return worstStatus;
}
```

---

## Parsowanie CSV i Importy

### Pliki:
- [apps/api/src/services/parsers/csv-parser.ts](../../apps/api/src/services/parsers/csv-parser.ts)

### Edge Cases Zidentyfikowane

#### 1. **Parsowanie numeru zlecenia - Regex Ambiguity**
**Lokalizacja:** `csv-parser.ts:73-97` (parseOrderNumber)

**Problem:**
```typescript
parseOrderNumber(orderNumber: string): { base: string; suffix: string | null; full: string } {
  const matchWithSeparator = orderNumber.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
  const matchWithoutSeparator = orderNumber.match(/^(\d+)([a-zA-Z]{1,3})$/);
  const matchPlain = orderNumber.match(/^(\d+)$/);

  if (matchWithSeparator) {
    const [, base, suffix] = matchWithSeparator;
    return { base, suffix, full: orderNumber };
  }

  if (matchWithoutSeparator) {
    const [, base, suffix] = matchWithoutSeparator;
    return { base, suffix, full: orderNumber };
  }

  if (matchPlain) {
    const [, base] = matchPlain;
    return { base, suffix: null, full: orderNumber };
  }

  return { base: orderNumber, suffix: null, full: orderNumber }; // Fallback
}
```

**Edge Cases pokryte:**
- `"54222"` → `{ base: "54222", suffix: null }`
- `"54222-a"` → `{ base: "54222", suffix: "a" }`
- `"54222a"` → `{ base: "54222", suffix: "a" }`

**Dodatkowe edge cases NIE pokryte:**
- ❌ `"54222abc"` (4 litery) - dopasuje się do fallback zamiast odrzucić
- ❌ `"54222-abc1"` (4 znaki z cyfrą) - fallback
- ❌ `"54222--a"` (podwójny separator) - fallback
- ❌ `"54222 - a"` (spacje wokół separatora) - fallback
- ❌ `""` (pusty string) - zwraca `{ base: "", suffix: null }`
- ❌ `"abc-123"` (odwrotna kolejność) - fallback
- ❌ Bardzo długi numer: `"123456789012345-a"` - brak limitu

**Potencjalne problemy:**
```typescript
parseOrderNumber("54222abcd");
// Zwraca: { base: "54222abcd", suffix: null } ❌
// Powinno: Rzucić błąd lub { base: "54222", suffix: "abcd" }

parseOrderNumber("");
// Zwraca: { base: "", suffix: null } ❌
// Powinno: Rzucić błąd
```

**Rekomendacja:**
```typescript
parseOrderNumber(orderNumber: string): { base: string; suffix: string | null; full: string } {
  // Walidacja podstawowa
  if (!orderNumber || orderNumber.trim().length === 0) {
    throw new ValidationError('Numer zlecenia nie może być pusty');
  }

  const trimmed = orderNumber.trim();

  // Limit długości
  if (trimmed.length > 20) {
    throw new ValidationError('Numer zlecenia zbyt długi');
  }

  // Wzorce
  const matchWithSeparator = trimmed.match(/^(\d+)[-\s]([a-zA-Z0-9]{1,3})$/);
  const matchWithoutSeparator = trimmed.match(/^(\d+)([a-zA-Z]{1,3})$/);
  const matchPlain = trimmed.match(/^(\d+)$/);

  if (matchWithSeparator) {
    const [, base, suffix] = matchWithSeparator;
    return { base, suffix, full: trimmed };
  }

  if (matchWithoutSeparator) {
    const [, base, suffix] = matchWithoutSeparator;
    return { base, suffix, full: trimmed };
  }

  if (matchPlain) {
    const [, base] = matchPlain;
    return { base, suffix: null, full: trimmed };
  }

  // Zamiast fallback, rzuć błąd
  throw new ValidationError(
    `Nieprawidłowy format numeru zlecenia: "${trimmed}". ` +
    `Oczekiwany format: cyfry lub cyfry-sufiks (np. "54222" lub "54222-a")`
  );
}
```

---

#### 2. **Obliczenia bel i metrów - Integer Overflow**
**Lokalizacja:** `csv-parser.ts:122-138` (calculateBeamsAndMeters)

**Problem:**
```typescript
calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
  if (restMm === 0) {
    return { beams: originalBeams, meters: 0 };
  }

  // Zaokrąglij resztę w górę do wielokrotności 500mm
  const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

  // Odjąć 1 belę (bo reszta > 0)
  const beams = originalBeams - 1;

  // reszta2 = 6000 - roundedRest, przelicz na metry
  const reszta2Mm = BEAM_LENGTH_MM - roundedRest;
  const meters = reszta2Mm / 1000;

  return { beams, meters };
}
```

**Edge Cases NIE pokryte:**
- ❌ `originalBeams = 0` i `restMm > 0` → `beams = -1` ❌ UJEMNA LICZBA BEL
- ❌ `restMm > 6000` → `reszta2Mm` będzie ujemne
- ❌ `restMm < 0` → Nieprawidłowy input
- ❌ `originalBeams < 0` → Nieprawidłowy input
- ❌ Bardzo duże wartości → overflow

**Scenariusze problemu:**
```typescript
calculateBeamsAndMeters(0, 1000);
// Zwraca: { beams: -1, meters: 5.5 } ❌

calculateBeamsAndMeters(10, 7000);
// roundedRest = 7000
// reszta2Mm = 6000 - 7000 = -1000
// meters = -1 ❌

calculateBeamsAndMeters(-5, 1000);
// beams = -6 ❌
```

**Rekomendacja:**
```typescript
calculateBeamsAndMeters(originalBeams: number, restMm: number): { beams: number; meters: number } {
  // Walidacja inputów
  if (!Number.isFinite(originalBeams) || !Number.isFinite(restMm)) {
    throw new ValidationError('Wartości muszą być liczbami skończonymi');
  }

  if (originalBeams < 0) {
    throw new ValidationError('Liczba bel nie może być ujemna');
  }

  if (restMm < 0) {
    throw new ValidationError('Reszta nie może być ujemna');
  }

  if (restMm > BEAM_LENGTH_MM) {
    throw new ValidationError(`Reszta (${restMm}mm) nie może być większa niż długość beli (${BEAM_LENGTH_MM}mm)`);
  }

  if (restMm === 0) {
    return { beams: originalBeams, meters: 0 };
  }

  // Sprawdź czy można odjąć belę
  if (originalBeams < 1) {
    throw new ValidationError('Brak bel do odjęcia (oryginalna liczba < 1, ale reszta > 0)');
  }

  // Zaokrąglij resztę w górę do wielokrotności 500mm
  const roundedRest = Math.ceil(restMm / REST_ROUNDING_MM) * REST_ROUNDING_MM;

  // Odjąć 1 belę
  const beams = originalBeams - 1;

  // reszta2 = 6000 - roundedRest
  const reszta2Mm = BEAM_LENGTH_MM - roundedRest;

  // Walidacja wyniku
  if (reszta2Mm < 0) {
    logger.warn(`Negative reszta2Mm: ${reszta2Mm}, roundedRest: ${roundedRest}`);
    return { beams, meters: 0 }; // Bezpieczny fallback
  }

  const meters = reszta2Mm / 1000;

  return { beams, meters };
}
```

---

#### 3. **Przetwarzanie pliku CSV - Character Encoding**
**Lokalizacja:** `csv-parser.ts:352-368` (parseUzyteBeleFile)

**Problem:**
```typescript
private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
  const buffer = await fs.promises.readFile(filepath);

  let content: string;
  try {
    const decoder = new TextDecoder('windows-1250');
    content = decoder.decode(buffer);
    // Sprawdź czy są polskie znaki - jeśli nie, spróbuj UTF-8
    if (!content.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)) {
      content = buffer.toString('utf-8');
    }
  } catch {
    // Fallback do UTF-8
    content = buffer.toString('utf-8');
  }

  const lines = content.split('\n').filter((line) => line.trim());
  // ...
}
```

**Edge Cases pokryte:**
- ✅ Próbuje Windows-1250, potem UTF-8
- ✅ Filtruje puste linie

**Dodatkowe edge cases NIE pokryte:**
- ❌ BOM (Byte Order Mark) w UTF-8/UTF-16 - nie jest usuwany
- ❌ Mieszane końcówki linii: `\r\n`, `\n`, `\r` - split('\n') nie obsługuje `\r`
- ❌ Bardzo duże pliki (>100MB) - czyta całość do pamięci
- ❌ Encoding inny niż Windows-1250 lub UTF-8 (np. ISO-8859-2)
- ❌ Uszkodzone znaki - silent failure

**Rekomendacja:**
```typescript
private async parseUzyteBeleFile(filepath: string): Promise<ParsedUzyteBele> {
  // Sprawdź rozmiar pliku
  const stats = await fs.promises.stat(filepath);
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  if (stats.size > MAX_FILE_SIZE) {
    throw new ValidationError(`Plik zbyt duży: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const buffer = await fs.promises.readFile(filepath);

  // Usuń BOM jeśli istnieje
  let cleanBuffer = buffer;
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    cleanBuffer = buffer.slice(3); // UTF-8 BOM
  } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    cleanBuffer = buffer.slice(2); // UTF-16 LE BOM
  }

  let content: string;
  try {
    const decoder = new TextDecoder('windows-1250');
    content = decoder.decode(cleanBuffer);

    // Sprawdź czy są polskie znaki
    if (!content.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)) {
      content = cleanBuffer.toString('utf-8');
    }
  } catch (error) {
    logger.warn('Błąd dekodowania Windows-1250, próba UTF-8:', error);
    try {
      content = cleanBuffer.toString('utf-8');
    } catch (error2) {
      throw new ValidationError('Nie można zdekodować pliku. Obsługiwane kodowania: UTF-8, Windows-1250');
    }
  }

  // Normalizuj końcówki linii i filtruj puste
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    throw new ValidationError('Plik jest pusty');
  }

  // ... reszta parsowania
}
```

---

#### 4. **Przetwarzanie CSV - Race Condition w `processUzyteBele`**
**Lokalizacja:** `csv-parser.ts:173-248` (processUzyteBele)

**Problem:**
```typescript
async processUzyteBele(filepath: string, action: 'overwrite' | 'add_new', replaceBase?: boolean) {
  const parsed = await this.parseUzyteBeleFile(filepath);

  // Znajdź lub utwórz zlecenie
  let order = await prisma.order.findUnique({
    where: { orderNumber: targetOrderNumber },
  });

  if (order && action === 'overwrite') {
    // Usuń istniejące requirements i windows
    await prisma.orderRequirement.deleteMany({
      where: { orderId: order.id },
    }); // ❌ Możliwe race condition - ktoś może dodać requirement między delete a create
    await prisma.orderWindow.deleteMany({
      where: { orderId: order.id },
    });
    // Zaktualizuj zlecenie
    order = await prisma.order.update({
      where: { id: order.id },
      data: { /* ... */ },
    });
  } else if (!order) {
    order = await prisma.order.create({ /* ... */ });
  }

  // Dodaj requirements
  for (const req of parsed.requirements) {
    // ...
  }
}
```

**Edge Cases:**
- ❌ **Race Condition:** Między `deleteMany` a tworzeniem nowych, inny proces może dodać requirement
- ❌ Brak transakcji - jeśli proces się przerwie, zlecenie może zostać bez requirements
- ❌ Jeśli tworzenie requirements się nie powiedzie, zlecenie już istnieje ale jest puste

**Rekomendacja:**
```typescript
async processUzyteBele(
  filepath: string,
  action: 'overwrite' | 'add_new',
  replaceBase?: boolean
): Promise<{ orderId: number; requirementsCount: number; windowsCount: number }> {
  const parsed = await this.parseUzyteBeleFile(filepath);

  // Całość w transakcji
  return prisma.$transaction(async (tx) => {
    const orderNumberParsed = this.parseOrderNumber(parsed.orderNumber);

    let targetOrderNumber = parsed.orderNumber;
    if (orderNumberParsed.suffix && replaceBase) {
      targetOrderNumber = orderNumberParsed.base;
    }

    // Znajdź zlecenie
    let order = await tx.order.findUnique({
      where: { orderNumber: targetOrderNumber },
    });

    if (order && action === 'overwrite') {
      // Atomowo usuń i zaktualizuj
      await tx.orderRequirement.deleteMany({
        where: { orderId: order.id },
      });
      await tx.orderWindow.deleteMany({
        where: { orderId: order.id },
      });

      order = await tx.order.update({
        where: { id: order.id },
        data: {
          client: parsed.client || undefined,
          project: parsed.project || undefined,
          // ...
        },
      });
    } else if (!order) {
      order = await tx.order.create({
        data: {
          orderNumber: targetOrderNumber,
          client: parsed.client || undefined,
          // ...
        },
      });
    } else if (action === 'add_new') {
      order = await tx.order.update({
        where: { id: order.id },
        data: {
          client: parsed.client || undefined,
          // ...
        },
      });
    }

    // Dodaj requirements
    for (const req of parsed.requirements) {
      // ... (w tej samej transakcji)
    }

    return {
      orderId: order.id,
      requirementsCount: parsed.requirements.length,
      windowsCount: parsed.windows.length,
    };
  }, {
    timeout: 30000, // 30s dla dużych importów
  });
}
```

---

## Obsługa Dostaw Szyb

### Pliki:
- [apps/api/src/services/glassDeliveryService.ts](../../apps/api/src/services/glassDeliveryService.ts)

### Edge Cases Zidentyfikowane

#### 1. **Batch Import - Transaction Timeout**
**Lokalizacja:** `glassDeliveryService.ts:7-56` (importFromCsv)

**Problem:**
```typescript
async importFromCsv(fileContent: string, filename: string, deliveryDate?: Date) {
  const parsed = parseGlassDeliveryCsv(fileContent);

  // Use transaction with extended timeout for large imports (60s instead of default 5s)
  return this.prisma.$transaction(async (tx) => {
    const glassDelivery = await tx.glassDelivery.create({
      data: {
        // ...
        items: {
          create: parsed.items.map((item) => ({ /* ... */ })),
        },
      },
      include: {
        items: true,
      },
    });

    await this.matchWithOrdersTx(tx, glassDelivery.id);

    // ...
  }, {
    timeout: 60000, // 60 seconds timeout
    maxWait: 10000,
  });
}
```

**Edge Cases:**
- ✅ Timeout ustawiony na 60s
- ❌ Co jeśli import ma >1000 pozycji? Czy 60s wystarczy?
- ❌ SQLite ma limity na rozmiar transakcji (zależne od konfiguracji)
- ❌ Jeśli timeout wystąpi, dane mogą być częściowo zapisane (rollback?)

**Scenariusz problemu:**
```
Import 5000 pozycji szyb →
- Create: 2s
- Match: 55s
- Update statuses: 5s
TOTAL: 62s > 60s timeout ❌ ROLLBACK
```

**Rekomendacja:**
```typescript
async importFromCsv(fileContent: string, filename: string, deliveryDate?: Date) {
  const parsed = parseGlassDeliveryCsv(fileContent);

  // Sprawdź rozmiar importu
  if (parsed.items.length > 10000) {
    throw new ValidationError(`Import zbyt duży: ${parsed.items.length} pozycji (max: 10000)`);
  }

  // Dla małych importów (<500): jedna transakcja
  if (parsed.items.length < 500) {
    return this.importInSingleTransaction(parsed, filename, deliveryDate);
  }

  // Dla dużych importów: batch processing bez transakcji
  return this.importInBatches(parsed, filename, deliveryDate);
}

private async importInBatches(parsed: any, filename: string, deliveryDate?: Date) {
  // 1. Utwórz GlassDelivery
  const glassDelivery = await this.prisma.glassDelivery.create({
    data: {
      rackNumber: parsed.metadata.rackNumber || filename,
      deliveryDate: deliveryDate || new Date(),
    },
  });

  // 2. Dodaj items w batch-ach po 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < parsed.items.length; i += BATCH_SIZE) {
    const batch = parsed.items.slice(i, i + BATCH_SIZE);

    await this.prisma.glassDeliveryItem.createMany({
      data: batch.map(item => ({
        glassDeliveryId: glassDelivery.id,
        orderNumber: item.orderNumber,
        // ...
        matchStatus: 'pending',
      })),
    });
  }

  // 3. Match (bez transakcji, ale w batch-ach)
  await this.matchWithOrders(glassDelivery.id);

  return glassDelivery;
}
```

---

#### 2. **Dopasowywanie dostaw szyb - N+1 Query Problem**
**Lokalizacja:** `glassDeliveryService.ts:59-218` (matchWithOrdersTx)

**Problem:**
```typescript
private async matchWithOrdersTx(tx: any, deliveryId: number) {
  const deliveryItems = await tx.glassDeliveryItem.findMany({
    where: { glassDeliveryId: deliveryId },
  });

  // Batch fetch all potentially matching order items at once ✅
  const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];
  const allOrderItems = await tx.glassOrderItem.findMany({
    where: { orderNumber: { in: orderNumbers } },
  });

  // ... processing

  // BATCH EXECUTE: Sequential operations within transaction
  // 1. Update matched items in batches of 50 to reduce transaction size
  const BATCH_SIZE = 50;
  for (let i = 0; i < matchedUpdates.length; i += BATCH_SIZE) {
    const batch = matchedUpdates.slice(i, i + BATCH_SIZE);
    await Promise.all( // ❌ Wiele równoległych UPDATE w SQLite może powodować locks
      batch.map((update) =>
        tx.glassDeliveryItem.update({
          where: { id: update.id },
          data: { /* ... */ },
        })
      )
    );
  }
}
```

**Edge Cases:**
- ✅ Batch fetch zamiast N+1
- ❌ `Promise.all` w pętli może spowodować deadlock w SQLite (write locks)
- ❌ Jeśli batch ma 50 items, to 50 równoległych UPDATE
- ❌ SQLite nie lubi wielu concurrent writes

**Rekomendacja:**
```typescript
// Zamiast Promise.all, użyj updateMany lub sekwencyjnych updates
for (let i = 0; i < matchedUpdates.length; i += BATCH_SIZE) {
  const batch = matchedUpdates.slice(i, i + BATCH_SIZE);

  // Opcja 1: Sekwencyjnie (wolniejsze, ale bezpieczniejsze dla SQLite)
  for (const update of batch) {
    await tx.glassDeliveryItem.update({
      where: { id: update.id },
      data: {
        matchStatus: 'matched',
        matchedItemId: update.matchedItemId,
        glassOrderId: update.glassOrderId,
      },
    });
  }

  // Opcja 2: Batch update IDs (szybsze, ale ograniczone)
  // Nie działa dobrze bo każdy item ma inne matchedItemId/glassOrderId
}
```

---

#### 3. **Suffix Mismatch Detection - False Positives**
**Lokalizacja:** `glassDeliveryService.ts:114-142` (matchWithOrdersTx - STEP 2)

**Problem:**
```typescript
// STEP 2: Check for SUFFIX CONFLICT
const conflictMatch = candidates.find(
  (c) =>
    c.orderSuffix !== deliveryItem.orderSuffix &&
    c.widthMm === deliveryItem.widthMm &&
    c.heightMm === deliveryItem.heightMm
);

if (conflictMatch) {
  conflictUpdates.push({ /* ... */ });
  validationsToCreate.push({
    glassOrderId: conflictMatch.glassOrderId,
    orderNumber: deliveryItem.orderNumber,
    validationType: 'suffix_mismatch',
    severity: 'warning',
    message: `Konflikt suffixu: zamówione '${conflictMatch.orderSuffix || 'brak'}', dostarczone '${deliveryItem.orderSuffix || 'brak'}'`,
    // ...
  });
  // ...
}
```

**Edge Cases:**
- ❌ **False Positive:** Jeśli orderSuffix w obu jest `null`, to `null !== null` → **false** ✅
  - Ale jeśli deliveryItem ma `''` a candidate ma `null`, to uznaje za konflikt ❌
- ❌ Case sensitivity: `'A' !== 'a'` - czy to konflikt?
- ❌ Whitespace: `'a' !== 'a '` - uznane za konflikt

**Rekomendacja:**
```typescript
// Normalizuj sufiksy przed porównaniem
function normalizeSuffix(suffix: string | null | undefined): string | null {
  if (!suffix || suffix.trim() === '') {
    return null;
  }
  return suffix.trim().toLowerCase();
}

// W matchWithOrdersTx:
const deliverySuffix = normalizeSuffix(deliveryItem.orderSuffix);
const candidateSuffix = normalizeSuffix(c.orderSuffix);

// STEP 2: Check for SUFFIX CONFLICT
const conflictMatch = candidates.find(
  (c) => {
    const cSuffix = normalizeSuffix(c.orderSuffix);
    return (
      cSuffix !== deliverySuffix &&
      c.widthMm === deliveryItem.widthMm &&
      c.heightMm === deliveryItem.heightMm
    );
  }
);
```

---

## Rekomendacje

### Priorytety (według krytyczności)

#### 🔴 CRITICAL (Wymaga natychmiastowej naprawy)

1. **Warehouse Stock Updates - Lost Update**
   - Plik: `warehouseService.ts:14-16`
   - Problem: Brak transakcji i optimistic locking
   - Ryzyko: Nieprawidłowy stan magazynu
   - Fix: Dodać transakcje + versioning

2. **Delivery Number Generation - Race Condition**
   - Plik: `deliveryService.ts:80-94`
   - Problem: Duplikaty numerów dostaw
   - Ryzyko: Naruszenie unique constraint lub duplikaty
   - Fix: Transakcja z lock lub unique constraint + retry

3. **CSV Processing - No Transaction**
   - Plik: `csv-parser.ts:173-248`
   - Problem: Brak transakcji przy overwrite
   - Ryzyko: Częściowe dane przy błędzie
   - Fix: Owinąć w `$transaction`

#### 🟠 HIGH (Powinno zostać naprawione szybko)

4. **Order Deletion - No Safety Checks**
   - Plik: `orderService.ts:60-67`
   - Problem: Można usunąć zlecenie powiązane z wysłaną dostawą
   - Ryzyko: Utrata danych historycznych
   - Fix: Sprawdzić status dostaw przed usunięciem

5. **CSV calculateBeamsAndMeters - Negative Results**
   - Plik: `csv-parser.ts:122-138`
   - Problem: Może zwrócić ujemne wartości
   - Ryzyko: Nieprawidłowe dane w DB
   - Fix: Walidacja inputów i wyników

6. **Glass Delivery Batch Updates - SQLite Locks**
   - Plik: `glassDeliveryService.ts:159-174`
   - Problem: `Promise.all` może powodować deadlock
   - Ryzyko: Transaction failures
   - Fix: Sekwencyjne updates lub `updateMany`

#### 🟡 MEDIUM (Zalecane usprawnienia)

7. **Order Number Validation**
   - Wszystkie miejsca tworzące/aktualizujące zlecenia
   - Problem: Brak walidacji formatu
   - Fix: Dodać Zod schema z regex

8. **Financial Values Validation**
   - orderService, deliveryService
   - Problem: Brak walidacji wartości ujemnych/infinity
   - Fix: Zod schema z `.nonnegative().finite()`

9. **Delivery Orders Reorder - Missing Validation**
   - Plik: `deliveryService.ts:142-145`
   - Problem: Nie sprawdza czy wszystkie orderId należą do delivery
   - Fix: Walidacja przed update

10. **CSV parseOrderNumber - Invalid Fallback**
    - Plik: `csv-parser.ts:73-97`
    - Problem: Akceptuje nieprawidłowe formaty
    - Fix: Rzucać błąd zamiast fallback

#### 🟢 LOW (Nice to have)

11. **Schuco extractOrderNumbers - ReDoS Protection**
    - Plik: `schucoOrderMatcher.ts:16-32`
    - Problem: Bardzo długie stringi mogą spowolnić regex
    - Fix: Limit długości inputu

12. **Delivery Week Parsing - Timezone Issues**
    - Plik: `schucoOrderMatcher.ts:52-84`
    - Problem: Local time vs UTC
    - Fix: Użyć UTC dla spójności

13. **Status Aggregation - Whitespace Handling**
    - Plik: `schucoOrderMatcher.ts:96-145`
    - Problem: Nie trimuje statusów
    - Fix: `.map(s => s.trim())`

---

### Ogólne zalecenia

#### 1. Walidacja inputów
- Używać Zod schemas dla wszystkich endpointów API
- Walidować ranges (min/max), typy, formaty
- Trim stringów przed walidacją

#### 2. Transakcje
- Wszystkie operacje multi-step w transakcjach
- Ustawiać timeout dla długich operacji
- Dla SQLite: unikać wielu concurrent writes w transakcji

#### 3. Error Handling
- Logować wszystkie edge cases (warn level)
- Rzucać descriptive errors zamiast silent failures
- Używać custom error types (ValidationError, NotFoundError)

#### 4. Testing
- Dodać testy dla wszystkich zidentyfikowanych edge cases
- Property-based testing dla funkcji matematycznych
- Integration tests dla critical paths

#### 5. Monitoring
- Logować długie transakcje (>5s)
- Alertować przy częstych race conditions
- Monitorować rozmiary importów

---

## Następne kroki

1. **Review z zespołem:** Przedyskutować priorytety
2. **Create issues:** Utworzyć zadania w Beads dla każdego edge case
3. **Plan fixes:** Rozplanować poprawki według priorytetów
4. **Add tests:** Dodać testy przed fix-ami
5. **Implement:** Naprawić według priorytetu
6. **Monitor:** Śledzić czy problemy zostały rozwiązane

---

## Appendix: Przykładowe testy

### Test: Warehouse Stock Optimistic Locking

```typescript
describe('WarehouseService.updateStock - Concurrency', () => {
  it('should handle concurrent updates with optimistic locking', async () => {
    const stockId = 1;
    const initialStock = 100;

    // Symuluj dwa równoczesne requesty
    const update1 = warehouseService.updateStock(stockId, 50);
    const update2 = warehouseService.updateStock(stockId, 30);

    const results = await Promise.allSettled([update1, update2]);

    // Jeden powinien się udać, drugi rzucić ConflictError
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason).toBeInstanceOf(ConflictError);
  });
});
```

### Test: Delivery Number Race Condition

```typescript
describe('DeliveryService.createDelivery - Race Condition', () => {
  it('should not create duplicate delivery numbers', async () => {
    const date = '2025-01-15';

    // Utwórz 10 dostaw równocześnie na ten sam dzień
    const promises = Array(10).fill(null).map(() =>
      deliveryService.createDelivery({ deliveryDate: date })
    );

    const results = await Promise.all(promises);
    const numbers = results.map(d => d.deliveryNumber);

    // Wszystkie numery powinny być unikalne
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(10);

    // Numery powinny być w formacie DD.MM.YYYY_I, II, III...
    expect(numbers).toContain('15.01.2025_I');
    expect(numbers).toContain('15.01.2025_X');
  });
});
```

### Test: CSV calculateBeamsAndMeters Edge Cases

```typescript
describe('CsvParser.calculateBeamsAndMeters', () => {
  const parser = new CsvParser();

  it('should throw error for negative originalBeams', () => {
    expect(() => parser.calculateBeamsAndMeters(-5, 1000))
      .toThrow('Liczba bel nie może być ujemna');
  });

  it('should throw error for negative restMm', () => {
    expect(() => parser.calculateBeamsAndMeters(10, -500))
      .toThrow('Reszta nie może być ujemna');
  });

  it('should throw error when restMm > beam length', () => {
    expect(() => parser.calculateBeamsAndMeters(10, 7000))
      .toThrow('Reszta (7000mm) nie może być większa niż długość beli (6000mm)');
  });

  it('should throw error when originalBeams=0 but restMm>0', () => {
    expect(() => parser.calculateBeamsAndMeters(0, 1000))
      .toThrow('Brak bel do odjęcia');
  });

  it('should handle edge case: restMm = 1mm', () => {
    const result = parser.calculateBeamsAndMeters(10, 1);
    // roundedRest = Math.ceil(1/500)*500 = 500
    // reszta2 = 6000 - 500 = 5500
    expect(result).toEqual({ beams: 9, meters: 5.5 });
  });
});
```

---

*Dokument utworzony: 2025-12-29*
*Autor: Claude (Analiza AI)*
*Status: Draft - wymaga review*
