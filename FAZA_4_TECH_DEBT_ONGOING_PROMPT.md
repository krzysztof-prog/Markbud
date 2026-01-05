# FAZA 4: TECH DEBT & ONGOING IMPROVEMENTS - IMPLEMENTATION PROMPT

**Deadline:** Ongoing (nie ma sztywnego deadline)
**Priority:** NISKIE - długoterminowe usprawnienia
**Execution mode:** **MIX - zależnie od taska**

---

## 🎯 OVERVIEW FAZY 4

Faza 4 to **ongoing improvements** - rzeczy które:
- ✅ Są pożyteczne ale nie critical
- ✅ Poprawiają long-term maintainability
- ✅ Można robić stopniowo, w wolnym czasie
- ✅ Nie blokują żadnych innych prac

**Charakterystyka:**
- Brak deadline (kiedy będzie czas)
- Można robić częściowo (1 task na tydzień)
- Można przerwać w każdej chwili
- Można pominąć jeśli nie ma ROI

**3 główne obszary:**
1. Enforce money.ts usage (prevent future bugs)
2. Transaction tests (improve reliability)
3. Documentation sync (reality = docs)

---

## TASK 12: Enforce money.ts Usage - **BEZPOŚREDNIA (z ESLint setup w plan mode)**

### Cel:

Zapobiec przyszłym bugs typu "parseFloat na groszach" poprzez:
1. ESLint rule który blokuje unsafe patterns
2. Migracja wszystkich istniejących użyć
3. Documentation i onboarding

### KROK 1: ESLint Rule Setup - **PLAN MODE (1h)**

**Dlaczego plan mode:**
- Wybór ESLint plugin strategy
- Decyzja: custom rule vs existing plugin
- Configuration dla monorepo

**Plan Mode Prompt:**

```
TASK: Skonfiguruj ESLint rule który blokuje unsafe money operations.

UNSAFE PATTERNS TO DETECT:
- parseFloat(order.valuePln)
- parseInt(order.valueEur)
- order.valuePln.toFixed()
- Math.round(order.valuePln)
- (on any field containing: price, value, cost, amount, total, grosze, centy)

SAFE PATTERNS (allow):
- groszeToPln(order.valuePln)
- centyToEur(order.valueEur)
- formatGrosze(order.valuePln)

OPTIONS:
A. Custom ESLint rule (write from scratch)
B. eslint-plugin-no-unsafe-money (if exists - research)
C. Generic rule: no-restricted-syntax

ANALYZE:
- What's available in eslint ecosystem?
- Time to implement custom vs config existing
- Monorepo considerations (different rules for api vs web?)

DELIVER PLAN:
1. Recommended approach (A/B/C + why)
2. ESLint config structure
3. Rule configuration
4. Exception handling (legit cases?)
5. Testing the rule
```

**Expected output:**

```javascript
// eslint.config.js (recommended: no-restricted-syntax)
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.name='parseFloat'] MemberExpression[property.name=/value|price|cost|amount|total|grosze|centy/i]",
        message: 'Use groszeToPln() or centyToEur() from utils/money.ts instead of parseFloat'
      },
      {
        selector: "CallExpression[callee.name='parseInt'] MemberExpression[property.name=/value|price|cost|amount|total|grosze|centy/i]",
        message: 'Use groszeToPln() or centyToEur() from utils/money.ts instead of parseInt'
      },
      {
        selector: "CallExpression[callee.property.name='toFixed'] MemberExpression[property.name=/value|price|cost|amount|total|grosze|centy/i]",
        message: 'Convert to PLN/EUR first using groszeToPln()/centyToEur(), then use toFixed()'
      }
    ]
  }
}
```

### KROK 2: Migrate Existing Code - **BEZPOŚREDNIA (2-3h)**

**Find all violations:**

```bash
# Run ESLint with new rule
pnpm eslint apps/api/src --ext .ts

# Expected violations: ~20-30 places (już naprawiliśmy dashboard i export w Fazie 1)
```

