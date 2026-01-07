/**
 * Strona zarządzania zamówieniami OKUC
 *
 * Moduł: DualStock (Okucia PVC + ALU)
 * Funkcje:
 * - Lista zamówień z client-side filtering
 * - Dodawanie nowych zamówień
 * - Edycja zamówień (tylko draft/pending_approval)
 * - Wysyłanie zamówień do dostawcy (approved → sent)
 *
 * Filtry:
 * - Status (draft/pending_approval/approved/sent/confirmed/in_transit/received/cancelled/wszystkie)
 * - Typ koszyka (typical_standard/typical_gabarat/atypical/wszystkie)
 */

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Filter, ShoppingCart, ArrowLeft } from 'lucide-react';
import { OrdersTable } from '@/features/okuc/components/OrdersTable';
import { OrderForm } from '@/features/okuc/components/OrderForm';
import {
  useOkucOrders,
  useCreateOkucOrder,
  useUpdateOkucOrder,
  useSendOkucOrder,
} from '@/features/okuc/hooks';
import type { OkucOrder, OkucOrderStatus, BasketType } from '@/types/okuc';

export default function OkucOrdersPage() {
  // === DATA FETCHING ===
  const { data: orders = [], isLoading, error } = useOkucOrders();

  // === STATE ===
  const [selectedOrder, setSelectedOrder] = useState<OkucOrder | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);

  // Filtry
  const [filterStatus, setFilterStatus] = useState<OkucOrderStatus | 'all'>('all');
  const [filterBasketType, setFilterBasketType] = useState<BasketType | 'all'>('all');

  // === MUTATIONS ===
  const createMutation = useCreateOkucOrder({
    onSuccess: () => {
      setFormMode(null);
      setSelectedOrder(null);
    },
  });

  const updateMutation = useUpdateOkucOrder({
    onSuccess: () => {
      setFormMode(null);
      setSelectedOrder(null);
    },
  });

  const sendMutation = useSendOkucOrder({
    onSuccess: () => {
      // Toast wyświetlany przez hook
    },
  });

  // === CLIENT-SIDE FILTERING ===
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((o) => o.status === filterStatus);
    }

    // Basket type filter
    if (filterBasketType !== 'all') {
      result = result.filter((o) => o.basketType === filterBasketType);
    }

    return result;
  }, [orders, filterStatus, filterBasketType]);

  // === EVENT HANDLERS ===
  const handleAddNew = () => {
    setSelectedOrder(null);
    setFormMode('create');
  };

  const handleView = (orderId: number) => {
    // Dla widoku - można to zrobić przez routing lub modal
    // Na razie przekierowujemy do edycji (można rozbudować później)
    handleEdit(orderId);
  };

  const handleEdit = (orderId: number) => {
    const order = orders?.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setFormMode('edit');
    }
  };

  const handleSend = (orderId: number) => {
    sendMutation.mutate(orderId);
  };

  const handleFormSubmit = (data: any) => {
    if (formMode === 'edit' && selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data });
    } else if (formMode === 'create') {
      createMutation.mutate(data);
    }
  };

  const handleFormCancel = () => {
    setFormMode(null);
    setSelectedOrder(null);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterBasketType('all');
  };

  // Sprawdź czy są aktywne filtry
  const hasActiveFilters = filterStatus !== 'all' || filterBasketType !== 'all';

  // === RENDER ===

  // Jeśli jest tryb formularza - pokaż formularz zamiast listy
  if (formMode) {
    return (
      <div className="flex flex-col h-full">
        <Header title={formMode === 'create' ? 'Nowe zamówienie' : 'Edycja zamówienia'} />

        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-6">
            <Breadcrumb
              items={[
                { label: 'Magazyn', href: '/magazyn' },
                { label: 'OKUC', href: '/magazyn/okuc' },
                { label: 'Zamówienia', href: '/magazyn/okuc/zamowienia' },
                {
                  label: formMode === 'create' ? 'Nowe' : 'Edycja',
                  icon: <ShoppingCart className="h-4 w-4" />
                },
              ]}
            />
            <Button variant="ghost" onClick={handleFormCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do listy
            </Button>
          </div>

          {/* Formularz */}
          <div className="bg-card border rounded-lg p-6">
            <OrderForm
              mode={formMode}
              order={selectedOrder || undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      </div>
    );
  }

  // Standardowy widok listy
  return (
    <div className="flex flex-col h-full">
      <Header title="Zamówienia okuć" />

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn' },
              { label: 'OKUC', href: '/magazyn/okuc' },
              { label: 'Zamówienia', icon: <ShoppingCart className="h-4 w-4" /> },
            ]}
          />
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zamówienie
          </Button>
        </div>

        {/* Filtry */}
        <div className="bg-card border rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filtry</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="filterStatus">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as OkucOrderStatus | 'all')}
              >
                <SelectTrigger id="filterStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="draft">Projekt</SelectItem>
                  <SelectItem value="pending_approval">Oczekuje zatwierdzenia</SelectItem>
                  <SelectItem value="approved">Zatwierdzone</SelectItem>
                  <SelectItem value="sent">Wysłane</SelectItem>
                  <SelectItem value="confirmed">Potwierdzone</SelectItem>
                  <SelectItem value="in_transit">W transporcie</SelectItem>
                  <SelectItem value="received">Odebrane</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Typ koszyka */}
            <div className="space-y-2">
              <Label htmlFor="filterBasketType">Typ koszyka</Label>
              <Select
                value={filterBasketType}
                onValueChange={(v) => setFilterBasketType(v as BasketType | 'all')}
              >
                <SelectTrigger id="filterBasketType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="typical_standard">Typowy Standard</SelectItem>
                  <SelectItem value="typical_gabarat">Typowy Gabaryty</SelectItem>
                  <SelectItem value="atypical">Atypowy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats + Wyczyść filtry */}
          <div className="pt-2 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Znaleziono: <strong>{filteredOrders.length}</strong> zamówień (z{' '}
              <strong>{orders.length}</strong> wszystkich)
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Wyczyść filtry
              </Button>
            )}
          </div>
        </div>

        {/* Loading state - Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              <strong>Błąd:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {/* Empty state - PRZED filtrowaniem */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak zamówień</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nie znaleziono żadnych zamówień w systemie.
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwsze zamówienie
            </Button>
          </div>
        )}

        {/* Empty state - PO filtrowaniu */}
        {!isLoading && !error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak wyników</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nie znaleziono zamówień dla wybranych filtrów.
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Wyczyść filtry
            </Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <OrdersTable
            orders={filteredOrders}
            onView={handleView}
            onEdit={handleEdit}
            onSend={handleSend}
            isSendingId={sendMutation.isPending ? selectedOrder?.id : undefined}
          />
        )}
      </div>
    </div>
  );
}
