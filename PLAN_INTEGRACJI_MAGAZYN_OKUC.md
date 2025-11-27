# 📋 PLAN INTEGRACJI "MAGAZYN OKUĆ" W APLIKACJI AKROBUD

## 📊 PRZEGLĄD PROJEKTU

### Co to jest `c:\magazyn`?
- **Aplikacja PyQt6** do zarządzania okuciami (akcesoria meblowe)
- **68 plików Python** z zaawansowaną logiką biznesową
- **Funkcjonalność:**
  - Zarządzanie stanem magazynu artykułów
  - Import/export danych z Excel (csv, xlsx)
  - 4 typy dokumentów: Zapotrzebowanie, RW (Rozchody), Zamówienia, Remanent
  - Analiza i prognozowanie zapotrzebowania
  - Generator zamówień z różnymi strategiami
  - Historia zmian i archiwizacja
  - Proporcje artykułów (zestawy kompleksowe)
  - Obliczanie średniego użycia, statystyk

### Struktura bazy danych PyQt6:
```
data/
  ├── artykuly.json          # { nr_art: { name, price, group, min_stan, max_stan, ... } }
  ├── magazyn.json           # { nr_art: quantity }
  ├── historia_*.json        # Historia dokumentów
  ├── warehouse_value_history.json
  └── backups/

config/
  ├── settings.json          # Ustawienia, grupy, magazyny, prefeksy dokumentów
  └── proportions.json       # Proporcje artykułów
```

### Grupy artykułów w `settings.json`:
- BLOKADA RYGLUJĄCA
- UCHWYTY
- ZAWIASY
- ZACISKI
- ZAWIAS DO UCHYŁU
- KLAMKA SCHUCO
- NAROŻNIK
- ROZWÓRKA
- SUWANKA
- itd. (41 grup)

### Magazyny:
- ALUMINIUM
- MARCIN
- SCHUCO
- WH-GABARYTY
- WH-DROBNICA
- NIETYPÓWKI

---

## 🎯 PLAN INTEGRACJI

### ETAP 1: BAZA DANYCH - SCHEMAT PRISMA

#### 1.1 Dodaj modele do `schema.prisma`:

```prisma
// ==================== MAGAZYN OKUĆ ====================

model OkucArticle {
  id              Int      @id @default(autoincrement())
  articleNumber   String   @unique        // np. "001"
  name            String
  description     String?
  group           String   @default("UCHWYTY")
  warehouse       String?  // MARCIN, SCHUCO, WH-DROBNICA
  price           Float?   @default(0)    // EUR
  priceHistory    String?  @db.Text      // JSON: [{ date, price }]
  minStock        Int      @default(0)
  maxStock        Int      @default(100)
  avgMonthlyUsage Float    @default(0)    // Z RW/ZAP history
  proportion      Float    @default(1.0)  // Część kompletu
  doNotOrder      Boolean  @default(false)
  hidden          Boolean  @default(false)
  orderType       String   @default("Po RW")  // Po RW, NA SZTUKI, PROPORCJE
  packageSize     Float    @default(1.0)
  notes           String?
  alternativeNumbers String?  @db.Text  // JSON: ["alt1", "alt2"]
  createdAt       DateTime @default(now())  @map("created_at")
  updatedAt       DateTime @updatedAt    @map("updated_at")

  stock           OkucStock[]
  orders          OkucOrder[]
  requirements    OkucRequirement[]
  history         OkucHistory[]
  images          OkucProductImage[]

  @@index([group])
  @@index([warehouse])
  @@map("okuc_articles")
}

model OkucStock {
  id              Int      @id @default(autoincrement())
  articleId       Int      @unique @map("article_id")
  currentQuantity Int      @default(0)  @map("current_quantity")
  orderedQuantity Int?     @map("ordered_quantity")
  expectedDeliveryDate DateTime? @map("expected_delivery_date")
  status          String   @default("OK")  // OK, LOW, CRITICAL
  updatedAt       DateTime @updatedAt  @map("updated_at")
  updatedById     Int?     @map("updated_by_id")

  article   OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  updatedBy User?       @relation(fields: [updatedById], references: [id])

  @@map("okuc_stock")
}

model OkucOrder {
  id                   Int      @id @default(autoincrement())
  articleId            Int      @map("article_id")
  orderedQuantity      Int      @map("ordered_quantity")
  expectedDeliveryDate DateTime @map("expected_delivery_date")
  status               String   @default("pending")  // pending, received, cancelled
  notes                String?
  createdAt            DateTime @default(now())  @map("created_at")
  createdById          Int?     @map("created_by_id")

  article   OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  createdBy User?       @relation(fields: [createdById], references: [id])

  @@index([status])
  @@index([articleId])
  @@map("okuc_orders")
}

// Dokumenty: Zapotrzebowanie, RW (Rozchody), Zamówienia
model OkucRequirement {
  id              Int      @id @default(autoincrement())
  articleId       Int      @map("article_id")
  documentType    String   // "ZAP" (Zapotrzebowanie), "RW" (Rozchód)
  documentNumber  String   @map("document_number")  // ZAP-001, RW-042
  quantity        Int
  group           String?  // Grupa (z dokumentu)
  sourceFile      String?  @map("source_file")
  recordedAt      DateTime @default(now())  @map("recorded_at")
  recordedById    Int?     @map("recorded_by_id")

  article    OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  recordedBy User?       @relation(fields: [recordedById], references: [id])

  @@index([articleId])
  @@index([documentType])
  @@index([recordedAt])
  @@map("okuc_requirements")
}

// Historia inwentaryzacji (remanent) - Różnice między stanem obliczonym a faktycznym
model OkucHistory {
  id              Int      @id @default(autoincrement())
  articleId       Int      @map("article_id")
  calculatedStock Int      @map("calculated_stock")
  actualStock     Int      @map("actual_stock")
  difference      Int
  remanentNumber  String?  @map("remanent_number")  // REM-001
  recordedAt      DateTime @default(now())  @map("recorded_at")
  recordedById    Int?     @map("recorded_by_id")

  article    OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  recordedBy User?       @relation(fields: [recordedById], references: [id])

  @@index([articleId])
  @@index([recordedAt])
  @@map("okuc_history")
}

model OkucImport {
  id           Int      @id @default(autoincrement())
  filename     String
  fileType     String   @map("file_type")  // ZAP, RW, REMANENT, ORDERS
  status       String   @default("pending")  // pending, processing, completed, failed
  processedAt  DateTime? @map("processed_at")
  errorMessage String?   @map("error_message")
  importedRows Int      @default(0)  @map("imported_rows")
  previewData  String?   @db.Text  // JSON: nagłówek i przykładowe wiersze
  createdAt    DateTime @default(now())  @map("created_at")
  createdById  Int?     @map("created_by_id")

  createdBy User? @relation(fields: [createdById], references: [id])

  @@index([status])
  @@index([createdAt])
  @@map("okuc_imports")
}

model OkucProductImage {
  id        Int      @id @default(autoincrement())
  articleId Int      @map("article_id")
  imageUrl  String   @map("image_url")
  createdAt DateTime @default(now())  @map("created_at")

  article OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@map("okuc_product_images")
}

model OkucSettings {
  id                    Int     @id @default(autoincrement())
  eurPlnRate           Float   @default(4.35) @map("eur_pln_rate")
  defaultDeliveryTime  Int     @default(1) @map("default_delivery_time")  // miesięcy
  averageFromDate      String? @map("average_from_date")  // od kiedy liczyć średnią

  @@map("okuc_settings")
}

// Rozszerz User o relacje do okuć
model User {
  // ... istniejące pola ...
  okucStockUpdates  OkucStock[]
  okucOrdersCreated OkucOrder[]
  okucRequirements  OkucRequirement[]
  okucHistory       OkucHistory[]
  okucImports       OkucImport[]
}
```

**Migracja:**
```bash
npx prisma migrate dev --name add_okuc_warehouse
npx prisma generate
```

---

### ETAP 2: API BACKEND

#### 2.1 Struktura routes:

```
apps/api/src/routes/
├── okuc-articles.ts       # CRUD artykułów
├── okuc-stock.ts          # Status magazynu
├── okuc-orders.ts         # Zamówienia
├── okuc-requirements.ts   # Import ZAP/RW
├── okuc-analytics.ts      # Statystyki
└── okuc-import.ts         # Wgrywanie plików
```

#### 2.2 API Endpoints - `okuc-articles.ts`:

```typescript
// GET /okuc/articles
// Query: ?group=UCHWYTY&warehouse=MARCIN&search=klamka
// Response: { articles: [], totalCount, groups, warehouses }

// GET /okuc/articles/:id
// Response: { article, stock, orders, requirements }

// POST /okuc/articles
// Body: { articleNumber, name, group, warehouse, price, minStock, maxStock, notes }

// PUT /okuc/articles/:id
// Body: { ...updated fields }

// DELETE /okuc/articles/:id

// GET /okuc/articles/by-group/:group
// Response: { articles: [] }

// PUT /okuc/articles/:id/hide
// Mark as hidden
```

#### 2.3 API Endpoints - `okuc-stock.ts`:

```typescript
// GET /okuc/stock
// Response: { items: [{ article, currentQty, status, expectedDelivery }], summary }

// GET /okuc/stock/summary
// Response: { totalArticles, criticalCount, totalValue, avgMonthlyUsage }

// GET /okuc/stock/critical
// Response: { articles: [] } (status = CRITICAL)

// PUT /okuc/stock/:articleId
// Body: { currentQuantity, expectedDeliveryDate }

// POST /okuc/stock/:articleId/status
// Recalculate: OK, LOW, CRITICAL based on:
// - currentQuantity >= minStock → OK
// - minStock > qty >= (avgUsage * deliveryTime) → LOW
// - qty < (avgUsage * deliveryTime) → CRITICAL
```

#### 2.4 API Endpoints - `okuc-orders.ts`:

```typescript
// POST /okuc/orders
// Body: { articleId, orderedQuantity, expectedDeliveryDate, notes }

// GET /okuc/orders
// Query: ?status=pending&articleId=1
// Response: { orders: [], pending: 5, received: 23 }

// PUT /okuc/orders/:id
// Body: { status, notes }

// DELETE /okuc/orders/:id

// PATCH /okuc/orders/:id/status
// Body: { status: "received" } → Automatycznie dodaj do OkucStock.currentQuantity
```

#### 2.5 API Endpoints - `okuc-requirements.ts` (Import ZAP/RW):

```typescript
// POST /okuc/requirements/import
// Body: { documentType: "ZAP"|"RW", rows: [{ articleNumber, name, quantity }] }
// Działanie:
//   1. Find/create article
//   2. Create OkucRequirement record
//   3. Recalculate OkucStock.avgMonthlyUsage

// GET /okuc/requirements
// Query: ?documentType=RW&from=2025-01-01&to=2025-01-31
// Response: { requirements: [], grouped by article }

// POST /okuc/requirements/analyze-usage
// Recalculate avgMonthlyUsage for all articles based on RW history
```

#### 2.6 API Endpoints - `okuc-import.ts` (Wgrywanie plików):

```typescript
// POST /okuc/import/preview
// Body: FormData (file)
// Response: { preview: [...first 10 rows], detectedType: "ZAP"|"RW"|"REMANENT" }

// POST /okuc/import/process
// Body: { fileId, documentType, confirmedRows }
// Response: { importId, importedRows, errors: [] }

// GET /okuc/import/history
// Response: { imports: [] }

// GET /okuc/import/:id
// Response: { import, errors, processedRows }
```

#### 2.7 API Endpoints - `okuc-analytics.ts`:

```typescript
// GET /okuc/analytics/critical-articles
// Response: { articles: [{...article, status, recommendation}] }

// GET /okuc/analytics/usage-trends
// Query: ?from=2024-11-01&to=2025-11-27
// Response: { trends: [{ article, avgMonthly, trend }] }

// GET /okuc/analytics/order-recommendations
// Response: { recommendations: [{ article, currentQty, recommendedQty, reason }] }

// GET /okuc/analytics/warehouse-value
// Query: ?currency=EUR|PLN
// Response: { totalValue, byGroup: {}, topByValue: [] }

// GET /okuc/analytics/groups-summary
// Response: { groups: [{ name, articleCount, avgUsage, totalValue }] }
```

---

### ETAP 3: PARSERY - Backend Service

#### 3.1 `apps/api/src/services/okuc-parser.ts`:

