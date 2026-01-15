# Moduł Pallets - Paletówki

## Przegląd

Zarządzanie paletami produkcyjnymi - śledzenie stanu dziennego i optymalizacja.

**Dostęp:** OWNER, ADMIN, KIEROWNIK

**Lokalizacja:** Panel kierownika → zakładka "Paletówki"

---

## Typy Palet

| Typ | Opis |
|-----|------|
| MALA | Mała paleta |
| P2400 | Paleta 2400mm |
| P3000 | Paleta 3000mm |
| P3500 | Paleta 3500mm |
| P4000 | Paleta 4000mm |

---

## Funkcjonalności

### 1. Widok Dzienny

**Kolumny tabeli:**
- Stan poranny
- Użyte (ilość użyta w produkcji)
- Wyprodukowane (automatycznie wyliczane)
- Stan końcowy

**Wzór:**
```
wyprodukowane = stan_poranny(dziś) - stan_poranny(wczoraj) + użyte
```

**Akcje:**
- Edycja stanu porannego i użytych
- Zamknięcie dnia (blokada edycji)
- Korekta stanu porannego z notatką

### 2. Widok Miesięczny

**Podsumowanie:**
- Stan początkowy/końcowy miesiąca
- Całkowite użyte/wyprodukowane
- Dni z alertami

### 3. Alerty

System alertów na podstawie stanu porannego:

| Poziom | Opis | Kolor |
|--------|------|-------|
| OK | Powyżej progu | Zielony |
| WARNING | Zbliża się do minimum | Żółty |
| CRITICAL | Poniżej minimum | Czerwony |

**Konfiguracja progów:**
Dialog ustawień pozwala zdefiniować progi per typ palety.

### 4. Zamykanie Dnia

Po zamknięciu dnia:
- Blokada edycji wpisów
- Możliwość ponownego otwarcia (z uprawnieniami)
- Historia zamknięć

### 5. Korekta Stanu

Korekta stanu porannego:
- Wymaga notatki (dla audytu)
- Historia korekt
- Nie wpływa na zamknięte dni

---

## API Endpointy

### Operacje Dzienne

```
GET    /api/pallet-stock/day/:date              - Dane dnia
PUT    /api/pallet-stock/day/:date              - Aktualizuj dzień
POST   /api/pallet-stock/day/:date/close        - Zamknij dzień
POST   /api/pallet-stock/day/:date/entries/:type/correct - Korekta
```

### Operacje Miesięczne

```
GET    /api/pallet-stock/month/:year/:month     - Dane miesiąca
```

### Alerty

```
GET    /api/pallet-stock/alerts/config          - Konfiguracja alertów
PUT    /api/pallet-stock/alerts/config          - Aktualizuj konfigurację
```

---

## Request: Aktualizuj dzień

```json
{
  "entries": [
    {
      "palletType": "P3000",
      "morningStock": 50,
      "used": 10
    }
  ]
}
```

## Request: Korekta

```json
{
  "newValue": 45,
  "reason": "Błędne zliczenie porannego stanu"
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `PalletDayView` | Widok dnia ze wszystkimi typami |
| `PalletMonthView` | Podsumowanie miesiąca |
| `PalletRow` | Wiersz typu palety |
| `AlertSettingsDialog` | Konfiguracja progów alertów |
| `CorrectionDialog` | Dialog korekty stanu |
| `PalletVisualization` | Wizualizacja graficzna |
| `PalletVisualizationLegend` | Legenda kolorów |

---

## Typy Danych

### DayEntry

```typescript
interface PalletDayEntry {
  id: number;
  date: string;
  palletType: PalletType;
  morningStock: number;
  used: number;
  produced: number;    // wyliczane
  endStock: number;    // wyliczane
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
}
```

### AlertConfig

```typescript
interface AlertConfig {
  palletType: PalletType;
  warningThreshold: number;
  criticalThreshold: number;
}
```

---

## Wizualizacja

Komponent `PalletVisualization` wyświetla graficzną reprezentację:

**Kolory:**
- Zielony - dostępne (powyżej warning)
- Żółty - ostrzeżenie
- Czerwony - krytyczny
- Szary - niedostępne

---

## Pliki

**Frontend:**
- `apps/web/src/features/pallets/`

**Backend:**
- `apps/api/src/handlers/palletStockHandler.ts`
- `apps/api/src/services/palletStockService.ts`
- `apps/api/src/routes/pallet-stock.ts`

---

## Zobacz też

- [Panel kierownika](../manager/overview.md)
- [Ustawienia - Typy palet](../settings/overview.md)
