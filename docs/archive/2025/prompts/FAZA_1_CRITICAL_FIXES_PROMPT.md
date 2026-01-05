# FAZA 1: CRITICAL FIXES - IMPLEMENTATION PROMPT

**Deadline:** 1-2 dni
**Priority:** NAJWYŻSZY - to wpływa na decyzje biznesowe
**Execution mode:** BEZPOŚREDNIA IMPLEMENTACJA (bez plan mode)

---

## ⚠️ DLACZEGO BEZ PLAN MODE?

Faza 1 to **PROSTE, MECHANICZNE FIXY** - nie wymagają planowania:
- Fix #1: Zamiana `parseFloat` → `groszeToPln` (10 linii)
- Fix #2: To samo w export service (14 miejsc)
- Fix #3: Dodanie kolumny `deletedAt` (migration + update queries)
- Fix #4: Dodanie confirmation dialogs (component reuse)

**Plan mode potrzebny jest dla:**
- Złożonych refaktorów (file-watcher, importService)
- Nowych features wymagających architektury
- Multiple valid approaches

**Faza 1 = jednoznaczne zmiany, zero decyzji architektonicznych.**

---

## 🎯 ZADANIE DLA CLAUDE

Zaimplementuj 4 critical fixes w kolejności:

### TASK 1: Fix Dashboard Money Calculation (1h)

**Problem:** Dashboard pokazuje kwoty x100 za duże (10000 groszy wyświetla jako 10000 PLN zamiast 100 PLN)

**Lokalizacja:** `apps/api/src/services/dashboard-service.ts:223-224`

**Co zrobić:**

1. **Import money utils:**
```typescript
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';
```

2. **Replace parseFloat (linię 223-224):**
```typescript
// PRZED
totalValuePln += parseFloat(order.valuePln?.toString() || '0');
totalValueEur += parseFloat(order.valueEur?.toString() || '0');

// PO
totalValuePln += order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
totalValueEur += order.valueEur ? centyToEur(order.valueEur as Centy) : 0;
```

3. **Test:**
```bash
# Sprawdź dashboard API
curl http://localhost:4000/api/dashboard/monthly-stats?month=12&year=2025

# Verify: totalValuePln powinno być /100 mniejsze niż przed fixem
```

**DONE criteria:**
- [ ] Import z money.ts dodany
- [ ] parseFloat zamienione na groszeToPln/centyToEur
- [ ] API test pokazuje prawidłowe kwoty
- [ ] Commit: `fix: dashboard money calculation using proper conversion`

---

### TASK 2: Fix Monthly Report Export (2h)

**Problem:** Excel/PDF raporty eksportują błędne kwoty (używają toFixed na groszach)

**Lokalizacja:** `apps/api/src/services/monthlyReportExportService.ts`

**Co zrobić:**

1. **Import money utils:**
```typescript
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';
```

2. **Find all toFixed usage on money fields:**
```bash
grep -n "toFixed" apps/api/src/services/monthlyReportExportService.ts
```

**14 miejsc do zamiany:**

```typescript
// PRZED (wzór)
valuePln: item.valuePln ? item.valuePln.toFixed(2) : '-',
valueEur: item.valueEur ? item.valueEur.toFixed(2) : '-',

// PO (wzór)
valuePln: item.valuePln ? groszeToPln(item.valuePln as Grosze).toFixed(2) : '-',
valueEur: item.valueEur ? centyToEur(item.valueEur as Centy).toFixed(2) : '-',
```

**Miejsca:**
- Excel export: `generateExcelReport()` - items loop
- Excel export: summary totals
- PDF export: `generatePDFReport()` - items loop
- PDF export: summary totals
- CSV export: `generateCSVReport()` - items

3. **Test:**
```bash
# Generate December 2025 report
curl -X POST http://localhost:4000/api/monthly-reports/generate \
  -H "Content-Type: application/json" \
  -d '{"month": 12, "year": 2025, "format": "excel"}'

# Download i sprawdź w Excel - kwoty powinny być /100 mniejsze
```

**DONE criteria:**
- [ ] Import z money.ts dodany
- [ ] Wszystkie 14 toFixed zamienione
- [ ] Test export (Excel + PDF + CSV)
- [ ] Compare December report przed/po fixem
- [ ] Commit: `fix: monthly report export using proper money conversion`

---

### TASK 3: Add Soft Delete to Critical Tables (4h)

**Problem:** Hard delete - dane znikają na zawsze. Brak undo.

