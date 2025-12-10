'use client';

import { useState, useEffect, useRef, KeyboardEvent, useMemo } from 'react';
import { Search, X, FileText, Calendar, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/lib/api';
import type { Order } from '@/types';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Pobierz wszystkie zlecenia (aktywne i zarchiwizowane) - używamy debounced query
  const { data: activeOrders = [], isLoading: loadingActive } = useQuery({
    queryKey: ['orders', 'search', 'active', debouncedSearchQuery],
    queryFn: () => ordersApi.getAll({ archived: 'false' }),
    enabled: isOpen && debouncedSearchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: archivedOrders = [], isLoading: loadingArchived } = useQuery({
    queryKey: ['orders', 'search', 'archived', debouncedSearchQuery],
    queryFn: () => ordersApi.getAll({ archived: 'true' }),
    enabled: isOpen && debouncedSearchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  const isLoading = loadingActive || loadingArchived;
  const allOrders = useMemo(() => [...activeOrders, ...archivedOrders], [activeOrders, archivedOrders]);

  // Filtruj wyniki na podstawie zapytania (client-side filtering)
  const filteredOrders = useMemo(() => {
    if (debouncedSearchQuery.length < 2) return [];

    const query = debouncedSearchQuery.toLowerCase();
    return allOrders.filter((order) => {
      // Podstawowe pola
      const matchesBasic =
        order.orderNumber.toLowerCase().includes(query) ||
        order.client?.toLowerCase().includes(query) ||
        order.project?.toLowerCase().includes(query) ||
        order.system?.toLowerCase().includes(query);

      // Wyszukiwanie po referencjach okien
      const matchesReference = order.windows?.some(
        (window) => window.reference?.toLowerCase().includes(query)
      );

      return matchesBasic || matchesReference;
    });
  }, [allOrders, debouncedSearchQuery]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOrders]);

  // Focus input and reset when opened/closed
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      // Reset search when closing
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredOrders.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredOrders[selectedIndex]) {
      e.preventDefault();
      handleSelectOrder(filteredOrders[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectOrder = (order: Order) => {
    // Otwórz szczegóły zlecenia z modal'em
    router.push(`/dostawy?order=${order.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Search Dialog */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-in slide-in-from-top-4 duration-200">
        <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden mx-4">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="h-5 w-5 text-slate-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Szukaj zlecenia po numerze, kliencie, projekcie, referencji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-0 h-auto"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.length < 2 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Wpisz co najmniej 2 znaki aby wyszukać zlecenia
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Wyszukiwanie...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Nie znaleziono zleceń pasujących do: "{searchQuery}"
              </div>
            ) : (
              <div className="divide-y">
                {filteredOrders.map((order, index) => (
                  <button
                    key={order.id}
                    ref={index === selectedIndex ? selectedItemRef : null}
                    onClick={() => handleSelectOrder(order)}
                    className={`w-full text-left p-4 transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-900">
                            {order.orderNumber}
                          </span>
                          {order.archivedAt && (
                            <Badge variant="secondary" className="text-xs">
                              Archiwum
                            </Badge>
                          )}
                          <Badge
                            variant={
                              order.status === 'completed'
                                ? 'default'
                                : order.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {order.status === 'completed'
                              ? 'Zakończone'
                              : order.status === 'pending'
                              ? 'Oczekujące'
                              : order.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600">
                          {order.client && (
                            <div className="truncate">
                              <span className="font-medium">Klient:</span> {order.client}
                            </div>
                          )}
                          {order.project && (
                            <div className="truncate">
                              <span className="font-medium">Projekt:</span> {order.project}
                            </div>
                          )}
                          {order.system && (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{order.system}</span>
                            </div>
                          )}
                          {/* Pokaż pasujące referencje */}
                          {order.windows
                            ?.filter((w) =>
                              w.reference?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                            )
                            .slice(0, 3)
                            .map((w, i) => (
                              <div key={i} className="text-xs text-blue-600">
                                <span className="font-medium">Referencja:</span> {w.reference}
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-sm flex-shrink-0">
                        {order.deadline && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(order.deadline).toLocaleDateString('pl-PL')}
                            </span>
                          </div>
                        )}
                        {order.valuePln && (
                          <div className="font-semibold text-slate-900">
                            {parseFloat(order.valuePln).toLocaleString('pl-PL', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            PLN
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with hints */}
          {filteredOrders.length > 0 && (
            <div className="p-3 border-t bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white rounded border">↑↓</kbd>
                  <span>Nawigacja</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white rounded border">Enter</kbd>
                  <span>Wybierz</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white rounded border">Esc</kbd>
                  <span>Zamknij</span>
                </div>
              </div>
              <div>{filteredOrders.length} wyników</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}