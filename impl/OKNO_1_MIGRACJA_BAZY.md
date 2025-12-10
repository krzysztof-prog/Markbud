# OKNO 1: Migracja Bazy Danych

## PRIORYTET: KRYTYCZNY - WYKONAJ NAJPIERW!

To okno MUSI być ukończone PRZED rozpoczęciem pracy w oknach 2-4.

---

## Cel

Dodać wszystkie nowe modele i pola do `schema.prisma` dla:
- Glass Tracking (zamówienia i dostawy szyb)
- Remanent (pole initialStockBeams)

---

## Przed rozpoczęciem

```bash
# 1. Backup bazy danych
cp apps/api/dev.db apps/api/dev.db.backup

# 2. Zatrzymaj serwery deweloperskie (jeśli uruchomione)
# Ctrl+C w terminalach z pnpm dev
```

---

## Zmiany do wykonania

### Plik: `apps/api/prisma/schema.prisma`

### 1. Rozszerz model WarehouseStock (dla Remanent)

Znajdź model `WarehouseStock` i dodaj pole `initialStockBeams`:

```prisma
model WarehouseStock {
  id                Int      @id @default(autoincrement())
  profileId         Int      @map("profile_id")
  colorId           Int      @map("color_id")
  currentStockBeams Int      @default(0) @map("current_stock_beams")
  initialStockBeams Int      @default(0) @map("initial_stock_beams")  // DODAJ TO POLE
  updatedAt         DateTime @updatedAt @map("updated_at")
  updatedById       Int?     @map("updated_by_id")

  profile   Profile @relation(fields: [profileId], references: [id])
  color     Color   @relation(fields: [colorId], references: [id])
  updatedBy User?   @relation("UpdatedBy", fields: [updatedById], references: [id])

  @@unique([profileId, colorId])
  @@index([colorId])
  @@index([profileId])
  @@map("warehouse_stock")
}
```

### 2. Rozszerz model Order (dla Glass Tracking)

Znajdź model `Order` i dodaj pola oraz relację:

```prisma
model Order {
  id                Int       @id @default(autoincrement())
  orderNumber       String    @unique @map("order_number")
  status            String    @default("new")
  client            String?
  project           String?
  system            String?
  deadline          DateTime?
  pvcDeliveryDate   DateTime? @map("pvc_delivery_date")
  valuePln          Float?    @map("value_pln")
  valueEur          Float?    @map("value_eur")
  invoiceNumber     String?   @map("invoice_number")
  deliveryDate      DateTime? @map("delivery_date")
  productionDate    DateTime? @map("production_date")
  glassDeliveryDate DateTime? @map("glass_delivery_date")
  notes             String?
  totalWindows      Int?      @map("total_windows")
  totalSashes       Int?      @map("total_sashes")
  totalGlasses      Int?      @map("total_glasses")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  completedAt       DateTime? @map("completed_at")
  archivedAt        DateTime? @map("archived_at")

  // DODAJ TE 3 POLA dla Glass Tracking:
  orderedGlassCount   Int?    @default(0) @map("ordered_glass_count")
  deliveredGlassCount Int?    @default(0) @map("delivered_glass_count")
  glassOrderStatus    String? @default("not_ordered") @map("glass_order_status")

  // Istniejące relacje
  requirements       OrderRequirement[]
  windows            OrderWindow[]
  deliveryOrders     DeliveryOrder[]
  orderNotes         Note[]
  monthlyReportItems MonthlyReportItem[]

  // DODAJ TĘ RELACJĘ:
  glassOrderItems    GlassOrderItem[]

  // Istniejące indeksy
  @@index([status])
  @@index([archivedAt])
  @@index([createdAt])
  @@index([deliveryDate])
  @@index([completedAt])
  @@index([status, createdAt])
  @@index([invoiceNumber, createdAt])
  @@index([invoiceNumber, deliveryDate])
  @@index([archivedAt, status])
  @@index([createdAt, archivedAt])
  @@index([status, archivedAt])

  // DODAJ TEN INDEKS:
  @@index([glassOrderStatus])

  @@map("orders")
}
```

### 3. Dodaj nowe modele Glass Tracking (na końcu pliku)

Dodaj te modele NA KOŃCU pliku `schema.prisma`:

