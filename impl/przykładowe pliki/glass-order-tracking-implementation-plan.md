# Plan implementacji systemu śledzenia i walidacji zamówień szyb

## Przegląd biznesowy

### Problem do rozwiązania
System musi automatycznie kontrolować:
1. **Zgodność ilości zamówionych szyb** z ilością szkleń w zleceniu
2. **Zgodność ilości dostarczonych szyb** z zamówieniem
3. **Identyfikacja niezgodności** w numerach zleceń (np. 53407 vs 53407-a)
4. **Walidacja wymiarów szyb** przy niezgodności numerów zleceń

### Format plików źródłowych

#### Format TXT - Zamówienia szyb (Pilkington)
```
Data 19.11.2025    Godzina 11:08

Numer 02499 AKR 11 GRUDZIEŃ

PILKINGTON

Symbol                                   Ilość   Szer     Wys    Poz   Zlecenie
4/16/4S3 Ug=1.1 ALU                         1     713     951     1      53479 poz.1
4/16/4S3 Ug=1.1 ALU                         1     713     951     1      53479 poz.1
4/16/4S3 Ug=1.1 ALU                         1    1025    1055     1      53479 poz.1
...
                              W.Kania
 Dostawa na  3 12 25 SRODA
```

**Pola do wyodrębnienia:**
- `orderDate` - Data zamówienia (19.11.2025 11:08)
- `glassOrderNumber` - Numer zamówienia szyb (02499 AKR 11 GRUDZIEŃ)
- `supplier` - Dostawca (PILKINGTON)
- `orderedBy` - Kto zamówił (W.Kania)
- `expectedDeliveryDate` - Data dostawy (3 12 25 ŚRODA)
- **Pozycje zamówienia:**
  - `glassType` - Symbol (4/16/4S3 Ug=1.1 ALU)
  - `quantity` - Ilość (1)
  - `widthMm` - Szerokość (713)
  - `heightMm` - Wysokość (951)
  - `position` - Pozycja (1)
  - `orderNumber` - Zlecenie (53479 poz.1)

#### Format CSV - Dostawy szyb
```csv
Numer stojaka;Numer zamówienia klienta;Numer zamówienia dostawcy;Pozycja;Szerokosc;Wysokosc;Sztuk;Zlecenie;Zespolenie;Numer seryjny;Kod klienta;
3072023854;02458 AKR 8 GRUDZIEŃ;23957;74;1078;1240;1;3      53407 poz.3;Optifloat Clear 4\AL 16\Argon\Optitherm SI3 4;20943129;;
```

**Pola do wyodrębnienia:**
- `rackNumber` - Numer stojaka (3072023854)
- `customerOrderNumber` - Numer zamówienia klienta (02458 AKR 8 GRUDZIEŃ)
- `supplierOrderNumber` - Numer zamówienia dostawcy (23957)
- `position` - Pozycja (74)
- `widthMm` - Szerokość (1078)
- `heightMm` - Wysokość (1240)
- `quantity` - Sztuk (1)
- `orderNumber` - Zlecenie (53407 poz.3)
- `glassComposition` - Zespolenie (Optifloat Clear 4\AL 16\Argon\Optitherm SI3 4)
- `serialNumber` - Numer seryjny (20943129)
- `clientCode` - Kod klienta

---

## Architektura rozwiązania

### 1. Rozszerzenie modelu danych (Prisma)

#### Model: `GlassOrder` (Zamówienie szyb)
```prisma
model GlassOrder {
  id                    Int                @id @default(autoincrement())
  glassOrderNumber      String             @unique  // np. "02499 AKR 11 GRUDZIEŃ"
  orderDate             DateTime           // Data zamówienia
  supplier              String             // PILKINGTON, itp.
  orderedBy             String?            // W.Kania
  expectedDeliveryDate  DateTime?          // Data dostawy
  actualDeliveryDate    DateTime?          // Rzeczywista data dostawy
  status                String             @default("ordered") // ordered, partially_delivered, delivered, cancelled
  notes                 String?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  items                 GlassOrderItem[]   // Pozycje zamówienia
  deliveryItems         GlassDeliveryItem[] // Dostarczone pozycje
  validationResults     GlassOrderValidation[] // Wyniki walidacji

  @@index([glassOrderNumber])
  @@index([orderDate])
  @@index([expectedDeliveryDate])
  @@index([status])
}
```

#### Model: `GlassOrderItem` (Pozycja zamówienia szyb)
```prisma
model GlassOrderItem {
  id              Int         @id @default(autoincrement())
  glassOrderId    Int
  orderNumber     String      // np. "53479" (bez sufiksu)
  orderSuffix     String?     // np. "a", "b" (jeśli występuje)
  position        String      // np. "poz.1"
  glassType       String      // 4/16/4S3 Ug=1.1 ALU
  widthMm         Int
  heightMm        Int
  quantity        Int
  createdAt       DateTime    @default(now())

  glassOrder      GlassOrder  @relation(fields: [glassOrderId])
  order           Order?      @relation(fields: [orderNumber], references: [orderNumber])

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([widthMm, heightMm])
}
```

