# FAZA 2: HIGH PRIORITY FIXES - IMPLEMENTATION PROMPT

**Deadline:** 3-5 dni
**Priority:** WYSOKIE - UX i testy critical paths
**Execution mode:** **UŻYJ PLAN MODE dla Task 5 i 8, bezpośrednia dla reszty**

---

## 🎯 OVERVIEW FAZY 2

Po naprawie critical bugs (Faza 1), teraz czas na:
- **Mobile usability** (50% userów nie może pracować!)
- **Accessibility** (screen reader support)
- **Import safety** (error reporting)
- **Testing critical paths** (prevent regressions)

**4 taski, 3-5 dni pracy.**

---

## TASK 5: Mobile Table View (2 dni) - **UŻYJ PLAN MODE**

### Dlaczego plan mode?

✅ **Multiple approaches możliwe:**
- Responsive table vs Card list
- Virtualization library choice (react-window, tanstack-virtual, custom)
- Breakpoint strategy (768px, 640px, custom?)
- State management (media query hook, CSS only, context?)

✅ **Architectural decisions:**
- Czy stworzyć reusable `<ResponsiveTable>` component?
- Czy zrefaktorować istniejący TanStack Table?
- Mobile-first vs desktop-first approach?

✅ **Performance considerations:**
- Lazy loading dla długich list
- Pagination vs infinite scroll
- Memory footprint na mobile

### Plan Mode Prompt:

```
TASK: Zaimplementuj mobile-friendly view dla tabeli zestawień zleceń.

CONTEXT:
- Lokalizacja: apps/web/src/app/zestawienia/zlecenia/page.tsx:1326
- Problem: Tabela 14 kolumn, ~5000px szerokości, całkowicie nieużywalna na mobile
- User base: ~50% używa telefonów (375-414px szerokość)

REQUIREMENTS:
1. Desktop (≥768px): existing table (don't break)
2. Mobile (<768px): card list view
3. Must preserve all functionality:
   - Sorting
   - Filtering
   - Export CSV
   - Order detail modal
4. Performance: handle 100+ orders smoothly
5. Accessibility: keyboard navigation works

APPROACHES TO CONSIDER:
A. Full rewrite z responsive component
B. Conditional render (table vs cards)
C. CSS-only responsive (hide columns)

ANALYZE:
- Current table implementation (TanStack Table?)
- Existing mobile patterns in codebase
- Performance implications

DELIVER PLAN:
- Component structure
- Breakpoint strategy
- Migration path (czy breaking changes?)
- Testing approach
- Rollback plan
```

### Expected Output z Plan Mode:

1. **Analiza istniejącego kodu**
2. **Rekomendacja approach** (A/B/C + why)
3. **Component structure diagram**
4. **Implementation steps** (numbered, specific)
5. **Risk assessment**
6. **Test plan**

### Po zatwierdzeniu planu - implementacja:

**Files to modify:**
- `apps/web/src/app/zestawienia/zlecenia/page.tsx`
- `apps/web/src/hooks/useMediaQuery.ts` (create if not exists)
- `apps/web/src/components/orders/OrderCard.tsx` (new)

**Example implementation (jeśli wybrany approach B):**

```tsx
// useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// page.tsx
const isMobile = useMediaQuery('(max-width: 768px)');

return (
  <div>
    {isMobile ? (
      <MobileOrdersList orders={orders} />
    ) : (
      <OrdersTable orders={orders} />
    )}
  </div>
);

// OrderCard.tsx
export function OrderCard({ order }: { order: Order }) {
  return (
    <Card className="p-4 mb-2">
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold">{order.orderNumber}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Klient:</span>
          <span className="font-medium">{order.client}</span>
        </div>
        <div className="flex justify-between">
          <span>Deadline:</span>
          <span>{formatDate(order.deadline)}</span>
        </div>
        <div className="flex justify-between">
          <span>Wartość:</span>
          <span className="font-medium">{formatMoney(order.valuePln)}</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => openDetailModal(order.id)}
      >
        Szczegóły
      </Button>
    </Card>
  );
}
```

**DONE criteria:**
- [ ] Plan mode analysis completed and approved
- [ ] useMediaQuery hook implemented
- [ ] Mobile card view implemented
- [ ] Desktop table unchanged
- [ ] Tested on 375px, 414px, 768px, 1024px
- [ ] Export CSV works on both views
- [ ] Keyboard navigation works
- [ ] Performance: smooth scroll with 100+ items
- [ ] Commit: `feat: add mobile-friendly card view for orders summary`