**Migration pattern:**

```typescript
// PRZED
const total = parseFloat(order.valuePln?.toString() || '0');

// PO
import { groszeToPln, type Grosze } from '../utils/money.js';
const total = order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
```

**Files to check (grep results):**
- Wszystkie service files
- Wszystkie handler files
- Repository queries z aggregate/sum

**DONE criteria:**
- [ ] ESLint rule configured
- [ ] All violations migrated
- [ ] pnpm eslint passes
- [ ] Tests still pass
- [ ] Commit: `chore: enforce money.ts usage with ESLint rule`

---

## TASK 13: Transaction Tests - **PLAN MODE (2 dni)**

### Dlaczego plan mode:

✅ **Test strategy decisions:**
- Jak testować rollback? (mock failures)
- Test database setup (SQLite in-memory? Docker?)
- Concurrent transaction testing (race conditions)

✅ **Architectural decisions:**
- Czy stworzyć test utilities dla transactions?
- Jak mock Prisma w testach transakcji?

**Plan Mode Prompt:**

```
TASK: Napisz testy dla transaction scenarios, szczególnie rollback i concurrent access.

CONTEXT:
- 18 użyć prisma.$transaction w kodzie
- Brak testów rollback scenarios
- Brak testów concurrent transactions
- Risk: data inconsistency, deadlocks

CURRENT TRANSACTION USAGE (analyze):
1. deliveryService.ts - które operacje?
2. orderService.ts - które operacje?
3. importService.ts - które operacje?

TEST SCENARIOS TO COVER:
A. Happy path (transaction succeeds)
B. Rollback (transaction fails mid-way)
C. Concurrent transactions (2+ at same time)
D. Deadlock prevention
E. Timeout handling

TESTING INFRASTRUCTURE DECISIONS:
- Database: Real SQLite vs In-memory vs Mock?
- Prisma: Real client vs Mock?
- Concurrency: How to simulate?
- Assertions: How to verify rollback?

ANALYZE APPROACHES:

Approach A: Real DB + Real Prisma
PRO: Most realistic
CON: Slower, needs cleanup

Approach B: In-memory SQLite + Real Prisma
PRO: Fast, isolated
CON: Setup complexity

Approach C: Mock Prisma
PRO: Fastest
CON: Not testing real transaction behavior

DELIVER PLAN:
1. Recommended approach (A/B/C + why)
2. Test infrastructure setup
3. Priority ranking (which transactions test first)
4. Test scenarios per transaction
5. Mock/fixture strategy
6. Example test code
7. Success criteria
```

**Expected output:**

```markdown
# Transaction Testing Plan

## Recommendation: Approach B (In-memory SQLite + Real Prisma)

WHY:
- Fast enough (< 100ms per test)
- Real transaction behavior
- Isolated (no DB pollution)
- Realistic (actual SQL executed)

## Infrastructure Setup

```typescript
// tests/helpers/test-db.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export async function setupTestDB() {
  prisma = new PrismaClient({
    datasources: {
      db: { url: 'file::memory:?cache=shared' }
    }
  });

  // Run migrations
  await prisma.$executeRaw`...schema...`;

  return prisma;
}

export async function teardownTestDB() {
  await prisma.$disconnect();
}