#### Model: `GlassDelivery` (Dostawa szyb z CSV)
```prisma
model GlassDelivery {
  id                    Int                 @id @default(autoincrement())
  rackNumber            String              // Numer stojaka
  customerOrderNumber   String              // Numer zamówienia klienta
  supplierOrderNumber   String?             // Numer zamówienia dostawcy
  deliveryDate          DateTime            // Data dostawy
  importedAt            DateTime            @default(now())
  fileImportId          Int?                // Powiązanie z FileImport

  items                 GlassDeliveryItem[]
  fileImport            FileImport?         @relation(fields: [fileImportId])

  @@index([rackNumber])
  @@index([customerOrderNumber])
  @@index([deliveryDate])
}
```

#### Model: `GlassDeliveryItem` (Pozycja dostawy szyb)
```prisma
model GlassDeliveryItem {
  id                 Int            @id @default(autoincrement())
  glassDeliveryId    Int
  glassOrderId       Int?           // Powiązanie z zamówieniem
  orderNumber        String         // np. "53407" (bez sufiksu)
  orderSuffix        String?        // np. "a"
  position           String         // np. "poz.3"
  widthMm            Int
  heightMm           Int
  quantity           Int
  glassComposition   String?        // Zespolenie
  serialNumber       String?        // Numer seryjny
  clientCode         String?
  matchedWithOrder   Boolean        @default(false) // Czy dopasowano do zamówienia
  validationStatus   String         @default("pending") // pending, matched, mismatch, missing
  createdAt          DateTime       @default(now())

  glassDelivery      GlassDelivery  @relation(fields: [glassDeliveryId])
  glassOrder         GlassOrder?    @relation(fields: [glassOrderId])

  @@index([glassDeliveryId])
  @@index([orderNumber])
  @@index([validationStatus])
  @@index([widthMm, heightMm])
}
```

#### Model: `GlassOrderValidation` (Wyniki walidacji)
```prisma
model GlassOrderValidation {
  id                     Int        @id @default(autoincrement())
  glassOrderId           Int
  orderNumber            String     // Zlecenie produkcyjne
  validationType         String     // quantity_check, dimension_check, suffix_mismatch
  status                 String     // ok, warning, error
  expectedQuantity       Int?       // Oczekiwana ilość
  orderedQuantity        Int?       // Zamówiona ilość
  deliveredQuantity      Int?       // Dostarczona ilość
  missingQuantity        Int?       // Brakująca ilość
  excessQuantity         Int?       // Nadmiar
  message                String?    // Komunikat walidacji
  details                String?    // JSON z dodatkowymi szczegółami
  createdAt              DateTime   @default(now())

  glassOrder             GlassOrder @relation(fields: [glassOrderId])

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([status])
}
```

#### Rozszerzenie modelu `Order`
```prisma
model Order {
  // Istniejące pola...

  // Nowe pola:
  glassOrderStatus      String?     @default("not_ordered") // not_ordered, ordered, partially_delivered, delivered
  expectedGlassCount    Int?        // Oczekiwana liczba szyb (z wymiarów okien)
  orderedGlassCount     Int?        // Zamówiona liczba szyb
  deliveredGlassCount   Int?        // Dostarczona liczba szyb
  glassValidationStatus String?     @default("pending") // pending, ok, warning, error

  // Relacje:
  glassOrderItems       GlassOrderItem[]
}
```

---

### 2. Parsery importu

#### Parser: `glass-order-txt-parser.ts` (Zamówienia TXT)
```typescript
interface ParsedGlassOrderTxt {
  metadata: {
    orderDate: Date;
    glassOrderNumber: string;
    supplier: string;
    orderedBy: string;
    expectedDeliveryDate: Date;
  };
  items: Array<{
    glassType: string;
    quantity: number;
    widthMm: number;
    heightMm: number;
    position: string;
    orderNumber: string;      // np. "53479"
    orderSuffix?: string;     // np. "a"
    fullReference: string;    // np. "53479 poz.1"
  }>;
  totals: {
    totalItems: number;
    totalQuantity: number;
    ordersSummary: Record<string, number>; // { "53479": 11, "53480": 4 }
  };
}

async function parseGlassOrderTxt(content: string): Promise<ParsedGlassOrderTxt>
```

**Logika parsera:**
1. Wykryj kodowanie (Windows-1250 dla polskich znaków)
2. Wyodrębnij nagłówek (data, numer zamówienia, dostawca)
3. Parsuj pozycje (regex dla kolumn: Symbol, Ilość, Szer, Wys, Poz, Zlecenie)
4. Wyodrębnij stopkę (kto zamówił, data dostawy)
5. Zagreguj statystyki per zlecenie
6. Rozdziel numer zlecenia na base + suffix

#### Parser: `glass-delivery-csv-parser.ts` (Dostawy CSV)
```typescript
interface ParsedGlassDeliveryCsv {
  metadata: {
    rackNumber: string;
    customerOrderNumber: string;
    supplierOrderNumber: string;
    deliveryDate: Date;
  };
  items: Array<{
    position: number;
    widthMm: number;
    heightMm: number;
    quantity: number;
    orderNumber: string;      // np. "53407"
    orderSuffix?: string;     // np. "a"
    fullReference: string;    // np. "53407 poz.3"
    glassComposition: string;
    serialNumber: string;
    clientCode: string;
  }>;
  totals: {
    totalItems: number;
    totalQuantity: number;
    ordersSummary: Record<string, number>;
  };
}

async function parseGlassDeliveryCsv(content: string): Promise<ParsedGlassDeliveryCsv>
```

---

### 3. Serwisy logiki biznesowej

