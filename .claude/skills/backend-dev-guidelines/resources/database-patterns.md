# Database Patterns - Prisma Best Practices

Complete guide to database access patterns using Prisma in backend microservices.

## Table of Contents

- [PrismaService Usage](#prismaservice-usage)
- [Repository Pattern](#repository-pattern)
- [Transaction Patterns](#transaction-patterns)
- [Query Optimization](#query-optimization)
- [N+1 Query Prevention](#n1-query-prevention)
- [Error Handling](#error-handling)
- [Monetary Values Pattern](#monetary-values-pattern)
- [Soft Delete Pattern](#soft-delete-pattern)

---

## PrismaService Usage

### Basic Pattern

```typescript
import { PrismaService } from '@project-lifecycle-portal/database';

// Always use PrismaService.main
const users = await PrismaService.main.user.findMany();
```

### Check Availability

```typescript
if (!PrismaService.isAvailable) {
    throw new Error('Prisma client not initialized');
}

const user = await PrismaService.main.user.findUnique({ where: { id } });
```

---

## Repository Pattern

### Why Use Repositories

✅ **Use repositories when:**
- Complex queries with joins/includes
- Query used in multiple places
- Need caching layer
- Want to mock for testing

❌ **Skip repositories for:**
- Simple one-off queries
- Prototyping (can refactor later)

### Repository Template

```typescript
export class UserRepository {
    async findById(id: string): Promise<User | null> {
        return PrismaService.main.user.findUnique({
            where: { id },
            include: { profile: true },
        });
    }

    async findActive(): Promise<User[]> {
        return PrismaService.main.user.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        return PrismaService.main.user.create({ data });
    }
}
```

---

## Transaction Patterns

### Simple Transaction

```typescript
const result = await PrismaService.main.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    const profile = await tx.userProfile.create({ data: { userId: user.id } });
    return { user, profile };
});
```

### Interactive Transaction

```typescript
const result = await PrismaService.main.$transaction(
    async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user) throw new Error('User not found');

        return await tx.user.update({
            where: { id },
            data: { lastLogin: new Date() },
        });
    },
    {
        maxWait: 5000,
        timeout: 10000,
    }
);
```

---

## Query Optimization

### Use select to Limit Fields

```typescript
// ❌ Fetches all fields
const users = await PrismaService.main.user.findMany();

// ✅ Only fetch needed fields
const users = await PrismaService.main.user.findMany({
    select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
    },
});
```

### Use include Carefully

```typescript
// ❌ Excessive includes
const user = await PrismaService.main.user.findUnique({
    where: { id },
    include: {
        profile: true,
        posts: { include: { comments: true } },
        workflows: { include: { steps: { include: { actions: true } } } },
    },
});

// ✅ Only include what you need
const user = await PrismaService.main.user.findUnique({
    where: { id },
    include: { profile: true },
});
```

---

## N+1 Query Prevention

### Problem: N+1 Queries

```typescript
// ❌ N+1 Query Problem
const users = await PrismaService.main.user.findMany(); // 1 query

for (const user of users) {
    // N queries (one per user)
    const profile = await PrismaService.main.userProfile.findUnique({
        where: { userId: user.id },
    });
}
```

### Solution: Use include or Batching

```typescript
// ✅ Single query with include
const users = await PrismaService.main.user.findMany({
    include: { profile: true },
});

// ✅ Or batch query
const userIds = users.map(u => u.id);
const profiles = await PrismaService.main.userProfile.findMany({
    where: { userId: { in: userIds } },
});
```

---

## Error Handling

### Prisma Error Types

```typescript
import { Prisma } from '@prisma/client';

try {
    await PrismaService.main.user.create({ data });
} catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation
        if (error.code === 'P2002') {
            throw new ConflictError('Email already exists');
        }

        // Foreign key constraint
        if (error.code === 'P2003') {
            throw new ValidationError('Invalid reference');
        }

        // Record not found
        if (error.code === 'P2025') {
            throw new NotFoundError('Record not found');
        }
    }

    // Unknown error
    Sentry.captureException(error);
    throw error;
}
```

---

## Monetary Values Pattern

All monetary values in AKROBUD are stored as integers (smallest currency unit) to avoid floating-point precision issues.

### Storage Strategy

- **PLN**: stored in grosze (1 PLN = 100 grosze)
- **EUR**: stored in cents (1 EUR = 100 cents)
- Database fields are `Int` type
- Never use `Float` or `Decimal` for money

### Using money.ts Functions

```typescript
import {
  groszeToPln,
  plnToGrosze,
  formatGrosze,
  centyToEur,
  eurToCenty,
  formatCenty,
  type Grosze,
  type PLN
} from '../utils/money.js';

// Converting for display (grosze → PLN)
const order = await prisma.order.findUnique({ where: { id } });
const displayValue = groszeToPln(order.valuePln as Grosze); // 12345 → 123.45

// Formatting for UI
const formatted = formatGrosze(order.valuePln as Grosze); // "123,45 zł"

// Converting for storage (PLN → grosze)
const userInput = 123.45; // user entered PLN
const valueToStore = plnToGrosze(userInput as PLN); // 12345 grosze
await prisma.order.create({
  data: { valuePln: valueToStore }
});

// Summing monetary values safely
import { sumMonetary } from '../utils/money.js';
const total = sumMonetary(order1.valuePln, order2.valuePln); // still in grosze
```

### ❌ Anti-Patterns (NEVER DO)

```typescript
// ❌ WRONG - treats grosze as PLN (100x error!)
const total = parseFloat(order.valuePln?.toString() || '0');

// ❌ WRONG - loses precision
const display = order.valuePln.toFixed(2); // "10000.00" instead of "100.00"

// ❌ WRONG - unsafe floating point
const sum = order1.valuePln / 100 + order2.valuePln / 100; // precision loss!
```

### ESLint Protection

ESLint rule blocks unsafe patterns on money fields:
- `parseFloat(order.valuePln)` → Error
- `order.valuePln.toFixed(2)` → Error

**See:** [apps/api/src/utils/money.ts](../../apps/api/src/utils/money.ts)

---

## Soft Delete Pattern

AKROBUD uses soft delete (marking records as deleted) instead of hard delete.

### Schema Definition

```prisma
model Order {
  id         Int       @id @default(autoincrement())
  orderNumber String
  archivedAt DateTime? // Null = active, Date = archived/deleted
}

model Delivery {
  id         Int       @id @default(autoincrement())
  deliveryDate DateTime
  deletedAt  DateTime? // Null = active, Date = deleted
}
```

### Implementation

```typescript
// ✅ Soft delete
async delete(id: number): Promise<void> {
  await PrismaService.main.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

// ✅ Always filter deleted records in queries
async findAll(): Promise<Delivery[]> {
  return PrismaService.main.delivery.findMany({
    where: { deletedAt: null } // exclude deleted
  });
}

// ✅ Restore (undelete)
async restore(id: number): Promise<Delivery> {
  return PrismaService.main.delivery.update({
    where: { id },
    data: { deletedAt: null }
  });
}
```

### ❌ Never Hard Delete Without Confirmation

```typescript
// ❌ DANGEROUS - data lost forever
await prisma.delivery.delete({ where: { id } });

// ✅ If hard delete is absolutely required:
// 1. Show confirmation dialog on frontend
// 2. Log the deletion
// 3. Consider archiving to separate table first
```

---

**Related Files:**
- [SKILL.md](SKILL.md)
- [services-and-repositories.md](services-and-repositories.md)
- [async-and-errors.md](async-and-errors.md)
