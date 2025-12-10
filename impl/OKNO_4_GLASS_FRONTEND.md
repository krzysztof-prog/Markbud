# OKNO 4: Glass Tracking - Frontend

## ZALEŻNOŚCI

- **Okno 1** - migracja bazy (MUSI być ukończone)
- **Okno 3** - backend API (MUSI być ukończone lub w trakcie)

Przed rozpoczęciem upewnij się, że API endpoints działają:
```bash
curl http://localhost:3001/api/glass-orders
curl http://localhost:3001/api/glass-deliveries
```

---

## Cel

Zaimplementować frontend dla systemu śledzenia zamówień i dostaw szyb:
- Typy TypeScript
- API wrappers
- React Query hooks
- Komponenty UI
- Strony

---

## Struktura plików do utworzenia

```
apps/web/src/features/glass/
├── types.ts                              (NOWY)
├── api/
│   ├── glassOrdersApi.ts                 (NOWY)
│   └── glassDeliveriesApi.ts             (NOWY)
├── hooks/
│   ├── useGlassOrders.ts                 (NOWY)
│   └── useGlassDeliveries.ts             (NOWY)
└── components/
    ├── GlassOrdersTable.tsx              (NOWY)
    ├── GlassOrderDetailModal.tsx         (NOWY)
    ├── GlassOrderImportSection.tsx       (NOWY)
    ├── GlassDeliveriesTable.tsx          (NOWY)
    ├── GlassValidationPanel.tsx          (NOWY)
    └── GlassValidationBadge.tsx          (NOWY)

apps/web/src/app/
├── zamowienia-szyb/
│   └── page.tsx                          (NOWY)
└── dostawy-szyb/
    └── page.tsx                          (NOWY)
```

---

## Krok 1: Typy TypeScript

### Plik: `apps/web/src/features/glass/types.ts`

```typescript
export interface GlassOrder {
  id: number;
  glassOrderNumber: string;
  orderDate: string;
  supplier: string;
  orderedBy: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: 'ordered' | 'partially_delivered' | 'delivered' | 'cancelled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: GlassOrderItem[];
  validationResults?: GlassOrderValidation[];
  deliveryItems?: GlassDeliveryItem[];
  _count?: {
    items: number;
  };
}

export interface GlassOrderItem {
  id: number;
  glassOrderId: number;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  glassType: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  createdAt: string;
}

export interface GlassDelivery {
  id: number;
  rackNumber: string;
  customerOrderNumber: string;
  supplierOrderNumber: string | null;
  deliveryDate: string;
  fileImportId: number | null;
  createdAt: string;
  items?: GlassDeliveryItem[];
  _count?: {
    items: number;
  };
}

export interface GlassDeliveryItem {
  id: number;
  glassDeliveryId: number;
  glassOrderId: number | null;
  orderNumber: string;
  orderSuffix: string | null;
  position: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  glassComposition: string | null;
  serialNumber: string | null;
  clientCode: string | null;
  matchStatus: 'pending' | 'matched' | 'conflict' | 'unmatched';
  matchedItemId: number | null;
  createdAt: string;
}

export interface GlassOrderValidation {
  id: number;
  glassOrderId: number | null;
  orderNumber: string;
  validationType: string;
  severity: 'info' | 'warning' | 'error';
  expectedQuantity: number | null;
  orderedQuantity: number | null;
  deliveredQuantity: number | null;
  message: string;
  details: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  glassOrder?: GlassOrder;
}

export interface GlassOrderSummary {
  glassOrderNumber: string;
  totalOrdered: number;
  totalDelivered: number;
  orderBreakdown: Array<{
    orderNumber: string;
    ordered: number;
    delivered: number;
    status: 'pending' | 'partial' | 'complete' | 'excess';
  }>;
  issues: GlassOrderValidation[];
}

export interface ValidationDashboard {
  stats: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byType: Record<string, number>;
  };
  recentIssues: GlassOrderValidation[];
}

export interface GlassOrderFilters {
  status?: string;
  orderNumber?: string;
}

export interface GlassDeliveryFilters {
  dateFrom?: string;
  dateTo?: string;
}
```

