# SZCZEGÓŁOWY PLAN: P0 i P1

**Data:** 2026-01-09
**Status:** DO REALIZACJI

---

# P0: NAPRAW TERAZ (< 1 dzień pracy)

## P0-1: Fix money calculation w dashboard

### Problem
```typescript
// dashboard-service.ts:223-224
totalValuePln += parseFloat(order.valuePln?.toString() || '0');
// 10000 groszy → wyświetla jako 10000 PLN (powinno: 100 PLN)
```

### Scope zmian

**Plik 1:** `apps/api/src/services/dashboard-service.ts`
- Linie ~223-224: zamień `parseFloat` na `groszeToPln`
- Import `groszeToPln` z `../utils/money.js`

**Plik 2:** `apps/api/src/services/monthlyReportExportService.ts`
- 14 miejsc używa `toFixed(2)` na groszach
- Każde wystąpienie `valuePln.toFixed(2)` → `groszeToPln(valuePln).toFixed(2)`

**Plik 3:** `apps/api/src/services/monthlyReportService.ts`
- ~7 miejsc z `parseFloat` / `toFixed`

### Konkretne kroki

```bash
# 1. Znajdź wszystkie problematyczne miejsca
grep -rn "parseFloat.*valuePln\|valuePln.*toFixed\|parseFloat.*valueEur\|valueEur.*toFixed" apps/api/src/

# 2. Dla każdego pliku:
```

**dashboard-service.ts:**
```typescript
// PRZED
totalValuePln += parseFloat(order.valuePln?.toString() || '0');
totalValueEur += parseFloat(order.valueEur?.toString() || '0');

// PO
import { groszeToPln, centyToEur, type Grosze, type Centy } from '../utils/money.js';

totalValuePln += order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
totalValueEur += order.valueEur ? centyToEur(order.valueEur as Centy) : 0;
```

**monthlyReportExportService.ts:**
```typescript
// PRZED (14 miejsc)
valuePln: item.valuePln ? item.valuePln.toFixed(2) : '-',

// PO
import { groszeToPln, type Grosze } from '../utils/money.js';

valuePln: item.valuePln ? groszeToPln(item.valuePln as Grosze).toFixed(2) : '-',
```

### Testy weryfikacyjne

```typescript
// Dodaj do testów
describe('Money calculations', () => {
  it('dashboard should return PLN not grosze', async () => {
    // Setup: order with valuePln = 10000 (grosze) = 100 PLN
    const response = await api.get('/api/dashboard');
    expect(response.data.totalValuePln).toBe(100); // nie 10000!
  });

  it('monthly report should format correctly', async () => {
    // order 10000 grosze = "100.00" w raporcie
    const report = await service.generateReport(month);
    expect(report.items[0].valuePln).toBe('100.00');
  });
});
```

### Definition of Done

- [ ] Import `groszeToPln` w dashboard-service.ts
- [ ] Zamienione wszystkie `parseFloat(valuePln)` → `groszeToPln(valuePln)`
- [ ] Zamienione wszystkie `valuePln.toFixed` → `groszeToPln(valuePln).toFixed`
- [ ] Test: GET /api/dashboard zwraca wartości /100
- [ ] Test: Export miesięczny ma prawidłowe kwoty
- [ ] Porównanie z poprzednim raportem - wartości /100

### Ryzyka

| Ryzyko | Mitygacja |
|--------|-----------|
| Inne miejsca też używają parseFloat | `grep -r` przed merge |
| Frontend oczekuje groszy | Sprawdzić typy w types/dashboard.ts |
| Cache zwraca stare dane | Invalidate cache po deployu |

---

## P0-2: Dodaj delivery-status-machine.ts

### Problem

Order ma `order-status-machine.ts` z walidacją przejść:
```typescript
VALID_TRANSITIONS = {
  'new': ['in_progress', 'archived'],
  'in_progress': ['completed', 'archived'],
  'completed': ['archived'],
  'archived': []
}
```

Delivery **nie ma** takiej walidacji. Można zmienić status z `planned` na `delivered` jednym kliknięciem.

### Scope zmian

**Nowy plik:** `apps/api/src/utils/delivery-status-machine.ts`

**Modyfikacja:** `apps/api/src/services/delivery/DeliveryService.ts`
- Metoda `updateDelivery()` - dodać walidację przed zmianą statusu

