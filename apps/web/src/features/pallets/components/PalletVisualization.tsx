'use client';

import { useState, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { OptimizedPallet, OptimizedWindow } from '@/types/pallet';
import {
  calculateScale,
  calculateWindowPositions,
  calculateOverhangLine,
  getProfileColor,
  formatDimension,
  CANVAS,
  MAX_OVERHANG_MM,
  type WindowPosition,
} from '../utils/visualization-helpers';

interface PalletVisualizationProps {
  pallet: OptimizedPallet;
  onWindowHover?: (window: OptimizedWindow | null) => void;
  onWindowClick?: (window: OptimizedWindow) => void;
  highlightedWindowId?: number;
  className?: string;
}

export function PalletVisualization({
  pallet,
  onWindowHover,
  onWindowClick,
  highlightedWindowId,
  className = '',
}: PalletVisualizationProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const scale = useMemo(() => calculateScale(pallet), [pallet]);
  const windowPositions = useMemo(
    () => calculateWindowPositions(pallet, scale),
    [pallet, scale]
  );
  const overhangLine = useMemo(
    () => calculateOverhangLine(pallet, scale),
    [pallet, scale]
  );

  const handleMouseEnter = (pos: WindowPosition) => {
    setHoveredIndex(pos.index);
    onWindowHover?.(pos.window);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    onWindowHover?.(null);
  };

  const handleClick = (pos: WindowPosition) => {
    onWindowClick?.(pos.window);
  };

  // Oblicz pozycje dla etykiet wymiarów
  const palletLengthPx = pallet.palletLengthMm * scale.scaleX;
  const overhangWidthPx = MAX_OVERHANG_MM * scale.scaleX;
  const totalWidthPx = palletLengthPx + overhangWidthPx;

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`relative ${className}`}>
        <svg
          viewBox={`0 0 ${CANVAS.WIDTH} ${CANVAS.HEIGHT}`}
          className="w-full h-auto border rounded-lg bg-gray-50"
          style={{ maxHeight: '400px' }}
        >
          {/* Tło - cała strefa ładunku */}
          <rect
            x={scale.offsetX}
            y={scale.offsetY}
            width={totalWidthPx}
            height={scale.drawableHeight}
            fill="#F9FAFB"
            stroke="#E5E7EB"
            strokeWidth={1}
          />

          {/* Strefa palety (bez overhang) */}
          <rect
            x={scale.offsetX}
            y={scale.offsetY}
            width={palletLengthPx}
            height={scale.drawableHeight}
            fill="#F3F4F6"
            stroke="#9CA3AF"
            strokeWidth={2}
          />

          {/* Strefa overhang (przerywana) */}
          <rect
            x={scale.offsetX + palletLengthPx}
            y={scale.offsetY}
            width={overhangWidthPx}
            height={scale.drawableHeight}
            fill="#FEF3C7"
            fillOpacity={0.5}
            stroke="#F59E0B"
            strokeWidth={1}
            strokeDasharray="5,5"
          />

          {/* Linia granicy palety */}
          <line
            x1={overhangLine.x}
            y1={overhangLine.y1}
            x2={overhangLine.x}
            y2={overhangLine.y2}
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="8,4"
          />

          {/* Okna */}
          {windowPositions.map((pos) => {
            const color = getProfileColor(pos.window.profileType);
            const isHovered = hoveredIndex === pos.index;
            const isHighlighted = highlightedWindowId === pos.window.id;

            return (
              <Tooltip key={`${pos.window.id}-${pos.index}`}>
                <TooltipTrigger asChild>
                  <g
                    onMouseEnter={() => handleMouseEnter(pos)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(pos)}
                    className="cursor-pointer"
                  >
                    {/* Prostokąt okna */}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.width}
                      height={pos.height - 1}
                      fill={color.fill}
                      stroke={isHovered || isHighlighted ? '#1F2937' : color.stroke}
                      strokeWidth={isHovered || isHighlighted ? 2 : 1}
                      opacity={isHovered ? 1 : 0.9}
                      rx={2}
                      className="transition-all duration-150"
                    />

                    {/* Etykieta wymiaru na oknie (jeśli jest miejsce) */}
                    {pos.height > 20 && pos.width > 60 && (
                      <text
                        x={pos.x + pos.width / 2}
                        y={pos.y + pos.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={11}
                        fontWeight={500}
                        className="pointer-events-none select-none"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {pos.window.widthMm}
                      </text>
                    )}
                  </g>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-3">
                  <WindowTooltipContent window={pos.window} index={pos.index} />
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Wymiary - szerokość palety */}
          <g className="dimension-labels">
            {/* Linia wymiaru szerokości palety */}
            <line
              x1={scale.offsetX}
              y1={scale.offsetY - 15}
              x2={scale.offsetX + palletLengthPx}
              y2={scale.offsetY - 15}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <line
              x1={scale.offsetX}
              y1={scale.offsetY - 20}
              x2={scale.offsetX}
              y2={scale.offsetY - 10}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <line
              x1={scale.offsetX + palletLengthPx}
              y1={scale.offsetY - 20}
              x2={scale.offsetX + palletLengthPx}
              y2={scale.offsetY - 10}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <text
              x={scale.offsetX + palletLengthPx / 2}
              y={scale.offsetY - 22}
              textAnchor="middle"
              fill="#374151"
              fontSize={11}
              fontWeight={500}
            >
              {pallet.palletLengthMm} mm
            </text>

            {/* Etykieta overhang */}
            <text
              x={scale.offsetX + palletLengthPx + overhangWidthPx / 2}
              y={scale.offsetY - 22}
              textAnchor="middle"
              fill="#D97706"
              fontSize={10}
            >
              +{MAX_OVERHANG_MM} mm
            </text>

            {/* Wymiar głębokości (po prawej stronie) */}
            <line
              x1={scale.offsetX + totalWidthPx + 15}
              y1={scale.offsetY}
              x2={scale.offsetX + totalWidthPx + 15}
              y2={scale.offsetY + scale.drawableHeight}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <line
              x1={scale.offsetX + totalWidthPx + 10}
              y1={scale.offsetY}
              x2={scale.offsetX + totalWidthPx + 20}
              y2={scale.offsetY}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <line
              x1={scale.offsetX + totalWidthPx + 10}
              y1={scale.offsetY + scale.drawableHeight}
              x2={scale.offsetX + totalWidthPx + 20}
              y2={scale.offsetY + scale.drawableHeight}
              stroke="#6B7280"
              strokeWidth={1}
            />
            <text
              x={scale.offsetX + totalWidthPx + 28}
              y={scale.offsetY + scale.drawableHeight / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fill="#374151"
              fontSize={11}
              fontWeight={500}
              transform={`rotate(90, ${scale.offsetX + totalWidthPx + 28}, ${scale.offsetY + scale.drawableHeight / 2})`}
            >
              {pallet.usedDepthMm} / {pallet.maxDepthMm} mm
            </text>
          </g>

          {/* Pasek wykorzystania na dole */}
          <g className="utilization-bar">
            <rect
              x={scale.offsetX}
              y={CANVAS.HEIGHT - 25}
              width={totalWidthPx}
              height={8}
              fill="#E5E7EB"
              rx={4}
            />
            <rect
              x={scale.offsetX}
              y={CANVAS.HEIGHT - 25}
              width={totalWidthPx * (pallet.utilizationPercent / 100)}
              height={8}
              fill={
                pallet.utilizationPercent >= 80
                  ? '#10B981'
                  : pallet.utilizationPercent >= 50
                  ? '#F59E0B'
                  : '#6B7280'
              }
              rx={4}
            />
            <text
              x={scale.offsetX + totalWidthPx / 2}
              y={CANVAS.HEIGHT - 10}
              textAnchor="middle"
              fill="#374151"
              fontSize={10}
            >
              Wykorzystanie: {pallet.utilizationPercent.toFixed(1)}%
            </text>
          </g>
        </svg>
      </div>
    </TooltipProvider>
  );
}

// Komponent zawartości tooltipa
function WindowTooltipContent({
  window,
  index,
}: {
  window: OptimizedWindow;
  index: number;
}) {
  const color = getProfileColor(window.profileType);

  return (
    <div className="space-y-2 min-w-[180px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Okno #{index + 1}</span>
        <Badge
          variant="outline"
          style={{ backgroundColor: color.fill, color: 'white', borderColor: color.stroke }}
        >
          {window.profileType}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Szerokość:</span>
        <span className="font-mono">{formatDimension(window.widthMm)}</span>
        <span className="text-muted-foreground">Wysokość:</span>
        <span className="font-mono">{formatDimension(window.heightMm)}</span>
        <span className="text-muted-foreground">Głębokość:</span>
        <span className="font-mono">{formatDimension(window.depthMm)}</span>
        <span className="text-muted-foreground">Zlecenie:</span>
        <span className="font-mono text-xs">{window.orderNumber}</span>
      </div>
    </div>
  );
}

export default PalletVisualization;
