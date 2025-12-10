# Prompt: Implementacja systemu śledzenia zamówień i dostaw szyb dla AKROBUD ERP

## Kontekst projektu

AKROBUD to system ERP do zarządzania produkcją okien i drzwi, zbudowany w architekturze monorepo:
- **Backend**: Fastify + Prisma ORM + SQLite (apps/api)
- **Frontend**: Next.js 15 + React + TanStack Query + Shadcn/ui + Tailwind (apps/web)
- **Baza danych**: SQLite z Prisma
- **Monorepo**: pnpm workspaces

## Cel implementacji

Zaimplementuj kompleksowy system śledzenia zamówień i dostaw szyb z następującymi funkcjonalnościami:

### Wymagania biznesowe

1. **Import zamówień szyb** z plików TXT (format Pilkington)
2. **Import dostaw szyb** z plików CSV
3. **Automatyczne dopasowywanie** dostaw do zamówień
4. **Walidacja ilościowa**: porównanie zamówionych vs dostarczonych szyb
5. **Walidacja wymiarów**: **TYLKO przy konfliktach numerów zleceń** (np. 54542 vs 54542-a)
   - **Tolerancja: 0mm** (dokładne dopasowanie wymiarów)
6. **Wyświetlanie statusów** w istniejących widokach
7. **Dashboard z alertami** o problemach

### KRYTYCZNA reguła biznesowa

**Wymiary szyb porównuj TYLKO w przypadku konfliktu suffixów!**

Przykład:
- Zamówione pod numerem `53407` bez suffixu
- Dostarczone pod numerem `53407-a`
- **Wtedy** porównaj wymiary z tolerancją 0mm
- Jeśli wymiary się zgadzają → status "conflict" (wymagana uwaga użytkownika)
- Jeśli wymiary się różnią → status "unmatched" (brak dopasowania)

**NIE przechowuj** oczekiwanych wymiarów szyb w bazie danych - nie mamy tych danych.

## Format danych źródłowych

### Plik TXT - Zamówienie szyb (Pilkington)

```
Data 19.11.2025    Godzina 11:08
Numer 02499 AKR 11 GRUDZIEŃ
PILKINGTON

Symbol                                   Ilość   Szer     Wys    Poz   Zlecenie
4/16/4S3 Ug=1.1 ALU                         1     713     951     1      53479 poz.1
4S3/16/4 Ug=1.1 FLOAT                       2     680    1456     2      53480-a poz.2
...
                              W.Kania
 Dostawa na  3 12 25 ŚRODA
```

**Uwagi o parsowaniu TXT:**
- Kodowanie: UTF-8 lub Windows-1250 (użyj `iconv-lite` do detekcji)
- Numery zleceń: `53479` (base) lub `53480-a` (base + suffix)
- Regex do wykrycia suffixu: `/(\d+)(?:-([a-zA-Z]+))?/`

### Plik CSV - Dostawa szyb

```csv
Numer stojaka;Numer zamówienia klienta;Numer zamówienia dostawcy;Pozycja;Szerokosc;Wysokosc;Sztuk;Zlecenie;Zespolenie;Numer seryjny;Kod klienta;
3072023854;02458 AKR 8 GRUDZIEŃ;23957;74;1078;1240;1;3      53407 poz.3;Optifloat Clear 4\AL 16\Argon\Optitherm SI3 4;20943129;;
```

**Uwagi o parsowaniu CSV:**
- Separator: `;`
- Kolumna "Zlecenie": `3      53407 poz.3` → orderNumber: `53407`
- Regex: `/\s*(\d+)\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/`

## Etapy implementacji (12 etapów)

### ETAP 1: Rozszerzenie bazy danych (schema.prisma)

**Lokalizacja**: `apps/api/prisma/schema.prisma`

#### 1.1 Rozszerz model Order

```prisma
model Order {
  // ... istniejące pola ...

  // Nowe pola do śledzenia szyb
  orderedGlassCount   Int?      @default(0) @map("ordered_glass_count")
  deliveredGlassCount Int?      @default(0) @map("delivered_glass_count")
  glassOrderStatus    String?   @default("not_ordered") @map("glass_order_status")

  // Nowa relacja
  glassOrderItems     GlassOrderItem[]   @relation("OrderGlassItems")

  // ... istniejące relacje ...

  @@index([glassOrderStatus])
}
```

#### 1.2 Dodaj nowe modele

```prisma
model GlassOrder {
  id                   Int                    @id @default(autoincrement())
  glassOrderNumber     String                 @unique @map("glass_order_number")
  orderDate            DateTime               @map("order_date")
  supplier             String
  orderedBy            String?                @map("ordered_by")
  expectedDeliveryDate DateTime?              @map("expected_delivery_date")
  actualDeliveryDate   DateTime?              @map("actual_delivery_date")
  status               String                 @default("ordered")
  notes                String?
  createdAt            DateTime               @default(now()) @map("created_at")
  updatedAt            DateTime               @updatedAt @map("updated_at")

  items                GlassOrderItem[]
  deliveryItems        GlassDeliveryItem[]
  validationResults    GlassOrderValidation[]

  @@index([glassOrderNumber])
  @@index([orderDate])
  @@index([status])
  @@map("glass_orders")
}

model GlassOrderItem {
  id           Int        @id @default(autoincrement())
  glassOrderId Int        @map("glass_order_id")
  orderNumber  String     @map("order_number")
  orderSuffix  String?    @map("order_suffix")
  position     String
  glassType    String     @map("glass_type")
  widthMm      Int        @map("width_mm")
  heightMm     Int        @map("height_mm")
  quantity     Int
  createdAt    DateTime   @default(now()) @map("created_at")

  glassOrder   GlassOrder @relation(fields: [glassOrderId], references: [id], onDelete: Cascade)
  order        Order?     @relation("OrderGlassItems", fields: [orderNumber], references: [orderNumber])

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([orderNumber, orderSuffix])
  @@index([widthMm, heightMm])
  @@map("glass_order_items")
}

model GlassDelivery {
  id                  Int                 @id @default(autoincrement())
  rackNumber          String              @map("rack_number")
  customerOrderNumber String              @map("customer_order_number")
  supplierOrderNumber String?             @map("supplier_order_number")
  deliveryDate        DateTime            @map("delivery_date")
  fileImportId        Int?                @map("file_import_id")
  createdAt           DateTime            @default(now()) @map("created_at")

  items               GlassDeliveryItem[]
  fileImport          FileImport?         @relation(fields: [fileImportId], references: [id])

  @@index([rackNumber])
  @@index([customerOrderNumber])
  @@index([deliveryDate])
  @@map("glass_deliveries")
}

model GlassDeliveryItem {
  id               Int            @id @default(autoincrement())
  glassDeliveryId  Int            @map("glass_delivery_id")
  glassOrderId     Int?           @map("glass_order_id")
  orderNumber      String         @map("order_number")
  orderSuffix      String?        @map("order_suffix")
  position         String
  widthMm          Int            @map("width_mm")
  heightMm         Int            @map("height_mm")
  quantity         Int
  glassComposition String?        @map("glass_composition")
  serialNumber     String?        @map("serial_number")
  clientCode       String?        @map("client_code")
  matchStatus      String         @default("pending") @map("match_status")
  matchedItemId    Int?           @map("matched_item_id")
  createdAt        DateTime       @default(now()) @map("created_at")

  glassDelivery    GlassDelivery  @relation(fields: [glassDeliveryId], references: [id], onDelete: Cascade)
  glassOrder       GlassOrder?    @relation(fields: [glassOrderId], references: [id])

  @@index([glassDeliveryId])
  @@index([orderNumber])
  @@index([orderNumber, orderSuffix])
  @@index([matchStatus])
  @@index([widthMm, heightMm])
  @@map("glass_delivery_items")
}

model GlassOrderValidation {
  id                Int         @id @default(autoincrement())
  glassOrderId      Int?        @map("glass_order_id")
  orderNumber       String      @map("order_number")
  validationType    String      @map("validation_type")
  severity          String
  expectedQuantity  Int?        @map("expected_quantity")
  orderedQuantity   Int?        @map("ordered_quantity")
  deliveredQuantity Int?        @map("delivered_quantity")
  message           String
  details           String?
  resolved          Boolean     @default(false)
  resolvedAt        DateTime?   @map("resolved_at")
  resolvedBy        String?     @map("resolved_by")
  createdAt         DateTime    @default(now()) @map("created_at")

  glassOrder        GlassOrder? @relation(fields: [glassOrderId], references: [id], onDelete: Cascade)

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([severity])
  @@index([resolved])
  @@map("glass_order_validations")
}
```

