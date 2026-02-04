/**
 * Hook do zarządzania filtrami zleceń z persystencją w localStorage
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { getTodayWarsaw } from '@/lib/date-utils';
import type {
  FilterState,
  Column,
  ColumnId,
  ExtendedOrder,
  SortDirection,
} from '../types';
import {
  DEFAULT_COLUMNS,
  STORAGE_KEY_COLUMNS_ORDER,
  STORAGE_KEY_COLUMNS_VISIBILITY,
  STORAGE_KEY_FILTERS,
} from '../types';
import {
  getAkrobudDeliveryDate,
  isAkrobudOrder,
  getColumnValue,
  findMissingOrderNumbers,
} from '../helpers/orderHelpers';

// ================================
// Domyślne wartości
// ================================

/**
 * Domyślna data "od" = 6 miesięcy wstecz
 */
export const getDefaultDateFrom = (): string => {
  const now = new Date();
  now.setMonth(now.getMonth() - 6);
  // Używamy getTodayWarsaw() jako bazę i odejmujemy 6 miesięcy
  // Ale dla prostoty używamy formatDateWarsaw z date-utils
  // Jednak tutaj potrzebujemy obliczyć 6 miesięcy wstecz od teraz,
  // więc używamy getTodayWarsaw() jako punkt wyjścia
  const todayStr = getTodayWarsaw();
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1 - 6, day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DEFAULT_FILTERS: FilterState = {
  clientFilter: 'all',
  hideProduced: true, // domyślnie ukryj wyprodukowane
  dateFrom: getDefaultDateFrom(),
  showOnlyMissing: false, // domyślnie pokazuj wszystkie zlecenia
  hideMissing: true, // domyślnie ukryj brakujące numery
  privateUpcoming2Weeks: false, // domyślnie wyłączony
};

// ================================
// Hook useOrderFilters
// ================================

interface UseOrderFiltersOptions {
  allOrders: ExtendedOrder[];
}

interface UseOrderFiltersReturn {
  // Filtry główne
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;

  // Wyszukiwanie
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;

  // Filtry kolumn
  columnFilters: Record<ColumnId, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<ColumnId, string>>>;
  debouncedColumnFilters: Record<ColumnId, string>;

  // Sortowanie
  sortField: ColumnId;
  setSortField: (field: ColumnId) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  handleSort: (field: ColumnId) => void;

  // Kolumny
  columns: Column[];
  setColumns: (columns: Column[]) => void;
  saveColumnOrder: (columns: Column[]) => void;
  saveColumnVisibility: (columns: Column[]) => void;
  toggleColumnVisibility: (columnId: ColumnId) => void;
  resetColumnOrder: () => void;
  visibleColumns: Column[];

  // Drag & Drop kolumn
  draggedColumn: number | null;
  setDraggedColumn: (index: number | null) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;

  // Dane wyjściowe
  filteredOrders: ExtendedOrder[];
  missingOrderNumbers: string[];
  hasActiveFilter: boolean;
}

export function useOrderFilters({ allOrders }: UseOrderFiltersOptions): UseOrderFiltersReturn {
  // Stan filtrów
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [columnFilters, setColumnFilters] = useState<Record<ColumnId, string>>({} as Record<ColumnId, string>);
  const debouncedColumnFilters = useDebounce(columnFilters, 300);

  // Stan sortowania - domyślnie malejąco (najwyższy nr zlecenia na górze)
  const [sortField, setSortField] = useState<ColumnId>('orderNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Stan kolumn
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);

  // ================================
  // Wczytywanie z localStorage
  // ================================

  // Wczytaj filtry z localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters) as FilterState;
        setFilters({
          clientFilter: parsed.clientFilter || 'all',
          hideProduced: typeof parsed.hideProduced === 'boolean' ? parsed.hideProduced : true,
          dateFrom: parsed.dateFrom || getDefaultDateFrom(),
          showOnlyMissing: typeof parsed.showOnlyMissing === 'boolean' ? parsed.showOnlyMissing : false,
          hideMissing: typeof parsed.hideMissing === 'boolean' ? parsed.hideMissing : false,
          privateUpcoming2Weeks: typeof parsed.privateUpcoming2Weeks === 'boolean' ? parsed.privateUpcoming2Weeks : false,
        });
      } catch (e) {
        console.error('Error loading filters:', e);
      }
    }
  }, []);

  // Zapisz filtry do localStorage gdy się zmienią
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
  }, [filters]);

  // Wczytaj kolejność i widoczność kolumn z localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLUMNS_ORDER);
    const savedVisibility = localStorage.getItem(STORAGE_KEY_COLUMNS_VISIBILITY);

    let visibility: Record<string, boolean> = {};
    if (savedVisibility) {
      try {
        visibility = JSON.parse(savedVisibility);
      } catch (e) {
        console.error('Error loading column visibility:', e);
      }
    }

    if (saved) {
      try {
        const savedOrder: ColumnId[] = JSON.parse(saved);
        const reorderedColumns = savedOrder
          .map(id => {
            const col = DEFAULT_COLUMNS.find(c => c.id === id);
            if (col) {
              return { ...col, visible: visibility[id] !== undefined ? visibility[id] : col.visible };
            }
            return null;
          })
          .filter(Boolean) as Column[];

        // Dodaj nowe kolumny, które mogły być dodane po zapisie
        const missingColumns = DEFAULT_COLUMNS.filter(
          col => !savedOrder.includes(col.id)
        ).map(col => ({ ...col, visible: visibility[col.id] !== undefined ? visibility[col.id] : col.visible }));

        setColumns([...reorderedColumns, ...missingColumns]);
      } catch (e) {
        console.error('Error loading column order:', e);
      }
    } else if (Object.keys(visibility).length > 0) {
      // Jeśli jest tylko widoczność bez kolejności
      setColumns(DEFAULT_COLUMNS.map(col => ({
        ...col,
        visible: visibility[col.id] !== undefined ? visibility[col.id] : col.visible
      })));
    }
  }, []);

  // ================================
  // Obsługa kolumn
  // ================================

  const saveColumnOrder = useCallback((newColumns: Column[]) => {
    const order = newColumns.map(col => col.id);
    localStorage.setItem(STORAGE_KEY_COLUMNS_ORDER, JSON.stringify(order));
    setColumns(newColumns);
  }, []);

  const saveColumnVisibility = useCallback((newColumns: Column[]) => {
    const visibility = newColumns.reduce((acc, col) => {
      acc[col.id] = col.visible !== false;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem(STORAGE_KEY_COLUMNS_VISIBILITY, JSON.stringify(visibility));
    setColumns(newColumns);
  }, []);

  const toggleColumnVisibility = useCallback((columnId: ColumnId) => {
    setColumns(prevColumns => {
      const newColumns = prevColumns.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      );
      const visibility = newColumns.reduce((acc, col) => {
        acc[col.id] = col.visible !== false;
        return acc;
      }, {} as Record<string, boolean>);
      localStorage.setItem(STORAGE_KEY_COLUMNS_VISIBILITY, JSON.stringify(visibility));
      return newColumns;
    });
  }, []);

  const resetColumnOrder = useCallback(() => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem(STORAGE_KEY_COLUMNS_ORDER);
    localStorage.removeItem(STORAGE_KEY_COLUMNS_VISIBILITY);
  }, []);

  // Widoczność kolumn zależna od filtra klienta
  const visibleColumns = useMemo(() => {
    return columns.filter(col => {
      // Ukryj kolumnę jeśli jest oznaczona jako niewidoczna
      if (col.visible === false) return false;

      // Kolumna "project" widoczna tylko dla filtra "akrobud"
      if (col.id === 'project' && filters.clientFilter !== 'akrobud') {
        return false;
      }

      // Dla filtra "Tylko Akrobud" - ukryj valuePln
      if (filters.clientFilter === 'akrobud') {
        if (col.id === 'valuePln') {
          return false;
        }
      }

      // Dla filtra "Tylko Prywatne" - ukryj valueEur
      if (filters.clientFilter === 'private') {
        if (col.id === 'valueEur') {
          return false;
        }
      }

      return true;
    });
  }, [columns, filters.clientFilter]);

  // ================================
  // Drag & Drop kolumn
  // ================================

  const handleDragStart = useCallback((index: number) => {
    setDraggedColumn(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const draggedItem = newColumns[draggedColumn];
      newColumns.splice(draggedColumn, 1);
      newColumns.splice(index, 0, draggedItem);
      setDraggedColumn(index);
      return newColumns;
    });
  }, [draggedColumn]);

  const handleDragEnd = useCallback(() => {
    if (draggedColumn !== null) {
      saveColumnOrder(columns);
    }
    setDraggedColumn(null);
  }, [draggedColumn, columns, saveColumnOrder]);

  // ================================
  // Sortowanie
  // ================================

  const handleSort = useCallback((field: ColumnId) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // ================================
  // Filtrowanie zleceń
  // ================================

  const filteredOrders = useMemo(() => {
    let result = allOrders;

    // Filtrowanie po checkboxach (Akrobud/Prywatne)
    if (filters.clientFilter === 'akrobud') {
      result = result.filter((order: ExtendedOrder) => isAkrobudOrder(order.client));
    } else if (filters.clientFilter === 'private') {
      result = result.filter((order: ExtendedOrder) => !isAkrobudOrder(order.client));
    }

    // Filtr: Pokaż zlecenia prywatne na najbliższe 2 tygodnie (+ zaległe)
    // Gdy włączony, pokazuje TYLKO zlecenia prywatne z deadline <= dziś + 14 dni LUB zaległe (deadline < dziś)
    // Pomija zlecenia "W realizacji" (in_progress)
    if (filters.privateUpcoming2Weeks) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoWeeksFromNow = new Date(today);
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      result = result.filter((order: ExtendedOrder) => {
        // Tylko prywatne (nie Akrobud)
        if (isAkrobudOrder(order.client)) return false;

        // Pomijaj zlecenia "W realizacji"
        if (order.status === 'in_progress') return false;

        // Musi mieć deadline
        if (!order.deadline) return false;

        const deadline = new Date(order.deadline);
        deadline.setHours(0, 0, 0, 0);

        // Pokaż jeśli deadline <= 2 tygodnie od dziś (włącznie z zaległymi)
        return deadline.getTime() <= twoWeeksFromNow.getTime();
      });
    }

    // Filtrowanie - ukryj wyprodukowane (archiwalne LUB completed)
    if (filters.hideProduced) {
      result = result.filter((order: ExtendedOrder) =>
        !order.archivedAt && order.status !== 'completed'
      );
    }

    // Filtrowanie po dacie "od"
    // Logika: pokaż jeśli KTÓRAKOLWIEK data (deadline LUB dostawa AKR) >= filtr
    // Zlecenia BEZ obu dat są zawsze pokazywane (bezpieczniej - nie wiemy kiedy mają termin)
    if (filters.dateFrom) {
      const dateFromTimestamp = new Date(filters.dateFrom).getTime();
      result = result.filter((order: ExtendedOrder) => {
        const akrobudDeliveryDate = getAkrobudDeliveryDate(order.deliveryOrders);
        const deadlineDate = order.deadline;

        // Jeśli brak obu dat - pokaż zlecenie (nie wiemy kiedy ma termin)
        if (!akrobudDeliveryDate && !deadlineDate) return true;

        // Pokaż jeśli KTÓRAKOLWIEK data >= filtr
        const akrOk = akrobudDeliveryDate && new Date(akrobudDeliveryDate).getTime() >= dateFromTimestamp;
        const deadlineOk = deadlineDate && new Date(deadlineDate).getTime() >= dateFromTimestamp;

        return akrOk || deadlineOk;
      });
    }

    // Filtrowanie globalne (debounced)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter((order: ExtendedOrder) =>
        order.orderNumber?.toLowerCase().includes(query) ||
        order.client?.toLowerCase().includes(query) ||
        order.project?.toLowerCase().includes(query)
      );
    }

    // Filtrowanie po kolumnach (debounced)
    const activeFilters = Object.entries(debouncedColumnFilters).filter(([_, value]) => value.trim() !== '');
    if (activeFilters.length > 0) {
      result = result.filter((order: ExtendedOrder) => {
        return activeFilters.every(([columnId, filterValue]) => {
          const cellValue = getColumnValue(order, columnId as ColumnId).toLowerCase();
          return cellValue.includes(filterValue.toLowerCase());
        });
      });
    }

    // Sortowanie - zamówienia completed zawsze na końcu listy
    result = [...result].sort((a: ExtendedOrder, b: ExtendedOrder) => {
      // Najpierw: completed na końcu
      const aCompleted = a.status === 'completed' ? 1 : 0;
      const bCompleted = b.status === 'completed' ? 1 : 0;
      if (aCompleted !== bCompleted) {
        return aCompleted - bCompleted; // completed (1) idą na koniec
      }

      // Następnie: normalne sortowanie
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortField) {
        case 'orderNumber':
          aValue = a.orderNumber || '';
          bValue = b.orderNumber || '';
          break;
        case 'client':
          aValue = a.client || '';
          bValue = b.client || '';
          break;
        case 'project':
          aValue = a.project || '';
          bValue = b.project || '';
          break;
        case 'system':
          aValue = a.system || '';
          bValue = b.system || '';
          break;
        case 'totalWindows':
          aValue = a.totalWindows || a._count?.windows || 0;
          bValue = b.totalWindows || b._count?.windows || 0;
          break;
        case 'valuePln':
          aValue = typeof a.valuePln === 'number' ? a.valuePln : 0;
          bValue = typeof b.valuePln === 'number' ? b.valuePln : 0;
          break;
        case 'valueEur':
          aValue = typeof a.valueEur === 'number' ? a.valueEur : 0;
          bValue = typeof b.valueEur === 'number' ? b.valueEur : 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'schucoStatus':
          aValue = a.orderStatus || '';
          bValue = b.orderStatus || '';
          break;
        case 'pvcDelivery':
          aValue = a.pvcDeliveryDate ? new Date(a.pvcDeliveryDate).getTime() : 0;
          bValue = b.pvcDeliveryDate ? new Date(b.pvcDeliveryDate).getTime() : 0;
          break;
        case 'glassDeliveryDate':
          aValue = a.glassDeliveryDate ? new Date(a.glassDeliveryDate).getTime() : 0;
          bValue = b.glassDeliveryDate ? new Date(b.glassDeliveryDate).getTime() : 0;
          break;
        case 'deadline':
          // Termin realizacji - data z CSV lub dostawy Akrobud
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0;
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case 'archived':
          aValue = a.archivedAt ? 1 : 0;
          bValue = b.archivedAt ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Specjalne sortowanie dla filtru "Prywatne na 2 tyg." - od najstarszej daty do najnowszej
    if (filters.privateUpcoming2Weeks) {
      result = [...result].sort((a: ExtendedOrder, b: ExtendedOrder) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
        return dateA - dateB; // rosnąco = od najstarszej (zaległe na górze)
      });
    }

    return result;
  }, [allOrders, debouncedSearchQuery, sortField, sortDirection, debouncedColumnFilters, filters]);

  // Znajdź brakujące numery zleceń (bazując na WSZYSTKICH zleceniach, nie filtrowanych)
  const missingOrderNumbers = useMemo(() => {
    return findMissingOrderNumbers(allOrders);
  }, [allOrders]);

  // Sprawdź czy jakikolwiek filtr jest aktywny
  const hasActiveFilter = filters.clientFilter !== 'all' || filters.hideProduced || filters.dateFrom !== '' || filters.showOnlyMissing || filters.privateUpcoming2Weeks;

  return {
    // Filtry główne
    filters,
    setFilters,

    // Wyszukiwanie
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Filtry kolumn
    columnFilters,
    setColumnFilters,
    debouncedColumnFilters,

    // Sortowanie
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    handleSort,

    // Kolumny
    columns,
    setColumns,
    saveColumnOrder,
    saveColumnVisibility,
    toggleColumnVisibility,
    resetColumnOrder,
    visibleColumns,

    // Drag & Drop
    draggedColumn,
    setDraggedColumn,
    handleDragStart,
    handleDragOver,
    handleDragEnd,

    // Dane wyjściowe
    filteredOrders,
    missingOrderNumbers,
    hasActiveFilter,
  };
}
