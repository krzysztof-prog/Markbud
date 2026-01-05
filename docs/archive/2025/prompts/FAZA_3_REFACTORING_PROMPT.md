# FAZA 3: REFACTORING & MEDIUM PRIORITY - IMPLEMENTATION PROMPT

**Deadline:** 1-2 tygodnie
**Priority:** ŚREDNIE - quality improvements, tech debt reduction
**Execution mode:** **OBOWIĄZKOWY PLAN MODE dla WSZYSTKICH tasków**

---

## 🎯 OVERVIEW FAZY 3

Po naprawie critical bugs (Faza 1) i high priority UX (Faza 2), teraz czas na **refactoring tech debt**.

**3 główne taski:**
1. **Refactor monoliths** (1000+ linii files)
2. **Frontend tests** (top components + hooks)
3. **Accessibility improvements** (GlobalSearch, forms, keyboard nav)

**WSZYSTKIE wymagają plan mode** - to są złożone refactory z architectural decisions.

---

## ⚠️ DLACZEGO CAŁA FAZA 3 = PLAN MODE?

### Charakterystyka Fazy 3:

✅ **Multiple valid approaches** dla każdego taska
✅ **Architectural decisions** (jak podzielić monolit?)
✅ **High risk of breaking changes** (refactor 1000+ linii)
✅ **Trade-offs to discuss** (time vs quality, scope vs completion)

### Kontrast z Fazą 1 i 2:

| Aspekt | Faza 1-2 | Faza 3 |
|--------|----------|--------|
| Approach | Jednoznaczny | Multiple valid options |
| Risk | Niskie (bug fixes) | Wysokie (refactoring) |
| Scope | Jasno określony | Do negocjacji |
| Changes | Localized | System-wide |
| Planning needed | Minimal | Critical |

**Bez plan mode w Fazie 3 = ryzyko:**
- Złe architectural decisions
- Breaking changes bez rollback plan
- Scope creep (refactor "wszystkiego przy okazji")
- Tech debt replacement (nowy problem zamiast starego)

---

## TASK 9: Refactor Monoliths (3-4 dni) - **OBOWIĄZKOWY PLAN MODE**

### Monolity do refaktoru:

1. **importService.ts** - 1139 linii 🔥 **NAJWAŻNIEJSZY**
2. **file-watcher.ts** - 1250 linii
3. **monthly-reports.ts** (route!) - 442 linii

### Plan Mode Prompt - importService:

```
TASK: Refaktoryzuj importService.ts (1139 linii) na mniejsze, testowalne moduły.

CURRENT STATE ANALYSIS (OBOWIĄZKOWE):
1. Przeczytaj cały importService.ts
2. Zidentyfikuj główne responsibilities (co robi?)
3. Znajdź dependencies (co importuje, czego używa?)
4. Znajdź side-effects (file system, DB writes, events?)
5. Znajdź coupling points (co jest mocno powiązane?)

ARCHITECTURE CONSTRAINTS:
- MUST: Zachować layered architecture (Service → Repository)
- MUST: Backward compatibility (API nie może się zmienić)
- MUST: Wszystkie existing features działają
- NICE: Testowalne moduły (dependency injection)
- NICE: Clear separation of concerns

REFACTORING APPROACHES - ANALYZE:

A. **Vertical Split** (by feature):
   - OrderImportService
   - ProfileImportService
   - ConflictResolutionService
   PRO: Clear feature boundaries
   CON: Może duplikować shared logic

B. **Horizontal Split** (by layer):
   - ImportParser (CSV/PDF → raw data)
   - ImportValidator (validate + fallbacks)
   - ImportProcessor (save to DB)
   - ImportConflictResolver
   PRO: Clear layers
   CON: Może być too granular

C. **Hybrid** (feature + utilities):
   - ImportService (main orchestrator)
   - parsers/ directory (CSV, PDF parsers)
   - validators/ directory
   - ConflictResolver
   - ImportRepository
   PRO: Balance between A and B
   CON: Need careful design

D. **Minimal** (extract heavy parts only):
   - Keep importService.ts
   - Extract: parsers/, validators/
   - Leave orchestration in main file
   PRO: Less risky, faster
   CON: Still quite large main file

ANALYZE TRADE-OFFS:
- Time: Jak długo potrwa każdy approach?
- Risk: Jaki jest risk breaking changes?
- Testing: Który approach jest easiest to test?
- Maintenance: Który będzie easiest to maintain?

DELIVER COMPREHENSIVE PLAN:
1. **Recommendation** (which approach + detailed why)
2. **File structure** (before/after diagram)
3. **Module boundaries** (what goes where)
4. **Dependencies graph** (how modules interact)
5. **Migration steps** (numbered, specific, testable)
6. **Rollback plan** (if something goes wrong)
7. **Testing strategy** (how to verify nothing broke)
8. **Risk mitigation** (what can go wrong + how to prevent)

IMPORTANT:
- Don't start implementation in plan mode
- Focus on analysis and design
- Present options, let user choose
- Be honest about trade-offs
```