#### Service: `glassOrderService.ts`
```typescript
class GlassOrderService {
  // Zarządzanie zamówieniami
  async createGlassOrder(data: CreateGlassOrderDto): Promise<GlassOrder>
  async updateGlassOrder(id: number, data: UpdateGlassOrderDto): Promise<GlassOrder>
  async deleteGlassOrder(id: number): Promise<void>
  async findAllGlassOrders(filters: GlassOrderFilters): Promise<GlassOrder[]>
  async findGlassOrderById(id: number): Promise<GlassOrder | null>
  async findGlassOrderByNumber(orderNumber: string): Promise<GlassOrder | null>

  // Import z pliku TXT
  async importFromTxtFile(fileContent: string): Promise<GlassOrder>

  // Walidacja
  async validateGlassOrder(glassOrderId: number): Promise<GlassOrderValidation[]>
  async validateAllOrders(): Promise<GlassOrderValidation[]>

  // Dopasowywanie do zleceń produkcyjnych
  async matchOrdersWithProduction(glassOrderId: number): Promise<MatchResult>

  // Agregacje
  async getOrdersSummary(glassOrderId: number): Promise<OrdersSummary>
}
```

#### Service: `glassDeliveryService.ts`
```typescript
class GlassDeliveryService {
  // Import z CSV
  async importFromCsvFile(fileContent: string): Promise<GlassDelivery>

  // Dopasowywanie do zamówień
  async matchDeliveryWithOrders(deliveryId: number): Promise<MatchResult>

  // Walidacja dostaw
  async validateDelivery(deliveryId: number): Promise<ValidationResult>

  // Agregacje
  async getDeliverySummary(deliveryId: number): Promise<DeliverySummary>
}
```

#### Service: `glassValidationService.ts`
```typescript
class GlassValidationService {
  /**
   * Walidacja kompletności zamówienia względem zlecenia produkcyjnego
   */
  async validateOrderCompleteness(
    orderNumber: string
  ): Promise<{
    orderNumber: string;
    expectedGlassCount: number;      // Z wymiarów okien w Order
    orderedGlassCount: number;       // Z GlassOrderItem
    deliveredGlassCount: number;     // Z GlassDeliveryItem
    status: 'ok' | 'warning' | 'error';
    issues: ValidationIssue[];
  }>

  /**
   * Walidacja wymiarów przy niezgodności numerów (53407 vs 53407-a)
   */
  async validateDimensionMatch(
    orderNumber: string,
    orderSuffix?: string
  ): Promise<{
    matched: boolean;
    matchedItems: Array<{ ordered: GlassOrderItem, delivered: GlassDeliveryItem }>;
    unmatchedOrdered: GlassOrderItem[];
    unmatchedDelivered: GlassDeliveryItem[];
  }>

  /**
   * Walidacja zbiorczego zamówienia (wszystkie zlecenia)
   */
  async validateGlassOrderAggregate(
    glassOrderId: number
  ): Promise<GlassOrderValidation[]>

  /**
   * Dopasowanie wymiarów z tolerancją (np. ±5mm)
   */
  private matchDimensions(
    width1: number, height1: number,
    width2: number, height2: number,
    tolerance: number = 5
  ): boolean
}
```

---

### 4. Endpointy API

#### Routes: `/api/glass-orders`
```typescript
// Zamówienia szyb
GET    /api/glass-orders                           // Lista zamówień
GET    /api/glass-orders/:id                       // Szczegóły zamówienia
POST   /api/glass-orders                           // Utwórz zamówienie
PUT    /api/glass-orders/:id                       // Aktualizuj zamówienie
DELETE /api/glass-orders/:id                       // Usuń zamówienie
GET    /api/glass-orders/by-number/:orderNumber    // Znajdź po numerze

// Import
POST   /api/glass-orders/import/txt                // Import z pliku TXT
POST   /api/glass-orders/import/folder             // Import wielu plików

// Walidacja
POST   /api/glass-orders/:id/validate              // Waliduj zamówienie
GET    /api/glass-orders/:id/validation-results    // Wyniki walidacji
POST   /api/glass-orders/validate-all              // Waliduj wszystkie

// Agregacje
GET    /api/glass-orders/:id/summary               // Podsumowanie zamówienia
GET    /api/glass-orders/:id/orders-breakdown      // Rozbicie na zlecenia
```

#### Routes: `/api/glass-deliveries`
```typescript
// Dostawy szyb
GET    /api/glass-deliveries                       // Lista dostaw
GET    /api/glass-deliveries/:id                   // Szczegóły dostawy
POST   /api/glass-deliveries                       // Utwórz dostawę
PUT    /api/glass-deliveries/:id                   // Aktualizuj dostawę
DELETE /api/glass-deliveries/:id                   // Usuń dostawę

// Import
POST   /api/glass-deliveries/import/csv            // Import z CSV
POST   /api/glass-deliveries/import/folder         // Import wielu plików

// Dopasowywanie
POST   /api/glass-deliveries/:id/match-orders      // Dopasuj do zamówień
GET    /api/glass-deliveries/:id/match-results     // Wyniki dopasowania

// Walidacja
POST   /api/glass-deliveries/:id/validate          // Waliduj dostawę
GET    /api/glass-deliveries/:id/validation-results // Wyniki walidacji
```

