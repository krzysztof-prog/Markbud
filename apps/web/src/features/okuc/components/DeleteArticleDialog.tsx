/**
 * Dialog potwierdzenia usunięcia artykułu OKUC
 *
 * Soft delete - artykuł zostaje oznaczony jako usunięty (deletedAt)
 * ale pozostaje w bazie danych dla historii.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { OkucArticle } from '@/types/okuc';

interface DeleteArticleDialogProps {
  article: OkucArticle | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export function DeleteArticleDialog({
  article,
  open,
  onClose,
  onConfirm,
  isPending,
}: DeleteArticleDialogProps) {
  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle>Czy na pewno usunąć artykuł?</DialogTitle>
              <DialogDescription asChild className="mt-2">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <span className="block">
                    Usuwasz artykuł:{' '}
                    <strong className="text-foreground">{article.articleId}</strong> -{' '}
                    <strong className="text-foreground">{article.name}</strong>
                  </span>
                  <span className="block">
                    Artykuł zostanie oznaczony jako usunięty (soft delete) i nie będzie widoczny na
                    listach, ale pozostanie w bazie danych dla historii.
                  </span>
                  {(article.stocks?.length ?? 0) > 0 && (
                    <span className="block text-amber-600 dark:text-amber-500">
                      <strong>Uwaga:</strong> Artykuł ma powiązane stany magazynowe. Upewnij się,
                      że nie jest używany w aktywnych zamówieniach.
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(article.id)}
            disabled={isPending}
          >
            {isPending ? 'Usuwanie...' : 'Usuń artykuł'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