### Expected Plan Output:

```markdown
# ImportService Refactoring Plan

## Current State Analysis
- 1139 lines
- 15 responsibilities identified
- 8 external dependencies
- 4 side-effects (file system, DB, events, locks)
- High coupling with: prisma, parsers, validators

## Recommendation: Hybrid Approach (C)

WHY:
- Balance między thoroughness a time (3 dni vs 7 dni full rewrite)
- Testable enough (parsers/validators easy to unit test)
- Low risk (orchestration stays in main, proven to work)
- Maintainable (clear directories)

## File Structure

BEFORE:
```
src/services/
  importService.ts (1139 lines)
```

AFTER:
```
src/services/
  import/
    ImportService.ts (300 lines) - orchestrator
    parsers/
      csv-parser.ts
      pdf-parser.ts
      types.ts
    validators/
      order-validator.ts
      profile-validator.ts
      types.ts
    ConflictResolver.ts
    ImportRepository.ts
```

## Module Boundaries

ImportService (orchestrator):
- Coordinates import flow
- Handles locks
- Emits events
- Error handling

Parsers (pure functions):
- CSV → Order[]
- PDF → Price[]
- NO side-effects

Validators (business rules):
- Validate orders
- Apply fallbacks
- Return errors array

ConflictResolver:
- Detect conflicts
- Suggest resolutions
- NO DB access

ImportRepository:
- All DB operations
- Transactions

## Dependencies Graph
[diagram tutaj]

## Migration Steps

Step 1: Extract parsers (1 day)
- Create parsers/ directory
- Move CSV parsing logic
- Move PDF parsing logic
- Update imports in ImportService
- Test: imports still work

Step 2: Extract validators (1 day)
- Create validators/ directory
- Move validation logic
- Update imports
- Test: validation works

Step 3: Extract ConflictResolver (0.5 day)
- Create ConflictResolver.ts
- Move conflict detection
- Update imports
- Test: conflicts detected

Step 4: Extract Repository (0.5 day)
- Create ImportRepository.ts
- Move DB operations
- Update imports
- Test: DB writes work

Step 5: Cleanup (1 day)
- Refactor ImportService (now ~300 lines)
- Add tests for each module
- Update documentation

## Rollback Plan

If Step X fails:
1. Git revert to previous step
2. Fix issue
3. Retry

If too many issues:
1. Git revert entire branch
2. Return to original importService.ts
3. Re-evaluate approach

## Testing Strategy

For EACH step:
- Unit tests for extracted module
- Integration test: full import flow still works
- Regression test: compare before/after on real data

Test data:
- sample-valid.csv (happy path)
- sample-missing-profile.csv (error handling)
- sample-conflicts.csv (conflict resolution)

## Risk Mitigation

Risk: Breaking existing imports
Mitigation: Feature flag, gradual rollout

Risk: Performance regression
Mitigation: Benchmark before/after

Risk: New bugs in refactored code
Mitigation: Comprehensive tests + manual QA

## Estimated Time: 4 days

## Success Criteria
- [ ] importService.ts < 400 lines
- [ ] Each module < 300 lines
- [ ] All modules have unit tests
- [ ] Full import flow tested
- [ ] No regressions
- [ ] Documentation updated
```

### Po zatwierdzeniu planu:

User ma opcje:
1. **Approve całość** → Claude implementuje wszystkie steps
2. **Approve częściowo** → np. tylko Steps 1-2
3. **Modify** → sugestie zmian w planie
4. **Reject + iterate** → inny approach

**NIGDY nie implementuj bez approval!**

---

## TASK 10: Frontend Tests (5 dni) - **OBOWIĄZKOWY PLAN MODE**

### Plan Mode Prompt:

```
TASK: Napisz testy dla top 10 critical frontend components i top 5 hooks.

CURRENT STATE:
- Frontend: 0 testów (!!!)
- Backend: 32 testy
- No testing infrastructure dla React components

SCOPE TO DEFINE:
- Which 10 components są najbardziej krytyczne?
- Which 5 hooks są używane najczęściej?
- Testing library: React Testing Library? Vitest? Playwright?
- Test types: Unit? Integration? E2E?

ANALYZE:
1. Scan all components (apps/web/src)
2. Rank by criticality:
   - User-facing features
   - Complex logic
   - High usage
   - Known bugs history
3. Scan all hooks (useX patterns)
4. Rank by usage count (grep analysis)

TESTING INFRASTRUCTURE DECISIONS:
- Library choice (RTL recommended ale confirm)
- Test setup (vitest.config.ts for frontend)
- Mock strategy (API calls, hooks, context)
- Test data fixtures
- CI/CD integration

DELIVER PLAN:
1. **Top 10 components** (ranked, with reasoning)
2. **Top 5 hooks** (ranked, with usage stats)
3. **Testing infrastructure setup** (packages, config)
4. **Test patterns** (examples per component type)
5. **Implementation order** (day-by-day)
6. **Coverage goals** (realistic % per day)
7. **Mock strategy** (what to mock, what to real)

TIME CONSTRAINT: 5 days max
- Don't aim for 100% coverage
- Focus on highest ROI tests
- Leave low-priority components for later
```

### Expected Plan Output:

```markdown
# Frontend Testing Plan

## Component Criticality Analysis (Top 10)

1. **DostawyPageContent** (deliveries list)
   - Lines: 800+
   - Usage: Main delivery management
   - Complexity: High (mutations, state, modals)
   - Test priority: CRITICAL

2. **OrderDetailModal** (order details)
   - User-facing: Yes
   - Complex logic: Order status, calculations
   - Test priority: HIGH

3. **ImportPreviewCard** (import preview)
   - Critical path: Import flow
   - Error handling: Complex
   - Test priority: HIGH

... (7 more)

## Hook Usage Analysis (Top 5)

1. **useDeliveryMutations** (44 usages)
   - CRUD operations
   - Cache invalidation
   - Test priority: CRITICAL

2. **useImportMutations** (12 usages)
   - Import flow
   - Error handling
   - Test priority: HIGH

... (3 more)

## Testing Infrastructure

Recommended stack:
- **Vitest** (already in backend, reuse config)
- **React Testing Library** (industry standard)
- **@testing-library/user-event** (simulate interactions)
- **msw** (Mock Service Worker for API)

Setup:
```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

Config: vitest.config.ts (extend existing)

## Test Patterns

Component test example:
```tsx
describe('OrderDetailModal', () => {
  it('renders order details', async () => {
    const order = mockOrder({ orderNumber: '52335' });
    render(<OrderDetailModal orderId={order.id} />);

    expect(screen.getByText('52335')).toBeInTheDocument();
  });

  it('handles status change', async () => {
    const user = userEvent.setup();
    render(<OrderDetailModal orderId={1} />);

    await user.click(screen.getByRole('button', { name: /zmień status/i }));
    await user.click(screen.getByText('In Progress'));

    expect(updateStatusMock).toHaveBeenCalled();
  });
});
```

Hook test example:
```tsx
describe('useDeliveryMutations', () => {
  it('creates delivery', async () => {
    const { result } = renderHook(() => useDeliveryMutations());

    await act(async () => {
      result.current.createDelivery.mutate({ date: '2025-01-01' });
    });

    expect(result.current.createDelivery.isSuccess).toBe(true);
  });
});
```

## Implementation Schedule

Day 1: Setup + Top 2 components
- Vitest config
- RTL setup
- Mock utilities
- DostawyPageContent tests
- OrderDetailModal tests

Day 2: Components 3-5
- ImportPreviewCard
- DeliveriesListView
- MagazynAkrobudPageContent

Day 3: Components 6-10
- Remaining components

Day 4: Top 5 hooks
- useDeliveryMutations
- useImportMutations
- useOrderMutations
- useWarehouseStock
- useRealtimeSync

Day 5: Integration + cleanup
- Integration tests (component + hook together)
- CI/CD setup
- Documentation

## Coverage Goals

Day 1: 10% (setup overhead)
Day 2: 25%
Day 3: 40%
Day 4: 50%
Day 5: 60%

## Mock Strategy

MOCK:
- API calls (use msw)
- React Query client (test utils)
- Next.js router
- WebSocket connections

REAL:
- Component logic
- State management
- UI interactions
- Form validation

## Success Criteria
- [ ] Vitest + RTL configured
- [ ] Top 10 components tested
- [ ] Top 5 hooks tested
- [ ] 60% coverage of critical code
- [ ] CI/CD runs tests
- [ ] Documentation for adding tests
```

---

## TASK 11: Accessibility Improvements (2-3 dni) - **OBOWIĄZKOWY PLAN MODE**

### Plan Mode Prompt:

```
TASK: Napraw pozostałe problemy accessibility wykryte w audycie.