#### Routes: `/api/glass-validation`
```typescript
// Walidacja zbiorcza
GET    /api/glass-validation/orders                // Wszystkie zlecenia
GET    /api/glass-validation/orders/:orderNumber   // Konkretne zlecenie
POST   /api/glass-validation/run-all               // Uruchom walidację dla wszystkich
GET    /api/glass-validation/dashboard             // Dashboard walidacji
```

---

### 5. Komponenty Frontend

#### Strona: `/zamowienia-szyb` (Zarządzanie zamówieniami szyb)
```typescript
// /apps/web/src/app/zamowienia-szyb/page.tsx

export default function GlassOrdersPage() {
  return (
    <div>
      <PageHeader title="Zamówienia szyb" />

      {/* Import Files Section */}
      <GlassOrderImportSection />

      {/* Orders Table with Validation Status */}
      <GlassOrdersTable />

      {/* Statistics */}
      <GlassOrdersStatsPanel />
    </div>
  )
}
```

**Funkcjonalności:**
- Import plików TXT (drag & drop lub folder)
- Tabela zamówień z kolumnami:
  - Numer zamówienia
  - Data zamówienia
  - Dostawca
  - Liczba pozycji
  - Liczba zleceń
  - Łączna ilość szyb
  - Status walidacji (ikony: ✅ OK, ⚠️ Warning, ❌ Error)
  - Data oczekiwanej dostawy
  - Data rzeczywistej dostawy
  - Akcje (szczegóły, walidacja, usuń)

#### Komponent: `<GlassOrderDetailModal>`
```typescript
// /apps/web/src/components/glass/glass-order-detail-modal.tsx

export function GlassOrderDetailModal({ glassOrderId }: Props) {
  return (
    <Dialog>
      {/* Header with Order Number & Status */}
      <DialogHeader>
        <h2>Zamówienie szyb: {glassOrder.glassOrderNumber}</h2>
        <StatusBadge status={glassOrder.status} />
      </DialogHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="Pozycje" value={glassOrder.items.length} />
        <SummaryCard title="Łączna ilość" value={totalQuantity} />
        <SummaryCard title="Zlecenia" value={ordersCount} />
        <SummaryCard
          title="Status walidacji"
          value={<ValidationStatusIndicator status={validationStatus} />}
        />
      </div>

      {/* Orders Breakdown - Grouped by Order Number */}
      <GlassOrdersBreakdownTable items={glassOrder.items} />

      {/* Validation Results */}
      <GlassValidationResultsPanel validations={validationResults} />

      {/* Items List */}
      <GlassOrderItemsTable items={glassOrder.items} />
    </Dialog>
  )
}
```

#### Komponent: `<GlassValidationPanel>`
```typescript
// /apps/web/src/components/glass/glass-validation-panel.tsx

export function GlassValidationPanel({ orderNumber }: Props) {
  const { data: validation } = useGlassValidation(orderNumber)

  return (
    <Card>
      <CardHeader>
        <h3>Walidacja szyb dla zlecenia {orderNumber}</h3>
      </CardHeader>

      <CardContent>
        {/* Status Indicator */}
        <ValidationStatusBadge status={validation.status} />

        {/* Quantity Comparison */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Oczekiwane"
            value={validation.expectedGlassCount}
          />
          <MetricCard
            label="Zamówione"
            value={validation.orderedGlassCount}
            status={validation.orderedGlassCount === validation.expectedGlassCount ? 'ok' : 'warning'}
          />
          <MetricCard
            label="Dostarczone"
            value={validation.deliveredGlassCount}
            status={validation.deliveredGlassCount === validation.orderedGlassCount ? 'ok' : 'error'}
          />
        </div>

        {/* Issues List */}
        {validation.issues.length > 0 && (
          <ValidationIssuesList issues={validation.issues} />
        )}
      </CardContent>
    </Card>
  )
}
```

#### Rozszerzenie: `<OrderDetailModal>` (Istniejący modal)
```typescript
// Dodaj nową sekcję w istniejącym OrderDetailModal

<Section title="Status szyb">
  <GlassValidationPanel orderNumber={order.orderNumber} />

  {/* Quick Stats */}
  <div className="flex gap-4">
    <Chip label="Zamówione" value={order.orderedGlassCount || 0} />
    <Chip label="Dostarczone" value={order.deliveredGlassCount || 0} />
    <Chip
      label="Status"
      value={<GlassStatusBadge status={order.glassOrderStatus} />}
    />
  </div>

  {/* Link to Glass Orders */}
  <Button
    variant="outline"
    onClick={() => navigateTo(`/zamowienia-szyb?order=${order.orderNumber}`)}
  >
    Zobacz zamówienia szyb
  </Button>
</Section>
```

#### Strona: `/dostawy-szyb` (Dostawy szyb z CSV)
```typescript
// /apps/web/src/app/dostawy-szyb/page.tsx

export default function GlassDeliveriesPage() {
  return (
    <div>
      <PageHeader title="Dostawy szyb" />

      {/* Import CSV Section */}
      <GlassDeliveryImportSection />

      {/* Deliveries Table */}
      <GlassDeliveriesTable />

      {/* Match Status Overview */}
      <GlassMatchStatusPanel />
    </div>
  )
}
```

#### Rozszerzenie: `/zestawienia/zlecenia` (Tabela zleceń)
Dodaj kolumny:
- **Status szyb** - Ikona (🔴 nie zamówione, 🟡 zamówione, 🟢 dostarczone)
- **Zamówione szyby** - Liczba
- **Dostarczone szyby** - Liczba
- **Walidacja** - Ikona (✅ OK, ⚠️ Warning, ❌ Error)

