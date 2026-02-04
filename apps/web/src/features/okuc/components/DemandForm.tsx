/**
 * Formularz dodawania/edycji zapotrzebowania OKUC
 *
 * Walidacja: React Hook Form + Zod
 * - Artykuł: wymagany (tylko przy dodawaniu)
 * - Tydzień: wymagany, format RRRR-WTT
 * - Ilość: wymagana, minimum 1
 * - Powód edycji: wymagany (tylko przy edycji)
 * - Błędy pokazywane inline pod polami (onBlur)
 */

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOkucArticles } from '@/features/okuc/hooks';
import type { OkucDemand, DemandStatus, DemandSource, CreateDemandInput, UpdateDemandInput } from '@/types/okuc';

// Zod schema dla dodawania
const createDemandSchema = z.object({
  articleId: z.string().min(1, 'Wybierz artykuł'),
  expectedWeek: z
    .string()
    .min(1, 'Tydzień jest wymagany')
    .regex(/^\d{4}-W\d{2}$/, 'Nieprawidłowy format tygodnia (RRRR-WTT)'),
  quantity: z
    .string()
    .min(1, 'Ilość jest wymagana')
    .refine((val) => parseInt(val, 10) >= 1, 'Ilość musi być większa od 0'),
  status: z.enum(['pending', 'confirmed', 'in_production', 'completed', 'cancelled']),
  source: z.enum(['order', 'csv_import', 'manual']),
  editReason: z.string().optional(),
});

// Zod schema dla edycji (wymaga editReason)
const updateDemandSchema = createDemandSchema.extend({
  editReason: z.string().min(1, 'Powód edycji jest wymagany'),
});

type DemandFormData = z.infer<typeof createDemandSchema>;

interface DemandFormProps {
  demand: OkucDemand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDemandInput | UpdateDemandInput) => void;
  isPending: boolean;
}

export function DemandForm({ demand, open, onOpenChange, onSubmit, isPending }: DemandFormProps) {
  const isEdit = !!demand;

  // Pobierz artykuły dla selecta
  const { data: articles = [], isLoading: isLoadingArticles } = useOkucArticles();

  // React Hook Form z dynamiczną schemą
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<DemandFormData>({
    resolver: zodResolver(isEdit ? updateDemandSchema : createDemandSchema),
    mode: 'onBlur', // Walidacja po wyjściu z pola
    defaultValues: {
      articleId: '',
      expectedWeek: '',
      quantity: '',
      status: 'pending',
      source: 'manual',
      editReason: '',
    },
  });

  // Reset formularza przy otwarciu/zamknięciu
  useEffect(() => {
    if (open) {
      if (demand) {
        // Edycja - załaduj dane
        reset({
          articleId: demand.articleId.toString(),
          expectedWeek: demand.expectedWeek,
          quantity: demand.quantity.toString(),
          status: demand.status,
          source: demand.source,
          editReason: '',
        });
      } else {
        // Dodawanie - wyczyść
        reset({
          articleId: '',
          expectedWeek: '',
          quantity: '',
          status: 'pending',
          source: 'manual',
          editReason: '',
        });
      }
    }
  }, [open, demand, reset]);

  // Submit handler
  const onFormSubmit = (data: DemandFormData) => {
    const quantityNum = parseInt(data.quantity, 10);

    if (isEdit) {
      const updateData: UpdateDemandInput = {
        quantity: quantityNum,
        status: data.status as DemandStatus,
        expectedWeek: data.expectedWeek,
        editReason: data.editReason?.trim() || '',
      };
      onSubmit(updateData);
    } else {
      const createData: CreateDemandInput = {
        articleId: parseInt(data.articleId, 10),
        expectedWeek: data.expectedWeek,
        quantity: quantityNum,
        status: data.status as DemandStatus,
        source: data.source as DemandSource,
      };
      onSubmit(createData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edytuj zapotrzebowanie' : 'Dodaj zapotrzebowanie'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Zmień dane zapotrzebowania. Powód edycji jest wymagany.'
              : 'Dodaj nowe zapotrzebowanie na okucia.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 mt-4">
          {/* Artykuł - tylko przy dodawaniu */}
          {!isEdit && (
            <FormField
              id="articleId"
              label="Artykuł"
              required
              error={errors.articleId?.message}
            >
              <Controller
                name="articleId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoadingArticles || isPending}
                  >
                    <SelectTrigger id="articleId">
                      <SelectValue placeholder={isLoadingArticles ? 'Ładowanie...' : 'Wybierz artykuł'} />
                    </SelectTrigger>
                    <SelectContent>
                      {articles.map((article) => (
                        <SelectItem key={article.id} value={article.id.toString()}>
                          {article.articleId} - {article.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          {/* Tydzień */}
          <FormField
            id="expectedWeek"
            label="Tydzień"
            required
            error={errors.expectedWeek?.message}
            hint="Format: RRRR-WTT (np. 2026-W05)"
          >
            <Input
              id="expectedWeek"
              type="week"
              placeholder="2026-W01"
              {...register('expectedWeek')}
              disabled={isPending}
            />
          </FormField>

          {/* Ilość */}
          <FormField
            id="quantity"
            label="Ilość"
            required
            error={errors.quantity?.message}
          >
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Wprowadź ilość"
              {...register('quantity')}
              disabled={isPending}
            />
          </FormField>

          {/* Status */}
          <FormField
            id="status"
            label="Status"
            error={errors.status?.message}
          >
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Oczekujące</SelectItem>
                    <SelectItem value="confirmed">Potwierdzone</SelectItem>
                    <SelectItem value="in_production">W produkcji</SelectItem>
                    <SelectItem value="completed">Zakończone</SelectItem>
                    <SelectItem value="cancelled">Anulowane</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Źródło - tylko przy dodawaniu */}
          {!isEdit && (
            <FormField
              id="source"
              label="Źródło"
              error={errors.source?.message}
            >
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger id="source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Zlecenie</SelectItem>
                      <SelectItem value="csv_import">Import CSV</SelectItem>
                      <SelectItem value="manual">Ręczne</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          {/* Powód edycji - TYLKO przy edycji */}
          {isEdit && (
            <FormField
              id="editReason"
              label="Powód edycji"
              required
              error={errors.editReason?.message}
              hint="Wymagane przy edycji ręcznej zapotrzebowania"
            >
              <Textarea
                id="editReason"
                placeholder="Opisz powód zmiany..."
                rows={3}
                {...register('editReason')}
                disabled={isPending}
              />
            </FormField>
          )}

          {/* Akcje */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