REMAINING ISSUES (from audit):
1. GlobalSearch bez focus trap (custom modal vs Radix Dialog)
2. Forms bez aria-describedby dla error messages
3. Keyboard navigation w tabelach (brak arrow keys)
4. Loading states bez aria-live

ANALYZE EACH:

GlobalSearch:
- Current: Custom div modal
- Problem: Tab escapes, no focus trap
- Options:
  A. Migrate to Radix Dialog (recommended, 2h)
  B. Add focus trap manually (FocusTrap library, 3h)
  C. Keep as is + add aria-modal + role (1h, nie fix focus trap)

Forms aria-describedby:
- Current: Error messages shown ale nie linked
- Pattern needed for ALL forms
- Estimate: How many forms?

Keyboard nav tables:
- Current: Only Tab works
- Desired: Arrow keys navigate cells
- Implementation: TanStack Table plugin? Custom?

Loading aria-live:
- Current: No announcement
- Pattern: aria-live="polite" on loading states
- Estimate: How many loading states?

DELIVER PLAN:
1. **GlobalSearch strategy** (which approach + why)
2. **Forms aria pattern** (reusable solution)
3. **Keyboard nav approach** (library vs custom)
4. **Loading states inventory** (how many to fix)
5. **Priority order** (what first)
6. **Implementation steps**
7. **Testing with screen reader**

TIME CONSTRAINT: 2-3 days
```

### Expected Plan Output:

```markdown
# Accessibility Improvements Plan

## GlobalSearch Migration to Radix Dialog

RECOMMENDATION: Approach A (Radix Dialog)

WHY:
- 2h effort (fastest)
- Focus trap built-in
- Accessibility out of box (aria-modal, role, ESC)
- Consistent with rest of app (other modals use Radix)
- Maintainable (updates come free)

Implementation:
```tsx
// BEFORE
<div className="fixed inset-0 z-50">
  <div className="modal-content">...</div>
</div>

// AFTER
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogTitle>Search</DialogTitle>
    {/* content */}
  </DialogContent>
</Dialog>
```

## Forms aria-describedby Pattern

PROBLEM: 23 forms in codebase, each needs aria-describedby

SOLUTION: Create FormField wrapper component

```tsx
// components/ui/form-field.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {React.cloneElement(children, {
        id,
        'aria-describedby': error ? errorId : undefined,
        'aria-invalid': !!error
      })}
      {error && (
        <span id={errorId} className="text-red-500 text-sm" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

Usage:
```tsx
<FormField label="Data dostawy" error={errors.date} required>
  <Input type="date" value={date} onChange={setDate} />
</FormField>
```

## Keyboard Navigation Tables

RECOMMENDATION: TanStack Table keyboard plugin

WHY:
- Already using TanStack Table
- Plugin available: @tanstack/react-table-keyboard-navigation
- Standard patterns (Arrow keys, Home/End, Page Up/Down)

Implementation:
```tsx
import { useKeyboardNavigation } from '@tanstack/react-table-keyboard-navigation';

const table = useReactTable({
  // ... existing config
  plugins: [useKeyboardNavigation()],
});
```

If plugin doesn't exist (check docs):
- Custom implementation (1 day)
- Arrow keys: focus adjacent cell
- Home/End: focus first/last cell in row
- Page Up/Down: scroll + keep focus

## Loading States aria-live

INVENTORY: 47 loading states found (Skeleton components)

PATTERN: Wrap in aria-live region

```tsx
// components/ui/loading-skeleton.tsx
export function LoadingSkeleton() {
  return (
    <div aria-live="polite" aria-busy="true" role="status">
      <span className="sr-only">Ładowanie...</span>
      {/* skeleton UI */}
    </div>
  );
}
```

Update existing Skeleton components (12 files).

## Priority Order

Day 1:
1. GlobalSearch → Radix Dialog (2h)
2. FormField component (2h)
3. Update top 5 forms (3h)

Day 2:
4. Keyboard nav table (TanStack plugin research + impl) (6h)
5. Update remaining forms (2h)

Day 3:
6. Loading states aria-live (update 47 instances) (4h)
7. Screen reader testing (all fixes) (3h)
8. Documentation (1h)

## Testing with Screen Reader

Checklist:
- [ ] NVDA (Windows): test GlobalSearch focus trap
- [ ] NVDA: test form error announcements
- [ ] NVDA: test table keyboard nav
- [ ] NVDA: test loading state announcements
- [ ] VoiceOver (Mac): same tests
- [ ] Document results

## Success Criteria
- [ ] GlobalSearch uses Radix Dialog
- [ ] All forms have aria-describedby
- [ ] Tables navigable with arrows
- [ ] Loading states announce
- [ ] Screen reader test passed
- [ ] Accessibility score ≥ 80% (was 65%)
```