export function getPrisma() {
  return prisma;
}
```

## Priority Ranking

1. **deliveryService - addOrdersToDelivery** (CRITICAL)
   - Multi-step: create delivery_orders, update order status
   - Rollback scenario: order already in another delivery

2. **importService - processImport** (HIGH)
   - Multi-step: create orders, create requirements, update stock
   - Rollback scenario: duplicate order number

3. **orderService - completeOrder** (HIGH)
   - Multi-step: update order, create history, emit event
   - Rollback scenario: order already completed

## Test Scenarios

### deliveryService.addOrdersToDelivery

Happy path:
```typescript
it('should add orders to delivery in transaction', async () => {
  const delivery = await createTestDelivery();
  const orders = await createTestOrders(3);

  await deliveryService.addOrdersToDelivery(delivery.id, orders.map(o => o.id));

  const result = await prisma.delivery.findUnique({
    where: { id: delivery.id },
    include: { deliveryOrders: true }
  });

  expect(result.deliveryOrders).toHaveLength(3);
});
```

Rollback:
```typescript
it('should rollback if order already in delivery', async () => {
  const delivery = await createTestDelivery();
  const order = await createTestOrder();

  // Add order first time
  await deliveryService.addOrdersToDelivery(delivery.id, [order.id]);

  // Try to add again (should fail)
  await expect(
    deliveryService.addOrdersToDelivery(delivery.id, [order.id])
  ).rejects.toThrow();

  // Verify: still only 1 delivery_order (rollback worked)
  const count = await prisma.deliveryOrder.count({
    where: { deliveryId: delivery.id }
  });
  expect(count).toBe(1);
});
```

Concurrent:
```typescript
it('should handle concurrent additions safely', async () => {
  const delivery = await createTestDelivery();
  const orders = await createTestOrders(10);

  // Add 10 orders concurrently
  await Promise.all(
    orders.map(o => deliveryService.addOrdersToDelivery(delivery.id, [o.id]))
  );

  // Verify: all 10 added (no duplicates, no lost updates)
  const count = await prisma.deliveryOrder.count({
    where: { deliveryId: delivery.id }
  });
  expect(count).toBe(10);
});
```

## Success Criteria
- [ ] Test infrastructure setup (in-memory DB)
- [ ] Top 3 transactions tested (happy + rollback + concurrent)
- [ ] All tests pass
- [ ] Documentation for adding transaction tests
```

### Po zatwierdzeniu planu - implementacja:

**DONE criteria:**
- [ ] Plan approved
- [ ] Test infrastructure setup
- [ ] Priority 1 transaction tested
- [ ] Priority 2 transaction tested
- [ ] Priority 3 transaction tested
- [ ] CI/CD runs transaction tests
- [ ] Commit: `test: add transaction tests for critical paths`

---

## TASK 14: Documentation Sync - **BEZPOŚREDNIA (1-2 dni)**

### Dlaczego NIE plan mode:

❌ Straightforward task - update docs to match code
❌ No architectural decisions
❌ Clear scope (specific docs to update)

### Co zrobić:

**14.1. Inventory dokumentacji:**

```bash
# Znajdź wszystkie MD files
find docs/ -name "*.md" | wc -l

# Znajdź CLAUDE.md, README.md, etc.
```

**14.2. Priorytetowe pliki do synchronizacji:**

1. **CLAUDE.md** - project instructions
   - Fix: "używaj money.ts" (teraz prawda po Fazie 1!)
   - Fix: "layered architecture" (opisz jak jest, nie jak powinno być)
   - Fix: "comprehensive tests" (bądź realistyczny - 60% coverage, nie 100%)

2. **backend-dev-guidelines** (skill)
   - Add: money.ts usage examples
   - Add: transaction testing patterns
   - Fix: Route examples (pokazuj DOBRE z obecnego kodu)

3. **frontend-dev-guidelines** (skill)
   - Add: Mobile patterns (z Fazy 2)
   - Add: Accessibility patterns (FormField, aria-live)
   - Add: Testing examples (z Fazy 3)

4. **README.md** - main project README
   - Update stack versions
   - Update Getting Started (aktualne komendy)
   - Add Testing section

**14.3. Pattern dla każdego doc:**

```markdown
## [DOC NAME] Sync

### PRZED (wishful thinking):
> "All monetary values use money.ts for conversion"

### ACTUAL STATE (kod):
- money.ts exists
- ESLint enforces usage (Faza 4)
- Dashboard uses groszeToPln (fixed Faza 1)
- Some old code still uses parseFloat (gradual migration)

### PO (reality):
> "Monetary values stored as integers (grosze/cents).
> Use groszeToPln()/centyToEur() from utils/money.ts for conversion.
> ESLint rule enforces this pattern for new code.
> Old code being gradually migrated (see FAZA_4 plan)."
```

