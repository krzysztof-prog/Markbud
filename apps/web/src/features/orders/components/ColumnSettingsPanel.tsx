'use client';

/**
 * Panel ustawień kolumn z drag & drop
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import type { Column, ColumnId } from '../types';

// ================================
// Typy
// ================================

interface ColumnSettingsPanelProps {
  columns: Column[];
  draggedColumn: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onToggleVisibility: (columnId: ColumnId) => void;
  onReset: () => void;
}

// ================================
// Komponent
// ================================

export const ColumnSettingsPanel: React.FC<ColumnSettingsPanelProps> = ({
  columns,
  draggedColumn,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleVisibility,
  onReset,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Ustawienia kolumn</CardTitle>
          <Button variant="outline" size="sm" onClick={onReset}>
            Przywróć domyślne
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Przeciągnij kolumny, aby zmienić ich kolejność. Kliknij ikonę oka, aby ukryć/pokazać kolumnę.
        </p>
        <div className="space-y-2">
          {columns.map((column, index) => (
            <div
              key={column.id}
              className={`flex items-center gap-2 p-3 bg-slate-50 rounded border hover:bg-slate-100 ${
                draggedColumn === index ? 'opacity-50' : ''
              } ${!column.visible ? 'opacity-60' : ''}`}
            >
              <div
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-2 flex-1 cursor-move"
              >
                <GripVertical className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium">{column.label}</span>
              </div>
              <button
                onClick={() => onToggleVisibility(column.id)}
                className="p-1 hover:bg-slate-200 rounded"
                title={column.visible ? 'Ukryj kolumnę' : 'Pokaż kolumnę'}
              >
                {column.visible ? (
                  <Eye className="h-4 w-4 text-slate-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ColumnSettingsPanel;
