# Moduł Moja Praca - Centrum Operatora

## Przegląd

Centrum zarządzania pracą operatora - rozwiązywanie konfliktów importu i przegląd dziennych zadań.

**Dostęp:** Wszyscy zalogowani użytkownicy

**Lokalizacja:** `/moja-praca`

---

## Funkcjonalności

### 1. Konflikty Importu

System automatycznie wykrywa konflikty przy imporcie plików (gdy numer zlecenia już istnieje).

**Typy konfliktów:**
- `replace_base` - Nowy plik zastępuje istniejące zlecenie
- `keep_both` - Zachowaj oba (bazowe + wariant)

**Rozwiązywanie konfliktów:**
- Zamień bazowe
- Zamień wariant
- Zachowaj oba
- Anuluj

**Badge w sidebarze:**
Licznik oczekujących konfliktów (odświeżany co 30s).

### 2. Przegląd Dziennych Zadań

**Sekcje:**
- Moje zlecenia na dziś
- Moje dostawy
- Zamówienia szyb do realizacji

---

## API Endpointy

### Konflikty

```
GET   /api/moja-praca/conflicts              - Lista konfliktów
GET   /api/moja-praca/conflicts/count        - Licznik konfliktów
GET   /api/moja-praca/conflicts/:id          - Szczegóły konfliktu
POST  /api/moja-praca/conflicts/:id/resolve  - Rozwiąż konflikt
```

### Zadania

```
GET   /api/moja-praca/orders?date=YYYY-MM-DD       - Zlecenia na dzień
GET   /api/moja-praca/deliveries?date=YYYY-MM-DD   - Dostawy na dzień
GET   /api/moja-praca/glass-orders?date=YYYY-MM-DD - Zamówienia szyb
GET   /api/moja-praca/summary?date=YYYY-MM-DD      - Podsumowanie dnia
```

---

## Request: Rozwiąż konflikt

```json
{
  "resolution": "replace_base" | "keep_both" | "cancel",
  "notes": "Opcjonalna notatka"
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `ConflictsList` | Lista konfliktów z sugestiami |
| `ConflictDetailModal` | Modal rozwiązywania konfliktu |
| `UserOrdersList` | Lista zleceń użytkownika |
| `UserDeliveriesList` | Lista dostaw użytkownika |
| `UserGlassOrdersList` | Zamówienia szyb |

---

## Typy Danych

### ImportConflict

```typescript
interface ImportConflict {
  id: number;
  filename: string;
  orderNumber: string;
  conflictType: 'duplicate' | 'variant';
  suggestion: 'replace_base' | 'keep_both';
  status: 'pending' | 'resolved' | 'cancelled';
  baseOrderId: number | null;
  createdAt: string;
}
```

### DaySummary

```typescript
interface DaySummary {
  date: string;
  ordersCount: number;
  deliveriesCount: number;
  glassOrdersCount: number;
  completedCount: number;
}
```

---

## Pliki

**Frontend:**
- `apps/web/src/features/moja-praca/`

**Backend:**
- Endpointy w ramach order/delivery handlers

---

## Zobacz też

- [Import plików](../imports/overview.md)
- [Zlecenia](../orders/overview.md)