**Modyfikacja:** `apps/api/src/validators/delivery.ts`
- Synchronizacja enum statusów z dokumentacją

### Implementacja

**Nowy plik: delivery-status-machine.ts**
```typescript
// apps/api/src/utils/delivery-status-machine.ts

import { ValidationError } from './errors.js';
import { logger } from './logger.js';

export const DELIVERY_STATUSES = {
  PLANNED: 'planned',
  LOADING: 'loading',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUSES[keyof typeof DELIVERY_STATUSES];

/**
 * Dozwolone przejścia między statusami dostawy
 *
 * planned → loading → shipped → delivered
 *    ↓         ↓
 * (można cofnąć do planned jeśli nie shipped)
 */
export const VALID_DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  'planned': ['loading'],
  'loading': ['planned', 'shipped'],  // można cofnąć do planned
  'shipped': ['delivered'],            // NIE można cofnąć po wysłaniu
  'delivered': [],                     // terminal state
};

/**
 * Sprawdza czy przejście między statusami jest dozwolone
 */
export function validateDeliveryStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  // Brak zmiany = OK
  if (currentStatus === newStatus) {
    return;
  }

  // Sprawdź czy status źródłowy jest znany
  if (!(currentStatus in VALID_DELIVERY_TRANSITIONS)) {
    throw new ValidationError(
      `Nieznany status dostawy: "${currentStatus}"`
    );
  }

  // Sprawdź czy status docelowy jest znany
  if (!(newStatus in VALID_DELIVERY_TRANSITIONS)) {
    throw new ValidationError(
      `Nieznany status docelowy: "${newStatus}"`
    );
  }

  // Sprawdź czy przejście jest dozwolone
  const allowedTransitions = VALID_DELIVERY_TRANSITIONS[currentStatus as DeliveryStatus];

  if (!allowedTransitions.includes(newStatus as DeliveryStatus)) {
    logger.warn('Invalid delivery status transition attempted', {
      currentStatus,
      newStatus,
      allowedTransitions,
    });

    throw new ValidationError(
      `Nie można zmienić statusu dostawy z "${currentStatus}" na "${newStatus}". ` +
      `Dozwolone przejścia: ${allowedTransitions.join(', ') || 'brak (status końcowy)'}`
    );
  }

  logger.info('Delivery status transition validated', {
    from: currentStatus,
    to: newStatus,
  });
}

/**
 * Sprawdza czy wszystkie zlecenia w dostawie mają odpowiedni status
 * przed zmianą statusu dostawy
 */
export function validateOrdersForDeliveryStatus(
  newDeliveryStatus: DeliveryStatus,
  orderStatuses: string[]
): void {
  // Przy shipped/delivered - wszystkie zlecenia powinny być completed lub in_progress
  if (newDeliveryStatus === 'shipped' || newDeliveryStatus === 'delivered') {
    const invalidOrders = orderStatuses.filter(s => s === 'new' || s === 'archived');

    if (invalidOrders.length > 0) {
      throw new ValidationError(
        `Nie można wysłać dostawy. ${invalidOrders.length} zleceń ma status "new" lub "archived". ` +
        `Wszystkie zlecenia muszą mieć status "in_progress" lub "completed".`
      );
    }
  }
}

/**
 * Czy status jest terminalny (nie można zmienić)
 */
export function isTerminalDeliveryStatus(status: string): boolean {
  return status === DELIVERY_STATUSES.DELIVERED;
}

/**
 * Czy można cofnąć dostawę do poprzedniego statusu
 */
export function canRevertDeliveryStatus(status: string): boolean {
  return status === DELIVERY_STATUSES.LOADING;
}
```

**Modyfikacja: DeliveryService.ts**
```typescript
// apps/api/src/services/delivery/DeliveryService.ts

import {
  validateDeliveryStatusTransition,
  validateOrdersForDeliveryStatus,
  type DeliveryStatus
} from '../../utils/delivery-status-machine.js';

class DeliveryService {
  async updateDelivery(id: number, data: UpdateDeliveryDto) {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundError('Dostawa nie znaleziona');
    }

    // Waliduj zmianę statusu jeśli jest w request
    if (data.status && data.status !== current.status) {
      // 1. Waliduj przejście statusu
      validateDeliveryStatusTransition(current.status, data.status);

      // 2. Waliduj statusy zleceń przed shipped/delivered
      if (data.status === 'shipped' || data.status === 'delivered') {
        const orders = await this.repository.getDeliveryOrders(id);
        const orderStatuses = orders.map(o => o.order.status);
        validateOrdersForDeliveryStatus(data.status as DeliveryStatus, orderStatuses);
      }
    }

    // Proceed with update
    return this.repository.update(id, data);
  }
}
```

