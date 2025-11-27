'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { deliveriesApi, workingDaysApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { OrderDetailModal } from '@/components/orders/order-detail-modal';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Package,
  Truck,
  Trash2,
  X,
  ArrowRight,
  Eye,
  CheckCircle2,
  Ban,
  GripVertical,
  CalendarDays,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  DraggableOrder,
  DroppableDelivery,
  UnassignedOrdersDropzone,
  OrderDragOverlay,
} from './DragDropComponents';

interface Delivery {
  id: number;
  deliveryDate: string;
  deliveryNumber: string | null;
  status: string;
  totalWindows: number | null;
  notes: string | null;
  deliveryOrders: {
    order: {
      id: number;
      orderNumber: string;
      totalWindows: number | null;
      totalSashes: number | null;
      totalGlasses: number | null;
    };
  }[];
  deliveryItems?: {
    id: number;
    itemType: string;
    description: string;
    quantity: number;
  }[];
}

export default function DostawyPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryNumber, setNewDeliveryNumber] = useState('');
  const [newDeliveryNotes, setNewDeliveryNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [orderToAssign, setOrderToAssign] = useState<{ id: number; orderNumber: string } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItem, setNewItem] = useState({ itemType: 'glass', description: '', quantity: 1 });
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Drag & Drop state
  const [activeDragItem, setActiveDragItem] = useState<{
    orderId: number;
    orderNumber: string;
    sourceDeliveryId?: number;
  } | null>(null);

  // Multi-select state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  const [productionDate, setProductionDate] = useState('');

  // Oblicz zakres dat: bieżący tydzień + 2 miesiące do przodu
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Poniedziałek jako początek tygodnia
  startOfWeek.setDate(today.getDate() + daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setMonth(today.getMonth() + 2);
  endDate.setHours(23, 59, 59, 999);

  // Pobierz dane dla wszystkich miesięcy w zakresie
  const monthsToFetch: { month: number; year: number }[] = [];
  const currentMonth = startOfWeek.getMonth() + 1;
  const currentYear = startOfWeek.getFullYear();

  // Dodaj pierwszy miesiąc
  monthsToFetch.push({ month: currentMonth, year: currentYear });

  // Dodaj kolejne miesiące do końca zakresu
  const tempDate = new Date(startOfWeek);
  while (tempDate < endDate) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    const m = tempDate.getMonth() + 1;
    const y = tempDate.getFullYear();
    if (!monthsToFetch.some(item => item.month === m && item.year === y)) {
      monthsToFetch.push({ month: m, year: y });
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries-calendar-continuous', monthsToFetch],
    queryFn: async () => {
      // Pobierz dane dla wszystkich miesięcy i połącz
      const results = await Promise.all(
        monthsToFetch.map(({ month, year }) => deliveriesApi.getCalendar(month, year))
      );

      // Połącz wszystkie dostawy
      const allDeliveries = results.flatMap(r => r.deliveries || []);
      const allHolidays = results.flatMap(r => r.holidays || []);

      return {
        deliveries: allDeliveries,
        holidays: allHolidays,
        unassignedOrders: results[0]?.unassignedOrders || [],
      };
    },
  });

  const { data: workingDaysData } = useQuery({
    queryKey: ['working-days-continuous', monthsToFetch],
    queryFn: async () => {
      const results = await Promise.all(
        monthsToFetch.map(({ month, year }) => workingDaysApi.getAll({ month, year }))
      );
      return results.flat();
    },
  });

  // Pobierz święta dla wszystkich lat w zakresie
  const yearsToFetch = Array.from(new Set(monthsToFetch.map(m => m.year)));

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', yearsToFetch],
    queryFn: async () => {
      const results = await Promise.all(
        yearsToFetch.map(year => workingDaysApi.getHolidays(year))
      );
      return results.flat();
    },
  });

  const deliveries = data?.deliveries || [];
  const unassignedOrders = data?.unassignedOrders || [];
  const workingDays = workingDaysData || [];
  const holidays = data?.holidays || [];

  // Mutations
  const createDeliveryMutation = useMutation({
    mutationFn: (data: { deliveryDate: string; deliveryNumber?: string; notes?: string }) =>
      deliveriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setShowNewDeliveryDialog(false);
      setNewDeliveryDate('');
      setNewDeliveryNumber('');
      setNewDeliveryNotes('');
      showSuccessToast('Dostawa utworzona', 'Pomyślnie utworzono nową dostawę');
    },
    onError: (error) => {
      showErrorToast('Błąd tworzenia dostawy', getErrorMessage(error));
    },
  });

  const deleteDeliveryMutation = useMutation({
    mutationFn: (id: number) => deliveriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setSelectedDelivery(null);
      setShowDeleteConfirm(null);
      showSuccessToast('Dostawa usunięta', 'Pomyślnie usunięto dostawę');
    },
    onError: (error) => {
      showErrorToast('Błąd usuwania dostawy', getErrorMessage(error));
    },
  });

  const removeOrderFromDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.removeOrder(deliveryId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      showSuccessToast('Zlecenie usunięte', 'Zlecenie zostało usunięte z dostawy');
    },
    onError: (error) => {
      showErrorToast('Błąd usuwania zlecenia', getErrorMessage(error));
    },
  });

  const addOrderToDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.addOrder(deliveryId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setOrderToAssign(null);
      showSuccessToast('Zlecenie dodane', 'Zlecenie zostało dodane do dostawy');
    },
    onError: (error) => {
      showErrorToast('Błąd dodawania zlecenia', getErrorMessage(error));
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: { deliveryId: number; itemType: string; description: string; quantity: number }) =>
      deliveriesApi.addItem(data.deliveryId, {
        itemType: data.itemType,
        description: data.description,
        quantity: data.quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setShowAddItemDialog(false);
      setNewItem({ itemType: 'glass', description: '', quantity: 1 });
      showSuccessToast('Artykuł dodany', 'Pomyślnie dodano artykuł do dostawy');
    },
    onError: (error) => {
      showErrorToast('Błąd dodawania artykułu', getErrorMessage(error));
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ deliveryId, itemId }: { deliveryId: number; itemId: number }) =>
      deliveriesApi.deleteItem(deliveryId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      showSuccessToast('Artykuł usunięty', 'Pomyślnie usunięto artykuł z dostawy');
    },
    onError: (error) => {
      showErrorToast('Błąd usuwania artykułu', getErrorMessage(error));
    },
  });

  const completeOrdersMutation = useMutation({
    mutationFn: ({ deliveryId, productionDate }: { deliveryId: number; productionDate: string }) =>
      deliveriesApi.completeOrders(deliveryId, productionDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setShowCompleteDialog(false);
      setProductionDate('');
      setSelectedDelivery(null);
      showSuccessToast('Zlecenia zakończone', 'Pomyślnie oznaczono zlecenia jako wyprodukowane');
    },
    onError: (error) => {
      showErrorToast('Błąd kończenia zleceń', getErrorMessage(error));
    },
  });

  const toggleWorkingDayMutation = useMutation({
    mutationFn: ({ date, isWorking }: { date: string; isWorking: boolean }) =>
      workingDaysApi.setWorkingDay(date, isWorking),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['working-days'] });
      showSuccessToast(
        variables.isWorking ? 'Dzień roboczy' : 'Dzień wolny',
        `Oznaczono jako ${variables.isWorking ? 'dzień roboczy' : 'dzień wolny'}`
      );
    },
    onError: (error) => {
      showErrorToast('Błąd zmiany dnia', getErrorMessage(error));
    },
  });

  // Generuj ciągły zakres dat (od początku bieżącego tygodnia + 2 miesiące)
  const generateContinuousDays = () => {
    const days: Date[] = [];
    const current = new Date(startOfWeek);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const continuousDays = generateContinuousDays();

  const getDeliveriesForDay = (date: Date) => {
    return deliveries.filter((d: Delivery) => {
      const deliveryDate = new Date(d.deliveryDate);
      return (
        deliveryDate.getDate() === date.getDate() &&
        deliveryDate.getMonth() === date.getMonth() &&
        deliveryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleCreateDelivery = () => {
    if (!newDeliveryDate) return;
    createDeliveryMutation.mutate({
      deliveryDate: newDeliveryDate,
      deliveryNumber: newDeliveryNumber || undefined,
      notes: newDeliveryNotes || undefined,
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as any;

    setActiveDragItem({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      sourceDeliveryId: data.deliveryId,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveDragItem(null);
      return;
    }

    const activeData = active.data.current as any;
    const overData = over.data.current as any;

    const orderId = activeData.orderId;
    const sourceDeliveryId = activeData.deliveryId;
    const targetDeliveryId = overData?.deliveryId;

    // Sprawdź czy przeciągamy wiele zleceń
    const ordersToMove = selectedOrderIds.has(orderId)
      ? Array.from(selectedOrderIds)
      : [orderId];

    // Przypadek 1: Przenoszenie między dostawami
    if (sourceDeliveryId && targetDeliveryId && sourceDeliveryId !== targetDeliveryId) {
      ordersToMove.forEach((id) => {
        removeOrderFromDeliveryMutation.mutate(
          { deliveryId: sourceDeliveryId, orderId: id },
          {
            onSuccess: () => {
              addOrderToDeliveryMutation.mutate({ deliveryId: targetDeliveryId, orderId: id });
            },
          }
        );
      });
      setSelectedOrderIds(new Set());
    }

    // Przypadek 2: Przenoszenie z nieprzypisanych do dostawy
    else if (!sourceDeliveryId && targetDeliveryId) {
      console.log('Adding orders to delivery:', ordersToMove, 'to delivery:', targetDeliveryId);
      ordersToMove.forEach((id) => {
        addOrderToDeliveryMutation.mutate({ deliveryId: targetDeliveryId, orderId: id });
      });
      setSelectedOrderIds(new Set());
    }

    // Przypadek 3: Przenoszenie z dostawy do nieprzypisanych
    else if (sourceDeliveryId && overData?.isUnassigned) {
      ordersToMove.forEach((id) => {
        removeOrderFromDeliveryMutation.mutate({ deliveryId: sourceDeliveryId, orderId: id });
      });
      setSelectedOrderIds(new Set());
    }

    setActiveDragItem(null);
  };

  // Sprawdź czy dzień jest świętem
  const getHolidayInfo = (date: Date) => {
    const polishHolidays = holidays.filter((h: any) => {
      const hDate = new Date(h.date);
      return h.country === 'PL' &&
        hDate.getDate() === date.getDate() &&
        hDate.getMonth() === date.getMonth() &&
        hDate.getFullYear() === date.getFullYear();
    });

    const germanHolidays = holidays.filter((h: any) => {
      const hDate = new Date(h.date);
      return h.country === 'DE' &&
        hDate.getDate() === date.getDate() &&
        hDate.getMonth() === date.getMonth() &&
        hDate.getFullYear() === date.getFullYear();
    });

    return { polishHolidays, germanHolidays };
  };

  // Sprawdź czy dzień jest wolny od pracy
  const isNonWorkingDay = (date: Date) => {
    const workingDay = workingDays.find((wd: any) => {
      const wdDate = new Date(wd.date);
      return wdDate.getDate() === date.getDate() &&
        wdDate.getMonth() === date.getMonth() &&
        wdDate.getFullYear() === date.getFullYear();
    });
    return workingDay && !workingDay.isWorking;
  };

  // Obsługa kliknięcia prawym przyciskiem myszy (oznacz jako wolny/pracujący)
  const handleDayRightClick = (e: React.MouseEvent, date: Date) => {
    e.preventDefault();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isCurrentlyNonWorking = isNonWorkingDay(date);

    toggleWorkingDayMutation.mutate({
      date: dateStr,
      isWorking: isCurrentlyNonWorking, // Toggle
    });
  };

  // Oblicz statystyki dla danego dnia
  const getDayStats = (date: Date) => {
    const dayDeliveries = getDeliveriesForDay(date);
    let windows = 0;
    let sashes = 0;
    let glasses = 0;

    dayDeliveries.forEach((delivery: Delivery) => {
      delivery.deliveryOrders.forEach((dOrder) => {
        windows += dOrder.order.totalWindows || 0;
        sashes += dOrder.order.totalSashes || 0;
        glasses += dOrder.order.totalGlasses || 0;
      });
    });

    return { windows, sashes, glasses };
  };

  // Oblicz statystyki dla tygodnia (7 dni zaczynając od podanego indeksu)
  const getWeekStats = (dates: Date[]) => {
    let windows = 0;
    let sashes = 0;
    let glasses = 0;

    dates.forEach((date) => {
      const dayStats = getDayStats(date);
      windows += dayStats.windows;
      sashes += dayStats.sashes;
      glasses += dayStats.glasses;
    });

    return { windows, sashes, glasses };
  };

  const handleDayClick = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setNewDeliveryDate(dateStr);
    setShowNewDeliveryDialog(true);
  };

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <Header title="Dostawy" />

        <div className="px-6 pt-4">
          <Breadcrumb
            items={[
              { label: 'Dostawy', icon: <CalendarDays className="h-4 w-4" /> },
            ]}
          />
        </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Kalendarz */}
        <div className="flex-1 p-6 overflow-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Dostawy: {startOfWeek.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {endDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button onClick={() => setShowNewDeliveryDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nowa dostawa
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={10} columns={8} />
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {/* Nagłówki dni + kolumna statystyk */}
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-slate-500 py-2"
                    >
                      {day}
                    </div>
                  ))}
                  <div className="text-center text-sm font-medium text-slate-500 py-2 bg-blue-50">
                    Tydzień
                  </div>

                  {/* Dni + statystyki tygodniowe */}
                  {continuousDays.flatMap((date, index) => {
                    const elements: React.ReactNode[] = [];

                    // Informacje o dniu
                    const dayDeliveries = getDeliveriesForDay(date);
                    const dayStats = getDayStats(date);
                    const holidayInfo = getHolidayInfo(date);
                    const nonWorkingDay = isNonWorkingDay(date);
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === todayDate.getTime();
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const hasPolishHoliday = holidayInfo.polishHolidays.length > 0;
                    const hasGermanHoliday = holidayInfo.germanHolidays.length > 0;

                    // Dodaj div dnia
                    elements.push(
                      <div
                        key={date.toISOString()}
                        className={`h-48 border rounded-lg p-2 cursor-pointer transition-colors relative ${
                          nonWorkingDay
                            ? 'bg-red-50 border-red-300 hover:bg-red-100'
                            : isToday
                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                            : isWeekend
                            ? 'bg-slate-100 hover:bg-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => handleDayClick(date)}
                        onContextMenu={(e) => handleDayRightClick(e, date)}
                        title={nonWorkingDay ? 'Dzień wolny od pracy (PPM aby zmienić)' : 'PPM aby oznaczyć jako wolny'}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-sm font-medium ${
                                nonWorkingDay
                                  ? 'text-red-600'
                                  : isToday
                                  ? 'text-blue-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            {nonWorkingDay && <Ban className="h-3 w-3 text-red-500" />}
                          </div>
                          <div className="flex items-center gap-1">
                            {hasPolishHoliday && (
                              <span
                                className="text-xs font-bold text-red-600"
                                title={holidayInfo.polishHolidays.map((h: any) => h.name).join(', ')}
                              >
                                PL
                              </span>
                            )}
                            {hasGermanHoliday && (
                              <span
                                className="text-xs font-bold text-yellow-600"
                                title={holidayInfo.germanHolidays.map((h: any) => h.name).join(', ')}
                              >
                                DE
                              </span>
                            )}
                            {dayDeliveries.length > 0 && (
                              <Badge variant="default" className="text-xs">
                                {dayDeliveries.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {(hasPolishHoliday || hasGermanHoliday) && (
                          <div className="text-xs text-slate-600 mb-1 truncate">
                            {hasPolishHoliday && holidayInfo.polishHolidays[0].name}
                            {hasGermanHoliday && !hasPolishHoliday && `🇩🇪 ${holidayInfo.germanHolidays[0].name}`}
                          </div>
                        )}
                        {dayStats.windows > 0 && (
                          <div className="text-xs text-slate-600 mb-1 flex gap-2">
                            <span>O:{dayStats.windows}</span>
                            <span>S:{dayStats.sashes}</span>
                            <span>Sz:{dayStats.glasses}</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          {dayDeliveries.map((delivery: Delivery) => (
                            <DroppableDelivery key={delivery.id} delivery={delivery} compact>
                              <div className="space-y-1">
                                <div
                                  className="flex items-center gap-2 text-xs font-medium text-blue-900 bg-blue-100 hover:bg-blue-200 cursor-pointer rounded px-2 py-1 transition-colors border border-blue-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDelivery(delivery);
                                  }}
                                >
                                  <Truck className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {delivery.deliveryNumber || `#${delivery.id}`}
                                  </span>
                                </div>
                                {delivery.deliveryOrders?.map(({ order }) => (
                                  <DraggableOrder
                                    key={order.id}
                                    order={order}
                                    deliveryId={delivery.id}
                                    compact
                                    onView={() => {
                                      setSelectedOrderId(order.id);
                                      setSelectedOrderNumber(order.orderNumber);
                                    }}
                                    onRemove={() =>
                                      removeOrderFromDeliveryMutation.mutate({
                                        deliveryId: delivery.id,
                                        orderId: order.id,
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            </DroppableDelivery>
                          ))}
                        </div>
                      </div>
                    );

                    // Dodaj statystyki tygodniowe po każdej niedzieli (co 7. element, index % 7 === 6)
                    if ((index + 1) % 7 === 0) {
                      const weekDates = continuousDays.slice(Math.max(0, index - 6), index + 1);
                      const weekStats = getWeekStats(weekDates);

                      elements.push(
                        <div
                          key={`week-${index}`}
                          className="h-48 border-2 border-blue-200 rounded-lg p-2 bg-blue-50"
                        >
                          <div className="text-xs font-semibold text-blue-700 mb-2 text-center">
                            Podsumowanie
                          </div>
                          {weekStats.windows > 0 ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Okna:</span>
                                <span className="font-bold text-blue-700">{weekStats.windows}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Skrzydła:</span>
                                <span className="font-bold text-blue-700">{weekStats.sashes}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Szyby:</span>
                                <span className="font-bold text-blue-700">{weekStats.glasses}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 text-center mt-4">
                              Brak dostaw
                            </div>
                          )}
                        </div>
                      );
                    }

                    return elements;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - zlecenia bez daty lub szczegóły dostawy */}
        <div className="w-80 border-l bg-white overflow-y-auto">
          {selectedDelivery ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Szczegóły dostawy</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDelivery(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Data</p>
                  <p className="font-medium">{formatDate(selectedDelivery.deliveryDate)}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge variant={selectedDelivery.status === 'completed' ? 'success' : 'secondary'}>
                    {selectedDelivery.status === 'planned' ? 'Zaplanowana' :
                     selectedDelivery.status === 'in_progress' ? 'W trakcie' :
                     selectedDelivery.status === 'completed' ? 'Zrealizowana' : selectedDelivery.status}
                  </Badge>
                </div>

                {selectedDelivery.notes && (
                  <div>
                    <p className="text-sm text-slate-500">Notatki</p>
                    <p className="text-sm">{selectedDelivery.notes}</p>
                  </div>
                )}

                {selectedDelivery.deliveryNumber && (
                  <div>
                    <p className="text-sm text-slate-500">Numer dostawy</p>
                    <p className="font-medium text-lg">{selectedDelivery.deliveryNumber}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    Zlecenia ({selectedDelivery.deliveryOrders?.length || 0})
                  </p>
                  {selectedDelivery.deliveryOrders?.length > 0 ? (
                    <DroppableDelivery delivery={selectedDelivery}>
                      <div className="space-y-2">
                        {selectedDelivery.deliveryOrders.map((item) => (
                          <DraggableOrder
                            key={item.order.id}
                            order={item.order}
                            deliveryId={selectedDelivery.id}
                            onView={() => {
                              setSelectedOrderId(item.order.id);
                              setSelectedOrderNumber(item.order.orderNumber);
                            }}
                            onRemove={() =>
                              removeOrderFromDeliveryMutation.mutate({
                                deliveryId: selectedDelivery.id,
                                orderId: item.order.id,
                              })
                            }
                          />
                        ))}
                      </div>
                    </DroppableDelivery>
                  ) : (
                    <p className="text-sm text-slate-400">Brak zleceń</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">
                      Dodatkowe artykuły ({selectedDelivery.deliveryItems?.length || 0})
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddItemDialog(true)}
                      className="h-6 px-2"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {selectedDelivery.deliveryItems && selectedDelivery.deliveryItems.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDelivery.deliveryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded bg-green-50 text-sm"
                        >
                          <div>
                            <span className="font-medium">{item.quantity}x</span>{' '}
                            <span className="text-slate-600">{item.description}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.itemType === 'glass' ? 'Szyby' :
                               item.itemType === 'sash' ? 'Skrzydła' :
                               item.itemType === 'frame' ? 'Ramy' : 'Inne'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteItemMutation.mutate({
                                deliveryId: selectedDelivery.id,
                                itemId: item.id,
                              })
                            }
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Brak dodatkowych artykułów</p>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  {selectedDelivery.deliveryOrders && selectedDelivery.deliveryOrders.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowCompleteDialog(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Zlecenia zakończone
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowDeleteConfirm(selectedDelivery.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń dostawę
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Zlecenia bez daty
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Kliknij na dzień w kalendarzu, aby utworzyć dostawę
              </p>

              {unassignedOrders.length > 0 ? (
                <UnassignedOrdersDropzone>
                  <h3 className="font-semibold text-sm mb-3">
                    Nieprzypisane zlecenia ({unassignedOrders.length})
                  </h3>
                  <div className="space-y-2">
                    {unassignedOrders.map((order: any) => (
                      <DraggableOrder
                        key={order.id}
                        order={order}
                        isSelected={selectedOrderIds.has(order.id)}
                        onToggleSelect={() => {
                          const newSelected = new Set(selectedOrderIds);
                          if (newSelected.has(order.id)) {
                            newSelected.delete(order.id);
                          } else {
                            newSelected.add(order.id);
                          }
                          setSelectedOrderIds(newSelected);
                        }}
                        onView={() => {
                          setSelectedOrderId(order.id);
                          setSelectedOrderNumber(order.orderNumber);
                        }}
                      />
                    ))}
                  </div>
                  {selectedOrderIds.size > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Zaznaczono: {selectedOrderIds.size}</span>
                        <button
                          onClick={() => setSelectedOrderIds(new Set())}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Odznacz wszystkie
                        </button>
                      </div>
                    </div>
                  )}
                </UnassignedOrdersDropzone>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  Wszystkie zlecenia mają przypisaną datę dostawy
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Nowa dostawa */}
      <Dialog open={showNewDeliveryDialog} onOpenChange={setShowNewDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa dostawa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">Data dostawy</label>
              <Input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Numer dostawy (opcjonalne)</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newDeliveryNumber}
                onChange={(e) => setNewDeliveryNumber(e.target.value)}
              >
                <option value="">Brak</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notatki (opcjonalne)</label>
              <Input
                value={newDeliveryNotes}
                onChange={(e) => setNewDeliveryNotes(e.target.value)}
                placeholder="np. Transport własny"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDeliveryDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleCreateDelivery}
              disabled={!newDeliveryDate || createDeliveryMutation.isPending}
            >
              Utwórz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Potwierdzenie usunięcia */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Czy na pewno chcesz usunąć tę dostawę? Tej operacji nie można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && deleteDeliveryMutation.mutate(showDeleteConfirm)}
              disabled={deleteDeliveryMutation.isPending}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dodaj zlecenie do dostawy */}
      <Dialog open={!!orderToAssign} onOpenChange={(open) => !open && setOrderToAssign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj zlecenie do dostawy</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              Wybierz dostawę dla zlecenia <span className="font-mono font-medium">{orderToAssign?.orderNumber}</span>:
            </p>
            {deliveries.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deliveries.map((delivery: Delivery) => (
                  <button
                    key={delivery.id}
                    className="w-full p-3 rounded-lg border bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                    onClick={() => {
                      if (orderToAssign) {
                        addOrderToDeliveryMutation.mutate({
                          deliveryId: delivery.id,
                          orderId: orderToAssign.id,
                        });
                      }
                    }}
                    disabled={addOrderToDeliveryMutation.isPending}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formatDate(delivery.deliveryDate)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {delivery.deliveryOrders?.length || 0} zleceń
                      </Badge>
                    </div>
                    {delivery.notes && (
                      <p className="text-xs text-slate-500 mt-1 ml-6">{delivery.notes}</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                Brak dostaw w tym miesiącu. Utwórz nową dostawę klikając na dzień w kalendarzu.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderToAssign(null)}>
              Anuluj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dodaj artykuł */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj dodatkowy artykuł</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">Typ artykułu</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newItem.itemType}
                onChange={(e) => setNewItem({ ...newItem, itemType: e.target.value })}
              >
                <option value="glass">Szyby</option>
                <option value="sash">Skrzydła</option>
                <option value="frame">Ramy</option>
                <option value="other">Inne</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Opis</label>
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="np. Szyby hartowane 6mm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Ilość</label>
              <Input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => {
                if (selectedDelivery && newItem.description) {
                  addItemMutation.mutate({
                    deliveryId: selectedDelivery.id,
                    ...newItem,
                  });
                }
              }}
              disabled={!newItem.description || addItemMutation.isPending}
            >
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Zlecenia zakończone */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oznacz zlecenia jako zakończone</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              Wszystkie zlecenia z tej dostawy zostaną oznaczone jako wyprodukowane z podaną datą.
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">Data wyprodukowania</label>
              <Input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => {
                if (selectedDelivery && productionDate) {
                  completeOrdersMutation.mutate({
                    deliveryId: selectedDelivery.id,
                    productionDate,
                  });
                }
              }}
              disabled={!productionDate || completeOrdersMutation.isPending}
            >
              Zakończ zlecenia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal podglądu zlecenia */}
      <OrderDetailModal
        orderId={selectedOrderId}
        orderNumber={selectedOrderNumber || undefined}
        open={!!selectedOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrderId(null);
            setSelectedOrderNumber(null);
          }
        }}
      />
    </div>

    {/* Drag Overlay */}
    <DragOverlay>
      {activeDragItem && (
        <OrderDragOverlay
          orderNumber={activeDragItem.orderNumber}
          selectedCount={selectedOrderIds.has(activeDragItem.orderId) ? selectedOrderIds.size : 1}
        />
      )}
    </DragOverlay>
  </DndContext>
  );
}
