/**
 * PvcStockTable - tabela stanów magazynowych profili PVC
 */

'use client';

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PvcProfileWithStock, SystemType } from '../types';
import { SYSTEM_LABELS } from '../types';

interface PvcStockTableProps {
  profiles: PvcProfileWithStock[];
  isLoading?: boolean;
  /** Czy wyświetlać kolumnę koloru (gdy nie ma wybranego koloru z sidebara) */
  showColorColumn?: boolean;
}

/**
 * Pobiera aktywne systemy dla profilu
 */
function getActiveSystems(systems: PvcProfileWithStock['systems']): SystemType[] {
  const active: SystemType[] = [];
  if (systems.isLiving) active.push('living');
  if (systems.isBlok) active.push('blok');
  if (systems.isVlak) active.push('vlak');
  if (systems.isCt70) active.push('ct70');
  if (systems.isFocusing) active.push('focusing');
  return active;
}

export const PvcStockTable: React.FC<PvcStockTableProps> = ({
  profiles,
  isLoading = false,
  showColorColumn = true,
}) => {
  // Spłaszcz dane - jeden wiersz per (profil, kolor)
  const rows = useMemo(() => {
    const result: Array<{
      profileId: number;
      profileNumber: string;
      profileName: string;
      systems: SystemType[];
      colorCode: string;
      colorName: string;
      colorHex: string | null;
      initialBeams: number;
      currentBeams: number;
      difference: number;
    }> = [];

    for (const profile of profiles) {
      const activeSystems = getActiveSystems(profile.systems);

      for (const stock of profile.stocks) {
        result.push({
          profileId: profile.id,
          profileNumber: profile.number,
          profileName: profile.name,
          systems: activeSystems,
          colorCode: stock.color.code,
          colorName: stock.color.name,
          colorHex: stock.color.hexColor,
          initialBeams: stock.initialStockBeams,
          currentBeams: stock.currentStockBeams,
          difference: stock.difference,
        });
      }
    }

    return result;
  }, [profiles]);

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-32">System</TableHead>
              {showColorColumn && <TableHead className="w-28">Kolor</TableHead>}
              <TableHead className="w-28 text-right">Stan począt.</TableHead>
              <TableHead className="w-28 text-right">Stan aktualny</TableHead>
              <TableHead className="w-24 text-right">Różnica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={showColorColumn ? 7 : 6}>
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-slate-500">
        Brak danych magazynowych dla wybranych filtrów
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Nr profilu</TableHead>
            <TableHead>Nazwa</TableHead>
            <TableHead className="w-40">System</TableHead>
            {showColorColumn && <TableHead className="w-32">Kolor</TableHead>}
            <TableHead className="w-28 text-right">Stan począt.</TableHead>
            <TableHead className="w-28 text-right">Stan aktualny</TableHead>
            <TableHead className="w-24 text-right">Różnica</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={`${row.profileId}-${row.colorCode}-${idx}`}>
              {/* Numer profilu */}
              <TableCell className="font-mono text-sm">{row.profileNumber}</TableCell>

              {/* Nazwa */}
              <TableCell className="text-sm">{row.profileName}</TableCell>

              {/* Systemy (badge'y) */}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.systems.map((system) => (
                    <Badge
                      key={system}
                      variant="outline"
                      className="text-xs px-1.5 py-0"
                    >
                      {SYSTEM_LABELS[system]}
                    </Badge>
                  ))}
                </div>
              </TableCell>

              {/* Kolor */}
              {showColorColumn && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border flex-shrink-0"
                      style={{ backgroundColor: row.colorHex || '#ccc' }}
                    />
                    <span className="font-mono text-xs">{row.colorCode}</span>
                  </div>
                </TableCell>
              )}

              {/* Stan początkowy */}
              <TableCell className="text-right font-mono text-sm">
                {row.initialBeams}
              </TableCell>

              {/* Stan aktualny */}
              <TableCell className="text-right font-mono text-sm font-medium">
                {row.currentBeams}
              </TableCell>

              {/* Różnica */}
              <TableCell
                className={cn(
                  'text-right font-mono text-sm',
                  row.difference > 0 && 'text-green-600',
                  row.difference < 0 && 'text-red-600'
                )}
              >
                {row.difference > 0 ? '+' : ''}
                {row.difference}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary */}
      <div className="p-3 bg-slate-50 border-t text-sm text-slate-600 flex justify-between">
        <span>Razem: {rows.length} pozycji</span>
        <span>
          Łącznie beli:{' '}
          <strong>{rows.reduce((acc, r) => acc + r.currentBeams, 0)}</strong>
        </span>
      </div>
    </div>
  );
};

export default PvcStockTable;