#### Dashboard: `/zestawienia/szyby`
Nowa strona z:
- Statystyki ogólne (liczba zamówień, dostaw, walidacji)
- Wykresy:
  - Zamówienia vs dostawy w czasie
  - Status walidacji (pie chart)
  - Top zlecenia z problemami
- Alerty:
  - Brakujące szyby
  - Niezgodności wymiarów
  - Zlecenia bez zamówienia

---

### 6. Workflow użytkownika

#### Scenariusz 1: Import zamówienia szyb (TXT)
```
1. Użytkownik → Przechodzi do /zamowienia-szyb
2. Użytkownik → Przeciąga plik TXT lub wybiera folder (np. C:\Zamówienia_szyb\)
3. System → Parser wyodrębnia dane z TXT
4. System → Tworzy rekord GlassOrder + GlassOrderItem
5. System → Automatycznie dopasowuje do zleceń produkcyjnych (Order)
6. System → Uruchamia walidację:
   - Czy ilość zamówionych szyb zgadza się z oczekiwaną?
   - Czy wszystkie zlecenia mają zamówienie?
7. System → Aktualizuje Order.orderedGlassCount, Order.glassOrderStatus
8. Użytkownik → Widzi wyniki walidacji w tabeli (ikony statusu)
9. Użytkownik → Klika na zamówienie → Otwiera modal ze szczegółami
10. Użytkownik → Widzi rozbicie na zlecenia i problemy walidacji
```

#### Scenariusz 2: Import dostawy szyb (CSV)
```
1. Użytkownik → Przechodzi do /dostawy-szyb
2. Użytkownik → Importuje plik CSV
3. System → Parser wyodrębnia dane z CSV
4. System → Tworzy rekord GlassDelivery + GlassDeliveryItem
5. System → Dopasowuje do zamówień (GlassOrder):
   - Porównuje numer zlecenia (53407 vs 53407-a)
   - Jeśli niezgodność → waliduje wymiary
   - Tworzy powiązanie GlassDeliveryItem.glassOrderId
6. System → Uruchamia walidację:
   - Czy dostarczone szyby pasują do zamówienia?
   - Czy ilość się zgadza?
   - Czy wymiary pasują?
7. System → Aktualizuje Order.deliveredGlassCount, Order.glassOrderStatus
8. System → Tworzy rekordy GlassOrderValidation z wynikami
9. Użytkownik → Widzi dashboard z alertami
10. Użytkownik → Klika na alert → Przechodzi do szczegółów problemu
```

#### Scenariusz 3: Kontrola zlecenia w /zestawienia/zlecenia
```
1. Użytkownik → Przechodzi do /zestawienia/zlecenia
2. Użytkownik → Widzi tabelę zleceń z nowymi kolumnami:
   - Status szyb (ikona)
   - Zamówione szyby (liczba)
   - Dostarczone szyby (liczba)
   - Walidacja (ikona)
3. Użytkownik → Sortuje po statusie walidacji (problemy na górze)
4. Użytkownik → Klika na zlecenie → Otwiera OrderDetailModal
5. OrderDetailModal → Pokazuje sekcję "Status szyb" z:
   - GlassValidationPanel
   - Szybkie statystyki
   - Link do /zamowienia-szyb?order=53407
6. Użytkownik → Klika link → Przechodzi do szczegółów zamówienia szyb
```

#### Scenariusz 4: Ręczna walidacja
```
1. Użytkownik → Otwiera szczegóły zamówienia szyb
2. Użytkownik → Klika przycisk "Uruchom walidację"
3. System → GlassValidationService.validateGlassOrderAggregate()
4. System → Dla każdego zlecenia:
   - Sprawdza expectedGlassCount vs orderedGlassCount
   - Sprawdza orderedGlassCount vs deliveredGlassCount
   - Dopasowuje wymiary przy niezgodności numerów
   - Tworzy rekordy GlassOrderValidation
5. System → Wyświetla wyniki w panelu
6. Użytkownik → Widzi listę problemów z akcjami:
   - Potwierdź niezgodność
   - Oznacz jako poprawne
   - Dodaj notatkę
```

---

## Szczegóły implementacji

### Algorytm dopasowywania wymiarów

```typescript
/**
 * Dopasowywanie szyb z tolerancją wymiarów
 * Problem: Zamówiono pod 53407, dostarczone pod 53407-a
 * Rozwiązanie: Porównaj wymiary (szer, wys) z tolerancją ±5mm
 */
function matchGlassByDimensions(
  orderedItems: GlassOrderItem[],
  deliveredItems: GlassDeliveryItem[],
  tolerance: number = 5
): {
  matched: Array<{ ordered: GlassOrderItem, delivered: GlassDeliveryItem }>,
  unmatchedOrdered: GlassOrderItem[],
  unmatchedDelivered: GlassDeliveryItem[]
} {
  const matched = []
  const unmatchedOrdered = [...orderedItems]
  const unmatchedDelivered = [...deliveredItems]

  for (const ordered of orderedItems) {
    const deliveredMatch = deliveredItems.find(delivered => {
      const widthMatch = Math.abs(ordered.widthMm - delivered.widthMm) <= tolerance
      const heightMatch = Math.abs(ordered.heightMm - delivered.heightMm) <= tolerance
      const quantityMatch = ordered.quantity === delivered.quantity

      return widthMatch && heightMatch && quantityMatch
    })

    if (deliveredMatch) {
      matched.push({ ordered, delivered: deliveredMatch })
      unmatchedOrdered.splice(unmatchedOrdered.indexOf(ordered), 1)
      unmatchedDelivered.splice(unmatchedDelivered.indexOf(deliveredMatch), 1)
    }
  }

  return { matched, unmatchedOrdered, unmatchedDelivered }
}
```