#### 1.3 Rozszerz FileImport

```prisma
model FileImport {
  // ... istniejące pola ...

  // Nowa relacja
  glassDeliveries GlassDelivery[]

  // ... istniejące relacje ...
}
```

#### 1.4 Uruchom migrację

**WAŻNE**: W środowisku Claude Code użyj:

```bash
cd apps/api
npx prisma db push --accept-data-loss
npx prisma generate
```

**NIE używaj** `npx prisma migrate dev` (środowisko non-interactive).

---

### ETAP 2: Parsery TXT i CSV

#### 2.1 Parser TXT (Pilkington)

**Plik**: `apps/api/src/services/parsers/glass-order-txt-parser.ts`

```typescript
import iconv from 'iconv-lite';

export interface ParsedGlassOrderTxt {
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
    orderNumber: string;
    orderSuffix?: string;
    fullReference: string;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    orderBreakdown: Record<string, { count: number; quantity: number }>;
  };
}

function detectEncoding(buffer: Buffer): string {
  const utf8Text = buffer.toString('utf-8');
  if (!/�/.test(utf8Text)) {
    return 'utf-8';
  }
  return 'windows-1250';
}

function parseOrderReference(reference: string): {
  orderNumber: string;
  orderSuffix: string | null;
  fullReference: string;
} {
  const trimmed = reference.trim();
  const match = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (!match) {
    throw new Error(`Nie można sparsować referencji zlecenia: ${reference}`);
  }

  return {
    orderNumber: match[1],
    orderSuffix: match[2] || null,
    fullReference: trimmed,
  };
}

export function parseGlassOrderTxt(fileContent: string | Buffer): ParsedGlassOrderTxt {
  let content: string;

  if (Buffer.isBuffer(fileContent)) {
    const encoding = detectEncoding(fileContent);
    content = iconv.decode(fileContent, encoding);
  } else {
    content = fileContent;
  }

  const lines = content.split(/\r?\n/);

  // Parse header
  const dateMatch = lines[0]?.match(/Data (\d{2}\.\d{2}\.\d{4})\s+Godzina (\d{2}:\d{2})/);
  const orderNumberMatch = lines[1]?.match(/Numer (.+)/);
  const supplierMatch = lines[2]?.match(/(PILKINGTON|GUARDIAN|[A-Z]+)/);

  if (!dateMatch || !orderNumberMatch) {
    throw new Error('Nie można sparsować nagłówka pliku TXT');
  }

  const [day, month, year] = dateMatch[1].split('.');
  const orderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const glassOrderNumber = orderNumberMatch[1].trim();
  const supplier = supplierMatch?.[1] || 'NIEZNANY';

  // Find table start
  const tableStartIndex = lines.findIndex((line) =>
    line.includes('Symbol') && line.includes('Ilość') && line.includes('Zlecenie')
  );

  if (tableStartIndex === -1) {
    throw new Error('Nie znaleziono tabeli z pozycjami');
  }

  // Parse items
  const items: ParsedGlassOrderTxt['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  for (let i = tableStartIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at footer
    if (!line || line.match(/^\s*[A-Z]\.[A-Z]/)) {
      break;
    }

    // Parse table row (fixed-width or tab-separated)
    const parts = line.split(/\s{2,}|\t/).filter(Boolean);

    if (parts.length < 6) continue;

    try {
      const glassType = parts[0];
      const quantity = parseInt(parts[1]);
      const widthMm = parseInt(parts[2]);
      const heightMm = parseInt(parts[3]);
      const position = parts[4];
      const orderRef = parts[5];

      const { orderNumber, orderSuffix, fullReference } = parseOrderReference(orderRef);

      items.push({
        glassType,
        quantity,
        widthMm,
        heightMm,
        position,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
      });

      const key = orderSuffix ? `${orderNumber}-${orderSuffix}` : orderNumber;
      if (!orderBreakdown[key]) {
        orderBreakdown[key] = { count: 0, quantity: 0 };
      }
      orderBreakdown[key].count++;
      orderBreakdown[key].quantity += quantity;
    } catch (error) {
      console.warn(`Błąd parsowania linii: ${line}`, error);
    }
  }

  // Parse footer (orderedBy, expectedDeliveryDate)
  let orderedBy = '';
  let expectedDeliveryDate = new Date();

  for (let i = tableStartIndex + items.length + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    const nameMatch = line.match(/^\s*([A-Z]\.[A-Z][a-z]+)/);
    if (nameMatch) {
      orderedBy = nameMatch[1];
    }

    const deliveryMatch = line.match(/Dostawa na\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (deliveryMatch) {
      const day = parseInt(deliveryMatch[1]);
      const month = parseInt(deliveryMatch[2]);
      const year = 2000 + parseInt(deliveryMatch[3]);
      expectedDeliveryDate = new Date(year, month - 1, day);
    }
  }

  return {
    metadata: {
      orderDate,
      glassOrderNumber,
      supplier,
      orderedBy,
      expectedDeliveryDate,
    },
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      orderBreakdown,
    },
  };
}
```

