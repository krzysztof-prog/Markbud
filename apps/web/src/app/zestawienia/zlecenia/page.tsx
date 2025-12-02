'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ordersApi, settingsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { Order } from '@/types';
import {
  Download,
  FileText,
  Search,
  TrendingUp,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Filter,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import { OrderDetailModal } from '@/components/orders/order-detail-modal';

// Extended order type with additional properties from PDF import
interface ExtendedOrder extends Order {
  client?: string;
  project?: string;
  system?: string;
  totalWindows?: number;
  totalSashes?: number;
  glasses?: number;
  totalGlasses?: number;
  glassDelivery?: string;
  glassDeliveryDate?: string;
  invoiceNumber?: string;
  orderStatus?: string;
  pvcDelivery?: string;
  pvcDeliveryDate?: string;
  deadline?: string;
  archived?: boolean;
  windows?: Array<{
    reference?: string;
    profileType?: string;
    [key: string]: any;
  }>;
  _count?: {
    windows?: number;
    [key: string]: any;
  };
}

type ColumnId =
  | 'orderNumber'
  | 'client'
  | 'project'
  | 'system'
  | 'totalWindows'
  | 'totalSashes'
  | 'glasses'
  | 'glassDelivery'
  | 'valuePln'
  | 'valueEur'
  | 'orderStatus'
  | 'pvcDelivery'
  | 'deadline'
  | 'createdAt'
  | 'archived';

type GroupBy = 'none' | 'client' | 'system' | 'deadline-day' | 'deadline-week' | 'deadline-month';

type SortDirection = 'asc' | 'desc';

interface Column {
  id: ColumnId;
  label: string;
  sortable: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  visible?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'orderNumber', label: 'Nr zlecenia', sortable: false, align: 'left', visible: true },
  { id: 'client', label: 'Klient', sortable: false, align: 'left', visible: true },
  { id: 'project', label: 'Projekt', sortable: false, align: 'left', visible: true },
  { id: 'system', label: 'System', sortable: false, align: 'left', visible: true },
  { id: 'totalWindows', label: 'Okna', sortable: false, align: 'center', visible: true },
  { id: 'totalSashes', label: 'Skrzydeł', sortable: false, align: 'center', visible: true },
  { id: 'glasses', label: 'Szkleń', sortable: false, align: 'center', visible: true },
  { id: 'glassDelivery', label: 'Dostawa szyb', sortable: false, align: 'left', visible: true },
  { id: 'valuePln', label: 'Wartość PLN', sortable: false, align: 'right', visible: true },
  { id: 'valueEur', label: 'Wartość EUR', sortable: false, align: 'right', visible: true },
  { id: 'orderStatus', label: 'Status zamówienia', sortable: false, align: 'center', visible: true },
  { id: 'pvcDelivery', label: 'Dostawa PVC', sortable: false, align: 'left', visible: true },
  { id: 'deadline', label: 'Termin realizacji', sortable: false, align: 'left', visible: true },
  { id: 'archived', label: 'Status', sortable: false, align: 'center', visible: true },
];

const STORAGE_KEY = 'zestawienie-zlecen-columns-order';
const STORAGE_KEY_VISIBILITY = 'zestawienie-zlecen-columns-visibility';