---

## TASK 6: Aria Labels for Buttons (1 dzień) - **BEZPOŚREDNIA IMPLEMENTACJA**

### Dlaczego NIE plan mode?

❌ Mechaniczna zmiana - dodanie aria-label do buttonów
❌ Zero decyzji architektonicznych
❌ Pattern jest jasny i powtarzalny

### Co zrobić:

**6.1. Znajdź wszystkie icon buttons bez aria-label:**

```bash
# Grep dla buttonów z ikonami ale bez aria-label
grep -r "<Button.*<.*Icon" apps/web/src --include="*.tsx" | grep -v "aria-label"
```

**Top 20 najważniejszych ekranów:**
1. DeliveriesListView.tsx - DropdownMenu triggers
2. GlassOrdersTable.tsx - action buttons
3. sidebar.tsx - collapse/expand
4. DostawyPageContent.tsx - view toggles
5. OrderDetailModal.tsx - close button
6. ImportPreviewCard.tsx - cancel/confirm
7. MagazynAkrobudPageContent.tsx - edit/delete
8. (scan results z grep)

**6.2. Pattern do zastosowania:**

```tsx
// PRZED
<Button onClick={onDelete}>
  <TrashIcon />
</Button>

<DropdownMenuTrigger>
  <DotsVerticalIcon />
</DropdownMenuTrigger>

// PO
<Button onClick={onDelete} aria-label="Usuń zlecenie">
  <TrashIcon />
</Button>

<DropdownMenuTrigger aria-label="Więcej opcji">
  <DotsVerticalIcon />
</DropdownMenuTrigger>
```

**6.3. Specific examples per file:**

**DeliveriesListView.tsx:**
```tsx
// Line ~140
<DropdownMenuTrigger asChild aria-label="Opcje dostawy">
  <Button variant="ghost" size="sm">
    <MoreVertical className="h-4 w-4" />
  </Button>
</DropdownMenuTrigger>
```

**sidebar.tsx:**
```tsx
// Line ~165
<Button
  variant="ghost"
  size="sm"
  onClick={toggleSection}
  aria-label={isOpen ? "Zwiń sekcję" : "Rozwiń sekcję"}
  aria-expanded={isOpen}
>
  <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} />
</Button>
```

**OrderDetailModal.tsx:**
```tsx
// Close button
<DialogClose asChild>
  <Button variant="ghost" size="sm" aria-label="Zamknij modal">
    <X className="h-4 w-4" />
  </Button>
</DialogClose>
```

**6.4. Test z screen readerem:**

Install NVDA (Windows) lub VoiceOver (Mac):
```bash
# Windows - download NVDA
https://www.nvaccess.org/download/

# Mac - enable VoiceOver
Cmd + F5
```

Test checklist:
- [ ] Navigate do strony z Tab
- [ ] Focus na button z ikoną
- [ ] Screen reader czyta aria-label (nie tylko "button")
- [ ] Test DropdownMenu triggers
- [ ] Test dialog close buttons

**DONE criteria:**
- [ ] Top 20 screens - all icon buttons have aria-label
- [ ] DropdownMenu triggers labeled
- [ ] Dialog close buttons labeled
- [ ] Collapse/expand buttons labeled + aria-expanded
- [ ] Screen reader test passed (NVDA/VoiceOver)
- [ ] Commit: `feat: add aria-labels to icon buttons for screen reader support`

---

## TASK 7: Import Error Reporting (1 dzień) - **BEZPOŚREDNIA IMPLEMENTACJA**

### Dlaczego NIE plan mode?

❌ Straightforward feature - return errors array
❌ Backend pattern jasny (extend return type)
❌ Frontend pattern jasny (show errors + download)

### Co zrobić:

**7.1. Backend - extend return types:**

**csv-parser.ts:**
```typescript
// Add error type
export interface ParseError {
  row: number;
  field?: string;
  reason: string;
  rawData: any;
}

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
}

// Update parseOrdersFromCSV
export function parseOrdersFromCSV(fileContent: string): ParseResult<Order> {
  const errors: ParseError[] = [];
  const orders: Order[] = [];

  // ... parsing logic

  // WHEN ERROR:
  if (!profile) {
    errors.push({
      row: i,
      field: 'profile',
      reason: `Profil ${profileNumber} nie znaleziony w systemie`,
      rawData: row
    });
    continue;  // skip row
  }

  if (!color) {
    errors.push({
      row: i,
      field: 'color',
      reason: `Kolor ${colorCode} nie znaleziony w systemie`,
      rawData: row
    });
    continue;
  }

  // If valid - add to orders
  orders.push(validatedOrder);

  return {
    data: orders,
    errors,
    summary: {
      total: rows.length,
      success: orders.length,
      failed: errors.length,
      skipped: 0
    }
  };
}
```

