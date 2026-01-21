# Date/Time & Timezone Handling

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 5.1 SQLite Timezone Loss

**Severity:** CRITICAL
**Location:** Multiple locations using `Date` with SQLite

**Problem:**
```typescript
// JavaScript
const deliveryDate = new Date('2025-01-15T10:00:00+01:00'); // CET
await prisma.delivery.create({ data: { deliveryDate } });

// SQLite storage (no timezone info)
// "2025-01-15 09:00:00.000"  <- UTC-converted string

// Later retrieval
const delivery = await prisma.delivery.findUnique(...);
console.log(delivery.deliveryDate);
// -> Date object w LOCAL timezone (moze byc inny!)

// Comparisons fail
const isSameDay = delivery.deliveryDate.getDate() === 15;
// -> moze byc false w zaleznosci od timezone
```

**Scenariusz:**
```typescript
// Server timezone: UTC
// User timezone: Europe/Warsaw (UTC+1)

// User wybiera date: 2025-01-15 (midnight jego czasu)
const userDate = new Date('2025-01-15T00:00:00+01:00');

// Zapisane w DB jako UTC:
// "2025-01-14T23:00:00.000Z"

// User pozniej widzi:
// "14 stycznia" <- dzien wczesniej!
```

**Sugestia:**
```typescript
// 1. Zawsze uzywaj UTC dla date-only values
function toUTCDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// 2. Store dates as ISO string in UTC
model Delivery {
  deliveryDate String @map("delivery_date") // "2025-01-15" (date-only)
}

// 3. Frontend: explicit timezone handling
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

function displayDate(dateStr: string) {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatInTimeZone(dateStr, userTz, 'yyyy-MM-dd');
}

// 4. Validation: ensure dates are start-of-day UTC
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

---

## 5.2 Week Number Calculation Inconsistency

**Severity:** Medium
**Location:** [../../apps/api/src/utils/date-helpers.ts:234](../../apps/api/src/utils/date-helpers.ts#L234)

**Problem:**
```typescript
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // ...
}
```

- Uzywa UTC ale input `date` moze byc w local timezone
- ISO week vs US week (niedziela vs poniedzialek jako start)
- Cross-year weeks (2024-W01 moze zawierac dni z 2023)

**Scenariusz:**
```typescript
// Koniec roku
const date1 = new Date('2024-12-30'); // Monday
const week1 = getWeekNumber(date1); // -> 2025-W01

// Import z OkucDemand expectedWeek: "2024-W53"
// vs calendar pokazuje "2025-W01"
// -> Mismatch w UI
```

**Sugestia:**
```typescript
import { getISOWeek, parseISO } from 'date-fns';

// Consistently uzywaj date-fns dla ISO weeks
export function getWeekNumber(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const year = d.getFullYear();
  const week = getISOWeek(d);

  // Handle cross-year weeks
  if (week === 1 && d.getMonth() === 11) {
    return `${year + 1}-W${week.toString().padStart(2, '0')}`;
  }
  if (week >= 52 && d.getMonth() === 0) {
    return `${year - 1}-W${week.toString().padStart(2, '0')}`;
  }

  return `${year}-W${week.toString().padStart(2, '0')}`;
}
```

---

## 5.3 Date Comparison Without Normalization

**Severity:** Medium
**Location:** Multiple locations

**Problem:**
```typescript
// Delivery filtering by date range
const deliveries = await prisma.delivery.findMany({
  where: {
    deliveryDate: {
      gte: new Date(startDate),  // Includes time!
      lte: new Date(endDate)     // Excludes same day!
    }
  }
});
```

**Scenariusz:**
```typescript
// User wybiera zakres: 2025-01-15 do 2025-01-20

// Frontend wysyla:
startDate = "2025-01-15T08:30:00.000Z"  // User's current time
endDate = "2025-01-20T08:30:00.000Z"

// DB query:
WHERE delivery_date >= "2025-01-15 08:30:00"
  AND delivery_date <= "2025-01-20 08:30:00"

// Dostawy z 2025-01-20 po 08:30 nie sa included!
// Dostawy z 2025-01-15 przed 08:30 nie sa included!
```

**Sugestia:**
```typescript
// Backend normalization
function normalizeDateRange(start: string, end: string) {
  const startDate = new Date(start);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
}

// Or use date-only strings
const deliveries = await prisma.$queryRaw`
  SELECT * FROM deliveries
  WHERE DATE(delivery_date) >= ${startDate}
    AND DATE(delivery_date) <= ${endDate}
`;
```
