# OKNO 3: Glass Tracking - Backend

## ZALEŻNOŚĆ: Wymaga ukończenia OKNA 1!

Przed rozpoczęciem upewnij się, że Okno 1 (migracja bazy) jest zakończone.
Modele `GlassOrder`, `GlassOrderItem`, `GlassDelivery`, `GlassDeliveryItem`, `GlassOrderValidation` muszą już istnieć.

---

## Cel

Zaimplementować backend dla systemu śledzenia zamówień i dostaw szyb:
- Parsery plików TXT (zamówienia) i CSV (dostawy)
- Serwisy z logiką biznesową
- Handlery i routes API

---

## Struktura plików do utworzenia

```
apps/api/src/
├── services/
│   ├── parsers/
│   │   ├── glass-order-txt-parser.ts    (NOWY)
│   │   └── glass-delivery-csv-parser.ts (NOWY)
│   ├── glassOrderService.ts             (NOWY)
│   ├── glassDeliveryService.ts          (NOWY)
│   └── glassValidationService.ts        (NOWY)
├── handlers/
│   ├── glassOrderHandler.ts             (NOWY)
│   └── glassDeliveryHandler.ts          (NOWY)
├── routes/
│   ├── glass-orders.ts                  (NOWY)
│   ├── glass-deliveries.ts              (NOWY)
│   └── glass-validations.ts             (NOWY)
└── index.ts                             (EDYCJA - rejestracja routes)
```

---

## Krok 1: Instalacja zależności

```bash
cd apps/api
pnpm add iconv-lite
pnpm add -D @types/iconv-lite
```

---

## Krok 2: Parser TXT (Zamówienia szyb)

### Plik: `apps/api/src/services/parsers/glass-order-txt-parser.ts`

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
  // Sprawdź czy UTF-8 (szukaj BOM lub poprawnych sekwencji)
  const utf8Text = buffer.toString('utf-8');
  if (!/�/.test(utf8Text) && !/\uFFFD/.test(utf8Text)) {
    return 'utf-8';
  }
  // Domyślnie Windows-1250 dla polskich znaków
  return 'windows-1250';
}