### Agregacja statystyk dla zlecenia

```typescript
/**
 * Pobierz statystyki szyb dla zlecenia produkcyjnego
 */
async function getGlassStatsForOrder(orderNumber: string): Promise<{
  orderNumber: string
  expectedGlassCount: number      // Z Order.totalGlasses lub wyliczone z okien
  orderedGlassCount: number       // Suma z GlassOrderItem
  deliveredGlassCount: number     // Suma z GlassDeliveryItem
  missingCount: number            // orderedGlassCount - deliveredGlassCount
  status: 'not_ordered' | 'ordered' | 'partially_delivered' | 'delivered'
  validationStatus: 'ok' | 'warning' | 'error'
  issues: string[]
}> {
  // 1. Pobierz zlecenie produkcyjne
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { windows: true }
  })

  // 2. Wylicz oczekiwaną liczbę szyb
  const expectedGlassCount = order.totalGlasses ||
    calculateExpectedGlassFromWindows(order.windows)

  // 3. Pobierz zamówione szyby
  const orderedItems = await prisma.glassOrderItem.findMany({
    where: { orderNumber }
  })
  const orderedGlassCount = orderedItems.reduce((sum, item) => sum + item.quantity, 0)

  // 4. Pobierz dostarczone szyby
  const deliveredItems = await prisma.glassDeliveryItem.findMany({
    where: { orderNumber }
  })
  const deliveredGlassCount = deliveredItems.reduce((sum, item) => sum + item.quantity, 0)

  // 5. Określ status
  let status: string
  let validationStatus: string
  const issues: string[] = []

  if (orderedGlassCount === 0) {
    status = 'not_ordered'
    validationStatus = 'error'
    issues.push('Brak zamówienia szyb dla tego zlecenia')
  } else if (deliveredGlassCount === 0) {
    status = 'ordered'
    validationStatus = 'warning'
    issues.push('Zamówiono szyby, ale nie dostarczono jeszcze')
  } else if (deliveredGlassCount < orderedGlassCount) {
    status = 'partially_delivered'
    validationStatus = 'warning'
    issues.push(`Dostarczone ${deliveredGlassCount}/${orderedGlassCount} szyb`)
  } else if (deliveredGlassCount === orderedGlassCount) {
    status = 'delivered'

    // Sprawdź czy zgadza się z oczekiwaną ilością
    if (orderedGlassCount !== expectedGlassCount) {
      validationStatus = 'warning'
      issues.push(`Zamówiono ${orderedGlassCount} szyb, oczekiwano ${expectedGlassCount}`)
    } else {
      validationStatus = 'ok'
    }
  } else {
    status = 'delivered'
    validationStatus = 'warning'
    issues.push(`Dostarczono więcej niż zamówiono: ${deliveredGlassCount} > ${orderedGlassCount}`)
  }

  return {
    orderNumber,
    expectedGlassCount,
    orderedGlassCount,
    deliveredGlassCount,
    missingCount: orderedGlassCount - deliveredGlassCount,
    status,
    validationStatus,
    issues
  }
}
```

---

## Plan wdrożenia (etapy)

### Etap 1: Fundament bazy danych ✅
**Czas:** 1 dzień
**Zadania:**
1. Dodaj modele do schema.prisma:
   - GlassOrder
   - GlassOrderItem
   - GlassDelivery
   - GlassDeliveryItem
   - GlassOrderValidation
2. Rozszerz model Order o pola glass-related
3. Uruchom migrację: `npx prisma migrate dev --name add_glass_tracking`
4. Wygeneruj klienta Prisma: `npx prisma generate`

### Etap 2: Parsery importu 📄
**Czas:** 2 dni
**Zadania:**
1. Stwórz `glass-order-txt-parser.ts`:
   - Wykryj kodowanie (Windows-1250)
   - Parsuj nagłówek (data, numer, dostawca)
   - Parsuj pozycje (regex dla kolumn)
   - Wyodrębnij stopkę
   - Rozdziel orderNumber na base + suffix
2. Stwórz `glass-delivery-csv-parser.ts`:
   - Parsuj CSV z separatorem ";"
   - Wyodrębnij wszystkie kolumny
   - Agreguj statystyki
3. Testy jednostkowe dla parserów

### Etap 3: Serwisy backend 🔧
**Czas:** 3 dni
**Zadania:**
1. `glassOrderService.ts`:
   - CRUD dla GlassOrder
   - Import z TXT
   - Dopasowywanie do Order
   - Walidacja
2. `glassDeliveryService.ts`:
   - Import z CSV
   - Dopasowywanie do GlassOrder
   - Walidacja dostaw
3. `glassValidationService.ts`:
   - Walidacja kompletności
   - Dopasowanie wymiarów
   - Agregacje statystyk
4. Testy integracyjne

