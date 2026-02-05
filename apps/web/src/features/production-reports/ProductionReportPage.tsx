'use client';

import React, { useState, useCallback, useMemo } from 'react';

// Domyślny kurs EUR/PLN
const DEFAULT_EUR_RATE = 4.30;
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Unlock } from 'lucide-react';
import {
  MonthSelector,
  AtypicalSection,
  SummarySection,
  CloseMonthDialog,
  ReopenMonthDialog,
  OrdersTable,
  InvoiceAutoFillDialog,
} from './components';
import {
  useProductionReport,
  useProductionReportSummary,
  useUpdateReportItem,
  useUpdateInvoice,
  useUpdateAtypical,
  useCloseMonth,
  useReopenMonth,
} from './hooks';
import { getEffectivePermissions, mapBackendRole } from './helpers/permissions';
import type { UpdateReportItemInput, UpdateInvoiceInput, UpdateAtypicalInput, UserRole } from './types';

interface ProductionReportPageProps {
  // Rola użytkownika z sesji (np. 'admin', 'kierownik', 'ksiegowa', 'user')
  userRole?: string;
}

export const ProductionReportPage: React.FC<ProductionReportPageProps> = ({
  userRole = 'user',
}) => {
  const { toast } = useToast();

  // Aktualny rok i miesiąc
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Kurs EUR/PLN (współdzielony między tabelą a podsumowaniem)
  const [eurRate, setEurRate] = useState<number>(DEFAULT_EUR_RATE);

  // Dialogi
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // Stan dialogu auto-fill FV
  const [autoFillDialog, setAutoFillDialog] = useState<{
    isOpen: boolean;
    orderId: number;
    orderNumber: string;
    invoiceNumber: string | null;
  }>({
    isOpen: false,
    orderId: 0,
    orderNumber: '',
    invoiceNumber: null,
  });

  // Pobierz dane raportu
  const {
    data: report,
    isLoading: isLoadingReport,
    error: reportError,
  } = useProductionReport(year, month);

  // Pobierz podsumowanie
  const {
    data: summary,
    isLoading: isLoadingSummary,
  } = useProductionReportSummary(year, month);

  // Mutacje
  const updateItemMutation = useUpdateReportItem();
  const updateInvoiceMutation = useUpdateInvoice();
  const updateAtypicalMutation = useUpdateAtypical();
  const closeMonthMutation = useCloseMonth();
  const reopenMonthMutation = useReopenMonth();

  // Oblicz uprawnienia
  const role = mapBackendRole(userRole) as UserRole;
  const monthStatus = report?.status || 'open';
  const permissions = useMemo(
    () => getEffectivePermissions(role, monthStatus as 'open' | 'closed'),
    [role, monthStatus]
  );

  // Handlery zmiany miesiąca
  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  }, []);

  // Handler aktualizacji pozycji raportu
  const handleUpdateItem = useCallback(
    (orderId: number, data: UpdateReportItemInput) => {
      updateItemMutation.mutate(
        { year, month, orderId, data },
        {
          onError: (error) => {
            toast({
              title: 'Błąd',
              description: error instanceof Error ? error.message : 'Nie udało się zapisać zmian',
              variant: 'destructive',
            });
          },
        }
      );
    },
    [year, month, updateItemMutation, toast]
  );

  // Handler aktualizacji danych FV
  const handleUpdateInvoice = useCallback(
    (orderId: number, data: UpdateInvoiceInput) => {
      updateInvoiceMutation.mutate(
        { year, month, orderId, data },
        {
          onError: (error) => {
            toast({
              title: 'Błąd',
              description: error instanceof Error ? error.message : 'Nie udało się zapisać danych FV',
              variant: 'destructive',
            });
          },
        }
      );
    },
    [year, month, updateInvoiceMutation, toast]
  );

  // Handler otwierania dialogu auto-fill FV
  const handleOpenAutoFillDialog = useCallback(
    (orderId: number, orderNumber: string, invoiceNumber: string | null) => {
      setAutoFillDialog({
        isOpen: true,
        orderId,
        orderNumber,
        invoiceNumber,
      });
    },
    []
  );

  // Handler zamknięcia dialogu auto-fill
  const handleCloseAutoFillDialog = useCallback(() => {
    setAutoFillDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Handler aktualizacji nietypówek
  const handleUpdateAtypical = useCallback(
    (data: UpdateAtypicalInput) => {
      updateAtypicalMutation.mutate(
        { year, month, data },
        {
          onSuccess: () => {
            toast({
              title: 'Zapisano',
              description: 'Nietypówki zostały zaktualizowane',
            });
          },
          onError: (error) => {
            toast({
              title: 'Błąd',
              description: error instanceof Error ? error.message : 'Nie udało się zapisać nietypówek',
              variant: 'destructive',
            });
          },
        }
      );
    },
    [year, month, updateAtypicalMutation, toast]
  );

  // Handler zamknięcia miesiąca
  const handleCloseMonth = useCallback(() => {
    closeMonthMutation.mutate(
      { year, month },
      {
        onSuccess: () => {
          setShowCloseDialog(false);
          toast({
            title: 'Miesiąc zamknięty',
            description: 'Raport został zamknięty. Edycja ilości jest teraz zablokowana.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Błąd',
            description: error instanceof Error ? error.message : 'Nie udało się zamknąć miesiąca',
            variant: 'destructive',
          });
        },
      }
    );
  }, [year, month, closeMonthMutation, toast]);

  // Handler otwarcia miesiąca
  const handleReopenMonth = useCallback(() => {
    reopenMonthMutation.mutate(
      { year, month },
      {
        onSuccess: () => {
          setShowReopenDialog(false);
          toast({
            title: 'Miesiąc otwarty',
            description: 'Raport został ponownie otwarty do edycji.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Błąd',
            description: error instanceof Error ? error.message : 'Nie udało się otworzyć miesiąca',
            variant: 'destructive',
          });
        },
      }
    );
  }, [year, month, reopenMonthMutation, toast]);

  // Stan ładowania
  const isLoading = isLoadingReport || isLoadingSummary;
  const isPending =
    updateItemMutation.isPending ||
    updateInvoiceMutation.isPending ||
    updateAtypicalMutation.isPending;

  // Błąd
  if (reportError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-semibold">Błąd ładowania raportu</h3>
          <p className="text-sm mt-1">
            {reportError instanceof Error ? reportError.message : 'Nieznany błąd'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z selektorem miesiąca i akcjami */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zestawienie Miesięczne Produkcji</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Raport produkcji na podstawie daty produkcji zleceń
          </p>
        </div>

        <div className="flex items-center gap-4">
          <MonthSelector
            year={year}
            month={month}
            status={(report?.status as 'open' | 'closed') || 'open'}
            editedAfterClose={report?.editedAfterClose}
            onMonthChange={handleMonthChange}
          />

          {/* Przycisk zamknij/otwórz miesiąc */}
          {permissions.canCloseMonth && report?.status === 'open' && (
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(true)}
              disabled={isPending}
            >
              <Lock className="h-4 w-4 mr-2" />
              Zamknij miesiąc
            </Button>
          )}

          {permissions.canReopenMonth && report?.status === 'closed' && (
            <Button
              variant="outline"
              onClick={() => setShowReopenDialog(true)}
              disabled={isPending}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Otwórz ponownie
            </Button>
          )}
        </div>
      </div>

      {/* Ładowanie */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Treść */}
      {!isLoading && report && (
        <>
          {/* Tabela zleceń */}
          <OrdersTable
            orders={report.orders || []}
            items={report.items || []}
            canEditQuantities={permissions.canEditQuantities}
            canEditInvoice={permissions.canEditInvoice}
            onUpdateItem={handleUpdateItem}
            onUpdateInvoice={handleUpdateInvoice}
            onAutoFillInvoice={handleOpenAutoFillDialog}
            isPending={isPending}
          />

          {/* Nietypówki */}
          <AtypicalSection
            atypicalWindows={report.atypicalWindows ?? 0}
            atypicalUnits={report.atypicalUnits ?? 0}
            atypicalSashes={report.atypicalSashes ?? 0}
            atypicalValuePln={report.atypicalValuePln ?? 0}
            atypicalNotes={report.atypicalNotes ?? null}
            canEdit={permissions.canEditAtypical}
            onUpdate={handleUpdateAtypical}
            isPending={updateAtypicalMutation.isPending}
          />

          {/* Podsumowanie */}
          {summary && (
            <SummarySection
              summary={summary}
              workingDays={summary.workingDays || 20}
              totalValueEur={
                // Suma wartości EUR z zamówień (w centach)
                report.orders?.reduce((sum, order) => sum + (order.valueEur ?? 0), 0) ?? 0
              }
              year={year}
              month={month}
              eurRate={eurRate}
              onEurRateChange={setEurRate}
            />
          )}
        </>
      )}

      {/* Dialogi */}
      <CloseMonthDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        year={year}
        month={month}
        onConfirm={handleCloseMonth}
        isPending={closeMonthMutation.isPending}
      />

      <ReopenMonthDialog
        open={showReopenDialog}
        onOpenChange={setShowReopenDialog}
        year={year}
        month={month}
        onConfirm={handleReopenMonth}
        isPending={reopenMonthMutation.isPending}
      />

      {/* Dialog auto-fill numeru FV */}
      <InvoiceAutoFillDialog
        isOpen={autoFillDialog.isOpen}
        onClose={handleCloseAutoFillDialog}
        year={year}
        month={month}
        sourceOrderId={autoFillDialog.orderId}
        sourceOrderNumber={autoFillDialog.orderNumber}
        initialInvoiceNumber={autoFillDialog.invoiceNumber || ''}
      />
    </div>
  );
};

export default ProductionReportPage;
