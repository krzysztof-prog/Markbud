# Warehouse Module - Overview

Dokumentacja modulu zarzadzania magazynem profili aluminiowych w systemie AKROBUD.

## Cel modulu

Modul magazynu sluzy do:
- **Sledzenia stanow magazynowych** profili aluminiowych w rozbiciu na Profile x Kolor
- **Zaradzania zapotrzebowaniem** - automatyczne obliczanie ile profili potrzeba na aktywne zlecenia
- **Wykrywania brakow** - identyfikacja profili z niedostatecznym stanem magazynowym
- **Zamawiania profili** - rejestrowanie zamowien do dostawcy i sledzenie dostaw
- **Remanentow miesiecznych** - inwentaryzacja z mozliwoscia cofniecia w ciagu 24h
- **Integracji z dostawami Schuco** - automatyczne aktualizacje przy odbiorze zamowien

---

## Model danych

### WarehouseStock - Stan magazynowy

```prisma
model WarehouseStock {
  id                Int       @id @default(autoincrement())
  profileId         Int       @map("profile_id")
  colorId           Int       @map("color_id")
  currentStockBeams Int       @default(0) @map("current_stock_beams")  // Aktualny stan (bele)
  initialStockBeams Int       @default(0) @map("initial_stock_beams")  // Stan poczatkowy miesiaca
  version           Int       @default(0)                              // Optimistic locking
  updatedAt         DateTime  @updatedAt @map("updated_at")
  updatedById       Int?      @map("updated_by_id")
  deletedAt         DateTime? @map("deleted_at")                       // Soft delete

  @@unique([profileId, colorId])
}
```

**Wazne pola:**
- `currentStockBeams` - aktualny stan w belach
- `initialStockBeams` - stan na poczatek miesiaca (przed remantem)
- `version` - wersja rekordu dla optymistycznego blokowania (zapobiega utracie danych przy rownoczesnych zmianach)
- `deletedAt` - soft delete (rekord nie jest fizycznie usuwany)

### WarehouseOrder - Zamowienie profili

```prisma
model WarehouseOrder {
  id                   Int      @id @default(autoincrement())
  profileId            Int      @map("profile_id")
  colorId              Int      @map("color_id")
  orderedBeams         Int      @map("ordered_beams")      // Zamowiona ilosc bel
  expectedDeliveryDate DateTime @map("expected_delivery_date")
  status               String   @default("pending")        // pending | received | archived
  notes                String?
  createdAt            DateTime @default(now())
  createdById          Int?

  @@unique([profileId, colorId, expectedDeliveryDate])
}
```

**Statusy zamowien:**
- `pending` - oczekujace na dostawe
- `received` - odebrane (automatycznie zwieksza stan magazynu)
- `archived` - zarchiwizowane (historyczne)

### WarehouseHistory - Historia zmian

```prisma
model WarehouseHistory {
  id              Int      @id @default(autoincrement())
  profileId       Int      @map("profile_id")
  colorId         Int      @map("color_id")
  calculatedStock Int      @map("calculated_stock")  // Stan obliczony przed remantem
  actualStock     Int      @map("actual_stock")      // Stan policzony podczas remantu
  difference      Int                                 // Roznica (actual - calculated)
  previousStock   Int?     @map("previous_stock")
  currentStock    Int?     @map("current_stock")
  changeType      String?  @map("change_type")       // monthly_inventory | manual_adjustment | rollback
  notes           String?
  recordedAt      DateTime @default(now())
  recordedById    Int?
}
```

**Typy zmian (changeType):**
- `monthly_inventory` - remanent miesieczny
- `manual_adjustment` - reczna korekta stanu
- `rollback` - cofniecie remantu
- `monthly_update` - aktualizacja miesieczna

---

## Kluczowe funkcjonalnosci

### 1. Tabela stanow magazynowych

Glowny widok magazynu wyswietla tabele z danymi:

| Kolumna | Opis |
|---------|------|
| Profil | Numer profilu (np. 001, 002) |
| Stan aktualny | Ile bel jest teraz w magazynie |
| Zapotrzebowanie | Ile bel potrzeba na aktywne zlecenia |
| Po zaspokojeniu | Stan po odjęciu zapotrzebowania (moze byc ujemny!) |
| Zamowione | Ile bel jest w drodze (pending orders) |
| Data dostawy | Najblizsza oczekiwana dostawa |

**Wyroznienia:**
- Czerwone tlo - brak towaru (afterDemand < 0)
- Zolte tlo - niski stan (currentStock <= lowStockThreshold)

### 2. Obliczanie brakow (Shortages)

System automatycznie oblicza braki materialowe:

```typescript
// Wzor na obliczenie braku
shortage = max(0, demand - currentStock)

// Priorytet braku
priority = shortage > 20 ? 'critical' : shortage > 10 ? 'high' : 'medium'
```

Braki sa sortowane od najwazniejszych (najwiekszy shortage).

### 3. Zamowienia magazynowe

Workflow zamawiania profili:
1. **Tworzenie** - podaj profil, kolor, ilosc bel, oczekiwana date dostawy
2. **Oczekiwanie** (status: pending) - zamowienie w drodze
3. **Odbiór** (status: received) - automatycznie zwieksza stan magazynu
4. **Archiwizacja** (status: archived) - zamowienie historyczne

**Automatyczna aktualizacja magazynu:**
- Zmiana na `received` -> +orderedBeams do currentStockBeams
- Zmiana z `received` na inny -> -orderedBeams z currentStockBeams
- Usuniecie odebranego zamowienia -> -orderedBeams z magazynu

### 4. Remanent miesieczny

Proces inwentaryzacji:
1. **Przygotowanie** - system pokazuje stan obliczony vs stan do wpisania
2. **Wprowadzenie stanow** - uzytkownik wpisuje faktycznie policzone bele
3. **Zapis** - system zapisuje roznice i aktualizuje stany
4. **Archiwizacja zlecen** - zlecenia completed dla danego koloru sa archiwizowane

**Mozliwosc cofniecia:**
- Tylko w ciagu 24 godzin od remantu
- Przywraca poprzednie stany magazynowe
- Odarchiwizowuje zlecenia z tego samego okna czasowego

### 5. Srednie zuzycie miesieczne

System oblicza srednie zuzycie profili na podstawie historii:
- Domyslny okres: 6 miesiecy wstecz
- Pokazuje zuzycie per profil per miesiac
- Pomaga w planowaniu zamowien

---

## API Endpoints

### Warehouse Routes (`/api/warehouse`)

#### GET /api/warehouse/:colorId
Pobiera tabele magazynowa dla konkretnego koloru.

**Request:**
```http
GET /api/warehouse/5
```

**Response:**
```json
{
  "color": {
    "id": 5,
    "code": "RAL9016",
    "name": "Bialy",
    "hexColor": "#FFFFFF",
    "type": "standard"
  },
  "data": [
    {
      "profileId": 1,
      "profileNumber": "001",
      "currentStock": 100,
      "initialStock": 120,
      "demand": 30,
      "demandMeters": 180.5,
      "afterDemand": 70,
      "orderedBeams": 50,
      "expectedDeliveryDate": "2026-02-15T00:00:00Z",
      "pendingOrders": [...],
      "receivedOrders": [...],
      "isLow": false,
      "isNegative": false,
      "updatedAt": "2026-01-20T10:30:00Z"
    }
  ]
}
```

#### PUT /api/warehouse/:colorId/:profileId
Aktualizuje stan magazynowy dla profilu/koloru.

**Request:**
```http
PUT /api/warehouse/5/1
Content-Type: application/json

{
  "currentStockBeams": 150,
  "userId": 1
}
```

**Response:**
```json
{
  "profileId": 1,
  "colorId": 5,
  "currentStockBeams": 150,
  "updatedAt": "2026-01-20T12:00:00Z",
  "version": 3,
  "profile": { "id": 1, "number": "001", "name": "Profil glowny" },
  "color": { "id": 5, "code": "RAL9016", "name": "Bialy" }
}
```

#### GET /api/warehouse/shortages
Pobiera wszystkie braki materialowe.

**Request:**
```http
GET /api/warehouse/shortages
```

**Response:**
```json
[
  {
    "profileId": 3,
    "profileNumber": "003",
    "colorId": 5,
    "colorCode": "RAL9016",
    "colorName": "Bialy",
    "currentStock": 10,
    "demand": 35,
    "shortage": 25,
    "orderedBeams": 30,
    "expectedDeliveryDate": "2026-02-10T00:00:00Z",
    "priority": "critical"
  }
]
```

#### GET /api/warehouse/history
Pobiera cala historie zmian magazynowych.

**Request:**
```http
GET /api/warehouse/history?limit=50
```

**Response:**
```json
[
  {
    "id": 123,
    "profileId": 1,
    "colorId": 5,
    "changeType": "monthly_inventory",
    "previousStock": 100,
    "currentStock": 95,
    "calculatedStock": 100,
    "actualStock": 95,
    "difference": -5,
    "recordedAt": "2026-01-15T14:00:00Z",
    "profile": { "id": 1, "number": "001" },
    "color": { "id": 5, "code": "RAL9016" }
  }
]
```

#### GET /api/warehouse/history/:colorId
Pobiera historie zmian dla konkretnego koloru.