**Zainstaluj zależność**:

```bash
cd apps/api
pnpm add iconv-lite
pnpm add -D @types/iconv-lite
```

#### 2.2 Parser CSV

**Plik**: `apps/api/src/services/parsers/glass-delivery-csv-parser.ts`

```typescript
export interface ParsedGlassDeliveryCsv {
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
    orderNumber: string;
    orderSuffix?: string;
    fullReference: string;
    glassComposition: string;
    serialNumber: string;
    clientCode: string;
  }>;
  summary: {
    totalItems: number;
    totalQuantity: number;
    orderBreakdown: Record<string, { count: number; quantity: number }>;
  };
}

function parseOrderReference(reference: string): {
  orderNumber: string;
  orderSuffix: string | null;
  fullReference: string;
} {
  const trimmed = reference.trim();

  // Pattern: "3      53407 poz.3" or "53407-a poz.3"
  const match = trimmed.match(/\s*(\d+)\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (match) {
    return {
      orderNumber: match[2],
      orderSuffix: match[3] || null,
      fullReference: trimmed,
    };
  }

  // Fallback
  const simpleMatch = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?/);
  if (simpleMatch) {
    return {
      orderNumber: simpleMatch[1],
      orderSuffix: simpleMatch[2] || null,
      fullReference: trimmed,
    };
  }

  throw new Error(`Nie można sparsować referencji zlecenia: ${reference}`);
}

export function parseGlassDeliveryCsv(fileContent: string): ParsedGlassDeliveryCsv {
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('Plik CSV jest pusty lub nieprawidłowy');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(';').map((h) => h.trim());

  // Find column indices
  const indices = {
    rackNumber: headers.indexOf('Numer stojaka'),
    customerOrderNumber: headers.indexOf('Numer zamówienia klienta'),
    supplierOrderNumber: headers.indexOf('Numer zamówienia dostawcy'),
    position: headers.indexOf('Pozycja'),
    width: headers.indexOf('Szerokosc'),
    height: headers.indexOf('Wysokosc'),
    quantity: headers.indexOf('Sztuk'),
    orderRef: headers.indexOf('Zlecenie'),
    composition: headers.indexOf('Zespolenie'),
    serialNumber: headers.indexOf('Numer seryjny'),
    clientCode: headers.indexOf('Kod klienta'),
  };

  // Validate required columns
  if (indices.rackNumber === -1 || indices.orderRef === -1) {
    throw new Error('Brak wymaganych kolumn w pliku CSV');
  }

  const items: ParsedGlassDeliveryCsv['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  let rackNumber = '';
  let customerOrderNumber = '';
  let supplierOrderNumber = '';

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(';').map((v) => v.trim());

    if (values.length < headers.length - 2) continue;

    if (i === 1) {
      rackNumber = values[indices.rackNumber] || '';
      customerOrderNumber = values[indices.customerOrderNumber] || '';
      supplierOrderNumber = values[indices.supplierOrderNumber] || '';
    }

    try {
      const orderRef = values[indices.orderRef] || '';
      const { orderNumber, orderSuffix, fullReference } = parseOrderReference(orderRef);

      const item = {
        position: parseInt(values[indices.position]) || i,
        widthMm: parseInt(values[indices.width]) || 0,
        heightMm: parseInt(values[indices.height]) || 0,
        quantity: parseInt(values[indices.quantity]) || 1,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
        glassComposition: values[indices.composition] || '',
        serialNumber: values[indices.serialNumber] || '',
        clientCode: values[indices.clientCode] || '',
      };

      items.push(item);

      const key = orderSuffix ? `${orderNumber}-${orderSuffix}` : orderNumber;
      if (!orderBreakdown[key]) {
        orderBreakdown[key] = { count: 0, quantity: 0 };
      }
      orderBreakdown[key].count++;
      orderBreakdown[key].quantity += item.quantity;
    } catch (error) {
      console.warn(`Błąd parsowania linii ${i}: ${line}`, error);
    }
  }

  return {
    metadata: {
      rackNumber,
      customerOrderNumber,
      supplierOrderNumber,
      deliveryDate: new Date(),
    },
    items,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      orderBreakdown,
    },
  };
}
```

---

### ETAP 3: Serwisy Backend

#### 3.1 Glass Order Service

**Plik**: `apps/api/src/services/glassOrderService.ts`

**Kluczowe metody**:
- `importFromTxt(fileContent: string | Buffer, filename: string)` - import z TXT
- `findAll(filters)` - lista zamówień
- `findById(id)` - szczegóły zamówienia
- `matchWithProductionOrders(glassOrderId)` - dopasowanie do Orders
- `validateOrder(glassOrderId)` - walidacja ilości

