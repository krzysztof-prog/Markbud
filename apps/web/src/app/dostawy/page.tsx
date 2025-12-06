'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { ProfileStatsDialog } from '@/components/profile-stats-dialog';
import { useFormValidation } from '@/hooks/useFormValidation';
import type { ActiveDragItem, Delivery } from '@/types/delivery';
import type { Holiday, WorkingDay } from '@/types/settings';
import type { Order } from '@/types/order';
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
  BarChart3,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  DraggableOrder,
  DroppableDelivery,
  UnassignedOrdersDropzone,
  OrderDragOverlay,
} from './DragDropComponents';

type CalendarViewMode = 'week' | 'month' | '8weeks';

export default function DostawyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryNumber, setNewDeliveryNumber] = useState('');
  const [newDeliveryNotes, setNewDeliveryNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showProfileStatsDialog, setShowProfileStatsDialog] = useState(false);

  // Form validation for new delivery
  const {
    errors: deliveryErrors,
    touched: deliveryTouched,
    validate: validateDeliveryField,
    validateAll: validateDeliveryForm,
    touch: touchDeliveryField,
    reset: resetDeliveryValidation,
  } = useFormValidation({
    deliveryDate: [
      {
        validate: (value: string) => !!value,
        message: 'Data dostawy jest wymagana',
      },
      {
        validate: (value: string) => {
          if (!value) return true;
          const selected = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selected >= today;
        },
        message: 'Data dostawy nie może być w przeszłości',
      },
    ],
    deliveryNumber: [
      {
        validate: (value: string) => !value || ['I', 'II', 'III'].includes(value),
        message: 'Nieprawidłowy numer dostawy (dozwolone: I, II, III)',
      },
    ],
  });
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
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [productionDate, setProductionDate] = useState('');

  // Oblicz zakres dat w zależności od trybu wyświetlania
  const { startOfWeek, endDate, totalDays } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Poniedziałek jako początek tygodnia

    let daysToShow = 7; // Domyślnie tydzień

    if (viewMode === 'week') {
      start.setDate(today.getDate() + daysToMonday + (weekOffset * 7));
      daysToShow = 7;
    } else if (viewMode === 'month') {
      // Pierwszy dzień miesiąca (lub przesunięty o weekOffset miesięcy)
      start.setDate(1);
      start.setMonth(today.getMonth() + weekOffset);
      start.setHours(0, 0, 0, 0);

      // Przesuń do poniedziałku przed lub równego pierwszemu dniu miesiąca
      const firstDayOfWeek = start.getDay();
      const daysToMondayFromFirst = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      start.setDate(start.getDate() + daysToMondayFromFirst);

      // Koniec miesiąca
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
      const lastDayOfWeek = lastDayOfMonth.getDay();
      const daysToSundayFromLast = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

      daysToShow = Math.ceil((lastDayOfMonth.getDate() + daysToSundayFromLast - start.getDate() + 1) / 7) * 7;
    } else if (viewMode === '8weeks') {
      start.setDate(today.getDate() + daysToMonday + (weekOffset * 56)); // 8 tygodni = 56 dni
      daysToShow = 56;
    }

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + daysToShow - 1);
    end.setHours(23, 59, 59, 999);

    return { startOfWeek: start, endDate: end, totalDays: daysToShow };
  }, [weekOffset, viewMode]);

  // Pobierz dane dla wszystkich miesięcy w zakresie - z memoizacją
  const monthsToFetch = useMemo(() => {
    const months: { month: number; year: number }[] = [];
    const currentMonth = startOfWeek.getMonth() + 1;
    const currentYear = startOfWeek.getFullYear();

    // Dodaj pierwszy miesiąc
    months.push({ month: currentMonth, year: currentYear });

    // Dodaj kolejne miesiące do końca zakresu
    const tempDate = new Date(startOfWeek);
    while (tempDate < endDate) {
      tempDate.setMonth(tempDate.getMonth() + 1);
      const m = tempDate.getMonth() + 1;
      const y = tempDate.getFullYear();
      if (!months.some(item => item.month === m && item.year === y)) {
        months.push({ month: m, year: y });
      }
    }

    return months;
  }, [startOfWeek, endDate]); // Tylko gdy się zmienią daty

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

    // Optimistic update - show new delivery immediately
    onMutate: async (newDelivery) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar'] });

      const previousData = queryClient.getQueryData(['deliveries-calendar']);

      // Generate temporary ID for optimistic delivery
      const tempId = `temp-${Date.now()}`;

      queryClient.setQueryData(['deliveries-calendar'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          deliveries: [
            ...(old.deliveries || []),
            {
              id: tempId,
              deliveryDate: newDelivery.deliveryDate,
              deliveryNumber: newDelivery.deliveryNumber || null,
              notes: newDelivery.notes || null,
              orders: [],
              items: [],
              _optimistic: true, // Mark as optimistic
            },
          ],
        };
      });

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setShowNewDeliveryDialog(false);
      setNewDeliveryDate('');
      setNewDeliveryNumber('');
      setNewDeliveryNotes('');
      showSuccessToast('Dostawa utworzona', 'Pomyślnie utworzono nową dostawę');
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar'], context.previousData);
      }
      showErrorToast('Błąd tworzenia dostawy', getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
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

  const moveOrderBetweenDeliveriesMutation = useMutation({
    mutationFn: ({ sourceDeliveryId, targetDeliveryId, orderId }: { sourceDeliveryId: number; targetDeliveryId: number; orderId: number }) =>
      deliveriesApi.moveOrder(sourceDeliveryId, orderId, targetDeliveryId),

    onMutate: async ({ sourceDeliveryId, targetDeliveryId, orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar'] });
      const previousData = queryClient.getQueryData(['deliveries-calendar']);

      // Optimistically move order between deliveries
      queryClient.setQueryData(['deliveries-calendar'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          deliveries: old.deliveries?.map((delivery: any) => {
            // Remove from source
            if (delivery.id === sourceDeliveryId) {
              return {
                ...delivery,
                orders: (delivery.orders || []).filter((o: any) => o.id !== orderId),
              };
            }
            // Add to target
            if (delivery.id === targetDeliveryId) {
              return {
                ...delivery,
                orders: [
                  ...(delivery.orders || []),
                  { id: orderId, _optimistic: true },
                ],
              };
            }
            return delivery;
          }),
        };
      });

      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      showSuccessToast('Zlecenie przeniesione', 'Zlecenie zostało przeniesione między dostawami');
    },

    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar'], context.previousData);
      }
      showErrorToast('Błąd przenoszenia zlecenia', getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
    },
  });

  const addOrderToDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, orderId }: { deliveryId: number; orderId: number }) =>
      deliveriesApi.addOrder(deliveryId, orderId),

    // Optimistic update - update UI immediately before server responds
    onMutate: async ({ deliveryId, orderId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['deliveries-calendar'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['deliveries-calendar']);

      // Optimistically update the cache
      queryClient.setQueryData(['deliveries-calendar'], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          deliveries: old.deliveries?.map((delivery: any) =>
            delivery.id === deliveryId
              ? {
                  ...delivery,
                  orders: [
                    ...(delivery.orders || []),
                    {
                      id: orderId,
                      _optimistic: true, // Mark as optimistic
                    },
                  ],
                }
              : delivery
          ),
        };
      });

      // Return context with the previous data
      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
      setOrderToAssign(null);
      showSuccessToast('Zlecenie dodane', 'Zlecenie zostało dodane do dostawy');
    },

    onError: (error, _variables, context) => {
      // Rollback to the previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(['deliveries-calendar'], context.previousData);
      }
      showErrorToast('Błąd dodawania zlecenia', getErrorMessage(error));
    },

    // Always refetch after error or success to ensure we have the latest data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: { deliveryId: number; itemType: string; description: string; quantity: number }) =>
      deliveriesApi.addItem(data.deliveryId, {
        itemType: data.itemType,
        description: data.description,
        quantity: data.quantity,
      }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });

      // Odśwież selectedDelivery z nowych danych
      if (selectedDelivery) {
        const updatedData = queryClient.getQueryData<{
          deliveries: Delivery[];
          unassignedOrders: any[];
        }>(['deliveries-calendar-continuous', monthsToFetch]);

        if (updatedData) {
          const updatedDelivery = updatedData.deliveries.find(d => d.id === variables.deliveryId);
          if (updatedDelivery) {
            setSelectedDelivery(updatedDelivery);
          }
        }
      }

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
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });

      // Odśwież selectedDelivery z nowych danych
      if (selectedDelivery) {
        const updatedData = queryClient.getQueryData<{
          deliveries: Delivery[];
          unassignedOrders: any[];
        }>(['deliveries-calendar-continuous', monthsToFetch]);

        if (updatedData) {
          const updatedDelivery = updatedData.deliveries.find(d => d.id === variables.deliveryId);
          if (updatedDelivery) {
            setSelectedDelivery(updatedDelivery);
          }
        }
      }

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

  // Generuj zakres dat dla wybranego trybu
  const generateDays = () => {
    const days: Date[] = [];
    const current = new Date(startOfWeek);

    for (let i = 0; i < totalDays; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const continuousDays = generateDays();

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
    // Validate all fields
    const isValid = validateDeliveryForm({
      deliveryDate: newDeliveryDate,
      deliveryNumber: newDeliveryNumber,
    });

    if (!isValid) {
      // Mark all fields as touched to show errors
      touchDeliveryField('deliveryDate');
      touchDeliveryField('deliveryNumber');
      return;
    }

    createDeliveryMutation.mutate(
      {
        deliveryDate: newDeliveryDate,
        deliveryNumber: newDeliveryNumber || undefined,
        notes: newDeliveryNotes || undefined,
      },
      {
        onSuccess: () => {
          // Reset form and validation on success
          setNewDeliveryDate('');
          setNewDeliveryNumber('');
          setNewDeliveryNotes('');
          resetDeliveryValidation();
          setShowNewDeliveryDialog(false);
        },
      }
    );
  };

  // Drag & Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { orderId: number; orderNumber: string; deliveryId?: number };

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
      // Use atomic moveOrder mutation to prevent data loss
      (async () => {
        for (const id of ordersToMove) {
          try {
            await moveOrderBetweenDeliveriesMutation.mutateAsync({
              sourceDeliveryId,
              targetDeliveryId,
              orderId: id,
            });
          } catch (error) {
            console.error(`Failed to move order ${id}:`, error);
            // Error handling and rollback is done in mutation's onError
            break;
          }
        }
      })();
      setSelectedOrderIds(new Set());
    }

    // Przypadek 2: Przenoszenie z nieprzypisanych do dostawy
    else if (!sourceDeliveryId && targetDeliveryId) {
      // Przetwarzaj sekwencyjnie
      (async () => {
        for (const id of ordersToMove) {
          try {
            await addOrderToDeliveryMutation.mutateAsync({
              deliveryId: targetDeliveryId,
              orderId: id,
            });
          } catch (error) {
            console.error(`Failed to add order ${id} to delivery:`, error);
            showErrorToast('Błąd', `Nie udało się dodać zlecenia ${id} do dostawy`);
            break;
          }
        }
      })();
      setSelectedOrderIds(new Set());
    }

    // Przypadek 3: Przenoszenie z dostawy do nieprzypisanych
    else if (sourceDeliveryId && overData?.isUnassigned) {
      // Przetwarzaj sekwencyjnie
      (async () => {
        for (const id of ordersToMove) {
          try {
            await removeOrderFromDeliveryMutation.mutateAsync({
              deliveryId: sourceDeliveryId,
              orderId: id,
            });
          } catch (error) {
            console.error(`Failed to remove order ${id} from delivery:`, error);
            showErrorToast('Błąd', `Nie udało się usunąć zlecenia ${id} z dostawy`);
            break;
          }
        }
      })();
      setSelectedOrderIds(new Set());
    }

    setActiveDragItem(null);
  };

  // Sprawdź czy dzień jest świętem
  const getHolidayInfo = (date: Date) => {
    const polishHolidays = holidays.filter((h: Holiday) => {
      const hDate = new Date(h.date);
      return h.country === 'PL' &&
        hDate.getDate() === date.getDate() &&
        hDate.getMonth() === date.getMonth() &&
        hDate.getFullYear() === date.getFullYear();
    });

    const germanHolidays = holidays.filter((h: Holiday) => {
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
    const workingDay = workingDays.find((wd: WorkingDay) => {
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
      isWorking: isCurrentlyNonWorking ?? false, // Toggle
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
            <CardHeader className="space-y-4">
              <div className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset(weekOffset - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    {weekOffset === 0 ? (
                      viewMode === 'week' ? 'Bieżący tydzień: ' :
                      viewMode === 'month' ? 'Bieżący miesiąc: ' :
                      'Najbliższe 8 tygodni: '
                    ) : (
                      viewMode === 'week' ? 'Tydzień: ' :
                      viewMode === 'month' ? 'Miesiąc: ' :
                      '8 tygodni: '
                    )}
                    {startOfWeek.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - {endDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset(weekOffset + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {weekOffset !== 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWeekOffset(0)}
                    >
                      Dzisiaj
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileStatsDialog(true)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Statystyki
                  </Button>
                  <Button onClick={() => setShowNewDeliveryDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nowa dostawa
                  </Button>
                </div>
              </div>

              {/* Przyciski wyboru trybu wyświetlania */}
              <div className="flex items-center gap-2 border-t pt-4">
                <span className="text-sm text-slate-500 mr-2">Widok:</span>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('week');
                    setWeekOffset(0);
                  }}
                >
                  Tydzień
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('month');
                    setWeekOffset(0);
                  }}
                >
                  Miesiąc
                </Button>
                <Button
                  variant={viewMode === '8weeks' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewMode('8weeks');
                    setWeekOffset(0);
                  }}
                >
                  8 tygodni
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={10} columns={7} />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1">
                    {/* Nagłówki dni - zawsze 7 kolumn (tydzień) */}
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-slate-500 py-2"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Dni */}
                    {continuousDays.map((date) => {
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

                      return (
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
                                title={holidayInfo.polishHolidays.map((h: { date: string; name: string; country: string }) => h.name).join(', ')}
                              >
                                PL
                              </span>
                            )}
                            {hasGermanHoliday && (
                              <span
                                className="text-xs font-bold text-yellow-600"
                                title={holidayInfo.germanHolidays.map((h: { date: string; name: string; country: string }) => h.name).join(', ')}
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
                            </DroppableDelivery>
                          ))}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Podsumowanie */}
                  {(() => {
                    // Dla trybu miesiąc i 8 tygodni, pokaż podsumowanie po tygodniach
                    if (viewMode === 'month' || viewMode === '8weeks') {
                      const weeks: Date[][] = [];
                      for (let i = 0; i < continuousDays.length; i += 7) {
                        weeks.push(continuousDays.slice(i, i + 7));
                      }

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-700 mb-2">
                            Podsumowanie tygodniowe
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {weeks.map((week, idx) => {
                              const weekStats = getWeekStats(week);
                              const weekStart = week[0];
                              const weekEnd = week[week.length - 1];

                              return (
                                <div key={idx} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                                  <div className="text-xs text-slate-600 mb-2">
                                    Tydzień {idx + 1}: {weekStart.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                  </div>
                                  {weekStats.windows > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                      <div>
                                        <div className="text-slate-600">Okna</div>
                                        <div className="text-lg font-bold text-blue-700">{weekStats.windows}</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-600">Skrzydła</div>
                                        <div className="text-lg font-bold text-blue-700">{weekStats.sashes}</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-600">Szyby</div>
                                        <div className="text-lg font-bold text-blue-700">{weekStats.glasses}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-400 text-center">Brak dostaw</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Dla trybu tydzień, jedno duże podsumowanie
                    const totalStats = getWeekStats(continuousDays);
                    return (
                      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="text-sm font-semibold text-blue-700 mb-3">
                          Podsumowanie tygodnia
                        </div>
                        {totalStats.windows > 0 ? (
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-xs text-slate-600 mb-1">Okna</div>
                              <div className="text-2xl font-bold text-blue-700">{totalStats.windows}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-600 mb-1">Skrzydła</div>
                              <div className="text-2xl font-bold text-blue-700">{totalStats.sashes}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-600 mb-1">Szyby</div>
                              <div className="text-2xl font-bold text-blue-700">{totalStats.glasses}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 text-center py-4">
                            Brak dostaw w tym tygodniu
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - stały panel zleceń bez daty */}
        <div className={cn(
          "w-80 border-l overflow-y-auto transition-colors",
          selectedDelivery ? "bg-blue-50 border-blue-300" : "bg-white"
        )}>
          <div className="p-4">
            <h3 className={cn(
              "font-semibold text-sm uppercase tracking-wide mb-3 flex items-center gap-2",
              selectedDelivery ? "text-blue-700" : "text-slate-500"
            )}>
              <Package className="h-4 w-4" />
              Zlecenia bez daty
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Przeciągnij zlecenia na dni w kalendarzu, aby przypisać do dostawy
            </p>

            {unassignedOrders.length > 0 ? (
              <UnassignedOrdersDropzone>
                <h3 className="font-semibold text-sm mb-3">
                  Nieprzypisane zlecenia ({unassignedOrders.length})
                </h3>
                <div className="space-y-2">
                  {unassignedOrders.map((order: Order) => (
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
        </div>
      </div>

      {/* Dialog: Szczegóły dostawy */}
      <Dialog open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Szczegóły dostawy</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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

                {selectedDelivery.deliveryNumber && (
                  <div>
                    <p className="text-sm text-slate-500">Numer dostawy</p>
                    <p className="font-medium text-lg">{selectedDelivery.deliveryNumber}</p>
                  </div>
                )}

                {selectedDelivery.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Notatki</p>
                    <p className="text-sm">{selectedDelivery.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">
                  Zlecenia ({selectedDelivery.deliveryOrders?.length || 0})
                </p>
                {selectedDelivery.deliveryOrders && selectedDelivery.deliveryOrders.length > 0 ? (
                  <UnassignedOrdersDropzone>
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
                  </UnassignedOrdersDropzone>
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
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {selectedDelivery?.deliveryOrders && selectedDelivery.deliveryOrders.length > 0 && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowCompleteDialog(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Zlecenia zakończone
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedDelivery && router.push(`/dostawy/${selectedDelivery.id}/optymalizacja`)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Optymalizuj palety
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => selectedDelivery && setShowDeleteConfirm(selectedDelivery.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń dostawę
              </Button>
            </div>
            <Button variant="outline" onClick={() => setSelectedDelivery(null)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nowa dostawa */}
      <Dialog
        open={showNewDeliveryDialog}
        onOpenChange={(open) => {
          setShowNewDeliveryDialog(open);
          if (!open) {
            // Reset form and validation when dialog closes
            setNewDeliveryDate('');
            setNewDeliveryNumber('');
            setNewDeliveryNotes('');
            resetDeliveryValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa dostawa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Data dostawy <span className="text-red-600">*</span>
              </label>
              <Input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => {
                  setNewDeliveryDate(e.target.value);
                  validateDeliveryField('deliveryDate', e.target.value);
                }}
                onBlur={() => touchDeliveryField('deliveryDate')}
                className={cn(
                  deliveryTouched.deliveryDate &&
                    deliveryErrors.deliveryDate &&
                    'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={deliveryTouched.deliveryDate && !!deliveryErrors.deliveryDate}
                aria-describedby={
                  deliveryTouched.deliveryDate && deliveryErrors.deliveryDate
                    ? 'delivery-date-error'
                    : undefined
                }
              />
              {deliveryTouched.deliveryDate && deliveryErrors.deliveryDate && (
                <p id="delivery-date-error" className="text-sm text-red-600 mt-1">
                  {deliveryErrors.deliveryDate}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Numer dostawy (opcjonalne)</label>
              <select
                className={cn(
                  'w-full border rounded-md px-3 py-2 text-sm',
                  deliveryErrors.deliveryNumber && 'border-red-500'
                )}
                value={newDeliveryNumber}
                onChange={(e) => {
                  setNewDeliveryNumber(e.target.value);
                  validateDeliveryField('deliveryNumber', e.target.value);
                }}
                aria-invalid={!!deliveryErrors.deliveryNumber}
                aria-describedby={deliveryErrors.deliveryNumber ? 'delivery-number-error' : undefined}
              >
                <option value="">Brak</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>
              {deliveryErrors.deliveryNumber && (
                <p id="delivery-number-error" className="text-sm text-red-600 mt-1">
                  {deliveryErrors.deliveryNumber}
                </p>
              )}
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
            <Button
              variant="outline"
              onClick={() => setShowNewDeliveryDialog(false)}
              disabled={createDeliveryMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleCreateDelivery}
              disabled={createDeliveryMutation.isPending}
            >
              {createDeliveryMutation.isPending ? 'Tworzę...' : 'Utwórz'}
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

      {/* Dialog statystyk profili */}
      <ProfileStatsDialog
        open={showProfileStatsDialog}
        onOpenChange={setShowProfileStatsDialog}
      />

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