```typescript
import * as XLSX from 'xlsx';

interface OkucImportRow {
  articleNumber: string;
  name: string;
  quantity: number;
  group?: string;
  warehouse?: string;
}

export class OkucParser {
  static parseExcelFile(buffer: Buffer, documentType: 'ZAP' | 'RW' | 'REMANENT'): {
    rows: OkucImportRow[];
    errors: string[];
  } {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const rows: OkucImportRow[] = [];
      const errors: string[] = [];

      // Pomiń nagłówek (pierwszy wiersz)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];

        try {
          const articleNumber = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const quantity = parseFloat(String(row[2] || '0'));

          if (!articleNumber || !name) {
            errors.push(`Wiersz ${i + 1}: Brak numeru lub nazwy artykułu`);
            continue;
          }

          if (quantity <= 0) {
            errors.push(`Wiersz ${i + 1}: Ilość musi być > 0`);
            continue;
          }

          rows.push({
            articleNumber: articleNumber.padStart(3, '0'),
            name,
            quantity,
            group: row[3] ? String(row[3]).trim() : undefined,
            warehouse: row[4] ? String(row[4]).trim() : undefined,
          });
        } catch (e) {
          errors.push(`Wiersz ${i + 1}: Błąd parsowania - ${e.message}`);
        }
      }

      return { rows, errors };
    } catch (error) {
      return {
        rows: [],
        errors: [`Błąd czytania pliku: ${error.message}`],
      };
    }
  }

  static validateRows(rows: OkucImportRow[]): {
    valid: OkucImportRow[];
    errors: string[];
  } {
    const valid: OkucImportRow[] = [];
    const errors: string[] = [];

    rows.forEach((row, idx) => {
      // Walidacja numeru artykułu
      if (!/^\d{1,10}$/.test(row.articleNumber)) {
        errors.push(`Wiersz ${idx + 1}: Numer artykułu musi być liczbą`);
        return;
      }

      // Walidacja nazwy
      if (row.name.length < 2 || row.name.length > 255) {
        errors.push(`Wiersz ${idx + 1}: Nazwa musi mieć 2-255 znaków`);
        return;
      }

      // Walidacja ilości
      if (row.quantity <= 0) {
        errors.push(`Wiersz ${idx + 1}: Ilość musi być większa niż 0`);
        return;
      }

      valid.push(row);
    });

    return { valid, errors };
  }
}
```

---

### ETAP 4: FRONTEND - STRONA `/magazyn/okuc`

#### 4.1 Struktura strony:

```
/magazyn/okuc
├── Header: "Magazyn Okuć"
│   └── [Powrót do menu] button
├── Breadcrumb
├── Stats (3 karty):
│   ├── Łącznie artykułów
│   ├── Stan krytyczny
│   └── Wartość magazynu (EUR)
├── Tabs:
│   ├── "📦 Artykuły"
│   ├── "📊 Stan Magazynu"
│   ├── "🛒 Zamówienia"
│   └── "📤 Import"
```

#### 4.2 Komponenty do stworzenia:

```typescript
// apps/web/src/components/okuc/OkucArticlesTable.tsx
export function OkucArticlesTable() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { data: articles } = useQuery({
    queryKey: ['okuc-articles', selectedGroup],
    queryFn: () => okucApi.getArticles({ group: selectedGroup })
  });
  // Table: [Nr | Nazwa | Grupa | Magazyn | Cena EUR | Min | Max | Status | Akcje]
}

// apps/web/src/components/okuc/OkucStockTable.tsx
export function OkucStockTable() {
  const { data: stock } = useQuery({
    queryKey: ['okuc-stock'],
    queryFn: () => okucApi.getStock()
  });
  // Table: [Artykuł | Stan | Status | Zapotrzeb. | Zamówione | Dostawa | Akcje]
  // Kolor: 🟢 OK, 🟡 LOW, 🔴 CRITICAL
}

// apps/web/src/components/okuc/OkucOrdersTable.tsx
export function OkucOrdersTable() {
  const { data: orders } = useQuery({
    queryKey: ['okuc-orders'],
    queryFn: () => okucApi.getOrders()
  });
  // Table: [Artykuł | Ilość | Status | Data dostawy | Notatki | Akcje]
  // Filtry: [Status] [Od daty] [Do daty]
}

// apps/web/src/components/okuc/OkucImportDialog.tsx
export function OkucImportDialog() {
  // Drag & Drop dla Excel/CSV
  // Select: [ZAP] [RW] [REMANENT] [ORDERS]
  // Preview tabel przed zatwierdzeniem
  // Button: [Import]
}

// apps/web/src/components/okuc/OkucArticleForm.tsx
export function OkucArticleForm({ articleId }: { articleId?: number }) {
  // Formularz dodawania/edycji artykułu
  // Fields: [Nr | Nazwa | Grupa | Magazyn | Cena | Min Stan | Max Stan | Notes]
}

// apps/web/src/components/okuc/OkucStatsCards.tsx
export function OkucStatsCards() {
  // 3 karty z głównymi metrykami
  // Card 1: Całkowita liczba artykułów
  // Card 2: Artykuły w stanie krytycznym (🔴)
  // Card 3: Wartość magazynu (EUR)
}

// apps/web/src/components/okuc/OkucCriticalAlert.tsx
export function OkucCriticalAlert() {
  // Alert jeśli są artykuły w stanie krytycznym
  // Przycisk "Pokaż artykuły"
}
```

