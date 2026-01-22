/**
 * PvcRwTable - tabela RW (zużycie wewnętrzne) dla profili PVC
 * Pokazuje profile ze zleceń ukończonych w wybranym miesiącu
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
import type { PvcRwItem, SystemType } from '../types';
import { SYSTEM_LABELS } from '../types';

interface PvcRwTableProps {
  rw: PvcRwItem[];
  isLoading?: boolean;
}

/**
 * Pobiera aktywne systemy dla profilu
 */
function getActiveSystems(profile: PvcRwItem['profile']): SystemType[] {
  const active: SystemType[] = [];
  if (profile.isLiving) active.push('living');
  if (profile.isBlok) active.push('blok');
  if (profile.isVlak) active.push('vlak');
  if (profile.isCt70) active.push('ct70');
  if (profile.isFocusing) active.push('focusing');
  return active;
}

export const PvcRwTable: React.FC<PvcRwTableProps> = ({ rw, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-32">System</TableHead>
              <TableHead className="w-28">Kolor</TableHead>
              <TableHead className="w-28 text-right">Zużycie</TableHead>
              <TableHead className="w-40">Zlecenia</TableHead>
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

  if (rw.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-slate-500">
        Brak zużycia wewnętrznego (RW) dla wybranych filtrów w tym okresie
      </div>
    );
  }

  const totalBeams = rw.reduce((acc, r) => acc + r.totalBeams, 0);

  return (
    <div className="rounded-md border">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Nr profilu</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead className="w-40">System</TableHead>
              <TableHead className="w-32">Kolor</TableHead>
              <TableHead className="w-32 text-right">Zużycie</TableHead>
              <TableHead className="w-40">Zlecenia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rw.map((item, idx) => {
              const activeSystems = getActiveSystems(item.profile);
              const colorKey = item.color?.id ?? `private-${item.privateColor?.id}`;

              return (
                <TableRow key={`${item.profile.id}-${colorKey}-${idx}`}>
                  {/* Numer profilu - pełny numer */}
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
                    {item.color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border flex-shrink-0"
                          style={{ backgroundColor: item.color.hexColor || '#ccc' }}
                        />
                        <span className="font-mono text-xs">{item.color.code}</span>
                      </div>
                    ) : item.privateColor ? (
                      <span className="text-xs text-slate-500 italic">
                        {item.privateColor.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>

                  {/* Zużycie */}
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
        <span>Razem: {rw.length} pozycji</span>
        <span>
          Łączne zużycie: <strong>{totalBeams} beli</strong>
        </span>
      </div>
    </div>
  );
};

export default PvcRwTable;