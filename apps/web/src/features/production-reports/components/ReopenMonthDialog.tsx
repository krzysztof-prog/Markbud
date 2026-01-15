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
import { Loader2, AlertTriangle } from 'lucide-react';

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

interface ReopenMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onConfirm: () => void;
  isPending?: boolean;
}

export const ReopenMonthDialog: React.FC<ReopenMonthDialogProps> = ({
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
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Otworzyć ponownie miesiąc {monthName} {year}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mb-2">
              Miesiąc został już zamknięty. Ponowne otwarcie:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pozwoli na edycję ilości i wartości przez kierownika</li>
              <li>Oznaczy raport jako "edytowany po zamknięciu"</li>
              <li>Ta informacja będzie widoczna w zestawieniu</li>
            </ul>
            <p className="mt-3 text-amber-600 font-medium">
              Czy na pewno chcesz otworzyć miesiąc do edycji?
            </p>
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
            Otwórz ponownie
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReopenMonthDialog;
