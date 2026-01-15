# Moduł Manager - Panel Kierownika

## Przegląd

Panel kierownika produkcji umożliwia zarządzanie zleceniami w produkcji, śledzenie czasu pracy i zarządzanie paletami.

**Dostęp:** OWNER, ADMIN, KIEROWNIK

**Lokalizacja:** `/kierownik`

---

## Zakładki

### 1. Dodaj do produkcji

Umożliwia zaznaczanie zleceń i dodawanie ich do produkcji (zmiana statusu na `in_progress`).

**Sekcje:**
- Najbliższe dostawy AKROBUD
- Zlecenia przeterminowane (deadline < dziś)
- Zlecenia na najbliższe 2 tygodnie
- Zlecenia prywatne (pozostałe)

**Workflow:**
1. Zaznacz checkboxy przy zleceniach/dostawach
2. Counter pokazuje liczbę zaznaczonych
3. Kliknij "Dodaj do produkcji"
4. Zlecenia zmieniają status na `in_progress`

### 2. Zakończ zlecenia

Umożliwia oznaczanie zleceń jako wyprodukowane (status `completed`).

**Sekcje:**
- Dostawy AKROBUD w produkcji
- Pojedyncze zlecenia w produkcji

**Workflow:**
1. Zaznacz zlecenia/dostawy
2. Ustaw datę produkcji (domyślnie dziś)
3. Kliknij "Oznacz jako wyprodukowane"
4. Zlecenia zmieniają status na `completed`

**Walidacja daty:**
- Nie może być w przyszłości
- Nie może być starsza niż 60 dni

### 3. Zestawienie miesięczne

Wrapper dla modułu [production-reports](../production-reports/overview.md).

### 4. Godzinówki

Wrapper dla modułu [timesheets](../timesheets/overview.md).

**Widok:**
- Kalendarz miesięczny (lewa kolumna)
- Widok dnia z pracownikami (prawa kolumna)

### 5. Paletówki

Wrapper dla modułu [pallets](../pallets/overview.md).

**Widoki:**
- Widok dzienny (stan poranny → użyte → zrobione → stan końcowy)
- Widok miesięczny (podsumowanie)

### 6. B-Z

Funkcjonalność w przygotowaniu.

---

## API Endpointy

### Produkcja

```
GET   /api/orders/for-production           - Zlecenia do produkcji
POST  /api/orders/bulk-update-status       - Zmiana statusu wielu zleceń
GET   /api/orders?status=in_progress       - Zlecenia w produkcji
GET   /api/deliveries?status=in_progress   - Dostawy w produkcji
POST  /api/deliveries/:id/complete-all-orders - Zakończ wszystkie zlecenia dostawy
```

### Request: bulk-update-status

```json
{
  "orderIds": [1, 2, 3],
  "status": "in_progress",
  "productionDate": "2026-01-14T00:00:00.000Z"
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `AddToProductionTab` | Dodawanie do produkcji |
| `CompleteOrdersTab` | Kończenie zleceń |
| `TimeTrackerTab` | Wrapper godzinówek |
| `PalletsTab` | Wrapper paletówek |
| `OrderCheckbox` | Checkbox zlecenia |
| `DeliveryCheckbox` | Checkbox dostawy (tri-state) |

### DeliveryCheckbox - Tri-state

Checkbox dostawy obsługuje 3 stany:
- ✓ Zaznaczony - wszystkie zlecenia zaznaczone
- ◉ Indeterminate - część zleceń zaznaczona
- ☐ Niezaznaczony - żadne zlecenie nie zaznaczone

---

## Hooki

### useProductionSelection()

```typescript
const {
  selectedOrderIds,      // Set<number>
  selectedDeliveryIds,   // Set<number>
  totalSelected,         // number
  hasSelection,          // boolean
  handleOrderToggle,     // (orderId, checked) => void
  handleDeliveryToggle,  // (deliveryId, checked, delivery?) => void
  reset                  // () => void
} = useProductionSelection();
```

---

## Helpery

### dateHelpers.ts
- `formatDate(date)` - format DD.MM.YYYY
- `isOverdue(date)` - czy przeterminowane
- `getTodayISOString()` - dzisiejsza data ISO
- `toISODatetime(dateString)` - konwersja do ISO8601

### completionHelpers.ts
- `getOrderCompletionStatus(order)` - status kompletacji
- `getCompletionStatusInfo(order)` - szczegóły statusu

---

## Statusy Kompletacji

| Status | Opis | Kolor |
|--------|------|-------|
| COMPLETED | Wyprodukowane | Zielony |
| IN_PRODUCTION | W produkcji | Niebieski |
| READY | Gotowe do produkcji | Zielony jasny |
| INCOMPLETE | Brakuje materiałów | Żółty |

---

## Optymalizacje

- Lazy loading wszystkich zakładek
- Optimistic updates przy dodawaniu do produkcji
- Tri-state checkbox dla dostaw
- React Query caching

---

## Pliki

**Frontend:**
- `apps/web/src/features/manager/`
- `apps/web/src/app/kierownik/page.tsx`

**Backend:**
- `apps/api/src/handlers/orderHandler.ts`
- `apps/api/src/services/orderService.ts`

---

## Zobacz też

- [Godzinówki](../timesheets/overview.md)
- [Paletówki](../pallets/overview.md)
- [Zestawienia miesięczne](../production-reports/overview.md)
