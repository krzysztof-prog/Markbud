# Vitest Testing Patterns - AKROBUD

> **Cel:** Dokumentacja wzorców testowania z Vitest odkrytych podczas naprawy testów w projekcie AKROBUD.
> **Data utworzenia:** 2026-01-05
> **Kontekst:** Naprawa 4 plików testów po refaktoryzacji delivery/import/warehouse services

---

## 📋 Spis treści

1. [Constructor Mocking Pattern](#1-constructor-mocking-pattern)
2. [Preventing App Loading During Tests](#2-preventing-app-loading-during-tests)
3. [Mock Hoisting Solution](#3-mock-hoisting-solution)
4. [Dual Prisma Instance Problem](#4-dual-prisma-instance-problem)
5. [Common Errors & Solutions](#5-common-errors--solutions)
6. [Best Practices Checklist](#6-best-practices-checklist)

---

## 1. Constructor Mocking Pattern

### ❌ Problem: `vi.fn().mockImplementation()` nie działa jako konstruktor

```typescript
// ŹLE - zwraca funkcję, nie klasę
vi.mock('./orderService.js', () => ({
  OrderService: vi.fn().mockImplementation(() => ({
    bulkUpdateStatus: vi.fn().mockResolvedValue({ count: 0 }),
  })),
}));

// Błąd: TypeError: OrderService is not a constructor
```

### ✅ Rozwiązanie: Class Expression

```typescript
// DOBRZE - prawidłowy konstruktor
vi.mock('./orderService.js', () => ({
  OrderService: class MockOrderService {
    bulkUpdateStatus = vi.fn().mockResolvedValue({ count: 0 });
    getOrderById = vi.fn().mockResolvedValue(null);
    // ... inne metody
  }
}));
```

### 📝 Zasada
**ZAWSZE używaj class expressions dla mockowania klas/konstruktorów.**

### 🔍 Przykład z projektu

**Plik:** `apps/api/src/services/deliveryService.test.ts`

```typescript
// Przed (błąd):
vi.mock('./orderService.js', () => ({
  OrderService: vi.fn().mockImplementation(() => ({
    bulkUpdateStatus: vi.fn().mockResolvedValue({ count: 0 }),
  })),
}));

vi.mock('../repositories/OrderRepository.js', () => ({
  OrderRepository: vi.fn().mockImplementation(() => ({
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  })),
}));

// Po (naprawione):
vi.mock('./orderService.js', () => ({
  OrderService: class MockOrderService {
    bulkUpdateStatus = vi.fn().mockResolvedValue({ count: 0 });
  }
}));

vi.mock('../repositories/OrderRepository.js', () => ({
  OrderRepository: class MockOrderRepository {
    updateMany = vi.fn().mockResolvedValue({ count: 0 });
  }
}));
```

---

## 2. Preventing App Loading During Tests

### ❌ Problem: Test ładuje Fastify app → routes → services

```typescript
// Test importuje CsvImportService
import { CsvImportService } from './csvImportService.js';

// CsvImportService importuje routes
// Routes próbują zainicjalizować CsvParser
// → TypeError: CsvParser is not a constructor
```

### ✅ Rozwiązanie: Mock app index przed importami

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// KLUCZOWE: Mock index.js PRZED importami serwisów
vi.mock('../../../index.js', () => ({
  prisma: {
    // Minimalna struktura Prisma potrzebna dla testów
    delivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deliveryOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

// Teraz bezpiecznie importuj
import { CsvImportService } from './csvImportService.js';
import { DeliveryService } from './deliveryService.js';
```

### 📝 Zasada
**Mock `../index.js` dla KAŻDEGO testu który importuje serwisy korzystające z Fastify routes.**

### 🔍 Przykłady z projektu

**Plik 1:** `apps/api/src/services/import/parsers/csvImportService.test.ts`

```typescript
// Przed (błąd):
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvImportService } from './csvImportService.js';
// → Ładuje app → routes → CsvParser initialization fails

// Po (naprawione):
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../index.js', () => ({
  prisma: {} // Minimalna struktura wystarczy
}));

import { CsvImportService } from './csvImportService.js';
```

**Plik 2:** `apps/api/src/services/deliveryService.test.ts`

```typescript
// Dodano pełną strukturę Prisma mock
vi.mock('../index.js', () => ({
  prisma: {
    delivery: { findMany: vi.fn(), findUnique: vi.fn(), /* ... */ },
    deliveryOrder: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn(), /* ... */ },
    order: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), /* ... */ },
    $transaction: vi.fn(),
  }
}));
```

---

## 3. Mock Hoisting Solution

### ❌ Problem: `ReferenceError: Cannot access '__vi_import_X__' before initialization`

```typescript
// ŹLE - createMockPrisma() wywoływane przed hoistingiem
const createMockPrisma = () => ({
  warehouseStock: { findMany: vi.fn() },
});

vi.mock('../index.js', () => ({
  prisma: createMockPrisma() // ERROR: funkcja nie jest jeszcze dostępna
}));
```

### ✅ Rozwiązanie: Inline mock creation

```typescript
// DOBRZE - wszystko tworzone inline w factory
vi.mock('../index.js', () => {
  // Twórz mock bezpośrednio tutaj
  return {
    prisma: {
      warehouseStock: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      orderRequirement: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      $transaction: vi.fn(),
    }
  };
});

// Import AFTER mocks
import { WarehouseService } from './warehouse-service.js';
```

### 📝 Zasada
**Vitest hoistuje `vi.mock()` na początek pliku. NIE referencuj zewnętrznych funkcji w factory.**

### 🔍 Przykład z projektu

**Plik:** `apps/api/src/services/warehouse-service.test.ts`

```typescript
// Przed (błąd):
const createMockPrisma = () => ({ /* ... */ });

vi.mock('../index.js', () => ({
  prisma: createMockPrisma() // ReferenceError podczas hoisting
}));

import { WarehouseService } from './warehouse-service.js';

// Po (naprawione):
vi.mock('../index.js', () => {
  // Wszystko inline - żadnych zewnętrznych referencji
  return {
    prisma: {
      warehouseStock: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      orderRequirement: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      $transaction: vi.fn(),
    }
  };
});

// Import po mockach
import { WarehouseService } from './warehouse-service.js';
```

---

## 4. Dual Prisma Instance Problem

### ❌ Problem: Test mockuje niewłaściwą instancję Prisma

```typescript
// Test tworzy własną instancję mockPrisma
const mockPrisma = { /* ... */ };
const repository = new DeliveryRepository(mockPrisma);

// Ale service używa indexPrisma z '../index.js'
const service = new DeliveryService(repository, orderService);

// Mock ustawiony na indexPrisma
(indexPrisma as any).deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });

// → Błąd: repository wywołuje mockPrisma.deliveryOrder.aggregate
// → który NIE ma mocka (zwraca undefined)
```

### ✅ Rozwiązanie: Mockuj na właściwej instancji

```typescript
// Repository używa mockPrisma
const mockPrisma = {
  delivery: { findMany: vi.fn(), findUnique: vi.fn() },
  deliveryOrder: {
    create: vi.fn(),
    aggregate: vi.fn(), // TUTAJ mockuj
  },
};

const repository = new DeliveryRepository(mockPrisma);

// W teście: mockuj na mockPrisma (NIE na indexPrisma)
mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
```

### 📝 Zasada
**Mockuj na tej samej instancji Prisma którą używa testowany kod.**

### 🔍 Przykład z projektu

**Plik:** `apps/api/src/services/deliveryService.test.ts`

```typescript
// Test: "should add order to delivery"

// Przed (błąd):
(indexPrisma as any).deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
(indexPrisma as any).deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);
// → Repository wywołuje mockPrisma.deliveryOrder.aggregate → undefined → crash