---

## Krok 2: API Wrappers

### Plik: `apps/web/src/features/glass/api/glassOrdersApi.ts`

```typescript
import type {
  GlassOrder,
  GlassOrderFilters,
  GlassOrderSummary,
  GlassOrderValidation,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const glassOrdersApi = {
  getAll: (filters?: GlassOrderFilters): Promise<GlassOrder[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.orderNumber) params.append('orderNumber', filters.orderNumber);

    const query = params.toString();
    return fetchApi(`/api/glass-orders${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<GlassOrder> => {
    return fetchApi(`/api/glass-orders/${id}`);
  },

  importFromTxt: async (file: File): Promise<GlassOrder> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/glass-orders/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Import failed' }));
      throw new Error(error.error || 'Import failed');
    }

    return response.json();
  },

  delete: (id: number): Promise<void> => {
    return fetchApi(`/api/glass-orders/${id}`, { method: 'DELETE' });
  },

  getSummary: (id: number): Promise<GlassOrderSummary> => {
    return fetchApi(`/api/glass-orders/${id}/summary`);
  },

  getValidations: (id: number): Promise<GlassOrderValidation[]> => {
    return fetchApi(`/api/glass-orders/${id}/validations`);
  },

  updateStatus: (id: number, status: string): Promise<GlassOrder> => {
    return fetchApi(`/api/glass-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
```

### Plik: `apps/web/src/features/glass/api/glassDeliveriesApi.ts`

```typescript
import type { GlassDelivery, GlassDeliveryFilters, ValidationDashboard } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const glassDeliveriesApi = {
  getAll: (filters?: GlassDeliveryFilters): Promise<GlassDelivery[]> => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const query = params.toString();
    return fetchApi(`/api/glass-deliveries${query ? `?${query}` : ''}`);
  },

  getById: (id: number): Promise<GlassDelivery> => {
    return fetchApi(`/api/glass-deliveries/${id}`);
  },

  importFromCsv: async (file: File): Promise<GlassDelivery> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/glass-deliveries/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Import failed' }));
      throw new Error(error.error || 'Import failed');
    }

    return response.json();
  },

  delete: (id: number): Promise<void> => {
    return fetchApi(`/api/glass-deliveries/${id}`, { method: 'DELETE' });
  },
};

export const glassValidationsApi = {
  getDashboard: (): Promise<ValidationDashboard> => {
    return fetchApi('/api/glass-validations/dashboard');
  },

  getByOrderNumber: (orderNumber: string) => {
    return fetchApi(`/api/glass-validations/order/${orderNumber}`);
  },

  resolve: (id: number, resolvedBy: string, notes?: string) => {
    return fetchApi(`/api/glass-validations/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolvedBy, notes }),
    });
  },
};
```

---

## Krok 3: React Query Hooks

### Plik: `apps/web/src/features/glass/hooks/useGlassOrders.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { glassOrdersApi } from '../api/glassOrdersApi';
import type { GlassOrderFilters } from '../types';

export const glassOrderKeys = {
  all: ['glass-orders'] as const,
  lists: () => [...glassOrderKeys.all, 'list'] as const,
  list: (filters?: GlassOrderFilters) => [...glassOrderKeys.lists(), filters] as const,
  details: () => [...glassOrderKeys.all, 'detail'] as const,
  detail: (id: number) => [...glassOrderKeys.details(), id] as const,
  summary: (id: number) => [...glassOrderKeys.detail(id), 'summary'] as const,
  validations: (id: number) => [...glassOrderKeys.detail(id), 'validations'] as const,
};

export function useGlassOrders(filters?: GlassOrderFilters) {
  return useQuery({
    queryKey: glassOrderKeys.list(filters),
    queryFn: () => glassOrdersApi.getAll(filters),
  });
}

export function useGlassOrderDetail(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.detail(id),
    queryFn: () => glassOrdersApi.getById(id),
    enabled: id > 0,
  });
}

export function useGlassOrderSummary(id: number) {
  return useQuery({
    queryKey: glassOrderKeys.summary(id),
    queryFn: () => glassOrdersApi.getSummary(id),
    enabled: id > 0,
  });
}

