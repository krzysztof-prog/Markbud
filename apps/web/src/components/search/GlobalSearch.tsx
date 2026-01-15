'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { Search, X, FileText, Calendar, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/lib/api';
import { formatGrosze, type Grosze } from '@/lib/money';
import { useDebounce } from '@/hooks/useDebounce';

// Lazy load OrderDetailModal - ciężki komponent (551 linii)
const OrderDetailModal = dynamic(
  () => import('@/features/orders/components/OrderDetailModal').then((mod) => ({ default: mod.OrderDetailModal })),
  { ssr: false }
);

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Typ dla wyników wyszukiwania (zgodny z OrderSearchResult z API)
interface SearchResult {
  id: number;
  orderNumber: string;
  status: string;
  client: string | null;
  project: string | null;
  system: string | null;
  deadline: string | null;
  valuePln: number | null;
  archivedAt: string | null;
  windows: Array<{ reference: string | null }>;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Używamy zoptymalizowanego endpointu /search - filtrowanie po stronie serwera
  // Jedno zapytanie zamiast dwóch, bez COUNT, tylko potrzebne pola
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['orders', 'search', debouncedSearchQuery],
    queryFn: () => ordersApi.search(debouncedSearchQuery, true), // includeArchived=true
    enabled: isOpen && debouncedSearchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

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
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      handleSelectOrder(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectOrder = (order: SearchResult) => {
    // Otwórz modal ze szczegółami zlecenia bezpośrednio (bez przekierowania)
    setSelectedOrderId(order.id);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrderId(null);
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
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Nie znaleziono zleceń pasujących do: &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((order, index) => (
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
                                : order.status === 'new'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {order.status === 'completed'
                              ? 'Zakończone'
                              : order.status === 'new'
                              ? 'Nowe'
                              : order.status === 'in_progress'
                              ? 'W produkcji'
                              : order.status === 'archived'
                              ? 'Zarchiwizowane'
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
                          {/* Pokaż pasujące referencje - już przefiltrowane przez serwer */}
                          {order.windows?.map((w, i) => (
                            w.reference && (
                              <div key={i} className="text-xs text-blue-600">
                                <span className="font-medium">Referencja:</span> {w.reference}
                              </div>
                            )
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
                            {formatGrosze(order.valuePln as Grosze)}
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
          {searchResults.length > 0 && (
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
              <div>{searchResults.length} wyników</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal ze szczegółami zlecenia */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseOrderModal();
          }}
        />
      )}
    </>
  );
}