### Etap 4: Endpointy API 🌐
**Czas:** 2 dni
**Zadania:**
1. Routes + Handlers + Validators dla:
   - `/api/glass-orders`
   - `/api/glass-deliveries`
   - `/api/glass-validation`
2. Dokumentacja API (Swagger/OpenAPI)
3. Testy E2E dla endpointów

### Etap 5: Komponenty frontend (część 1) 🎨
**Czas:** 3 dni
**Zadania:**
1. Strona `/zamowienia-szyb`:
   - Import TXT (drag-drop)
   - Tabela zamówień
   - Stats panel
2. `<GlassOrderDetailModal>`:
   - Header z statusem
   - Summary cards
   - Rozbicie na zlecenia
   - Lista pozycji
3. `<GlassOrderImportSection>`:
   - File upload
   - Folder import
   - Preview

### Etap 6: Komponenty frontend (część 2) 🎨
**Czas:** 2 dni
**Zadania:**
1. `<GlassValidationPanel>`:
   - Status indicator
   - Quantity comparison
   - Issues list
2. Rozszerzenie `<OrderDetailModal>`:
   - Sekcja "Status szyb"
   - Quick stats
   - Link do zamówień

### Etap 7: Integracja w istniejących widokach 🔗
**Czas:** 2 dni
**Zadania:**
1. `/zestawienia/zlecenia`:
   - Dodaj kolumny: Status szyb, Zamówione, Dostarczone, Walidacja
   - Sortowanie po statusie
   - Filtrowanie
2. `/dostawy`:
   - Dodaj informacje o szybkach w DeliveryOrder
   - Wyświetl status walidacji
3. `/archiwum`:
   - Rozszerz o dane szyb

### Etap 8: Dostawy szyb (CSV) 📦
**Czas:** 2 dni
**Zadania:**
1. Strona `/dostawy-szyb`:
   - Import CSV
   - Tabela dostaw
   - Match status panel
2. `<GlassDeliveryDetailModal>`:
   - Szczegóły dostawy
   - Match results
   - Validation results
3. Dopasowanie wymiarów z tolerancją

### Etap 9: Dashboard i raporty 📊
**Czas:** 2 dni
**Zadania:**
1. Strona `/zestawienia/szyby`:
   - Statystyki ogólne
   - Wykresy
   - Alerty
2. Widget na głównym dashboardzie:
   - Liczba oczekujących walidacji
   - Problemy do rozwiązania

### Etap 10: Testy i optymalizacja 🧪
**Czas:** 2 dni
**Zadania:**
1. Testy E2E dla pełnego workflow
2. Testy wydajnościowe (importy dużych plików)
3. Optymalizacja zapytań DB (indeksy)
4. Caching w React Query

### Etap 11: Dokumentacja i wdrożenie 📚
**Czas:** 1 dzień
**Zadania:**
1. Dokumentacja użytkownika (instrukcje)
2. Dokumentacja techniczna (architektura)
3. Migracja danych (jeśli potrzebne)
4. Wdrożenie na produkcję

---

## Szacunkowy czas implementacji

**Łączny czas:** ~22 dni robocze (około 4-5 tygodni)

**Priorytety:**
1. **Krytyczne** (Etapy 1-4): Fundament + Backend - 8 dni
2. **Wysokie** (Etapy 5-7): Frontend podstawowy + Integracja - 7 dni
3. **Średnie** (Etapy 8-9): Dostawy CSV + Dashboard - 4 dni
4. **Niskie** (Etapy 10-11): Testy + Dokumentacja - 3 dni

---

## Potencjalne wyzwania i rozwiązania

### Wyzwanie 1: Kodowanie polskich znaków w TXT
**Problem:** Pliki TXT mogą używać Windows-1250 zamiast UTF-8
**Rozwiązanie:** Wykryj kodowanie przy parsowaniu (biblioteka `iconv-lite`)

### Wyzwanie 2: Niezgodności numerów zleceń (53407 vs 53407-a)
**Problem:** Szyby zamówione pod jednym numerem, dostarczone pod innym
**Rozwiązanie:** Dopasowanie wymiarów z tolerancją ±5mm

### Wyzwanie 3: Wiele zamówień dla jednego zlecenia
**Problem:** Jedno zlecenie może mieć kilka zamówień szyb (np. uzupełnienia)
**Rozwiązanie:** Relacja 1:N (Order → GlassOrderItem), suma ilości

### Wyzwanie 4: Wydajność importu dużych plików
**Problem:** CSV z setkami wierszy może spowalniać import
**Rozwiązanie:** Batch insert (Prisma `createMany`), progress indicator

### Wyzwanie 5: Różne formaty dat w TXT
**Problem:** "3 12 25 ŚRODA" vs "03.12.2025"
**Rozwiązanie:** Funkcja parsująca wielowariantowe formaty dat

---

## Pytania do wyjaśnienia przed rozpoczęciem

1. **Tolerancja wymiarów:** Jaką tolerancję (w mm) przyjąć przy dopasowywaniu wymiarów?
   _Sugerowane: ±5mm_

2. **Status walidacji:** Czy wystarczą 3 statusy (ok, warning, error), czy potrzebne inne?

3. **Automatyczna walidacja:** Czy uruchamiać walidację automatycznie przy imporcie, czy ręcznie?
   _Sugerowane: Automatycznie przy imporcie + możliwość ręcznej ponownej walidacji_

