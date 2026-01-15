'use client';

import { PROFILE_COLORS } from '../helpers/visualization-helpers';

interface PalletVisualizationLegendProps {
  className?: string;
}

export function PalletVisualizationLegend({ className = '' }: PalletVisualizationLegendProps) {
  return (
    <div className={`flex flex-wrap items-center gap-4 text-sm ${className}`}>
      <span className="text-muted-foreground font-medium">Typy profili:</span>
      {Object.entries(PROFILE_COLORS).map(([type, color]) => (
        <div key={type} className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: color.fill, border: `1px solid ${color.stroke}` }}
          />
          <span>{color.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-4 pl-4 border-l">
        <div
          className="w-4 h-4 rounded"
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px dashed #F59E0B',
          }}
        />
        <span className="text-muted-foreground">Strefa wystawania (overhang)</span>
      </div>
    </div>
  );
}

export default PalletVisualizationLegend;
