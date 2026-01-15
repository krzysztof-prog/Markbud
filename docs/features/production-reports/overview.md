# Moduł Production Reports - Zestawienie Miesięczne

## Przegląd

Raportowanie produkcji na koniec miesiąca - wartości i statystyki zleceń wyprodukowanych.

**Dostęp:** OWNER, ADMIN, KIEROWNIK, KSIEGOWA

**Lokalizacja:** Panel kierownika → zakładka "Zestawienie miesięczne"

---

## Funkcjonalności

### 1. Raport Miesięczny

**Zawartość:**
- Lista zleceń wyprodukowanych w danym miesiącu
- Grupowanie AKROBUD po dostawach
- Zlecenia prywatne osobno
- Nietypówki (pozycje niekliczące się do statystyk)

### 2. Edycja Wartości

**Edytowalne pola (admin/kierownik):**
- Ilość okien
- Wartość PLN
- Wartość EUR
- RW okucia (checkbox)
- RW profile (checkbox)
- Nietypówka (checkbox)

**Edytowalne pola (księgowa):**
- Numer faktury
- Data faktury

### 3. Podsumowanie

**Sekcje:**
- Zlecenia typowe
- Zlecenia AKROBUD
- Pozostałe zlecenia
- Nietypówki

**Suma:**
- Całkowita wartość PLN
- Całkowita wartość EUR
- Liczba okien/skrzydeł

### 4. Zamknięcie Miesiąca

**Po zamknięciu:**
- Blokada edycji ilości i wartości
- Księgowa nadal może edytować FV
- Możliwość ponownego otwarcia (admin)

### 5. Eksport PDF

Generowanie raportu PDF z kursem EUR.

---

## Uprawnienia

| Rola | Może edytować | Może zamknąć | Może FV |
|------|---------------|--------------|---------|
| OWNER | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ |
| KIEROWNIK | ✓ | ✓ | ✗ |
| KSIEGOWA | ✗ | ✗ | ✓ (nawet po zamknięciu) |
| USER | ✗ | ✗ | ✗ |

---

## API Endpointy

```
GET    /api/production-reports/:year/:month         - Raport miesiąca
GET    /api/production-reports/:year/:month/summary - Podsumowanie
PUT    /api/production-reports/:year/:month/items/:orderId - Edytuj pozycję
PUT    /api/production-reports/:year/:month/items/:orderId/invoice - Edytuj FV
PUT    /api/production-reports/:year/:month/atypical - Zmień nietypówkę
POST   /api/production-reports/:year/:month/close   - Zamknij miesiąc
POST   /api/production-reports/:year/:month/reopen  - Otwórz ponownie
GET    /api/production-reports/:year/:month/pdf     - Eksport PDF
```

---

## Request: Edytuj pozycję

```json
{
  "windows": 15,
  "valuePln": 2500000,
  "valueEur": 55000,
  "rwOkucia": true,
  "rwProfile": true
}
```

## Request: Edytuj FV

```json
{
  "invoiceNumber": "FV/2026/01/123",
  "invoiceDate": "2026-01-15"
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `MonthSelector` | Wybór miesiąca |
| `ReportStatusBadge` | Status (open/closed) |
| `OrdersTable` | Tabela zleceń |
| `DeliveryGroup` | Grupa dostawy AKROBUD |
| `OrderRow` | Wiersz zlecenia |
| `EditableCell` | Komórka z edycją inline |
| `CheckboxCell` | Checkbox RW |
| `AtypicalSection` | Sekcja nietypówek |
| `SummarySection` | Podsumowanie |
| `CloseMonthDialog` | Dialog zamknięcia |
| `ReopenMonthDialog` | Dialog ponownego otwarcia |

---

## Typy Danych

### ProductionReportItem

```typescript
interface ProductionReportItem {
  orderId: number;
  orderNumber: string;
  client: string;
  windows: number;
  sashes: number;
  valuePln: number;
  valueEur: number;
  rwOkucia: boolean;
  rwProfile: boolean;
  isAtypical: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  deliveryId: number | null;
  deliveryNumber: string | null;
}
```

### ProductionReportSummary

```typescript
interface ProductionReportSummary {
  totalOrders: number;
  totalWindows: number;
  totalSashes: number;
  totalValuePln: number;
  totalValueEur: number;
  akrobudOrders: number;
  privateOrders: number;
  atypicalOrders: number;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
}
```

---

## Logika Obliczeń

### Pozycje uwzględniane
- Zlecenia z `completedAt` w danym miesiącu
- Status: `completed`
- Nie są w archiwum

### Pozycje wyłączone (nietypówki)
- Oznaczone jako `isAtypical: true`
- Nie liczą się do sum

---

## Pliki

**Frontend:**
- `apps/web/src/features/production-reports/`

**Backend:**
- `apps/api/src/handlers/productionReportHandler.ts`
- `apps/api/src/services/productionReportService.ts`
- `apps/api/src/services/productionReportPdfService.ts`
- `apps/api/src/routes/production-reports.ts`

---

## Zobacz też

- [Panel kierownika](../manager/overview.md)
- [Zlecenia](../orders/overview.md)