**Synchronizacja: validators/delivery.ts**
```typescript
// Zmień z:
status: z.enum(['pending', 'completed', 'cancelled']).optional(),

// Na:
status: z.enum(['planned', 'loading', 'shipped', 'delivered']).optional(),
```

### Testy

```typescript
// delivery-status-machine.test.ts
describe('DeliveryStatusMachine', () => {
  describe('validateDeliveryStatusTransition', () => {
    it('should allow planned → loading', () => {
      expect(() => validateDeliveryStatusTransition('planned', 'loading')).not.toThrow();
    });

    it('should reject planned → shipped (skip loading)', () => {
      expect(() => validateDeliveryStatusTransition('planned', 'shipped'))
        .toThrow(/Nie można zmienić statusu/);
    });

    it('should reject shipped → planned (no revert after ship)', () => {
      expect(() => validateDeliveryStatusTransition('shipped', 'planned'))
        .toThrow(/Nie można zmienić statusu/);
    });

    it('should allow loading → planned (revert before ship)', () => {
      expect(() => validateDeliveryStatusTransition('loading', 'planned')).not.toThrow();
    });

    it('should reject any transition from delivered', () => {
      expect(() => validateDeliveryStatusTransition('delivered', 'planned'))
        .toThrow(/status końcowy/);
    });
  });

  describe('validateOrdersForDeliveryStatus', () => {
    it('should reject shipped with new orders', () => {
      expect(() => validateOrdersForDeliveryStatus('shipped', ['new', 'completed']))
        .toThrow(/status "new" lub "archived"/);
    });

    it('should allow shipped with completed orders', () => {
      expect(() => validateOrdersForDeliveryStatus('shipped', ['completed', 'in_progress']))
        .not.toThrow();
    });
  });
});
```

### Definition of Done

- [ ] Nowy plik `delivery-status-machine.ts` z VALID_TRANSITIONS
- [ ] `validateDeliveryStatusTransition()` zaimplementowane
- [ ] `validateOrdersForDeliveryStatus()` zaimplementowane
- [ ] DeliveryService.updateDelivery() używa walidacji
- [ ] validators/delivery.ts zsynchronizowany z dokumentacją
- [ ] Testy jednostkowe dla state machine
- [ ] Test integracyjny: API odrzuca invalid transition

---

## P0-3: Import - force review dla partial success

### Problem

```typescript
// Aktualny flow:
// 1. Parse CSV → 500 wierszy
// 2. 350 OK, 150 pominiętych (console.warn)
// 3. Return { success: true }
// 4. Frontend: "Import zakończony pomyślnie!"
// 5. Użytkownik nie wie że 150 zleceń zniknęło
```

### Scope zmian

**Backend:**
- `apps/api/src/services/import/importValidationService.ts` - zbieranie błędów
- `apps/api/src/services/importService.ts` - zwracanie detailed result
- `apps/api/src/handlers/importHandler.ts` - response format

**Frontend:**
- `apps/web/src/app/importy/components/ImportResultModal.tsx` - nowy komponent
- `apps/web/src/app/importy/hooks/useImportMutations.ts` - obsługa partial

### Implementacja

**Nowy typ: ImportResult**
```typescript
// apps/api/src/types/import.ts

export interface ImportError {
  row: number;
  field: string;
  value: string;
  reason: string;
  originalData?: Record<string, unknown>;
}

export interface ImportResult {
  status: 'success' | 'partial' | 'failure';
  summary: {
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  };
  errors: ImportError[];
  warnings: string[];
  // ID importu do pobrania raportu błędów
  importId?: string;
}
```

