# Glass Module - Orders

Dokumentacja modulu zarzadzania zamowieniami szyb (GlassOrder) oraz ich integracji z dostawami (GlassDelivery).

## Purpose

Modul zarzadza cyklem zycia zamowien szyb:
- Import zamowien z plikow TXT (eksport z systemu dostawcy)
- Sledzenie statusu zamowienia u dostawcy
- Automatyczne dopasowanie zamowionych szyb do zlecen produkcyjnych
- Integracja z dostawami (GlassDelivery) - walidacja dostarczonych sztuk
- Raportowanie rozbieznosci (brakujace, nadwyzki, konflikty)

---

## Data Model

### GlassOrder - Zamowienie szyb

```prisma
model GlassOrder {
  id                   Int                    @id @default(autoincrement())
  glassOrderNumber     String                 @unique    // Numer zamowienia u dostawcy
  orderDate            DateTime               // Data zlozenia zamowienia
  supplier             String                 // Dostawca (Pilkington, Guardian, etc.)
  orderedBy            String?                // Kto zamowil
  expectedDeliveryDate DateTime?              // Planowana data dostawy
  actualDeliveryDate   DateTime?              // Rzeczywista data dostawy
  status               String                 @default("ordered")
  notes                String?
  deletedAt            DateTime?              // Soft delete

  items                GlassOrderItem[]       // Zamowione szyby
  deliveryItems        GlassDeliveryItem[]    // Dostarczone szyby
  validationResults    GlassOrderValidation[] // Problemy/walidacje
}
```

### GlassOrderItem - Pozycja zamowienia

```prisma
model GlassOrderItem {
  id           Int        @id @default(autoincrement())
  glassOrderId Int
  orderNumber  String     // Numer zlecenia produkcyjnego (np. "53690")
  orderSuffix  String?    // Suffix zlecenia (np. "-1", "-2")
  position     String     // Pozycja w zleceniu
  glassType    String     // Typ szyby (np. "4/16Ar/4T")
  widthMm      Int        // Szerokosc w mm
  heightMm     Int        // Wysokosc w mm
  quantity     Int        // Ilosc sztuk

  glassOrder   GlassOrder @relation(...)
}
```

### GlassOrderValidation - Walidacje i problemy

```prisma
model GlassOrderValidation {
  id                Int         @id @default(autoincrement())
  glassOrderId      Int?
  orderNumber       String      // Zlecenie ktorego dotyczy problem
  validationType    String      // Typ problemu
  severity          String      // error | warning | info
  expectedQuantity  Int?
  orderedQuantity   Int?
  deliveredQuantity Int?
  message           String      // Czytelny opis problemu
  details           String?     // JSON z dodatkowymi danymi
  resolved          Boolean     @default(false)
  resolvedAt        DateTime?
  resolvedBy        String?
}
```

---

## Workflow zamowien szyb

### 1. Import zamowienia (GlassOrder)

```
                     +------------------+
                     |   Plik TXT       |
                     | (eksport z sys.) |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     |  POST /import    |
                     |  (upload file)   |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     |  Parser TXT      |
                     |  (parsowanie)    |
                     +--------+---------+
                              |
                              v
                     +------------------+
                     | Sprawdz czy      |
                     | juz istnieje     |
                     +--------+---------+
                              |
               +--------------+--------------+
               |                             |
               v                             v
        +-------------+              +---------------+
        | NIE istnieje|              | JUZ istnieje  |
        +------+------+              +-------+-------+
               |                             |
               v                             v
        +-------------+              +---------------+
        | Utworz      |              | ConflictError |
        | GlassOrder  |              | 409 + details |
        +------+------+              +---------------+
               |
               v
        +------------------+
        | Match z Order    |
        | (zlecenia prod.) |
        +--------+---------+
               |
               v
        +------------------+
        | Aktualizuj       |
        | orderedGlassCount|
        +------------------+
```

### 2. Matching z zleceniami produkcyjnymi

Po imporcie system automatycznie:
1. Grupuje pozycje zamowienia wg `orderNumber`
2. Szuka zlecen produkcyjnych (`Order`) z pasujacym numerem
3. Aktualizuje `Order.orderedGlassCount` o ilosc zamowionych szyb
4. Ustawia `Order.glassOrderStatus = 'ordered'`
5. Kopiuje `expectedDeliveryDate` do `Order.glassDeliveryDate`

Jezeli zlecenie produkcyjne NIE istnieje:
- Tworzy `GlassOrderValidation` z typem `missing_production_order`
- Severity: `warning`

### 3. Dostawa szyb (GlassDelivery)

