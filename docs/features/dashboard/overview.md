# Moduł Dashboard - Strona Główna

## Przegląd

Dashboard to strona główna aplikacji (`/`) wyświetlająca podsumowanie stanu systemu. Widok zależy od roli użytkownika.

---

## Widoki

### 1. Dashboard Kierownika (DashboardContent)

**Dostęp:** OWNER, ADMIN, KIEROWNIK, KSIEGOWA

Wyświetla:

#### Statystyki (4 karty)
- **Aktywne zlecenia** - liczba niezarchiwizowanych zleceń
- **Nadchodzące dostawy** - dostawy w ciągu 7 dni
- **Oczekujące importy** - pliki do przetworzenia
- **Braki materiałów** - profile z niedoborem

#### Oczekujące Importy
Lista do 5 ostatnich importów z linkiem do podglądu.

#### Alerty Systemowe
- Krytyczne (czerwone)
- Wysokie (pomarańczowe)
- Średnie (żółte)

Typy alertów: shortage, delivery, import, system, warning

#### Podsumowanie Dostaw (8 tygodni)
Grid z kartami na każdy tydzień:
- Liczba okien, skrzydeł, szyb
- Liczba zleceń i dostaw

#### Nadchodzące Dostawy (7 dni)
Grid dostaw z datą i liczbą zleceń.

---

### 2. Dashboard Operatora (OperatorDashboard)

**Dostęp:** USER (operatorzy)

Wyświetla checklist kompletności zleceń:

#### Checklist Kompletności
- **Pliki** - dokumenty techniczne (X/Total, XX%)
- **Szyby** - zamówienia szyb (X/Total, XX%)
- **Okucia** - materiały okuciowe (X/Total, XX%)

Dla każdej sekcji:
- Progress bar
- Alert jeśli są braki
- Przycisk akcji (np. "Zamów szyby")

#### Status Gotowości
Liczba zleceń gotowych do produkcji.

#### Akcje Szybkie
- Kalendarz dostaw → `/dostawy`
- Zamówienia szyb → `/zamowienia-szyb`
- Magazyn okuć → `/magazyn/okuc`

---

## API Endpointy

```
GET  /api/dashboard              - Główne dane dashboardu
GET  /api/dashboard/alerts       - Alerty systemowe
GET  /api/dashboard/stats/weekly - Statystyki tygodniowe (8 tygodni)
GET  /api/dashboard/stats/monthly - Statystyki miesięczne
```

### Response: /api/dashboard

```json
{
  "stats": {
    "activeOrders": 42,
    "upcomingDeliveriesCount": 5,
    "pendingImportsCount": 3,
    "shortagesCount": 7
  },
  "upcomingDeliveries": [...],
  "pendingImports": [...],
  "shortages": [...],
  "recentOrders": [...]
}
```

---

## Caching

| Endpoint | staleTime | gcTime |
|----------|-----------|--------|
| Dashboard | 5 min | 10 min |
| Alerts | 2 min | 5 min |
| Weekly Stats | 5 min | 15 min |

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `DashboardContent` | Dashboard dla kierowników |
| `OperatorDashboard` | Dashboard dla operatorów |

Oba komponenty są lazy-loaded dla lepszej wydajności.

---

## Pliki

**Frontend:**
- `apps/web/src/features/dashboard/`
- `apps/web/src/app/page.tsx`

**Backend:**
- `apps/api/src/handlers/dashboard-handler.ts`
- `apps/api/src/services/dashboard-service.ts`
- `apps/api/src/routes/dashboard.ts`

---

## Zobacz też

- [Panel kierownika](../manager/overview.md)
- [Dostawy](../deliveries/deliveries.md)