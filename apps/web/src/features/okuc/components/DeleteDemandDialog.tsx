/**
 * Dialog potwierdzenia usunięcia zapotrzebowania
 *
 * Features:
 * - Wyświetla informacje o zapotrzebowaniu do usunięcia
 * - Przycisk Anuluj + Usuń
 * - Disabled podczas isPending
 *
 * Props:
 * - demand: OkucDemand | null - zapotrzebowanie do usunięcia
 * - open: boolean - czy dialog jest otwarty
 * - onClose: () => void - callback zamknięcia
 * - onConfirm: (id: number) => void - callback potwierdzenia
 * - isPending: boolean - czy trwa usuwanie
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { OkucDemand } from '@/types/okuc';

interface DeleteDemandDialogProps {
  demand: OkucDemand | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

/** Format tygodnia: "2026-W02" → "Tydzień 2, 2026" */
const formatWeek = (weekString: string): string => {
  const match = weekString.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekString;
  const [, year, week] = match;
  return `Tydzień ${parseInt(week, 10)}, ${year}`;
};

export function DeleteDemandDialog({
  demand,
  open,
  onClose,
  onConfirm,
  isPending,
}: DeleteDemandDialogProps) {
  if (!demand) return null;

  const handleConfirm = () => {
    onConfirm(demand.id);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Czy na pewno chcesz usunąć to zapotrzebowanie?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Ta operacja jest nieodwracalna. Zapotrzebowanie zostanie trwale usunięte.</p>

              {/* Informacje o zapotrzebowaniu */}
              <div className="bg-muted/50 rounded-lg p-3 mt-4 space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-semibold text-foreground">Artykuł:</span>
                  <span className="text-foreground">
                    {demand.article?.articleId || `ID: ${demand.articleId}`}
                  </span>

                  <span className="font-semibold text-foreground">Tydzień:</span>
                  <span className="text-foreground">{formatWeek(demand.expectedWeek)}</span>

                  <span className="font-semibold text-foreground">Ilość:</span>
                  <span className="text-foreground font-mono">{demand.quantity} szt.</span>

                  <span className="font-semibold text-foreground">Status:</span>
                  <span className="text-foreground capitalize">{demand.status}</span>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={onClose}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Usuwanie...' : 'Usuń zapotrzebowanie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