Gdy przychodzi dostawa (import CSV z WZ):
1. System tworzy `GlassDelivery` z `GlassDeliveryItem`
2. Uruchamia matching szyb:
   - **Exact match**: orderNumber + orderSuffix + wymiary
   - **Conflict match**: orderNumber + wymiary (ale inny suffix)
   - **Unmatched**: brak odpowiednika w zamowieniu

3. Aktualizuje `Order.deliveredGlassCount`
4. Aktualizuje `Order.glassOrderStatus`:
   - `delivered` - wszystkie szyby dostarczone
   - `partially_delivered` - czesciowa dostawa
   - `over_delivered` - nadwyzka

---

## API Endpoints

### Glass Orders (`/api/glass-orders`)

#### GET /api/glass-orders
Pobiera liste zamowien szyb.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filtruj po statusie (ordered, delivered, etc.) |
| orderNumber | string | Szukaj po numerze zamowienia |

**Response:**
```json
[
  {
    "id": 1,
    "glassOrderNumber": "ZAM-2026-001",
    "orderDate": "2026-01-15T10:00:00Z",
    "supplier": "Pilkington",
    "status": "ordered",
    "items": [...],
    "validationResults": [...],
    "_count": { "items": 45 }
  }
]
```

#### GET /api/glass-orders/:id
Pobiera szczegoly zamowienia z pozycjami i walidacjami.

**Response:**
```json
{
  "id": 1,
  "glassOrderNumber": "ZAM-2026-001",
  "orderDate": "2026-01-15T10:00:00Z",
  "supplier": "Pilkington",
  "expectedDeliveryDate": "2026-01-20T00:00:00Z",
  "status": "ordered",
  "items": [
    {
      "id": 101,
      "orderNumber": "53690",
      "orderSuffix": null,
      "position": "1",
      "glassType": "4/16Ar/4T",
      "widthMm": 1200,
      "heightMm": 800,
      "quantity": 2
    }
  ],
  "validationResults": [...],
  "deliveryItems": [...]
}
```

#### POST /api/glass-orders/import
Importuje zamowienie z pliku TXT.

**Request:**
- Content-Type: `multipart/form-data`
- Body: plik TXT

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| replace | "true" | Nadpisz istniejace zamowienie |

**Response (201):**
```json
{
  "id": 1,
  "glassOrderNumber": "ZAM-2026-001",
  "items": [...]
}
```

**Response (409 - Conflict):**
```json
{
  "error": "Zamówienie ZAM-2026-001 już istnieje",
  "details": {
    "existingOrder": {
      "id": 1,
      "glassOrderNumber": "ZAM-2026-001",
      "orderDate": "2026-01-15T10:00:00Z",
      "itemsCount": 45
    },
    "newOrder": {
      "glassOrderNumber": "ZAM-2026-001",
      "orderDate": "2026-01-16T08:00:00Z",
      "itemsCount": 48
    }
  }
}
```

#### DELETE /api/glass-orders/:id
Usuwa zamowienie (soft delete).

**Response:** 204 No Content

#### GET /api/glass-orders/:id/summary
Pobiera podsumowanie zamowienia z rozbiciem na zlecenia.

**Response:**
```json
{
  "glassOrderNumber": "ZAM-2026-001",
  "totalOrdered": 45,
  "totalDelivered": 30,
  "orderBreakdown": [
    {
      "orderNumber": "53690",
      "ordered": 10,
      "delivered": 8,
      "status": "partial"
    }
  ],
  "issues": [...]
}
```

#### PATCH /api/glass-orders/:id/status
Aktualizuje status zamowienia.

**Request:**
```json
{
  "status": "delivered"
}
```

**Dozwolone statusy:** `ordered`, `partially_delivered`, `delivered`, `cancelled`

---

### Glass Validations (`/api/glass-validations`)

#### GET /api/glass-validations/dashboard
Dashboard z statystykami walidacji.

**Response:**
```json
{
  "stats": {
    "total": 15,
    "errors": 3,
    "warnings": 10,
    "info": 2,
    "byType": {
      "missing_production_order": 5,
      "unmatched_delivery": 3,
      "quantity_surplus": 4,
      "suffix_mismatch": 3
    }
  },
  "recentIssues": [...]
}
```

#### GET /api/glass-validations/order/:orderNumber
Walidacje dla konkretnego zlecenia.

#### GET /api/glass-validations/order/:orderNumber/details
Szczegolowe rozbieznosci szyb per wymiar.

