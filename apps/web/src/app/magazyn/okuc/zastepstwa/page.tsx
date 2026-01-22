/**
 * Strona zarządzania zastępstwami artykułów OKUC
 *
 * Moduł: DualStock (Okucia PVC + ALU)
 * Funkcje:
 * - Lista artykułów wygaszanych z ich zamiennikami
 * - Dodawanie nowych zastępstw
 * - Usuwanie zastępstw (cofnij wygaszanie)
 * - Ręczne przenoszenie zapotrzebowania
 *
 * Artykuł wygaszany:
 * - Można używać (RW) do wyczerpania
 * - NIE można zamawiać
 * - Zapotrzebowanie przechodzi na zamiennik gdy stan=0 lub ręcznie
 */

'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, ArrowRight, Trash2, RefreshCw, Info, Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useOkucReplacements, useRemoveReplacement, useTransferDemand } from '@/features/okuc/hooks';
import { AddReplacementDialog } from '@/features/okuc/components/AddReplacementDialog';
import type { ArticleReplacement } from '@/types/okuc';

export default function OkucReplacementsPage() {
  // === DATA FETCHING ===
  const { data: replacements = [], isLoading, error } = useOkucReplacements();

  // === STATE ===
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedForRemove, setSelectedForRemove] = useState<ArticleReplacement | null>(null);
  const [selectedForTransfer, setSelectedForTransfer] = useState<ArticleReplacement | null>(null);

  // === MUTATIONS ===
  const removeMutation = useRemoveReplacement();
  const transferMutation = useTransferDemand();

  // === HANDLERS ===
  const handleRemoveReplacement = () => {
    if (!selectedForRemove) return;
    removeMutation.mutate(selectedForRemove.oldArticle.id, {
      onSuccess: () => setSelectedForRemove(null),
    });
  };

  const handleTransferDemand = () => {
    if (!selectedForTransfer) return;
    transferMutation.mutate(selectedForTransfer.oldArticle.id, {
      onSuccess: () => setSelectedForTransfer(null),
    });
  };

  // === BREADCRUMB ===
  const breadcrumbItems = [
    { label: 'Magazyn OKUC', href: '/magazyn/okuc' },
    { label: 'Zastępstwa artykułów', href: '/magazyn/okuc/zastepstwa' },
  ];

  // === RENDER ===
  return (
    <div className="min-h-screen bg-background">
      <Header title="Zastępstwa artykułów" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Back link */}
        <Link href="/magazyn/okuc" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Powrót do magazynu OKUC
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Zastępstwa artykułów</h1>
            <p className="text-muted-foreground">
              Zarządzaj artykułami wygaszanymi i ich zamiennikami
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zastępstwo
          </Button>
        </div>

        {/* Info card */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Jak działają zastępstwa?</AlertTitle>
          <AlertDescription className="text-sm">
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Artykuł wygaszany</strong> - można używać (RW) do wyczerpania, ale NIE można zamawiać</li>
              <li><strong>Zamiennik</strong> - przejmuje zapotrzebowanie gdy stan starego artykułu = 0</li>
              <li><strong>Ręczne przeniesienie</strong> - możesz ręcznie przenieść zapotrzebowanie w dowolnym momencie</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Main content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lista zastępstw
            </CardTitle>
            <CardDescription>
              {replacements.length === 0
                ? 'Brak zdefiniowanych zastępstw'
                : `${replacements.length} artykuł(ów) wygaszanych`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Ładowanie...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                Błąd ładowania danych
              </div>
            ) : replacements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p>Brak zdefiniowanych zastępstw</p>
                <p className="text-sm">Kliknij &quot;Dodaj zastępstwo&quot; aby zacząć</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artykuł wygaszany</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Zamiennik</TableHead>
                    <TableHead className="text-right">Stan</TableHead>
                    <TableHead className="text-right">Oczekujące</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacements.map((item) => (
                    <TableRow key={item.oldArticle.id}>
                      {/* Stary artykuł */}
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.oldArticle.articleId}</div>
                          <div className="text-sm text-muted-foreground">{item.oldArticle.name}</div>
                        </div>
                      </TableCell>

                      {/* Strzałka */}
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>

                      {/* Nowy artykuł */}
                      <TableCell>
                        {item.newArticle ? (
                          <div>
                            <div className="font-medium">{item.newArticle.articleId}</div>
                            <div className="text-sm text-muted-foreground">{item.newArticle.name}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Nie przypisano</span>
                        )}
                      </TableCell>

                      {/* Stan */}
                      <TableCell className="text-right">
                        <span className={item.oldArticle.currentStock === 0 ? 'text-destructive font-medium' : ''}>
                          {item.oldArticle.currentStock}
                        </span>
                      </TableCell>

                      {/* Oczekujące zapotrzebowanie */}
                      <TableCell className="text-right">
                        {item.pendingDemandCount > 0 ? (
                          <Badge variant="secondary">{item.pendingDemandCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {item.demandTransferredAt ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Przeniesione
                          </Badge>
                        ) : item.oldArticle.currentStock === 0 && item.pendingDemandCount === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Wyczerpany
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Aktywny
                          </Badge>
                        )}
                      </TableCell>

                      {/* Akcje */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Przenieś ręcznie - tylko gdy są oczekujące i jest zamiennik */}
                          {item.pendingDemandCount > 0 && item.newArticle && !item.demandTransferredAt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedForTransfer(item)}
                              disabled={transferMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Przenieś
                            </Button>
                          )}

                          {/* Usuń zastępstwo */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedForRemove(item)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog dodawania zastępstwa */}
      <AddReplacementDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Dialog potwierdzenia usunięcia */}
      <AlertDialog open={!!selectedForRemove} onOpenChange={() => setSelectedForRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cofnij wygaszanie artykułu?</AlertDialogTitle>
            <AlertDialogDescription>
              Artykuł <strong>{selectedForRemove?.oldArticle.articleId}</strong> przestanie być wygaszany
              i będzie można go ponownie zamawiać.
              {selectedForRemove?.pendingDemandCount ? (
                <span className="block mt-2 text-amber-600">
                  Uwaga: {selectedForRemove.pendingDemandCount} pozycji zapotrzebowania pozostanie przy tym artykule.
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveReplacement}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Usuwanie...' : 'Cofnij wygaszanie'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog potwierdzenia przeniesienia */}
      <AlertDialog open={!!selectedForTransfer} onOpenChange={() => setSelectedForTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Przenieść zapotrzebowanie?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                Przeniesiesz <strong>{selectedForTransfer?.pendingDemandCount}</strong> pozycji zapotrzebowania:
              </span>
              <span className="block mt-2">
                <strong>{selectedForTransfer?.oldArticle.articleId}</strong>
                {' → '}
                <strong>{selectedForTransfer?.newArticle?.articleId}</strong>
              </span>
              <span className="block mt-2 text-amber-600">
                Ta operacja jest nieodwracalna.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferMutation.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferDemand}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? 'Przenoszenie...' : 'Przenieś zapotrzebowanie'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
