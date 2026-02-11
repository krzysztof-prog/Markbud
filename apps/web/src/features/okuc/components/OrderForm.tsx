/**
 * Formularz tworzenia/edycji zamówienia OKUC
 *
 * Walidacja: React Hook Form + Zod
 * - Typ koszyka: wymagany
 * - Pozycje: minimum 1, każda z articleId i quantity > 0
 * - Cena: opcjonalna, jeśli podana to w PLN (konwersja do groszy przy submit)
 * - Błędy pokazywane inline pod polami (onBlur)
 *
 * KRYTYCZNE:
 * - plnToGrosze() przy wysyłaniu
 * - groszeToPln() przy wyświetlaniu
 * - NIGDY parseFloat na danych z bazy!
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import type { OkucOrder, BasketType, CreateOkucOrderInput } from '@/types/okuc';
import { plnToGrosze, groszeToPln } from '@/lib/money';
import type { PLN } from '@/lib/money';
import { useOkucArticles } from '@/features/okuc/hooks';

// Zod schema dla pozycji zamówienia
const orderItemSchema = z.object({
  articleId: z.number().min(1, 'Wybierz artykuł'),
  orderedQty: z.number().min(1, 'Ilość musi być większa od 0'),
  unitPrice: z.number().min(0).optional(), // PLN, opcjonalne
  deliveryWeek: z.string().optional(),
});

// Zod schema dla formularza zamówienia
const orderFormSchema = z.object({
  basketType: z.enum(['typical_standard', 'typical_gabarat', 'atypical'], {
    required_error: 'Wybierz typ koszyka',
  }),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Dodaj co najmniej jedną pozycję'),
});

// Zod schema dla formularza nowej pozycji
const newItemSchema = z.object({
  articleId: z.string().min(1, 'Wybierz artykuł'),
  quantity: z.string().min(1, 'Ilość jest wymagana').refine(
    (val) => parseInt(val, 10) >= 1,
    'Ilość musi być większa od 0'
  ),
  price: z.string().optional().refine(
    (val) => !val || !isNaN(parseFloat(val)),
    'Cena musi być liczbą'
  ),
  week: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;
type NewItemFormData = z.infer<typeof newItemSchema>;

interface OrderFormProps {
  mode: 'create' | 'edit';
  order?: OkucOrder;
  onSubmit: (data: CreateOkucOrderInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function OrderForm({
  mode,
  order,
  onSubmit,
  onCancel,
  isPending = false,
}: OrderFormProps) {
  // Pobierz artykuły dla selecta
  const { data: articles = [], isLoading: articlesLoading } = useOkucArticles();

  // Główny formularz z React Hook Form
  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onBlur',
    defaultValues: {
      basketType: 'typical_standard',
      notes: '',
      items: [],
    },
  });

  // useFieldArray dla dynamicznej listy pozycji
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Formularz dla nowej pozycji (osobny)
  const {
    register: registerNewItem,
    handleSubmit: handleNewItemSubmit,
    reset: resetNewItem,
    control: newItemControl,
    formState: { errors: newItemErrors },
  } = useForm<NewItemFormData>({
    resolver: zodResolver(newItemSchema),
    mode: 'onBlur',
    defaultValues: {
      articleId: '',
      quantity: '',
      price: '',
      week: '',
    },
  });

  // Stan dla błędu listy pozycji (pokazywany przy submit)
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Inicjalizacja formularza w trybie edit
  useEffect(() => {
    if (mode === 'edit' && order) {
      setValue('basketType', order.basketType);
      setValue('notes', order.notes || '');

      // Konwertuj pozycje z groszy na PLN dla wyświetlania
      if (order.items && order.items.length > 0) {
        const formattedItems = order.items.map(item => ({
          articleId: item.articleId,
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice ? groszeToPln(item.unitPrice) : 0,
          deliveryWeek: '',
        }));
        setValue('items', formattedItems);
      }
    }
  }, [mode, order, setValue]);

  // Dodaj pozycję do listy
  const handleAddItem = (data: NewItemFormData) => {
    const newItem = {
      articleId: parseInt(data.articleId, 10),
      orderedQty: parseInt(data.quantity, 10),
      unitPrice: data.price ? Number(data.price) : 0,
      deliveryWeek: data.week || undefined,
    };

    append(newItem);
    resetNewItem();
    setItemsError(null);
  };

  // Submit głównego formularza
  const onFormSubmit = (data: OrderFormData) => {
    if (data.items.length === 0) {
      setItemsError('Dodaj co najmniej jedną pozycję');
      return;
    }

    // Konwertuj pozycje (PLN → grosze)
    const formattedItems = data.items.map(item => ({
      articleId: item.articleId,
      orderedQty: item.orderedQty,
      unitPrice: item.unitPrice && item.unitPrice > 0
        ? plnToGrosze(item.unitPrice as PLN)
        : 0,
    }));

    const submitData: CreateOkucOrderInput = {
      basketType: data.basketType,
      items: formattedItems,
      notes: data.notes || undefined,
    };

    onSubmit(submitData);
  };

  // Czy można edytować pozycje (tylko dla draft/pending w trybie edit)
  const canEditItems = mode === 'create' || (order && (order.status === 'draft' || order.status === 'pending_approval'));

  // Obserwuj items dla walidacji
  const watchedItems = watch('items');

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Typ koszyka */}
      <FormField
        id="basketType"
        label="Typ koszyka"
        required
        error={errors.basketType?.message}
      >
        <Controller
          name="basketType"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isPending || !canEditItems}
            >
              <SelectTrigger id="basketType">
                <SelectValue placeholder="Wybierz typ koszyka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typical_standard">Typowy Standard</SelectItem>
                <SelectItem value="typical_gabarat">Typowy Gabaryty</SelectItem>
                <SelectItem value="atypical">Atypowy</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      {/* Notatki */}
      <FormField
        id="notes"
        label="Notatki"
        error={errors.notes?.message}
      >
        <Textarea
          id="notes"
          placeholder="Dodatkowe informacje do zamówienia..."
          {...register('notes')}
          disabled={isPending}
          rows={3}
        />
      </FormField>

      {/* Lista pozycji */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Pozycje zamówienia <span className="text-red-500">*</span>
          </span>
          {(errors.items?.message || itemsError) && (
            <p className="text-sm text-red-600">{errors.items?.message || itemsError}</p>
          )}
        </div>

        {fields.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artykuł ID</TableHead>
                  <TableHead className="text-right">Ilość</TableHead>
                  <TableHead className="text-right">Cena (PLN)</TableHead>
                  <TableHead>Tydzień dostawy</TableHead>
                  {canEditItems && <TableHead className="text-right">Akcje</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const item = watchedItems[index];
                  const article = articles.find(a => a.id === item?.articleId);
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        {article?.articleId || `ID: ${item?.articleId}`}
                        {article?.name && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({article.name})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item?.orderedQty}</TableCell>
                      <TableCell className="text-right">
                        {item?.unitPrice && item.unitPrice > 0 ? item.unitPrice.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell>{item?.deliveryWeek || '-'}</TableCell>
                      {canEditItems && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={isPending}
                            title="Usuń pozycję"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Usuń pozycję</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Formularz dodawania pozycji */}
        {canEditItems && (
          <div className="rounded-md border p-4 space-y-4">
            <h4 className="font-medium">Dodaj pozycję</h4>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Artykuł */}
              <FormField
                id="newItemArticleId"
                label="Artykuł"
                error={newItemErrors.articleId?.message}
              >
                <Controller
                  name="articleId"
                  control={newItemControl}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending || articlesLoading}
                    >
                      <SelectTrigger id="newItemArticleId">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={String(article.id)}>
                            {article.articleId} - {article.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              {/* Ilość */}
              <FormField
                id="newItemQuantity"
                label="Ilość"
                error={newItemErrors.quantity?.message}
              >
                <Input
                  id="newItemQuantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  {...registerNewItem('quantity')}
                  disabled={isPending}
                />
              </FormField>

              {/* Cena (PLN) */}
              <FormField
                id="newItemPrice"
                label="Cena (PLN)"
                error={newItemErrors.price?.message}
              >
                <Input
                  id="newItemPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...registerNewItem('price')}
                  disabled={isPending}
                />
              </FormField>

              {/* Tydzień dostawy */}
              <FormField
                id="newItemWeek"
                label="Tydzień"
                error={newItemErrors.week?.message}
              >
                <Input
                  id="newItemWeek"
                  type="week"
                  placeholder="2026-W01"
                  {...registerNewItem('week')}
                  disabled={isPending}
                />
              </FormField>

              {/* Przycisk dodaj */}
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNewItemSubmit(handleAddItem)}
                  disabled={isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Dodaj
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Przyciski akcji */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Anuluj
        </Button>
        <Button type="submit" disabled={isPending || fields.length === 0}>
          {isPending ? 'Zapisywanie...' : mode === 'create' ? 'Utwórz zamówienie' : 'Zapisz zmiany'}
        </Button>
      </div>
    </form>
  );
}
