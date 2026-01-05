# TypeScript Types Audit Report - AKROBUD

**Data raportu:** 2025-12-19
**Zakres audytu:** Porównanie interfejsów TypeScript w `apps/web/src/types/` z polami zwracanymi przez repozytoria w `apps/api/src/repositories/`

---

## Podsumowanie

Przeprowadzony audyt wykazał **znaczące niezgodności** między typami TypeScript na frontendu a rzeczywistymi danymi zwracanymi przez API. Wiele pól zwracanych przez backend nie jest zdefiniowanych w typach, co może prowadzić do problemów w TypeScript strict mode i błędów runtime'u.

---

## 1. Order

**Plik TypeScript:** `apps/web/src/types/order.ts`
**Repository:** `apps/api/src/repositories/OrderRepository.ts`

### Analiza

#### findById() - Pola zwracane w select:
```typescript
id, orderNumber, status, client, project, system, deadline, pvcDeliveryDate,
valuePln, valueEur, totalWindows, totalSashes, totalGlasses, invoiceNumber,
deliveryDate, productionDate, glassDeliveryDate, notes, createdAt, updatedAt,
archivedAt
```

Plus zagnieżdżone obiekty:
- `requirements` (z fields: id, profileId, colorId, beamsCount, meters, restMm, profile, color)
- `windows` (z fields: id, widthMm, heightMm, profileType, quantity, reference)
- `deliveryOrders` (z fields: id, deliveryId, delivery)
- `orderNotes` (z fields: id, content, createdAt)
- `schucoLinks` (z full details)

#### Problemy:

1. **BRAKUJĄCE POLA W TYPIE Order:**
   - `productionDate` - zwracane w findById(), nie ma w typie
   - `notes` - zwracane w findById(), nie ma w typie
   - `deliveryDate` - zwracane w findById(), nie ma w typie
   - `deliveryOrders` - zwracane w findById(), nie ma w typie Order
   - `orderNotes` - zwracane w findById(), nie ma w typie

2. **POLA W TYPIE, ALE NIE W findAll():**
   - `deliveryId` - w typie, ale **nigdy nie zwracane z repozytoriów**
   - `clientName` - w typie, ale **nigdy nie zwracane z repozytoriów**
   - `priority` - w typie, ale **nigdy nie zwracane z repozytoriów**
   - `updatedAt` - w typie Order, ale **brak w findAll()** (jest w findById())

3. **WINDOW - BRAKUJĄCE POLA:**
   - findAll() zwraca tylko: id, profileType, reference
   - Powinny być również: widthMm, heightMm, quantity

4. **REQUIREMENT - BRAKUJĄCE POLA:**
   - Repository zwraca: id, profileId, colorId, beamsCount, meters, restMm, profile, color
   - Typ Requirement definiuje: id, orderId, profileId, colorId, quantity, profile, color
   - NIEZGODNOŚĆ: `beamsCount` vs `quantity`? Różne pola!
   - BRAKUJE W TYPIE: beamsCount, meters, restMm

### Rekomendacje:

```typescript
// Dodać do Order interface:
deliveryDate?: Timestamp;
productionDate?: Timestamp;
notes?: string;
deliveryOrders?: Array<{
  id: ID;
  deliveryId: ID;
  delivery: {
    id: ID;
    deliveryDate: Timestamp;
    deliveryNumber: string | null;
    status?: string;
  };
}>;
orderNotes?: Array<{
  id: ID;
  content: string;
  createdAt: Timestamp;
}>;

// Usunąć lub wyjaśnić:
// deliveryId, clientName, priority - wydają się nieużywane w API
```

---

## 2. Delivery

**Plik TypeScript:** `apps/web/src/types/delivery.ts`
**Repository:** `apps/api/src/repositories/DeliveryRepository.ts`

### Analiza

#### findById() - Zwraca:
```typescript
id, deliveryDate, deliveryNumber, status, notes, createdAt, updatedAt,
deliveryOrders (with nested order data), deliveryItems
```

#### Problemy:

1. **BRAKUJĄCE W TYPIE Delivery:**
   - `weekNumber` - definiowane w typie, ale **nigdy nie zwracane**
   - `year` - definiowane w typie, ale **nigdy nie zwracane**
   - `colorId` - definiowane w typie, ale **nigdy nie zwracane**
   - `isUnassigned` - definiowane w typie, ale **nigdy nie zwracane**
   - `orders` - definiowane w typie, ale zamiast tego jest `deliveryOrders` (inny format!)
   - `ordersCount` - definiowane w typie, ale **nigdy nie zwracane**
   - `totalWindows` - definiowane w typie, ale **nigdy nie zwracane**
   - `totalGlass` - definiowane w typie, ale **nigdy nie zwracane**
   - `totalPallets` - definiowane w typie, ale **nigdy nie zwracane**
   - `totalValue` - definiowane w typie, ale **nigdy nie zwracane**

2. **STRUKTURA NIEZGODNA:**
   - Typ oczekuje: `orders?: Order[]`
   - Repository zwraca: `deliveryOrders: Array<{ orderId, position, order: {...} }>`
   - To fundamentalnie inny format!

3. **DELIVERYITEMS:**
   - Zwracane w findById(), nie ma w typie jako part of Delivery
   - Typ ma oddzielny interface DeliveryItem

### Rekomendacje:

```typescript
// Delivery interface powinien być:
export interface Delivery {
  id: ID;
  deliveryDate: Timestamp;
  deliveryNumber: string | null;
  status?: string;
  notes: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  deliveryOrders: Array<{
    orderId: ID;
    position: number;
    order: {
      id: ID;
      orderNumber: string;
      valuePln?: string;
      valueEur?: string;
      status?: string;
      windows?: Array<{
        id: ID;
        widthMm: number;
        heightMm: number;
        quantity: number;
      }>;
      requirements?: OrderRequirement[];
    };
  }>;
  deliveryItems?: DeliveryItem[];

  // Poniższe pola wydają się nie być zwracane w API - warto potwierdzić czy są potrzebne
  // weekNumber?: number;
  // year?: number;
  // colorId?: ID;
  // isUnassigned?: boolean;
  // orders?: Order[];
  // ordersCount?: number;
  // totalWindows?: number | null;
  // totalGlass?: number | null;
  // totalPallets?: number | null;
  // totalValue?: number | null;
}
```

---

## 3. Profile

**Plik TypeScript:** `apps/web/src/types/profile.ts`
**Repository:** `apps/api/src/repositories/ProfileRepository.ts`

### Analiza

#### findById() - Zwraca:
```typescript
id, number, name, description, sortOrder, createdAt, updatedAt, articleNumber, profileColors
```

#### Problemy:

1. **BRAKUJE W TYPIE:**
   - `articleNumber` - zwracane w findById(), **nie ma w typie Profile**
   - `profileColors` - zwracane w findById(), **nie ma w typie Profile** (jest oddzielny interface ProfileColor)

2. **BRAK ZAGNIEŻDŻONYCH DANYCH W TYPIE:**
   - Typ nie pokazuje, że profileColors będą zawarte

### Rekomendacje:

```typescript
export interface Profile {
  id: ID;
  number: string;
  name: string;
  description?: string;
  articleNumber?: string;  // DODAĆ
  sortOrder?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  profileColors?: ProfileColor[];  // DODAĆ - zwracane w findById()
}
```

---

## 4. Color

**Plik TypeScript:** `apps/web/src/types/color.ts`
**Repository:** `apps/api/src/repositories/ColorRepository.ts`

### Analiza

#### findById() - Zwraca:
```typescript
id, code, name, type, hexColor, createdAt, updatedAt, profileColors
```

#### Problemy:

1. **BRAKUJE W TYPIE:**
   - `profileColors` - zwracane w findById(), **nie ma w typie Color**

2. **FIELD isVisible:**
   - W typie: `isVisible: boolean`
   - **Nie zwracane w repository findById()** (czy powinno być?)
   - W ColorRepository.findAll() nie ma select, więc bierze alle pola z bazy

### Rekomendacje:

```typescript
export interface Color {
  id: ID;
  name: string;
  code: string;
  type: 'typical' | 'atypical';
  hexColor?: string;
  isVisible?: boolean;  // Uwaga: nie zwracane w findById()
  createdAt: Timestamp;
  updatedAt: Timestamp;
  profileColors?: Array<{  // DODAĆ - zwracane w findById()
    profileId: ID;
    colorId: ID;
    isVisible: boolean;
    profile?: Profile;
  }>;
}
```

---

## 5. WarehouseStock

**Plik TypeScript:** `apps/web/src/types/warehouse.ts`
**Repository:** `apps/api/src/repositories/WarehouseRepository.ts`

### Analiza

