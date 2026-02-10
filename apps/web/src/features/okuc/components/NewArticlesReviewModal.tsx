/**
 * NewArticlesReviewModal - Modal do weryfikacji nowych artykułów
 *
 * Wyświetla się gdy podczas importu zapotrzebowania zostały utworzone
 * nowe artykuły z orderClass='pending_review'.
 * Użytkownik może wybrać dla każdego artykułu czy jest 'typical' czy 'atypical'.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOkucArticlesPendingReview,
  useBatchUpdateOrderClass,
} from '@/features/okuc/hooks';
import type { OkucArticle } from '@/types/okuc';

interface ArticleClassSelection {
  id: number;
  orderClass: 'typical' | 'atypical';
}

interface NewArticlesReviewModalProps {
  /** Czy modal jest otwarty */
  open: boolean;
  /** Callback zamknięcia modalu */
  onOpenChange: (open: boolean) => void;
}

export const NewArticlesReviewModal: React.FC<NewArticlesReviewModalProps> = ({
  open,
  onOpenChange,
}) => {
  // Pobierz artykuły oczekujące na weryfikację
  const { data: pendingArticles = [], isLoading, refetch } = useOkucArticlesPendingReview();

  // Stan lokalny - wybory użytkownika
  const [selections, setSelections] = useState<Record<number, 'typical' | 'atypical'>>({});

  // Mutation do batch update
  const { mutate: batchUpdate, isPending } = useBatchUpdateOrderClass({
    onSuccess: () => {
      setSelections({});
      refetch();
      // Zamknij modal jeśli nie ma więcej artykułów
      if (pendingArticles.length <= Object.keys(selections).length) {
        onOpenChange(false);
      }
    },
  });

  // Handler zmiany orderClass dla artykułu
  const handleSelectionChange = useCallback((articleId: number, orderClass: 'typical' | 'atypical') => {
    setSelections(prev => ({
      ...prev,
      [articleId]: orderClass,
    }));
  }, []);

  // Ustaw wszystkie na "typical"
  const handleSetAllTypical = useCallback(() => {
    const newSelections: Record<number, 'typical' | 'atypical'> = {};
    pendingArticles.forEach(article => {
      newSelections[article.id] = 'typical';
    });
    setSelections(newSelections);
  }, [pendingArticles]);

  // Ustaw wszystkie na "atypical"
  const handleSetAllAtypical = useCallback(() => {
    const newSelections: Record<number, 'typical' | 'atypical'> = {};
    pendingArticles.forEach(article => {
      newSelections[article.id] = 'atypical';
    });
    setSelections(newSelections);
  }, [pendingArticles]);

  // Przygotuj dane do wysłania
  const articlesToUpdate = useMemo((): ArticleClassSelection[] => {
    return Object.entries(selections).map(([id, orderClass]) => ({
      id: parseInt(id, 10),
      orderClass,
    }));
  }, [selections]);

  // Ile artykułów ma wybór
  const selectedCount = Object.keys(selections).length;
  const totalCount = pendingArticles.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  // Handler zapisu
  const handleSave = useCallback(() => {
    if (articlesToUpdate.length > 0) {
      batchUpdate(articlesToUpdate);
    }
  }, [articlesToUpdate, batchUpdate]);

  // Nie pokazuj modalu jeśli nie ma artykułów do weryfikacji
  if (!open || (pendingArticles.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="pr-12 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Nowe artykuły wymagają weryfikacji
          </DialogTitle>
          <DialogDescription>
            Podczas importu zapotrzebowania utworzono {totalCount} nowych artykułów.
            Wybierz dla każdego czy jest typowy (standard) czy atypowy (specjalny).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Przyciski "Ustaw wszystkie" */}
              <div className="flex gap-2 mb-4 pb-4 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetAllTypical}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Ustaw wszystkie jako typowe
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetAllAtypical}
                  disabled={isPending}
                >
                  <XCircle className="h-4 w-4 mr-2 text-amber-600" />
                  Ustaw wszystkie jako atypowe
                </Button>
              </div>

              {/* Lista artykułów */}
              {pendingArticles.map((article: OkucArticle) => (
                <div
                  key={article.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    selections[article.id] ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono font-medium text-sm">
                          {article.articleId}
                        </span>
                        {article.usedInPvc && (
                          <Badge variant="secondary" className="text-xs">PVC</Badge>
                        )}
                        {article.usedInAlu && (
                          <Badge variant="secondary" className="text-xs">ALU</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {article.name}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selections[article.id] === 'typical' ? 'default' : 'outline'}
                        onClick={() => handleSelectionChange(article.id, 'typical')}
                        disabled={isPending}
                        className={cn(
                          'transition-all',
                          selections[article.id] === 'typical' && 'bg-green-600 hover:bg-green-700'
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Typowy
                      </Button>
                      <Button
                        size="sm"
                        variant={selections[article.id] === 'atypical' ? 'default' : 'outline'}
                        onClick={() => handleSelectionChange(article.id, 'atypical')}
                        disabled={isPending}
                        className={cn(
                          'transition-all',
                          selections[article.id] === 'atypical' && 'bg-amber-600 hover:bg-amber-700'
                        )}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Atypowy
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4 shrink-0">
          <p className="text-sm text-muted-foreground">
            Wybrano: <strong>{selectedCount}</strong> z <strong>{totalCount}</strong> artykułów
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !allSelected}
            >
              {isPending ? 'Zapisywanie...' : `Zapisz (${selectedCount})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewArticlesReviewModal;
