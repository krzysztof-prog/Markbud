'use client';

/**
 * VerificationListForm - Formularz tworzenia/edycji listy weryfikacyjnej
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CreateVerificationListData, UpdateVerificationListData } from '@/types';

// Discriminated union types for proper type inference
type VerificationListFormPropsCreate = {
  mode: 'create';
  initialData?: {
    deliveryDate?: string;
    title?: string | null;
    notes?: string | null;
  };
  onSubmit: (data: CreateVerificationListData) => void;
  onCancel?: () => void;
  isPending?: boolean;
};

type VerificationListFormPropsEdit = {
  mode: 'edit';
  initialData?: {
    deliveryDate: string;
    title?: string | null;
    notes?: string | null;
  };
  onSubmit: (data: UpdateVerificationListData) => void;
  onCancel?: () => void;
  isPending?: boolean;
};

type VerificationListFormProps = VerificationListFormPropsCreate | VerificationListFormPropsEdit;

export const VerificationListForm: React.FC<VerificationListFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}) => {
  const [date, setDate] = useState<Date | undefined>(
    initialData?.deliveryDate ? new Date(initialData.deliveryDate) : undefined
  );
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) return;

    const data = {
      deliveryDate: date.toISOString(),
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    // Type assertion jest bezpieczna - oba typy mają te same pola
    (onSubmit as (data: CreateVerificationListData | UpdateVerificationListData) => void)(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Data dostawy */}
      <div className="space-y-2">
        <Label htmlFor="deliveryDate" className="form-field-required">
          Data dostawy
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP', { locale: pl }) : 'Wybierz datę'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={pl}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tytuł */}
      <div className="space-y-2">
        <Label htmlFor="title">Tytuł (opcjonalnie)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Lista od Kowalskiego"
          maxLength={200}
        />
      </div>

      {/* Notatki */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dodatkowe informacje..."
          maxLength={1000}
          rows={3}
        />
      </div>

      {/* Przyciski */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
        )}
        <Button type="submit" disabled={!date || isPending}>
          {isPending
            ? 'Zapisywanie...'
            : mode === 'create'
            ? 'Utwórz listę'
            : 'Zapisz zmiany'}
        </Button>
      </div>
    </form>
  );
};

export default VerificationListForm;
