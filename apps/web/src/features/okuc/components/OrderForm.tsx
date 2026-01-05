/**
 * Formularz tworzenia/edycji zamówienia OKUC
 *
 * Tryby: create | edit
 * Pola: basketType, notes, items (lista pozycji)
 * Pozycje: articleId, quantity, estimatedPrice (grosze!), deliveryWeek
 *
 * KRYTYCZNE:
 * - plnToGrosze() przy wysyłaniu
 * - groszeToPln() przy wyświetlaniu
 * - NIGDY parseFloat!
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Grosze, PLN } from '@/lib/money';
import { useOkucArticles } from '@/features/okuc/hooks';

interface OrderFormProps {
  mode: 'create' | 'edit';
  order?: OkucOrder;
  onSubmit: (data: CreateOkucOrderInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

interface OrderItemFormData {
  articleId: number;
  orderedQty: number;
  unitPrice: number; // w PLN dla wyświetlania (konwersja do groszy przy submit)
  deliveryWeek?: string; // Format: "2026-W01"
}

export function OrderForm({
  mode,
  order,
  onSubmit,
  onCancel,
  isPending = false,
}: OrderFormProps) {
  // State formularza
  const [basketType, setBasketType] = useState<BasketType>('typical_standard');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemFormData[]>([]);

  // State dla nowej pozycji
  const [newItemArticleId, setNewItemArticleId] = useState<number | ''>('');
  const [newItemQuantity, setNewItemQuantity] = useState<number | ''>('');
  const [newItemPrice, setNewItemPrice] = useState<string>(''); // String dla input (PLN)
  const [newItemWeek, setNewItemWeek] = useState('');

  // Błędy walidacji
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pobierz artykuły dla selecta
  const { data: articles = [], isLoading: articlesLoading } = useOkucArticles();

  // Inicjalizacja formularza w trybie edit
  useEffect(() => {
    if (mode === 'edit' && order) {
      setBasketType(order.basketType);
      setNotes(order.notes || '');

      // Konwertuj pozycje z groszy na PLN dla wyświetlania
      if (order.items && order.items.length > 0) {
        const formattedItems = order.items.map(item => ({
          articleId: item.articleId,
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice ? groszeToPln(item.unitPrice as Grosze) : 0,
          deliveryWeek: '', // Backend nie ma tego pola w OkucOrderItem, może być undefined
        }));
        setItems(formattedItems);
      }
    }
  }, [mode, order]);

  // Dodaj pozycję do listy
  const handleAddItem = () => {
    const newErrors: Record<string, string> = {};

    // Walidacja nowej pozycji
    if (!newItemArticleId) {
      newErrors.articleId = 'Wybierz artykuł';
    }
    if (!newItemQuantity || newItemQuantity <= 0) {
      newErrors.quantity = 'Ilość musi być większa niż 0';
    }
    if (newItemPrice && isNaN(parseFloat(newItemPrice))) {
      newErrors.price = 'Cena musi być liczbą';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Dodaj pozycję
    const newItem: OrderItemFormData = {
      articleId: newItemArticleId as number,
      orderedQty: newItemQuantity as number,
      unitPrice: newItemPrice ? parseFloat(newItemPrice) : 0,
      deliveryWeek: newItemWeek || undefined,
    };

    setItems([...items, newItem]);

    // Wyczyść formularz nowej pozycji
    setNewItemArticleId('');
    setNewItemQuantity('');
    setNewItemPrice('');
    setNewItemWeek('');
    setErrors({});
  };

  // Usuń pozycję z listy
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Walidacja i submit formularza
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Walidacja
    if (!basketType) {
      newErrors.basketType = 'Wybierz typ koszyka';
    }
    if (items.length === 0) {
      newErrors.items = 'Dodaj co najmniej jedną pozycję';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Konwertuj pozycje (PLN → grosze)
    const formattedItems = items.map(item => ({
      articleId: item.articleId,
      orderedQty: item.orderedQty,
      unitPrice: item.unitPrice > 0 ? plnToGrosze(item.unitPrice as PLN) : 0,
    }));

    // Przygotuj dane do wysłania
    const data: CreateOkucOrderInput = {
      basketType,
      items: formattedItems,
      notes: notes || undefined,
    };

    onSubmit(data);
  };

  // Czy można edytować pozycje (tylko dla draft/pending w trybie edit)
  const canEditItems = mode === 'create' || (order && (order.status === 'draft' || order.status === 'pending_approval'));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Typ koszyka */}
      <div className="space-y-2">
        <Label htmlFor="basketType">
          Typ koszyka <span className="text-destructive">*</span>
        </Label>
        <Select
          value={basketType}
          onValueChange={(value) => setBasketType(value as BasketType)}
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
        {errors.basketType && (
          <p className="text-sm text-destructive">{errors.basketType}</p>
        )}
      </div>

      {/* Notatki */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notatki</Label>
        <Textarea
          id="notes"
          placeholder="Dodatkowe informacje do zamówienia..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>

      {/* Lista pozycji */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Pozycje zamówienia <span className="text-destructive">*</span></Label>
          {errors.items && (
            <p className="text-sm text-destructive">{errors.items}</p>
          )}
        </div>

        {items.length > 0 && (
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
                {items.map((item, index) => {
                  const article = articles.find(a => a.id === item.articleId);
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {article?.articleId || `ID: ${item.articleId}`}
                        {article?.name && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({article.name})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.orderedQty}</TableCell>
                      <TableCell className="text-right">
                        {item.unitPrice > 0 ? item.unitPrice.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell>{item.deliveryWeek || '-'}</TableCell>
                      {canEditItems && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isPending}
                            title="Usuń pozycję"
                          >
                            <Trash2 className="h-4 w-4" />
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
              <div className="space-y-2">
                <Label htmlFor="newItemArticleId">Artykuł</Label>
                <Select
                  value={newItemArticleId ? String(newItemArticleId) : ''}
                  onValueChange={(value) => setNewItemArticleId(Number(value))}
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
                {errors.articleId && (
                  <p className="text-sm text-destructive">{errors.articleId}</p>
                )}
              </div>

              {/* Ilość */}
              <div className="space-y-2">
                <Label htmlFor="newItemQuantity">Ilość</Label>
                <Input
                  id="newItemQuantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value ? Number(e.target.value) : '')}
                  disabled={isPending}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity}</p>
                )}
              </div>

              {/* Cena (PLN) */}
              <div className="space-y-2">
                <Label htmlFor="newItemPrice">Cena (PLN)</Label>
                <Input
                  id="newItemPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  disabled={isPending}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price}</p>
                )}
              </div>

              {/* Tydzień dostawy */}
              <div className="space-y-2">
                <Label htmlFor="newItemWeek">Tydzień</Label>
                <Input
                  id="newItemWeek"
                  type="week"
                  placeholder="2026-W01"
                  value={newItemWeek}
                  onChange={(e) => setNewItemWeek(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Przycisk dodaj */}
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddItem}
                  disabled={isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
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
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Zapisywanie...' : mode === 'create' ? 'Utwórz zamówienie' : 'Zapisz zmiany'}
        </Button>
      </div>
    </form>
  );
}