// Po (naprawione):
mockPrisma.deliveryOrder.aggregate.mockResolvedValue({ _max: { position: 0 } });
mockPrisma.deliveryOrder.create.mockResolvedValue(mockDeliveryOrder);
// → Repository wywołuje mockPrisma.deliveryOrder.aggregate → { _max: { position: 0 } } → OK
```

---

## 5. Common Errors & Solutions

### Error 1: `TypeError: X is not a constructor`

**Przyczyna:** Mockowanie klasy przez `vi.fn().mockImplementation()`

**Rozwiązanie:** Użyj class expression (zobacz [Pattern 1](#1-constructor-mocking-pattern))

---

### Error 2: `ReferenceError: Cannot access '__vi_import_X__' before initialization`

**Przyczyna:** Referencja zewnętrznej funkcji w `vi.mock()` factory

**Rozwiązanie:** Twórz mock inline (zobacz [Pattern 3](#3-mock-hoisting-solution))

---

### Error 3: `TypeError: Cannot read properties of undefined (reading '_max')`

**Przyczyna:** Mock ustawiony na złej instancji Prisma

**Rozwiązanie:** Mockuj na instancji używanej przez kod (zobacz [Pattern 4](#4-dual-prisma-instance-problem))

---

### Error 4: Test data nie pasuje do service filtering

**Przyczyna:** Service filtruje dane (np. `where: { status: 'pending' }`) ale test mockuje wszystkie dane

**Rozwiązanie:** Mock data MUSI odzwierciedlać filtry service

**Przykład:**

```typescript
// Service:
const orders = await prisma.order.findMany({
  where: { status: 'pending' }
});

