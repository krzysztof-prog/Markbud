'use client';

/**
 * Komponent paska filtrów dla zestawienia zleceń
 */

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/search-input';
import { Archive, Download, TrendingUp, Settings } from 'lucide-react';
import type { FilterState, GroupBy } from '../types';

// ================================
// Typy
// ================================

interface OrdersFilterBarProps {
  // Wyszukiwanie
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filtry główne
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;

  // Grupowanie
  groupBy: GroupBy;
  setGroupBy: (groupBy: GroupBy) => void;

  // Akcje
  onColumnSettingsClick: () => void;
  onStatsClick: () => void;
  onExportClick: () => void;
}

// ================================
// Komponent
// ================================

export const OrdersFilterBar: React.FC<OrdersFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
  onColumnSettingsClick,
  onStatsClick,
  onExportClick,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Wyszukiwanie */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj po numerze, kliencie..."
        containerClassName="w-64"
      />

      {/* Checkboxy filtrów */}
      <div className="flex items-center gap-4 border-l pl-4">
        {/* Filtr prywatne na 2 tygodnie - wyróżniony */}
        <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-md border border-purple-200">
          <Checkbox
            id="filter-private-upcoming"
            checked={filters.privateUpcoming2Weeks}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                privateUpcoming2Weeks: !!checked,
                // Resetuj clientFilter gdy włączamy ten filtr
                clientFilter: checked ? 'all' : prev.clientFilter
              }));
            }}
          />
          <Label htmlFor="filter-private-upcoming" className="text-sm cursor-pointer text-purple-700 font-medium">
            Prywatne na 2 tyg.
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-akrobud"
            checked={filters.clientFilter === 'akrobud'}
            disabled={filters.privateUpcoming2Weeks}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                clientFilter: checked ? 'akrobud' : 'all'
              }));
            }}
          />
          <Label htmlFor="filter-akrobud" className="text-sm cursor-pointer">
            Tylko Akrobud
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-private"
            checked={filters.clientFilter === 'private'}
            disabled={filters.privateUpcoming2Weeks}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                clientFilter: checked ? 'private' : 'all'
              }));
            }}
          />
          <Label htmlFor="filter-private" className="text-sm cursor-pointer">
            Tylko prywatne
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-hide-produced"
            checked={filters.hideProduced}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                hideProduced: !!checked
              }));
            }}
          />
          <Label htmlFor="filter-hide-produced" className="text-sm cursor-pointer">
            Ukryj wyprodukowane
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-only-missing"
            checked={filters.showOnlyMissing}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                showOnlyMissing: !!checked,
                // Jeśli włączamy "tylko brakujące", wyłącz "ukryj brakujące"
                hideMissing: checked ? false : prev.hideMissing
              }));
            }}
          />
          <Label htmlFor="filter-only-missing" className="text-sm cursor-pointer text-orange-600 font-medium">
            Tylko brakujące
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-hide-missing"
            checked={filters.hideMissing}
            disabled={filters.showOnlyMissing}
            onCheckedChange={(checked) => {
              setFilters(prev => ({
                ...prev,
                hideMissing: !!checked
              }));
            }}
          />
          <Label htmlFor="filter-hide-missing" className="text-sm cursor-pointer">
            Ukryj brakujące
          </Label>
        </div>
      </div>

      {/* Data od */}
      <div className="flex items-center gap-2 border-l pl-4">
        <Label htmlFor="date-from" className="text-sm text-muted-foreground whitespace-nowrap">
          Od daty:
        </Label>
        <Input
          id="date-from"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          className="w-36"
        />
      </div>

      {/* Grupowanie */}
      <div className="flex items-center gap-2 border-l pl-4">
        <span className="text-sm text-muted-foreground">Grupuj:</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="none">Brak</option>
          <option value="client">Klient</option>
          <option value="system">System</option>
          <option value="deadline-day">Termin (dzień)</option>
          <option value="deadline-week">Termin (tydzień)</option>
          <option value="deadline-month">Termin (miesiąc)</option>
        </select>
      </div>

      {/* Przyciski akcji */}
      <div className="flex gap-2 ml-auto">
        <Link href="/zestawienia/archiwum">
          <Button variant="outline">
            <Archive className="h-4 w-4 mr-2" />
            Archiwum
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={onColumnSettingsClick}
        >
          <Settings className="h-4 w-4 mr-2" />
          Kolumny
        </Button>
        <Button
          variant="outline"
          onClick={onStatsClick}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Statystyki
        </Button>
        <Button onClick={onExportClick}>
          <Download className="h-4 w-4 mr-2" />
          Eksport CSV
        </Button>
      </div>
    </div>
  );
};

export default OrdersFilterBar;