---

## 📦 FINALIZACJA FAZY 3

### Verification:

```bash
# Tests
pnpm test  # Should have 60%+ coverage now

# Type check
pnpm typecheck

# Build
pnpm build

# Accessibility audit
npx @axe-core/cli http://localhost:3000
```

### Metrics Before/After:

```
PRZED FAZA 3:
- importService: 1139 linii (monolith)
- Frontend tests: 0
- Accessibility score: 65/100
- Test coverage: 35%
- Largest file: 1250 linii

PO FAZIE 3:
- importService: ~300 linii + modules
- Frontend tests: top 10 components + 5 hooks
- Accessibility score: 80/100
- Test coverage: 60%
- Largest file: ~500 linii
```

### Final Commit:

```bash
git commit -m "refactor(phase3): Major refactoring and quality improvements

Refactoring:
- Split importService (1139→300 lines + modules)
- Split file-watcher into smaller services
- Refactor monthly-reports route to handler+service

Testing:
- Add tests for top 10 critical components
- Add tests for top 5 most-used hooks
- Frontend coverage: 0% → 60%
- CI/CD integration

Accessibility:
- Migrate GlobalSearch to Radix Dialog (focus trap)
- Add FormField component with aria-describedby
- Add keyboard navigation to tables
- Add aria-live to loading states
- Score improvement: 65 → 80

Tech debt significantly reduced. System more maintainable and testable.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🚨 CRITICAL: DLACZEGO PLAN MODE OBOWIĄZKOWY

### Scenariusz BEZ plan mode:

```
Claude: "Zaczynam refactor importService..."
[3 godziny później]
Claude: "Zrobiłem vertical split, teraz jest 8 plików ale nie działają importy"
User: "STOP! Dlaczego zmieniłeś API?!"
Claude: "Myślałem że to lepsze..."
[Rollback, strata 3h]
```

### Scenariusz Z plan mode:

```
Claude: "Analizuję importService... Widzę 3 approaches: vertical, horizontal, hybrid"
[Plan mode: 1h analysis]
Claude: "Rekomendacja: Hybrid. Tutaj plan, steps, risks."
User: "Nie, wolę minimal approach - mniej ryzyka"
Claude: "OK, robię plan B..."
[Plan approved]
Claude: "Implementuję według planu..."
[Success, 0 wasted time]
```

### Plan Mode CHRONI przed:

1. **Premature decisions** (wybór złego approach)
2. **Scope creep** ("przy okazji zrefaktoruję X, Y, Z...")
3. **Breaking changes** (nie przemyślane API changes)
4. **Wasted work** (implementation w złym kierunku)
5. **Missing rollback** (nie ma planu co jeśli failuje)

---

## 📞 KOMUNIKACJA W FAZIE 3

### Dla każdego taska:

**KROK 1: Plan Mode**
- Analiza (Read kod, understand current state)
- Opracowanie opcji (A, B, C approaches)
- Recommendation + trade-offs
- **CZEKAJ NA APPROVAL** ⚠️

**KROK 2: User Decision**
- Approve całość / częściowo
- Modify (sugestie)
- Reject + iterate

**KROK 3: Implementation**
- Tylko APPROVED steps
- Commit po każdym step
- Test po każdym step
- **STOP jeśli unexpected problems** → ask user

### Red Flags (STOP and ask):

🚨 Task trwa 2x dłużej niż planned
🚨 Pojawią się unexpected blockers
🚨 Need to change plan mid-implementation
🚨 Tests fail i nie wiadomo dlaczego
🚨 Breaking changes unavoidable

**NIE ciągnij na siłę - ask user first!**

---

## 🎯 SUCCESS = SIMPLIFIED SYSTEM

**Faza 3 done right = system jest:**
- **Prostszy** (mniejsze pliki, clear boundaries)
- **Bezpieczniejszy** (tests prevent regressions)
- **Dostępniejszy** (screen reader usable)
- **Maintainable** (łatwiej zrozumieć i zmienić)

**Faza 3 done wrong = system jest:**
- Bardziej skomplikowany (więcej abstrakcji)
- Mniej stabilny (nowe bugs)
- Trudniejszy w utrzymaniu (over-engineered)

**Plan mode = różnica między success a failure.**

---

**READY FOR FAZA 3?**

Po ukończeniu Fazy 2, **ZAWSZE zacznij od plan mode** dla każdego taska.

Nie ma skrótów w refactoringu. Plan najpierw, kod potem.
