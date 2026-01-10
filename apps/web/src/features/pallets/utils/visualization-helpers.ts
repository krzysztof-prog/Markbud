/**
 * Pallet Visualization Helpers
 * Funkcje pomocnicze dla wizualizacji pakowania palet
 */

import type { OptimizedPallet, OptimizedWindow } from '@/types/pallet';

// ==================== STAŁE ====================

export const MAX_OVERHANG_MM = 700;

export const CANVAS = {
  WIDTH: 600,
  HEIGHT: 400,
  PADDING: 40,
  LABEL_OFFSET: 25,
} as const;

// Kolory profili
export const PROFILE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  VLAK: { fill: '#3B82F6', stroke: '#2563EB', label: 'VLAK' },
  BLOK: { fill: '#10B981', stroke: '#059669', label: 'BLOK' },
  szyba: { fill: '#F59E0B', stroke: '#D97706', label: 'Szyba' },
  VARIANT: { fill: '#8B5CF6', stroke: '#7C3AED', label: 'VARIANT' },
};

export const DEFAULT_COLOR = { fill: '#6B7280', stroke: '#4B5563', label: 'Inne' };

// ==================== TYPY ====================

export interface VisualizationScale {
  scaleX: number;
  scaleY: number;
  canvasWidth: number;
  canvasHeight: number;
  drawableWidth: number;
  drawableHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  window: OptimizedWindow;
  index: number;
}

// ==================== FUNKCJE ====================

/**
 * Oblicza skalę dla wizualizacji
 */
export function calculateScale(pallet: OptimizedPallet): VisualizationScale {
  const totalWidth = pallet.palletLengthMm + MAX_OVERHANG_MM;
  const totalDepth = pallet.maxDepthMm;

  const drawableWidth = CANVAS.WIDTH - 2 * CANVAS.PADDING;
  const drawableHeight = CANVAS.HEIGHT - 2 * CANVAS.PADDING - CANVAS.LABEL_OFFSET;

  // Skaluj proporcjonalnie (zachowaj aspect ratio)
  const scaleX = drawableWidth / totalWidth;
  const scaleY = drawableHeight / totalDepth;

  // Użyj mniejszej skali żeby wszystko się zmieściło
  const scale = Math.min(scaleX, scaleY);

  // Wycentruj
  const actualWidth = totalWidth * scale;
  const actualHeight = totalDepth * scale;
  const offsetX = CANVAS.PADDING + (drawableWidth - actualWidth) / 2;
  const offsetY = CANVAS.PADDING + CANVAS.LABEL_OFFSET + (drawableHeight - actualHeight) / 2;

  return {
    scaleX: scale,
    scaleY: scale,
    canvasWidth: CANVAS.WIDTH,
    canvasHeight: CANVAS.HEIGHT,
    drawableWidth: actualWidth,
    drawableHeight: actualHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Oblicza pozycje okien na wizualizacji
 * Obsługuje okna side-by-side (z tym samym sideBySideGroupId)
 */
export function calculateWindowPositions(
  pallet: OptimizedPallet,
  scale: VisualizationScale
): WindowPosition[] {
  const positions: WindowPosition[] = [];
  let currentY = 0;
  const processedGroups = new Set<number>();

  pallet.windows.forEach((window, index) => {
    const groupId = window.sideBySideGroupId;

    // Sprawdź czy to okno side-by-side i czy już przetworzyliśmy tę grupę
    if (groupId !== undefined) {
      if (processedGroups.has(groupId)) {
        // To okno zostało już umieszczone jako część grupy - pomiń
        return;
      }

      // Znajdź wszystkie okna w tej grupie
      const groupWindows = pallet.windows
        .map((w, i) => ({ window: w, originalIndex: i }))
        .filter((item) => item.window.sideBySideGroupId === groupId);

      if (groupWindows.length === 2) {
        // Dwa okna obok siebie
        const [first, second] = groupWindows;

        // Oblicz wspólną głębokość (suma depthMm obu okien, bo każde ma połowę)
        const combinedDepth = first.window.depthMm + second.window.depthMm;
        const rowHeight = combinedDepth * scale.scaleY;

        // Pierwsze okno (lewa strona)
        const width1 = first.window.widthMm * scale.scaleX;
        positions.push({
          x: scale.offsetX,
          y: scale.offsetY + currentY,
          width: width1,
          height: rowHeight,
          window: first.window,
          index: first.originalIndex,
        });

        // Drugie okno (prawa strona) - z małym odstępem
        const gap = 2; // px
        const width2 = second.window.widthMm * scale.scaleX;
        positions.push({
          x: scale.offsetX + width1 + gap,
          y: scale.offsetY + currentY,
          width: width2,
          height: rowHeight,
          window: second.window,
          index: second.originalIndex,
        });

        currentY += rowHeight;
        processedGroups.add(groupId);
        return;
      }
    }

    // Pojedyncze okno (bez grupy side-by-side)
    const width = window.widthMm * scale.scaleX;
    const height = window.depthMm * scale.scaleY;
    const x = scale.offsetX;
    const y = scale.offsetY + currentY;

    positions.push({
      x,
      y,
      width,
      height,
      window,
      index,
    });

    currentY += height;
  });

  return positions;
}

/**
 * Pobiera kolor dla typu profilu
 */
export function getProfileColor(profileType: string) {
  return PROFILE_COLORS[profileType] || DEFAULT_COLOR;
}

/**
 * Formatuje wymiar w mm
 */
export function formatDimension(mm: number): string {
  return `${mm.toLocaleString('pl-PL')} mm`;
}

/**
 * Oblicza pozycję linii overhang
 */
export function calculateOverhangLine(
  pallet: OptimizedPallet,
  scale: VisualizationScale
): { x: number; y1: number; y2: number } {
  const palletEndX = scale.offsetX + pallet.palletLengthMm * scale.scaleX;
  return {
    x: palletEndX,
    y1: scale.offsetY,
    y2: scale.offsetY + scale.drawableHeight,
  };
}

/**
 * Generuje unikalne kolory dla okien z tego samego zlecenia
 */
export function getOrderColor(orderNumber: string, _index: number): string {
  // Prosty hash do generowania koloru
  let hash = 0;
  for (let i = 0; i < orderNumber.length; i++) {
    hash = orderNumber.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}