#### 4.3 API Client - `apps/web/src/lib/api.ts`:

```typescript
export const okucApi = {
  // Articles
  getArticles: (filters?: any) => fetch(`/api/okuc/articles?${new URLSearchParams(filters)}`).then(r => r.json()),
  getArticle: (id: number) => fetch(`/api/okuc/articles/${id}`).then(r => r.json()),
  createArticle: (data: any) => fetch('/api/okuc/articles', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  updateArticle: (id: number, data: any) => fetch(`/api/okuc/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
  deleteArticle: (id: number) => fetch(`/api/okuc/articles/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Stock
  getStock: (filters?: any) => fetch(`/api/okuc/stock?${new URLSearchParams(filters)}`).then(r => r.json()),
  getCritical: () => fetch('/api/okuc/stock/critical').then(r => r.json()),
  updateStock: (articleId: number, data: any) => fetch(`/api/okuc/stock/${articleId}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),

  // Orders
  getOrders: (filters?: any) => fetch(`/api/okuc/orders?${new URLSearchParams(filters)}`).then(r => r.json()),
  createOrder: (data: any) => fetch('/api/okuc/orders', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
  updateOrder: (id: number, data: any) => fetch(`/api/okuc/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
  deleteOrder: (id: number) => fetch(`/api/okuc/orders/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Import
  previewImport: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch('/api/okuc/import/preview', { method: 'POST', body: fd }).then(r => r.json());
  },
  processImport: (data: any) => fetch('/api/okuc/import/process', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),

  // Analytics
  getCriticalArticles: () => fetch('/api/okuc/analytics/critical-articles').then(r => r.json()),
  getWarehouseValue: (currency: string = 'EUR') => fetch(`/api/okuc/analytics/warehouse-value?currency=${currency}`).then(r => r.json()),
  getGroupsSummary: () => fetch('/api/okuc/analytics/groups-summary').then(r => r.json()),
};
```

---

### ETAP 5: LOGIKA BIZNESOWA - Service

#### 5.1 `apps/api/src/services/okuc-calculator.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class OkucCalculator {
  constructor(private prisma: PrismaClient) {}

  async getArticleStatus(
    articleId: number,
    settings: any
  ): Promise<'OK' | 'LOW' | 'CRITICAL'> {
    const article = await this.prisma.okucArticle.findUnique({
      where: { id: articleId },
      include: { stock: true },
    });

    if (!article) return 'OK';

    const currentQty = article.stock?.currentQuantity || 0;
    const minStand = article.minStock;
    const avgUsage = article.avgMonthlyUsage;
    const deliveryTime = settings.defaultDeliveryTime || 1;

    const criticalLevel = avgUsage * deliveryTime;

    if (currentQty >= minStand) return 'OK';
    if (currentQty >= criticalLevel) return 'LOW';
    return 'CRITICAL';
  }

  async recalculateAllStatuses(): Promise<void> {
    const articles = await this.prisma.okucArticle.findMany();
    const settings = { defaultDeliveryTime: 1 };

    for (const article of articles) {
      const status = await this.getArticleStatus(article.id, settings);
      await this.prisma.okucStock.update({
        where: { articleId: article.id },
        data: { status },
      });
    }
  }

  async calculateAverageUsage(
    articleId: number,
    fromDate: Date
  ): Promise<number> {
    const requirements = await this.prisma.okucRequirement.findMany({
      where: {
        articleId,
        documentType: 'RW',
        recordedAt: { gte: fromDate },
      },
    });

    if (requirements.length === 0) return 0;

    const totalQuantity = requirements.reduce((sum, req) => sum + req.quantity, 0);
    const monthsPassed = (new Date().getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return totalQuantity / (monthsPassed || 1);
  }

  async recalculateAverageUsageForAll(fromDate: Date): Promise<void> {
    const articles = await this.prisma.okucArticle.findMany();

    for (const article of articles) {
      const avgUsage = await this.calculateAverageUsage(article.id, fromDate);
      await this.prisma.okucArticle.update({
        where: { id: article.id },
        data: { avgMonthlyUsage: avgUsage },
      });
    }
  }

  async getOrderRecommendations(): Promise<any[]> {
    const articles = await this.prisma.okucArticle.findMany({
      include: { stock: true },
      where: { hidden: false },
    });

    const settings = { defaultDeliveryTime: 1 };
    const recommendations: any[] = [];

    for (const article of articles) {
      const status = await this.getArticleStatus(article.id, settings);

      if (status === 'CRITICAL' || status === 'LOW') {
        const currentQty = article.stock?.currentQuantity || 0;
        const recommendedQty = Math.ceil(article.maxStock);
        const orderQty = Math.max(0, recommendedQty - currentQty);

        recommendations.push({
          articleId: article.id,
          articleNumber: article.articleNumber,
          name: article.name,
          currentQty,
          recommendedQty,
          orderQty,
          status,
          reason: status === 'CRITICAL' ? 'Stan krytyczny' : 'Niski stan',
          price: article.price || 0,
          totalPrice: (article.price || 0) * orderQty,
        });
      }
    }

    return recommendations.sort((a, b) => b.orderQty - a.orderQty);
  }

  async getWarehouseValue(currency: 'EUR' | 'PLN' = 'EUR'): Promise<{
    totalValue: number;
    byGroup: Record<string, number>;
    topArticles: any[];
  }> {
    const articles = await this.prisma.okucArticle.findMany({
      include: { stock: true },
    });

    const settings = await this.prisma.okucSettings.findFirst();
    const eurPlnRate = settings?.eurPlnRate || 4.35;

    let totalValue = 0;
    const byGroup: Record<string, number> = {};
    const topArticles: any[] = [];

    for (const article of articles) {
      const qty = article.stock?.currentQuantity || 0;
      const price = article.price || 0;
      let value = qty * price;

      if (currency === 'PLN') {
        value = value * eurPlnRate;
      }

      totalValue += value;
      byGroup[article.group] = (byGroup[article.group] || 0) + value;

      if (value > 0) {
        topArticles.push({
          articleNumber: article.articleNumber,
          name: article.name,
          value,
          qty,
        });
      }
    }

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      byGroup,
      topArticles: topArticles.sort((a, b) => b.value - a.value).slice(0, 10),
    };
  }
}
```

---

## 📦 MIGRACJA DANYCH Z `c:\magazyn`

### Krok 1: Export danych z PyQt6
```bash
cd c:\magazyn
python main.py
# Zakładka: "Edycja Magazynu" → Eksport do Excel
# Plik: export_articles.xlsx (zawiera wszystkie artykuły)
# Plik: export_stock.xlsx (aktualny stan magazynu)
```

### Krok 2: Import do AKROBUD
```bash
# 1. Wgraj export_articles.xlsx do /magazyn/okuc/import
# 2. Select type: [REMANENT] - ustawia nowy stan
# 3. Potwierdź - artykuły pojawią się w AKROBUD
```

---

## 🔄 FUNKCJONALNOŚĆ KROK PO KROKU

### Faza 1: MVP (Core Features)
- ✅ Schema Prisma (OkucArticle, OkucStock, OkucOrder)
- ✅ API endpoints CRUD
- ✅ Frontend: Tabela artykułów
- ✅ Import Excel (ZAP, RW, REMANENT)
- ✅ Obliczanie statusów (OK/LOW/CRITICAL)

### Faza 2: Advanced
- ✅ Historia zmian (OkucHistory - remanent)
- ✅ Rekomendacje zamówień
- ✅ Analityka (wartość magazynu, trendy)
- ✅ Toast notifications dla błędów
- ✅ Responsywność (mobile)

### Faza 3: Premium
- ⭐ Proporcje artykułów (zestawy)
- ⭐ Generator zamówień z strategiami
- ⭐ Automatyczne alerty (email, SMS)
- ⭐ Export do PDF
- ⭐ Integracja z CRM

---

## 📋 CHECKLIST IMPLEMENTACJI

### ✅ Baza danych
- [ ] Dodaj 7 modeli do schema.prisma
- [ ] Uruchom: `npx prisma migrate dev --name add_okuc_warehouse`
- [ ] Sprawdź tabele w SQLite/PostgreSQL

### ✅ Backend API (16 endpoints)
- [ ] okuc-articles.ts: GET, POST, PUT, DELETE (4)
- [ ] okuc-stock.ts: GET, PUT /status (2)
- [ ] okuc-orders.ts: POST, GET, PUT, DELETE (4)
- [ ] okuc-requirements.ts: POST /import, GET (2)
- [ ] okuc-import.ts: POST /preview, POST /process, GET /history (3)
- [ ] okuc-analytics.ts: 4 endpoints (4)
- [ ] okuc-calculator.ts service (logika biznesowa)
- [ ] okuc-parser.ts (parsowanie Excel)

### ✅ Frontend Components (7 komponenty)
- [ ] OkucArticlesTable
- [ ] OkucStockTable
- [ ] OkucOrdersTable
- [ ] OkucImportDialog
- [ ] OkucArticleForm
- [ ] OkucStatsCards
- [ ] OkucCriticalAlert

### ✅ Strona
- [ ] Zastąp `/magazyn/okuc/page.tsx`
- [ ] Dodaj Tabs (Artykuły | Stan | Zamówienia | Import)
- [ ] Stats Cards
- [ ] Responsive design

### ✅ Testing
- [ ] Test API (Postman/Thunder Client)
- [ ] Test import Excel
- [ ] Test obliczania statusów
- [ ] E2E testy UI

---

## 🎨 INSPIRACJA Z ISTNIEJĄCEGO KODU

Struktura `/magazyn/akrobud/page.tsx` - możesz kopiować:

✅ Sidebar z listą (kolorów → artykułów)
```tsx
<div className="w-full md:w-64 border-r bg-white overflow-y-auto">
  {/* Lista artykułów pogrupowana po grupach */}
