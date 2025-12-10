# System pobierania szczegółów zamówień Schüco - Kompletny prompt implementacji

## Kontekst projektu

Aplikacja zarządza zamówieniami profili okiennych. Istnieje już system pobierania podstawowych danych o dostawach Schüco (CSV scraping). Celem jest rozszerzenie go o pobieranie szczegółowych informacji o pozycjach zamówień (numery artykułów + ilości bel) ze strony szczegółów każdego zamówienia.

**Stack technologiczny:**
- Backend: Node.js + Fastify + Prisma + SQLite + Puppeteer
- Frontend: Next.js 15 + React Query + Tailwind CSS
- Scraping: Puppeteer (strona Angular SPA)

## Cel implementacji

Dodać funkcjonalność pobierania i wyświetlania szczegółowych pozycji zamówień Schüco:
- **Dane do pobrania:** Numer artykułu (np. "19411420"), Ilość wysłanych bel (format "0/2" → 0), Ilość zamówionych bel (format "0/2" → 2), Nazwa artykułu, Wymiary, Konfiguracja, Uszlachetnianie, Tydzień dostawy
- **Źródło:** https://connect.schueco.com/schueco/pl/purchaseOrders/orders/details/{orderNumber}
- **Wyświetlanie:**
  1. Strona dostaw Schüco - rozwijane wiersze z tabelą pozycji
  2. Modal szczegółów zamówienia - sekcja "Profile Schüco"

## Plan implementacji - 10 kroków

### 📋 Krok 1: Baza danych (KRYTYCZNY - zrób jako PIERWSZY!)

**Plik:** `apps/api/prisma/schema.prisma`

**Dodaj nowy model SchucoOrderItem:**

```prisma
model SchucoOrderItem {
  id              Int       @id @default(autoincrement())
  deliveryId      Int       @map("delivery_id")

  // Podstawowe dane pozycji
  position        String    @map("position")          // "1", "2", etc.
  articleNumber   String    @map("article_number")    // "19411420"
  articleName     String    @map("article_name")      // "9411 Ościeżnica..."

  // Ilości bel
  shippedBeams    Int       @map("shipped_beams")     // Wysłane (0 z "0/2")
  orderedBeams    Int       @map("ordered_beams")     // Zamówione (2 z "0/2")
  unit            String    @default("szt.")

  // Dodatkowe szczegóły
  dimensions      String?                             // "6000 mm"
  configuration   String?                             // Konfiguracja
  finishing       String?                             // "Bez lakierowania"
  deliveryWeek    String?   @map("delivery_week")     // "2026/2"
  tracking        String?
  comment         String?

  // Change tracking (wzór: SchucoDelivery)
  changeType      String?   @map("change_type")       // 'new' | 'updated' | null
  changedAt       DateTime? @map("changed_at")
  changedFields   String?   @map("changed_fields")    // JSON array
  previousValues  String?   @map("previous_values")   // JSON object

  // Metadata
  fetchedAt       DateTime  @default(now()) @map("fetched_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relacje
  delivery        SchucoDelivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([deliveryId, articleNumber])
  @@index([deliveryId])
  @@index([articleNumber])
  @@index([changeType])
  @@index([changedAt])
  @@map("schuco_order_items")
}
```

**Rozszerz model SchucoDelivery (znajdź i dodaj pola):**

```prisma
model SchucoDelivery {
  // ... istniejące pola ...

  // DODAJ NA KOŃCU:
  items            SchucoOrderItem[]
  detailsFetched   Boolean   @default(false) @map("details_fetched")
  detailsFetchedAt DateTime? @map("details_fetched_at")
  detailsError     String?   @map("details_error")
}
```

**Wykonaj migrację (BARDZO WAŻNE!):**

```bash
cd apps/api
npx prisma migrate dev --name add_schuco_order_items
npx prisma generate
```

⚠️ **UWAGA:** Bez migracji dalsze kroki NIE BĘDĄ DZIAŁAĆ! Backend zwróci błędy o brakujących polach.

---

### 🔍 Krok 2: Backend Scraper - metody pobierania szczegółów

**Plik:** `apps/api/src/services/schuco/schucoScraper.ts`

**1. Dodaj interface (na początku pliku, po innych interface):**

```typescript
/**
 * Struktura pojedynczej pozycji zamówienia
 */
export interface SchucoOrderItemData {
  position: string;
  articleNumber: string;
  articleName: string;
  shippedBeams: number;
  orderedBeams: number;
  unit: string;
  dimensions: string | null;
  configuration: string | null;
  finishing: string | null;
  deliveryWeek: string | null;
  tracking: string | null;
  comment: string | null;
}
```

**2. Dodaj metodę scrapeOrderDetails (w klasie SchucoScraper, po metodzie scrapeAndDownload):**