export default function ZestawienieZlecenPage() {
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; number: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms debounce
  const [sortField, setSortField] = useState<ColumnId>('orderNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [columnFilters, setColumnFilters] = useState<Record<ColumnId, string>>({} as Record<ColumnId, string>);
  const debouncedColumnFilters = useDebounce(columnFilters, 300); // 300ms debounce for column filters
  const [editingCell, setEditingCell] = useState<{ orderId: number; field: 'valuePln' | 'valueEur' | 'deadline' | 'orderStatus' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const queryClient = useQueryClient();

  // Mutacja do aktualizacji zlecenia
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: number; data: any }) =>
      ordersApi.patch(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setEditingCell(null);
      setEditValue('');
    },
    onError: (error) => {
      console.error('Błąd podczas aktualizacji zlecenia:', error);
      alert('Nie udało się zaktualizować zlecenia');
    },
  });

  // Funkcje edycji komórek
  const startEdit = (orderId: number, field: 'valuePln' | 'valueEur' | 'deadline' | 'orderStatus', currentValue: string) => {
    setEditingCell({ orderId, field });

    // Dla daty, konwertuj do formatu YYYY-MM-DD jeśli jest to ISO string
    if (field === 'deadline' && currentValue) {
      try {
        const date = new Date(currentValue);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split('T')[0];
          setEditValue(formattedDate);
          return;
        }
      } catch (e) {
        // Jeśli błąd parsowania, użyj oryginalnej wartości
      }
    }

    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const { orderId, field } = editingCell;
    const data: any = {};

    // Mapuj field name do API field name
    if (field === 'valuePln') {
      data.valuePln = editValue || null;
    } else if (field === 'valueEur') {
      data.valueEur = editValue || null;
    } else if (field === 'deadline') {
      data.deadline = editValue || null;
    } else if (field === 'orderStatus') {
      data.status = editValue || null;
    }

    updateOrderMutation.mutate({ orderId, data });
  };

  // Wczytaj kolejność i widoczność kolumn z localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedVisibility = localStorage.getItem(STORAGE_KEY_VISIBILITY);

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

  // Zapisz kolejność kolumn do localStorage
  const saveColumnOrder = (newColumns: Column[]) => {
    const order = newColumns.map(col => col.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    setColumns(newColumns);
  };

  // Zapisz widoczność kolumn
  const saveColumnVisibility = (newColumns: Column[]) => {
    const visibility = newColumns.reduce((acc, col) => {
      acc[col.id] = col.visible !== false;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visibility));
    setColumns(newColumns);
  };

  // Przełącz widoczność kolumny
  const toggleColumnVisibility = (columnId: ColumnId) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    saveColumnVisibility(newColumns);
  };

  // Pobierz wszystkie zlecenia (w tym zarchiwizowane)
  const { data: activeOrders, isLoading: isLoadingActive } = useQuery({
    queryKey: ['orders', 'all-active'],
    queryFn: () => ordersApi.getAll({ archived: 'false' }),
  });

  const { data: archivedOrders, isLoading: isLoadingArchived } = useQuery({
    queryKey: ['orders', 'all-archived'],
    queryFn: () => ordersApi.getAll({ archived: 'true' }),
  });

  // Pobierz kurs EUR
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const eurRate = parseFloat(settings?.eurToPlnRate || '4.35');

  const isLoading = isLoadingActive || isLoadingArchived;

  // Połącz wszystkie zlecenia
  const allOrders = useMemo(() => {
    const active = activeOrders || [];
    const archived = archivedOrders || [];
    return [...active, ...archived];
  }, [activeOrders, archivedOrders]);

  // Funkcja pomocnicza do pobrania wartości kolumny
  const getColumnValue = (order: ExtendedOrder, columnId: ColumnId): string => {
    switch (columnId) {
      case 'orderNumber':
        return order.orderNumber || '';
      case 'client':
        return order.client || '';
      case 'project':
        return order.project || '';
      case 'system':
        return order.system || '';
      case 'totalWindows':
        return String(order.totalWindows || order._count?.windows || 0);
      case 'totalSashes':
        return String(order.totalSashes || 0);
      case 'glasses':
        return String(order.totalGlasses || 0);
      case 'glassDelivery':
        return order.glassDeliveryDate ? formatDate(order.glassDeliveryDate) : '';
      case 'valuePln':
        return order.valuePln || '';
      case 'valueEur':
        return order.valueEur || '';
      case 'orderStatus':
        return order.status || '';
      case 'pvcDelivery':
        return order.pvcDeliveryDate ? formatDate(order.pvcDeliveryDate) : '';
      case 'deadline':
        return order.deadline ? formatDate(order.deadline) : '';
      case 'archived':
        return order.archivedAt ? 'Archiwum' : 'Aktywne';
      default:
        return '';
    }
  };

  // Filtruj i sortuj zlecenia
  const filteredOrders = useMemo(() => {
    let result = allOrders;

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

    // Sortowanie
    result = [...result].sort((a: ExtendedOrder, b: ExtendedOrder) => {
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
          aValue = parseFloat(a.valuePln || '0');
          bValue = parseFloat(b.valuePln || '0');
          break;
        case 'valueEur':
          aValue = parseFloat(a.valueEur || '0');
          bValue = parseFloat(b.valueEur || '0');
          break;
        case 'orderStatus':
          aValue = a.orderStatus || '';
          bValue = b.orderStatus || '';
          break;
        case 'pvcDelivery':
          aValue = a.pvcDeliveryDate ? new Date(a.pvcDeliveryDate).getTime() : 0;
          bValue = b.pvcDeliveryDate ? new Date(b.pvcDeliveryDate).getTime() : 0;
          break;
        case 'glassDelivery':
          aValue = a.glassDeliveryDate ? new Date(a.glassDeliveryDate).getTime() : 0;
          bValue = b.glassDeliveryDate ? new Date(b.glassDeliveryDate).getTime() : 0;
          break;
        case 'deadline':
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

    return result;
  }, [allOrders, debouncedSearchQuery, sortField, sortDirection, debouncedColumnFilters]);

  // Oblicz statystyki dla wszystkich zleceń
  const stats = useMemo(() => {
    return allOrders.reduce(
      (acc: { totalOrders: number; totalValuePln: number; totalValueEur: number; totalWindows: number; totalSashes: number; totalGlasses: number }, order: ExtendedOrder) => {
        acc.totalOrders++;
        acc.totalValuePln += parseFloat(order.valuePln || '0');
        acc.totalValueEur += parseFloat(order.valueEur || '0');
        acc.totalWindows += order.totalWindows || order._count?.windows || 0;
        acc.totalSashes += order.totalSashes || 0;
        acc.totalGlasses += order.totalGlasses || 0;
        return acc;
      },
      { totalOrders: 0, totalValuePln: 0, totalValueEur: 0, totalWindows: 0, totalSashes: 0, totalGlasses: 0 }
    );
  }, [allOrders]);

  // Funkcje pomocnicze do grupowania
  const getWeekNumber = (date: Date): string => {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
  };

  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getDayKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getGroupKey = (order: ExtendedOrder, groupBy: GroupBy): string => {
    switch (groupBy) {
      case 'client':
        return order.client || 'Bez klienta';
      case 'system':
        if (order.windows && order.windows.length > 0) {
          const profileTypes = order.windows
            .map((w) => w.profileType)
            .filter((type): type is string => !!type)
            .filter((type, index, self) => self.indexOf(type) === index);
          return profileTypes.join(', ') || 'Bez systemu';
        }
        return 'Bez systemu';
      case 'deadline-day':
        return order.deadline ? getDayKey(new Date(order.deadline)) : 'Bez terminu';
      case 'deadline-week':
        return order.deadline ? getWeekNumber(new Date(order.deadline)) : 'Bez terminu';
      case 'deadline-month':
        return order.deadline ? getMonthKey(new Date(order.deadline)) : 'Bez terminu';
      default:
        return '';
    }
  };

  const getGroupLabel = (key: string, groupBy: GroupBy): string => {
    if (key === 'Bez klienta' || key === 'Bez systemu' || key === 'Bez terminu') {
      return key;
    }

    switch (groupBy) {
      case 'deadline-day':
        return formatDate(key);
      case 'deadline-week':
        const [year, week] = key.split('-W');
        return `Tydzień ${week}, ${year}`;
      case 'deadline-month':
        const [y, m] = key.split('-');
        const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                           'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
        return `${monthNames[parseInt(m) - 1]} ${y}`;
      default:
        return key;
    }
  };

  // Grupuj zlecenia
  const groupedOrders = useMemo(() => {
    if (groupBy === 'none') {
      return { 'all': filteredOrders };
    }

    const groups: Record<string, any[]> = {};
    filteredOrders.forEach((order: ExtendedOrder) => {
      const key = getGroupKey(order, groupBy);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });

    return groups;
  }, [filteredOrders, groupBy]);

  const handleSort = (field: ColumnId) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedColumn(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;

    const newColumns = [...columns];
    const draggedItem = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(index, 0, draggedItem);

    setColumns(newColumns);
    setDraggedColumn(index);
  };

  const handleDragEnd = () => {
    if (draggedColumn !== null) {
      saveColumnOrder(columns);
    }
    setDraggedColumn(null);
  };

  const resetColumnOrder = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem(STORAGE_KEY);
    setShowColumnSettings(false);
  };

  const exportToCSV = () => {
    const visibleColumns = columns.filter(col => col.visible !== false);
    const headers = visibleColumns.map(col => col.label);
    const rows = filteredOrders.map((order: ExtendedOrder) =>
      visibleColumns.map(col => getCellValue(order, col.id))
    );

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zestawienie_zlecen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getCellValue = (order: ExtendedOrder, columnId: ColumnId): string => {
    switch (columnId) {
      case 'orderNumber':
        return order.orderNumber || '';
      case 'client':
        return order.client || '';
      case 'project':
        // Pobierz wszystkie unikalne referencje z okien
        if (order.windows && order.windows.length > 0) {
          const references = order.windows
            .map((w) => w.reference)
            .filter((ref): ref is string => !!ref)
            .filter((ref, index, self) => self.indexOf(ref) === index);
          return references.join(', ');
        }
        return '';
      case 'system':
        // Pobierz wszystkie unikalne typy profili z okien
        if (order.windows && order.windows.length > 0) {
          const profileTypes = order.windows
            .map((w: { reference?: string; profileType?: string; [key: string]: any }) => w.profileType)
            .filter((type): type is string => !!type)
            .filter((type, index, self) => self.indexOf(type) === index);
          return profileTypes.join(', ');
        }
        return '';
      case 'totalWindows':
        return String(order.totalWindows || order._count?.windows || 0);
      case 'totalSashes':
        return String(order.totalSashes || 0);
      case 'glasses':
        return String(order.totalGlasses || 0);
      case 'valuePln':
        return order.valuePln ? formatCurrency(parseFloat(order.valuePln), 'PLN') : '';
      case 'valueEur':
        return order.valueEur ? formatCurrency(parseFloat(order.valueEur), 'EUR') : '';
      case 'orderStatus':
        return order.status || '';
      case 'pvcDelivery':
        return order.pvcDeliveryDate ? formatDate(order.pvcDeliveryDate) : '';
      case 'glassDelivery':
        return order.glassDeliveryDate ? formatDate(order.glassDeliveryDate) : '';
      case 'deadline':
        return order.deadline ? formatDate(order.deadline) : '';
      case 'archived':
        return order.archivedAt ? 'Archiwum' : 'Aktywne';
      default:
        return '';
    }
  };

  const SortHeader = ({ column }: { column: Column }) => {
    return <span>{column.label}</span>;
  };

  const renderCell = (order: ExtendedOrder, column: Column) => {
    const align = column.align || 'left';
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    const isEditing = editingCell?.orderId === order.id;

    switch (column.id) {
      case 'orderNumber':
        return (
          <td key={column.id} className={`px-4 py-3 font-mono font-medium ${alignClass}`}>
            <button
              onClick={() => setSelectedOrder({ id: order.id, number: order.orderNumber })}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {order.orderNumber}
            </button>
          </td>
        );

      case 'pvcDelivery':
      case 'glassDelivery':
        const dateValue = column.id === 'pvcDelivery'
          ? order.pvcDeliveryDate
          : order.glassDeliveryDate;
        return (
          <td key={column.id} className={`px-4 py-3 text-muted-foreground ${alignClass}`}>
            {dateValue ? formatDate(dateValue) : '-'}
          </td>
        );

      case 'deadline':
        // Edytowalne pole - Termin realizacji
        if (isEditing && editingCell?.field === 'deadline') {
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                  title="Zapisz"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Anuluj"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </td>
          );
        }
        return (
          <td
            key={column.id}
            className={`px-4 py-3 text-muted-foreground ${alignClass} group cursor-pointer hover:bg-slate-50`}
            onClick={() => startEdit(order.id, 'deadline', order.deadline || '')}
          >
            <div className="flex items-center gap-2 justify-between">
              <span>{order.deadline ? formatDate(order.deadline) : '-'}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </div>
          </td>
        );

      case 'valuePln':
      case 'valueEur':
        const value = column.id === 'valuePln' ? order.valuePln : order.valueEur;
        const currency = column.id === 'valuePln' ? 'PLN' : 'EUR';
        const fieldName = column.id as 'valuePln' | 'valueEur';

        // Edytowalne pole
        if (isEditing && editingCell?.field === fieldName) {
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="0.00"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                  title="Zapisz"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Anuluj"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </td>
          );
        }
        return (
          <td
            key={column.id}
            className={`px-4 py-3 ${alignClass} group cursor-pointer hover:bg-slate-50`}
            onClick={() => startEdit(order.id, fieldName, value || '')}
          >
            <div className="flex items-center gap-2 justify-between">
              <span>{value ? formatCurrency(parseFloat(value), currency) : '-'}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </div>
          </td>
        );

      case 'totalWindows':
        return (
          <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
            {order.totalWindows || order._count?.windows || 0}
          </td>
        );

      case 'totalSashes':
        return (
          <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
            {order.totalSashes || '-'}
          </td>
        );

      case 'glasses':
        return (
          <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
            {order.totalGlasses || '-'}
          </td>
        );

      case 'orderStatus':
        // Edytowalne pole - Status zamówienia
        if (isEditing && editingCell?.field === 'orderStatus') {
          return (
            <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Status"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                  title="Zapisz"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Anuluj"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </td>
          );
        }
        return (
          <td
            key={column.id}
            className={`px-4 py-3 text-muted-foreground ${alignClass} group cursor-pointer hover:bg-slate-50`}
            onClick={() => startEdit(order.id, 'orderStatus', order.status || '')}
          >
            <div className="flex items-center gap-2 justify-between">
              <span>{order.status || '-'}</span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </div>
          </td>
        );

      case 'archived':
        return (
          <td key={column.id} className={`px-4 py-3 ${alignClass}`}>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              order.archivedAt
                ? 'bg-slate-100 text-slate-600'
                : 'bg-green-100 text-green-700'
            }`}>
              {order.archivedAt ? 'Archiwum' : 'Aktywne'}
            </span>
          </td>
        );

      default:
        const cellValue = getCellValue(order, column.id);
        return (
          <td key={column.id} className={`px-4 py-3 text-muted-foreground ${alignClass}`}>
            {cellValue || '-'}
          </td>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Zestawienie zleceń" />

      <div className="flex-1 p-6 space-y-6">
        {/* Nagłówek z wyszukiwaniem */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Szukaj po numerze, kliencie, projekcie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Grupowanie */}
          <div className="flex items-center gap-2">
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Kolumny
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Eksport CSV
            </Button>
          </div>
        </div>

        {/* Panel ustawień kolumn */}
        {showColumnSettings && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ustawienia kolumn</CardTitle>
                <Button variant="outline" size="sm" onClick={resetColumnOrder}>
                  Przywróć domyślne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Przeciągnij kolumny, aby zmienić ich kolejność. Kliknij ikonę oka, aby ukryć/pokazać kolumnę.
              </p>
              <div className="space-y-2">
                {columns.map((column, index) => (
                  <div
                    key={column.id}
                    className={`flex items-center gap-2 p-3 bg-slate-50 rounded border hover:bg-slate-100 ${
                      draggedColumn === index ? 'opacity-50' : ''
                    } ${!column.visible ? 'opacity-60' : ''}`}
                  >
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-2 flex-1 cursor-move"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">{column.label}</span>
                    </div>
                    <button
                      onClick={() => toggleColumnVisibility(column.id)}
                      className="p-1 hover:bg-slate-200 rounded"
                      title={column.visible ? 'Ukryj kolumnę' : 'Pokaż kolumnę'}
                    >
                      {column.visible ? (
                        <Eye className="h-4 w-4 text-slate-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statystyki */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wszystkie zlecenia</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suma okien</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWindows}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suma wartości (PLN)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValuePln, 'PLN')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suma wartości (EUR)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValueEur, 'EUR')}
              </div>
              <p className="text-xs text-muted-foreground">
                Kurs: {eurRate} PLN
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela zleceń */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </CardContent>
          </Card>
        ) : filteredOrders.length > 0 ? (
          Object.entries(groupedOrders).map(([groupKey, orders]) => {
            const visibleColumns = columns.filter(col => col.visible !== false);

            return (
              <Card key={groupKey}>
                <CardHeader>
                  <CardTitle>
                    {groupBy !== 'none' ? getGroupLabel(groupKey, groupBy) : 'Wszystkie zlecenia'}
                    {groupBy !== 'none' && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({orders.length} {orders.length === 1 ? 'zlecenie' : orders.length < 5 ? 'zlecenia' : 'zleceń'})
                      </span>
                    )}
                    {searchQuery && groupBy === 'none' && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({filteredOrders.length} wyników)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded border overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {visibleColumns.map((column) => (
                            <th
                              key={column.id}
                              className={`px-4 py-2 ${
                                column.align === 'center'
                                  ? 'text-center'
                                  : column.align === 'right'
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              <SortHeader column={column} />
                            </th>
                          ))}
                        </tr>
                        <tr className="border-t bg-slate-100 sticky top-[37px] z-10">
                          {visibleColumns.map((column) => (
                            <th
                              key={`filter-${column.id}`}
                              className="px-2 py-1 bg-slate-100"
                            >
                              <input
                                type="text"
                                placeholder="Filtruj..."
                                value={columnFilters[column.id] || ''}
                                onChange={(e) => setColumnFilters(prev => ({
                                  ...prev,
                                  [column.id]: e.target.value
                                }))}
                                className="w-full px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order: ExtendedOrder, index: number) => (
                          <tr key={order.id} className={`border-t hover:bg-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                            {visibleColumns.map((column) => renderCell(order, column))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">
                  {searchQuery ? 'Brak wyników dla podanego wyszukiwania' : 'Brak zleceń w systemie'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal szczegółów zlecenia */}
      <OrderDetailModal
        orderId={selectedOrder?.id || null}
        orderNumber={selectedOrder?.number}
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      />
    </div>
  );
}
