'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { fetchApi } from '@/lib/api-client';

interface BulkUpdateDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkUpdateResult {
  updated: number;
  deliveries: Array<{
    id: number;
    oldDate: string;
    newDate: string;
    deliveryNumber: string | null;
  }>;
}

export const BulkUpdateDatesDialog: React.FC<BulkUpdateDatesDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [yearOffset, setYearOffset] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { fromDate: string; toDate: string; yearOffset: number }) => {
      return await fetchApi<BulkUpdateResult>('/api/deliveries/bulk-update-dates', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({
        title: 'Daty zaktualizowane',
        description: `Zaktualizowano ${data.updated} dostaw`,
        variant: 'success',
      });
      onOpenChange(false);
      setFromDate('');
      setToDate('');
      setYearOffset(1);
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromDate || !toDate) {
      toast({
        title: 'Brak dat',
        description: 'Podaj zakres dat do aktualizacji',
        variant: 'destructive',
      });
      return;
    }

    mutation.mutate({ fromDate, toDate, yearOffset });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Masowa zmiana dat dostaw</DialogTitle>
            <DialogDescription>
              Zaktualizuj daty dostaw w wybranym zakresie o podaną liczbę lat
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fromDate">Data od</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="toDate">Data do</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="yearOffset">Przesunięcie (lat)</Label>
              <Input
                id="yearOffset"
                type="number"
                min="-10"
                max="10"
                value={yearOffset}
                onChange={(e) => setYearOffset(parseInt(e.target.value, 10))}
                required
              />
              <p className="text-sm text-muted-foreground">
                Dodatnia wartość przesuwa daty do przodu, ujemna wstecz
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Aktualizowanie...' : 'Aktualizuj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateDatesDialog;