4. **Powiadomienia:** Czy wysyłać powiadomienia email/SMS przy wykryciu problemów?

5. **Uprawnienia:** Czy wszyscy użytkownicy mogą importować szyby, czy tylko określone role?

6. **Archiwizacja:** Czy archiwizować stare zamówienia/dostawy? Po jakim czasie?

7. **Edycja danych:** Czy użytkownik może ręcznie edytować zaimportowane dane?

8. **Historia zmian:** Czy śledzić historię zmian (audit log) dla zamówień/dostaw?

---

## Diagramy

### Diagram przepływu danych - Import zamówienia szyb
```
┌─────────────┐
│  Plik TXT   │
│  (Zamówienie)│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ glass-order-txt-    │
│ parser.ts           │
│ - Wyodrębnij dane   │
│ - Rozdziel zlecenia │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ glassOrderService   │
│ .importFromTxtFile()│
│ - Utwórz GlassOrder │
│ - Utwórz Items      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ matchOrdersWith     │
│ Production()        │
│ - Znajdź Order      │
│ - Powiąż Items      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ glassValidation     │
│ Service.validate()  │
│ - Porównaj ilości   │
│ - Utwórz Validation │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Aktualizuj Order    │
│ - orderedGlassCount │
│ - glassOrderStatus  │
└─────────────────────┘
```

### Diagram przepływu danych - Import dostawy szyb
```
┌─────────────┐
│  Plik CSV   │
│  (Dostawa)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ glass-delivery-csv- │
│ parser.ts           │
│ - Parsuj CSV        │
│ - Wyodrębnij pozycje│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ glassDeliveryService│
│ .importFromCsvFile()│
│ - Utwórz Delivery   │
│ - Utwórz Items      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ matchDeliveryWith   │
│ Orders()            │
│ - Znajdź GlassOrder │
│ - Porównaj wymiary  │
│ - Powiąż Items      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ glassValidation     │
│ Service.validate    │
│ Delivery()          │
│ - Sprawdź ilości    │
│ - Sprawdź wymiary   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Aktualizuj Order    │
│ - deliveredGlass    │
│   Count             │
│ - glassOrderStatus  │
└─────────────────────┘
```

### Model danych - Relacje
```
Order (Zlecenie produkcyjne)
  ├── orderNumber: "53407"
  ├── glassOrderStatus: "ordered"
  ├── orderedGlassCount: 15
  ├── deliveredGlassCount: 12
  └── glassValidationStatus: "warning"
       │
       │ 1:N
       ▼
GlassOrderItem (Zamówiona szyba)
  ├── orderNumber: "53407"
  ├── orderSuffix: null
  ├── widthMm: 713
  ├── heightMm: 951
  ├── quantity: 1
  └── glassType: "4/16/4S3 Ug=1.1 ALU"
       │
       │ N:1
       ▼
GlassOrder (Zamówienie zbiorcze)
  ├── glassOrderNumber: "02499 AKR 11 GRUDZIEŃ"
  ├── orderDate: 2025-11-19
  ├── supplier: "PILKINGTON"
  └── status: "ordered"
       │
       │ 1:N
       ▼
GlassDeliveryItem (Dostarczona szyba)
  ├── orderNumber: "53407"
  ├── orderSuffix: "a" ← UWAGA: Inny suffix!
  ├── widthMm: 715
  ├── heightMm: 950
  ├── quantity: 1
  └── matchedWithOrder: true (dopasowano wymiary)
       │
       │ N:1
       ▼
GlassDelivery (Dostawa)
  ├── rackNumber: "3072023854"
  ├── customerOrderNumber: "02458 AKR 8 GRUDZIEŃ"
  └── deliveryDate: 2025-12-03
       │
       │ 1:N
       ▼
GlassOrderValidation (Wynik walidacji)
  ├── orderNumber: "53407"
  ├── validationType: "quantity_check"
  ├── status: "warning"
  ├── orderedQuantity: 15
  ├── deliveredQuantity: 12
  ├── missingQuantity: 3
  └── message: "Brak 3 szyb"
```

---

## Podsumowanie

System śledzenia i walidacji zamówień szyb:

### Główne funkcjonalności:
✅ Import zamówień szyb z plików TXT (format Pilkington)
✅ Import dostaw szyb z plików CSV
✅ Automatyczne dopasowywanie do zleceń produkcyjnych
✅ Walidacja ilości (oczekiwane vs zamówione vs dostarczone)
✅ Dopasowywanie wymiarów przy niezgodności numerów (z tolerancją)
✅ Wyświetlanie statusu w tabelach zleceń i dostawach
✅ Szczegółowe widoki walidacji z alertami
✅ Dashboard z statystykami i raportami

### Korzyści:
- **Automatyzacja:** Import i walidacja bez ręcznego sprawdzania
- **Kontrola jakości:** Wczesne wykrywanie niezgodności
- **Przejrzystość:** Jasny status szyb dla każdego zlecenia
- **Zgodność:** Kontrola wymiarów przy zmianach numerów zleceń
- **Historia:** Pełna traceability zamówień i dostaw

### Możliwe rozszerzenia (przyszłość):
- Automatyczne powiadomienia email przy problemach
- Integracja z systemem ERP dostawcy (API)
- Predykcja opóźnień dostaw (ML)
- Optymalizacja zamówień (batch ordering)
- Mobilna aplikacja do skanowania dostaw (QR/barcode)