</div>
```

✅ Tabela z dynamicznym nagłówkiem
```tsx
<table className="w-full text-sm min-w-[800px]">
  <thead>
    <tr>
      {articles.map(article => (
        <th key={article.id} colSpan={2}>{article.name}</th>
      ))}
    </tr>
  </thead>
</table>
```

✅ Tabs do przełączania widoków
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="zlecenia">Tabela zleceń</TabsTrigger>
    <TabsTrigger value="magazyn">Stan magazynowy</TabsTrigger>
  </TabsList>
</Tabs>
```

✅ Skeleton loaders podczas ładowania
```tsx
{isLoading ? <TableSkeleton rows={8} /> : <table>...</table>}
```

✅ Toast notifications
```tsx
showSuccessToast('Artykuł dodany', 'Pomyślnie dodano nowy artykuł');
showErrorToast('Błąd', 'Nie udało się dodać artykułu');
```

---

## 📊 SZACUNKOWY CZAS IMPLEMENTACJI

| Etap | Zadanie | Czas |
|------|---------|------|
| 1 | Schema Prisma + Migracja | 30 min |
| 2 | API Backend (16 endpoints) | 3 h |
| 4 | Parsery + Import | 1.5 h |
| 5 | Logika biznesowa (Calculator) | 1 h |
| 3 | Frontend (7 komponentów) | 3.5 h |
| Testing | E2E + bugfixes | 1 h |
| **RAZEM** | | **~10 godzin** |

---

## 🚀 NASTĘPNE KROKI

1. **Przejdź do Etapu 1** → Dodaj schema.prisma
2. **Przejdź do Etapu 2** → Pisz API
3. **Przejdź do Etapu 4** → Implementuj parsery
4. **Przejdź do Etapu 3** → Buduj frontend
5. **Test & Deploy** → Migruj dane z c:\magazyn

---

**Czy chcesz abym zaczął od Etapu 1 (schema.prisma)? 🚀**
