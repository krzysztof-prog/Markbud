'use client';

import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Upload, FileText, AlertTriangle } from 'lucide-react';
import { okucStockApi } from '../api';
import { useToast } from '@/components/ui/use-toast';
import type {
  ImportStockPreviewResponse,
  ImportStockConflict,
} from '@/types/okuc';

interface ImportStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'preview' | 'result';
type ConflictResolution = 'skip' | 'overwrite' | 'selective';

/**
 * Dialog do importu stanu magazynowego z pliku CSV
 *
 * Obsługuje:
 * - Upload pliku CSV z walidacją
 * - Podgląd nowych pozycji i konfliktów
 * - Wybór strategii rozwiązania konfliktów (skip/overwrite/selective)
 * - Wyświetlenie wyniku importu
 *
 * Format CSV (separator: średnik):
 * Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
 */
export function ImportStockDialog({ open, onOpenChange, onSuccess }: ImportStockDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Preview data
  const [previewData, setPreviewData] = useState<ImportStockPreviewResponse | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());

  // Result data
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: Array<{ articleId: string; error: string }>;
  } | null>(null);

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state
      setStep('upload');
      setFile(null);
      setPreviewData(null);
      setConflictResolution('skip');
      setSelectedConflicts(new Set());
      setImportResult(null);
    }
    onOpenChange(newOpen);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Nieprawidłowy format pliku',
          description: 'Proszę wybrać plik CSV',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  // Upload file and get preview
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const preview = await okucStockApi.importPreview(file);
      setPreviewData(preview);
      setStep('preview');

      // Show summary toast
      toast({
        title: 'Podgląd importu',
        description: `Nowe: ${preview.new.length}, Konflikty: ${preview.conflicts.length}, Błędy: ${preview.errors.length}`,
      });
    } catch (error) {
      console.error('Preview failed:', error);
      toast({
        title: 'Błąd podglądu importu',
        description: error instanceof Error ? error.message : 'Nie udało się przetworzyć pliku',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Execute import
  const handleImport = async () => {
    if (!previewData) return;

    setIsImporting(true);
    try {
      const result = await okucStockApi.import({
        items: [...previewData.new, ...previewData.conflicts.map((c) => ({
          articleId: c.articleId,
          warehouseType: c.warehouseType,
          subWarehouse: c.subWarehouse,
          currentQuantity: c.newData.currentQuantity,
          minStock: c.newData.minStock,
          maxStock: c.newData.maxStock,
        }))],
        conflictResolution,
        selectedConflicts:
          conflictResolution === 'selective'
            ? Array.from(selectedConflicts).map((key) => {
                const [articleId, warehouseType, subWarehouse] = key.split('|');
                return { articleId, warehouseType, subWarehouse: subWarehouse || undefined };
              })
            : undefined,
      });

      setImportResult(result);
      setStep('result');

      // Call success callback if provided
      if (result.imported > 0 && onSuccess) {
        onSuccess();
      }

      toast({
        title: 'Import zakończony',
        description: `Zaimportowano: ${result.imported}, Pominięto: ${result.skipped}`,
      });
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Błąd importu',
        description: error instanceof Error ? error.message : 'Nie udało się zaimportować danych',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle conflict selection (for selective mode)
  const toggleConflict = (conflict: ImportStockConflict) => {
    const key = `${conflict.articleId}|${conflict.warehouseType}|${conflict.subWarehouse || ''}`;
    const newSet = new Set(selectedConflicts);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedConflicts(newSet);
  };

  const isConflictSelected = (conflict: ImportStockConflict) => {
    const key = `${conflict.articleId}|${conflict.warehouseType}|${conflict.subWarehouse || ''}`;
    return selectedConflicts.has(key);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import stanu magazynowego</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Wybierz plik CSV ze stanem magazynowym do zaimportowania'}
            {step === 'preview' && 'Sprawdź dane przed importem i wybierz sposób rozwiązania konfliktów'}
            {step === 'result' && 'Wynik importu'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Format CSV (separator: średnik):</strong>
                <br />
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  Numer artykulu;Typ magazynu;Podmagazyn;Stan aktualny;Stan minimalny;Stan maksymalny
                </code>
                <br />
                <br />
                <strong>Przykład:</strong>
                <br />
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  A123;PVC;Produkcja;100;50;200
                </code>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="file">Plik CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Wybrany plik: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Nowe pozycje:</strong> {previewData.new.length}
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <strong>Konflikty:</strong> {previewData.conflicts.length}
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <strong>Błędy:</strong> {previewData.errors.length}
                </AlertDescription>
              </Alert>
            </div>

            {/* Conflict Resolution Strategy */}
            {previewData.conflicts.length > 0 && (
              <div className="space-y-3">
                <Label>Sposób rozwiązania konfliktów:</Label>
                <RadioGroup value={conflictResolution} onValueChange={(v) => setConflictResolution(v as ConflictResolution)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="cursor-pointer">
                      Pomiń konflikty - zachowaj istniejące dane
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite" className="cursor-pointer">
                      Nadpisz wszystkie - użyj danych z CSV
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selective" id="selective" />
                    <Label htmlFor="selective" className="cursor-pointer">
                      Wybierz ręcznie które nadpisać
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Conflicts List (for selective mode) */}
            {conflictResolution === 'selective' && previewData.conflicts.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                <Label className="font-semibold">Zaznacz konflikty do nadpisania:</Label>
                {previewData.conflicts.map((conflict, idx) => (
                  <div key={idx} className="flex items-start space-x-2 p-2 border-b last:border-b-0">
                    <Checkbox
                      id={`conflict-${idx}`}
                      checked={isConflictSelected(conflict)}
                      onCheckedChange={() => toggleConflict(conflict)}
                    />
                    <Label htmlFor={`conflict-${idx}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-semibold">{conflict.articleId}</span> ({conflict.warehouseType}
                      {conflict.subWarehouse && ` - ${conflict.subWarehouse}`})
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Istniejący: {conflict.existingData.currentQuantity} szt. → Nowy: {conflict.newData.currentQuantity} szt.
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {/* Errors List */}
            {previewData.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="font-semibold text-red-600">Błędy walidacji:</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-red-50">
                  {previewData.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-700 mb-1">
                      Wiersz {error.row}: {error.error}
                      {error.articleId && ` (${error.articleId})`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Import zakończony pomyślnie!</strong>
                <br />
                Zaimportowano: {importResult.imported} pozycji
                <br />
                Pominięto: {importResult.skipped} pozycji
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Błędy podczas importu:</strong>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, idx) => (
                      <div key={idx} className="text-sm">
                        {error.articleId}: {error.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUpload} disabled={!file || isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Przetwarzanie...' : 'Podgląd importu'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Wstecz
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || (previewData?.new.length === 0 && previewData?.conflicts.length === 0)}
              >
                {isImporting ? 'Importowanie...' : 'Importuj'}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={() => handleOpenChange(false)}>Zamknij</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