**Modele do naprawy:** WarehouseStock, Delivery, GlassOrder

**Co zrobić:**

**3.1. Prisma Migration:**

```bash
cd apps/api
npx prisma migrate dev --name add_soft_delete_critical_tables
```

**W migration SQL:**
```sql
-- Add deletedAt column
ALTER TABLE warehouse_stock ADD COLUMN deleted_at DATETIME;
ALTER TABLE deliveries ADD COLUMN deleted_at DATETIME;
ALTER TABLE glass_orders ADD COLUMN deleted_at DATETIME;

-- Add indexes
CREATE INDEX idx_warehouse_stock_deleted_at ON warehouse_stock(deleted_at);
CREATE INDEX idx_deliveries_deleted_at ON deliveries(deleted_at);
CREATE INDEX idx_glass_orders_deleted_at ON glass_orders(deleted_at);
```

**3.2. Update Prisma Schema:**

```prisma
model WarehouseStock {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
  @@map("warehouse_stock")
}

model Delivery {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
  @@map("deliveries")
}

model GlassOrder {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
  @@map("glass_orders")
}
```

**3.3. Update Repositories:**

**WarehouseRepository.ts:**
```typescript
// DELETE operation → UPDATE deletedAt
async deleteStock(id: number): Promise<void> {
  await this.prisma.warehouseStock.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

// ALL findMany queries → filter deletedAt
async findAll(): Promise<WarehouseStock[]> {
  return this.prisma.warehouseStock.findMany({
    where: { deletedAt: null },  // exclude deleted
    // ... rest
  });
}
```

**DeliveryRepository.ts:**
```typescript
async delete(id: number): Promise<void> {
  await this.prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

async findMany(filters: any): Promise<Delivery[]> {
  return this.prisma.delivery.findMany({
    where: {
      deletedAt: null,  // exclude deleted
      ...filters
    }
  });
}
```

**GlassOrder - similar pattern.**

**3.4. Test:**
```bash
# Test soft delete
curl -X DELETE http://localhost:4000/api/warehouse/stock/123

# Verify w DB - record exists ale deletedAt SET
sqlite3 apps/api/prisma/dev.db "SELECT id, deletedAt FROM warehouse_stock WHERE id = 123"

# Verify API - nie pokazuje usuniętych
curl http://localhost:4000/api/warehouse/stock
# ID 123 NIE POWINNO być na liście
```

**DONE criteria:**
- [ ] Migration applied
- [ ] Schema updated
- [ ] 3 repositories updated (delete → update deletedAt)
- [ ] All queries filter deletedAt IS NULL
- [ ] Tests pass
- [ ] Commit: `feat: add soft delete to WarehouseStock, Delivery, GlassOrder`

---

### TASK 4: Add Confirmation Dialogs (3h)

**Problem:** Destructive actions bez potwierdzenia. User może przypadkowo skasować dane.

**Co zrobić:**

**4.1. Create DestructiveActionDialog component (jeśli nie istnieje):**

Sprawdź czy jest: `apps/web/src/components/ui/destructive-action-dialog.tsx`

Jeśli TAK - użyj istniejącego.
Jeśli NIE - stwórz:

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DestructiveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionLabel?: string;
}

export function DestructiveActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  actionLabel = 'Usuń'
}: DestructiveActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**4.2. Add to WarehouseStock delete:**

Znajdź gdzie jest delete button dla warehouse stock (prawdopodobnie w `MagazynAkrobudPageContent.tsx` lub podobnym).

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [stockToDelete, setStockToDelete] = useState<number | null>(null);

// Button delete
<Button
  onClick={() => {
    setStockToDelete(stock.id);
    setDeleteDialogOpen(true);
  }}
  variant="destructive"
  size="sm"
>
  Usuń
</Button>

// Dialog
<DestructiveActionDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={() => {
    if (stockToDelete) {
      deleteStockMutation.mutate(stockToDelete);
      setDeleteDialogOpen(false);
      setStockToDelete(null);
    }
  }}
  title="Usunąć stan magazynowy?"
  description="Ta operacja oznacza profil jako usunięty. Możesz później przywrócić dane z archiwum."
