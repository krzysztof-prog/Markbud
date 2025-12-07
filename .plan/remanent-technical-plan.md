# Plan Techniczny - Implementacja Funkcji Remanent

## 📁 Struktura Plików

```
apps/
├── api/
│   └── src/
│       └── routes/
│           └── warehouse.ts ✅ (Już istnieje - tylko małe poprawki)
│
└── web/
    └── src/
        ├── app/
        │   └── magazyn/
        │       └── akrobud/
        │           ├── page.tsx (do modyfikacji - dodać przycisk)
        │           └── remanent/ ⭐ NOWE
        │               ├── page.tsx (główny formularz)
        │               └── historia/
        │                   └── page.tsx (historia + rollback)
        │
        ├── types/
        │   └── warehouse.ts (do rozszerzenia - nowe typy)
        │
        ├── features/
        │   └── warehouse/ ⭐ NOWE
        │       └── remanent/
        │           ├── api/
        │           │   └── remanentApi.ts
        │           ├── components/
        │           │   ├── RemanentForm.tsx
        │           │   ├── RemanentTable.tsx
        │           │   ├── RemanentConfirmModal.tsx
        │           │   ├── RemanentHistoryList.tsx
        │           │   ├── RemanentHistoryItem.tsx
        │           │   └── RollbackConfirmModal.tsx
        │           └── hooks/
        │               ├── useRemanent.ts
        │               └── useRemanentHistory.ts
        │
        └── lib/
            └── api.ts (do rozszerzenia - export nowych API)
```

---

## 🔧 Backend - Zmiany w API

### 1. Typy TypeScript dla Backend (już istnieją, sprawdzamy)

**Plik:** `apps/api/src/routes/warehouse.ts`

Endpoint już gotowy:
```typescript
// ✅ Już istnieje
POST /api/warehouse/monthly-update
{
  colorId: number;
  updates: Array<{
    profileId: number;
    actualStock: number;
  }>;
}

// ✅ Już istnieje
POST /api/warehouse/rollback-inventory
{
  colorId: number;
}

// ✅ Już istnieje
GET /api/warehouse/history/:colorId?limit=100
```

**Jedyna potrzebna zmiana:** Dodać endpoint GET /api/warehouse/history (bez colorId) dla wszystkich kolorów

```typescript
// ⭐ NOWY endpoint
fastify.get('/history', async (request) => {
  const history = await prisma.warehouseHistory.findMany({
    select: {
      id: true,
      profileId: true,
      colorId: true,
      calculatedStock: true,
      actualStock: true,
      difference: true,
      recordedAt: true,
      profile: {
        select: { id: true, number: true, name: true },
      },
      color: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { recordedAt: 'desc' },
    take: 100,
  });

  return history;
});
```

---

## 🎨 Frontend - Nowe Komponenty

### 1. Typy TypeScript dla Frontend

**Plik:** `apps/web/src/types/warehouse.ts`

```typescript
// ⭐ NOWE typy

/**
 * Wpis formularza remanent (przed wysłaniem)
 */
export interface RemanentFormEntry {
  profileId: number;
  profileNumber: string;
  calculatedStock: number; // Stan obliczony (currentStockBeams)
  actualStock: number | ''; // Stan rzeczywisty (INPUT value)
  difference: number; // actualStock - calculatedStock
}

/**
 * Request body dla monthly-update
 */
export interface RemanentSubmitData {
  colorId: number;
  updates: Array<{
    profileId: number;
    actualStock: number;
  }>;
}

/**
 * Response z monthly-update
 */
export interface RemanentSubmitResponse {
  updates: Array<{
    profileId: number;
    calculatedStock: number;
    actualStock: number;
    difference: number;
  }>;
  archivedOrdersCount: number;
}

/**
 * Wpis historii remanent (rozszerzenie WarehouseHistory)
 */
export interface RemanentHistoryEntry {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
  recordedAt: string;
  profile: {
    id: number;
    number: string;
    name: string;
  };
  color: {
    id: number;
    code: string;
    name: string;
  };
}

/**
 * Pogrupowana historia (po dacie + kolorze)
 */
export interface RemanentHistoryGroup {
  date: string; // ISO date string
  colorId: number;
  colorCode: string;
  colorName: string;
  entries: RemanentHistoryEntry[];
  totalProfiles: number;
  differencesCount: number;
  archivedOrdersCount?: number;
  canRollback: boolean; // true jeśli to najnowszy i <24h
}

/**
 * Response z rollback
 */
export interface RollbackResponse {
  success: boolean;
  message: string;
  rolledBackRecords: Array<{
    profileId: number;
    restoredStock: number;
    removedActualStock: number;
  }>;
  restoredOrdersCount: number;
}
```