```prisma
// ==================== ZAMÓWIENIA SZYB ====================

model GlassOrder {
  id                   Int       @id @default(autoincrement())
  glassOrderNumber     String    @unique @map("glass_order_number")
  orderDate            DateTime  @map("order_date")
  supplier             String
  orderedBy            String?   @map("ordered_by")
  expectedDeliveryDate DateTime? @map("expected_delivery_date")
  actualDeliveryDate   DateTime? @map("actual_delivery_date")
  status               String    @default("ordered")
  notes                String?
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  items             GlassOrderItem[]
  deliveryItems     GlassDeliveryItem[]
  validationResults GlassOrderValidation[]

  @@index([glassOrderNumber])
  @@index([orderDate])
  @@index([status])
  @@index([expectedDeliveryDate])
  @@map("glass_orders")
}

model GlassOrderItem {
  id           Int      @id @default(autoincrement())
  glassOrderId Int      @map("glass_order_id")
  orderNumber  String   @map("order_number")
  orderSuffix  String?  @map("order_suffix")
  position     String
  glassType    String   @map("glass_type")
  widthMm      Int      @map("width_mm")
  heightMm     Int      @map("height_mm")
  quantity     Int
  createdAt    DateTime @default(now()) @map("created_at")

  glassOrder GlassOrder @relation(fields: [glassOrderId], references: [id], onDelete: Cascade)
  order      Order?     @relation(fields: [orderNumber], references: [orderNumber])

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([orderNumber, orderSuffix])
  @@index([widthMm, heightMm])
  @@map("glass_order_items")
}

// ==================== DOSTAWY SZYB ====================

model GlassDelivery {
  id                  Int      @id @default(autoincrement())
  rackNumber          String   @map("rack_number")
  customerOrderNumber String   @map("customer_order_number")
  supplierOrderNumber String?  @map("supplier_order_number")
  deliveryDate        DateTime @map("delivery_date")
  fileImportId        Int?     @map("file_import_id")
  createdAt           DateTime @default(now()) @map("created_at")

  items      GlassDeliveryItem[]
  fileImport FileImport?         @relation(fields: [fileImportId], references: [id])

  @@index([rackNumber])
  @@index([customerOrderNumber])
  @@index([deliveryDate])
  @@map("glass_deliveries")
}

model GlassDeliveryItem {
  id               Int      @id @default(autoincrement())
  glassDeliveryId  Int      @map("glass_delivery_id")
  glassOrderId     Int?     @map("glass_order_id")
  orderNumber      String   @map("order_number")
  orderSuffix      String?  @map("order_suffix")
  position         String
  widthMm          Int      @map("width_mm")
  heightMm         Int      @map("height_mm")
  quantity         Int
  glassComposition String?  @map("glass_composition")
  serialNumber     String?  @map("serial_number")
  clientCode       String?  @map("client_code")
  matchStatus      String   @default("pending") @map("match_status")
  matchedItemId    Int?     @map("matched_item_id")
  createdAt        DateTime @default(now()) @map("created_at")

  glassDelivery GlassDelivery @relation(fields: [glassDeliveryId], references: [id], onDelete: Cascade)
  glassOrder    GlassOrder?   @relation(fields: [glassOrderId], references: [id])

  @@index([glassDeliveryId])
  @@index([orderNumber])
  @@index([orderNumber, orderSuffix])
  @@index([matchStatus])
  @@index([widthMm, heightMm])
  @@map("glass_delivery_items")
}

// ==================== WALIDACJA ZAMÓWIEŃ SZYB ====================

model GlassOrderValidation {
  id                Int       @id @default(autoincrement())
  glassOrderId      Int?      @map("glass_order_id")
  orderNumber       String    @map("order_number")
  validationType    String    @map("validation_type")
  severity          String
  expectedQuantity  Int?      @map("expected_quantity")
  orderedQuantity   Int?      @map("ordered_quantity")
  deliveredQuantity Int?      @map("delivered_quantity")
  message           String
  details           String?
  resolved          Boolean   @default(false)
  resolvedAt        DateTime? @map("resolved_at")
  resolvedBy        String?   @map("resolved_by")
  createdAt         DateTime  @default(now()) @map("created_at")

  glassOrder GlassOrder? @relation(fields: [glassOrderId], references: [id], onDelete: Cascade)

  @@index([glassOrderId])
  @@index([orderNumber])
  @@index([severity])
  @@index([resolved])
  @@map("glass_order_validations")
}
```

### 4. Rozszerz model FileImport (dodaj relację)

Znajdź model `FileImport` i dodaj relację:

```prisma
model FileImport {
  // ... istniejące pola ...

  // DODAJ TĘ RELACJĘ:
  glassDeliveries GlassDelivery[]

  // ... istniejące relacje ...
}
```

---

## Wykonanie migracji

```bash
cd apps/api

# Synchronizuj schema z bazą danych
npx prisma db push

# Wygeneruj klienta Prisma
npx prisma generate
```

### Możliwe błędy i rozwiązania:

**Błąd: `EPERM: operation not permitted, rename`**
- Rozwiązanie: Zatrzymaj serwery deweloperskie i spróbuj ponownie

**Błąd: `P3006 Migration failed to apply cleanly to the shadow database`**
- Rozwiązanie: Użyj `npx prisma db push` zamiast `npx prisma migrate dev`

---

## Weryfikacja

```bash
# Otwórz Prisma Studio i sprawdź czy modele istnieją
npx prisma studio
```

Sprawdź czy widzisz nowe tabele:
- [ ] glass_orders
- [ ] glass_order_items
- [ ] glass_deliveries
- [ ] glass_delivery_items
- [ ] glass_order_validations

Sprawdź czy pole `initial_stock_beams` istnieje w `warehouse_stock`.

---

## Po zakończeniu

1. **Potwierdź sukces** w głównym czacie:
   ```
   Okno 1 zakończone. Migracja schema.prisma wykonana pomyślnie.
   Można startować okna 2, 3 i 4.
   ```

2. **NIE MODYFIKUJ** już `schema.prisma` w innych oknach!

---

## Checklist

- [ ] Backup bazy danych wykonany
- [ ] Serwery zatrzymane
- [ ] Pole `initialStockBeams` dodane do `WarehouseStock`
- [ ] Pola glass tracking dodane do `Order`
- [ ] Relacja `glassOrderItems` dodana do `Order`
- [ ] Model `GlassOrder` dodany
- [ ] Model `GlassOrderItem` dodany
- [ ] Model `GlassDelivery` dodany
- [ ] Model `GlassDeliveryItem` dodany
- [ ] Model `GlassOrderValidation` dodany
- [ ] Relacja `glassDeliveries` dodana do `FileImport`
- [ ] `npx prisma db push` wykonane bez błędów
- [ ] `npx prisma generate` wykonane bez błędów
- [ ] Prisma Studio pokazuje nowe tabele
