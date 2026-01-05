# Orders Module - Overview

Technical documentation for the Orders feature in AKROBUD system.

## Purpose

The Orders module manages production orders for aluminum windows. It handles:
- Order creation (manual and PDF import)
- Order variants (multiple configurations of the same order)
- Profile requirements calculation
- Assignment to deliveries
- Pending prices workflow
- Order lifecycle management

## Architecture

### Data Model

```prisma
model Order {
  id              String    @id @default(uuid())
  orderNumber     String    @unique
  orderDate       DateTime
  clientName      String
  status          OrderStatus
  totalValue      Decimal?
  deliveryId      String?
  
  // Relations
  requirements    OrderRequirement[]
  windows         OrderWindow[]
  delivery        Delivery?
  variants        OrderVariant[]
  pendingPrices   PendingOrderPrice[]
}

model OrderRequirement {
  id          String  @id @default(uuid())
  orderId     String
  profileId   String
  colorId     String
  length      Int     // in mm
  quantity    Int
  
  order       Order   @relation(fields: [orderId])
  profile     Profile @relation(fields: [profileId])
  color       Color   @relation(fields: [colorId])
}

model OrderWindow {
  id          String  @id @default(uuid())
  orderId     String
  position    Int
  type        String
  width       Int     // mm
  height      Int     // mm
  quantity    Int
  
  order       Order   @relation(fields: [orderId])
}
```

### Status Flow

```
new → in_progress → completed → archived
```

**Status descriptions:**
- `new` - Just created, not yet in production
- `in_progress` - Currently being produced
- `completed` - Ready for delivery
- `archived` - Delivered and archived

## Tech Stack

**Backend:**
- Fastify routes: `apps/api/src/routes/orders.ts`
- Handler: `apps/api/src/handlers/orderHandler.ts`
- Service: `apps/api/src/services/orderService.ts`
- Repository: `apps/api/src/repositories/OrderRepository.ts`
- Validators: `apps/api/src/validators/order.ts`

**Frontend:**
- API: `apps/web/src/features/orders/api/ordersApi.ts`
- Hooks: `apps/web/src/features/orders/hooks/`
- Components: `apps/web/src/features/orders/components/`
- Types: `apps/web/src/types/order.ts`

## Key Features

### 1. PDF Import
- OCR-based data extraction from PDF files
- Automatic order data parsing
- Variant detection and handling
- Price pending workflow

### 2. Variant Management
- Multiple configurations per order
- User selection of preferred variant
- Bulk variant acceptance
- Variant switching

### 3. Requirements Calculation
- Automatic profile requirements from windows
- Real-time updates on changes
- Warehouse availability check

### 4. Delivery Assignment
- Assign orders to deliveries
- Bulk assignment support
- Delivery planning integration

## API Endpoints

See [api.md](api.md) for complete API documentation.

**Main endpoints:**
```
GET    /api/orders              # List orders
POST   /api/orders              # Create order
GET    /api/orders/:id          # Get order details
PATCH  /api/orders/:id          # Update order
DELETE /api/orders/:id          # Delete order
POST   /api/orders/import       # Import from PDF
```

## Business Logic

### Order Creation Workflow

1. **PDF Upload** → Parse PDF → Extract data
2. **Validation** → Check data completeness
3. **Variant Detection** → If multiple variants found
4. **User Selection** → Choose preferred variant(s)
5. **Price Handling** → If price missing → Pending workflow
6. **Requirements Calc** → Calculate profile needs
7. **Save Order** → Create in database

### Pending Price Workflow

When PDF doesn't contain price:
1. Order created with `totalValue = null`
2. `PendingOrderPrice` record created
3. Expires after 30 days (configurable)
4. User can:
   - Manually enter price
   - Re-import PDF with price
   - Accept pending price when available

### Variant System

**Scenario:** Client provides multiple color options for same order

**Implementation:**
- Main order created
- Variants stored in `OrderVariant` table
- User selects preferred via UI
- System can activate different variant
- Only one variant active at a time

## Integration Points

### With Deliveries Module
- Orders assigned to deliveries
- Status synced (completed orders → ready for delivery)
- Calendar integration

### With Warehouse Module
- Requirements checked against stock
- Shortages identified
- Stock reserved for orders

### With Schuco Integration
- Order data can originate from Schuco PDFs
- Automatic parsing and import

## Performance Considerations

**Indexes:**
```sql
CREATE INDEX idx_order_number ON Order(orderNumber);
CREATE INDEX idx_order_status_date ON Order(status, orderDate);
CREATE INDEX idx_order_delivery ON Order(deliveryId);
```

**Optimizations:**
- Pagination for large order lists
- Selective loading of relations
- Caching of calculated requirements

## Testing

**Unit Tests:**
- `orderService.test.ts` - Business logic
- `orderHandler.test.ts` - HTTP handlers

**Integration Tests:**
- PDF import flow
- Variant selection
- Requirements calculation

See [Testing Guide](../../guides/testing-guide.md)

## Related Documentation

- [Workflow](workflow.md) - Order lifecycle details
- [API](api.md) - Complete API reference
- [Variants](variants.md) - Variant system details

---

*Last updated: 2025-12-30*
