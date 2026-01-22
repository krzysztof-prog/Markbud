/**
 * ColorSidebarRight - sidebar z listą kolorów po prawej stronie
 *
 * Funkcje:
 * - Wyszukiwanie kolorów (po kodzie lub nazwie)
 * - Wybór koloru (podświetlenie)
 * - Wyświetlanie: kod | nazwa
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PvcColor } from '../types';

interface ColorSidebarRightProps {
  colors: PvcColor[];
  selectedColorId: number | null;
  onColorSelect: (colorId: number | null) => void;
  /** Wysokość sidebara (opcjonalna) */
  height?: string;
  /** Czy wyłączyć interakcję */
  disabled?: boolean;
}

export const ColorSidebarRight: React.FC<ColorSidebarRightProps> = ({
  colors,
  selectedColorId,
  onColorSelect,
  height = 'h-full',
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtruj kolory wg wyszukiwania
  const filteredColors = useMemo(() => {
    if (!searchTerm.trim()) return colors;

    const term = searchTerm.toLowerCase().trim();
    return colors.filter(
      (color) =>
        color.code.toLowerCase().includes(term) ||
        color.name.toLowerCase().includes(term)
    );
  }, [colors, searchTerm]);

  const handleColorClick = useCallback(
    (colorId: number) => {
      if (disabled) return;

      // Toggle: jeśli już wybrany, odznacz
      if (selectedColorId === colorId) {
        onColorSelect(null);
      } else {
        onColorSelect(colorId);
      }
    },
    [disabled, selectedColorId, onColorSelect]
  );

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onColorSelect(null);
  };

  return (
    <div
      className={cn(
        'w-64 border-l bg-white flex flex-col',
        height,
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header z wyszukiwaniem */}
      <div className="p-3 border-b bg-slate-50">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Szukaj kolor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
            disabled={disabled}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Info o wybranym kolorze */}
        {selectedColorId && (
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              Wybrany:{' '}
              <strong>
                {colors.find((c) => c.id === selectedColorId)?.code}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-blue-600 hover:underline"
            >
              Wyczyść
            </button>
          </div>
        )}
      </div>

      {/* Lista kolorów */}
      <div className="flex-1 overflow-y-auto">
        {filteredColors.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            {searchTerm ? 'Brak wyników wyszukiwania' : 'Brak kolorów'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredColors.map((color) => {
              const isSelected = selectedColorId === color.id;

              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => handleColorClick(color.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    'hover:bg-slate-50',
                    isSelected && 'bg-blue-50 hover:bg-blue-100'
                  )}
                >
                  {/* Kolor (kwadracik) */}
                  <div
                    className="w-5 h-5 rounded border flex-shrink-0"
                    style={{
                      backgroundColor: color.hexColor || '#ccc',
                    }}
                  />

                  {/* Kod koloru */}
                  <span
                    className={cn(
                      'font-mono text-sm w-10 flex-shrink-0',
                      isSelected ? 'text-blue-700 font-semibold' : 'text-slate-600'
                    )}
                  >
                    {color.code}
                  </span>

                  {/* Nazwa koloru */}
                  <span
                    className={cn(
                      'text-sm truncate flex-1',
                      isSelected ? 'text-blue-700' : 'text-slate-800'
                    )}
                  >
                    {color.name}
                  </span>

                  {/* Wskaźnik wyboru */}
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer z liczbą kolorów */}
      <div className="p-2 border-t bg-slate-50 text-xs text-slate-500 text-center">
        {filteredColors.length} / {colors.length} kolorów
      </div>
    </div>
  );
};

export default ColorSidebarRight;
