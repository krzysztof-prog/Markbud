# Plan: Wizualizacja Pakowania Palet

## Cel
Stworzenie interaktywnej wizualizacji pokazującej jak okna są pakowane na paletach - widok z góry (top-view) pokazujący układ okien na palecie.

## Stan obecny
- Strona optymalizacji: `apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`
- Dane: `OptimizedPallet[]` z `windows: OptimizedWindow[]`
- UI: tylko tabele z listą okien per paleta
- Brak graficznej wizualizacji pakowania

## Dane dostępne do wizualizacji

```typescript
interface OptimizedWindow {
  id: number;
  widthMm: number;      // szerokość okna
  heightMm: number;     // wysokość okna (nieistotna dla widoku z góry)
  depthMm: number;      // głębokość - kluczowa dla pakowania
  profileType: string;  // VLAK, BLOK, szyba, VARIANT
  orderNumber: string;
  quantity: number;
}

interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletWidthMm: number;   // szerokość palety
  maxDepthMm: number;      // maksymalna głębokość ładunku
  usedDepthMm: number;     // wykorzystana głębokość
  utilizationPercent: number;
  windows: OptimizedWindow[];
}
```

## Propozycja wizualizacji

### Widok z góry (Top View) - GŁÓWNY
Widok z góry na paletę, gdzie:
- **Oś X (pozioma)**: szerokość palety + overhang (700mm)
- **Oś Y (pionowa)**: głębokość ładunku (maxDepthMm)
- Okna ułożone jedno za drugim według głębokości

```
┌─────────────────────────────────────────┐
│              PALETA 1400mm              │
│  ┌─────────────────────────────────┐    │
│  │        Okno 1 (1200mm)          │    │  ↑
│  │        depth: 95mm              │    │  │
│  ├─────────────────────────────────┤    │  │
│  │     Okno 2 (1100mm)             │    │  │ Głębokość
│  │     depth: 137mm                │    │  │ (Y)
│  ├─────────────────────────────────┤    │  │
│  │   Okno 3 (900mm)                │    │  │
│  │   depth: 95mm                   │    │  ↓
│  └─────────────────────────────────┘    │
│                                         │
│  ← ─ ─ ─ Szerokość (X) ─ ─ ─ →          │
└─────────────────────────────────────────┘
```

### Cechy wizualizacji

1. **Skala proporcjonalna** - okna pokazane w proporcji do rzeczywistych wymiarów
2. **Kolory według typu profilu**:
   - VLAK: `#3B82F6` (niebieski)
   - BLOK: `#10B981` (zielony)
   - szyba: `#F59E0B` (pomarańczowy)
   - VARIANT: `#8B5CF6` (fioletowy)
3. **Overhang** - strefa wystawania okna poza paletę (700mm) zaznaczona przerywaną linią
4. **Wykorzystanie** - pasek postępu lub wypełnienie pokazujące % wykorzystania głębokości
5. **Interaktywność**:
   - Hover na oknie → tooltip z detalami (wymiary, zlecenie, profil)
   - Click → podświetlenie w tabeli

---

## Architektura komponentów

### 1. `PalletVisualization.tsx` (główny komponent)
```
apps/web/src/features/pallets/components/PalletVisualization.tsx
```

**Props:**
```typescript
interface PalletVisualizationProps {
  pallet: OptimizedPallet;
  showOverhang?: boolean;      // default: true
  showLabels?: boolean;        // default: true
  onWindowHover?: (window: OptimizedWindow | null) => void;
  onWindowClick?: (window: OptimizedWindow) => void;
  highlightedWindowId?: number;
  className?: string;
}
```

**Implementacja:** React + SVG (natywne, bez bibliotek)

### 2. `PalletVisualizationLegend.tsx` (legenda kolorów)
```
apps/web/src/features/pallets/components/PalletVisualizationLegend.tsx
```

Pokazuje mapowanie: kolor → typ profilu

### 3. `PalletCard.tsx` (karta z wizualizacją + tabelą)
```
apps/web/src/features/pallets/components/PalletCard.tsx
```

Łączy:
- Header z nazwą palety i badge'm wykorzystania
- `PalletVisualization` - grafika
- Tabelę z oknami (istniejąca)
- Toggle: widok graficzny / tabela

---

## Szczegóły implementacji SVG

### Wymiarowanie
```typescript
const CANVAS_WIDTH = 600;   // stała szerokość canvasu w px
const CANVAS_HEIGHT = 400;  // stała wysokość canvasu w px
const PADDING = 20;         // padding wokół

// Skala: mm → px
const scaleX = (CANVAS_WIDTH - 2 * PADDING) / (palletWidthMm + MAX_OVERHANG);
const scaleY = (CANVAS_HEIGHT - 2 * PADDING) / maxDepthMm;
```

### Struktura SVG
```tsx
<svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
  {/* Tło palety */}
  <rect className="pallet-base" />

  {/* Strefa overhang (przerywaną) */}
  <rect className="overhang-zone" strokeDasharray="5,5" />

  {/* Okna */}
  {windows.map((window, index) => (
    <g key={window.id} className="window-group">
      <rect className="window" />
      <text className="window-label" />
    </g>
  ))}

  {/* Linie pomocnicze - siatka wymiarów */}
  <line className="dimension-line" />
  <text className="dimension-label" />
</svg>
```

### Pozycjonowanie okien
```typescript
// Okna układane jedno za drugim (wzdłuż osi Y - głębokości)
let currentY = PADDING;

windows.forEach((window) => {
  const width = window.widthMm * scaleX;
  const height = window.depthMm * scaleY;
  const x = PADDING; // Wszystkie okna zaczynają od lewej
  const y = currentY;

  // Narysuj prostokąt okna
  // ...

  currentY += height;
});
```