**14.4. Szczegółowe zmiany:**

**CLAUDE.md:**

```markdown
## Konwencje kodu

### Backend
- **Money handling:** All values stored as Int (grosze/cents)
  - Use `groszeToPln()` / `centyToEur()` from `utils/money.ts`
  - ESLint rule enforces this (no parseFloat on money fields)
  - Example: `const pln = groszeToPln(order.valuePln as Grosze)`

- **Layered architecture:** Routes → Handlers → Services → Repositories
  - Routes: routing only (delegate to handlers)
  - Handlers: HTTP concerns (validate, format response)
  - Services: business logic
  - Repositories: database access
  - NOTE: Some old routes (monthly-reports.ts) still have logic - being refactored

- **Testing:**
  - Backend: ~60% coverage (critical paths)
  - Frontend: ~60% coverage (top components + hooks)
  - Target: 80% coverage for critical paths
  - See FAZA_3 and FAZA_4 plans for ongoing improvements
```

**backend-dev-guidelines/resources/complete-examples.md:**

Add new section:

```markdown
## Money Handling Example

All monetary values are stored as integers (smallest currency unit).

### Correct Pattern

```typescript
import { groszeToPln, plnToGrosze, type Grosze, type PLN } from '../utils/money.js';

// Storing money (PLN → grosze)
const userInput = 123.45; // PLN
const valueToStore = plnToGrosze(userInput as PLN); // 12345 grosze
await prisma.order.create({
  data: { valuePln: valueToStore }
});

// Retrieving money (grosze → PLN)
const order = await prisma.order.findUnique({ where: { id } });
const displayValue = groszeToPln(order.valuePln as Grosze); // 123.45 PLN

// Formatting for display
import { formatGrosze } from '../utils/money.js';
const formatted = formatGrosze(order.valuePln as Grosze); // "123,45 zł"

// Summing money (safe)
import { sumMonetary } from '../utils/money.js';
const total = sumMonetary(order1.valuePln, order2.valuePln); // in grosze
```

### Anti-Pattern (DO NOT DO)

```typescript
// ❌ WRONG - treats grosze as PLN
const total = parseFloat(order.valuePln?.toString() || '0'); // BUG!

// ❌ WRONG - loses precision
const display = order.valuePln.toFixed(2); // "10000.00" instead of "100.00"

// ❌ WRONG - unsafe math
const sum = order1.valuePln + order2.valuePln; // no overflow check
```

### ESLint Protection

ESLint rule prevents unsafe patterns:

```javascript
// Blocked by ESLint:
parseFloat(order.valuePln)  // Error: Use groszeToPln()
order.valuePln.toFixed(2)   // Error: Convert first, then toFixed()
```
```

**14.5. Archive obsolete docs:**

Move to `docs/archive/2025/`:
- Old planning docs (`.plan/`)
- Old implementation notes (`dev/active/`)
- Outdated architecture proposals

**DONE criteria:**
- [ ] CLAUDE.md updated (reality = docs)
- [ ] backend-dev-guidelines updated (money examples)
- [ ] frontend-dev-guidelines updated (mobile, a11y)
- [ ] README.md updated (current state)
- [ ] Obsolete docs archived
- [ ] Commit: `docs: sync documentation with current codebase state`

---

## 📦 FINALIZACJA FAZY 4

### Metrics:

```
PRZED FAZA 4:
- ESLint: no money.ts enforcement
- Future bugs: likely (parseFloat pattern can repeat)
- Transaction tests: 0
- Documentation: 30% accurate

PO FAZIE 4:
- ESLint: blocks unsafe money operations
- Future bugs: prevented by linting
- Transaction tests: critical paths covered
- Documentation: 90% accurate
```

### Ongoing Nature:

