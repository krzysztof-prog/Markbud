'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

// Polskie nazwy miesięcy
const POLISH_MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

interface CloseMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onConfirm: () => void;
  isPending?: boolean;
}

export const CloseMonthDialog: React.FC<CloseMonthDialogProps> = ({
  open,
  onOpenChange,
  year,
  month,
  onConfirm,
  isPending = false,
}) => {
  const monthName = POLISH_MONTHS[month - 1];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zamknąć miesiąc {monthName} {year}?</AlertDialogTitle>
          <AlertDialogDescription>
            Po zamknięciu miesiąca:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Kierownik nie będzie mógł edytować ilości ani wartości</li>
              <li>Księgowa nadal będzie mogła edytować dane FV</li>
              <li>Miesiąc można ponownie otworzyć w razie potrzeby</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zamknij miesiąc
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CloseMonthDialog;