**Modyfikacja: csv-parser.ts**
```typescript
// apps/api/src/services/parsers/csv-parser.ts

export class CsvParser {
  async parseUzyteBele(content: string): Promise<{
    orders: ParsedOrder[];
    errors: ImportError[];
  }> {
    const rows = this.splitRows(content);
    const orders: ParsedOrder[] = [];
    const errors: ImportError[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // +2 bo header + 0-indexed

      // Walidacja koloru
      const color = await this.findColor(row.colorCode);
      if (!color) {
        errors.push({
          row: rowNumber,
          field: 'colorCode',
          value: row.colorCode,
          reason: `Kolor "${row.colorCode}" nie istnieje w bazie`,
          originalData: row,
        });
        continue; // Skip ale zapisz błąd
      }

      // Walidacja profilu
      const profile = await this.findProfile(row.profileNumber);
      if (!profile) {
        errors.push({
          row: rowNumber,
          field: 'profileNumber',
          value: row.profileNumber,
          reason: `Profil "${row.profileNumber}" nie istnieje w bazie`,
          originalData: row,
        });
        continue;
      }

      // Walidacja numeryczna
      if (isNaN(row.beamsCount) || row.beamsCount <= 0) {
        errors.push({
          row: rowNumber,
          field: 'beamsCount',
          value: String(row.beamsCount),
          reason: `Nieprawidłowa liczba belek: "${row.beamsCount}"`,
          originalData: row,
        });
        continue;
      }

      // OK - dodaj do listy
      orders.push({
        ...row,
        colorId: color.id,
        profileId: profile.id,
      });
    }

    return { orders, errors };
  }
}
```

**Modyfikacja: importService.ts**
```typescript
// apps/api/src/services/importService.ts

export class ImportService {
  async importFromCsv(content: string, options: ImportOptions): Promise<ImportResult> {
    const { orders, errors } = await this.csvParser.parseUzyteBele(content);

    // Jeśli wszystko failed - nie importuj
    if (orders.length === 0 && errors.length > 0) {
      return {
        status: 'failure',
        summary: {
          total: errors.length,
          imported: 0,
          skipped: 0,
          failed: errors.length,
        },
        errors,
        warnings: [],
      };
    }

    // Importuj co się udało
    const importedCount = await this.saveOrders(orders);

    // Określ status
    const status = errors.length === 0 ? 'success' : 'partial';

    // Zapisz błędy do retrieval później
    let importId: string | undefined;
    if (errors.length > 0) {
      importId = await this.saveErrorReport(errors);
    }

    return {
      status,
      summary: {
        total: orders.length + errors.length,
        imported: importedCount,
        skipped: 0,
        failed: errors.length,
      },
      errors: errors.slice(0, 10), // Pierwsze 10 w response
      warnings: [],
      importId, // Do pobrania pełnego raportu
    };
  }

  private async saveErrorReport(errors: ImportError[]): Promise<string> {
    const id = crypto.randomUUID();
    const report = {
      id,
      createdAt: new Date(),
      errors,
    };

    // Zapisz do pliku lub cache (expire po 24h)
    await this.cache.set(`import-errors:${id}`, report, 86400);

    return id;
  }
}
```

**Modyfikacja: importHandler.ts**
```typescript
// apps/api/src/handlers/importHandler.ts

async upload(request: FastifyRequest, reply: FastifyReply) {
  const result = await this.importService.importFromCsv(content, options);

  // Status HTTP zależy od wyniku
  const httpStatus = result.status === 'failure' ? 400 : 200;

  return reply.status(httpStatus).send(result);
}
```

**Nowy endpoint: pobierz raport błędów**
```typescript
// apps/api/src/routes/imports.ts

fastify.get('/imports/:importId/errors', async (request, reply) => {
  const { importId } = request.params as { importId: string };
  const report = await importService.getErrorReport(importId);

  if (!report) {
    return reply.status(404).send({ error: 'Raport nie znaleziony lub wygasł' });
  }

  // Zwróć jako CSV do pobrania
  const csv = convertErrorsToCsv(report.errors);

  return reply
    .header('Content-Type', 'text/csv')
    .header('Content-Disposition', `attachment; filename="import-errors-${importId}.csv"`)
    .send(csv);
});
```

