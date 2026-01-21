# Business Logic Edge Cases

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 7.1 Order Status Transitions Unvalidated

**Severity:** HIGH
**Location:** No status transition validation found

**Problem:**
```typescript
// Brak state machine - mozliwe nielegalne transitions:
// completed -> new
// archived -> in_progress
// deleted -> completed
```

**Scenariusz:**
```typescript
// Order lifecycle: new -> in_progress -> completed -> archived

// User accidentally clicks "Nowe" na completed order
await prisma.order.update({
  where: { id: 123 },
  data: { status: 'new' }  // Invalid transition!
});

// Consequences:
// - Delivery may reference "new" order
// - Production metrics corrupted
// - Invoicing confusion
```

**Sugestia:**
```typescript
type OrderStatus = 'new' | 'in_progress' | 'completed' | 'archived';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['in_progress', 'archived'],
  in_progress: ['completed', 'new'],  // Can revert to new
  completed: ['archived'],
  archived: [],  // Terminal state
};

function validateStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new ValidationError(
      `Niedozwolona zmiana statusu: ${from} -> ${to}`,
      { from, to, allowed: VALID_TRANSITIONS[from] }
    );
  }
}

// In service
async updateOrderStatus(orderId: number, newStatus: OrderStatus) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  validateStatusTransition(order.status as OrderStatus, newStatus);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(newStatus === 'completed' && { completedAt: new Date() })
    }
  });
}
```

---

## 7.2 Delivery Without Orders

**Severity:** Medium
**Location:** Delivery creation logic

**Problem:**
- Mozliwosc utworzenia dostawy bez zadnych zlecen
- Empty delivery -> optymalizacja palet failuje
- Protokol PDF zawiera puste tabele

**Scenariusz:**
```typescript
// User tworzy nowa dostawe
await prisma.delivery.create({
  data: {
    deliveryDate: new Date('2025-01-20'),
    status: 'planned'
  }
});

// Later: User probuje wygenerowac protocol
const delivery = await getDeliveryById(123);
// delivery.deliveryOrders = []

// PDF generation
generateProtocol(delivery);
// -> Empty tables, no content
```

**Sugestia:**
```typescript
// 1. Validation przy generowaniu protokolu
async generateProtocol(deliveryId: number) {
  const delivery = await getDeliveryWithOrders(deliveryId);

  if (delivery.deliveryOrders.length === 0) {
    throw new ValidationError('Nie mozna wygenerowac protokolu dla pustej dostawy');
  }

  // ...
}

// 2. Prevent status change to 'loading' without orders
async updateDeliveryStatus(deliveryId: number, newStatus: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { deliveryOrders: true }
  });

  if (newStatus === 'loading' && delivery.deliveryOrders.length === 0) {
    throw new ValidationError('Dodaj zlecenia przed rozpoczeciem zaladunku');
  }

  // ...
}
```

---

## 7.3 Negative Stock After Demand

**Severity:** HIGH
**Location:** [../../apps/api/src/services/warehouse-service.ts](../../apps/api/src/services/warehouse-service.ts)

**Problem:**
```typescript
// Obliczenie afterDemand = currentStock - demand
// Moze byc ujemne ale brak walidacji

const row: WarehouseRow = {
  currentStock: 50,
  demand: 100,
  afterDemand: -50,  // Negative!
  isNegative: true
};
```

**Scenariusz:**
```typescript
// Profile: Beam 123, Color: RAL9016
// Stock: 50 beams
// Active orders need: 100 beams

// User probuje rozpoczac produkcje
await updateOrderStatus(orderId, 'in_progress');

// Brak sprawdzenia czy materialy sa dostepne
// -> Produkcja started z niewystarczajacym zapasem
// -> Opoznienia, chaos

// Powinno:
if (afterDemand < 0 && !hasWarehouseOrder) {
  throw new ValidationError(
    `Niewystarczajacy zapas ${profileNumber} ${colorCode}. ` +
    `Brakuje ${Math.abs(afterDemand)} belek. ` +
    `Zloz zamowienie do dostawcy przed rozpoczeciem produkcji.`
  );
}
```

**Sugestia:**
```typescript
// Warehouse shortage validation
async validateMaterialAvailability(orderId: number): Promise<ValidationResult> {
  const requirements = await prisma.orderRequirement.findMany({
    where: { orderId },
    include: { profile: true, color: true }
  });

  const shortages: Shortage[] = [];

  for (const req of requirements) {
    const stock = await prisma.warehouseStock.findUnique({
      where: { profileId_colorId: { profileId: req.profileId, colorId: req.colorId } }
    });

    if (!stock || stock.currentStockBeams < req.beamsCount) {
      shortages.push({
        profileNumber: req.profile.number,
        colorCode: req.color.code,
        required: req.beamsCount,
        available: stock?.currentStockBeams ?? 0,
        shortage: req.beamsCount - (stock?.currentStockBeams ?? 0)
      });
    }
  }

  return {
    isValid: shortages.length === 0,
    shortages
  };
}

// Before starting production
const validation = await validateMaterialAvailability(orderId);
if (!validation.isValid) {
  throw new ValidationError('Niewystarczajace zapasy', {
    shortages: validation.shortages
  });
}
```

---

## 7.4 Pallet Optimization Without Profile Depths

**Severity:** Medium
**Location:** [../../apps/api/src/services/delivery/DeliveryOptimizationService.ts:195](../../apps/api/src/services/delivery/DeliveryOptimizationService.ts#L195)

**Problem:**
```typescript
if (missingProfiles.size > 0) {
  // Throw error - optimization can't continue
}
```

- Nowe profile types moga byc dodane bez depth configuration
- Optymalizacja failuje hard zamiast uzywac default

**Scenariusz:**
```typescript
// Admin dodaje nowy profil
await prisma.profile.create({
  data: {
    number: 'NEW-PROFILE-2025',
    name: 'Nowy profil',
    // Zapomnial dodac ProfileDepth
  }
});

// Later: User dodaje zlecenie z tym profilem
// User probuje optymalizowac dostawe
// -> Error: "Missing profile depths for: NEW-PROFILE-2025"
// -> Cala optymalizacja failuje
```

**Sugestia:**
```typescript
// 1. Default depth value
const DEFAULT_PROFILE_DEPTH_MM = 100;

async getProfileDepth(profileType: string): Promise<number> {
  const depth = await prisma.profileDepth.findUnique({
    where: { profileType }
  });

  if (!depth) {
    logger.warn(`Missing profile depth for ${profileType}, using default ${DEFAULT_PROFILE_DEPTH_MM}mm`);
    return DEFAULT_PROFILE_DEPTH_MM;
  }

  return depth.depthMm;
}

// 2. Validation przy tworzeniu profilu
async createProfile(data: CreateProfileInput) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({ data });

    // Auto-create default profile depth
    await tx.profileDepth.create({
      data: {
        profileType: profile.number,
        depthMm: DEFAULT_PROFILE_DEPTH_MM,
        description: 'Auto-generated default depth'
      }
    });

    return profile;
  });
}
```