export function useImportGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => glassOrdersApi.importFromTxt(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      toast.success(`Zamówienie ${data.glassOrderNumber} zaimportowane`);
    },
    onError: (error: Error) => {
      toast.error(`Błąd importu: ${error.message}`);
    },
  });
}

export function useDeleteGlassOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glassOrderKeys.lists() });
      toast.success('Zamówienie usunięte');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}
```

### Plik: `apps/web/src/features/glass/hooks/useGlassDeliveries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { glassDeliveriesApi, glassValidationsApi } from '../api/glassDeliveriesApi';
import type { GlassDeliveryFilters } from '../types';

export const glassDeliveryKeys = {
  all: ['glass-deliveries'] as const,
  lists: () => [...glassDeliveryKeys.all, 'list'] as const,
  list: (filters?: GlassDeliveryFilters) => [...glassDeliveryKeys.lists(), filters] as const,
  details: () => [...glassDeliveryKeys.all, 'detail'] as const,
  detail: (id: number) => [...glassDeliveryKeys.details(), id] as const,
};

export const validationKeys = {
  all: ['glass-validations'] as const,
  dashboard: () => [...validationKeys.all, 'dashboard'] as const,
  byOrder: (orderNumber: string) => [...validationKeys.all, 'order', orderNumber] as const,
};

export function useGlassDeliveries(filters?: GlassDeliveryFilters) {
  return useQuery({
    queryKey: glassDeliveryKeys.list(filters),
    queryFn: () => glassDeliveriesApi.getAll(filters),
  });
}

export function useGlassDeliveryDetail(id: number) {
  return useQuery({
    queryKey: glassDeliveryKeys.detail(id),
    queryFn: () => glassDeliveriesApi.getById(id),
    enabled: id > 0,
  });
}

export function useImportGlassDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => glassDeliveriesApi.importFromCsv(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: glassDeliveryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: validationKeys.dashboard() });
      toast.success(`Dostawa ${data.rackNumber} zaimportowana`);
    },
    onError: (error: Error) => {
      toast.error(`Błąd importu: ${error.message}`);
    },
  });
}

export function useDeleteGlassDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => glassDeliveriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: glassDeliveryKeys.lists() });
      toast.success('Dostawa usunięta');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

export function useValidationDashboard() {
  return useQuery({
    queryKey: validationKeys.dashboard(),
    queryFn: () => glassValidationsApi.getDashboard(),
  });
}
```

---

## Krok 4: Komponenty

### Plik: `apps/web/src/features/glass/components/GlassValidationBadge.tsx`

```tsx
import { cn } from '@/lib/utils';

interface GlassValidationBadgeProps {
  severity: 'info' | 'warning' | 'error';
  count?: number;
  className?: string;
}

export function GlassValidationBadge({
  severity,
  count,
  className,
}: GlassValidationBadgeProps) {
  const colors = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        colors[severity],
        className
      )}
    >
      <span>{icons[severity]}</span>
      {count !== undefined && <span>{count}</span>}
    </span>
  );
}
```

### Plik: `apps/web/src/features/glass/components/GlassOrderImportSection.tsx`

```tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useImportGlassOrder } from '../hooks/useGlassOrders';