**Request:**
```http
GET /api/warehouse/history/5?limit=100
```

#### GET /api/warehouse/:colorId/average
Pobiera srednie miesieczne zuzycie profili.

**Request:**
```http
GET /api/warehouse/5/average?months=6
```

**Response:**
```json
[
  {
    "profileId": 1,
    "profileNumber": "001",
    "profileName": "Profil glowny",
    "averageBeamsPerMonth": 15.5,
    "monthlyData": [
      { "month": "2025-12", "beams": 18 },
      { "month": "2025-11", "beams": 14 },
      { "month": "2025-10", "beams": 12 }
    ],
    "totalBeams": 93,
    "monthsWithData": 6
  }
]
```

#### POST /api/warehouse/monthly-update
Wykonuje remanent miesieczny.

**Request:**
```http
POST /api/warehouse/monthly-update
Content-Type: application/json

{
  "colorId": 5,
  "updates": [
    { "profileId": 1, "actualStock": 95 },
    { "profileId": 2, "actualStock": 42 }
  ],
  "userId": 1
}
```

**Response:**
```json
{
  "updates": [
    {
      "profileId": 1,
      "calculatedStock": 100,
      "actualStock": 95,
      "difference": -5
    },
    {
      "profileId": 2,
      "calculatedStock": 40,
      "actualStock": 42,
      "difference": 2
    }
  ],
  "archivedOrdersCount": 3
}
```

#### POST /api/warehouse/rollback-inventory
Cofa ostatni remanent (tylko w ciagu 24h).

**Request:**
```http
POST /api/warehouse/rollback-inventory
Content-Type: application/json

{
  "colorId": 5,
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cofnieto inwentaryzacje z 2026-01-15T14:00:00Z",
  "rolledBackRecords": [
    { "profileId": 1, "restoredStock": 100, "removedActualStock": 95 }
  ],
  "restoredOrdersCount": 2,
  "inventoryDate": "2026-01-15T14:00:00Z"
}
```

#### POST /api/warehouse/finalize-month
Finalizuje miesiac (archiwizuje zlecenia).

**Request:**
```http
POST /api/warehouse/finalize-month
Content-Type: application/json

{
  "month": "2026-01",
  "archive": false
}
```

**Response (preview):**
```json
{
  "preview": true,
  "ordersCount": 15,
  "orderNumbers": ["ZL-001", "ZL-002", "..."],
  "month": "2026-01"
}
```

**Response (archive=true):**
```json
{
  "success": true,
  "message": "Zarchiwizowano 15 zlecen za 2026-01",
  "archivedCount": 15,
  "archivedOrderNumbers": ["ZL-001", "ZL-002", "..."]
}
```

### Warehouse Orders Routes (`/api/warehouse-orders`)

#### GET /api/warehouse-orders
Lista zamowien magazynowych z filtrowaniem.

**Request:**
```http
GET /api/warehouse-orders?colorId=5&status=pending
```

**Response:**
```json
[
  {
    "id": 1,
    "profileId": 1,
    "colorId": 5,
    "orderedBeams": 50,
    "expectedDeliveryDate": "2026-02-15T00:00:00Z",
    "status": "pending",
    "notes": "Pilne zamowienie",
    "createdAt": "2026-01-10T09:00:00Z",
    "profile": { "id": 1, "number": "001", "name": "Profil glowny" },
    "color": { "id": 5, "code": "RAL9016", "name": "Bialy", "type": "standard" }
  }
]
```

#### GET /api/warehouse-orders/:id
Pobiera szczegoly zamowienia.

#### POST /api/warehouse-orders
Tworzy nowe zamowienie.

**Request:**
```http
POST /api/warehouse-orders
Content-Type: application/json

{
  "profileId": 1,
  "colorId": 5,
  "orderedBeams": 50,
  "expectedDeliveryDate": "2026-02-15",
  "notes": "Pilne zamowienie"
}
```

#### PUT /api/warehouse-orders/:id
Aktualizuje zamowienie.

**Request:**
```http
PUT /api/warehouse-orders/1
Content-Type: application/json

{
  "status": "received",
  "orderedBeams": 48,
  "notes": "Odebrano 48 bel (2 uszkodzone)"
}
```

#### DELETE /api/warehouse-orders/:id
Usuwa zamowienie (jesli bylo received - odejmuje z magazynu).

---

## Walidacja (Zod Schemas)

### Parametry sciezki

```typescript
// colorId z URL
const colorIdParamSchema = z.object({
  colorId: z.coerce.number().int().positive()
});

// colorId + profileId z URL
const profileColorParamsSchema = z.object({
  colorId: z.coerce.number().int().positive(),
  profileId: z.coerce.number().int().positive()
});
```

