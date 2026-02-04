/**
 * PvcStockTable - tabela stanów magazynowych profili PVC
 * Kolumny: Stan pocz. | Dostawy | RW | Stan akt. | Zamów. | Zapotrz. | Stan po zapotrz.
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
  /** Ukryj wiersze gdzie stan aktualny = 0 */
  hideZeroStock?: boolean;
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

interface FlatRow {
  profileId: number;
  profileNumber: string;
  profileName: string;
  systems: SystemType[];
  colorCode: string | null;
  colorName: string | null;
  colorHex: string | null;
  isPrivateColor: boolean;
  privateColorName: string | null;
  initialBeams: number;
  deliveriesBeams: number;
  rwBeams: number;
  currentBeams: number;
  orderedBeams: number;
  demandBeams: number;
  afterDemandBeams: number;
}

// Liczba kolumn danych (bez profilu/nazwy/systemu/koloru)
const DATA_COLUMNS = 7;

export const PvcStockTable: React.FC<PvcStockTableProps> = ({
  profiles,
  isLoading = false,
  showColorColumn = true,
  hideZeroStock = false,
}) => {
  // Spłaszcz dane - jeden wiersz per (profil, kolor)
  const rows = useMemo(() => {
    const result: FlatRow[] = [];

    for (const profile of profiles) {
      const activeSystems = getActiveSystems(profile.systems);

      for (const stock of profile.stocks) {
        const isPrivate = stock.privateColorId != null;
        result.push({
          profileId: profile.id,
          profileNumber: profile.number,
          profileName: profile.name,
          systems: activeSystems,
          colorCode: stock.color?.code ?? null,
          colorName: stock.color?.name ?? null,
          colorHex: stock.color?.hexColor ?? null,
          isPrivateColor: isPrivate,
          privateColorName: stock.privateColorName,
          initialBeams: stock.initialStockBeams ?? 0,
          deliveriesBeams: stock.deliveriesBeams ?? 0,
          rwBeams: stock.rwBeams ?? 0,
          currentBeams: stock.currentStockBeams ?? 0,
          orderedBeams: stock.orderedBeams ?? 0,
          demandBeams: stock.demandBeams ?? 0,
          afterDemandBeams: stock.afterDemandBeams ?? 0,
        });
      }
    }

    return result;
  }, [profiles]);

  // Filtruj wiersze z zerowym stanem aktualnym
  const filteredRows = useMemo(() => {
    if (!hideZeroStock) return rows;
    return rows.filter((row) => row.currentBeams !== 0);
  }, [rows, hideZeroStock]);

  // Nagłówki kolumn
  const headerCells = (
    <TableRow>
      <TableHead className="w-20">Nr profilu</TableHead>
      <TableHead className="min-w-[120px]">Nazwa</TableHead>
      <TableHead className="w-auto">System</TableHead>
      {showColorColumn && <TableHead className="w-28">Kolor</TableHead>}
      <TableHead className="w-20 text-right">Stan pocz.</TableHead>
      <TableHead className="w-20 text-right">Dostawy</TableHead>
      <TableHead className="w-16 text-right">RW</TableHead>
      <TableHead className="w-24 text-right">Stan akt.</TableHead>
      <TableHead className="w-20 text-right">Zamów.</TableHead>
      <TableHead className="w-20 text-right">Zapotrz.</TableHead>
      <TableHead className="w-24 text-right">Po zapotrz.</TableHead>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>{headerCells}</TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={showColorColumn ? 3 + 1 + DATA_COLUMNS : 3 + DATA_COLUMNS}>
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-slate-500">
        Brak danych magazynowych dla wybranych filtrów
      </div>
    );
  }

  // Oblicz sumy dla footera
  const totalCurrentBeams = filteredRows.reduce((acc, r) => acc + r.currentBeams, 0);
  const totalAfterDemand = filteredRows.reduce((acc, r) => acc + r.afterDemandBeams, 0);

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>{headerCells}</TableHeader>
        <TableBody>
          {filteredRows.map((row, idx) => {
            const rowKey = row.isPrivateColor
              ? `${row.profileId}-p${row.privateColorName}-${idx}`
              : `${row.profileId}-c${row.colorCode}-${idx}`;

            return (
              <TableRow key={rowKey}>
                {/* Numer profilu */}
                <TableCell className="font-mono text-sm">{row.profileNumber}</TableCell>

                {/* Nazwa */}
                <TableCell className="text-sm">{row.profileName}</TableCell>

                {/* Systemy */}
                <TableCell>
                  <div className="flex gap-0.5 flex-nowrap">
                    {row.systems.map((system) => (
                      <Badge
                        key={system}
                        variant="outline"
                        className="text-[10px] px-1 py-0 leading-4"
                      >
                        {SYSTEM_LABELS[system]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>

                {/* Kolor */}
                {showColorColumn && (
                  <TableCell>
                    {row.isPrivateColor ? (
                      <span className="text-xs italic text-slate-500">
                        {row.privateColorName ?? 'Prywatny'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border flex-shrink-0"
                          style={{ backgroundColor: row.colorHex || '#ccc' }}
                        />
                        <span className="font-mono text-xs">{row.colorCode}</span>
                      </div>
                    )}
                  </TableCell>
                )}

                {/* Stan początkowy */}
                <TableCell className="text-right font-mono text-sm">
                  {row.initialBeams || '-'}
                </TableCell>

                {/* Dostawy (zielony) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm',
                  row.deliveriesBeams > 0 && 'text-green-600'
                )}>
                  {row.deliveriesBeams || '-'}
                </TableCell>

                {/* RW (pomarańczowy) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm',
                  row.rwBeams > 0 && 'text-orange-600'
                )}>
                  {row.rwBeams || '-'}
                </TableCell>

                {/* Stan aktualny (bold, czerwony jeśli < 0) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm font-bold',
                  row.currentBeams < 0 && 'text-red-600'
                )}>
                  {row.currentBeams}
                </TableCell>

                {/* Zamówione (niebieski) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm',
                  row.orderedBeams > 0 && 'text-blue-600'
                )}>
                  {row.orderedBeams || '-'}
                </TableCell>

                {/* Zapotrzebowanie (pomarańczowy) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm',
                  row.demandBeams > 0 && 'text-orange-600'
                )}>
                  {row.demandBeams || '-'}
                </TableCell>

                {/* Stan po zapotrzebowaniu (bold, czerwony jeśli < 0) */}
                <TableCell className={cn(
                  'text-right font-mono text-sm font-bold',
                  row.afterDemandBeams < 0 && 'text-red-600'
                )}>
                  {row.afterDemandBeams}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Podsumowanie */}
      <div className="p-3 bg-slate-50 border-t text-sm text-slate-600 flex flex-wrap gap-4 justify-between">
        <span>Razem: {filteredRows.length} pozycji</span>
        <div className="flex gap-4">
          <span>
            Stan aktualny:{' '}
            <strong className={cn(totalCurrentBeams < 0 && 'text-red-600')}>
              {totalCurrentBeams}
            </strong>
          </span>
          <span>
            Po zapotrzebowaniu:{' '}
            <strong className={cn(totalAfterDemand < 0 && 'text-red-600')}>
              {totalAfterDemand}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PvcStockTable;
