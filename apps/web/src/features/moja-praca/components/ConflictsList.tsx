'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/useToast';
import { useConflicts, useResolveConflict, useBulkResolveConflicts } from '../api/mojaPracaApi';
import type { ImportConflict } from '../types';

/**
 * Sprawdza czy konflikt nie ma rozbieżności w liczbach okien i szyb
 * (liczby identyczne = można bezpiecznie zastąpić)
 */
function isConflictWithoutDiscrepancy(conflict: ImportConflict): boolean {
  return (
    conflict.existingWindowsCount === conflict.newWindowsCount &&
    conflict.existingGlassCount === conflict.newGlassCount
  );
}

interface ConflictsListProps {
  onSelectConflict: (conflict: ImportConflict) => void;
  status?: 'pending' | 'resolved' | 'all';
}

export const ConflictsList: React.FC<ConflictsListProps> = ({
  onSelectConflict,
  status = 'pending',
}) => {
  const { toast } = useToast();
  const { data: conflicts, isLoading, error } = useConflicts(status);
  const resolveConflict = useResolveConflict();
  const bulkResolve = useBulkResolveConflicts();

  // Stan dla dialogu "Zastąp wszystkie"
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Oblicz konflikty bez rozbieżności (można bezpiecznie zastąpić)
  const conflictsWithoutDiscrepancy = useMemo(() => {
    if (!conflicts) return [];
    return conflicts.filter(
      (c) => c.status === 'pending' && isConflictWithoutDiscrepancy(c)
    );
  }, [conflicts]);

  // Szybkie zastąpienie pojedynczego konfliktu (bez potwierdzenia)
  const handleQuickReplace = async (conflict: ImportConflict, e: React.MouseEvent) => {
    e.stopPropagation(); // Nie otwieraj modala szczegółów

    resolveConflict.mutate(
      { id: conflict.id, input: { action: 'replace_base' } },
      {
        onSuccess: () => {
          toast({
            title: 'Zastąpiono',
            description: `Zlecenie ${conflict.baseOrderNumber} zostało zastąpione`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Błąd',
            description: error instanceof Error ? error.message : 'Nie udało się zastąpić',
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Zastąp wszystkie bez rozbieżności
  const handleBulkReplace = async () => {
    const ids = conflictsWithoutDiscrepancy.map((c) => c.id);

    bulkResolve.mutate(
      { ids, action: 'replace_base' },
      {
        onSuccess: (result) => {
          setShowBulkDialog(false);
          toast({
            title: 'Zastąpiono zbiorczo',
            description: `Pomyślnie zastąpiono ${result.successCount} zleceń`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Błąd',
            description: error instanceof Error ? error.message : 'Nie udało się zastąpić',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Błąd ładowania konfliktów: {error.message}
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <p className="text-lg font-medium">Brak konfliktów do rozwiązania</p>
        <p className="text-sm">Wszystkie importy zostały przetworzone automatycznie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Przycisk "Zastąp wszystkie bez konfliktów" - pokazuj tylko gdy są takie konflikty */}
      {conflictsWithoutDiscrepancy.length > 0 && status === 'pending' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    {conflictsWithoutDiscrepancy.length} konfliktów bez rozbieżności
                  </p>
                  <p className="text-sm text-blue-700">
                    Liczby okien i szyb się zgadzają - można bezpiecznie zastąpić
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowBulkDialog(true)}
                disabled={bulkResolve.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {bulkResolve.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Zastąp wszystkie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista konfliktów */}
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            onClick={() => onSelectConflict(conflict)}
            onQuickReplace={handleQuickReplace}
            isResolving={resolveConflict.isPending}
            resolvingId={resolveConflict.variables?.id}
          />
        ))}
      </div>

      {/* Dialog potwierdzenia "Zastąp wszystkie" */}
      <BulkReplaceDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        conflicts={conflictsWithoutDiscrepancy}
        onConfirm={handleBulkReplace}
        isPending={bulkResolve.isPending}
      />
    </div>
  );
};

interface ConflictCardProps {
  conflict: ImportConflict;
  onClick: () => void;
  onQuickReplace: (conflict: ImportConflict, e: React.MouseEvent) => void;
  isResolving: boolean;
  resolvingId?: number;
}

const ConflictCard: React.FC<ConflictCardProps> = ({
  conflict,
  onClick,
  onQuickReplace,
  isResolving,
  resolvingId,
}) => {
  const canQuickReplace =
    conflict.status === 'pending' && isConflictWithoutDiscrepancy(conflict);
  const isThisResolving = isResolving && resolvingId === conflict.id;

  const getSuggestionBadge = () => {
    switch (conflict.systemSuggestion) {
      case 'replace_base':
        return <Badge variant="default" className="bg-blue-500">Sugestia: Zastąp bazowe</Badge>;
      case 'keep_both':
        return <Badge variant="secondary">Sugestia: Zachowaj oba</Badge>;
      default:
        return <Badge variant="outline">Wymaga decyzji</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (conflict.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="font-semibold text-lg">{conflict.orderNumber}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">{conflict.baseOrderNumber}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {getSuggestionBadge()}
              {conflict.documentAuthor && (
                <Badge variant="outline">{conflict.documentAuthor}</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="mr-4">
                Istniejące: {conflict.existingWindowsCount ?? '?'} okien, {conflict.existingGlassCount ?? '?'} szyb
              </span>
              <span>
                Nowe: {conflict.newWindowsCount ?? '?'} okien, {conflict.newGlassCount ?? '?'} szyb
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Plik: {conflict.filename}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Przycisk "Zastąp" - tylko gdy liczby się zgadzają */}
            {canQuickReplace && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => onQuickReplace(conflict, e)}
                disabled={isThisResolving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isThisResolving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Zastąp'
                )}
              </Button>
            )}
            <Button variant="outline" size="sm">
              Rozwiąż
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Dialog potwierdzenia dla "Zastąp wszystkie"
 */
interface BulkReplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ImportConflict[];
  onConfirm: () => void;
  isPending: boolean;
}

const BulkReplaceDialog: React.FC<BulkReplaceDialogProps> = ({
  open,
  onOpenChange,
  conflicts,
  onConfirm,
  isPending,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zastąp wszystkie zlecenia bez rozbieżności</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz zastąpić {conflicts.length} zleceń?
            Dla wszystkich poniższych konfliktów liczby okien i szyb się zgadzają.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-2">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
              >
                <div>
                  <span className="font-medium">{conflict.orderNumber}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{conflict.baseOrderNumber}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {conflict.newWindowsCount} okien, {conflict.newGlassCount} szyb
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Anuluj
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Zastępowanie...
              </>
            ) : (
              `Zastąp ${conflicts.length} zleceń`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictsList;