#### getStock() - Zwraca:
```typescript
id, profileId, colorId, currentStockBeams, profile, color
```

#### Problemy:

1. **POLE - NAZWA NIEZGODNA:**
   - Typ definiuje: `quantity: number`
   - Repository zwraca: `currentStockBeams: number`
   - **TO JEST ZUPEŁNIE INNA NAZWA!** Powoduje TypeError na froncie

2. **BRAKUJE W TYPIE:**
   - `currentStockBeams` - zwracane w getStock(), nie ma w typie
   - Type ma `quantity`, ale to źle zmapowane pole

3. **BRAKUJE DATY:**
   - Type ma `updatedAt`, ale repository nie zwraca w getStock()

### Rekomendacje:

```typescript
export interface WarehouseStock {
  id: ID;
  profileId: ID;
  colorId: ID;
  currentStockBeams: number;  // ZMIENIĆ z 'quantity'
  // quantity: number;  // USUNĄĆ - zł zmapowania
  profile?: Profile;
  color?: Color;
  updatedAt?: Timestamp;  // Może być zwracane, sprawdzić
}
```

---

## 6. Requirement

**Plik TypeScript:** `apps/web/src/types/requirement.ts`
**Repository:** Zagnieżdżone w OrderRepository (findById), nie ma dedykowanego repo

### Analiza

#### Zwracane w OrderRepository.findById() jako `order.requirements`:
```typescript
id, profileId, colorId, beamsCount, meters, restMm, profile, color
```

#### Problemy:

1. **POLA NIEZGODNE:**
   - Typ definiuje: `quantity: number`
   - Repository zwraca: `beamsCount: number` (inny typ danych - beams to belki profili!)
   - **To zupełnie różne znaczenia!**

2. **BRAKUJE W TYPIE:**
   - `beamsCount` - zwracane w repo, nie ma w typie
   - `meters` - zwracane w repo (metrów profilu), nie ma w typie
   - `restMm` - zwracane w repo (reszta w mm), nie ma w typie

3. **FIELD orderId:**
   - W typie: `orderId: ID`
   - Repository **nie zwraca** orderId (jest w zagnieżdżeniu, więc znamy kontekst)

### Rekomendacje:

```typescript
export interface Requirement {
  id: ID;
  // orderId: ID;  // Nie zwracane w API
  profileId: ID;
  colorId: ID;
  // quantity: number;  // USUNĄĆ - to nie odpowiada 'beamsCount'
  beamsCount: number;  // DODAĆ - liczba belek
  meters: number;  // DODAĆ - metry profilu
  restMm?: number;  // DODAĆ - reszta w mm
  profile?: Profile;
  color?: Color;
  createdAt?: Timestamp;  // Sprawdzić czy zwracane
  updatedAt?: Timestamp;  // Sprawdzić czy zwracane
}
```

---

## 7. GlassDelivery i Glass Orders

**Plik TypeScript:** Brak dedykowanego pliku, typ znajduje się w `schuco.ts`
**Routes:** `apps/api/src/routes/glass-deliveries.ts`, `apps/api/src/routes/glass-orders.ts`
**Service:** `apps/api/src/services/glassDeliveryService.ts`

### Status:

- GlassDeliveryService zwraca dane z Prisma (GlassDelivery, GlassDeliveryItem, GlassOrder models)
- Nie ma dedykowanych typów TypeScript dla GlassDelivery w apps/web
- Typ SchucoDelivery jest dla Schuco Connect deliveries, nie dla glass deliveries
- **BRAKUJE INTERFEJSÓW** dla:
  - GlassDelivery
  - GlassDeliveryItem
  - GlassOrder
  - GlassOrderItem
  - GlassOrderValidation

### Rekomendacje:

Utworzyć plik `apps/web/src/types/glass-delivery.ts`:

```typescript
export interface GlassDeliveryItem {
  id: number;
  glassDeliveryId: number;
  glassOrderId?: number;
  orderNumber: string;
  orderSuffix?: string;
  position: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  glassComposition?: string;
  serialNumber?: string;
  clientCode?: string;
  matchStatus: 'pending' | 'matched' | 'conflict' | 'unmatched';
  matchedItemId?: number;
  createdAt: string;
}

export interface GlassDelivery {
  id: number;
  rackNumber: string;
  customerOrderNumber: string;
  supplierOrderNumber?: string;
  deliveryDate: string;
  fileImportId?: number;
  createdAt: string;
  items: GlassDeliveryItem[];
}

export interface GlassOrder {
  id: number;
  glassOrderNumber: string;
  orderDate: string;
  supplier: string;
  orderedBy?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: GlassOrderItem[];
}

export interface GlassOrderItem {
  id: number;
  glassOrderId: number;
  orderNumber: string;
  orderSuffix?: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  glassComposition?: string;
  createdAt: string;
}
```

