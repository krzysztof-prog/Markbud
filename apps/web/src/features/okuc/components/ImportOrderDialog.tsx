/**
 * Dialog importu zamówienia OKUC z pliku XLSX
 *
 * Flow:
 * 1. Upload pliku XLSX
 * 2. Podgląd: pozycje zamówienia + brakujące artykuły
 * 3. Zatwierdzenie i utworzenie zamówienia
 *
 * Format XLSX od dostawcy:
 * - Kolumna B: numer artykułu
 * - Kolumna C: opis artykułu
 * - Kolumna D: ilość i data wysyłki (np. "1 000 12.01.2026")
 * - Kolumna E: cena w EUR (np. "0,02 EUR")
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Package,
  Euro,
  Calendar,
  Loader2,
} from 'lucide-react';
import { okucOrdersApi } from '@/features/okuc/api';
import { useToast } from '@/components/ui/use-toast';
import type {
  ParsedOrderImport,
  ConfirmOrderImportResult,
  MissingArticleToCreate,
} from '@/types/okuc';

type ImportStep = 'upload' | 'preview' | 'result';

interface ImportOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportOrderDialogProps) {
  const { toast } = useToast();

  // Stan procesu importu
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);

  // Dane z parsowania XLSX
  const [parsedData, setParsedData] = useState<ParsedOrderImport | null>(null);
  const [missingArticlesToCreate, setMissingArticlesToCreate] = useState<
    Map<string, MissingArticleToCreate>
  >(new Map());
  const [createMissingArticles, setCreateMissingArticles] = useState(false);

  // Wynik importu
  const [importResult, setImportResult] = useState<ConfirmOrderImportResult | null>(null);

  // Oblicz datę dostawy (shippingDate + 1 dzień)
  const expectedDeliveryDate = useMemo(() => {
    if (!parsedData || parsedData.items.length === 0) return null;

    // Znajdź najwcześniejszą datę wysyłki
    const dates = parsedData.items
      .map((item) => new Date(item.shippingDate))
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length === 0) return null;

    const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    // Dodaj 1 dzień
    earliestDate.setDate(earliestDate.getDate() + 1);
    return earliestDate;
  }, [parsedData]);

  // Reset stanu przy zamknięciu
  const handleClose = useCallback(() => {
    setStep('upload');
    setParsedData(null);
    setMissingArticlesToCreate(new Map());
    setCreateMissingArticles(false);
    setImportResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // Upload pliku i parsowanie
  const handleFileUpload = useCallback(
    async (file: File) => {
      const filename = file.name.toLowerCase();
      if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
        toast({
          title: 'Nieprawidłowy format pliku',
          description: 'Wybierz plik XLSX lub XLS',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      try {
        const result = await okucOrdersApi.parseImport(file);
        setParsedData(result);

        // Przygotuj mapę brakujących artykułów z domyślnymi nazwami
        const missing = new Map<string, MissingArticleToCreate>();
        result.missingArticles.forEach((article) => {
          missing.set(article.articleId, {
            articleId: article.articleId,
            name: article.description || article.articleId,
          });
        });
        setMissingArticlesToCreate(missing);
        setCreateMissingArticles(result.missingArticles.length > 0);

        setStep('preview');

        if (result.items.length === 0) {
          toast({
            title: 'Brak danych',
            description: 'Plik XLSX nie zawiera prawidłowych danych zamówienia.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Błąd parsowania',
          description: error instanceof Error ? error.message : 'Nieznany błąd',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Aktualizacja nazwy brakującego artykułu
  const updateMissingArticleName = useCallback((articleId: string, name: string) => {
    setMissingArticlesToCreate((prev) => {
      const next = new Map(prev);
      const existing = next.get(articleId);
      if (existing) {
        next.set(articleId, { ...existing, name });
      }
      return next;
    });
  }, []);

  // Wykonaj import
  const handleImport = useCallback(async () => {
    if (!parsedData || !expectedDeliveryDate) return;

    setIsLoading(true);
    try {
      const result = await okucOrdersApi.confirmImport({
        items: parsedData.items.map((item) => ({
          articleId: item.articleId,
          quantity: item.quantity,
          priceEur: item.priceEur,
        })),
        expectedDeliveryDate: expectedDeliveryDate.toISOString(),
        createMissingArticles,
        missingArticlesToCreate: createMissingArticles
          ? Array.from(missingArticlesToCreate.values())
          : undefined,
      });

      setImportResult(result);
      setStep('result');

      toast({
        title: 'Zamówienie utworzone',
        description: `Utworzono zamówienie ${result.order.orderNumber} z ${result.order.itemsCount} pozycjami`,
        variant: 'success',
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Błąd tworzenia zamówienia',
        description: error instanceof Error ? error.message : 'Nieznany błąd',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    parsedData,
    expectedDeliveryDate,
    createMissingArticles,
    missingArticlesToCreate,
    toast,
    onSuccess,
  ]);

  // Formatowanie ceny EUR
  const formatPriceEur = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  // Suma wartości zamówienia
  const totalValue = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.items.reduce((sum, item) => sum + item.quantity * item.priceEur, 0);
  }, [parsedData]);

  // Łączna ilość pozycji
  const totalQuantity = useMemo(() => {
    if (!parsedData) return 0;
    return parsedData.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [parsedData]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import zamówienia z XLSX'}
            {step === 'preview' && 'Podgląd zamówienia'}
            {step === 'result' && 'Zamówienie utworzone'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Wybierz plik XLSX z potwierdzeniem zamówienia od dostawcy'}
            {step === 'preview' && 'Sprawdź dane przed utworzeniem zamówienia'}
            {step === 'result' && 'Podsumowanie utworzonego zamówienia'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="py-8">
            <Label
              htmlFor="xlsx-file"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <span className="text-sm text-muted-foreground">Analizowanie pliku...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                  <span className="text-sm text-muted-foreground">
                    Kliknij lub przeciągnij plik XLSX
                  </span>
                  <span className="text-xs text-muted-foreground mt-2">
                    Format: B=numer, C=opis, D=ilość+data, E=cena EUR
                  </span>
                </>
              )}
              <Input
                id="xlsx-file"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={isLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
              />
            </Label>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            {/* Podsumowanie */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="px-3 py-1.5">
                <Package className="w-4 h-4 mr-2" />
                Pozycji: {parsedData.items.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1.5">
                <Package className="w-4 h-4 mr-2" />
                Łącznie: {totalQuantity} szt.
              </Badge>
              <Badge variant="outline" className="px-3 py-1.5">
                <Euro className="w-4 h-4 mr-2" />
                Wartość: {formatPriceEur(totalValue)}
              </Badge>
              {expectedDeliveryDate && (
                <Badge variant="outline" className="px-3 py-1.5">
                  <Calendar className="w-4 h-4 mr-2" />
                  Dostawa: {expectedDeliveryDate.toLocaleDateString('pl-PL')}
                </Badge>
              )}
              {parsedData.missingArticles.length > 0 && (
                <Badge variant="destructive" className="px-3 py-1.5">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Brakuje: {parsedData.missingArticles.length} artykułów
                </Badge>
              )}
            </div>

            {/* Zakładki */}
            <Tabs defaultValue="items" className="w-full">
              <TabsList>
                <TabsTrigger value="items">Pozycje ({parsedData.items.length})</TabsTrigger>
                {parsedData.missingArticles.length > 0 && (
                  <TabsTrigger value="missing">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Brakujące ({parsedData.missingArticles.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Pozycje zamówienia */}
              <TabsContent value="items">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artykuł</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="text-right">Ilość</TableHead>
                        <TableHead className="text-right">Cena EUR</TableHead>
                        <TableHead className="text-right">Data wysyłki</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{item.articleId}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {item.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatPriceEur(item.priceEur)}</TableCell>
                          <TableCell className="text-right">{formatDate(item.shippingDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Brakujące artykuły */}
              {parsedData.missingArticles.length > 0 && (
                <TabsContent value="missing">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Poniższe artykuły nie istnieją w bazie. Możesz je automatycznie utworzyć
                      zaznaczając opcję poniżej.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <Checkbox
                      id="create-missing"
                      checked={createMissingArticles}
                      onCheckedChange={(checked) => setCreateMissingArticles(checked === true)}
                    />
                    <Label htmlFor="create-missing" className="cursor-pointer">
                      Utwórz brakujące artykuły automatycznie
                    </Label>
                  </div>

                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numer artykułu</TableHead>
                          <TableHead>Nazwa (edytowalna)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.missingArticles.map((article) => (
                          <TableRow key={article.articleId}>
                            <TableCell className="font-mono">{article.articleId}</TableCell>
                            <TableCell>
                              <Input
                                value={missingArticlesToCreate.get(article.articleId)?.name || ''}
                                onChange={(e) =>
                                  updateMissingArticleName(article.articleId, e.target.value)
                                }
                                disabled={!createMissingArticles}
                                placeholder="Nazwa artykułu"
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {/* STEP 3: Result */}
        {step === 'result' && importResult && (
          <div className="py-4 space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Zamówienie utworzone:</strong> {importResult.order.orderNumber}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>Pozycji: {importResult.order.itemsCount}</span>
                  {importResult.articlesCreated > 0 && (
                    <span>Utworzono artykułów: {importResult.articlesCreated}</span>
                  )}
                  {importResult.pricesUpdated > 0 && (
                    <span>Zaktualizowano cen: {importResult.pricesUpdated}</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Data dostawy:{' '}
                  {new Date(importResult.order.expectedDeliveryDate).toLocaleDateString('pl-PL')}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Anuluj
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Wstecz
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  isLoading ||
                  !parsedData ||
                  parsedData.items.length === 0 ||
                  (parsedData.missingArticles.length > 0 && !createMissingArticles)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  'Utwórz zamówienie'
                )}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>Zamknij</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
