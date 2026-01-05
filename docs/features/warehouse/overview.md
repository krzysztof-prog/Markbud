# Warehouse Module - Overview

Documentation for warehouse stock management system.

## Purpose

Manages aluminum profile inventory:
- Stock tracking (Profile × Color)
- Operations history
- Shortage calculation
- Monthly remanent (inventory)
- Schuco orders integration

## Data Model

```prisma
model WarehouseStock {
  id          String   @id @default(uuid())
  profileId   String
  colorId     String
  quantity    Int      // mm
  version     Int      @default(1)  // Optimistic locking
  lastUpdated DateTime @updatedAt
  
  @@unique([profileId, colorId])
}

model WarehouseHistory {
  id            String   @id @default(uuid())
  profileId     String
  colorId       String
  operationType String   // ADJUSTMENT, DELIVERY, CONSUMPTION, TRANSFER
  quantity      Int      // Can be negative
  reason        String?
  userId        String?
  createdAt     DateTime @default(now())
}
```

## Key Features

### 1. Stock Management
- Real-time stock levels
- Optimistic locking (version field)
- Multi-warehouse support

### 2. Operations
- **Manual Adjustment** - Corrections, inventory
- **Delivery** - Receiving from supplier
- **Consumption** - Usage on orders
- **Transfer** - Between warehouses

### 3. Shortage Calculation
```typescript
shortage = max(0, requirement - availableStock)
```

### 4. Monthly Remanent
- Monthly inventory counting
- Difference tracking
- Automatic corrections
- PDF reports

## Tech Stack

**Backend:**
- Routes: `apps/api/src/routes/warehouse.ts`
- Service: `apps/api/src/services/warehouse-service.ts`
- Repository: `apps/api/src/repositories/WarehouseRepository.ts`

**Frontend:**
- Page: `apps/web/src/app/magazyn/page.tsx`
- API: `apps/web/src/features/warehouse/`

## API Endpoints

```
GET    /api/warehouse/stock          # List stock
POST   /api/warehouse/operations     # Record operation
GET    /api/warehouse/history        # Operation history
GET    /api/warehouse/shortages      # Calculate shortages
POST   /api/warehouse/remanent       # Start/finish remanent
```

See [stock-management.md](stock-management.md) for details.

---

*Last updated: 2025-12-30*
