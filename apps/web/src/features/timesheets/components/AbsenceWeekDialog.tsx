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
import type { AbsenceType } from '../types';
import { ABSENCE_LABELS } from '../types';
import { formatDateShort } from '../helpers/dateHelpers';

interface AbsenceWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absenceType: AbsenceType;
  fromDate: string;
  toDate: string;
  onConfirmSingleDay: () => void;
  onConfirmWholeWeek: () => void;
}

export const AbsenceWeekDialog: React.FC<AbsenceWeekDialogProps> = ({
  open,
  onOpenChange,
  absenceType,
  fromDate,
  toDate,
  onConfirmSingleDay,
  onConfirmWholeWeek,
}) => {
  const absenceLabel = ABSENCE_LABELS[absenceType];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ustaw {absenceLabel.toLowerCase()} do końca tygodnia?</AlertDialogTitle>
          <AlertDialogDescription>
            Wybrałeś pierwszy dzień tygodnia ({formatDateShort(fromDate)}).
            Czy chcesz ustawić &quot;{absenceLabel}&quot; do końca tygodnia roboczego ({formatDateShort(toDate)})?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onConfirmSingleDay}>
            Tylko dzisiaj
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmWholeWeek}>
            Do końca tygodnia
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AbsenceWeekDialog;