**importService.ts:**
```typescript
// Update preview method
async preview(file: File): Promise<ImportPreviewResult> {
  const parseResult = parseOrdersFromCSV(fileContent);

  return {
    orders: parseResult.data,
    errors: parseResult.errors,
    summary: parseResult.summary,
    conflicts: detectConflicts(parseResult.data)
  };
}
```

**importHandler.ts:**
```typescript
// Return errors in response
return reply.status(200).send({
  success: true,
  data: {
    imported: result.data.length,
    failed: result.errors.length,
    errors: result.errors  // include errors
  }
});
```

**7.2. Frontend - show errors:**

**ImportPreviewCard.tsx:**
```tsx
{preview.summary.failed > 0 && (
  <Alert variant="warning" className="mt-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Błędy importu</AlertTitle>
    <AlertDescription>
      <p>{preview.summary.failed} wierszy nie zostało zaimportowanych:</p>
      <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
        {preview.errors.slice(0, 10).map((err, i) => (
          <div key={i} className="text-sm">
            Wiersz {err.row}: {err.reason}
          </div>
        ))}
        {preview.errors.length > 10 && (
          <p className="text-sm italic">... i {preview.errors.length - 10} więcej</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={downloadFailedRows}
      >
        <Download className="h-4 w-4 mr-2" />
        Pobierz błędne wiersze (CSV)
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**7.3. Download failed rows as CSV:**

```tsx
function downloadFailedRows() {
  const csvHeader = 'Wiersz,Pole,Błąd,Dane\n';
  const csvRows = preview.errors.map(err =>
    `${err.row},"${err.field || 'N/A'}","${err.reason}","${JSON.stringify(err.rawData).replace(/"/g, '""')}"`
  ).join('\n');

  const csv = csvHeader + csvRows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `import_errors_${new Date().toISOString()}.csv`;
  link.click();
}
```

**DONE criteria:**
- [ ] Backend returns errors array
- [ ] Frontend shows error count and list
- [ ] Download failed rows as CSV works
- [ ] Test with intentionally bad CSV (missing profile, wrong color)
- [ ] Test happy path (0 errors)
- [ ] Commit: `feat: add error reporting for CSV imports`

---

## TASK 8: Critical Path Tests (2 dni) - **UŻYJ PLAN MODE**

### Dlaczego plan mode?

✅ **Test strategy decisions:**
- Unit vs Integration vs E2E mix?
- Mock strategy (Prisma, external services?)
- Test data fixtures approach?
- CI/CD integration?

✅ **Coverage priorities:**
- Which flows są najbardziej krytyczne?
- Depth vs breadth (100% coverage jednego flow vs 50% wielu?)

✅ **Tooling choices:**
- Vitest setup (już jest)
- Playwright dla E2E?
- Test database strategy?

### Plan Mode Prompt:

```
TASK: Napisz testy dla critical paths aby prevent regressions.

CONTEXT:
- Backend: 32 testy (ale nie dla critical paths!)
- Frontend: 0 testów
- Brak testów dla: importService, deliveryService, orderService transactions

CRITICAL PATHS (priorytet):
1. Import flow: upload → parse → validate → save
2. Order status transitions: new → in_progress → completed
3. Delivery creation: create → add orders → optimize pallets
4. Warehouse operations: update stock → check shortage

CONSTRAINTS:
- Czas: 2 dni (nie możemy 100% coverage)
- Focus: prevent najgorszych regressions
- Existing setup: Vitest już skonfigurowany

ANALYZE:
- Które flows mają największe ryzyko?
- Które są używane najczęściej?
- Które mają najwięcej side-effects?

DELIVER PLAN:
- Priority ranking (co testować first)
- Test types per flow (unit/integration/e2e)
- Mock strategy
- Test data fixtures approach
- File structure
- Estimated coverage %
```

### Expected Output:

Plan z ranking:
```
Priority 1 (Day 1): importService
- Unit: parseOrdersFromCSV (happy path, missing profile, wrong color)
- Integration: full import flow with test DB
- Fixtures: sample CSVs (valid, invalid, edge cases)