```typescript
/**
 * Scrape order details page for a specific order number
 * @param orderNumber - Order number (e.g., "136713725")
 * @returns Array of order items
 */
async scrapeOrderDetails(orderNumber: string): Promise<SchucoOrderItemData[]> {
  if (!this.page) throw new Error('Browser not initialized');

  logger.info(`[SchucoScraper] Scraping order details for: ${orderNumber}`);

  // Construct URL
  const detailsUrl = `https://connect.schueco.com/schueco/pl/purchaseOrders/orders/details/${orderNumber}`;

  // Navigate to details page
  await this.page.goto(detailsUrl, {
    waitUntil: 'networkidle2',
    timeout: this.config.timeout,
  });

  logger.info(`[SchucoScraper] Navigated to details page: ${detailsUrl}`);

  // Wait for Angular to render table (3 seconds - KRYTYCZNE!)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Wait for table to be present
  await this.page.waitForSelector('table tbody tr', {
    timeout: 15000,
  });

  logger.info(`[SchucoScraper] Table loaded, extracting items...`);

  // Extract items from table
  const items = await this.page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const results: any[] = [];

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 10) return; // Skip invalid rows

      // Extract text from cells (UWAGA: indeksy od 0!)
      const position = cells[0]?.textContent?.trim() || '';
      const articleCell = cells[1]?.textContent?.trim() || '';
      const shippedCell = cells[2]?.textContent?.trim() || '';
      const unit = cells[3]?.textContent?.trim() || 'szt.';
      const dimensions = cells[4]?.textContent?.trim() || null;
      const configuration = cells[5]?.textContent?.trim() || null;
      const finishing = cells[6]?.textContent?.trim() || null;
      const deliveryWeek = cells[7]?.textContent?.trim() || null;
      const tracking = cells[8]?.textContent?.trim() || null;
      const comment = cells[9]?.textContent?.trim() || null;

      // Parse article number and name
      // Format: "19411420 \"9411 Ościeżnica 82/70 GO k sw GO\""
      const articleMatch = articleCell.match(/^(\d+)\s+"?([^"]+)"?$/);
      const articleNumber = articleMatch?.[1] || articleCell.split(' ')[0] || '';
      const articleName =
        articleMatch?.[2] || articleCell.substring(articleNumber.length).trim();

      // Parse shipped/ordered beams from format "0/2"
      const beamsMatch = shippedCell.match(/^(\d+)\/(\d+)$/);
      const shippedBeams = beamsMatch ? parseInt(beamsMatch[1], 10) : 0;
      const orderedBeams = beamsMatch ? parseInt(beamsMatch[2], 10) : 0;

      // Validate essential data
      if (!articleNumber || !position) return;

      results.push({
        position,
        articleNumber,
        articleName,
        shippedBeams,
        orderedBeams,
        unit,
        dimensions,
        configuration,
        finishing,
        deliveryWeek,
        tracking,
        comment,
      });
    });

    return results;
  });

  logger.info(`[SchucoScraper] Extracted ${items.length} items for order ${orderNumber}`);

  // Take screenshot for debugging (tylko gdy headless=false)
  if (!this.config.headless) {
    await this.page.screenshot({
      path: path.join(this.config.downloadPath, `order-${orderNumber}-details.png`),
    });
  }

  return items as SchucoOrderItemData[];
}
```

**3. Dodaj metodę scrapeMultipleOrderDetails (batch processing):**

```typescript
/**
 * Scrape details for multiple orders
 * @param orderNumbers - Array of order numbers
 * @returns Map of orderNumber -> items
 */
async scrapeMultipleOrderDetails(
  orderNumbers: string[]
): Promise<Map<string, SchucoOrderItemData[]>> {
  // Initialize browser if not already initialized
  if (!this.browser || !this.page) {
    await this.initializeBrowser();
    await this.login();
  }

  const results = new Map<string, SchucoOrderItemData[]>();

  for (const orderNumber of orderNumbers) {
    try {
      const items = await this.scrapeOrderDetails(orderNumber);
      results.set(orderNumber, items);

      // Small delay between requests to avoid overloading (1s)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`[SchucoScraper] Failed to scrape details for ${orderNumber}:`, error);
      results.set(orderNumber, []); // Empty array indicates error
    }
  }

  return results;
}
```

---

### ⚙️ Krok 3: Backend Service - logika biznesowa

**Plik:** `apps/api/src/services/schuco/schucoService.ts`

**1. Dodaj importy (na początku pliku):**

```typescript
import { SchucoOrderItem } from '@prisma/client';
import { SchucoOrderItemData } from './schucoScraper.js';
```

**2. Dodaj stałą ITEM_COMPARABLE_FIELDS (po innych stałych):**

```typescript
// Fields to track changes for order items
const ITEM_COMPARABLE_FIELDS = [
  'shippedBeams',
  'orderedBeams',
  'dimensions',
  'finishing',
  'deliveryWeek',
] as const;
```

**3. Dodaj metody private (przed metodami public, w sekcji private methods):**

```typescript
/**
 * Compare order items and detect changes
 */
