'use client';

import { cn } from '@/lib/utils';
import { useColors } from '@/hooks/useColors';
import type { Color } from '@/types';

interface ColorSidebarProps {
  selectedColorId: number | null;
  onColorSelect: (colorId: number) => void;
  className?: string;
}

export function ColorSidebar({ selectedColorId, onColorSelect, className }: ColorSidebarProps) {
  const { typicalColors, atypicalColors, isLoading } = useColors();

  if (isLoading) {
    return (
      <div className={cn('bg-white overflow-y-auto', className)}>
        <div className="p-4">
          <div className="text-center text-slate-500 text-sm">Ładowanie kolorów...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white overflow-y-auto', className)}>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
          Kolory
        </h3>

        {/* Typowe */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">Typowe</p>
          <div className="space-y-1">
            {typicalColors.map((color: Color) => (
              <button
                key={color.id}
                onClick={() => onColorSelect(color.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  selectedColorId === color.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-slate-50'
                )}
              >
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: color.hexColor || '#ccc' }}
                />
                <span className="font-mono text-xs">{color.code}</span>
                <span className="flex-1 truncate">{color.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nietypowe */}
        {atypicalColors.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Nietypowe</p>
            <div className="space-y-1">
              {atypicalColors.map((color: Color) => (
                <button
                  key={color.id}
                  onClick={() => onColorSelect(color.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    selectedColorId === color.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color.hexColor || '#ccc' }}
                  />
                  <span className="font-mono text-xs">{color.code}</span>
                  <span className="flex-1 truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