---

## 8. PalletOptimizer

**Plik TypeScript:** `apps/web/src/types/pallet.ts`
**Repository:** `apps/api/src/repositories/PalletOptimizerRepository.ts`

### Status:

Typy są dobrze zsynchronizowane. PalletType jest zwracany w repozytoriach.

**Brak niezgodności.**

---

## 9. Podsumowanie niezgodności

### Tabela problemów

| Typ | Problem | Plik | Severity |
|-----|---------|------|----------|
| Order | `notes`, `deliveryDate`, `productionDate`, `deliveryOrders`, `orderNotes` - brakują w typie | order.ts | HIGH |
| Order | `deliveryId`, `clientName`, `priority` - w typie ale nie zwracane | order.ts | MEDIUM |
| Order (Window) | findAll zwraca tylko `id, profileType, reference`, brakuje `widthMm, heightMm, quantity` | order.ts | HIGH |
| Requirement | `quantity` vs `beamsCount` - zupełnie inne znaczenie | requirement.ts | CRITICAL |
| Requirement | Brakuje `beamsCount`, `meters`, `restMm` | requirement.ts | HIGH |
| Delivery | 10+ pól zdefiniowanych w typie, ale nigdy nie zwracane | delivery.ts | MEDIUM |
| Delivery | `orders` vs `deliveryOrders` - inny format struktury | delivery.ts | HIGH |
| Delivery | Brakuje obsługi `deliveryItems` w głównym typie | delivery.ts | MEDIUM |
| Profile | Brakuje `articleNumber` | profile.ts | LOW |
| Profile | Brakuje `profileColors` | profile.ts | LOW |
| Color | Brakuje `profileColors` | color.ts | LOW |
| WarehouseStock | `quantity` vs `currentStockBeams` - zupełnie inne znaczenie | warehouse.ts | CRITICAL |
| Glass* | Brakują całe interfejsy (GlassDelivery, GlassOrder) | (brak pliku) | HIGH |

---

## 10. Zalecenia

### Priorytet 1 - CRITICAL (Wymaga natychmiastowego rozwiązania)

1. **Requirement.quantity vs beamsCount**
   - Zmienić typ na `beamsCount` lub zmienić API
   - Wpływ: Wszystkie operacje z wymaganiami (requirements)

2. **WarehouseStock.quantity vs currentStockBeams**
   - Zmienić typ na `currentStockBeams`
   - Wpływ: Wszystkie operacje magazynowe

### Priorytet 2 - HIGH (Wymaga rozwiązania w sprint)

1. **Order - dodać brakujące pola** (`notes`, `deliveryDate`, `productionDate`, itd.)
2. **Order.Window - poprawić findAll()** aby zwracał wszystkie pola
3. **Delivery - zmienić strukturę** na `deliveryOrders` zamiast `orders`
4. **Glass* - utworzyć brakujące interfejsy**
5. **Order - wyjaśnić** czy `deliveryId`, `clientName`, `priority` są używane

### Priorytet 3 - MEDIUM (Optymalizacja)

1. Usunąć nieużywane pola z typów lub wyjaśnić ich cel
2. Dodać brakujące zagnieżdżone interfejsy (profileColors, orderNotes)
3. Dodać consistency w zwracaniu dat (createdAt, updatedAt)

---

## 11. Pliki do modyfikacji

1. **apps/web/src/types/order.ts** - Dodać pola, poprawić Window
2. **apps/web/src/types/delivery.ts** - Zmienić strukturę, dodać deliveryItems
3. **apps/web/src/types/requirement.ts** - Zmienić quantity na beamsCount, dodać meters, restMm
4. **apps/web/src/types/warehouse.ts** - Zmienić quantity na currentStockBeams
5. **apps/web/src/types/profile.ts** - Dodać articleNumber, profileColors
6. **apps/web/src/types/color.ts** - Dodać profileColors
7. **apps/web/src/types/glass-delivery.ts** - NOWY PLIK - Dodać interfejsy dla glass delivery
8. **apps/web/src/types/index.ts** - Dodać export dla glass-delivery