### Body requestow

```typescript
// Aktualizacja stanu
const updateStockBodySchema = z.object({
  currentStockBeams: z.number().int().nonnegative(),
  userId: z.number().int().positive()
});

// Remanent miesieczny
const monthlyUpdateBodySchema = z.object({
  colorId: z.number().int().positive(),
  updates: z.array(z.object({
    profileId: z.number().int().positive(),
    actualStock: z.number().int().nonnegative()
  })).min(1),
  userId: z.number().int().positive()
});

// Cofniecie remantu
const rollbackInventoryBodySchema = z.object({
  colorId: z.number().int().positive(),
  userId: z.number().int().positive()
});

// Finalizacja miesiaca
const finalizeMonthBodySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),  // YYYY-MM
  archive: z.boolean().optional().default(false)
});
```

---

## Architektura serwisow

Modul magazynu uzywa wzorca fasady z wydzielonymi sub-serwisami:

```
WarehouseService (fasada)
├── WarehouseStockService      - Stany magazynowe i ich aktualizacja
├── WarehouseInventoryService  - Remanenty i finalizacja miesiecy
├── WarehouseShortageService   - Obliczanie brakow
├── WarehouseUsageService      - Statystyki zuzycia
└── WarehouseOrderService      - Zamowienia profili
```

### Lokalizacja plikow

**Backend:**
- Routes: `apps/api/src/routes/warehouse.ts`, `warehouse-orders.ts`
- Handlers: `apps/api/src/handlers/warehouse-handler.ts`, `warehouseOrderHandler.ts`
- Services: `apps/api/src/services/warehouse/`
- Repository: `apps/api/src/repositories/WarehouseRepository.ts`
- Validators: `apps/api/src/validators/warehouse.ts`, `warehouse-orders.ts`

**Frontend:**
- Page: `apps/web/src/app/magazyn/`
- Features: `apps/web/src/features/warehouse/`

---

## Integracja z innymi modulami

### Zlecenia (Orders)

- **OrderRequirement** - zapotrzebowanie na profil/kolor z aktywnych zlecen
- Tylko zlecenia ze statusem `new` lub `in_progress` sa brane pod uwage
- Zlecenia `completed` sa archiwizowane przy remancie

### Dostawy (Deliveries)

- Zamowienia magazynowe (WarehouseOrder) sa powiazane z dostawami Schuco
- Odbiór dostawy automatycznie zmienia status zamowienia na `received`
- Zmiana statusu aktualizuje stan magazynowy

### Kolory i Profile

- WarehouseStock wymaga istniejacego profilu i koloru
- Profile i kolory sa chronione przed usunieciem (onDelete: Restrict)

---

## Optymistyczne blokowanie

System uzywa optimistic locking dla zapobiegania konfliktom przy rownoczesnych zmianach:

```typescript
// Przy aktualizacji stanu:
1. Odczytaj aktualny rekord + wersje
2. Sprawdz czy wersja sie zgadza
3. Jesli tak - zaktualizuj i zwieksz wersje
4. Jesli nie - zwroc blad "Konflikt wersji - odswiez dane"
```

**Blad konfliku:**
```json
{
  "error": "Konflikt wersji: rekord zostal zmodyfikowany przez innego uzytkownika. Odswiez dane i sprobuj ponownie."
}
```

---

## Ustawienia

### lowStockThreshold

Prog niskiego stanu magazynowego - profil z `currentStockBeams <= threshold` jest oznaczany jako `isLow: true`.

Domyslna wartosc: `10` bel

Konfiguracja w tabeli `Setting`:
```sql
INSERT INTO settings (key, value) VALUES ('lowStockThreshold', '10');
```

---

## Testy

Lokalizacja testow:
- `apps/api/src/services/warehouse-service.test.ts` - testy jednostkowe serwisu
- `apps/api/src/services/warehouse/__tests__/warehouseService.critical.test.ts` - testy krytyczne
- `apps/api/src/handlers/warehouse-handler.test.ts` - testy handlerow
- `apps/api/src/repositories/WarehouseRepository.test.ts` - testy repozytorium

Pokryte scenariusze:
- Obliczanie stanow i zapotrzebowania
- Aktualizacja z optimistic locking
- Remanent i jego cofanie
- Obliczanie brakow
- Zmiana statusow zamowien
- Walidacja danych wejsciowych

---

## Powiazane dokumenty

- [stock-management.md](stock-management.md) - Szczegoly zarzadzania stanami
- [../deliveries/overview.md](../deliveries/overview.md) - Integracja z dostawami
- [../orders/overview.md](../orders/overview.md) - Integracja ze zleceniami

---

*Ostatnia aktualizacja: 2026-01-20*
