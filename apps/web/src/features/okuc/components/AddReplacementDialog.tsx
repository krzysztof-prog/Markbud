/**
 * Dialog dodawania zastępstwa artykułu
 *
 * Pozwala wybrać:
 * - Artykuł do wygaszenia (stary)
 * - Artykuł zastępujący (nowy)
 *
 * Walidacja:
 * - Artykuły muszą być różne
 * - Nowy artykuł nie może być już wygaszany
 * - Nie może tworzyć cyklicznych zależności
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useOkucArticles } from '@/features/okuc/hooks/useOkucArticles';
import { useSetReplacement } from '@/features/okuc/hooks/useOkucReplacements';

interface AddReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReplacementDialog({ open, onOpenChange }: AddReplacementDialogProps) {
  // === DATA ===
  const { data: articles = [] } = useOkucArticles();

  // === STATE ===
  const [oldArticleId, setOldArticleId] = useState<string>('');
  const [newArticleId, setNewArticleId] = useState<string>('');

  // === MUTATIONS ===
  const setMutation = useSetReplacement();

  // === COMPUTED ===
  // Artykuły dostępne jako "stare" (do wygaszenia)
  // - Wszystkie które nie są już wygaszane
  const oldArticleOptions = useMemo(() => {
    return articles.filter((a) => !a.isPhaseOut);
  }, [articles]);

  // Artykuły dostępne jako "nowe" (zamienniki)
  // - Wszystkie które nie są już wygaszane
  // - Nie może być ten sam co wybrany stary
  const newArticleOptions = useMemo(() => {
    return articles.filter((a) => !a.isPhaseOut && a.id.toString() !== oldArticleId);
  }, [articles, oldArticleId]);

  // Walidacja
  const canSubmit = oldArticleId && newArticleId && oldArticleId !== newArticleId;

  // === HANDLERS ===
  const handleSubmit = () => {
    if (!canSubmit) return;

    setMutation.mutate(
      {
        oldArticleId: parseInt(oldArticleId, 10),
        newArticleId: parseInt(newArticleId, 10),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setOldArticleId('');
    setNewArticleId('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // === RENDER ===
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj zastępstwo artykułu</DialogTitle>
          <DialogDescription>
            Wybierz artykuł do wygaszenia i jego zamiennik. Artykuł wygaszany będzie można
            używać (RW) do wyczerpania, ale nie będzie zamawiany.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Stary artykuł (do wygaszenia) */}
          <div className="grid gap-2">
            <Label htmlFor="oldArticle">Artykuł do wygaszenia</Label>
            <Select value={oldArticleId} onValueChange={setOldArticleId}>
              <SelectTrigger id="oldArticle">
                <SelectValue placeholder="Wybierz artykuł..." />
              </SelectTrigger>
              <SelectContent>
                {oldArticleOptions.map((article) => (
                  <SelectItem key={article.id} value={article.id.toString()}>
                    <span className="font-medium">{article.articleId}</span>
                    <span className="text-muted-foreground ml-2">- {article.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strzałka */}
          {oldArticleId && (
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* Nowy artykuł (zamiennik) */}
          <div className="grid gap-2">
            <Label htmlFor="newArticle">Artykuł zastępujący</Label>
            <Select
              value={newArticleId}
              onValueChange={setNewArticleId}
              disabled={!oldArticleId}
            >
              <SelectTrigger id="newArticle">
                <SelectValue placeholder={oldArticleId ? 'Wybierz zamiennik...' : 'Najpierw wybierz artykuł do wygaszenia'} />
              </SelectTrigger>
              <SelectContent>
                {newArticleOptions.map((article) => (
                  <SelectItem key={article.id} value={article.id.toString()}>
                    <span className="font-medium">{article.articleId}</span>
                    <span className="text-muted-foreground ml-2">- {article.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          {oldArticleId && newArticleId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Po ustawieniu zastępstwa:
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>Artykuł <strong>{articles.find(a => a.id.toString() === oldArticleId)?.articleId}</strong> zostanie oznaczony jako wygaszany</li>
                  <li>Zapotrzebowanie automatycznie przejdzie na zamiennik gdy stan = 0</li>
                  <li>Możesz ręcznie przenieść zapotrzebowanie w dowolnym momencie</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || setMutation.isPending}
          >
            {setMutation.isPending ? 'Zapisywanie...' : 'Dodaj zastępstwo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