function parseOrderReference(reference: string): {
  orderNumber: string;
  orderSuffix: string | null;
  fullReference: string;
} {
  const trimmed = reference.trim();

  // Pattern: "53479 poz.1" lub "53480-a poz.2"
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

function parsePolishDate(dateStr: string): Date {
  // Format: "19.11.2025" lub "3 12 25"

  // Format DD.MM.YYYY
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    return new Date(
      parseInt(dotMatch[3]),
      parseInt(dotMatch[2]) - 1,
      parseInt(dotMatch[1])
    );
  }

  // Format D M YY (z "Dostawa na")
  const spaceMatch = dateStr.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{2})/);
  if (spaceMatch) {
    return new Date(
      2000 + parseInt(spaceMatch[3]),
      parseInt(spaceMatch[2]) - 1,
      parseInt(spaceMatch[1])
    );
  }

  return new Date();
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
  let orderDate = new Date();
  let glassOrderNumber = '';
  let supplier = 'NIEZNANY';

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Data i godzina
    const dateMatch = line.match(/Data\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (dateMatch) {
      orderDate = parsePolishDate(dateMatch[1]);
    }

    // Numer zamówienia
    const numberMatch = line.match(/Numer\s+(.+)/i);
    if (numberMatch) {
      glassOrderNumber = numberMatch[1].trim();
    }

    // Dostawca
    if (/PILKINGTON|GUARDIAN|SAINT.?GOBAIN/i.test(line)) {
      supplier = line.trim().toUpperCase();
    }
  }

  if (!glassOrderNumber) {
    throw new Error('Nie znaleziono numeru zamówienia w pliku');
  }

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

    // Stop at footer (signature or empty lines)
    if (!line || /^\s*[A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]/.test(line)) {
      // Check for delivery date in remaining lines
      continue;
    }

    // Skip lines that look like footer
    if (/Dostawa na/i.test(line)) {
      continue;
    }

    // Parse table row - format: Symbol | Ilość | Szer | Wys | Poz | Zlecenie
    // Może być tab-separated lub fixed-width
    const parts = line.split(/\s{2,}|\t/).filter(Boolean);

    if (parts.length < 6) continue;

    try {
      const glassType = parts[0];
      const quantity = parseInt(parts[1]);
      const widthMm = parseInt(parts[2]);
      const heightMm = parseInt(parts[3]);
      const position = parts[4];
      const orderRef = parts.slice(5).join(' '); // Może być rozdzielone

      if (isNaN(quantity) || isNaN(widthMm) || isNaN(heightMm)) {
        continue;
      }

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

  for (let i = tableStartIndex + items.length; i < lines.length; i++) {
    const line = lines[i];

    // Signature (W.Kania, M.Kowalski, etc.)
    const nameMatch = line.match(/^\s*([A-ZŻŹĆĄĘŁÓŚŃ]\.[A-Za-zżźćąęłóśń]+)/);
    if (nameMatch) {
      orderedBy = nameMatch[1];
    }

    // Delivery date
    const deliveryMatch = line.match(/Dostawa\s+na\s+(\d{1,2}\s+\d{1,2}\s+\d{2})/i);
    if (deliveryMatch) {
      expectedDeliveryDate = parsePolishDate(deliveryMatch[1]);
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

---

## Krok 3: Parser CSV (Dostawy szyb)

### Plik: `apps/api/src/services/parsers/glass-delivery-csv-parser.ts`

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

  // Pattern: "3      53407 poz.3" lub "53407-a poz.3"
  // First number is position, second is order number
  const match = trimmed.match(/\d*\s*(\d+)(?:-([a-zA-Z]+))?\s*(?:poz\.(\d+))?/);

  if (match) {
    return {
      orderNumber: match[1],
      orderSuffix: match[2] || null,
      fullReference: trimmed,
    };
  }

  // Fallback - just extract numbers
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
  const findIndex = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h =>
        h.toLowerCase().includes(name.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const indices = {
    rackNumber: findIndex(['Numer stojaka', 'stojak']),
    customerOrderNumber: findIndex(['Numer zamówienia klienta', 'zamówienia klienta']),
    supplierOrderNumber: findIndex(['Numer zamówienia dostawcy', 'zamówienia dostawcy']),
    position: findIndex(['Pozycja']),
    width: findIndex(['Szerokosc', 'Szerokość', 'szerok']),
    height: findIndex(['Wysokosc', 'Wysokość', 'wysok']),
    quantity: findIndex(['Sztuk', 'Ilość', 'ilosc']),
    orderRef: findIndex(['Zlecenie']),
    composition: findIndex(['Zespolenie', 'zespol']),
    serialNumber: findIndex(['Numer seryjny', 'seryjny']),
    clientCode: findIndex(['Kod klienta', 'klient']),
  };

  // Validate required columns
  if (indices.orderRef === -1) {
    throw new Error('Brak wymaganej kolumny "Zlecenie" w pliku CSV');
  }

  const items: ParsedGlassDeliveryCsv['items'] = [];
  const orderBreakdown: Record<string, { count: number; quantity: number }> = {};

  let rackNumber = '';
  let customerOrderNumber = '';
  let supplierOrderNumber = '';

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';').map((v) => v.trim());

    if (values.length < Math.max(...Object.values(indices).filter(v => v >= 0)) + 1) {
      continue;
    }

    // Get metadata from first row
    if (i === 1) {
      rackNumber = indices.rackNumber >= 0 ? values[indices.rackNumber] || '' : '';
      customerOrderNumber = indices.customerOrderNumber >= 0 ? values[indices.customerOrderNumber] || '' : '';
      supplierOrderNumber = indices.supplierOrderNumber >= 0 ? values[indices.supplierOrderNumber] || '' : '';
    }

    try {
      const orderRef = values[indices.orderRef] || '';
      if (!orderRef) continue;

      const { orderNumber, orderSuffix, fullReference } = parseOrderReference(orderRef);

      const item = {
        position: indices.position >= 0 ? parseInt(values[indices.position]) || i : i,
        widthMm: indices.width >= 0 ? parseInt(values[indices.width]) || 0 : 0,
        heightMm: indices.height >= 0 ? parseInt(values[indices.height]) || 0 : 0,
        quantity: indices.quantity >= 0 ? parseInt(values[indices.quantity]) || 1 : 1,
        orderNumber,
        orderSuffix: orderSuffix || undefined,
        fullReference,
        glassComposition: indices.composition >= 0 ? values[indices.composition] || '' : '',
        serialNumber: indices.serialNumber >= 0 ? values[indices.serialNumber] || '' : '',
        clientCode: indices.clientCode >= 0 ? values[indices.clientCode] || '' : '',
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

## Krok 4: Glass Order Service

### Plik: `apps/api/src/services/glassOrderService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { parseGlassOrderTxt, ParsedGlassOrderTxt } from './parsers/glass-order-txt-parser.js';

export class GlassOrderService {
  constructor(private prisma: PrismaClient) {}

  async importFromTxt(fileContent: string | Buffer, filename: string) {
    const parsed = parseGlassOrderTxt(fileContent);

    // Check if already exists
    const existing = await this.prisma.glassOrder.findUnique({
      where: { glassOrderNumber: parsed.metadata.glassOrderNumber },
    });

    if (existing) {
      throw new Error(`Zamówienie ${parsed.metadata.glassOrderNumber} już istnieje`);
    }

    // Create GlassOrder with items
    const glassOrder = await this.prisma.glassOrder.create({
      data: {
        glassOrderNumber: parsed.metadata.glassOrderNumber,
        orderDate: parsed.metadata.orderDate,
        supplier: parsed.metadata.supplier,
        orderedBy: parsed.metadata.orderedBy || null,
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

    // Match with production orders and update counts
    await this.matchWithProductionOrders(glassOrder.id);

    return glassOrder;
  }

  async matchWithProductionOrders(glassOrderId: number) {
    const items = await this.prisma.glassOrderItem.findMany({
      where: { glassOrderId },
    });

    // Group by orderNumber
    const byOrder = new Map<string, number>();
    for (const item of items) {
      const current = byOrder.get(item.orderNumber) || 0;
      byOrder.set(item.orderNumber, current + item.quantity);
    }

    // Update each Order
    for (const [orderNumber, quantity] of byOrder) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
      });

      if (order) {
        await this.prisma.order.update({
          where: { orderNumber },
          data: {
            orderedGlassCount: { increment: quantity },
            glassOrderStatus: 'ordered',
          },
        });
      } else {
        // Create validation warning for missing order
        await this.prisma.glassOrderValidation.create({
          data: {
            glassOrderId,
            orderNumber,
            validationType: 'missing_production_order',
            severity: 'warning',
            orderedQuantity: quantity,
            message: `Nie znaleziono zlecenia produkcyjnego ${orderNumber}`,
          },
        });
      }
    }
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
        validationResults: {
          where: { resolved: false },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderNumber: 'asc' },
        },
        validationResults: true,
        deliveryItems: true,
      },
    });
  }

  async delete(id: number) {
    // Get items to decrement order counts
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!glassOrder) {
      throw new Error('Zamówienie nie istnieje');
    }

    // Decrement Order.orderedGlassCount
    const byOrder = new Map<string, number>();
    for (const item of glassOrder.items) {
      const current = byOrder.get(item.orderNumber) || 0;
      byOrder.set(item.orderNumber, current + item.quantity);
    }

    for (const [orderNumber, quantity] of byOrder) {
      await this.prisma.order.updateMany({
        where: { orderNumber },
        data: {
          orderedGlassCount: { decrement: quantity },
        },
      });
    }

    // Delete glass order (cascade deletes items and validations)
    await this.prisma.glassOrder.delete({
      where: { id },
    });
  }

  async getSummary(id: number) {
    const glassOrder = await this.prisma.glassOrder.findUnique({
      where: { id },
      include: {
        items: true,
        deliveryItems: true,
        validationResults: true,
      },
    });

    if (!glassOrder) {
      throw new Error('Zamówienie nie istnieje');
    }

    // Group by order number
    const orderBreakdown: Record<string, {
      orderNumber: string;
      ordered: number;
      delivered: number;
      status: string;
    }> = {};

    for (const item of glassOrder.items) {
      const key = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;

      if (!orderBreakdown[key]) {
        orderBreakdown[key] = {
          orderNumber: key,
          ordered: 0,
          delivered: 0,
          status: 'pending',
        };
      }
      orderBreakdown[key].ordered += item.quantity;
    }

    for (const item of glassOrder.deliveryItems) {
      const key = item.orderSuffix
        ? `${item.orderNumber}-${item.orderSuffix}`
        : item.orderNumber;

      if (orderBreakdown[key]) {
        orderBreakdown[key].delivered += item.quantity;
      }
    }

    // Calculate statuses
    for (const order of Object.values(orderBreakdown)) {
      if (order.delivered === 0) {
        order.status = 'pending';
      } else if (order.delivered < order.ordered) {
        order.status = 'partial';
      } else if (order.delivered === order.ordered) {
        order.status = 'complete';
      } else {
        order.status = 'excess';
      }
    }

    return {
      glassOrderNumber: glassOrder.glassOrderNumber,
      totalOrdered: glassOrder.items.reduce((sum, i) => sum + i.quantity, 0),
      totalDelivered: glassOrder.deliveryItems.reduce((sum, i) => sum + i.quantity, 0),
      orderBreakdown: Object.values(orderBreakdown),
      issues: glassOrder.validationResults.filter(v => !v.resolved),
    };
  }

  async getValidations(id: number) {
    return this.prisma.glassOrderValidation.findMany({
      where: { glassOrderId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.glassOrder.update({
      where: { id },
      data: { status },
    });
  }
}
```

---

## Krok 5: Glass Delivery Service

### Plik: `apps/api/src/services/glassDeliveryService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { parseGlassDeliveryCsv } from './parsers/glass-delivery-csv-parser.js';

export class GlassDeliveryService {
  constructor(private prisma: PrismaClient) {}

  async importFromCsv(fileContent: string, filename: string, deliveryDate?: Date) {
    const parsed = parseGlassDeliveryCsv(fileContent);

    // Create GlassDelivery with items
    const glassDelivery = await this.prisma.glassDelivery.create({
      data: {
        rackNumber: parsed.metadata.rackNumber || filename,
        customerOrderNumber: parsed.metadata.customerOrderNumber,
        supplierOrderNumber: parsed.metadata.supplierOrderNumber || null,
        deliveryDate: deliveryDate || new Date(),
        items: {
          create: parsed.items.map((item) => ({
            orderNumber: item.orderNumber,
            orderSuffix: item.orderSuffix || null,
            position: String(item.position),
            widthMm: item.widthMm,
            heightMm: item.heightMm,
            quantity: item.quantity,
            glassComposition: item.glassComposition || null,
            serialNumber: item.serialNumber || null,
            clientCode: item.clientCode || null,
            matchStatus: 'pending',
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Match with orders
    await this.matchWithOrders(glassDelivery.id);

    return glassDelivery;
  }

  async matchWithOrders(deliveryId: number) {
    const deliveryItems = await this.prisma.glassDeliveryItem.findMany({
      where: { glassDeliveryId: deliveryId },
    });

    for (const deliveryItem of deliveryItems) {
      // STEP 1: Try exact match
      const exactMatch = await this.prisma.glassOrderItem.findFirst({
        where: {
          orderNumber: deliveryItem.orderNumber,
          orderSuffix: deliveryItem.orderSuffix,
          widthMm: deliveryItem.widthMm,
          heightMm: deliveryItem.heightMm,
        },
      });

      if (exactMatch) {
        await this.prisma.glassDeliveryItem.update({
          where: { id: deliveryItem.id },
          data: {
            matchStatus: 'matched',
            matchedItemId: exactMatch.id,
            glassOrderId: exactMatch.glassOrderId,
          },
        });

        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 2: Check for SUFFIX CONFLICT (dimensions match, suffix different)
      const conflictMatch = await this.prisma.glassOrderItem.findFirst({
        where: {
          orderNumber: deliveryItem.orderNumber,
          NOT: { orderSuffix: deliveryItem.orderSuffix },
          widthMm: deliveryItem.widthMm,
          heightMm: deliveryItem.heightMm,
        },
      });

      if (conflictMatch) {
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
            message: `Konflikt suffixu: zamówione '${conflictMatch.orderSuffix || 'brak'}', dostarczone '${deliveryItem.orderSuffix || 'brak'}'`,
            details: JSON.stringify({
              dimensions: `${deliveryItem.widthMm}x${deliveryItem.heightMm}`,
              deliveryItemId: deliveryItem.id,
              orderItemId: conflictMatch.id,
            }),
          },
        });

        await this.updateOrderDeliveredCount(deliveryItem.orderNumber, deliveryItem.quantity);
        continue;
      }

      // STEP 3: No match found
      await this.prisma.glassDeliveryItem.update({
        where: { id: deliveryItem.id },
        data: { matchStatus: 'unmatched' },
      });

      // Create validation error
      await this.prisma.glassOrderValidation.create({
        data: {
          orderNumber: deliveryItem.orderNumber,
          validationType: 'unmatched_delivery',
          severity: 'error',
          deliveredQuantity: deliveryItem.quantity,
          message: `Dostawa bez zamówienia: ${deliveryItem.orderNumber}${deliveryItem.orderSuffix ? '-' + deliveryItem.orderSuffix : ''} (${deliveryItem.widthMm}x${deliveryItem.heightMm})`,
        },
      });
    }

    // Update Order statuses
    await this.updateOrderStatuses(deliveryItems);
  }

  private async updateOrderDeliveredCount(orderNumber: string, quantity: number) {
    await this.prisma.order.updateMany({
      where: { orderNumber },
      data: {
        deliveredGlassCount: { increment: quantity },
      },
    });
  }

  private async updateOrderStatuses(deliveryItems: any[]) {
    const orderNumbers = [...new Set(deliveryItems.map((i) => i.orderNumber))];

    for (const orderNumber of orderNumbers) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!order) continue;

      const ordered = order.orderedGlassCount || 0;
      const delivered = order.deliveredGlassCount || 0;

      let newStatus = 'not_ordered';

      if (ordered === 0) {
        newStatus = 'not_ordered';
      } else if (delivered === 0) {
        newStatus = 'ordered';
      } else if (delivered < ordered) {
        newStatus = 'partially_delivered';
      } else if (delivered === ordered) {
        newStatus = 'delivered';
      } else {
        newStatus = 'over_delivered';
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
        _count: {
          select: { items: true },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.glassDelivery.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async delete(id: number) {
    const delivery = await this.prisma.glassDelivery.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!delivery) {
      throw new Error('Dostawa nie istnieje');
    }

    // Decrement Order.deliveredGlassCount
    const byOrder = new Map<string, number>();
    for (const item of delivery.items) {
      if (item.matchStatus === 'matched' || item.matchStatus === 'conflict') {
        const current = byOrder.get(item.orderNumber) || 0;
        byOrder.set(item.orderNumber, current + item.quantity);
      }
    }

    for (const [orderNumber, quantity] of byOrder) {
      await this.prisma.order.updateMany({
        where: { orderNumber },
        data: {
          deliveredGlassCount: { decrement: quantity },
        },
      });
    }

    await this.prisma.glassDelivery.delete({
      where: { id },
    });
  }
}
```

---

## Krok 6: Glass Validation Service

### Plik: `apps/api/src/services/glassValidationService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export class GlassValidationService {
  constructor(private prisma: PrismaClient) {}

  async getDashboard() {
    const validations = await this.prisma.glassOrderValidation.findMany({
      where: { resolved: false },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const stats = {
      total: validations.length,
      errors: validations.filter((v) => v.severity === 'error').length,
      warnings: validations.filter((v) => v.severity === 'warning').length,
      info: validations.filter((v) => v.severity === 'info').length,
      byType: {} as Record<string, number>,
    };

    validations.forEach((v) => {
      stats.byType[v.validationType] = (stats.byType[v.validationType] || 0) + 1;
    });

    return {
      stats,
      recentIssues: validations.slice(0, 20),
    };
  }

  async getByOrderNumber(orderNumber: string) {
    return this.prisma.glassOrderValidation.findMany({
      where: { orderNumber },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: number, resolvedBy: string, notes?: string) {
    return this.prisma.glassOrderValidation.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        details: notes ? JSON.stringify({ notes }) : undefined,
      },
    });
  }

  async findAll(filters?: { severity?: string; resolved?: boolean }) {
    return this.prisma.glassOrderValidation.findMany({
      where: {
        severity: filters?.severity,
        resolved: filters?.resolved,
      },
      include: { glassOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

---

## Krok 7: Handlers

### Plik: `apps/api/src/handlers/glassOrderHandler.ts`

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
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    const order = await this.service.findById(id);
    if (!order) {
      return reply.status(404).send({ error: 'Zamówienie nie istnieje' });
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
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    try {
      await this.service.delete(id);
      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getSummary(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    try {
      const summary = await this.service.getSummary(id);
      return reply.send(summary);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getValidations(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    const validations = await this.service.getValidations(id);
    return reply.send(validations);
  }

  async updateStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
    reply: FastifyReply
  ) {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    const { status } = request.body;
    const order = await this.service.updateStatus(id, status);
    return reply.send(order);
  }
}
```

### Plik: `apps/api/src/handlers/glassDeliveryHandler.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { GlassDeliveryService } from '../services/glassDeliveryService.js';

export class GlassDeliveryHandler {
  constructor(private service: GlassDeliveryService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const { dateFrom, dateTo } = request.query as any;
    const deliveries = await this.service.findAll({ dateFrom, dateTo });
    return reply.send(deliveries);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    const delivery = await this.service.findById(id);
    if (!delivery) {
      return reply.status(404).send({ error: 'Dostawa nie istnieje' });
    }

    return reply.send(delivery);
  }

  async importFromCsv(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'Brak pliku' });
      }

      const content = (await data.toBuffer()).toString('utf-8');
      const delivery = await this.service.importFromCsv(content, data.filename);

      return reply.status(201).send(delivery);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Nieprawidłowe ID' });
    }

    try {
      await this.service.delete(id);
      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
```

---

## Krok 8: Routes

### Plik: `apps/api/src/routes/glass-orders.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { GlassOrderHandler } from '../handlers/glassOrderHandler.js';
import { GlassOrderService } from '../services/glassOrderService.js';

export const glassOrderRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassOrderService(fastify.prisma);
  const handler = new GlassOrderHandler(service);

  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromTxt.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
  fastify.get('/:id/summary', handler.getSummary.bind(handler));
  fastify.get('/:id/validations', handler.getValidations.bind(handler));
  fastify.patch('/:id/status', handler.updateStatus.bind(handler));
};
```

### Plik: `apps/api/src/routes/glass-deliveries.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { GlassDeliveryHandler } from '../handlers/glassDeliveryHandler.js';
import { GlassDeliveryService } from '../services/glassDeliveryService.js';

export const glassDeliveryRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassDeliveryService(fastify.prisma);
  const handler = new GlassDeliveryHandler(service);

  fastify.get('/', handler.getAll.bind(handler));
  fastify.get('/:id', handler.getById.bind(handler));
  fastify.post('/import', handler.importFromCsv.bind(handler));
  fastify.delete('/:id', handler.delete.bind(handler));
};
```

### Plik: `apps/api/src/routes/glass-validations.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { GlassValidationService } from '../services/glassValidationService.js';

export const glassValidationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new GlassValidationService(fastify.prisma);

  fastify.get('/dashboard', async (request, reply) => {
    const dashboard = await service.getDashboard();
    return reply.send(dashboard);
  });

  fastify.get('/order/:orderNumber', async (request, reply) => {
    const { orderNumber } = request.params as { orderNumber: string };
    const validations = await service.getByOrderNumber(orderNumber);
    return reply.send(validations);
  });

  fastify.get('/', async (request, reply) => {
    const { severity, resolved } = request.query as any;
    const validations = await service.findAll({
      severity,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    });
    return reply.send(validations);
  });

  fastify.post('/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { resolvedBy, notes } = request.body as { resolvedBy: string; notes?: string };

    const validation = await service.resolve(parseInt(id), resolvedBy, notes);
    return reply.send(validation);
  });
};
```

---

## Krok 9: Rejestracja Routes w index.ts

### Plik: `apps/api/src/index.ts`

Dodaj na początku pliku (po innych importach):

```typescript
import { glassOrderRoutes } from './routes/glass-orders.js';
import { glassDeliveryRoutes } from './routes/glass-deliveries.js';
import { glassValidationRoutes } from './routes/glass-validations.js';
```

Dodaj przed `await fastify.listen(...)`:

```typescript
// Glass Tracking Routes
await fastify.register(glassOrderRoutes, { prefix: '/api/glass-orders' });
await fastify.register(glassDeliveryRoutes, { prefix: '/api/glass-deliveries' });
await fastify.register(glassValidationRoutes, { prefix: '/api/glass-validations' });
```

**UWAGA:** Upewnij się, że `@fastify/multipart` jest zainstalowany i zarejestrowany!

```typescript
import multipart from '@fastify/multipart';

// W konfiguracji fastify:
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

---

## Testowanie API

```bash
# Start serwera
pnpm dev:api

# Test endpoints (w innym terminalu)

# Lista zamówień
curl http://localhost:3001/api/glass-orders

# Import zamówienia (TXT)
curl -X POST http://localhost:3001/api/glass-orders/import \
  -F "file=@impl/przykładowe pliki/zamówinia szyb/02499 AKR 11 GRUDZIEŃ.txt"

# Lista dostaw
curl http://localhost:3001/api/glass-deliveries

# Import dostawy (CSV)
curl -X POST http://localhost:3001/api/glass-deliveries/import \
  -F "file=@impl/przykładowe pliki/dostawy szyb/04188_01469.csv"

# Dashboard walidacji
curl http://localhost:3001/api/glass-validations/dashboard
```

---

## Checklist

- [ ] `iconv-lite` zainstalowany
- [ ] Parser TXT utworzony i działa
- [ ] Parser CSV utworzony i działa
- [ ] GlassOrderService utworzony
- [ ] GlassDeliveryService utworzony
- [ ] GlassValidationService utworzony
- [ ] GlassOrderHandler utworzony
- [ ] GlassDeliveryHandler utworzony
- [ ] Routes glass-orders.ts utworzony
- [ ] Routes glass-deliveries.ts utworzony
- [ ] Routes glass-validations.ts utworzony
- [ ] Routes zarejestrowane w index.ts
- [ ] @fastify/multipart skonfigurowany
- [ ] API działa - test curl

---

## Po zakończeniu

Potwierdź w głównym czacie:
```
Okno 3 zakończone. Glass Tracking Backend zaimplementowany.
Okno 4 może rozpocząć pracę nad frontendem.
```

---

## NIE MODYFIKUJ

- `apps/api/prisma/schema.prisma` (zrobione w Oknie 1)
- `apps/api/src/routes/warehouse.ts` (Okno 2)
- Żadnych plików w `apps/web/` (Okno 4)