```typescript
import { PrismaClient } from '@prisma/client';
import { parseGlassOrderTxt } from './parsers/glass-order-txt-parser.js';

export class GlassOrderService {
  constructor(private prisma: PrismaClient) {}

  async importFromTxt(fileContent: string | Buffer, filename: string) {
    const parsed = parseGlassOrderTxt(fileContent);

    // Create GlassOrder
    const glassOrder = await this.prisma.glassOrder.create({
      data: {
        glassOrderNumber: parsed.metadata.glassOrderNumber,
        orderDate: parsed.metadata.orderDate,
        supplier: parsed.metadata.supplier,
        orderedBy: parsed.metadata.orderedBy,
        expectedDeliveryDate: parsed.metadata.expectedDeliveryDate,
        status: 'ordered',
        items: {
          create: parsed.items.map((item) => ({
            orderNumber: item.orderNumber,
            orderSuffix: item.orderSuffix || null,
            position: item.position,
            glassType: item.glassType,
            widthMm: item.widthMm,
            heightMm: item.heightMm,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Auto-match with production orders
    await this.matchWithProductionOrders(glassOrder.id);

    // Auto-validate
    await this.validateOrder(glassOrder.id);

    return glassOrder;
  }

  async matchWithProductionOrders(glassOrderId: number) {
    const items = await this.prisma.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    for (const item of items) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber: item.orderNumber },
      });

      if (order) {
        // Update Order.orderedGlassCount
        await this.prisma.order.update({
          where: { orderNumber: item.orderNumber },
          data: {
            orderedGlassCount: {
              increment: item.quantity,
            },
            glassOrderStatus: 'ordered',
          },
        });
      } else {
        // Create validation: missing production order
        await this.prisma.glassOrderValidation.create({
          data: {
            glassOrderId,
            orderNumber: item.orderNumber,
            validationType: 'missing_production_order',
            severity: 'warning',
            message: `Nie znaleziono zlecenia produkcyjnego ${item.orderNumber}`,
            orderedQuantity: item.quantity,
          },
        });
      }
    }

    return { success: true };
  }

  async validateOrder(glassOrderId: number) {
    // Group items by orderNumber
    const items = await this.prisma.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.orderNumber]) {
        acc[item.orderNumber] = [];
      }
      acc[item.orderNumber].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    const validations = [];

    for (const [orderNumber, orderItems] of Object.entries(grouped)) {
      const orderedQuantity = orderItems.reduce((sum: number, item) => sum + item.quantity, 0);

      // Get delivered quantity
      const deliveryItems = await this.prisma.glassDeliveryItem.findMany({
        where: {
          orderNumber,
          matchStatus: { in: ['matched', 'conflict'] },
        },
      });

      const deliveredQuantity = deliveryItems.reduce((sum: number, item) => sum + item.quantity, 0);

      let severity: 'info' | 'warning' | 'error' = 'info';
      let message = '';
      let validationType = '';

      if (deliveredQuantity === 0) {
        severity = 'warning';
        validationType = 'missing_delivery';
        message = `Brak dostawy dla zlecenia ${orderNumber}`;
      } else if (deliveredQuantity < orderedQuantity) {
        severity = 'warning';
        validationType = 'quantity_mismatch';
        message = `Dostarczone ${deliveredQuantity} z ${orderedQuantity} szyb`;
      } else if (deliveredQuantity > orderedQuantity) {
        severity = 'error';
        validationType = 'quantity_mismatch';
        message = `Dostarczone więcej niż zamówione (${deliveredQuantity} > ${orderedQuantity})`;
      } else {
        severity = 'info';
        validationType = 'quantity_match';
        message = `Zamówienie ${orderNumber} dostarczone kompletnie`;
      }

      const validation = await this.prisma.glassOrderValidation.create({
        data: {
          glassOrderId,
          orderNumber,
          validationType,
          severity,
          orderedQuantity,
          deliveredQuantity,
          message,
        },
      });

      validations.push(validation);
    }

    return validations;
  }

  async findAll(filters?: { status?: string; orderNumber?: string }) {
    return this.prisma.glassOrder.findMany({
      where: {
        status: filters?.status,
        glassOrderNumber: filters?.orderNumber
          ? { contains: filters.orderNumber }
          : undefined,
      },
      include: {
        items: true,
        validationResults: true,
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassOrder.findUnique({
      where: { id },
      include: {
        items: true,
        validationResults: true,
      },
    });
  }
}
```

#### 3.2 Glass Delivery Service

**Plik**: `apps/api/src/services/glassDeliveryService.ts`

**KLUCZOWA METODA**: `matchWithOrders()` - implementuje logikę dopasowywania z walidacją wymiarów TYLKO przy konfliktach suffixów.

```typescript
import { PrismaClient } from '@prisma/client';
import { parseGlassDeliveryCsv } from './parsers/glass-delivery-csv-parser.js';

export class GlassDeliveryService {
  constructor(private prisma: PrismaClient) {}

  async importFromCsv(fileContent: string, filename: string, fileImportId?: number) {
    const parsed = parseGlassDeliveryCsv(fileContent);

    const glassDelivery = await this.prisma.glassDelivery.create({
      data: {
        rackNumber: parsed.metadata.rackNumber,
        customerOrderNumber: parsed.metadata.customerOrderNumber,
        supplierOrderNumber: parsed.metadata.supplierOrderNumber || null,
        deliveryDate: parsed.metadata.deliveryDate,
        fileImportId: fileImportId || null,
        items: {
          create: parsed.items.map((item) => ({
            orderNumber: item.orderNumber,
            orderSuffix: item.orderSuffix || null,
            position: String(item.position),
            widthMm: item.widthMm,
            heightMm: item.heightMm,
            quantity: item.quantity,
            glassComposition: item.glassComposition,
            serialNumber: item.serialNumber,
            clientCode: item.clientCode,
            matchStatus: 'pending',
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Auto-match
    await this.matchWithOrders(glassDelivery.id);

    return glassDelivery;
  }

  async matchWithOrders(deliveryId: number) {
    const deliveryItems = await this.prisma.glassDeliveryItem.findMany({
      where: { glassDeliveryId: deliveryId },
    });

    for (const deliveryItem of deliveryItems) {
      // STEP 1: Try exact match (orderNumber + orderSuffix + dimensions + quantity)
      const exactMatch = await this.prisma.glassOrderItem.findFirst({
        where: {
          orderNumber: deliveryItem.orderNumber,
          orderSuffix: deliveryItem.orderSuffix,
          widthMm: deliveryItem.widthMm,
          heightMm: deliveryItem.heightMm,
          quantity: deliveryItem.quantity,
        },
      });

      if (exactMatch) {
        // Perfect match
        await this.prisma.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'matched',
            matchedItemId: exactMatch.id,
            glassOrderId: exactMatch.glassOrderId,
          },
        });

        // Update Order.deliveredGlassCount
        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 2: Check for SUFFIX CONFLICT
      // IMPORTANT: Compare dimensions ONLY when there's a suffix mismatch!
      const conflictMatch = await this.prisma.glassOrderItem.findFirst({
        where: {
          orderNumber: deliveryItem.orderNumber,
          // Different suffix OR one null and other not null
          NOT: {
            orderSuffix: deliveryItem.orderSuffix,
          },
          // Dimensions with 0mm tolerance (exact match)
          widthMm: deliveryItem.widthMm,
          heightMm: deliveryItem.heightMm,
          quantity: deliveryItem.quantity,
        },
      });

      if (conflictMatch) {
        // Suffix conflict but dimensions match
        await this.prisma.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'conflict',
            matchedItemId: conflictMatch.id,
            glassOrderId: conflictMatch.glassOrderId,
          },
        });

        // Create validation warning
        await this.prisma.glassOrderValidation.create({
          data: {
            glassOrderId: conflictMatch.glassOrderId,
            orderNumber: deliveryItem.orderNumber,
            validationType: 'suffix_mismatch',
            severity: 'warning',
            message: `Konflikt suffixu: zamówione pod '${conflictMatch.orderSuffix || 'brak'}', dostarczone pod '${deliveryItem.orderSuffix || 'brak'}'`,
            details: JSON.stringify({
              deliveryItemId: deliveryItem.id,
              orderItemId: conflictMatch.id,
              dimensions: `${deliveryItem.widthMm}x${deliveryItem.heightMm}`,
            }),
          },
        });

        // Still update delivered count (with warning)
        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 3: No match found at all
      await this.prisma.glassDeliveryItem.update({
        where: { id: deliveryItem.id },
        data: {
          matchStatus: 'unmatched',
        },
      });

      // Create validation error
      await this.prisma.glassOrderValidation.create({
        data: {
          orderNumber: deliveryItem.orderNumber,
          validationType: 'unmatched_delivery',
          severity: 'error',
          message: `Dostarczona szyba bez zamówienia: ${deliveryItem.orderNumber}${deliveryItem.orderSuffix ? '-' + deliveryItem.orderSuffix : ''} (${deliveryItem.widthMm}x${deliveryItem.heightMm})`,
          deliveredQuantity: deliveryItem.quantity,
        },
      });
    }

    // Update Order statuses
    await this.updateOrderStatuses(deliveryItems);

    return { success: true };
  }

  private async updateOrderDeliveredCount(orderNumber: string, quantity: number) {
    await this.prisma.order.updateMany({
      where: { orderNumber },
      data: {
        deliveredGlassCount: {
          increment: quantity,
        },
      },
    });
  }

  private async updateOrderStatuses(deliveryItems: any[]) {
    const orderNumbers = [...new Set(deliveryItems.map((item) => item.orderNumber))];

    for (const orderNumber of orderNumbers) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!order) continue;

      let newStatus = 'not_ordered';

      if (order.orderedGlassCount === 0) {
        newStatus = 'not_ordered';
      } else if (order.deliveredGlassCount === 0) {
        newStatus = 'ordered';
      } else if (order.deliveredGlassCount < order.orderedGlassCount) {
        newStatus = 'partially_delivered';
      } else if (order.deliveredGlassCount === order.orderedGlassCount) {
        newStatus = 'delivered';
      } else {
        newStatus = 'mismatch';
      }

      await this.prisma.order.update({
        where: { orderNumber },
        data: { glassOrderStatus: newStatus },
      });
    }
  }

  async findAll(filters?: { dateFrom?: string; dateTo?: string }) {
    return this.prisma.glassDelivery.findMany({
      where: {
        deliveryDate: {
          gte: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters?.dateTo ? new Date(filters.dateTo) : undefined,
        },
      },
      include: {
        items: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassDelivery.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }
}
```