/>
```

**4.3. Add to FinalizeMonthModal:**

`apps/web/src/features/warehouse/remanent/components/FinalizeMonthModal.tsx`

Update description (line ~78):

```tsx
<AlertDialogDescription className="space-y-2">
  <p className="font-semibold text-red-600">
    UWAGA: Ta operacja jest NIEODWRACALNA!
  </p>
  <p>
    Finalizacja miesiąca:
  </p>
  <ul className="list-disc list-inside space-y-1">
    <li>Zapisze obecny stan jako historyczny</li>
    <li>Utworzy nowy okres remanentowy</li>
    <li>NIE MOŻNA cofnąć tej operacji</li>
  </ul>
  <p className="font-semibold">
    Czy na pewno chcesz sfinalizować {monthName} {year}?
  </p>
</AlertDialogDescription>
```

**4.4. Add Import Overwrite Preview:**

`apps/web/src/app/importy/components/ImportPreviewCard.tsx` lub similar.

Dodaj przed "Importuj" button:

```tsx
{preview.conflicts.length > 0 && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Konflikty danych</AlertTitle>
    <AlertDescription>
      {preview.conflicts.length} zleceń już istnieje w systemie i zostanie NADPISANYCH:
      <ul className="list-disc list-inside mt-2">
        {preview.conflicts.slice(0, 5).map(c => (
          <li key={c.orderNumber}>{c.orderNumber} - {c.client}</li>
        ))}
        {preview.conflicts.length > 5 && <li>... i {preview.conflicts.length - 5} więcej</li>}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

**DONE criteria:**
- [ ] DestructiveActionDialog component created/verified
- [ ] WarehouseStock delete has confirmation
- [ ] FinalizeMonth explains consequences
- [ ] Import shows conflicts before overwrite
- [ ] Test each dialog (user can cancel)
- [ ] Commit: `feat: add confirmation dialogs for destructive actions`

---

## 📦 FINALIZACJA FAZY 1

Po wykonaniu wszystkich 4 tasków:

1. **Run full test suite:**
```bash
pnpm test
pnpm typecheck
```

2. **Manual verification:**
- [ ] Dashboard kwoty prawidłowe
- [ ] Monthly report export prawidłowe kwoty
- [ ] Delete operations soft delete
- [ ] Confirmation dialogs działają

3. **Single commit (lub 4 separate - twój wybór):**
```bash
git add .
git commit -m "feat(critical): Faza 1 Critical Fixes

- Fix dashboard money calculation (x100 bug)
- Fix monthly report export money conversion
- Add soft delete to WarehouseStock, Delivery, GlassOrder
- Add confirmation dialogs for destructive actions

Fixes critical bugs from audit report 2026-01-02.
All monetary values now use proper grosze→PLN conversion.
Data safety improved with soft delete and confirmations.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🚨 INSTRUKCJE SPECJALNE

### Aktywuj skill przed rozpoczęciem:
```
Aktywuj skill backend-dev-guidelines
```

### NIE UŻYWAJ plan mode - bezpośrednia implementacja

**Dlaczego:**
- Zmiany są proste i jednoznaczne
- Nie ma multiple approaches
- Wszystkie fixy są mechaniczne (zamiana funkcji)
- Plan mode zajmie więcej czasu niż sama implementacja

### Podczas implementacji:

1. **Czytaj aktualny kod przed edycją** - zawsze Read przed Write/Edit
2. **Test after each task** - nie czekaj do końca
3. **Commit po każdym task** - łatwiejszy rollback jeśli coś pójdzie źle
4. **Używaj TodoWrite** - trackuj postęp dla każdego z 4 tasków

### Co NIE robić:

❌ Nie dodawaj nowych features
❌ Nie refaktoruj innych rzeczy "przy okazji"
❌ Nie zmieniaj struktury folderów
❌ Nie "ulepszaj" czegoś co działa

**SCOPE:** Tylko te 4 fixy, nic więcej.

---

## ⏱️ TIMELINE

**Oczekiwany czas:**
- Task 1: 30-60 min
- Task 2: 1-2h
- Task 3: 3-4h
- Task 4: 2-3h

**Total: 6-10h = 1-2 dni robocze**

Jeśli coś trwa dłużej - **STOP i ask user** - możliwe że jest głębszy problem.

---

## 📞 KOMUNIKACJA

Po każdym task:
1. ✅ Potwierdź completion
2. 📊 Pokaż wynik test
3. ⏭️ Przejdź do następnego

Po całej Fazie 1:
- Podsumowanie co zostało naprawione
- Link do commits
- Gotowość do Fazy 2 (jeśli user chce kontynuować)

---

**READY TO START?**

Odpowiedź "tak" aby rozpocząć Task 1, lub zadaj pytania jeśli coś jest niejasne.
