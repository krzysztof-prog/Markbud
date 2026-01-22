/**
 * Dialog importu artykulow OKUC z podgladem konfliktow
 *
 * Flow:
 * 1. Upload pliku CSV
 * 2. Podglad: nowe, konflikty, bledy
 * 3. Wybor rozwiazania konfliktow
 * 4. Import i podsumowanie
 *
 * Format CSV: Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn
 */

'use client';

import { useState, useCallback } from 'react';
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
import {
  Upload,
  FileWarning,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { okucArticlesApi } from '@/features/okuc/api';
import { useToast } from '@/components/ui/use-toast';
import type {
  ImportArticlePreviewItem,
  ImportArticleConflict,
  ImportArticleError,
  ImportArticlesResult,
} from '@/types/okuc';

type ImportStep = 'upload' | 'preview' | 'result';
type ConflictResolution = 'skip' | 'overwrite' | 'selective';

interface ImportArticlesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportArticlesDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportArticlesDialogProps) {
  const { toast } = useToast();

  // Stan procesu importu
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);

  // Dane z podgladu
  const [newItems, setNewItems] = useState<ImportArticlePreviewItem[]>([]);
  const [conflicts, setConflicts] = useState<ImportArticleConflict[]>([]);
  const [errors, setErrors] = useState<ImportArticleError[]>([]);

  // Rozwiazanie konfliktow
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());

  // Wynik importu
  const [importResult, setImportResult] = useState<ImportArticlesResult | null>(null);

  // Reset stanu przy zamknieciu
  const handleClose = useCallback(() => {
    setStep('upload');
    setNewItems([]);
    setConflicts([]);
    setErrors([]);
    setConflictResolution('skip');
    setSelectedConflicts(new Set());
    setImportResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  // Upload pliku i podglad
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Nieprawidlowy format pliku',
        description: 'Wybierz plik CSV (z rozszerzeniem .csv)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const preview = await okucArticlesApi.importPreview(file);

      setNewItems(preview.new);
      setConflicts(preview.conflicts);
      setErrors(preview.errors);
      setStep('preview');

      if (preview.new.length === 0 && preview.conflicts.length === 0) {
        toast({
          title: 'Brak danych do importu',
          description: 'Plik CSV nie zawiera prawidlowych danych lub wszystkie wiersze maja bledy.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Blad podgladu importu',
        description: error instanceof Error ? error.message : 'Nieznany blad',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Wykonaj import
  const handleImport = useCallback(async () => {
    // Polacz nowe artykuly + konflikty (jesli nadpisywane)
    const allItems = [...newItems];

    if (conflictResolution === 'overwrite') {
      // Dodaj wszystkie konflikty jako artykuly do importu
      conflicts.forEach((c) => {
        allItems.push({
          articleId: c.articleId,
          name: c.newData.name,
          usedInPvc: c.newData.usedInPvc,
          usedInAlu: c.newData.usedInAlu,
          orderClass: c.newData.orderClass as 'typical' | 'atypical',
          sizeClass: c.newData.sizeClass as 'standard' | 'gabarat',
          warehouseType: c.newData.warehouseType,
        });
      });
    } else if (conflictResolution === 'selective') {
      // Dodaj tylko wybrane konflikty
      conflicts.forEach((c) => {
        if (selectedConflicts.has(c.articleId)) {
          allItems.push({
            articleId: c.articleId,
            name: c.newData.name,
            usedInPvc: c.newData.usedInPvc,
            usedInAlu: c.newData.usedInAlu,
            orderClass: c.newData.orderClass as 'typical' | 'atypical',
            sizeClass: c.newData.sizeClass as 'standard' | 'gabarat',
            warehouseType: c.newData.warehouseType,
          });
        }
      });
    }

    if (allItems.length === 0) {
      toast({
        title: 'Brak artykulow do importu',
        description: 'Nie wybrano zadnych artykulow do zaimportowania.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await okucArticlesApi.import({
        items: allItems,
        conflictResolution,
        selectedConflicts: Array.from(selectedConflicts),
      });

      setImportResult(result);
      setStep('result');

      if (result.imported > 0) {
        toast({
          title: 'Import zakonczony',
          description: `Zaimportowano ${result.imported} artykulow${
            result.skipped > 0 ? `, pominieto ${result.skipped}` : ''
          }`,
          variant: 'success',
        });
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: 'Blad importu',
        description: error instanceof Error ? error.message : 'Nieznany blad',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [newItems, conflicts, conflictResolution, selectedConflicts, onSuccess]);

  // Toggle konfliktu
  const toggleConflict = useCallback((articleId: string) => {
    setSelectedConflicts((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  }, []);

  // Zaznacz wszystkie konflikty
  const selectAllConflicts = useCallback(() => {
    setSelectedConflicts(new Set(conflicts.map((c) => c.articleId)));
  }, [conflicts]);

  // Odznacz wszystkie konflikty
  const deselectAllConflicts = useCallback(() => {
    setSelectedConflicts(new Set());
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import artykulow z CSV'}
            {step === 'preview' && 'Podglad importu'}
            {step === 'result' && 'Wynik importu'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && (
              <>
                Format CSV: <code>Numer artykulu;Nazwa;PVC;ALU;Typ zamowienia;Klasa wielkosci;Magazyn</code>
                <br />
                Separator: srednik (;), wartosci logiczne: Tak/Nie
              </>
            )}
            {step === 'preview' && 'Sprawdz dane przed importem i wybierz jak rozwiazac konflikty'}
            {step === 'result' && 'Podsumowanie wykonanego importu'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="py-8">
            <Label
              htmlFor="csv-file"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
                  <span className="text-sm text-muted-foreground">Analizowanie pliku...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                  <span className="text-sm text-muted-foreground">
                    Kliknij lub przeciagnij plik CSV
                  </span>
                </>
              )}
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
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
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Podsumowanie */}
            <div className="flex gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Nowe: {newItems.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <FileWarning className="w-4 h-4 mr-2 text-yellow-500" />
                Konflikty: {conflicts.length}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                Bledy: {errors.length}
              </Badge>
            </div>

            {/* Zakladki */}
            <Tabs defaultValue="new" className="w-full">
              <TabsList>
                <TabsTrigger value="new">Nowe ({newItems.length})</TabsTrigger>
                <TabsTrigger value="conflicts">Konflikty ({conflicts.length})</TabsTrigger>
                <TabsTrigger value="errors">Bledy ({errors.length})</TabsTrigger>
              </TabsList>

              {/* Nowe artykuly */}
              <TabsContent value="new" className="max-h-64 overflow-y-auto">
                {newItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Brak nowych artykulow do importu
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numer</TableHead>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>PVC</TableHead>
                        <TableHead>ALU</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Wielkosc</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newItems.map((item) => (
                        <TableRow key={item.articleId}>
                          <TableCell className="font-mono">{item.articleId}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.usedInPvc ? 'Tak' : 'Nie'}</TableCell>
                          <TableCell>{item.usedInAlu ? 'Tak' : 'Nie'}</TableCell>
                          <TableCell>
                            <Badge variant={item.orderClass === 'typical' ? 'default' : 'secondary'}>
                              {item.orderClass === 'typical' ? 'Typowy' : 'Atypowy'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.sizeClass === 'standard' ? 'outline' : 'destructive'}>
                              {item.sizeClass === 'standard' ? 'Standard' : 'Gabarat'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Konflikty */}
              <TabsContent value="conflicts" className="max-h-64 overflow-y-auto">
                {conflicts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Brak konfliktow
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Opcje rozwiazania konfliktow */}
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <Label className="text-sm font-medium">Rozwiazanie:</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={conflictResolution === 'skip' ? 'default' : 'outline'}
                          onClick={() => setConflictResolution('skip')}
                        >
                          Pomin wszystkie
                        </Button>
                        <Button
                          size="sm"
                          variant={conflictResolution === 'overwrite' ? 'default' : 'outline'}
                          onClick={() => setConflictResolution('overwrite')}
                        >
                          Nadpisz wszystkie
                        </Button>
                        <Button
                          size="sm"
                          variant={conflictResolution === 'selective' ? 'default' : 'outline'}
                          onClick={() => setConflictResolution('selective')}
                        >
                          Wybierz recznie
                        </Button>
                      </div>
                    </div>

                    {/* Tabela konfliktow */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {conflictResolution === 'selective' && (
                            <TableHead className="w-12">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1"
                                  onClick={selectAllConflicts}
                                >
                                  Wszystkie
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1"
                                  onClick={deselectAllConflicts}
                                >
                                  Zadne
                                </Button>
                              </div>
                            </TableHead>
                          )}
                          <TableHead>Numer</TableHead>
                          <TableHead>Istniejaca nazwa</TableHead>
                          <TableHead className="text-center">
                            <ArrowRight className="w-4 h-4 mx-auto" />
                          </TableHead>
                          <TableHead>Nowa nazwa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conflicts.map((conflict) => (
                          <TableRow key={conflict.articleId}>
                            {conflictResolution === 'selective' && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedConflicts.has(conflict.articleId)}
                                  onCheckedChange={() => toggleConflict(conflict.articleId)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono">{conflict.articleId}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {conflict.existingData.name}
                            </TableCell>
                            <TableCell className="text-center">
                              <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-medium">{conflict.newData.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Bledy */}
              <TabsContent value="errors" className="max-h-64 overflow-y-auto">
                {errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Brak bledow
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wiersz</TableHead>
                        <TableHead>Numer</TableHead>
                        <TableHead>Blad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="font-mono">{error.articleId || '-'}</TableCell>
                          <TableCell className="text-destructive">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* STEP 3: Result */}
        {step === 'result' && importResult && (
          <div className="py-4 space-y-4">
            <Alert variant={importResult.imported > 0 ? 'default' : 'destructive'}>
              <AlertDescription className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Zaimportowano: <strong>{importResult.imported}</strong></span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5 text-yellow-500" />
                    <span>Pominieto: <strong>{importResult.skipped}</strong></span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span>Bledy: <strong>{importResult.errors.length}</strong></span>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numer</TableHead>
                      <TableHead>Blad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.errors.map((error, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{error.articleId}</TableCell>
                        <TableCell className="text-destructive">{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
                disabled={isLoading || (newItems.length === 0 && conflicts.length === 0)}
              >
                {isLoading ? 'Importowanie...' : 'Importuj'}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>
              Zamknij
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