**Frontend: ImportResultModal.tsx**
```tsx
// apps/web/src/app/importy/components/ImportResultModal.tsx

interface ImportResultModalProps {
  result: ImportResult;
  onClose: () => void;
  onDownloadErrors?: () => void;
}

export function ImportResultModal({ result, onClose, onDownloadErrors }: ImportResultModalProps) {
  const isPartial = result.status === 'partial';
  const isFailed = result.status === 'failure';

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isFailed ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : isPartial ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {isFailed ? 'Import nieudany' : isPartial ? 'Import częściowy' : 'Import zakończony'}
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Podsumowanie */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Całkowita liczba wierszy:</div>
                <div className="font-medium">{result.summary.total}</div>

                <div>Zaimportowano:</div>
                <div className="font-medium text-green-600">{result.summary.imported}</div>

                {result.summary.failed > 0 && (
                  <>
                    <div>Pominięto (błędy):</div>
                    <div className="font-medium text-red-600">{result.summary.failed}</div>
                  </>
                )}
              </div>

              {/* Lista błędów (pierwsze 5) */}
              {result.errors.length > 0 && (
                <div className="border rounded-md p-3 bg-red-50">
                  <div className="font-medium text-red-800 mb-2">
                    Przykładowe błędy:
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>
                        Wiersz {error.row}: {error.reason}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="italic">
                        ...i {result.errors.length - 5} więcej
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Ostrzeżenie dla partial */}
              {isPartial && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Uwaga:</strong> Nie wszystkie wiersze zostały zaimportowane.
                    Pobierz raport błędów, popraw plik CSV i zaimportuj ponownie
                    pominięte wiersze.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {result.importId && result.summary.failed > 0 && (
            <Button variant="outline" onClick={onDownloadErrors}>
              <Download className="h-4 w-4 mr-2" />
              Pobierz raport błędów
            </Button>
          )}
          <AlertDialogAction onClick={onClose}>
            {isPartial ? 'Rozumiem, zamknij' : 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Definition of Done

- [ ] Typ `ImportResult` z status: success/partial/failure
- [ ] csv-parser zbiera errors zamiast console.warn
- [ ] importService zwraca detailed result
- [ ] Endpoint GET /imports/:id/errors do pobrania CSV
- [ ] Frontend modal różnicuje success/partial/failure
- [ ] Przycisk "Pobierz raport błędów" działa
- [ ] Test: import z błędami zwraca status=partial
- [ ] Test: UI pokazuje liczbę pominiętych wierszy

---

# P1: NAPRAW W TYM TYGODNIU (< 5 dni)

## P1-1: Soft delete cascade dla Delivery

### Problem

```
Delivery.deletedAt = '2026-01-09'
DeliveryOrder.deliveryId = 123  ← nadal istnieje!

→ Zlecenia pokazują się jako "przypisane" do usuniętej dostawy
→ Nie można ich dodać do nowej dostawy
```

### Rozwiązanie

**Opcja A: Kaskadowy soft delete** (rekomendowane)
- Przy soft delete Delivery → ustaw deletedAt na powiązanych DeliveryOrder
- Dodaj pole `deletedAt` do DeliveryOrder

**Opcja B: Hard delete DeliveryOrder przy soft delete Delivery**
- Usuń DeliveryOrder gdy Delivery jest soft-deleted
- Prostsze ale tracimy historię

### Implementacja (Opcja A)

**Migration: add deletedAt to DeliveryOrder**
```prisma
model DeliveryOrder {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt])
}
```

**Modyfikacja: DeliveryRepository.ts**
```typescript
async softDelete(id: number): Promise<void> {
  const now = new Date();

  await this.prisma.$transaction([
    // Soft delete delivery
    this.prisma.delivery.update({
      where: { id },
      data: { deletedAt: now },
    }),
    // Cascade to DeliveryOrder
    this.prisma.deliveryOrder.updateMany({
      where: { deliveryId: id },
      data: { deletedAt: now },
    }),
    // Cascade to PalletOptimization (jeśli istnieje)
    this.prisma.palletOptimization.updateMany({
      where: { deliveryId: id },
      data: { deletedAt: now }, // dodaj pole do schema
    }),
  ]);
}
```

**Modyfikacja: wszystkie query**
```typescript
// Wszędzie gdzie findMany na DeliveryOrder
findMany({
  where: {
    deletedAt: null, // dodaj ten warunek
    // ... other conditions
  }
})
```

### Definition of Done

- [ ] Migration: add deletedAt to DeliveryOrder
- [ ] DeliveryRepository.softDelete() kaskaduje
- [ ] Wszystkie query na DeliveryOrder filtrują deletedAt
- [ ] Test: soft delete Delivery → DeliveryOrder też deleted
- [ ] Test: zlecenia z soft-deleted delivery nie pokazują się jako "przypisane"

---

## P1-2: checkVariantInDelivery() wymuszone wszędzie

### Problem

`checkVariantInDelivery()` istnieje ale jest wywoływana tylko przy imporcie.
UI pozwala dodać wariant do dostawy bez sprawdzenia.

### WAŻNE: Dwa typy wariantów (wymaganie biznesowe)

Wariant z literką (np. 52335-a) może oznaczać dwie różne rzeczy:
1. **Korekta** - 52335-a zastępuje oryginalne zlecenie 52335 (np. poprawione wymiary)
2. **Dodatkowy plik** - 52335-a to osobna część tego samego zamówienia klienta (np. druga partia okien)

**Użytkownik MUSI mieć możliwość wyboru przy imporcie/dodawaniu:**
- "To jest korekta poprzedniego zlecenia" → blokuj jeśli oryginał w innej dostawie
- "To jest dodatkowy plik do tego samego zamówienia" → pozwól na różne dostawy

### Rozwiązanie

1. Dodać pole `variantType` do modelu Order (enum: 'correction' | 'additional_file' | null)
2. Przy imporcie/konflikcie wariantu - pytaj użytkownika o typ
3. Walidacja w `DeliveryService.addOrderToDelivery()` tylko dla `variantType: 'correction'`

### Implementacja

**Schema change:**
```prisma
model Order {
  // ... existing fields

  // Typ wariantu: 'correction' = zastępuje oryginał, 'additional_file' = osobny plik
  variantType String? @map("variant_type") // 'correction' | 'additional_file' | null
}
```

**Frontend: Dodaj wybór przy konflikcie wariantu**
```tsx
// apps/web/src/features/orders/components/VariantTypeDialog.tsx