private compareOrderItems(
  existing: SchucoOrderItem,
  newData: SchucoOrderItemData
): { hasChanges: boolean; changedFields: string[]; previousValues: Record<string, any> } {
  const changedFields: string[] = [];
  const previousValues: Record<string, any> = {};

  for (const field of ITEM_COMPARABLE_FIELDS) {
    const existingValue = existing[field];
    const newValue = newData[field as keyof SchucoOrderItemData];

    if (existingValue !== newValue) {
      changedFields.push(field);
      previousValues[field] = existingValue;
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    previousValues,
  };
}

/**
 * Store order items with change tracking
 */
private async storeOrderItemsWithChangeTracking(
  deliveryId: number,
  items: SchucoOrderItemData[]
): Promise<{ newItems: number; updatedItems: number; unchangedItems: number }> {
  let newItems = 0;
  let updatedItems = 0;
  let unchangedItems = 0;

  for (const itemData of items) {
    const existing = await this.prisma.schucoOrderItem.findUnique({
      where: {
        deliveryId_articleNumber: {
          deliveryId,
          articleNumber: itemData.articleNumber,
        },
      },
    });

    if (!existing) {
      // New item
      await this.prisma.schucoOrderItem.create({
        data: {
          deliveryId,
          position: itemData.position,
          articleNumber: itemData.articleNumber,
          articleName: itemData.articleName,
          shippedBeams: itemData.shippedBeams,
          orderedBeams: itemData.orderedBeams,
          unit: itemData.unit,
          dimensions: itemData.dimensions,
          configuration: itemData.configuration,
          finishing: itemData.finishing,
          deliveryWeek: itemData.deliveryWeek,
          tracking: itemData.tracking,
          comment: itemData.comment,
          changeType: 'new',
          changedAt: new Date(),
          changedFields: JSON.stringify(['*']),
          previousValues: JSON.stringify({}),
        },
      });
      newItems++;
    } else {
      // Check for changes
      const comparison = this.compareOrderItems(existing, itemData);

      if (comparison.hasChanges) {
        await this.prisma.schucoOrderItem.update({
          where: { id: existing.id },
          data: {
            position: itemData.position,
            articleName: itemData.articleName,
            shippedBeams: itemData.shippedBeams,
            orderedBeams: itemData.orderedBeams,
            unit: itemData.unit,
            dimensions: itemData.dimensions,
            configuration: itemData.configuration,
            finishing: itemData.finishing,
            deliveryWeek: itemData.deliveryWeek,
            tracking: itemData.tracking,
            comment: itemData.comment,
            changeType: 'updated',
            changedAt: new Date(),
            changedFields: JSON.stringify(comparison.changedFields),
            previousValues: JSON.stringify(comparison.previousValues),
          },
        });
        updatedItems++;
      } else {
        // No changes - clear change markers
        if (existing.changeType) {
          await this.prisma.schucoOrderItem.update({
            where: { id: existing.id },
            data: {
              changeType: null,
              changedAt: null,
              changedFields: null,
              previousValues: null,
            },
          });
        }
        unchangedItems++;
      }
    }
  }

  return { newItems, updatedItems, unchangedItems };
}
```

**4. Dodaj metody public (na końcu klasy, przed ostatnim }):**

```typescript
/**
 * Fetch and store order details for a single order
 */
async fetchAndStoreOrderDetails(
  orderNumber: string,
  headless: boolean = true
): Promise<{
  success: boolean;
  error?: string;
  itemsCount?: number;
  newItems?: number;
  updatedItems?: number;
  unchangedItems?: number;
}> {
  logger.info(`[SchucoService] Fetching details for order: ${orderNumber}`);

  try {
    // Find delivery
    const delivery = await this.prisma.schucoDelivery.findUnique({
      where: { orderNumber },
    });

    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    // Scrape details
    const scraper = new SchucoScraper({ headless });
    await scraper.initializeBrowser();
    await scraper.login();

    const items = await scraper.scrapeOrderDetails(orderNumber);
    await scraper.cleanup();

    if (items.length === 0) {
      // Update delivery with error
      await this.prisma.schucoDelivery.update({
        where: { id: delivery.id },
        data: {
          detailsFetched: false,
          detailsError: 'No items found in order details',
        },
      });

      return {
        success: false,
        error: 'No items found',
        itemsCount: 0,
      };
    }

    // Store items with change tracking
    const stats = await this.storeOrderItemsWithChangeTracking(delivery.id, items);

    // Update delivery status
    await this.prisma.schucoDelivery.update({
      where: { id: delivery.id },
      data: {
        detailsFetched: true,
        detailsFetchedAt: new Date(),
        detailsError: null,
      },
    });

    logger.info(
      `[SchucoService] Stored ${items.length} items for order ${orderNumber} ` +
        `(new: ${stats.newItems}, updated: ${stats.updatedItems}, unchanged: ${stats.unchangedItems})`
    );

    return {
      success: true,
      itemsCount: items.length,
      newItems: stats.newItems,
      updatedItems: stats.updatedItems,
      unchangedItems: stats.unchangedItems,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[SchucoService] Error fetching details for ${orderNumber}:`, error);

    // Update delivery with error
    try {
      const delivery = await this.prisma.schucoDelivery.findUnique({
        where: { orderNumber },
      });

      if (delivery) {
        await this.prisma.schucoDelivery.update({
          where: { id: delivery.id },
          data: {
            detailsFetched: false,
            detailsError: errorMessage,
          },
        });
      }
    } catch (updateError) {
      logger.error('[SchucoService] Failed to update delivery error status:', updateError);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch details for multiple orders
 */
async fetchDetailsForMultipleOrders(
  orderNumbers: string[],
  headless: boolean = true
): Promise<{
  totalOrders: number;
  successCount: number;
  errorCount: number;
  totalItems: number;
}> {
  logger.info(`[SchucoService] Fetching details for ${orderNumbers.length} orders`);

  const scraper = new SchucoScraper({ headless });
  await scraper.initializeBrowser();
  await scraper.login();

  const results = await scraper.scrapeMultipleOrderDetails(orderNumbers);
  await scraper.cleanup();

  let successCount = 0;
  let errorCount = 0;
  let totalItems = 0;

  for (const [orderNumber, items] of results.entries()) {
    const delivery = await this.prisma.schucoDelivery.findUnique({
      where: { orderNumber },
    });

    if (!delivery) continue;

    if (items.length === 0) {
      // Error
      await this.prisma.schucoDelivery.update({
        where: { id: delivery.id },
        data: {
          detailsFetched: false,
          detailsError: 'Failed to fetch items',
        },
      });
      errorCount++;
    } else {
      // Success
      await this.storeOrderItemsWithChangeTracking(delivery.id, items);
      await this.prisma.schucoDelivery.update({
        where: { id: delivery.id },
        data: {
          detailsFetched: true,
          detailsFetchedAt: new Date(),
          detailsError: null,
        },
      });
      successCount++;
      totalItems += items.length;
    }
  }

  logger.info(
    `[SchucoService] Batch complete: ${successCount} success, ${errorCount} errors, ${totalItems} items`
  );

  return {
    totalOrders: orderNumbers.length,
    successCount,
    errorCount,
    totalItems,
  };
}

/**
 * Fetch details for all pending orders (initial sync)
 * Excludes "Całkowicie dostarczone" status
 */
async fetchDetailsForPendingOrders(
  headless: boolean = true
): Promise<{
  totalOrders: number;
  successCount: number;
  errorCount: number;
  totalItems: number;
}> {
  logger.info('[SchucoService] Starting initial sync for pending orders');

  // Get all deliveries without details, excluding fully delivered
  const pendingDeliveries = await this.prisma.schucoDelivery.findMany({
    where: {
      detailsFetched: false,
      shippingStatus: {
        not: 'Całkowicie dostarczone',
      },
    },
    select: {
      orderNumber: true,
    },
  });

  const orderNumbers = pendingDeliveries.map((d) => d.orderNumber);

  logger.info(`[SchucoService] Found ${orderNumbers.length} pending orders to fetch`);

  if (orderNumbers.length === 0) {
    return {
      totalOrders: 0,
      successCount: 0,
      errorCount: 0,
      totalItems: 0,
    };
  }

  return this.fetchDetailsForMultipleOrders(orderNumbers, headless);
}

/**
 * Get order items for a specific delivery
 */
async getOrderItems(orderNumber: string): Promise<SchucoOrderItem[] | null> {
  logger.info(`[SchucoService] Getting order items for ${orderNumber}`);

  const delivery = await this.prisma.schucoDelivery.findUnique({
    where: { orderNumber },
    include: {
      items: {
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
  });

  if (!delivery) {
    logger.warn(`[SchucoService] Delivery not found: ${orderNumber}`);
    return null;
  }

  return delivery.items;
}

/**
 * Get status of fetched order details
 */
async getDetailsStatus(): Promise<{
  totalDeliveries: number;
  withDetails: number;
  withoutDetails: number;
  withErrors: number;
  totalItems: number;
}> {
  logger.info('[SchucoService] Getting details status');

  const [totalDeliveries, withDetails, withErrors, totalItems] = await Promise.all([
    this.prisma.schucoDelivery.count(),
    this.prisma.schucoDelivery.count({ where: { detailsFetched: true } }),
    this.prisma.schucoDelivery.count({
      where: {
        detailsError: { not: null },
      },
    }),
    this.prisma.schucoOrderItem.count(),
  ]);

  const withoutDetails = totalDeliveries - withDetails;

  return {
    totalDeliveries,
    withDetails,
    withoutDetails,
    withErrors,
    totalItems,
  };
}
```

---

### 🌐 Krok 4: Backend API - endpointy i handlery

**Plik 1:** `apps/api/src/routes/schuco.ts`

**Dodaj 4 nowe endpointy (przed debug endpoint, czyli przed `// DEBUG: Get changed records count`):**

```typescript
// GET /api/schuco/deliveries/:orderNumber/items - Get order items for specific delivery
fastify.get('/deliveries/:orderNumber/items', {
  schema: {
    description: 'Get Schuco order items for a specific delivery',
    tags: ['schuco'],
    params: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
      },
      required: ['orderNumber'],
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            deliveryId: { type: 'integer' },
            position: { type: 'string' },
            articleNumber: { type: 'string' },
            articleName: { type: 'string' },
            shippedBeams: { type: 'integer' },
            orderedBeams: { type: 'integer' },
            unit: { type: 'string' },
            dimensions: { type: 'string', nullable: true },
            configuration: { type: 'string', nullable: true },
            finishing: { type: 'string', nullable: true },
            deliveryWeek: { type: 'string', nullable: true },
            tracking: { type: 'string', nullable: true },
            comment: { type: 'string', nullable: true },
            changeType: { type: 'string', nullable: true },
            changedAt: { type: 'string', format: 'date-time', nullable: true },
            changedFields: { type: 'string', nullable: true },
            previousValues: { type: 'string', nullable: true },
            fetchedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  handler: schucoHandler.getOrderItems,
});

// POST /api/schuco/deliveries/:orderNumber/fetch-details - Scrape details for single order
fastify.post('/deliveries/:orderNumber/fetch-details', {
  schema: {
    description: 'Fetch and store order details for a specific delivery',
    tags: ['schuco'],
    params: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
      },
      required: ['orderNumber'],
    },
    body: {
      type: 'object',
      properties: {
        headless: { type: 'boolean', default: true },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          orderNumber: { type: 'string' },
          itemsCount: { type: 'integer' },
          newItems: { type: 'integer' },
          updatedItems: { type: 'integer' },
          unchangedItems: { type: 'integer' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      500: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  handler: schucoHandler.fetchOrderDetails,
});

// POST /api/schuco/fetch-all-details - Initial sync for all pending orders
fastify.post('/fetch-all-details', {
  schema: {
    description: 'Fetch order details for all pending deliveries (initial sync)',
    tags: ['schuco'],
    body: {
      type: 'object',
      properties: {
        headless: { type: 'boolean', default: true },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          totalOrders: { type: 'integer' },
          successCount: { type: 'integer' },
          errorCount: { type: 'integer' },
          totalItems: { type: 'integer' },
          durationMs: { type: 'integer' },
        },
      },
      500: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  handler: schucoHandler.fetchAllDetails,
});

// GET /api/schuco/details-status - Get status of fetched details
fastify.get('/details-status', {
  schema: {
    description: 'Get statistics about fetched order details',
    tags: ['schuco'],
    response: {
      200: {
        type: 'object',
        properties: {
          totalDeliveries: { type: 'integer' },
          withDetails: { type: 'integer' },
          withoutDetails: { type: 'integer' },
          withErrors: { type: 'integer' },
          totalItems: { type: 'integer' },
        },
      },
    },
  },
  handler: schucoHandler.getDetailsStatus,
});
```

**Plik 2:** `apps/api/src/handlers/schucoHandler.ts`

**Dodaj 4 nowe handlery (na końcu klasy, przed `}`):**

```typescript
/**
 * GET /api/schuco/deliveries/:orderNumber/items
 * Get order items for a specific delivery
 */
getOrderItems = async (
  request: FastifyRequest<{ Params: { orderNumber: string } }>,
  reply: FastifyReply
) => {
  try {
    const { orderNumber } = request.params;
    logger.info(`[SchucoHandler] Getting order items for ${orderNumber}`);

    const items = await this.schucoService.getOrderItems(orderNumber);

    if (!items || items.length === 0) {
      return reply.code(404).send({ error: 'No items found for this order' });
    }

    return reply.code(200).send(items);
  } catch (error) {
    logger.error('[SchucoHandler] Error getting order items:', error);
    return reply.code(500).send({ error: 'Failed to get order items' });
  }
};

/**
 * POST /api/schuco/deliveries/:orderNumber/fetch-details
 * Fetch and store order details for a specific delivery
 */
fetchOrderDetails = async (
  request: FastifyRequest<{
    Params: { orderNumber: string };
    Body: { headless?: boolean };
  }>,
  reply: FastifyReply
) => {
  try {
    const { orderNumber } = request.params;
    const { headless = true } = request.body || {};

    logger.info(
      `[SchucoHandler] Fetching details for order ${orderNumber} (headless: ${headless})`
    );

    // Increase socket timeout for long-running scraping (2 minutes)
    request.raw.setTimeout(120000);

    const result = await this.schucoService.fetchAndStoreOrderDetails(orderNumber, headless);

    if (!result.success) {
      if (result.error === 'Delivery not found') {
        return reply.code(404).send({ error: 'Delivery not found' });
      }
      return reply.code(500).send({
        error: 'Failed to fetch order details',
        message: result.error,
      });
    }

    return reply.code(200).send({
      message: 'Order details fetched successfully',
      orderNumber,
      itemsCount: result.itemsCount || 0,
      newItems: result.newItems || 0,
      updatedItems: result.updatedItems || 0,
      unchangedItems: result.unchangedItems || 0,
    });
  } catch (error) {
    logger.error('[SchucoHandler] Error fetching order details:', error);
    return reply.code(500).send({ error: 'Failed to fetch order details' });
  }
};

/**
 * POST /api/schuco/fetch-all-details
 * Initial sync - fetch details for all pending orders
 */
fetchAllDetails = async (
  request: FastifyRequest<{ Body: { headless?: boolean } }>,
  reply: FastifyReply
) => {
  try {
    const { headless = true } = request.body || {};
    logger.info(`[SchucoHandler] Initial sync triggered (headless: ${headless})`);

    // Increase socket timeout for very long-running operation (10 minutes)
    request.raw.setTimeout(600000);

    const startTime = Date.now();
    const result = await this.schucoService.fetchDetailsForPendingOrders(headless);
    const durationMs = Date.now() - startTime;

    return reply.code(200).send({
      message: 'Initial sync completed',
      totalOrders: result.totalOrders,
      successCount: result.successCount,
      errorCount: result.errorCount,
      totalItems: result.totalItems,
      durationMs,
    });
  } catch (error) {
    logger.error('[SchucoHandler] Error during initial sync:', error);
    return reply.code(500).send({
      error: 'Failed to complete initial sync',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/schuco/details-status
 * Get statistics about fetched order details
 */
getDetailsStatus = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const status = await this.schucoService.getDetailsStatus();

    return reply.code(200).send(status);
  } catch (error) {
    logger.error('[SchucoHandler] Error getting details status:', error);
    return reply.code(500).send({ error: 'Failed to get details status' });
  }
};
```

---

### 🎨 Krok 5: Frontend Types & API Client

**Plik 1:** `apps/web/src/types/schuco.ts`

**Rozszerz interface SchucoDelivery (dodaj na końcu, przed `}`):**

```typescript
// Order details metadata
detailsFetched: boolean;
detailsFetchedAt: string | null;
detailsError: string | null;
```

**Dodaj nowy interface SchucoOrderItem (po SchucoDelivery):**

```typescript
export interface SchucoOrderItem {
  id: number;
  deliveryId: number;
  position: string;
  articleNumber: string;
  articleName: string;
  shippedBeams: number;
  orderedBeams: number;
  unit: string;
  dimensions: string | null;
  configuration: string | null;
  finishing: string | null;
  deliveryWeek: string | null;
  tracking: string | null;
  comment: string | null;
  // Change tracking fields
  changeType: 'new' | 'updated' | null;
  changedAt: string | null;
  changedFields: string | null; // JSON array of changed field names
  previousValues: string | null; // JSON object of previous values
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

**Dodaj nowe response types (na końcu pliku):**

```typescript
export interface SchucoOrderDetailsResponse {
  message: string;
  orderNumber: string;
  itemsCount: number;
  newItems: number;
  updatedItems: number;
  unchangedItems: number;
}

export interface SchucoFetchAllDetailsResponse {
  message: string;
  totalOrders: number;
  successCount: number;
  errorCount: number;
  totalItems: number;
  durationMs: number;
}

export interface SchucoDetailsStatusResponse {
  totalDeliveries: number;
  withDetails: number;
  withoutDetails: number;
  withErrors: number;
  totalItems: number;
}
```

**Plik 2:** `apps/web/src/lib/api.ts`

**Rozszerz schucoApi (dodaj nowe metody przed zamykającym `}`)**:

```typescript
// Order items endpoints
getOrderItems: (orderNumber: string) =>
  fetchApi<import('@/types').SchucoOrderItem[]>(
    `/api/schuco/deliveries/${orderNumber}/items`
  ),
fetchOrderDetails: (orderNumber: string, headless = true) =>
  fetchApi<import('@/types').SchucoOrderDetailsResponse>(
    `/api/schuco/deliveries/${orderNumber}/fetch-details`,
    {
      method: 'POST',
      body: JSON.stringify({ headless }),
    }
  ),
fetchAllDetails: (headless = true) =>
  fetchApi<import('@/types').SchucoFetchAllDetailsResponse>(
    '/api/schuco/fetch-all-details',
    {
      method: 'POST',
      body: JSON.stringify({ headless }),
    }
  ),
getDetailsStatus: () =>
  fetchApi<import('@/types').SchucoDetailsStatusResponse>(
    '/api/schuco/details-status'
  ),
```

---

### 🖥️ Krok 6: Frontend UI Dostawy - rozwijane wiersze i wskaźniki

**Plik:** `apps/web/src/app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx`

To największa zmiana frontendu. Użyj skilla do implementacji:

```
Użyj Task tool z subagent_type='general-purpose' do zaimplementowania Step 6 w pliku DostawySchucoPageContent.tsx:

1. Dodaj importy: Download, ChevronDown, ChevronUp, Loader2 z lucide-react
2. Dodaj stan: expandedRows: Set<string>
3. Dodaj query: detailsStatus z schucoApi.getDetailsStatus()
4. Dodaj mutations: fetchDetailsMutation, fetchAllDetailsMutation z invalidacją cache
5. Dodaj handlery: toggleRowExpansion, handleFetchAllDetails
6. Dodaj komponenty wewnętrzne: DetailsIndicator, ExpandedRow
7. Rozszerz tabelę o 2 kolumny na początku: chevron + wskaźnik szczegółów
8. Dodaj sekcję Details Status w status card (po Schedule info)
9. Kolorowanie: bg-green-50 (new), bg-orange-50 (updated)
```

⚠️ **KRYTYCZNE BŁĘDY DO UNIKNIĘCIA:**
- Chevron: `ChevronDown` gdy rozwinięte, `ChevronUp` gdy zwinięte (nie odwrotnie!)
- `enabled: expandedRows.has(orderNumber)` w query pozycji
- `colSpan={9}` w ExpandedRow (9 kolumn w tabeli)
- `min-w-[1300px]` dla tabeli (było 1200px)

---

### 🎯 Krok 7: Frontend Modal - sekcja Profile Schüco

**Plik:** `apps/web/src/components/orders/order-detail-modal.tsx`

Użyj skilla:

```
Użyj Task tool z subagent_type='general-purpose' do znalezienia i modyfikacji pliku order-detail-modal.tsx:

1. Znajdź plik modalu (prawdopodobnie **/order*modal*.tsx)
2. Dodaj import: Package z lucide-react, schucoApi, SchucoOrderItem
3. Dodaj stan: schucoExpanded
4. Dodaj query dla pozycji Schüco (znajdź SchucoDelivery po order.orderNumber)
5. Dodaj collapsible sekcję "Profile Schüco" z tabelą 9 kolumn
6. Kolorowanie: bg-green-50 (new), bg-orange-50 (updated)
7. Renderuj TYLKO gdy schucoItems istnieją i mają długość > 0
```

---

### ⚡ Krok 8: Initial Sync (opcjonalny, tylko jeśli chcesz od razu pobrać dane)

Po zaimplementowaniu kroków 1-7, możesz wykonać initial sync:

**Opcja A: Z frontendu**
1. Uruchom aplikację webową
2. Przejdź do `/magazyn/dostawy-schuco`
3. Kliknij przycisk "Pobierz wszystkie szczegóły (N)"
4. Poczekaj na zakończenie (może potrwać kilka minut)

**Opcja B: Z API bezpośrednio (Postman/curl)**
```bash
curl -X POST http://localhost:3000/api/schuco/fetch-all-details \
  -H "Content-Type: application/json" \
  -d '{"headless": true}'
```

---

### 🕐 Krok 9: Harmonogram - automatyczne pobieranie

**Plik:** `apps/api/src/services/schuco/schucoScheduler.ts`

Ten krok NIE jest jeszcze zaimplementowany w powyższych instrukcjach. Jeśli chcesz dodać automatyczne pobieranie szczegółów przy każdym harmonogramie (8:00, 12:00, 15:00):

**Znajdź metodę która wykonuje scheduled fetch i dodaj:**

```typescript
// Po fetchAndStoreDeliveries, dodaj:
logger.info('[SchucoScheduler] Fetching details for new/updated deliveries');

const pendingOrders = await prisma.schucoDelivery.findMany({
  where: {
    detailsFetched: false,
    shippingStatus: { not: 'Całkowicie dostarczone' },
  },
  select: { orderNumber: true },
  take: 20, // Limit do 20 na jedno uruchomienie
});

if (pendingOrders.length > 0) {
  await schucoService.fetchDetailsForMultipleOrders(
    pendingOrders.map(o => o.orderNumber),
    true // headless
  );
}
```

---

### ✅ Krok 10: Testy i weryfikacja

**Checklist testów:**

1. **Backend:**
   - [ ] Migracja wykonana bez błędów
   - [ ] API endpoint GET /api/schuco/details-status zwraca dane
   - [ ] API endpoint GET /api/schuco/deliveries/:orderNumber/items zwraca 404 dla nieistniejącego
   - [ ] API endpoint POST /api/schuco/deliveries/:orderNumber/fetch-details działa (headless=false dla testów)

2. **Scraper:**
   - [ ] Puppeteer loguje się poprawnie
   - [ ] Czekanie 3s na Angular renderowanie działa
   - [ ] Parsowanie formatu "0/2" zwraca shippedBeams=0, orderedBeams=2
   - [ ] Artykuł parsowany poprawnie (numer + nazwa)

3. **Frontend:**
   - [ ] Strona dostaw Schüco wyświetla wskaźniki szczegółów
   - [ ] Kliknięcie w wiersz rozwija/zwija pozycje
   - [ ] Przycisk "Pobierz wszystkie szczegóły" jest widoczny gdy withoutDetails > 0
   - [ ] Modal zamówienia wyświetla sekcję "Profile Schüco" gdy są dane
   - [ ] Kolorowanie zmian działa (zielone/pomarańczowe)

4. **Change tracking:**
   - [ ] Pierwsze pobranie ustawia changeType='new'
   - [ ] Zmiana ilości bel ustawia changeType='updated'
   - [ ] Brak zmian czyści changeType (null)

---

## ⚠️ KRYTYCZNE BŁĘDY DO UNIKNIĘCIA

### 1. Migracja bazy danych
**BŁĄD:** Próba uruchomienia backendu bez wykonania migracji
**SKUTEK:** Błędy "Column not found: detailsFetched"
**ROZWIĄZANIE:** ZAWSZE wykonaj `npx prisma migrate dev` + `npx prisma generate` PRZED uruchomieniem serwera

### 2. Czekanie na Angular rendering
**BŁĄD:** Zbyt krótkie czekanie (<3s) lub brak czekania
**SKUTEK:** Pusta tablica items, brak danych
**ROZWIĄZANIE:** `await new Promise(resolve => setTimeout(resolve, 3000))` - dokładnie 3 sekundy!

### 3. Parsowanie formatu "0/2"
**BŁĄD:** Nieprawidłowy regex lub odwrócone wartości
**SKUTEK:** shippedBeams=2, orderedBeams=0 (odwrotnie!)
**ROZWIĄZANIE:**
```typescript
const beamsMatch = shippedCell.match(/^(\d+)\/(\d+)$/);
const shippedBeams = beamsMatch ? parseInt(beamsMatch[1], 10) : 0; // PIERWSZY
const orderedBeams = beamsMatch ? parseInt(beamsMatch[2], 10) : 0; // DRUGI
```

### 4. Ikony chevron
**BŁĄD:** `ChevronUp` gdy rozwinięte, `ChevronDown` gdy zwinięte
**SKUTEK:** Mylące UX - ikona pokazuje odwrotny stan
**ROZWIĄZANIE:**
```typescript
{isExpanded ? (
  <ChevronDown className="h-4 w-4" /> // Rozwinięte - strzałka w dół
) : (
  <ChevronUp className="h-4 w-4" />   // Zwinięte - strzałka w górę
)}
```

### 5. Query enabled condition
**BŁĄD:** Brak `enabled: expandedRows.has(orderNumber)`
**SKUTEK:** Query wykonuje się dla WSZYSTKICH wierszy, przeciążenie API
**ROZWIĄZANIE:** Zawsze dodaj enabled condition!

### 6. ColSpan w ExpandedRow
**BŁĄD:** `colSpan={7}` gdy tabela ma 9 kolumn
**SKUTEK:** Rozwinięty wiersz nie rozciąga się na całą szerokość
**ROZWIĄZANIE:** Policz kolumny i użyj prawidłowej wartości (chevron + szczegóły + 7 kolumn = 9)

### 7. Invalidacja cache
**BŁĄD:** Brak invalidacji `['schuco-details-status']` po mutation
**SKUTEK:** Status nie aktualizuje się po pobraniu szczegółów
**ROZWIĄZANIE:** Zawsze invaliduj oba: `['schuco-deliveries', 'v2']` + `['schuco-details-status']`

### 8. Timeout dla long-running operations
**BŁĄD:** Brak zwiększenia timeout dla `/fetch-all-details`
**SKUTEK:** Request timeout po 2 minutach, podczas gdy operacja trwa 10 minut
**ROZWIĄZANIE:** `request.raw.setTimeout(600000)` (10 minut) w handlerze

### 9. Error handling w scraper
**BŁĄD:** Nie zapisywanie `detailsError` gdy scraping failuje
**SKUTEK:** Brak informacji o błędach w UI
**ROZWIĄZANIE:** Zawsze try-catch i update delivery z error message

### 10. Unique constraint violation
**BŁĄD:** Próba insert gdy rekord już istnieje (brak użycia `findUnique`)
**SKUTEK:** Crash z "UNIQUE constraint failed"
**ROZWIĄZANIE:** Zawsze sprawdź czy rekord istnieje przed insert!

---

## 📝 Struktura plików - podsumowanie

```
Markbud/
├── apps/api/
│   ├── prisma/
│   │   └── schema.prisma                           # Krok 1: Modele DB
│   └── src/
│       ├── services/schuco/
│       │   ├── schucoScraper.ts                    # Krok 2: Scraping
│       │   ├── schucoService.ts                    # Krok 3: Logika
│       │   └── schucoScheduler.ts                  # Krok 9: Harmonogram
│       ├── routes/
│       │   └── schuco.ts                           # Krok 4: Routes
│       └── handlers/
│           └── schucoHandler.ts                    # Krok 4: Handlers
└── apps/web/
    └── src/
        ├── types/
        │   └── schuco.ts                           # Krok 5: Types
        ├── lib/
        │   └── api.ts                              # Krok 5: API client
        ├── app/magazyn/dostawy-schuco/
        │   └── DostawySchucoPageContent.tsx        # Krok 6: UI Dostawy
        └── components/orders/
            └── order-detail-modal.tsx              # Krok 7: Modal
```

---

## 🚀 Kolejność wykonania (WAŻNE!)

1. **Krok 1** - Baza danych + MIGRACJA (NAJPIERW!)
2. **Krok 2** - Backend Scraper
3. **Krok 3** - Backend Service
4. **Krok 4** - Backend API
5. **Krok 5** - Frontend Types & API
6. **Krok 6** - Frontend UI Dostawy (użyj skilla!)
7. **Krok 7** - Frontend Modal (użyj skilla!)
8. **Krok 8** - Initial Sync (opcjonalny)
9. **Krok 9** - Harmonogram (opcjonalny)
10. **Krok 10** - Testy

**NIE PRZESKAKUJ KROKÓW!** Każdy krok zależy od poprzednich.

---

## 🔐 Credentials

```
Email: krzysztof@markbud.pl
Password: Markbud2020
URL: https://connect.schueco.com/schueco/pl/purchaseOrders/orders
```

---

## 🎯 Rezultat końcowy

Po ukończeniu wszystkich kroków:

1. **Backend:** Automatycznie scrapuje szczegóły zamówień, zapisuje pozycje z change tracking
2. **Frontend Dostawy:** Rozwijane wiersze z tabelą pozycji, wskaźniki ✅/❌/⬇️, przycisk "Pobierz wszystkie"
3. **Frontend Modal:** Sekcja "Profile Schüco" z tabelą pozycji
4. **Change tracking:** Zielone tło (nowe), pomarańczowe (zmienione)
5. **Initial sync:** Jednorazowe pobranie dla wszystkich przyszłych zamówień
6. **Auto-refresh:** Opcjonalnie - harmonogram 8:00, 12:00, 15:00

---

**Powodzenia! 🚀**
