'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import type { RemanentFormEntry } from '@/types/warehouse';

interface RemanentConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  colorCode: string; // hex color for background
  colorName: string;
  colorCodeText?: string; // RAL/color code text
  entries: RemanentFormEntry[];
  isPending: boolean;
}

export function RemanentConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  colorCode,
  colorName,
  colorCodeText,
  entries,
  isPending,
}: RemanentConfirmModalProps) {
  // Calculate statistics
  const stats = entries.reduce(
    (acc, entry) => {
      if (entry.actualStock !== '') {
        acc.filledCount++;
        if (entry.difference > 0) {
          acc.surplusCount++;
          acc.totalSurplus += entry.difference;
        } else if (entry.difference < 0) {
          acc.shortageCount++;
          acc.totalShortage += Math.abs(entry.difference);
        }
      }
      return acc;
    },
    {
      filledCount: 0,
      surplusCount: 0,
      shortageCount: 0,
      totalSurplus: 0,
      totalShortage: 0,
    }
  );

  const hasUnfilledEntries = stats.filledCount < entries.length;
  const hasDifferences = stats.surplusCount > 0 || stats.shortageCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Potwierdź remanent</DialogTitle>
          <DialogDescription>
            Sprawdź podsumowanie przed zapisaniem remanentu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Color info */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <div
              className="w-8 h-8 rounded border border-slate-300"
              style={{ backgroundColor: colorCode }}
              title={colorCodeText || colorName}
            />
            <div>
              <div className="font-semibold">{colorName}</div>
              {colorCodeText && <div className="text-xs text-slate-500">{colorCodeText}</div>}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium">Zinwentaryzowane profile</span>
              <span className="font-semibold text-blue-700">
                {stats.filledCount} / {entries.length}
              </span>
            </div>

            {stats.surplusCount > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Nadwyżki</span>
                </div>
                <span className="font-semibold text-green-700">
                  {stats.surplusCount} ({stats.totalSurplus} bel)
                </span>
              </div>
            )}

            {stats.shortageCount > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Niedobory</span>
                </div>
                <span className="font-semibold text-red-700">
                  {stats.shortageCount} ({stats.totalShortage} bel)
                </span>
              </div>
            )}

            {!hasDifferences && stats.filledCount > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Stan zgodny</span>
                </div>
                <span className="font-semibold text-green-700">100%</span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {hasUnfilledEntries && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Uwaga:</strong> Nie wszystkie profile zostały zinwentaryzowane.
                Puste wartości zostaną zapisane jako 0.
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              Remanent zaktualizuje stan magazynu na podstawie faktycznego stanu.
              Po zapisie możesz cofnąć tę operację w ciągu 24h.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={onConfirm} disabled={isPending || stats.filledCount === 0}>
            {isPending ? 'Zapisywanie...' : 'Potwierdź i zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
