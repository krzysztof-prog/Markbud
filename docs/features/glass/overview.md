# Moduł Glass - Zamówienia Szyb

## Przegląd

Zarządzanie zamówieniami szyb do okien - tworzenie zamówień, śledzenie dostaw i przypisywanie do zleceń produkcyjnych.

**Dostęp:** OWNER, ADMIN, KIEROWNIK

**Lokalizacja:** `/zamowienia-szyb`

---

## Funkcjonalności

### 1. Zamówienia Szyb

**Tworzenie zamówień:**
- Import z pliku PDF
- Ręczne dodawanie pozycji
- Przypisanie do dostawcy

**Dostawcy:**
- Pilkington
- Guardian
- Saint-Gobain
- Inne (konfigurowalne)

### 2. Pozycje Zamówienia

**Dane pozycji:**
- Typ szyby (4/16/4, double glazing, etc.)
- Wymiary (szerokość × wysokość w mm)
- Ilość
- Przypisanie do zlecenia produkcyjnego

### 3. Statusy Zamówienia

| Status | Opis |
|--------|------|
| ordered | Zamówione u dostawcy |
| in_production | W produkcji u dostawcy |
| shipped | Wysłane |
| delivered | Dostarczone |

### 4. Dostawy

**Śledzenie dostaw:**
- Data dostawy
- Protokół odbioru
- Weryfikacja ilości
- Zgłaszanie braków/uszkodzeń

### 5. Integracja z Zleceniami

**Powiązanie:**
- Szyba → Zlecenie produkcyjne (OrderGlass)
- Status kompletności szyb w zleceniu
- Alerty o brakujących szybach

---

## API Endpointy

### Zamówienia

```
GET    /api/glass/orders              - Lista zamówień
GET    /api/glass/orders/:id          - Szczegóły zamówienia
POST   /api/glass/orders              - Utwórz zamówienie
PUT    /api/glass/orders/:id          - Aktualizuj zamówienie
DELETE /api/glass/orders/:id          - Usuń zamówienie
POST   /api/glass/orders/import       - Import z PDF
```

### Pozycje

```
GET    /api/glass/orders/:id/items    - Pozycje zamówienia
POST   /api/glass/orders/:id/items    - Dodaj pozycję
PUT    /api/glass/items/:id           - Aktualizuj pozycję
DELETE /api/glass/items/:id           - Usuń pozycję
```

### Dostawy

```
GET    /api/glass/deliveries          - Lista dostaw
POST   /api/glass/deliveries          - Zarejestruj dostawę
PUT    /api/glass/deliveries/:id      - Aktualizuj dostawę
POST   /api/glass/deliveries/:id/receive - Potwierdź odbiór
```

### Statystyki

```
GET    /api/glass/stats               - Statystyki zamówień
GET    /api/glass/pending             - Oczekujące zamówienia
```

---

## Request: Utwórz zamówienie

```json
{
  "orderNumber": "GLS-2026-001",
  "supplier": "Pilkington",
  "orderDate": "2026-01-14",
  "deliveryDate": "2026-01-21",
  "items": [
    {
      "glassType": "4/16/4 argon",
      "width": 1200,
      "height": 1500,
      "quantity": 10,
      "orderId": 123
    }
  ]
}
```

---

## Model Danych

### GlassOrder

```prisma
model GlassOrder {
  id              String   @id @default(uuid())
  orderNumber     String   @unique
  supplier        String
  orderDate       DateTime
  deliveryDate    DateTime?
  status          String
  totalValue      Decimal?
  notes           String?

  items           GlassOrderItem[]
  deliveries      GlassDelivery[]
}
```

### GlassOrderItem

```prisma
model GlassOrderItem {
  id          String  @id @default(uuid())
  orderId     String
  glassType   String
  width       Int     // mm
  height      Int     // mm
  quantity    Int
  productionOrderId Int?

  order       GlassOrder @relation(fields: [orderId])
}
```

### GlassDelivery

```prisma
model GlassDelivery {
  id              String   @id @default(uuid())
  glassOrderId    String
  deliveryDate    DateTime
  receivedBy      String?
  notes           String?
  status          String

  glassOrder      GlassOrder @relation(fields: [glassOrderId])
  items           GlassDeliveryItem[]
}
```

---

## Workflow

```
1. Import PDF z zamówieniem szyb
   ↓
2. Parsowanie i walidacja danych
   ↓
3. Utworzenie zamówienia (status: ordered)
   ↓
4. Przypisanie pozycji do zleceń produkcyjnych
   ↓
5. Śledzenie statusu u dostawcy
   ↓
6. Rejestracja dostawy
   ↓
7. Weryfikacja ilości i jakości
   ↓
8. Potwierdzenie odbioru
   ↓
9. Aktualizacja kompletności zleceń
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `GlassOrdersTable` | Lista zamówień szyb |
| `GlassOrderForm` | Formularz zamówienia |
| `GlassOrderDetail` | Szczegóły zamówienia |
| `GlassItemsTable` | Pozycje zamówienia |
| `GlassDeliveryForm` | Formularz dostawy |
| `ImportGlassDialog` | Dialog importu PDF |
| `GlassStats` | Statystyki |

---

## Integracja z Dashboard

**Dashboard operatora (OperatorDashboard):**
- Sekcja "Szyby" - procent kompletności
- Alert o brakach szyb
- Przycisk "Zamów szyby"

**Dashboard kierownika:**
- Statystyka oczekujących zamówień
- Alerty o dostawach

---

## Pliki

**Frontend:**
- `apps/web/src/features/glass/` (jeśli istnieje)
- `apps/web/src/app/zamowienia-szyb/`

**Backend:**
- `apps/api/src/routes/glass.ts`
- `apps/api/src/handlers/glassHandler.ts`
- `apps/api/src/services/glassService.ts`

---

## Zobacz też

- [Zamówienia szyb - szczegóły](orders.md)
- [Dashboard operatora](../dashboard/overview.md)
- [Zlecenia](../orders/overview.md)

---

*Ostatnia aktualizacja: 2026-01-14*