---

## Integracja ze stroną optymalizacji

### Zmiany w `page.tsx`

```tsx
// Dodaj import
import { PalletVisualization } from '@/features/pallets/components/PalletVisualization';
import { PalletVisualizationLegend } from '@/features/pallets/components/PalletVisualizationLegend';

// W sekcji "Szczegóły palet"
{optimization.pallets.map((pallet, index) => (
  <Card key={index}>
    <CardHeader>
      {/* ... existing header ... */}
    </CardHeader>
    <CardContent>
      {/* NOWE: Wizualizacja */}
      <div className="mb-6">
        <PalletVisualization
          pallet={pallet}
          onWindowHover={setHoveredWindow}
        />
      </div>

      {/* Existing table */}
      <div className="overflow-x-auto">
        {/* ... tabela ... */}
      </div>
    </CardContent>
  </Card>
))}

{/* Legenda na górze */}
<PalletVisualizationLegend />
```

---

## Style (TailwindCSS)

```css
/* Kolory profili */
.profile-vlak { fill: #3B82F6; }    /* blue-500 */
.profile-blok { fill: #10B981; }    /* emerald-500 */
.profile-szyba { fill: #F59E0B; }   /* amber-500 */
.profile-variant { fill: #8B5CF6; } /* violet-500 */

/* Efekty hover */
.window-rect:hover {
  filter: brightness(1.1);
  cursor: pointer;
}

/* Strefa overhang */
.overhang-zone {
  fill: #FEF3C7;  /* amber-100 */
  stroke: #F59E0B;
  stroke-dasharray: 5,5;
}

/* Paleta */
.pallet-base {
  fill: #F3F4F6;  /* gray-100 */
  stroke: #9CA3AF; /* gray-400 */
}
```

---

## Dodatkowe funkcjonalności (opcjonalne - faza 2)

### 1. Widok 3D (izometryczny)
- Pokazuje wysokość okien
- Bardziej realistyczny widok pakowania

### 2. Animacja pakowania
- Krok po kroku pokazuje jak algorytm pakuje okna
- Przydatne do debugowania/edukacji

### 3. Eksport obrazka
- Przycisk "Pobierz PNG" dla wizualizacji
- Do użycia w dokumentacji/raportach

### 4. Drag & Drop (edycja ręczna)
- Możliwość ręcznego przestawienia okien
- Walidacja czy konfiguracja jest poprawna

### 5. Porównanie wariantów
- Wyświetlanie kilku konfiguracji obok siebie
- Porównanie różnych strategii pakowania

---

## Kroki implementacji

### Faza 1: Podstawowa wizualizacja (MVP)
1. [ ] Utworzenie `PalletVisualization.tsx` z SVG
2. [ ] Implementacja skalowania mm → px
3. [ ] Rysowanie prostokątów okien z kolorami
4. [ ] Dodanie tooltipów (hover)
5. [ ] Legenda kolorów profili
6. [ ] Integracja na stronie optymalizacji

### Faza 2: Ulepszenia UX
7. [ ] Responsywność (różne rozmiary ekranu)
8. [ ] Animacje (fade-in okien)
9. [ ] Synchronizacja hover z tabelą
10. [ ] Wymiary na wizualizacji (etykiety mm)

### Faza 3: Zaawansowane (opcjonalne)
11. [ ] Widok izometryczny 3D
12. [ ] Eksport do PNG
13. [ ] Animacja procesu pakowania

---

## Pliki do utworzenia

```
apps/web/src/features/pallets/
├── components/
│   ├── PalletVisualization.tsx      # Główna wizualizacja SVG
│   ├── PalletVisualizationLegend.tsx # Legenda kolorów
│   ├── PalletCard.tsx               # Karta łącząca wizualizację + tabelę
│   └── WindowTooltip.tsx            # Tooltip z detalami okna
├── utils/
│   └── visualization-helpers.ts     # Funkcje pomocnicze (skala, kolory)
└── hooks/
    └── usePalletVisualization.ts    # Hook do obsługi interakcji
```

## Pliki do modyfikacji

```
apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx
- Dodanie PalletVisualization do każdej karty palety
- Dodanie legendy na górze strony
```

---

## Pytania do użytkownika

1. **Czy wizualizacja ma być domyślnie rozwinięta czy zwinięta?**
   - Opcja A: Zawsze widoczna obok tabeli
   - Opcja B: Toggle "Pokaż wizualizację" / "Ukryj"
   - Opcja C: Tabs: "Wizualizacja" | "Tabela"

2. **Czy potrzebne są wymiary na samej wizualizacji?**
   - Linie wymiarowe pokazujące mm
   - Etykiety z wymiarami przy każdym oknie

3. **Jakie informacje w tooltipie?**
   - Minimalne: wymiary, zlecenie
   - Pełne: wszystkie dane + reference

4. **Czy wizualizacja ma być w PDF?**
   - Wymaga modyfikacji PdfExportService
   - Znacznie zwiększa złożoność

---

## Szacowany czas implementacji

- **Faza 1 (MVP):** ~3-4h pracy
- **Faza 2 (UX):** ~2-3h pracy
- **Faza 3 (zaawansowane):** ~4-6h pracy

---

## Technologie

- **SVG** - natywne React SVG bez zewnętrznych bibliotek
- **TailwindCSS** - style
- **Radix Tooltip** - tooltips (już w projekcie przez shadcn/ui)
- Brak nowych zależności npm