#### 3.3 Glass Validation Service

**Plik**: `apps/api/src/services/glassValidationService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export class GlassValidationService {
  constructor(private prisma: PrismaClient) {}

  async getValidationDashboard() {
    const allValidations = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalIssues: allValidations.length,
      errors: allValidations.filter((v) => v.severity === 'error').length,
      warnings: allValidations.filter((v) => v.severity === 'warning').length,
      info: allValidations.filter((v) => v.severity === 'info').length,
      byType: {} as Record<string, number>,
    };

    allValidations.forEach((v) => {
      stats.byType[v.validationType] = (stats.byType[v.validationType] || 0) + 1;
    });

    return {
      stats,
      recentIssues: allValidations.slice(0, 20),
    };
  }

  async resolveValidation(validationId: number, resolvedBy: string, notes?: string) {
    return this.prisma.glassOrderValidation.update({
      where: { id: validationId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        details: notes,
      },
    });
  }

  async getValidationsByOrder(orderNumber: string) {
    return this.prisma.glassOrderValidation.findMany({
      where: { orderNumber },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

---

### ETAP 4: API Routes & Handlers

#### 4.1 Glass Orders Routes

**Plik**: `apps/api/src/routes/glass-orders.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { GlassOrderHandler } from '../handlers/glassOrderHandler.js';
import { GlassOrderService } from '../services/glassOrderService.js';
import { prisma } from '../index.js';

export const glassOrderRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassOrderService(prisma);
  const handler = new GlassOrderHandler(service);

  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromTxt.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
  fastify.get('/:id/summary', handler.getSummary.bind(handler));
  fastify.post('/:id/validate', handler.validate.bind(handler));
  fastify.get('/:id/validations', handler.getValidations.bind(handler));
  fastify.patch('/:id/status', handler.updateStatus.bind(handler));
};
```

#### 4.2 Glass Order Handler

**Plik**: `apps/api/src/handlers/glassOrderHandler.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassOrderService } from '../services/glassOrderService.js';

export class GlassOrderHandler {
  constructor(private service: GlassOrderService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const { status, orderNumber } = request.query as any;
    const orders = await this.service.findAll({ status, orderNumber });
    return reply.send(orders);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const order = await this.service.findById(id);

    if (!order) {
      return reply.status(404).send({ error: 'Nie znaleziono zamówienia' });
    }

    return reply.send(order);
  }

  async importFromTxt(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku' });
      }

      const buffer = await data.toBuffer();
      const order = await this.service.importFromTxt(buffer, data.filename);

      return reply.status(201).send(order);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    await this.service.delete(id);
    return reply.status(204).send();
  }

  async getSummary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const summary = await this.service.getSummary(id);
    return reply.send(summary);
  }

  async validate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const validations = await this.service.validateOrder(id);
    return reply.send(validations);
  }

  async getValidations(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const validations = await this.service.getValidations(id);
    return reply.send(validations);
  }

  async updateStatus(request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    const { status } = request.body;
    const order = await this.service.updateStatus(id, status);
    return reply.send(order);
  }
}
```

#### 4.3 Rejestracja routes w serwerze

**Plik**: `apps/api/src/index.ts`

Dodaj na początku pliku (po innych importach):

```typescript
import { glassOrderRoutes } from './routes/glass-orders.js';
import { glassDeliveryRoutes } from './routes/glass-deliveries.js';
import { glassValidationRoutes } from './routes/glass-validations.js';
```

Następnie zarejestruj routes (przed `await fastify.listen(...)`):

```typescript
await fastify.register(glassOrderRoutes, { prefix: '/api/glass-orders' });
await fastify.register(glassDeliveryRoutes, { prefix: '/api/glass-deliveries' });
await fastify.register(glassValidationRoutes, { prefix: '/api/glass-validations' });
```

**WAŻNE**: Upewnij się, że Fastify ma plugin do obsługi plików:

```bash
cd apps/api
pnpm add @fastify/multipart
```

W `apps/api/src/index.ts` dodaj:

```typescript
import multipart from '@fastify/multipart';

// ...

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

---

### ETAP 5: Frontend API Layer

#### 5.1 TypeScript Types

**Plik**: `apps/web/src/features/glass/types.ts`

