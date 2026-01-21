# Numeric Precision & Overflow

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 6.1 parseInt Without Radix

**Severity:** Medium
**Location:** [../../apps/api/src/validators/glass.ts:12](../../apps/api/src/validators/glass.ts#L12), [../../apps/api/src/validators/schuco.ts:11](../../apps/api/src/validators/schuco.ts#L11)

**Problem:**
```typescript
const num = parseInt(val, 10);  // OK
const num = parseInt(val);      // Missing radix
```

**Scenariusz:**
```typescript
// Leading zeros interpreted as octal in old JS
parseInt('08');  // -> 0 (octal interpretation)
parseInt('08', 10);  // -> 8 (decimal)

// Hex strings
parseInt('0x10');  // -> 16
parseInt('0x10', 10);  // -> 0
```

**Sugestia:**
```typescript
// ESLint rule
"radix": ["error", "always"]

// Zod schema
z.string().transform((v, ctx) => {
  const num = Number(v);
  if (!Number.isFinite(num)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nieprawidlowa liczba'
    });
    return z.NEVER;
  }
  return Math.floor(num);
})
```

---

## 6.2 Float to Int Conversion Loss

**Severity:** HIGH
**Location:** Database schema - money fields

**Problem:**
```prisma
model Order {
  valuePln Int? @map("value_pln")  // Grosze?
  valueEur Int? @map("value_eur")  // Centy?
}

model PendingOrderPrice {
  valueNetto  Int  // Grosze?
  valueBrutto Int? // Grosze?
}
```

- Brak dokumentacji czy wartosci sa w groszach
- Frontend moze wysylac zlotowki zamiast groszy
- PDF parser moze zwracac float

**Scenariusz:**
```typescript
// PDF parser
const parsed = { valueNetto: 1250.50 };  // 1250.50 PLN

// Service
await prisma.pendingOrderPrice.create({
  data: {
    valueNetto: parsed.valueNetto  // 1250.5 -> 1250 (truncation!)
  }
});

// Expected: 125050 groszy
// Actual: 1250 groszy (12.50 PLN) - BLAD!
```

**Sugestia:**
```typescript
// 1. Explicit conversion functions
function plnToGrosze(pln: number): number {
  return Math.round(pln * 100);
}

function groszeToPlN(grosze: number): number {
  return grosze / 100;
}

// 2. Type safety
type Grosze = number & { __brand: 'grosze' };
type PLN = number & { __brand: 'pln' };

// 3. Schema comment
model Order {
  valuePln Int? @map("value_pln")  // in grosze (1 PLN = 100 grosze)
  valueEur Int? @map("value_eur")  // in cents (1 EUR = 100 cents)
}

// 4. Validation
const financialValueSchema = z.number()
  .refine(n => Number.isInteger(n * 100), 'Max 2 decimal places')
  .transform(plnToGrosze);
```

---

## 6.3 Currency Conversion Overflow

**Severity:** Medium
**Location:** Anywhere EUR<->PLN conversion happens

**Problem:**
```typescript
const maxValue = 999999999.99;  // Max from validator
const eurToPlnRate = 450; // 4.50 PLN/EUR (stored as grosze)

const plnValue = Math.round(maxValue * eurToPlnRate / 100);
// -> 4499999999.955 -> rounds to 4500000000
// -> Exceeds Int32 max (2147483647)
// -> Overflow!
```

**Scenariusz:**
```typescript
// Large EUR order
const orderEur = 999999999; // centy
const rate = 450; // 4.50 PLN/EUR

// Conversion
const orderPln = Math.round(orderEur * rate / 100);
// -> 4499999995

// Prisma insert
await prisma.order.update({
  data: { valuePln: orderPln }
});
// -> SQLite Int overflow lub truncation
```

**Sugestia:**
```typescript
// 1. Use BigInt for large monetary values
model Order {
  valuePln BigInt? @map("value_pln")  // Can store larger values
  valueEur BigInt? @map("value_eur")
}

// 2. Validate before conversion
function convertEurToPlnGrosze(eurCents: number, rate: number): number {
  const plnGrosze = Math.round(eurCents * rate / 100);

  if (plnGrosze > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError('Wartosc po konwersji przekracza maksymalna');
  }

  return plnGrosze;
}

// 3. Or use Decimal type (requires different DB)
// Prisma Decimal works with PostgreSQL, MySQL
```
