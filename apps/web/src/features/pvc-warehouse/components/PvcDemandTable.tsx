/**
 * PvcDemandTable - tabela zapotrzebowania na profile PVC
 */

'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PvcDemandItem, SystemType } from '../types';
import { SYSTEM_LABELS } from '../types';

interface PvcDemandTableProps {
  demand: PvcDemandItem[];
  isLoading?: boolean;
}

/**
 * Pobiera aktywne systemy dla profilu
 */
function getActiveSystems(profile: PvcDemandItem['profile']): SystemType[] {
  const active: SystemType[] = [];
  if (profile.isLiving) active.push('living');
  if (profile.isBlok) active.push('blok');
  if (profile.isVlak) active.push('vlak');
  if (profile.isCt70) active.push('ct70');
  if (profile.isFocusing) active.push('focusing');
  return active;
}

export const PvcDemandTable: React.FC<PvcDemandTableProps> = ({
  demand,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-32">System</TableHead>
              <TableHead className="w-28">Kolor</TableHead>
              <TableHead className="w-28 text-right">Zapotrzebowanie</TableHead>
              <TableHead className="w-32">Zlecenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}>
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (demand.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-slate-500">
        Brak zapotrzebowania dla wybranych filtrów
      </div>
    );
  }

  const totalBeams = demand.reduce((acc, d) => acc + d.totalBeams, 0);

  return (
    <div className="rounded-md border">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-40">System</TableHead>
              <TableHead className="w-32">Kolor</TableHead>
              <TableHead className="w-32 text-right">Zapotrzebowanie</TableHead>
              <TableHead className="w-40">Zlecenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demand.map((item, idx) => {
              const activeSystems = getActiveSystems(item.profile);

              return (
                <TableRow key={`${item.profile.id}-${item.color?.id ?? 'no-color'}-${idx}`}>
                  {/* Numer profilu */}
                  <TableCell className="font-mono text-sm">
                    {item.profile.number}
                  </TableCell>

                  {/* Nazwa */}
                  <TableCell className="text-sm">{item.profile.name}</TableCell>

                  {/* Systemy */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {activeSystems.map((system) => (
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border flex-shrink-0"
                        style={{ backgroundColor: item.color?.hexColor || '#ccc' }}
                      />
                      <span className="font-mono text-xs">{item.color?.code || 'Brak'}</span>
                    </div>
                  </TableCell>

                  {/* Zapotrzebowanie */}
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {item.totalBeams} beli
                  </TableCell>

                  {/* Zlecenia */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.orders.slice(0, 3).map((order) => (
                        <Tooltip key={order.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-help"
                            >
                              {order.number}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{order.beams} beli</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {item.orders.length > 3 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs cursor-help">
                              +{item.orders.length - 3}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              {item.orders.slice(3).map((o) => (
                                <div key={o.id}>
                                  {o.number}: {o.beams} beli
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TooltipProvider>

      {/* Summary */}
      <div className="p-3 bg-slate-50 border-t text-sm text-slate-600 flex justify-between">
        <span>Razem: {demand.length} pozycji</span>
        <span>
          Łączne zapotrzebowanie: <strong>{totalBeams} beli</strong>
        </span>
      </div>
    </div>
  );
};

export default PvcDemandTable;