---

### 2. API Client

**Plik:** `apps/web/src/features/warehouse/remanent/api/remanentApi.ts`

```typescript
import { fetchApi } from '@/lib/api-client';
import type {
  RemanentSubmitData,
  RemanentSubmitResponse,
  RemanentHistoryEntry,
  RollbackResponse,
} from '@/types/warehouse';

export const remanentApi = {
  /**
   * Wykonaj remanent (monthly-update)
   */
  submit: (data: RemanentSubmitData) =>
    fetchApi<RemanentSubmitResponse>('/api/warehouse/monthly-update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Pobierz historię remanentów dla koloru
   */
  getHistory: (colorId: number, limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(
      `/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`
    ),

  /**
   * Pobierz całą historię remanentów (wszystkie kolory)
   */
  getAllHistory: (limit?: number) =>
    fetchApi<RemanentHistoryEntry[]>(
      `/api/warehouse/history${limit ? `?limit=${limit}` : ''}`
    ),

  /**
   * Cofnij ostatni remanent
   */
  rollback: (colorId: number) =>
    fetchApi<RollbackResponse>('/api/warehouse/rollback-inventory', {
      method: 'POST',
      body: JSON.stringify({ colorId }),
    }),
};
```

**Plik:** `apps/web/src/lib/api.ts` (eksport)

```typescript
// Dodać na końcu pliku:
export { remanentApi } from '@/features/warehouse/remanent/api/remanentApi';
```

---

### 3. React Query Hooks

**Plik:** `apps/web/src/features/warehouse/remanent/hooks/useRemanent.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { remanentApi } from '../api/remanentApi';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import type { RemanentSubmitData } from '@/types/warehouse';

export function useRemanentSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RemanentSubmitData) => remanentApi.submit(data),
    onSuccess: (response, variables) => {
      showSuccessToast(
        'Remanent zapisany',
        `Zinwentaryzowano ${response.updates.length} profili. Zarchiwizowano ${response.archivedOrdersCount} zleceń.`
      );
      // Invalidate warehouse data
      queryClient.invalidateQueries({ queryKey: ['warehouse', variables.colorId] });
      // Invalidate history
      queryClient.invalidateQueries({ queryKey: ['remanent-history'] });
    },
    onError: (error) => {
      showErrorToast('Błąd zapisu remanentu', getErrorMessage(error));
    },
  });
}

export function useRollback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (colorId: number) => remanentApi.rollback(colorId),
    onSuccess: (response) => {
      showSuccessToast('Remanent cofnięty', response.message);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['remanent-history'] });
    },
    onError: (error) => {
      showErrorToast('Błąd cofania remanentu', getErrorMessage(error));
    },
  });
}
```

**Plik:** `apps/web/src/features/warehouse/remanent/hooks/useRemanentHistory.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { remanentApi } from '../api/remanentApi';
import type { RemanentHistoryEntry, RemanentHistoryGroup } from '@/types/warehouse';

/**
 * Hook do pobierania historii dla koloru
 */
export function useRemanentHistory(colorId: number | null, limit?: number) {
  return useQuery({
    queryKey: ['remanent-history', colorId, limit],
    queryFn: () => remanentApi.getHistory(colorId!, limit),
    enabled: !!colorId,
  });
}

/**
 * Hook do pobierania całej historii (wszystkie kolory)
 */
export function useAllRemanentHistory(limit?: number) {
  return useQuery({
    queryKey: ['remanent-history', 'all', limit],
    queryFn: () => remanentApi.getAllHistory(limit),
  });
}

/**
 * Helper do grupowania historii po dacie + kolorze
 */
export function groupRemanentHistory(entries: RemanentHistoryEntry[]): RemanentHistoryGroup[] {
  const groups = new Map<string, RemanentHistoryGroup>();

  entries.forEach((entry) => {
    // Grupuj po dacie (z dokładnością do minuty) i kolorze
    const dateKey = new Date(entry.recordedAt).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const key = `${dateKey}-${entry.colorId}`;

    if (!groups.has(key)) {
      groups.set(key, {
        date: entry.recordedAt,
        colorId: entry.colorId,
        colorCode: entry.color.code,
        colorName: entry.color.name,
        entries: [],
        totalProfiles: 0,
        differencesCount: 0,
        canRollback: false,
      });
    }

    const group = groups.get(key)!;
    group.entries.push(entry);
    group.totalProfiles++;
    if (entry.difference !== 0) {
      group.differencesCount++;
    }
  });

  // Convert to array and sort by date desc
  const groupsArray = Array.from(groups.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Mark most recent as rollbackable (if < 24h)
  if (groupsArray.length > 0) {
    const mostRecent = groupsArray[0];
    const hoursSince = (Date.now() - new Date(mostRecent.date).getTime()) / (1000 * 60 * 60);
    mostRecent.canRollback = hoursSince < 24;
  }

  return groupsArray;
}
```

