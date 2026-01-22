'use client';

/**
 * ParsedItemEditor - Komponent do edycji pozycji przed zapisem
 *
 * Pozwala na:
 * - Zmianę flag (checkbox dla każdej flagi)
 * - Ręczne wyszukanie i przypisanie Order
 * - Usunięcie pozycji z listy
 */

import { useState, useCallback } from 'react';
import { Search, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ordersApi } from '@/lib/api/orders';
import {
  type ItemFlag,
  type ParseResultItem,
  ITEM_FLAG_LABELS,
  ALL_ITEM_FLAGS,
} from '../types';

// ========== Typy ==========

interface ParsedItemEditorProps {
  item: ParseResultItem;
  onSave: (updatedItem: ParseResultItem) => void;
  onCancel: () => void;
  onDelete: () => void;
}

interface OrderSearchResult {
  id: number;
  orderNumber: string;
  project: string | null;
  client: string | null;
}

// ========== Komponent główny ==========

export function ParsedItemEditor({
  item,
  onSave,
  onCancel,
  onDelete,
}: ParsedItemEditorProps) {
  // Stan lokalny edycji
  const [editedFlags, setEditedFlags] = useState<ItemFlag[]>(item.flags);
  const [editedOrder, setEditedOrder] = useState<ParseResultItem['matchedOrder']>(item.matchedOrder);
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Wyszukiwanie zleceń
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['orders', 'search', searchQuery],
    queryFn: () => ordersApi.search(searchQuery, false),
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  // Obsługa zmiany flag
  const handleFlagToggle = useCallback((flag: ItemFlag) => {
    setEditedFlags(prev => {
      if (prev.includes(flag)) {
        return prev.filter(f => f !== flag);
      }
      return [...prev, flag];
    });
  }, []);

  // Obsługa wyboru zlecenia
  const handleOrderSelect = useCallback((order: OrderSearchResult) => {
    setEditedOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      client: order.client,
      project: order.project,
      status: null,
    });
    setShowOrderSearch(false);
    setSearchQuery('');
  }, []);

  // Obsługa usunięcia przypisanego zlecenia
  const handleClearOrder = useCallback(() => {
    setEditedOrder(undefined);
  }, []);

  // Zapisz zmiany
  const handleSave = useCallback(() => {
    const updatedItem: ParseResultItem = {
      ...item,
      flags: editedFlags,
      matchedOrder: editedOrder,
      orderNotFound: !editedOrder,
    };
    onSave(updatedItem);
  }, [item, editedFlags, editedOrder, onSave]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edycja pozycji: {item.projectNumber}
            <Badge variant="outline" className="ml-2">
              Lp. {item.position}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sekcja: Flagi */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Flagi pozycji</Label>
            <div className="grid grid-cols-2 gap-3">
              {ALL_ITEM_FLAGS.map((flag) => (
                <div key={flag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`flag-${flag}`}
                    checked={editedFlags.includes(flag)}
                    onCheckedChange={() => handleFlagToggle(flag)}
                  />
                  <Label
                    htmlFor={`flag-${flag}`}
                    className="text-sm cursor-pointer"
                  >
                    {ITEM_FLAG_LABELS[flag]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sekcja: Przypisane zlecenie */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Przypisane zlecenie</Label>

            {editedOrder ? (
              <div className="flex items-center justify-between p-3 border rounded-md bg-green-50">
                <div>
                  <div className="font-medium">{editedOrder.orderNumber}</div>
                  {editedOrder.client && (
                    <div className="text-sm text-muted-foreground">
                      {editedOrder.client}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearOrder}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-yellow-50 text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Brak przypisanego zlecenia</span>
              </div>
            )}

            {/* Wyszukiwanie zlecenia */}
            <Popover open={showOrderSearch} onOpenChange={setShowOrderSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {editedOrder ? 'Zmień zlecenie...' : 'Wyszukaj zlecenie...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Wpisz numer projektu lub zlecenia..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {isSearching && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm">Szukam...</span>
                    </div>
                  )}
                  {!isSearching && searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nie znaleziono zleceń
                    </div>
                  )}
                  {searchQuery.length < 2 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Wpisz co najmniej 2 znaki...
                    </div>
                  )}
                  {searchResults && searchResults.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Znalezione zlecenia
                      </div>
                      {searchResults.slice(0, 10).map((order) => (
                        <button
                          key={order.id}
                          onClick={() => handleOrderSelect(order)}
                          className="w-full flex items-center px-2 py-2 hover:bg-accent cursor-pointer text-left"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              editedOrder?.id === order.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{order.orderNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {order.project && `Projekt: ${order.project}`}
                              {order.client && ` • ${order.client}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Oryginalne notatki (tylko do odczytu) */}
          {item.rawNotes && (
            <div className="space-y-2">
              <Label className="text-base font-medium text-muted-foreground">
                Oryginalne notatki z maila
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {item.rawNotes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Usuń pozycję
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
            <Button onClick={handleSave}>
              Zapisz zmiany
            </Button>
          </div>
        </DialogFooter>

        {/* Dialog potwierdzenia usunięcia */}
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Potwierdź usunięcie</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Czy na pewno chcesz usunąć pozycję <strong>{item.projectNumber}</strong> z listy?
              Ta operacja jest nieodwracalna.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Anuluj
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                Usuń
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default ParsedItemEditor;
