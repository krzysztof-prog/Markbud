# Orders Module - Variants System

Documentation for order variants handling.

## Overview

Variants allow multiple configurations of the same order (e.g., different colors, profiles). Common when client provides alternative options.

## Use Cases

1. **Color alternatives** - Same window, different colors
2. **Profile alternatives** - Different profile depths
3. **Price variants** - Different price points for configurations

## Data Model

```prisma
model OrderVariant {
  id              String   @id @default(uuid())
  orderId         String
  variantNumber   Int
  description     String?
  isActive        Boolean  @default(false)
  
  // Configuration data
  windows         Json
  requirements    Json
  totalValue      Decimal?
  
  order           Order    @relation(fields: [orderId])
  
  @@unique([orderId, variantNumber])
}
```

## Variant Detection

During PDF import, system detects variants when:

```typescript
// Example detection logic
function detectVariants(pdfData) {
  const windowGroups = groupBy(pdfData.windows, 'position');
  
  const variants = [];
  for (const [position, windows] of windowGroups) {
    if (windows.length > 1) {
      // Multiple configs for same position
      variants.push({
        position,
        options: windows
      });
    }
  }
  
  return variants.length > 0 ? createVariantMatrix(variants) : null;
}
```

## User Workflow

### 1. Variant Selection Modal

When variants detected, user sees:

```
┌─────────────────────────────────────────┐
│  Wybierz Warianty Zlecenia              │
├─────────────────────────────────────────┤
│                                          │
│  Znaleziono 2 warianty dla tego zlecenia│
│                                          │
│  ○ Wariant 1: RAL 9016 (białyy)         │
│    - Okna: 5 szt                         │
│    - Wartość: 15,000 PLN                 │
│                                          │
│  ○ Wariant 2: RAL 7016 (antracyt)       │
│    - Okna: 5 szt                         │
│    - Wartość: 16,500 PLN                 │
│                                          │
│  [ ] Akceptuj wszystkie warianty         │
│                                          │
│  [Anuluj]  [Zatwierdź wybrane]          │
└─────────────────────────────────────────┘
```

### 2. Accept Options

**Option A: Single variant**
- User selects 1 variant
- Creates 1 order with selected config
- Other variants discarded

**Option B: Multiple variants**
- User checks "Accept all"
- Creates 1 order with all variants stored
- Only 1 variant active at a time
- Can switch later

**Option C: Create separate orders**
- User selects multiple variants
- System creates separate order for each
- Each with different order number (53456-1, 53456-2)

### 3. Switching Variants

After order created with multiple variants:

1. Open order details
2. Tab "Warianty"
3. See all variants in table
4. Click "Aktywuj" on different variant
5. System:
   - Updates order data
   - Recalculates requirements
   - Preserves old variant for reference

## API

### Get Order Variants

```http
GET /api/orders/:id/variants
```

Response:
```json
{
  "variants": [
    {
      "id": "uuid",
      "variantNumber": 1,
      "description": "RAL 9016 variant",
      "isActive": true,
      "windows": [...],
      "requirements": [...],
      "totalValue": 15000.50
    },
    {
      "id": "uuid",
      "variantNumber": 2,
      "description": "RAL 7016 variant",
      "isActive": false,
      "windows": [...],
      "requirements": [...],
      "totalValue": 16500.00
    }
  ]
}
```

### Activate Variant

```http
POST /api/orders/:id/variants/:variantId/activate
```

Response:
```json
{
  "message": "Variant activated",
  "order": {
    "id": "uuid",
    "windows": [...],
    "requirements": [...]
  }
}
```

## Frontend Components

**VariantSelectionModal**
- `apps/web/src/features/orders/components/VariantSelectionModal.tsx`
- Shows variant comparison
- Handles user selection

**VariantsList**
- `apps/web/src/features/orders/components/VariantsList.tsx`
- Displays variants in order details
- Switch variant action

## Business Rules

1. **Only 1 active variant** - Cannot have multiple active simultaneously
2. **Preserve history** - Inactive variants kept for reference
3. **Recalculate on switch** - Requirements recalculated when activating variant
4. **Warehouse check** - Stock availability checked for new variant

## Edge Cases

### Case 1: Variant with Different Window Count

**Scenario:** Variant 1 has 5 windows, Variant 2 has 7 windows

**Handling:**
- Each variant stores complete window list
- On activation, order.windows replaced entirely
- Requirements recalculated from scratch

### Case 2: Pending Price Variants

**Scenario:** One variant has price, another doesn't

**Handling:**
- Mark order as pending price if any variant missing price
- Accept price for specific variant
- Other variants remain pending

### Case 3: Delivery Assignment

**Scenario:** Order with variants assigned to delivery

**Handling:**
- Warning when switching variant (affects delivery pallet calculation)
- Option to recalculate delivery optimization
- Or keep current variant for delivery

---

*Last updated: 2025-12-30*