```typescript
export interface GlassOrder {
  id: number;
  glassOrderNumber: string;
  orderDate: Date | string;
  supplier: string;
  orderedBy: string | null;
  expectedDeliveryDate: Date | string | null;
  actualDeliveryDate: Date | string | null;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: GlassOrderItem[];
  validationResults?: GlassOrderValidation[];
  deliveryItems?: GlassDeliveryItem[];
}

export interface GlassOrderItem {
  id: number;
  glassOrderId: number;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  glassType: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  createdAt: Date | string;
  glassOrder?: GlassOrder;
}

export interface GlassDelivery {
  id: number;
  rackNumber: string;
  customerOrderNumber: string;
  supplierOrderNumber: string | null;
  deliveryDate: Date | string;
  fileImportId: number | null;
  createdAt: Date | string;
  items?: GlassDeliveryItem[];
  fileImport?: {
    id: number;
    filename: string;
  };
}

export interface GlassDeliveryItem {
  id: number;
  glassDeliveryId: number;
  glassOrderId: number | null;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  glassComposition: string | null;
  serialNumber: string | null;
  clientCode: string | null;
  matchStatus: 'pending' | 'matched' | 'conflict' | 'unmatched';
  matchedItemId: number | null;
  createdAt: Date | string;
  glassDelivery?: GlassDelivery;
  glassOrder?: GlassOrder;
}

export interface GlassOrderValidation {
  id: number;
  glassOrderId: number | null;
  orderNumber: string;
  validationType: string;
  severity: 'info' | 'warning' | 'error';
  expectedQuantity: number | null;
  orderedQuantity: number | null;
  deliveredQuantity: number | null;
  message: string;
  details: string | null;
  resolved: boolean;
  resolvedAt: Date | string | null;
  resolvedBy: string | null;
  createdAt: Date | string;
  glassOrder?: GlassOrder;
}

export interface GlassOrderFilters {
  status?: string;
  orderNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
}

export interface ValidationReport {
  orderNumber: string;
  status: 'ok' | 'warning' | 'error';
  orderedGlassCount: number;
  deliveredGlassCount: number;
  issues: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    details?: any;
    resolved: boolean;
    createdAt: Date | string;
  }>;
}

export interface DashboardData {
  stats: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    byType: Record<string, number>;
  };
  recentIssues: GlassOrderValidation[];
}
```

#### 5.2 API Wrappers

**Plik**: `apps/web/src/features/glass/api/glassOrdersApi.ts`

```typescript
import type { GlassOrder, GlassOrderFilters, GlassOrderValidation } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const glassOrdersApi = {
  getAll: (filters?: GlassOrderFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.orderNumber) params.append('orderNumber', filters.orderNumber);

    return fetchApi<GlassOrder[]>(`/api/glass-orders?${params.toString()}`);
  },

  getById: (id: number) => fetchApi<GlassOrder>(`/api/glass-orders/${id}`),

  importFromTxt: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/glass-orders/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Import failed' }));
      throw new Error(error.error || 'Import failed');
    }

    return response.json() as Promise<GlassOrder>;
  },

  delete: (id: number) =>
    fetchApi(`/api/glass-orders/${id}`, { method: 'DELETE' }),

  getSummary: (id: number) => fetchApi(`/api/glass-orders/${id}/summary`),

  validate: (id: number) =>
    fetchApi<GlassOrderValidation[]>(`/api/glass-orders/${id}/validate`, { method: 'POST' }),

  getValidations: (id: number) =>
    fetchApi<GlassOrderValidation[]>(`/api/glass-orders/${id}/validations`),
};
```

#### 5.3 React Query Hooks

**Plik**: `apps/web/src/features/glass/hooks/useGlassOrders.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { glassOrdersApi } from '../api/glassOrdersApi';
import type { GlassOrderFilters } from '../types';

export const glassOrderKeys = {
  all: ['glass-orders'] as const,
  lists: () => [...glassOrderKeys.all, 'list'] as const,
  list: (filters?: GlassOrderFilters) => [...glassOrderKeys.lists(), filters] as const,
  details: () => [...glassOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...glassOrderKeys.details(), id] as const,
  validations: (id: number) => [...glassOrderKeys.detail(id), 'validations'] as const,
};

export function useGlassOrders(filters?: GlassOrderFilters) {
  return useQuery({
    queryKey: glassOrderKeys.list(filters),
    queryFn: () => glassOrdersApi.getAll(filters),
  });
}

export function useGlassOrderDetail(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.detail(id),
    queryFn: () => glassOrdersApi.getById(id),
    enabled: id > 0,
  });
}

export function useImportGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => glassOrdersApi.importFromTxt(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      toast.success(`Zamówienie ${data.glassOrderNumber} zaimportowane pomyślnie`);
    },
    onError: (error: Error) => {
      toast.error(`Błąd importu: ${error.message}`);
    },
  });
}

export function useDeleteGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      toast.success('Zamówienie zostało usunięte');
    },
    onError: (error: Error) => {
      toast.error(`Błąd usuwania: ${error.message}`);
    },
  });
}

export function useValidateGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassOrdersApi.validate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.validations(id) });
      toast.success('Walidacja zakończona');
    },
    onError: (error: Error) => {
      toast.error(`Błąd walidacji: ${error.message}`);
    },
  });
}

export function useGlassOrderValidations(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.validations(id),
    queryFn: () => glassOrdersApi.getValidations(id),
    enabled: id > 0,
  });
}
```

**WAŻNE**: Zainstaluj `sonner` dla toast notifications:

```bash
cd apps/web
pnpm add sonner
```

---

### ETAP 6: Komponenty współdzielone

#### 6.1 GlassStatusBadge

**Plik**: `apps/web/src/components/glass/glass-status-badge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';

interface GlassStatusBadgeProps {
  status: string;
}

export function GlassStatusBadge({ status }: GlassStatusBadgeProps) {
  const variants = {
    not_ordered: { label: 'Nie zamówione', variant: 'secondary' as const, color: 'bg-gray-500' },
    ordered: { label: 'Zamówione', variant: 'default' as const, color: 'bg-yellow-500' },
    partially_delivered: { label: 'Częściowo', variant: 'default' as const, color: 'bg-orange-500' },
    delivered: { label: 'Dostarczone', variant: 'default' as const, color: 'bg-green-500' },
    mismatch: { label: 'Niezgodność', variant: 'destructive' as const, color: 'bg-red-500' },
  };

  const config = variants[status as keyof typeof variants] || variants.not_ordered;

  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
}
```

#### 6.2 MatchStatusIndicator

**Plik**: `apps/web/src/components/glass/match-status-indicator.tsx`

