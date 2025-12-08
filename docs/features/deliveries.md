# Moduł Dostaw - Dokumentacja

## Przegląd

Moduł dostaw obsługuje planowanie i realizację dostaw profili aluminiowych do klientów.
Kluczowe funkcjonalności:
- Planowanie dostaw z kalendarzem
- Optymalizacja pakowania palet
- Wizualizacja rozmieszczenia okien na paletach
- Eksport PDF z planem pakowania

## Statusy Dostaw

```
planned → loading → shipped → delivered
```

| Status | Opis |
|--------|------|
| `planned` | Dostawa zaplanowana |
| `loading` | W trakcie załadunku |
| `shipped` | Wysłana |
| `delivered` | Dostarczona |

---

## Optymalizacja Palet

### Algorytm 7-kroków

Algorytm optymalizuje rozmieszczenie okien na paletach minimalizując ilość palet i maksymalizując wykorzystanie przestrzeni.

**Kroki algorytmu:**
1. Pobierz zlecenia z dostawy
2. Pobierz dostępne typy palet (4000, 3500, 3000, 2400mm)
3. Sortuj okna malejąco wg szerokości
4. Dla każdego okna znajdź optymalną paletę
5. Jeśli brak miejsca - utwórz nową paletę
6. Oblicz wykorzystanie przestrzeni
7. Zapisz wynik optymalizacji

### API Endpoints

```typescript
POST   /api/pallets/optimize/:deliveryId      // Uruchom optymalizację
GET    /api/pallets/optimization/:deliveryId  // Pobierz wynik
DELETE /api/pallets/optimization/:deliveryId  // Usuń optymalizację
GET    /api/pallets/export/:deliveryId        // Pobierz PDF
```

### Typy Palet

| Typ | Szerokość | Głębokość |
|-----|-----------|-----------|
| P4000 | 4000 mm | 960 mm |
| P3500 | 3500 mm | 960 mm |
| P3000 | 3000 mm | 960 mm |
| P2400 | 2400 mm | 960 mm |

### Struktura Plików

```
apps/api/src/
├── services/pallet-optimizer/
│   ├── PalletOptimizerService.ts  # Algorytm
│   └── PdfExportService.ts        # Generowanie PDF
├── repositories/
│   └── PalletOptimizerRepository.ts
└── routes/
    └── pallets.ts
```

---

## Eksport PDF

### Biblioteka
PDFKit - lekka biblioteka do generowania PDF w Node.js.

### Format dokumentu

**Strona 1 - Podsumowanie:**
- Nagłówek z ID dostawy i datą
- Liczba palet, okien
- Średnie wykorzystanie przestrzeni

**Kolejne strony - Szczegóły palet:**
- Nazwa palety i typ
- Procent wykorzystania
- Tabela z oknami (szerokość, wysokość, profil, ilość, zlecenie)

### Stylizacja
- Nagłówki: `#2563eb` (niebieski)
- Font: Helvetica
- Marginesy: 50pt

---

## Widok Listy Dostaw

### Funkcjonalności
- Kalendarz z drag & drop
- Filtrowanie po statusie
- Podgląd szczegółów dostawy
- Przycisk "Optymalizuj palety"

### Lokalizacja
```
apps/web/src/app/dostawy/page.tsx
apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx
```

---

## Wizualizacja Palet

### Komponenty
- `PalletVisualization` - główny komponent
- `PalletCard` - pojedyncza paleta
- `WindowBlock` - okno na palecie

### Funkcje
- Podgląd 2D rozmieszczenia okien
- Kolorowanie wg zleceń
- Tooltip z szczegółami okna

---

## Powiązane dokumenty

Oryginalne pliki (zarchiwizowane w `docs/archive/`):
- FULL_STACK_PALLET_OPTIMIZATION_COMPLETE.md
- PALLET_OPTIMIZATION_FIXES.md
- OPTIMIZATION_IMPLEMENTATION.md
- PLAN_LIST_VIEW_DOSTAW.md
- PLAN_WIZUALIZACJA_PALET.md