Priority 2 (Day 1): deliveryService
- Unit: create delivery
- Integration: add orders to delivery
- Test transactions rollback

Priority 3 (Day 2): orderService
- Unit: status transitions
- Integration: complete order flow
- Edge case: invalid status transition

Priority 4 (Day 2): warehouseService (if time)
- Unit: calculate shortage
- Integration: update stock
```

### Implementation przykład (po zatwierdzeniu planu):

**importService.test.ts:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { parseOrdersFromCSV } from './parsers/csv-parser';

describe('CSV Import', () => {
  describe('parseOrdersFromCSV', () => {
    it('should parse valid CSV correctly', () => {
      const csv = `orderNumber,client,profile,color
52335,ACME,123,RAL9016
52336,TEST,456,RAL7016`;

      const result = parseOrdersFromCSV(csv);

      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.success).toBe(2);
    });

    it('should report error for missing profile', () => {
      const csv = `orderNumber,client,profile,color
52335,ACME,INVALID,RAL9016`;

      const result = parseOrdersFromCSV(csv);

      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Profil INVALID nie znaleziony');
    });

    it('should handle empty rows', () => {
      const csv = `orderNumber,client,profile,color
52335,ACME,123,RAL9016

52336,TEST,456,RAL7016`;

      const result = parseOrdersFromCSV(csv);

      expect(result.data).toHaveLength(2);
      expect(result.summary.skipped).toBe(1);
    });
  });
});
```

**DONE criteria:**
- [ ] Plan mode analysis approved
- [ ] Priority 1 tests (importService) written
- [ ] Priority 2 tests (deliveryService) written
- [ ] Priority 3 tests (orderService) written
- [ ] All tests pass
- [ ] Coverage report generated
- [ ] CI/CD integration (optional but recommended)
- [ ] Commit: `test: add critical path tests for import, delivery, and order services`

---

## 📦 FINALIZACJA FAZY 2

Po wykonaniu wszystkich 4 tasków:

**1. Verification:**
```bash
# Tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

**2. Manual testing:**
- [ ] Mobile table view works (test na prawdziwym telefonie!)
- [ ] Screen reader reads aria-labels (test z NVDA)
- [ ] Import shows errors (test z bad CSV)
- [ ] Tests pass and provide confidence

**3. Metrics:**
```
Before Faza 2:
- Mobile usability: 0/10
- Accessibility score: 40/100
- Import safety: cichy fail
- Test coverage: ~15%

After Faza 2:
- Mobile usability: 8/10 (zestawienia usable!)
- Accessibility score: 65/100 (icon buttons + screen reader)
- Import safety: user sees errors + download
- Test coverage: ~35% (critical paths covered)
```

**4. Final commit:**
```bash
git commit -m "feat(phase2): High priority UX and testing improvements

- Add mobile-friendly card view for orders summary
- Add aria-labels to icon buttons for accessibility
- Add error reporting for CSV imports with download
- Add critical path tests (import, delivery, order services)

Improves mobile usability, accessibility, and prevents regressions.
Test coverage increased from 15% to 35%.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🚨 WAŻNE DECYZJE

### Kiedy użyć Plan Mode w Fazie 2:

✅ **Task 5 (Mobile)** - multiple approaches, architectural decisions
✅ **Task 8 (Tests)** - strategy decisions, priority ranking

### Kiedy BEZPOŚREDNIA implementacja:

❌ **Task 6 (Aria)** - mechaniczne dodanie labels
❌ **Task 7 (Import errors)** - straightforward feature extension

### Jeśli utkniesz:

1. **Task 5 (Mobile)** - może być trudny performance-wise
   - Jeśli virtualization jest problematyczna → skip i zrób pagination
   - Jeśli TanStack Table nie cooperates → prostszy approach (cards only)

2. **Task 8 (Tests)** - może być overwhelming
   - Focus TYLKO na Priority 1 + 2
   - Priority 3-4 można skip jeśli brak czasu

**Ask user jeśli:**
- Task trwa >2x estimated time
- Pojawiają się unexpected blockers
- Need architectural decision (nie zgaduj!)

---

**READY FOR FAZA 2?**

Po ukończeniu Fazy 1, potwierdź gotowość i rozpocznij od Task 5 (plan mode).