---

### 4. Komponenty UI

#### Komponent 1: `RemanentTable.tsx`

**Plik:** `apps/web/src/features/warehouse/remanent/components/RemanentTable.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RemanentFormEntry } from '@/types/warehouse';
import type { WarehouseTableRow } from '@/types';

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Profil</th>
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
              <td className={cn('px-4 py-3 text-center font-semibold', getDifferenceColor(entry.difference))}>
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
```

#### Komponent 2: `RemanentConfirmModal.tsx`

**Plik:** `apps/web/src/features/warehouse/remanent/components/RemanentConfirmModal.tsx`

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { RemanentFormEntry } from '@/types/warehouse';

interface RemanentConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  colorCode: string;
  colorName: string;
  entries: RemanentFormEntry[];
  isPending: boolean;
}

export function RemanentConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  colorCode,
  colorName,
  entries,
  isPending,
}: RemanentConfirmModalProps) {
  const totalProfiles = entries.length;
  const differencesCount = entries.filter((e) => e.difference !== 0 && e.actualStock !== '').length;
  const shortages = entries.filter((e) => e.difference < 0).length;
  const surpluses = entries.filter((e) => e.difference > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Potwierdzenie remanentu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm">
            Czy na pewno chcesz zapisać remanent dla koloru <strong>{colorCode} - {colorName}</strong>?
          </p>

          <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
            <p>
              <strong>Podsumowanie:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>{totalProfiles} profili</li>
              <li>{differencesCount} różnic wykryto</li>
              {shortages > 0 && <li className="text-red-600">{shortages} niedoborów</li>}
              {surpluses > 0 && <li className="text-yellow-600">{surpluses} nadmiarów</li>}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Operacja spowoduje automatyczne archiwizowanie ukończonych zleceń dla tego koloru.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Zapisywanie...' : 'Potwierdź i zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Komponent 3: Strona główna `/magazyn/akrobud/remanent/page.tsx`

**Plik:** `apps/web/src/app/magazyn/akrobud/remanent/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, Warehouse, ClipboardCheck, History } from 'lucide-react';
import Link from 'next/link';
import { colorsApi, warehouseApi } from '@/lib/api';
import { useRemanentSubmit } from '@/features/warehouse/remanent/hooks/useRemanent';
import { RemanentTable } from '@/features/warehouse/remanent/components/RemanentTable';
import { RemanentConfirmModal } from '@/features/warehouse/remanent/components/RemanentConfirmModal';
import { cn } from '@/lib/utils';
import type { Color } from '@/types';
import type { RemanentFormEntry, RemanentSubmitData } from '@/types/warehouse';

export default function RemanentPage() {
  const router = useRouter();
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [entries, setEntries] = useState<RemanentFormEntry[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const submitMutation = useRemanentSubmit();

  // Fetch colors
  const { data: colors } = useQuery({
    queryKey: ['colors'],
    queryFn: () => colorsApi.getAll(),
  });

  // Fetch warehouse data for selected color
  const { data: warehouseData, isLoading: warehouseLoading } = useQuery({
    queryKey: ['warehouse', selectedColorId],
    queryFn: () => warehouseApi.getByColor(selectedColorId!),
    enabled: !!selectedColorId,
  });

  // Set first color as default
  if (colors?.length && !selectedColorId) {
    setSelectedColorId(colors[0].id);
  }

  const selectedColor = colors?.find((c: Color) => c.id === selectedColorId);
  const typicalColors = colors?.filter((c: Color) => c.type === 'typical') || [];
  const atypicalColors = colors?.filter((c: Color) => c.type === 'atypical') || [];

  const isFormValid = entries.every((e) => e.actualStock !== '');

  const handleSubmit = () => {
    if (!selectedColorId || !isFormValid) return;

    const data: RemanentSubmitData = {
      colorId: selectedColorId,
      updates: entries.map((e) => ({
        profileId: e.profileId,
        actualStock: Number(e.actualStock),
      })),
    };

    submitMutation.mutate(data, {
      onSuccess: () => {
        setConfirmModalOpen(false);
        // Redirect to history
        router.push('/magazyn/akrobud/remanent/historia');
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Remanent Magazynu">
        <div className="flex gap-2">
          <Link href="/magazyn/akrobud/remanent/historia">
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Historia
            </Button>
          </Link>
          <Link href="/magazyn/akrobud">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
          </Link>
        </div>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn', href: '/magazyn', icon: <Warehouse className="h-4 w-4" /> },
            { label: 'Akrobud', href: '/magazyn/akrobud' },
            { label: 'Remanent' },
          ]}
        />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar with colors */}
        <div className="w-full md:w-64 border-r border-b md:border-b-0 bg-white overflow-y-auto max-h-48 md:max-h-full">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3">
              Kolory
            </h3>

            {/* Typical */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Typowe</p>
              <div className="space-y-1">
                {typicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      setEntries([]); // Reset entries on color change
                    }}
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

            {/* Atypical */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Nietypowe</p>
              <div className="space-y-1">
                {atypicalColors.map((color: Color) => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      setEntries([]);
                    }}
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
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {selectedColor && warehouseData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded border-2"
                    style={{ backgroundColor: selectedColor.hexColor || '#ccc' }}
                  />
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedColor.code} - {selectedColor.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Stan na: {new Date().toLocaleString('pl-PL')}
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <RemanentTable
                    warehouseData={warehouseData}
                    entries={entries}
                    onChange={setEntries}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 mt-6">
                <Link href="/magazyn/akrobud">
                  <Button variant="outline">Anuluj</Button>
                </Link>
                <Button
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={!isFormValid}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Zapisz remanent
                </Button>
              </div>
            </>
          )}

          {!warehouseData && !warehouseLoading && (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="Wybierz kolor"
              description="Wybierz kolor z menu po lewej stronie, aby rozpocząć inwentaryzację."
            />
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedColor && (
        <RemanentConfirmModal
          open={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          onConfirm={handleSubmit}
          colorCode={selectedColor.code}
          colorName={selectedColor.name}
          entries={entries}
          isPending={submitMutation.isPending}
        />
      )}
    </div>
  );
}
```

---

## 📋 Podsumowanie - Lista Zadań

### Backend (Minimalne zmiany)
- [ ] Dodać endpoint `GET /api/warehouse/history` (bez colorId)

### Frontend (Główna praca)
1. **Typy** (1 plik)
   - [ ] Rozszerzyć `apps/web/src/types/warehouse.ts`

2. **API Client** (1 plik)
   - [ ] Stworzyć `apps/web/src/features/warehouse/remanent/api/remanentApi.ts`
   - [ ] Dodać export w `apps/web/src/lib/api.ts`

3. **Hooks** (2 pliki)
   - [ ] `useRemanent.ts` - submit, rollback
   - [ ] `useRemanentHistory.ts` - fetch history, grouping

4. **Komponenty** (6 plików)
   - [ ] `RemanentTable.tsx` - tabela z inputami
   - [ ] `RemanentConfirmModal.tsx` - modal potwierdzenia
   - [ ] `RemanentHistoryList.tsx` - lista historii
   - [ ] `RemanentHistoryItem.tsx` - pojedynczy wpis
   - [ ] `RollbackConfirmModal.tsx` - modal cofnięcia

5. **Strony** (3 pliki)
   - [ ] `/magazyn/akrobud/remanent/page.tsx` - główny formularz
   - [ ] `/magazyn/akrobud/remanent/historia/page.tsx` - historia
   - [ ] `/magazyn/akrobud/page.tsx` - dodać przycisk "Wykonaj remanent"

---

**Estymacja czasu:** 4-6 godzin
**Priorytet:** 🟠 ŚREDNI (miesięczna operacja)

**Status:** ✅ Plan techniczny gotowy do implementacji