**Response:**
```json
{
  "orderNumber": "53690",
  "summary": {
    "totalOrdered": 10,
    "totalDelivered": 8,
    "difference": -2,
    "status": "shortage"
  },
  "comparison": [
    {
      "dimension": "1200x800",
      "widthMm": 1200,
      "heightMm": 800,
      "ordered": 4,
      "delivered": 4,
      "difference": 0,
      "status": "ok",
      "orderedPositions": ["poz.1", "poz.2"],
      "deliveries": [
        {
          "deliveryId": 5,
          "deliveryDate": "2026-01-18T00:00:00Z",
          "rackNumber": "R-001",
          "quantity": 4
        }
      ]
    },
    {
      "dimension": "900x600",
      "status": "shortage",
      "ordered": 2,
      "delivered": 0,
      "difference": -2
    }
  ]
}
```

#### POST /api/glass-validations/:id/resolve
Oznacza walidacje jako rozwiazana.

**Request:**
```json
{
  "resolvedBy": "Jan Kowalski",
  "notes": "Sprawdzono - szyby dotarly nastepnego dnia"
}
```

---

## Statusy zamowien szyb

### Order.glassOrderStatus

| Status | Opis | Kiedy |
|--------|------|-------|
| `not_ordered` | Nie zamowiono | Brak GlassOrderItem dla tego zlecenia |
| `ordered` | Zamowione | Istnieja pozycje w GlassOrder, brak dostaw |
| `partially_delivered` | Czesciowo dostarczone | delivered < ordered |
| `delivered` | Dostarczone | delivered == ordered |
| `over_delivered` | Nadwyzka | delivered > ordered |

### GlassOrder.status

| Status | Opis |
|--------|------|
| `ordered` | Zamowienie zloz one |
| `partially_delivered` | Czesciowo zrealizowane |
| `delivered` | Zrealizowane |
| `cancelled` | Anulowane |

---

## Typy walidacji (validationType)

| Typ | Severity | Opis |
|-----|----------|------|
| `missing_production_order` | warning | Zamowiono szyby na zlecenie ktore nie istnieje |
| `unmatched_delivery` | error | Dostawa szyb bez zamowienia |
| `suffix_mismatch` | warning | Dostarczone z innym suffixem niz zamowione |
| `quantity_surplus` | warning | Dostarcono wiecej niz zamowiono |
| `quantity_shortage` | warning | Dostarcono mniej niz zamowiono |

---

## Integracja GlassOrder <-> GlassDelivery

### Przeplyw danych

```
GlassOrder (zamowienie)
    |
    v
GlassOrderItem (pozycje zamowienia)
    |                    \
    |                     \
    v                      v
Order.orderedGlassCount    GlassOrderValidation
                               (missing_production_order)

          --------------------

GlassDelivery (dostawa)
    |
    v
GlassDeliveryItem (pozycje dostawy)
    |
    +--> matchStatus: matched/conflict/unmatched
    |
    +--> Order.deliveredGlassCount
    |
    +--> GlassOrderValidation
             (surplus/shortage/suffix_mismatch)
```

### Algorytm matchowania dostaw

1. **Exact Match** (matchStatus = `matched`):
   - orderNumber == orderNumber
   - orderSuffix == orderSuffix
   - widthMm == widthMm
   - heightMm == heightMm

2. **Conflict Match** (matchStatus = `conflict`):
   - orderNumber == orderNumber
   - orderSuffix != orderSuffix (ROZNY!)
   - widthMm == widthMm
   - heightMm == heightMm
   - Tworzy walidacje `suffix_mismatch`

3. **Unmatched** (matchStatus = `unmatched`):
   - Brak dopasowania w zamowieniu
   - Tworzy walidacje `unmatched_delivery`

### Rematch po imporcie zlecen

Gdy importowane sa nowe zlecenia produkcyjne (`Order`), system automatycznie:
1. Szuka `GlassDeliveryItem` z `matchStatus = 'unmatched'`
2. Probuje dopasowac do nowych zlecen
3. Aktualizuje `Order.deliveredGlassCount`
4. Oznacza stare walidacje jako rozwiazane

---

## Przykladowe requesty

### Import zamowienia szyb

```bash
curl -X POST http://localhost:3001/api/glass-orders/import \
  -F "file=@zamowienie_szyb.txt"
```

### Pobranie rozbieznosci dla zlecenia

```bash
curl http://localhost:3001/api/glass-validations/order/53690/details
```

### Rozwiazanie walidacji

```bash
curl -X POST http://localhost:3001/api/glass-validations/15/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolvedBy": "Jan Kowalski", "notes": "Sprawdzono"}'
```

---

## Powiazane dokumenty

- [GlassDelivery](./deliveries.md) - Import i zarzadzanie dostawami szyb
- [Glass Validations](./validations.md) - System walidacji i raportowania rozbieznosci
- [Orders](../orders.md) - Zlecenia produkcyjne

---

*Last updated: 2026-01-20*
