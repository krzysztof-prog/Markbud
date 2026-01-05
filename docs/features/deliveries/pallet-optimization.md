# Deliveries Module - Pallet Optimization

Documentation for intelligent pallet packing algorithm.

## Purpose

Optimize window packing on pallets:
- Bin-packing algorithm
- 2D visualization
- Space utilization maximization
- PDF layout export

## Algorithm

### Bin Packing Strategy

```typescript
function optimizePallets(windows, palletDimensions) {
  // 1. Sort windows by area (largest first)
  const sorted = windows.sort((a, b) => 
    (b.width * b.height) - (a.width * a.height)
  );
  
  // 2. Group by similar dimensions
  const groups = groupBySimilarSize(sorted);
  
  // 3. Pack each group
  const pallets = [];
  for (const group of groups) {
    const packed = packGroup(group, palletDimensions);
    pallets.push(...packed);
  }
  
  return pallets;
}
```

### 2D Placement

```typescript
function placeWindow(pallet, window) {
  // Find best position using guillotine algorithm
  for (const freeRect of pallet.freeRectangles) {
    if (fits(window, freeRect)) {
      place(window, freeRect);
      splitFreeRectangle(freeRect, window);
      return true;
    }
  }
  return false; // Doesn't fit
}
```

## Visualization

### ASCII Layout Example

```
┌─────────────────────────────┐
│  Paleta 1 (1200x1000 mm)    │
├─────────────────────────────┤
│ ┌──────┐  ┌──────┐          │
│ │ W1   │  │ W2   │          │
│ │800x  │  │800x  │          │
│ │1200  │  │1200  │          │
│ └──────┘  └──────┘          │
│                              │
│ ┌──────┐  ┌──────┐          │
│ │ W3   │  │ W4   │          │
│ └──────┘  └──────┘          │
└─────────────────────────────┘
Wykorzystanie: 85%
```

### 2D Canvas Rendering

Frontend renders using HTML5 Canvas:
- `apps/web/src/features/deliveries/components/PalletVisualization.tsx`
- Scales to fit container
- Color-coded windows
- Dimensions overlay

## PDF Export

**Layout PDF includes:**
- Each pallet on separate page
- 2D visualization (top view)
- Window dimensions
- Loading sequence numbers
- QR codes (optional)

**Generation:**
```typescript
// apps/api/src/services/palletLayoutPDF.ts
export async function generateLayoutPDF(deliveryId) {
  const pallets = await getPalletLayout(deliveryId);
  
  const doc = new PDFDocument();
  for (const pallet of pallets) {
    doc.addPage();
    drawPalletLayout(doc, pallet);
  }
  
  return doc;
}
```

## Performance

**Optimization:**
- Cached results (React Query)
- Web Worker for heavy calculations
- Debounced recalculation on changes

**Metrics:**
- Average utilization: 80-90%
- Calculation time: <500ms for 50 windows

---

*Last updated: 2025-12-30*
