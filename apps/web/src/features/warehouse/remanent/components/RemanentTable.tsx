'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RemanentFormEntry, WarehouseTableRow } from '@/types/warehouse';

interface RemanentTableProps {
  warehouseData: WarehouseTableRow[];
  entries: RemanentFormEntry[];
  onChange: (entries: RemanentFormEntry[]) => void;
}

export function RemanentTable({ warehouseData, entries, onChange }: RemanentTableProps) {
  // Initialize entries from warehouseData
  useEffect(() => {
    if (warehouseData.length > 0 && entries.length === 0) {
      const initialEntries: RemanentFormEntry[] = warehouseData.map((row) => ({
        profileId: row.profileId,
        profileNumber: row.profileNumber,
        initialStock: row.initialStock || 0,
        calculatedStock: row.currentStock,
        actualStock: '', // Empty initially
        difference: 0,
      }));
      onChange(initialEntries);
    }
  }, [warehouseData, entries.length, onChange]);

  const handleActualStockChange = (index: number, value: string) => {
    const newEntries = [...entries];
    const numValue = value === '' ? '' : Number(value);
    newEntries[index].actualStock = numValue;
    newEntries[index].difference =
      numValue === '' ? 0 : numValue - newEntries[index].calculatedStock;
    onChange(newEntries);
  };

  const getDifferenceColor = (difference: number) => {
    if (difference === 0) return 'text-green-600';
    if (Math.abs(difference) <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference === 0) return <Check className="h-4 w-4 inline text-green-600" />;
    return <AlertTriangle className="h-4 w-4 inline text-red-500" />;
  };

  if (entries.length === 0) {
    return <div className="text-center py-8 text-slate-500">Ładowanie danych...</div>;
  }

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Profil</th>
            <th className="px-4 py-3 text-center font-semibold">Stan początkowy</th>
            <th className="px-4 py-3 text-center font-semibold">Stan obliczony</th>
            <th className="px-4 py-3 text-center font-semibold">Stan rzeczywisty</th>
            <th className="px-4 py-3 text-center font-semibold">Różnica</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr
              key={entry.profileId}
              className={cn(
                'border-b',
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                entry.difference !== 0 && entry.actualStock !== '' && 'bg-yellow-50'
              )}
            >
              <td className="px-4 py-3 font-mono font-semibold">{entry.profileNumber}</td>
              <td className="px-4 py-3 text-center text-slate-600">{entry.initialStock} bel</td>
              <td className="px-4 py-3 text-center">{entry.calculatedStock} bel</td>
              <td className="px-4 py-3 text-center">
                <Input
                  type="number"
                  min="0"
                  value={entry.actualStock}
                  onChange={(e) => handleActualStockChange(index, e.target.value)}
                  className="w-24 mx-auto"
                  placeholder="0"
                  aria-label={`Stan rzeczywisty dla profilu ${entry.profileNumber}`}
                />
              </td>
              <td
                className={cn('px-4 py-3 text-center font-semibold', getDifferenceColor(entry.difference))}
                role={entry.actualStock !== '' && entry.difference !== 0 ? 'alert' : undefined}
                aria-live="polite"
              >
                {entry.actualStock !== '' && (
                  <>
                    {entry.difference > 0 && '+'}{entry.difference} bel{' '}
                    {getDifferenceIcon(entry.difference)}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
