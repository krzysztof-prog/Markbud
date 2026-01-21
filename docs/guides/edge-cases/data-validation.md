# Data Validation & Input Boundaries

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 1.1 Order Number Whitespace Normalization

**Severity:** Medium
**Location:** [../../apps/api/src/validators/order.ts:14-19](../../apps/api/src/validators/order.ts#L14-L19)

**Problem:**
```typescript
const orderNumberSchema = z.string().trim()
  .regex(/^[\w\s-]+$/);
```

- `.trim()` normalizuje leading/trailing whitespace
- Ale wewnetrzne spacje sa akceptowane
- Mozliwe duplikaty: `"54222"` vs `"54222 "` vs `"54 222"`
- Brak case sensitivity handling: `"54222-A"` vs `"54222-a"`

**Scenariusz:**
```typescript
// Te wszystkie moga byc uznane za rozne zlecenia:
"54222"
"54222 "
" 54222"
"54-222"
"54222-A"
"54222-a"
```

**Sugestia:**
```typescript
const orderNumberSchema = z.string()
  .trim()
  .transform(s => s.toUpperCase().replace(/\s+/g, ''))  // Normalizacja
  .regex(/^[\w-]+$/, 'Niedozwolone znaki w numerze zlecenia')
  .min(1, 'Numer zlecenia nie moze byc pusty')
  .max(50, 'Numer zlecenia zbyt dlugi');
```

---

## 1.2 Financial Value Boundaries

**Severity:** Medium
**Location:** [../../apps/api/src/validators/order.ts:21-26](../../apps/api/src/validators/order.ts#L21-L26)

**Problem:**
```typescript
const financialValueSchema = z.number()
  .nonnegative()
  .max(999999999.99);
```

- Schema przyjmuje `number` ale Prisma uzywa `Int` (grosze?)
- Brak walidacji precyzji dziesietnej (np. 0.001 vs 0.01)
- Brak informacji o jednostce (PLN w groszach? EUR w centach?)
- Overflow przy konwersji EUR<->PLN

**Scenariusz:**
```typescript
// Input: 100000.999 EUR
// Expected: 10000100 (grosze)
// Actual: 10000099.9 (float precision loss)

// Conversion overflow:
const eurValue = 999999999.99;
const plnRate = 450; // 4.50 PLN/EUR
const plnValue = eurValue * plnRate; // Przekracza MAX_SAFE_INTEGER?
```

**Sugestia:**
```typescript
// Zawsze przechowuj jako grosze/centy (Int)
const financialValueSchema = z.number()
  .int('Wartosc musi byc calkowita (w groszach)')
  .nonnegative('Wartosc nie moze byc ujemna')
  .max(2147483647, 'Wartosc zbyt duza'); // Int32 max

// Lub validation z precision:
const financialValueEuroSchema = z.number()
  .nonnegative()
  .refine(
    n => Number.isInteger(n * 100),
    'Maksymalna precyzja: 2 miejsca po przecinku'
  )
  .transform(n => Math.round(n * 100)); // Konwersja do centow
```

---

## 1.3 Pagination Boundary Cases

**Severity:** Low
**Location:** [../../apps/api/src/validators/common.ts](../../apps/api/src/validators/common.ts)

**Problem:**
- Brak walidacji max page/limit
- Mozliwe DoS przez `?page=999999&limit=999999`
- SQLite OFFSET performance degradation przy duzych page numbers

**Scenariusz:**
```typescript
GET /api/orders?page=100000&limit=10000
// -> OFFSET 1000000000 LIMIT 10000
// -> SQLite timeout lub OOM
```

**Sugestia:**
```typescript
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Dodaj cursor-based pagination dla duzych datasets
  cursor: z.string().optional(),
});
```