interface VariantTypeDialogProps {
  orderNumber: string;
  baseNumber: string;
  existingVariants: OrderVariant[];
  onSelect: (type: 'correction' | 'additional_file') => void;
  onCancel: () => void;
}

export function VariantTypeDialog({
  orderNumber,
  baseNumber,
  existingVariants,
  onSelect,
  onCancel
}: VariantTypeDialogProps) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Wykryto wariant zlecenia</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Zlecenie <strong>{orderNumber}</strong> jest wariantem
                zlecenia bazowego <strong>{baseNumber}</strong>.
              </p>

              {existingVariants.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <div className="font-medium mb-1">Istniejące warianty:</div>
                  <ul className="list-disc list-inside">
                    {existingVariants.map(v => (
                      <li key={v.orderNumber}>
                        {v.orderNumber}
                        {v.deliveryAssignment && (
                          <span className="text-gray-500">
                            {' '}(w dostawie #{v.deliveryAssignment.deliveryId})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="font-medium">Co to jest za wariant?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onSelect('correction')}
          >
            <div className="text-left">
              <div className="font-medium">Korekta poprzedniego zlecenia</div>
              <div className="text-sm text-gray-500">
                Poprawione dane (wymiary, kolory, ilości).
                Zlecenie i jego korekty muszą być w tej samej dostawie.
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onSelect('additional_file')}
          >
            <div className="text-left">
              <div className="font-medium">Dodatkowy plik do zamówienia</div>
              <div className="text-sm text-gray-500">
                Druga partia okien dla tego samego klienta.
                Mogą być w różnych dostawach.
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Anuluj
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Backend: DeliveryService z walidacją typu wariantu**
```typescript
// apps/api/src/services/delivery/DeliveryService.ts

import { OrderVariantService } from '../orderVariantService.js';

class DeliveryService {
  private variantService: OrderVariantService;

  constructor(prisma: PrismaClient) {
    this.variantService = new OrderVariantService(prisma);
  }

  async addOrderToDelivery(deliveryId: number, orderId: number): Promise<void> {
    // 1. Pobierz zlecenie
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, variantType: true },
    });

    if (!order) {
      throw new NotFoundError('Zlecenie nie znalezione');
    }

    // 2. Parse order number → base number
    const { base, suffix } = this.csvParser.parseOrderNumber(order.orderNumber);

    // 3. Jeśli to wariant (ma suffix) i jest typu 'correction' - sprawdź konflikty
    if (suffix && order.variantType === 'correction') {
      const conflict = await this.variantService.checkVariantInDelivery(base);

      if (conflict.hasConflict && conflict.conflictingOrder) {
        const conflicting = conflict.conflictingOrder;

        // Sprawdź czy to inna dostawa
        if (conflicting.deliveryAssignment?.deliveryId !== deliveryId) {
          throw new ConflictError(
            `Wariant "${conflicting.orderNumber}" (oznaczony jako korekta) ` +
            `jest już przypisany do dostawy #${conflicting.deliveryAssignment?.deliveryId}. ` +
            `Korekty muszą być w tej samej dostawie co oryginał.\n\n` +
            `Jeśli to nie jest korekta lecz dodatkowy plik, zmień typ wariantu ` +
            `w szczegółach zlecenia.`
          );
        }
      }
    }

    // 4. Jeśli variantType = 'additional_file' → pozwól na różne dostawy (brak walidacji)

    // 5. Proceed with adding
    await this.repository.addOrderToDelivery(deliveryId, orderId);
  }
}
```

**Backend: Endpoint do ustawienia typu wariantu**
```typescript
// apps/api/src/routes/orders.ts

