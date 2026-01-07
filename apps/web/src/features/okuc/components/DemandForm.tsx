/**
 * Formularz dodawania/edycji zapotrzebowania OKUC
 *
 * Features:
 * - Dodawanie nowego zapotrzebowania
 * - Edycja istniejącego zapotrzebowania (z polem editReason)
 * - Wybór artykułu z listy
 * - Wybór tygodnia (HTML native week input)
 * - Walidacja ilości (minimum 1)
 * - Auto-close po submit
 *
 * Props:
 * - demand: OkucDemand | null - zapotrzebowanie do edycji (null = dodawanie)
 * - open: boolean - czy dialog jest otwarty
 * - onOpenChange: (open: boolean) => void - callback zmiany stanu
 * - onSubmit: (data: any) => void - callback wysyłania formularza
 * - isPending: boolean - czy trwa zapisywanie
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useOkucArticles } from '@/features/okuc/hooks';
import type { OkucDemand, DemandStatus, DemandSource, CreateDemandInput, UpdateDemandInput } from '@/types/okuc';

interface DemandFormProps {
  demand: OkucDemand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDemandInput | UpdateDemandInput) => void;
  isPending: boolean;
}

export function DemandForm({ demand, open, onOpenChange, onSubmit, isPending }: DemandFormProps) {
  const isEdit = !!demand;

  // === DATA FETCHING ===
  const { data: articles = [], isLoading: isLoadingArticles } = useOkucArticles();

  // === FORM STATE ===
  const [articleId, setArticleId] = useState<string>('');
  const [expectedWeek, setExpectedWeek] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState<DemandStatus>('pending');
  const [source, setSource] = useState<DemandSource>('manual');
  const [editReason, setEditReason] = useState('');

  // === RESET FORM ON OPEN/CLOSE ===
  useEffect(() => {
    if (open) {
      if (demand) {
        // Edycja - załaduj dane z demand
        setArticleId(demand.articleId.toString());
        setExpectedWeek(demand.expectedWeek);
        setQuantity(demand.quantity.toString());
        setStatus(demand.status);
        setSource(demand.source);
        setEditReason(''); // Wyczyść edit reason
      } else {
        // Dodawanie - wyczyść formularz
        setArticleId('');
        setExpectedWeek('');
        setQuantity('');
        setStatus('pending');
        setSource('manual');
        setEditReason('');
      }
    }
  }, [open, demand]);

  // === VALIDATION ===
  const isValid = () => {
    if (!articleId || !expectedWeek || !quantity) return false;
    if (parseInt(quantity, 10) < 1) return false;
    if (isEdit && !editReason.trim()) return false; // Edycja wymaga powodu
    return true;
  };

  // === SUBMIT ===
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;

    const quantityNum = parseInt(quantity, 10);

    if (isEdit) {
      // Edycja - tylko pola które mogą się zmienić
      const data: UpdateDemandInput = {
        quantity: quantityNum,
        status,
        expectedWeek,
        editReason: editReason.trim(),
      };
      onSubmit(data);
    } else {
      // Dodawanie
      const data: CreateDemandInput = {
        articleId: parseInt(articleId, 10),
        expectedWeek,
        quantity: quantityNum,
        status,
        source,
      };
      onSubmit(data);
    }
  };

  // === RENDER ===
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Artykuł - tylko przy dodawaniu */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="articleId" className="required">
                Artykuł
              </Label>
              <Select value={articleId} onValueChange={setArticleId} required>
                <SelectTrigger id="articleId" disabled={isLoadingArticles}>
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
            </div>
          )}

          {/* Tydzień */}
          <div className="space-y-2">
            <Label htmlFor="expectedWeek" className="required">
              Tydzień
            </Label>
            <Input
              id="expectedWeek"
              type="week"
              value={expectedWeek}
              onChange={(e) => setExpectedWeek(e.target.value)}
              placeholder="2026-W01"
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Wybierz tydzień w formacie RRRR-WTT (np. 2026-W05)
            </p>
          </div>

          {/* Ilość */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="required">
              Ilość
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Wprowadź ilość"
              required
              disabled={isPending}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DemandStatus)}>
              <SelectTrigger id="status" disabled={isPending}>
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
          </div>

          {/* Źródło - tylko przy dodawaniu */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="source">Źródło</Label>
              <Select value={source} onValueChange={(v) => setSource(v as DemandSource)}>
                <SelectTrigger id="source" disabled={isPending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Zlecenie</SelectItem>
                  <SelectItem value="csv_import">Import CSV</SelectItem>
                  <SelectItem value="manual">Ręczne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Powód edycji - TYLKO przy edycji */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="editReason" className="required">
                Powód edycji
              </Label>
              <Textarea
                id="editReason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Opisz powód zmiany..."
                rows={3}
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Wymagane przy edycji ręcznej zapotrzebowania
              </p>
            </div>
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
            <Button type="submit" disabled={!isValid() || isPending}>
              {isPending ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