// Test mock (ŹLE):
mockPrisma.order.findMany.mockResolvedValue([
  { id: 1, status: 'pending' },
  { id: 2, status: 'received' }, // To zostanie odfiltowane przez service
]);

// Test mock (DOBRZE):
mockPrisma.order.findMany.mockResolvedValue([
  { id: 1, status: 'pending' },
  { id: 2, status: 'pending' },
]);
```

---

## 6. Best Practices Checklist

### ✅ Przed rozpoczęciem testu:

- [ ] Czy testuję klasę/konstruktor? → Użyj class expression
- [ ] Czy importuję serwis używający routes? → Mock `../index.js`
- [ ] Czy tworzę helper function dla mocka? → NIE, twórz inline
- [ ] Czy używam wielu instancji Prisma? → Mockuj na właściwej

### ✅ Podczas pisania testu:

- [ ] Mock structure order: `vi.mock()` → imports → test setup
- [ ] Mock data pasuje do service filters
- [ ] Każdy test resetuje mocki (`beforeEach`)
- [ ] Aggregate/count/groupBy mockowane gdy potrzebne

### ✅ Po napisaniu testu:

- [ ] Test przechodzi lokalnie (`pnpm test`)
- [ ] Brak `any` type assertions (lub minimum)
- [ ] Test name opisuje CO i PO CO

---

## 📚 Referencje

### Naprawione pliki testów:

1. `apps/api/src/services/warehouse-service.test.ts` (26/26 ✅)
2. `apps/api/src/services/import/parsers/csvImportService.test.ts` (36/36 ✅)
3. `apps/api/src/services/deliveryService.test.ts` (18/18 ✅)
4. `apps/api/src/handlers/profileHandler.test.ts` (17/17 ✅)

### Pełny test suite:
- **722/722 tests passing (100%)**
- Data: 2026-01-05

---

## 🔄 Aktualizacje

| Data | Kto | Co zmieniono |
|------|-----|--------------|
| 2026-01-05 | Claude Sonnet 4.5 | Utworzono dokument po naprawie testów |

---

**Autor:** Krzysztof (z pomocą Claude Sonnet 4.5)
**Status:** Production-ready ✅
**Ostatnia aktualizacja:** 2026-01-05