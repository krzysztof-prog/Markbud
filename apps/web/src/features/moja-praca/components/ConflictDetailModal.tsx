'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useConflictDetail, useResolveConflict } from '../api/mojaPracaApi';
import type { ImportConflict, ConflictAction } from '../types';

interface ConflictDetailModalProps {
  conflict: ImportConflict | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConflictDetailModal: React.FC<ConflictDetailModalProps> = ({
  conflict,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<ConflictAction | null>(null);

  const { data: detail, isLoading } = useConflictDetail(conflict?.id ?? 0);
  const { mutate: resolveConflict, isPending } = useResolveConflict();

  const handleResolve = (action: ConflictAction) => {
    if (!conflict) return;

    resolveConflict(
      { id: conflict.id, input: { action } },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({
              title: 'Konflikt rozwiązany',
              description: result.message,
            });
            onOpenChange(false);
          } else {
            toast({
              title: 'Błąd',
              description: result.message,
              variant: 'destructive',
            });
          }
        },
        onError: (error) => {
          toast({
            title: 'Błąd',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (!conflict) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Konflikt importu: {conflict.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Wykryto konflikt z istniejącym zleceniem {conflict.baseOrderNumber}.
            Wybierz jak chcesz rozwiązać ten konflikt.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Porównanie */}
            <div className="grid grid-cols-2 gap-4">
              {/* Istniejące zlecenie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Istniejące zlecenie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{detail.baseOrder.orderNumber}</div>
                    {detail.baseOrder.client && (
                      <div className="text-sm">Klient: {detail.baseOrder.client}</div>
                    )}
                    {detail.baseOrder.project && (
                      <div className="text-sm">Projekt: {detail.baseOrder.project}</div>
                    )}
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Okna:</span>{' '}
                        <span className="font-medium">{detail.baseOrder.totalWindows ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Szyby:</span>{' '}
                        <span className="font-medium">{detail.baseOrder.totalGlasses ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nowe zlecenie */}
              <Card className="border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">
                    Nowe zlecenie (z pliku)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{conflict.orderNumber}</div>
                    {detail.parsedData?.client && (
                      <div className="text-sm">Klient: {detail.parsedData.client}</div>
                    )}
                    {detail.parsedData?.project && (
                      <div className="text-sm">Projekt: {detail.parsedData.project}</div>
                    )}
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Okna:</span>{' '}
                        <span className="font-medium">{conflict.newWindowsCount ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Szyby:</span>{' '}
                        <span className="font-medium">{conflict.newGlassCount ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sugestia systemu */}
            {conflict.systemSuggestion && (
              <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Sugestia systemu: </span>
                  {conflict.systemSuggestion === 'replace_base' && (
                    <span>Zastąp bazowe zlecenie (liczby okien i szyb się zgadzają)</span>
                  )}
                  {conflict.systemSuggestion === 'keep_both' && (
                    <span>Zachowaj oba zlecenia</span>
                  )}
                  {conflict.systemSuggestion === 'manual' && (
                    <span>Wymaga ręcznej decyzji (liczby się różnią)</span>
                  )}
                </div>
              </div>
            )}

            {/* Opcje rozwiązania */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Wybierz akcję:</h4>

              <div className="grid gap-2">
                <Button
                  variant={selectedAction === 'replace_base' ? 'default' : 'outline'}
                  className="justify-start h-auto py-3"
                  onClick={() => setSelectedAction('replace_base')}
                  disabled={isPending}
                >
                  <div className="text-left">
                    <div className="font-medium">Zastąp bazowe zlecenie</div>
                    <div className="text-xs text-muted-foreground">
                      Usuń {detail.baseOrder.orderNumber} i zaimportuj dane jako to zlecenie
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedAction === 'keep_both' ? 'default' : 'outline'}
                  className="justify-start h-auto py-3"
                  onClick={() => setSelectedAction('keep_both')}
                  disabled={isPending}
                >
                  <div className="text-left">
                    <div className="font-medium">Zachowaj oba zlecenia</div>
                    <div className="text-xs text-muted-foreground">
                      Zaimportuj {conflict.orderNumber} jako nowy wariant obok {detail.baseOrder.orderNumber}
                    </div>
                  </div>
                </Button>

                <Button
                  variant={selectedAction === 'cancel' ? 'secondary' : 'ghost'}
                  className="justify-start h-auto py-3"
                  onClick={() => setSelectedAction('cancel')}
                  disabled={isPending}
                >
                  <div className="text-left">
                    <div className="font-medium">Anuluj import</div>
                    <div className="text-xs text-muted-foreground">
                      Nie importuj tego pliku, zachowaj istniejące zlecenie
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Zamknij
          </Button>
          <Button
            onClick={() => selectedAction && handleResolve(selectedAction)}
            disabled={!selectedAction || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Przetwarzanie...
              </>
            ) : (
              'Potwierdź'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictDetailModal;