fastify.patch('/orders/:id/variant-type', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { variantType } = request.body as { variantType: 'correction' | 'additional_file' };

  const order = await orderService.updateVariantType(parseInt(id), variantType);

  return reply.send(order);
});
```

### Definition of Done

- [ ] Migration: add variantType to Order model
- [ ] VariantTypeDialog component w frontend
- [ ] DeliveryService.addOrderToDelivery() sprawdza tylko dla variantType='correction'
- [ ] Import pokazuje dialog wyboru typu wariantu przy konflikcie
- [ ] Endpoint PATCH /orders/:id/variant-type do zmiany typu
- [ ] UI w szczegółach zlecenia do zmiany typu wariantu
- [ ] ConflictError z meaningful message i sugestią
- [ ] Test: korekta gdy base w innej dostawie → błąd
- [ ] Test: additional_file gdy base w innej dostawie → OK
- [ ] Test: zmiana typu wariantu działa

---

## P1-3: Confirmation dialogs z konsekwencjami

### Problem

Dialogi "Czy na pewno?" nie wyjaśniają co się stanie.

### Scope

1. **DeleteDeliveryDialog** - wyjaśnij że zlecenia staną się nieprzypisane
2. **FinalizeMonthModal** - wyjaśnij że nie można cofnąć
3. **ImportOverwriteDialog** - pokaż co zostanie nadpisane

### Implementacja przykład: DeleteDeliveryDialog

```tsx
// apps/web/src/features/deliveries/components/DeleteDeliveryDialog.tsx

interface DeleteDeliveryDialogProps {
  delivery: Delivery;
  ordersCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDeliveryDialog({
  delivery,
  ordersCount,
  onConfirm,
  onCancel
}: DeleteDeliveryDialogProps) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć dostawę #{delivery.deliveryNumber}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Ta operacja <strong>nie może być cofnięta</strong>.
              </p>

