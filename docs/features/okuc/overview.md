# Moduł OKUC - Magazyn Okuć

## Przegląd

Zarządzanie magazynem okuć PVC (3 pod-magazyny) i ALU. Obsługa artykułów, stanu magazynowego, zapotrzebowania i zamówień.

**Dostęp:** OWNER, ADMIN, KIEROWNIK

**Lokalizacja:** `/magazyn/okuc`

---

## Struktura Magazynu

### Magazyny PVC
- **PVC_A** - Magazyn A
- **PVC_B** - Magazyn B
- **PVC_C** - Magazyn C

### Magazyn ALU
- **ALU** - Magazyn aluminium

---

## Funkcjonalności

### 1. Artykuły

**Zarządzanie artykułami okuć:**
- Lista z filtrowaniem (PVC/ALU, orderClass, sizeClass)
- Dodawanie nowych artykułów
- Edycja istniejących
- Import/export CSV
- Aliasy (mapowanie starych numerów na nowe)

**Klasy zamówień (orderClass):**
- A - Standardowe
- B - Duże
- C - Małe
- NONE - Nieklasyfikowane

### 2. Stan Magazynowy

**Śledzenie stanu:**
- Podgląd stanu po magazynach
- Korekta stanu z historią zmian
- Alerty przy niskim stanie (poniżej minimum)
- Import/export CSV

**Optymistyczne blokowanie:**
System zapobiega konfliktom przy jednoczesnej edycji.

### 3. Zapotrzebowanie

**Zarządzanie zapotrzebowaniem:**
- Automatyczne (z importu zleceń)
- Ręczne (dodawane przez użytkownika)
- Podgląd tygodniowy
- Status: pending, ordered, received

### 4. Zamówienia

**Składanie zamówień do dostawcy:**
- Tworzenie zamówienia (draft)
- Wysyłanie (sent)
- Odbiór z weryfikacją ilości (received)

### 5. Proporcje

**Konwersja między artykułami:**
- Definicja proporcji (np. 1 szt A = 2 szt B)
- Łańcuchy proporcji
- Aktywacja/dezaktywacja

### 6. Lokalizacje

**Zarządzanie lokalizacjami magazynowymi:**
- Tworzenie lokalizacji
- Zmiana kolejności
- Przypisywanie artykułów

---

## API Endpointy

### Artykuły

```
GET    /api/okuc/articles              - Lista artykułów
POST   /api/okuc/articles              - Dodaj artykuł
PATCH  /api/okuc/articles/:id          - Edytuj artykuł
DELETE /api/okuc/articles/:id          - Usuń artykuł
POST   /api/okuc/articles/import/preview - Podgląd importu CSV
POST   /api/okuc/articles/import       - Wykonaj import CSV
GET    /api/okuc/articles/export       - Eksport CSV
```

### Stan Magazynowy

```
GET    /api/okuc/stock                 - Stan magazynowy
GET    /api/okuc/stock/summary         - Podsumowanie
GET    /api/okuc/stock/below-minimum   - Poniżej minimum
PATCH  /api/okuc/stock/:id             - Aktualizuj stan
POST   /api/okuc/stock/adjust          - Korekta stanu
GET    /api/okuc/stock/history/:id     - Historia zmian
```

### Zapotrzebowanie

```
GET    /api/okuc/demand                - Lista zapotrzebowania
POST   /api/okuc/demand                - Dodaj zapotrzebowanie
PUT    /api/okuc/demand/:id            - Aktualizuj
DELETE /api/okuc/demand/:id            - Usuń
```

### Zamówienia

```
GET    /api/okuc/orders                - Lista zamówień
POST   /api/okuc/orders                - Stwórz zamówienie
PUT    /api/okuc/orders/:id            - Aktualizuj
POST   /api/okuc/orders/:id/receive    - Odbierz zamówienie
DELETE /api/okuc/orders/:id            - Usuń
```

### Proporcje

```
GET    /api/okuc/proportions           - Lista proporcji
POST   /api/okuc/proportions           - Dodaj proporcję
PUT    /api/okuc/proportions/:id       - Aktualizuj
POST   /api/okuc/proportions/:id/activate - Aktywuj
POST   /api/okuc/proportions/:id/deactivate - Dezaktywuj
```

### Lokalizacje

```
GET    /api/okuc/locations             - Lista lokalizacji
POST   /api/okuc/locations             - Dodaj lokalizację
PATCH  /api/okuc/locations/:id         - Edytuj
DELETE /api/okuc/locations/:id         - Usuń
POST   /api/okuc/locations/reorder     - Zmień kolejność
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `ArticlesTable` | Tabela artykułów |
| `ArticleForm` | Formularz artykułu |
| `StockTable` | Tabela stanu magazynowego |
| `StockSummaryCards` | Karty podsumowania |
| `DemandTable` | Tabela zapotrzebowania |
| `OrdersTable` | Tabela zamówień |
| `ImportArticlesDialog` | Dialog importu CSV |
| `ImportStockDialog` | Dialog importu stanu |

---

## Hooki

```typescript
useOkucArticles()    // CRUD artykułów
useOkucStock()       // CRUD stanu
useOkucDemand()      // CRUD zapotrzebowania
useOkucOrders()      // CRUD zamówień
useOkucLocations()   // CRUD lokalizacji
```

---

## Optimistic Locking

System używa wersjonowania rekordów dla zapobiegania konfliktom:

```typescript
// Request
PATCH /api/okuc/stock/1
{
  "quantity": 100,
  "version": 5  // Aktualna wersja
}

// Błąd konflikt
{
  "error": "CONFLICT",
  "message": "Rekord został zmodyfikowany przez innego użytkownika"
}
```

---

## Import CSV

### Format artykułów
```csv
articleId,name,unit,orderClass,sizeClass,minStock,location
ABC123,Zaślepka,szt,A,S,100,PVC_A
```

### Format stanu
```csv
articleId,location,quantity,minStock
ABC123,PVC_A,150,100
```

---

## Pliki

**Frontend:**
- `apps/web/src/features/okuc/`

**Backend:**
- `apps/api/src/routes/okuc/` (modularny routing)
- `apps/api/src/handlers/okuc/`
- `apps/api/src/services/okuc/`

---

## Zobacz też

- [Zapotrzebowanie](zapotrzebowanie.md)
- [Ustawienia - Lokalizacje](../settings/overview.md)
