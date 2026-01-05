# Glass Module - Orders

Documentation for glass order management.

## Purpose

Manages glass orders for windows:
- Order creation from PDF
- Supplier tracking
- Delivery status
- Assignment to production orders

## Data Model

```prisma
model GlassOrder {
  id              String   @id @default(uuid())
  orderNumber     String   @unique
  supplier        String   // Pilkington, Guardian, etc.
  orderDate       DateTime
  deliveryDate    DateTime?
  status          String   // ordered, in_production, shipped, delivered
  totalValue      Decimal?
  
  items           GlassOrderItem[]
  deliveries      GlassDelivery[]
}

model GlassOrderItem {
  id          String  @id @default(uuid())
  orderId     String
  glassType   String  // 4/16/4, double glazing, etc.
  width       Int     // mm
  height      Int     // mm
  quantity    Int
  
  order       GlassOrder @relation(fields: [orderId])
}
```

## Workflow

1. **Import PDF** → Parse glass order
2. **Validation** → Check dimensions, types
3. **Create Order** → Save to database
4. **Track Status** → Monitor with supplier
5. **Delivery** → Receive and confirm

## API

```http
GET  /api/glass/orders
POST /api/glass/orders
POST /api/glass/orders/import
```

---

*Last updated: 2025-12-30*