```typescript
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchStatusIndicatorProps {
  status: 'pending' | 'matched' | 'conflict' | 'unmatched';
  showLabel?: boolean;
}

export function MatchStatusIndicator({ status, showLabel = true }: MatchStatusIndicatorProps) {
  const config = {
    pending: {
      icon: Clock,
      label: 'Oczekujące',
      className: 'text-gray-500',
    },
    matched: {
      icon: CheckCircle2,
      label: 'Dopasowane',
      className: 'text-green-600',
    },
    conflict: {
      icon: AlertCircle,
      label: 'Konflikt',
      className: 'text-orange-600',
    },
    unmatched: {
      icon: XCircle,
      label: 'Niedopasowane',
      className: 'text-red-600',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-sm">{label}</span>}
    </div>
  );
}
```

#### 6.3 ValidationIssueList

**Plik**: `apps/web/src/components/glass/validation-issue-list.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { GlassOrderValidation } from '@/features/glass/types';

interface ValidationIssueListProps {
  issues: GlassOrderValidation[];
  onResolve?: (validationId: number) => void;
  isResolving?: boolean;
}

export function ValidationIssueList({ issues, onResolve, isResolving }: ValidationIssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Brak problemów do wyświetlenia
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const SeverityIcon = {
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[issue.severity] || Info;

        const severityColor = {
          error: 'text-red-600 bg-red-50 border-red-200',
          warning: 'text-orange-600 bg-orange-50 border-orange-200',
          info: 'text-blue-600 bg-blue-50 border-blue-200',
        }[issue.severity];

        return (
          <div
            key={issue.id}
            className={`rounded-lg border p-3 ${issue.resolved ? 'opacity-60' : ''} ${severityColor}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <SeverityIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{issue.message}</p>

                  {(issue.orderedQuantity !== null || issue.deliveredQuantity !== null) && (
                    <div className="flex gap-3 text-xs">
                      {issue.orderedQuantity !== null && (
                        <span>Zamówione: {issue.orderedQuantity}</span>
                      )}
                      {issue.deliveredQuantity !== null && (
                        <span>Dostarczone: {issue.deliveredQuantity}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {issue.validationType}
                    </Badge>
                    <span>
                      {format(new Date(issue.createdAt), 'dd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>

                  {issue.resolved && issue.resolvedBy && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        Rozwiązane przez {issue.resolvedBy}
                        {issue.resolvedAt &&
                          ` · ${format(new Date(issue.resolvedAt), 'dd MMM yyyy', { locale: pl })}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!issue.resolved && onResolve && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResolve(issue.id)}
                  disabled={isResolving}
                >
                  Rozwiąż
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### 6.4 GlassValidationPanel

**Plik**: `apps/web/src/components/glass/glass-validation-panel.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassStatusBadge } from './glass-status-badge';
import { ValidationIssueList } from './validation-issue-list';
import { useGlassValidationByOrder, useResolveGlassValidation } from '@/features/glass/hooks/useGlassValidations';
import { RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface GlassValidationPanelProps {
  orderNumber: string;
}

export function GlassValidationPanel({ orderNumber }: GlassValidationPanelProps) {
  const { data: report, isLoading, error, refetch } = useGlassValidationByOrder(orderNumber);
  const resolveValidation = useResolveGlassValidation();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <p className="text-sm text-red-600">
            Błąd podczas ładowania walidacji: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  const handleResolve = async (validationId: number) => {
    await resolveValidation.mutateAsync({
      id: validationId,
      resolvedBy: 'System', // TODO: Get from user context
      notes: 'Rozwiązane z poziomu panelu walidacji',
    });
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Status Szyb</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <GlassStatusBadge status={report.status} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-blue-50 p-3">
            <p className="text-xs text-muted-foreground">Zamówione</p>
            <p className="text-2xl font-bold text-blue-600">
              {report.orderedGlassCount}
            </p>
          </div>

          <div className="rounded-lg border bg-green-50 p-3">
            <p className="text-xs text-muted-foreground">Dostarczone</p>
            <p className="text-2xl font-bold text-green-600">
              {report.deliveredGlassCount}
            </p>
          </div>

          <div className="rounded-lg border bg-orange-50 p-3">
            <p className="text-xs text-muted-foreground">Różnica</p>
            <p className="text-2xl font-bold text-orange-600">
              {Math.abs(report.orderedGlassCount - report.deliveredGlassCount)}
            </p>
          </div>
        </div>

        {/* Validation Issues */}
        {report.issues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Problemy ({report.issues.filter((i) => !i.resolved).length})
              </h4>
              <Link href={`/zestawienia/szyby?order=${orderNumber}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  Zobacz szczegóły
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <ValidationIssueList
              issues={report.issues as any}
              onResolve={handleResolve}
              isResolving={resolveValidation.isPending}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### ETAP 7: Strona zamówień szyb

**Plik**: `apps/web/src/app/zamowienia-szyb/page.tsx`

Zawiera:
- Stats cards (total, active, problems)
- Search & filters
- Orders table z kolumnami: numer, dostawca, daty, status, pozycje, problemy
- Import dialog
- Detail modal

[Kod dostępny w poprzednich plikach - zbyt długi, aby tu włączyć]

---

## BŁĘDY DO UNIKNIĘCIA

### ❌ BŁĄD 1: Używanie `prisma migrate dev` w Claude Code

**Problem**: Środowisko non-interactive, migrate dev wymaga interakcji.

**Rozwiązanie**: Użyj `npx prisma db push --accept-data-loss` i `npx prisma generate`.

---

### ❌ BŁĄD 2: Brak sprawdzania `items?.` (optional chaining)

**Problem**: TypeScript errors typu "Property 'items' is possibly 'undefined'".

**Gdzie występuje**:
- `delivery.items.forEach(...)` → `delivery.items?.forEach(...)`
- `delivery.itemCount` → `delivery.items?.length || 0`

**Rozwiązanie**: ZAWSZE używaj optional chaining dla relacji Prisma:
```typescript
delivery.items?.map(...)
delivery.items?.length || 0
order.validationResults?.filter(...)
```

---

### ❌ BŁĄD 3: Niepoprawne nazwiska właściwości w typach

**Problem**: Używanie properties które nie istnieją w typie (np. `delivery.itemCount`, `item.name`, `item.width`).

**Rozwiązanie**: Dokładnie sprawdź interfejs w `types.ts` przed użyciem:
- ✅ `items?.length` zamiast `itemCount`
- ✅ `widthMm` zamiast `width`
- ✅ `heightMm` zamiast `height`
- ✅ `fileImportId` zamiast `importId`

---

### ❌ BŁĄD 4: Zapomnienie o instalacji zależności

**Pakiety które MUSISZ zainstalować**:

Backend:
```bash
cd apps/api
pnpm add iconv-lite @fastify/multipart
pnpm add -D @types/iconv-lite
```

Frontend:
```bash
cd apps/web
pnpm add sonner
```

---

### ❌ BŁĄD 5: Nie używanie `.bind(handler)` w routes

**Problem**: Context loss w handlerii Fastify.

**Złe**:
```typescript
fastify.get('/', handler.getAll); // ❌ `this` będzie undefined
```

**Dobre**:
```typescript
fastify.get('/', handler.getAll.bind(handler)); // ✅
```

---

### ❌ BŁĄD 6: Porównywanie wymiarów zawsze (główny błąd biznesowy!)

**KRYTYCZNE**: Wymiary porównuj **TYLKO** gdy jest konflikt suffixów!

**Złe**:
```typescript
// ❌ Zawsze porównuje wymiary
const match = await prisma.glassOrderItem.findFirst({
  where: {
    orderNumber: deliveryItem.orderNumber,
    widthMm: deliveryItem.widthMm,
    heightMm: deliveryItem.heightMm,
  },
});
```

**Dobre**:
```typescript
// ✅ Krok 1: Exact match (z suffixem)
const exactMatch = await prisma.glassOrderItem.findFirst({
  where: {
    orderNumber: deliveryItem.orderNumber,
    orderSuffix: deliveryItem.orderSuffix,
    widthMm: deliveryItem.widthMm,
    heightMm: deliveryItem.heightMm,
  },
});

if (exactMatch) {
  // Dopasowane
  return;
}

// ✅ Krok 2: TYLKO gdy suffix się różni, sprawdź wymiary
const conflictMatch = await prisma.glassOrderItem.findFirst({
  where: {
    orderNumber: deliveryItem.orderNumber,
    NOT: { orderSuffix: deliveryItem.orderSuffix },
    widthMm: deliveryItem.widthMm, // 0mm tolerance
    heightMm: deliveryItem.heightMm,
  },
});
```

---

### ❌ BŁĄD 7: Nieprawidłowe relacje w Prisma

**Problem**: Zapomnienie o nazwanych relacjach lub bidirectional relations.

**Złe**:
```prisma
model Order {
  glassOrderItems GlassOrderItem[] // ❌ Brak nazwy relacji
}

model GlassOrderItem {
  order Order @relation(fields: [orderNumber], references: [orderNumber])
}
```

**Dobre**:
```prisma
model Order {
  glassOrderItems GlassOrderItem[] @relation("OrderGlassItems") // ✅
}

model GlassOrderItem {
  order Order? @relation("OrderGlassItems", fields: [orderNumber], references: [orderNumber]) // ✅
}
```

---

### ❌ BŁĄD 8: Brak type assertions dla reduce

**Problem**: TypeScript nie potrafi wywnioskować typu akumulatora.

**Złe**:
```typescript
items.reduce((sum, item) => sum + item.quantity, 0) // ❌ implicit any
```

**Dobre**:
```typescript
items.reduce((sum: number, item) => sum + item.quantity, 0) // ✅
```

---

### ❌ BŁĄD 9: Brak obsługi kodowania w parserze TXT

**Problem**: Polskie znaki w Windows-1250 wyświetlają się jako �.

**Rozwiązanie**: ZAWSZE używaj `iconv-lite` z detekcją kodowania:

```typescript
import iconv from 'iconv-lite';

function detectEncoding(buffer: Buffer): string {
  const utf8Text = buffer.toString('utf-8');
  if (!/�/.test(utf8Text)) {
    return 'utf-8';
  }
  return 'windows-1250';
}

const encoding = detectEncoding(fileBuffer);
const content = iconv.decode(fileBuffer, encoding);
```

---

### ❌ BŁĄD 10: Nieprawidłowe parsowanie numerów zleceń

**Problem**: Regex nie obsługuje wszystkich formatów (np. "3      53407 poz.3").

**Rozwiązanie**: Użyj regex z obsługą spacji i fallbacków:

```typescript
// Główny pattern (z leadning number)
const match = trimmed.match(/\s*(\d+)\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

if (match) {
  return {
    orderNumber: match[2], // Drugi number to order number
    orderSuffix: match[3] || null,
  };
}

// Fallback (bez leading number)
const simpleMatch = trimmed.match(/(\d+)(?:-([a-zA-Z]+))?/);
```

---

## KOLEJNOŚĆ IMPLEMENTACJI (CHECKLIST)

1. ✅ **ETAP 1**: Rozszerz schema.prisma → `db push` → `generate`
2. ✅ **ETAP 2**: Napisz parsery (TXT + CSV) + zainstaluj `iconv-lite`
3. ✅ **ETAP 3**: Napisz serwisy (GlassOrderService, GlassDeliveryService, GlassValidationService)
4. ✅ **ETAP 4**: Stwórz routes + handlers + zarejestruj w index.ts + zainstaluj `@fastify/multipart`
5. ✅ **ETAP 5**: Frontend types + API wrappers + React Query hooks + zainstaluj `sonner`
6. ✅ **ETAP 6**: Komponenty współdzielone (6 komponentów)
7. ✅ **ETAP 7**: Strona `/zamowienia-szyb`
8. ⏳ **ETAP 8**: Strona `/dostawy-szyb`
9. ⏳ **ETAP 9**: Dashboard `/zestawienia/szyby`
10. ⏳ **ETAP 10**: Integracja w istniejących widokach
11. ⏳ **ETAP 11**: Testy E2E
12. ⏳ **ETAP 12**: Dokumentacja

---

## TESTOWANIE

Po każdym etapie uruchom:

```bash
# Frontend TypeScript check
cd apps/web
npx tsc --noEmit

# Backend TypeScript check
cd apps/api
npx tsc --noEmit

# Sprawdź czy backend się kompiluje
cd apps/api
pnpm build
```

---

## URUCHOMIENIE APLIKACJI

```bash
# Terminal 1: Backend
cd apps/api
pnpm dev

# Terminal 2: Frontend
cd apps/web
pnpm dev
```

Backend: http://localhost:3001
Frontend: http://localhost:3000

---

## PODSUMOWANIE KLUCZOWYCH REGUŁ

1. **Wymiary porównuj TYLKO przy konfliktach suffixów** (tolerancja 0mm)
2. **Używaj optional chaining** dla wszystkich relacji Prisma (`items?.`, `validationResults?.`)
3. **`db push --accept-data-loss`** zamiast `migrate dev`
4. **Zawsze instaluj** `iconv-lite`, `@fastify/multipart`, `sonner`
5. **`.bind(handler)`** w routes Fastify
6. **Type assertions** w reduce: `(sum: number, item) =>`
7. **Named relations** w Prisma (`@relation("OrderGlassItems")`)
8. **Dokładnie sprawdź types.ts** przed użyciem properties

---

Powodzenia w implementacji! 🚀