              {ordersCount > 0 && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{ordersCount} zleceń</strong> przypisanych do tej dostawy
                    stanie się <strong>nieprzypisanych</strong>.
                    Będziesz musiał przypisać je do innej dostawy.
                  </AlertDescription>
                </Alert>
              )}

              {delivery.optimization && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Optymalizacja palet dla tej dostawy zostanie usunięta.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <div>Data dostawy: {formatDate(delivery.deliveryDate)}</div>
                <div>Status: {delivery.status}</div>
                <div>Zleceń: {ordersCount}</div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Tak, usuń dostawę
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Definition of Done

- [ ] DeleteDeliveryDialog pokazuje konsekwencje (nieprzypisane zlecenia)
- [ ] FinalizeMonthModal wyjaśnia nieodwracalność
- [ ] ImportOverwriteDialog pokazuje co zostanie nadpisane
- [ ] Każdy dialog ma informacje kontekstowe (liczby, daty)
- [ ] Destructive buttons są czerwone

---

## P1-4: Invalidate PalletOptimization po zmianie Delivery

### Problem

Po dodaniu/usunięciu zlecenia z dostawy, stara optymalizacja palet pozostaje.
Wizualizacja pokazuje ghost windows.

### Rozwiązanie

Po każdej zmianie w DeliveryOrder → ustaw flagę `needsReoptimization` lub usuń optymalizację.

### Implementacja

```typescript
// apps/api/src/services/delivery/DeliveryService.ts

async addOrderToDelivery(deliveryId: number, orderId: number): Promise<void> {
  // ... existing logic ...

  // Invalidate optimization
  await this.invalidateOptimization(deliveryId);
}

async removeOrderFromDelivery(deliveryId: number, orderId: number): Promise<void> {
  // ... existing logic ...

  // Invalidate optimization
  await this.invalidateOptimization(deliveryId);
}

private async invalidateOptimization(deliveryId: number): Promise<void> {
  // Opcja 1: Usuń optymalizację (user musi re-run)
  await this.prisma.palletOptimization.deleteMany({
    where: { deliveryId },
  });

  // Opcja 2: Ustaw flagę (zachowaj starą jako reference)
  // await this.prisma.palletOptimization.updateMany({
  //   where: { deliveryId },
  //   data: { isStale: true },
  // });

  logger.info('Pallet optimization invalidated', { deliveryId });
}
```

**Frontend: pokazuj warning gdy brak optymalizacji**
```tsx
{!delivery.optimization && delivery.ordersCount > 0 && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Dostawa nie ma optymalizacji palet.
      <Button variant="link" onClick={handleOptimize}>
        Uruchom optymalizację
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### Definition of Done

- [ ] addOrderToDelivery() invaliduje optymalizację
- [ ] removeOrderFromDelivery() invaliduje optymalizację
- [ ] reorderDeliveryOrders() invaliduje optymalizację
- [ ] Frontend pokazuje warning gdy brak optymalizacji
- [ ] Test: dodanie zlecenia → optymalizacja usunięta

---

# KOLEJNOŚĆ REALIZACJI

## Dzień 1 (P0)

| Godzina | Task | Effort |
|---------|------|--------|
| 09:00-10:30 | P0-1: Fix money dashboard | 1.5h |
| 10:30-12:00 | P0-1: Fix money reports (14 miejsc) | 1.5h |
| 12:00-13:00 | Przerwa | - |
| 13:00-16:00 | P0-2: delivery-status-machine.ts | 3h |
| 16:00-17:00 | P0-3: Import partial - backend | 1h |

## Dzień 2 (P0 + P1)

| Godzina | Task | Effort |
|---------|------|--------|
| 09:00-12:00 | P0-3: Import partial - frontend + tests | 3h |
| 12:00-13:00 | Przerwa | - |
| 13:00-17:00 | P1-1: Soft delete cascade | 4h |

## Dzień 3 (P1)

| Godzina | Task | Effort |
|---------|------|--------|
| 09:00-12:00 | P1-2: checkVariantInDelivery wszędzie | 3h |
| 12:00-13:00 | Przerwa | - |
| 13:00-17:00 | P1-3: Confirmation dialogs | 4h |

## Dzień 4 (P1 + testy)

| Godzina | Task | Effort |
|---------|------|--------|
| 09:00-11:00 | P1-4: Invalidate PalletOptimization | 2h |
| 11:00-13:00 | Testy integracyjne wszystkich zmian | 2h |
| 13:00-14:00 | Przerwa | - |
| 14:00-17:00 | Code review + poprawki + deploy | 3h |

---

# CHECKLIST PRZED MERGE

## P0

- [ ] Dashboard pokazuje kwoty /100
- [ ] Monthly reports mają prawidłowe kwoty
- [ ] Delivery status transitions są walidowane
- [ ] Order statuses są sprawdzane przed ship
- [ ] Import partial pokazuje warning
- [ ] Można pobrać raport błędów importu

## P1

- [ ] Soft delete Delivery kaskaduje do DeliveryOrder
- [ ] Warianty nie mogą być w różnych dostawach
- [ ] Confirmation dialogs wyjaśniają konsekwencje
- [ ] Optymalizacja palet invalidowana po zmianie

## Testy

- [ ] money.test.ts - nowe testy dla dashboard
- [ ] delivery-status-machine.test.ts - pełne coverage
- [ ] import.test.ts - partial success scenarios
- [ ] delivery-cascade.test.ts - soft delete behavior

## Dokumentacja

- [ ] COMMON_MISTAKES.md zaktualizowane
- [ ] LESSONS_LEARNED.md z nowymi wpisami
- [ ] CHANGELOG.md aktualizacja