Faza 4 **nie kończy się** - to ongoing improvements:
- Każdy nowy feature → follow new patterns
- ESLint enforcement → automatic
- Docs → update when major changes
- Tests → add when touching code

### Final Commit:

```bash
git commit -m "chore(phase4): Long-term tech debt improvements

ESLint Enforcement:
- Add rule blocking unsafe money operations
- Migrate remaining parseFloat → groszeToPln
- Future-proof against money bugs

Transaction Testing:
- Add in-memory SQLite test infrastructure
- Test rollback scenarios for critical transactions
- Test concurrent transaction handling
- Prevent data inconsistency issues

Documentation Sync:
- Update CLAUDE.md to reflect reality
- Sync backend-dev-guidelines (money patterns)
- Sync frontend-dev-guidelines (mobile, a11y)
- Archive obsolete planning docs

System now has better guardrails and maintainable documentation.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🎯 KIEDY ROBIĆ FAZĘ 4?

### NIE róbcie Fazy 4 jeśli:

❌ Faza 1-3 nie są ukończone
❌ Są critical bugs do naprawy
❌ Jest deadline na nowy feature
❌ Brak czasu / zasobów

### Róbcie Fazę 4 kiedy:

✅ System jest stabilny (Faza 1-3 done)
✅ Macie "wolny" czas między features
✅ Chcecie zapobiec przyszłym problemom
✅ Onboarding nowych devs (docs ważne!)
✅ Przed production launch (preventive)

### Kolejność w Fazie 4:

**Recommended order:**
1. Task 14 (docs) - **FIRST** - help current/future devs
2. Task 12 (ESLint) - prevent future money bugs
3. Task 13 (transaction tests) - improve reliability

**Można robić częściowo:**
- Tylko Task 14 (docs sync)
- Tylko Task 12 (ESLint) jeśli obawy o money bugs
- Skip Task 13 jeśli transactions działają dobrze

---

## 📞 KOMUNIKACJA W FAZIE 4

### Luźniejsza struktura:

- **Nie ma deadline** - rób w wolnym czasie
- **Można przerwać** - jeśli critical bug się pojawi
- **Można pominąć** - jeśli brak ROI
- **Można zrobić częściowo** - 1 task na tydzień OK

### Reporting:

Mniej formalny niż Faza 1-3:
- Update co tydzień (opcjonalnie)
- Commit gdy gotowe (no pressure)
- PR review (ale non-blocking)

---

## ✅ DEFINICJA SUKCESU FAZY 4

**System po Fazie 4:**
- **Safer** - ESLint prevents common bugs
- **Reliable** - transactions tested
- **Documented** - docs = reality
- **Maintainable** - new devs onboard faster

**Ale NAJWAŻNIEJSZE:**
- Faza 4 **NIE blokuje** innych prac
- To **ongoing improvement**, nie blocker
- **Nice to have**, nie must have

---

## 🚀 NEXT STEPS AFTER FAZA 4

Po Fazie 4 system jest w **bardzo dobrym stanie**.

**Maintainability checklist:**
- [x] Critical bugs fixed (Faza 1)
- [x] UX improved (Faza 2)
- [x] Tech debt reduced (Faza 3)
- [x] Guardrails in place (Faza 4)

**Co dalej?**
- **New features** - teraz możecie bezpiecznie dodawać
- **Performance optimization** - jeśli potrzebne
- **Scaling** - jeśli user base rośnie
- **Production deployment** - system ready!

**Pamiętaj:**
- Follow new patterns (money.ts, tests, accessibility)
- ESLint will help (automatic enforcement)
- Docs are accurate (less confusion)
- Tests prevent regressions (confidence to change)

---

**FAZA 4 = DŁUGOTERMINOWA INWESTYCJA**

Nie critical jak Faza 1, ale bardzo valuable long-term.

Rób kiedy masz czas, skip jeśli masz deadline. System będzie działać bez Fazy 4, ale z Fazą 4 będzie lepszy maintainable.

Your choice! 🎯