export function GlassOrderImportSection() {
  const [files, setFiles] = useState<File[]>([]);
  const importMutation = useImportGlassOrder();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    for (const file of files) {
      try {
        await importMutation.mutateAsync(file);
      } catch (error) {
        // Error handled in mutation
      }
    }
    setFiles([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import zamówień szyb (TXT)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          {isDragActive ? (
            <p>Upuść pliki tutaj...</p>
          ) : (
            <p>Przeciągnij pliki TXT lub kliknij, aby wybrać</p>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Pliki do importu ({files.length}):</p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="w-full mt-2"
            >
              {importMutation.isPending ? 'Importowanie...' : `Importuj ${files.length} plik(ów)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Plik: `apps/web/src/features/glass/components/GlassOrdersTable.tsx`

```tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Eye, Trash2, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useGlassOrders, useDeleteGlassOrder } from '../hooks/useGlassOrders';
import { GlassOrderDetailModal } from './GlassOrderDetailModal';
import { GlassValidationBadge } from './GlassValidationBadge';
import type { GlassOrder } from '../types';

const statusLabels: Record<string, string> = {
  ordered: 'Zamówione',
  partially_delivered: 'Częściowo dostarczone',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
};

const statusColors: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-800',
  partially_delivered: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export function GlassOrdersTable() {
  const { data: orders, isLoading, error } = useGlassOrders();
  const deleteMutation = useDeleteGlassOrder();
  const [selectedOrder, setSelectedOrder] = useState<GlassOrder | null>(null);

  if (isLoading) {
    return <div className="p-4 text-center">Ładowanie...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Błąd: {error.message}</div>;
  }

  if (!orders?.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        Brak zamówień szyb. Zaimportuj pliki TXT, aby rozpocząć.
      </div>
    );
  }

  const handleDelete = (id: number) => {
    if (confirm('Czy na pewno chcesz usunąć to zamówienie?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numer zamówienia</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Dostawca</TableHead>
              <TableHead className="text-center">Pozycje</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Walidacja</TableHead>
              <TableHead>Dostawa</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const issueCount = order.validationResults?.filter((v) => !v.resolved).length || 0;
              const hasErrors = order.validationResults?.some(
                (v) => v.severity === 'error' && !v.resolved
              );
              const hasWarnings = order.validationResults?.some(
                (v) => v.severity === 'warning' && !v.resolved
              );

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.glassOrderNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.orderDate), 'dd.MM.yyyy', { locale: pl })}
                  </TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell className="text-center">
                    {order._count?.items || order.items?.length || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {issueCount > 0 ? (
                      <GlassValidationBadge
                        severity={hasErrors ? 'error' : hasWarnings ? 'warning' : 'info'}
                        count={issueCount}
                      />
                    ) : (
                      <span className="text-green-600">✓</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.expectedDeliveryDate
                      ? format(new Date(order.expectedDeliveryDate), 'dd.MM.yyyy', { locale: pl })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Szczegóły
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <GlassOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
```

### Plik: `apps/web/src/features/glass/components/GlassOrderDetailModal.tsx`

```tsx
'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { X, Package, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlassOrderSummary } from '../hooks/useGlassOrders';
import { GlassValidationBadge } from './GlassValidationBadge';
import type { GlassOrder } from '../types';

interface GlassOrderDetailModalProps {
  order: GlassOrder;
  onClose: () => void;
}

export function GlassOrderDetailModal({ order, onClose }: GlassOrderDetailModalProps) {
  const { data: summary, isLoading } = useGlassOrderSummary(order.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Zamówienie: {order.glassOrderNumber}</span>
            <Badge>{order.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div>
            <p className="text-sm text-gray-500">Data zamówienia</p>
            <p className="font-medium">
              {format(new Date(order.orderDate), 'dd.MM.yyyy', { locale: pl })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dostawca</p>
            <p className="font-medium">{order.supplier}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Zamawiający</p>
            <p className="font-medium">{order.orderedBy || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Oczekiwana dostawa</p>
            <p className="font-medium">
              {order.expectedDeliveryDate
                ? format(new Date(order.expectedDeliveryDate), 'dd.MM.yyyy', { locale: pl })
                : '-'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 py-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Zamówione</p>
                <p className="text-2xl font-bold">{summary.totalOrdered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Dostarczone</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalDelivered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Brakuje</p>
                <p className="text-2xl font-bold text-orange-600">
                  {Math.max(0, summary.totalOrdered - summary.totalDelivered)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Issues */}
        {summary?.issues && summary.issues.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Problemy ({summary.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {summary.issues.map((issue) => (
                  <li key={issue.id} className="flex items-center gap-2">
                    <GlassValidationBadge severity={issue.severity} />
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Order Breakdown */}
        {summary?.orderBreakdown && summary.orderBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Rozbicie na zlecenia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zlecenie</TableHead>
                    <TableHead className="text-center">Zamówione</TableHead>
                    <TableHead className="text-center">Dostarczone</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.orderBreakdown.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{item.orderNumber}</TableCell>
                      <TableCell className="text-center">{item.ordered}</TableCell>
                      <TableCell className="text-center">{item.delivered}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.status === 'complete'
                              ? 'default'
                              : item.status === 'excess'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status === 'complete'
                            ? '✓ Kompletne'
                            : item.status === 'partial'
                            ? 'Częściowe'
                            : item.status === 'excess'
                            ? 'Nadmiar'
                            : 'Oczekuje'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        {order.items && order.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pozycje zamówienia ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zlecenie</TableHead>
                      <TableHead>Typ szyby</TableHead>
                      <TableHead className="text-center">Wymiary</TableHead>
                      <TableHead className="text-center">Ilość</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">
                          {item.orderNumber}
                          {item.orderSuffix && `-${item.orderSuffix}`}
                        </TableCell>
                        <TableCell className="text-sm">{item.glassType}</TableCell>
                        <TableCell className="text-center">
                          {item.widthMm} × {item.heightMm}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Plik: `apps/web/src/features/glass/components/GlassDeliveriesTable.tsx`

```tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Eye, Trash2, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useGlassDeliveries, useDeleteGlassDelivery } from '../hooks/useGlassDeliveries';
import type { GlassDelivery } from '../types';

export function GlassDeliveriesTable() {
  const { data: deliveries, isLoading, error } = useGlassDeliveries();
  const deleteMutation = useDeleteGlassDelivery();

  if (isLoading) {
    return <div className="p-4 text-center">Ładowanie...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Błąd: {error.message}</div>;
  }

  if (!deliveries?.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        Brak dostaw szyb. Zaimportuj pliki CSV, aby rozpocząć.
      </div>
    );
  }

  const handleDelete = (id: number) => {
    if (confirm('Czy na pewno chcesz usunąć tę dostawę?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numer stojaka</TableHead>
            <TableHead>Zamówienie klienta</TableHead>
            <TableHead>Data dostawy</TableHead>
            <TableHead className="text-center">Pozycje</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium">{delivery.rackNumber}</TableCell>
              <TableCell>{delivery.customerOrderNumber}</TableCell>
              <TableCell>
                {format(new Date(delivery.deliveryDate), 'dd.MM.yyyy', { locale: pl })}
              </TableCell>
              <TableCell className="text-center">
                {delivery._count?.items || delivery.items?.length || 0}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDelete(delivery.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Plik: `apps/web/src/features/glass/components/GlassValidationPanel.tsx`

```tsx
'use client';

import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useValidationDashboard } from '../hooks/useGlassDeliveries';

export function GlassValidationPanel() {
  const { data: dashboard, isLoading } = useValidationDashboard();

  if (isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (!dashboard) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status walidacji</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold">{dashboard.stats.total}</p>
              <p className="text-xs text-gray-500">Wszystkie</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{dashboard.stats.errors}</p>
              <p className="text-xs text-gray-500">Błędy</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{dashboard.stats.warnings}</p>
              <p className="text-xs text-gray-500">Ostrzeżenia</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{dashboard.stats.info}</p>
              <p className="text-xs text-gray-500">Info</p>
            </div>
          </div>
        </div>

        {dashboard.recentIssues.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Ostatnie problemy:</p>
            <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {dashboard.recentIssues.slice(0, 5).map((issue) => (
                <li key={issue.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                  {issue.severity === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  <span className="flex-1">{issue.message}</span>
                  <span className="text-xs text-gray-400 font-mono">{issue.orderNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Krok 5: Strony

### Plik: `apps/web/src/app/zamowienia-szyb/page.tsx`

```tsx
import { GlassOrderImportSection } from '@/features/glass/components/GlassOrderImportSection';
import { GlassOrdersTable } from '@/features/glass/components/GlassOrdersTable';
import { GlassValidationPanel } from '@/features/glass/components/GlassValidationPanel';

export const metadata = {
  title: 'Zamówienia szyb | AKROBUD',
};

export default function GlassOrdersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Zamówienia szyb</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassOrderImportSection />
        </div>
        <div>
          <GlassValidationPanel />
        </div>
      </div>

      <GlassOrdersTable />
    </div>
  );
}
```

### Plik: `apps/web/src/app/dostawy-szyb/page.tsx`

```tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassDeliveriesTable } from '@/features/glass/components/GlassDeliveriesTable';
import { GlassValidationPanel } from '@/features/glass/components/GlassValidationPanel';
import { useImportGlassDelivery } from '@/features/glass/hooks/useGlassDeliveries';

export default function GlassDeliveriesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const importMutation = useImportGlassDelivery();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    for (const file of files) {
      try {
        await importMutation.mutateAsync(file);
      } catch (error) {
        // Error handled in mutation
      }
    }
    setFiles([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dostawy szyb</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import dostaw szyb (CSV)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                {isDragActive ? (
                  <p>Upuść pliki tutaj...</p>
                ) : (
                  <p>Przeciągnij pliki CSV lub kliknij, aby wybrać</p>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Pliki do importu ({files.length}):</p>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="w-full mt-2"
                  >
                    {importMutation.isPending ? 'Importowanie...' : `Importuj ${files.length} plik(ów)`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <GlassValidationPanel />
        </div>
      </div>

      <GlassDeliveriesTable />
    </div>
  );
}
```

---

## Krok 6: Instalacja zależności

```bash
cd apps/web
pnpm add react-dropzone
```

---

## Krok 7: Eksporty (opcjonalne)

### Plik: `apps/web/src/features/glass/index.ts`

```typescript
// Types
export * from './types';

// API
export * from './api/glassOrdersApi';
export * from './api/glassDeliveriesApi';

// Hooks
export * from './hooks/useGlassOrders';
export * from './hooks/useGlassDeliveries';

// Components
export { GlassOrdersTable } from './components/GlassOrdersTable';
export { GlassOrderDetailModal } from './components/GlassOrderDetailModal';
export { GlassOrderImportSection } from './components/GlassOrderImportSection';
export { GlassDeliveriesTable } from './components/GlassDeliveriesTable';
export { GlassValidationPanel } from './components/GlassValidationPanel';
export { GlassValidationBadge } from './components/GlassValidationBadge';
```

---

## Testowanie

### 1. Uruchom serwery

```bash
# Terminal 1 - Backend (musi działać!)
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web
```

### 2. Sprawdź strony

- http://localhost:3000/zamowienia-szyb
- http://localhost:3000/dostawy-szyb

### 3. Przetestuj funkcjonalności

- [ ] Strona zamówień szyb ładuje się
- [ ] Można przeciągnąć i upuścić plik TXT
- [ ] Import działa i pokazuje toast
- [ ] Tabela wyświetla zamówienia
- [ ] Modal szczegółów działa
- [ ] Panel walidacji pokazuje statystyki
- [ ] Strona dostaw szyb ładuje się
- [ ] Import CSV działa
- [ ] Tabela dostaw wyświetla dane

---

## Checklist

- [ ] Typy TypeScript utworzone
- [ ] API wrappers utworzone
- [ ] React Query hooks utworzone
- [ ] GlassValidationBadge utworzony
- [ ] GlassOrderImportSection utworzony
- [ ] GlassOrdersTable utworzony
- [ ] GlassOrderDetailModal utworzony
- [ ] GlassDeliveriesTable utworzony
- [ ] GlassValidationPanel utworzony
- [ ] Strona /zamowienia-szyb utworzona
- [ ] Strona /dostawy-szyb utworzona
- [ ] react-dropzone zainstalowany
- [ ] Wszystkie strony działają bez błędów

---

## Po zakończeniu

Potwierdź w głównym czacie:
```
Okno 4 zakończone. Glass Tracking Frontend zaimplementowany.
System zamówień i dostaw szyb jest kompletny.
```

---

## NIE MODYFIKUJ

- `apps/api/prisma/schema.prisma` (zrobione w Oknie 1)
- `apps/api/src/routes/warehouse.ts` (Okno 2)
- Żadnych plików backend (Okno 3)
- `apps/web/src/features/warehouse/` (Okno 2)
