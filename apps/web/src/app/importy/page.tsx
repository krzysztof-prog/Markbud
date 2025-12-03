'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { importsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { FileUp, Check, X, Eye, Clock, CheckCircle, XCircle, AlertCircle, Upload, Loader2, Trash2, FileSpreadsheet, FileText, FolderOpen, Calendar } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from '@/hooks/useToast';
import type { Import, ImportPreview } from '@/types';

export default function ImportyPage() {
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [csvDragging, setCsvDragging] = useState(false);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Stan dla importu z folderu
  const [folderPath, setFolderPath] = useState('');
  const [selectedDeliveryNumber, setSelectedDeliveryNumber] = useState<'I' | 'II' | 'III' | null>(null);
  const [folderScanResult, setFolderScanResult] = useState<{
    folderName: string;
    detectedDate: string | null;
    csvFiles: Array<{
      filename: string;
      relativePath: string;
      orderNumber: string;
      requirementsCount: number;
      windowsCount: number;
    }>;
    existingDeliveries: Array<{
      id: number;
      deliveryNumber: string | null;
    }>;
  } | null>(null);

  const { data: imports, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsApi.getAll(),
  });

  const { data: availableFolders } = useQuery({
    queryKey: ['available-folders'],
    queryFn: () => importsApi.listFolders(),
    refetchInterval: 30000, // Odświeżaj co 30s
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['import-preview', previewId],
    queryFn: () => importsApi.getPreview(previewId!) as Promise<any>,
    enabled: !!previewId,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'overwrite' | 'add_new' }) =>
      importsApi.approve(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      setPreviewId(null);
      toast({
        title: 'Import zatwierdzony',
        description: 'Plik został pomyślnie zaimportowany',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd importu',
        description: error?.message || 'Nie udało się zatwierdzić importu',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => importsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      setPreviewId(null);
      toast({
        title: 'Import odrzucony',
        description: 'Plik został pomyślnie odrzucony',
        variant: 'info',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error?.message || 'Nie udało się odrzucić importu',
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Simulate upload progress for better UX
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const result = await importsApi.upload(file);
        clearInterval(progressInterval);
        setUploadProgress(100);
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      setTimeout(() => setUploadProgress(0), 1000); // Reset after animation
      toast({
        title: 'Plik przesłany',
        description: 'Plik oczekuje na zatwierdzenie',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: 'Błąd przesyłania',
        description: error?.message || 'Nie udało się przesłać pliku',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => importsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Import usunięty',
        description: 'Import został pomyślnie usunięty',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd usuwania',
        description: error?.message || 'Nie udało się usunąć importu',
        variant: 'destructive',
      });
    },
  });

  // Mutacja skanowania folderu
  const scanFolderMutation = useMutation({
    mutationFn: (path: string) => importsApi.scanFolder(path),
    onSuccess: (data) => {
      setFolderScanResult(data);
      if (!data.detectedDate) {
        toast({
          title: 'Brak daty w nazwie folderu',
          description: 'Nazwa folderu powinna zawierać datę w formacie DD.MM.YYYY',
          variant: 'destructive',
        });
      } else if (data.csvFiles.length === 0) {
        toast({
          title: 'Brak plików CSV',
          description: 'Nie znaleziono plików CSV z "uzyte" lub "bele" w nazwie',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setFolderScanResult(null);
      toast({
        title: 'Błąd skanowania',
        description: error?.message || 'Nie udało się przeskanować folderu',
        variant: 'destructive',
      });
    },
  });

  // Mutacja importu z folderu
  const importFolderMutation = useMutation({
    mutationFn: ({ path, deliveryNumber }: { path: string; deliveryNumber: 'I' | 'II' | 'III' }) =>
      importsApi.importFolder(path, deliveryNumber),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });

      const { summary, delivery } = data;
      toast({
        title: 'Import zakończony',
        description: `Zaimportowano ${summary.successCount}/${summary.totalFiles} plików do dostawy ${delivery.deliveryNumber}${delivery.created ? ' (nowa)' : ''}`,
        variant: summary.failCount > 0 ? 'destructive' : 'success',
      });

      // Wyczyść stan
      setFolderPath('');
      setFolderScanResult(null);
      setSelectedDeliveryNumber(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd importu',
        description: error?.message || 'Nie udało się zaimportować plików',
        variant: 'destructive',
      });
    },
  });

  // Filtruj importy według typu
  const csvImports = imports?.filter((i: Import) => i.fileType === 'uzyte_bele') || [];
  const pdfImports = imports?.filter((i: Import) => i.fileType === 'ceny_pdf') || [];

  const pendingCsvImports = csvImports.filter((i: Import) => i.status === 'pending');
  const pendingPdfImports = pdfImports.filter((i: Import) => i.status === 'pending');

  const completedImports = imports?.filter((i: Import) => i.status === 'completed') || [];
  const errorImports = imports?.filter((i: Import) => i.status === 'error' || i.status === 'rejected') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Oczekuje</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Przetwarzanie</Badge>;
      case 'completed':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Zakończony</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Błąd</Badge>;
      case 'rejected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Odrzucony</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleFileSelect = (files: FileList | null, expectedType: 'csv' | 'pdf') => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (expectedType === 'csv' && ext !== 'csv') {
        toast({
          title: 'Nieprawidłowy format',
          description: `Plik "${file.name}" nie jest plikiem CSV!`,
          variant: 'destructive',
        });
        continue;
      }
      if (expectedType === 'pdf' && ext !== 'pdf') {
        toast({
          title: 'Nieprawidłowy format',
          description: `Plik "${file.name}" nie jest plikiem PDF!`,
          variant: 'destructive',
        });
        continue;
      }

      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Importy plików" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Import z folderu */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <FolderOpen className="h-5 w-5" />
              Import z folderu (automatyczny)
            </CardTitle>
            <CardDescription>
              Podaj ścieżkę do folderu z datą w nazwie (DD.MM.YYYY) - wszystkie pliki CSV zostaną automatycznie przypisane do dostawy
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Lista dostępnych folderów */}
            {availableFolders && availableFolders.folders.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Dostępne foldery z datami:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableFolders.folders.map((folder) => {
                    const isScanning = folderPath === folder.path && scanFolderMutation.isPending;
                    const isSelected = folderPath === folder.path;

                    return (
                      <Button
                        key={folder.path}
                        variant={isSelected ? 'default' : 'outline'}
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setFolderPath(folder.path);
                          scanFolderMutation.mutate(folder.path);
                        }}
                        disabled={scanFolderMutation.isPending}
                      >
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center gap-2">
                            {isScanning ? (
                              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                            ) : (
                              <FolderOpen className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">{folder.name}</span>
                          </div>
                          {folder.date && (
                            <span className="text-xs text-slate-500">
                              {new Date(folder.date).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded border">
                Brak folderów w {availableFolders?.basePath || 'C:\\Dostawy'}.
                <br />
                Możesz wpisać ścieżkę ręcznie poniżej lub skonfigurować IMPORTS_BASE_PATH w .env
              </div>
            )}

            {/* Ręczne wprowadzenie ścieżki */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Lub wpisz ścieżkę ręcznie:</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="folderPath"
                    type="text"
                    placeholder="C:\Dostawy\01.12.2025 lub \\server\share\01.12.2025"
                    value={folderPath}
                    onChange={(e) => {
                      setFolderPath(e.target.value);
                      // Wyczyść poprzednie wyniki skanowania przy zmianie ścieżki
                      setFolderScanResult(null);
                    }}
                    onKeyDown={(e) => {
                      // Skanuj po naciśnięciu Enter
                      if (e.key === 'Enter' && folderPath && !scanFolderMutation.isPending) {
                        scanFolderMutation.mutate(folderPath);
                      }
                    }}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={() => scanFolderMutation.mutate(folderPath)}
                  disabled={!folderPath || scanFolderMutation.isPending}
                  variant="outline"
                >
                  {scanFolderMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="ml-2">Skanuj</span>
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Kliknij folder powyżej lub wpisz ścieżkę ręcznie i naciśnij Enter
              </p>
            </div>

            {/* Wyniki skanowania */}
            {folderScanResult && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                {/* Info o folderze */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{folderScanResult.folderName}</p>
                    {folderScanResult.detectedDate && (
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Data dostawy: {new Date(folderScanResult.detectedDate).toLocaleDateString('pl-PL')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                    {folderScanResult.csvFiles.length} plików CSV
                  </Badge>
                </div>

                {/* Lista plików */}
                {folderScanResult.csvFiles.length > 0 && (
                  <div className="rounded border overflow-hidden bg-white max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left">Ścieżka / Plik</th>
                          <th className="px-3 py-2 text-left">Zlecenie</th>
                          <th className="px-3 py-2 text-center">Profile</th>
                          <th className="px-3 py-2 text-center">Okna</th>
                        </tr>
                      </thead>
                      <tbody>
                        {folderScanResult.csvFiles.map((file, i) => {
                          const isInSubfolder = file.relativePath.includes('\\') || file.relativePath.includes('/');
                          return (
                            <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-xs">{file.filename}</span>
                                  {isInSubfolder && (
                                    <span className="text-xs text-slate-500">
                                      📁 {file.relativePath.split(/[/\\]/)[0]}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 font-medium">{file.orderNumber}</td>
                              <td className="px-3 py-2 text-center">{file.requirementsCount}</td>
                              <td className="px-3 py-2 text-center">{file.windowsCount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Info o istniejących dostawach */}
                {folderScanResult.existingDeliveries.length > 0 && (
                  <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    Istniejące dostawy na tę datę: {folderScanResult.existingDeliveries.map(d => d.deliveryNumber || 'bez numeru').join(', ')}
                  </div>
                )}

                {/* Wybór numeru dostawy */}
                {folderScanResult.detectedDate && folderScanResult.csvFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Wybierz numer dostawy:</p>
                    <div className="flex gap-2">
                      {(['I', 'II', 'III'] as const).map((num) => {
                        const exists = folderScanResult.existingDeliveries.some(d => d.deliveryNumber === num);
                        return (
                          <Button
                            key={num}
                            variant={selectedDeliveryNumber === num ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedDeliveryNumber(num)}
                            className={exists ? 'border-amber-300' : ''}
                          >
                            {num}
                            {exists && <span className="ml-1 text-xs">(istnieje)</span>}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Przycisk importu */}
                {selectedDeliveryNumber && (
                  <Button
                    onClick={() => importFolderMutation.mutate({
                      path: folderPath,
                      deliveryNumber: selectedDeliveryNumber
                    })}
                    disabled={importFolderMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {importFolderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importowanie...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importuj {folderScanResult.csvFiles.length} plików do dostawy {selectedDeliveryNumber}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dwa panele obok siebie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel CSV - Użyte bele */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <FileSpreadsheet className="h-5 w-5" />
                Import CSV - Użyte bele
              </CardTitle>
              <CardDescription>
                Pliki CSV z danymi o zużyciu profili dla zleceń
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Strefa drop CSV */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  csvDragging
                    ? 'border-green-500 bg-green-50'
                    : 'border-green-300 hover:border-green-400 hover:bg-green-50/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setCsvDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setCsvDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setCsvDragging(false);
                  handleFileSelect(e.dataTransfer.files, 'csv');
                }}
                onClick={() => csvInputRef.current?.click()}
              >
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files, 'csv')}
                />
                <FileSpreadsheet className="h-10 w-10 mx-auto text-green-400 mb-3" />
                <p className="text-sm text-green-700 font-medium">
                  Przeciągnij plik CSV lub kliknij
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Format: *_uzyte_bele.csv
                </p>
              </div>

              {/* Oczekujące importy CSV */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Oczekujące ({pendingCsvImports.length})
                </h4>
                {pendingCsvImports.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pendingCsvImports.map((imp: Import) => (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{imp.filename}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(imp.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewId(imp.id)}
                            title="Podgląd"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: imp.id, action: 'add_new' })}
                            disabled={approveMutation.isPending}
                            title="Importuj"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectMutation.mutate(imp.id)}
                            disabled={rejectMutation.isPending}
                            title="Odrzuć"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Brak oczekujących plików CSV
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Panel PDF - Ceny */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <FileText className="h-5 w-5" />
                Import PDF - Ceny profili
              </CardTitle>
              <CardDescription>
                Pliki PDF z cennikami profili od dostawców
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Strefa drop PDF */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  pdfDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setPdfDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setPdfDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setPdfDragging(false);
                  handleFileSelect(e.dataTransfer.files, 'pdf');
                }}
                onClick={() => pdfInputRef.current?.click()}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files, 'pdf')}
                />
                <FileText className="h-10 w-10 mx-auto text-blue-400 mb-3" />
                <p className="text-sm text-blue-700 font-medium">
                  Przeciągnij plik PDF lub kliknij
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Format: cenniki profili (*.pdf)
                </p>
              </div>

              {/* Oczekujące importy PDF */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Oczekujące ({pendingPdfImports.length})
                </h4>
                {pendingPdfImports.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pendingPdfImports.map((imp: Import) => (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{imp.filename}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(imp.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewId(imp.id)}
                            title="Podgląd"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: imp.id, action: 'add_new' })}
                            disabled={approveMutation.isPending}
                            title="Importuj"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectMutation.mutate(imp.id)}
                            disabled={rejectMutation.isPending}
                            title="Odrzuć"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Brak oczekujących plików PDF
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status uploadu */}
        {uploadMutation.isPending && (
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-700 font-medium">
                      Przesyłanie pliku...
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {uploadMutation.isError && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-700">
                Błąd podczas przesyłania: {(uploadMutation.error as Error)?.message || 'Nieznany błąd'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Podgląd pliku */}
        {previewId && (
          <Card>
            <CardHeader>
              <CardTitle>Podgląd importu</CardTitle>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {/* Nagłówek z numerem zlecenia */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Numer zlecenia</p>
                      <p className="text-lg font-mono">{(preview.import.metadata as any)?.orderNumber}</p>
                    </div>
                    {(preview.import.metadata as any)?.reference && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Referencja</p>
                        <p className="text-lg font-mono">{(preview.import.metadata as any)?.reference}</p>
                      </div>
                    )}
                    {(preview.data as any[])?.filter((d: any) => d.type === 'requirement')?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Pozycje materiałów</p>
                        <p className="text-lg">{(preview.data as any[]).filter((d: any) => d.type === 'requirement').length}</p>
                      </div>
                    )}
                    {(preview.data as any[])?.filter((d: any) => d.type === 'window')?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Pozycje okien</p>
                        <p className="text-lg">{(preview.data as any[]).filter((d: any) => d.type === 'window').length}</p>
                      </div>
                    )}
                  </div>

                  {/* Podsumowanie z PDF - wartość i waluta */}
                  {((preview.import.metadata as any)?.valueNetto || (preview.import.metadata as any)?.currency) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {(preview.import.metadata as any)?.valueNetto?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-green-600">Suma netto</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {(preview.import.metadata as any)?.valueBrutto?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-green-600">Suma brutto</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {(preview.import.metadata as any)?.currency === 'EUR' ? '€' : 'PLN'}
                        </p>
                        <p className="text-sm text-green-600">Waluta</p>
                      </div>
                      {(preview.import.metadata as any)?.dimensions && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-700">
                            {(preview.import.metadata as any)?.dimensions.width} x {(preview.import.metadata as any)?.dimensions.height}
                          </p>
                          <p className="text-sm text-green-600">Wymiary (mm)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Podsumowanie z CSV */}
                  {((preview.import.metadata as any)?.totals?.windows > 0 || (preview.import.metadata as any)?.totals?.sashes > 0 || (preview.import.metadata as any)?.totals?.glasses > 0) && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{(preview.import.metadata as any)?.totals?.windows || 0}</p>
                        <p className="text-sm text-blue-600">Okna/Drzwi</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{(preview.import.metadata as any)?.totals?.sashes || 0}</p>
                        <p className="text-sm text-blue-600">Skrzydła</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{(preview.import.metadata as any)?.totals?.glasses || 0}</p>
                        <p className="text-sm text-blue-600">Szyby</p>
                      </div>
                    </div>
                  )}

                  {(preview.data as any[])?.filter((d: any) => d.type === 'requirement')?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2">Zapotrzebowanie na materiały:</p>
                      <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left">Nr artykułu</th>
                              <th className="px-3 py-2 text-left">Profil</th>
                              <th className="px-3 py-2 text-left">Kolor</th>
                              <th className="px-3 py-2 text-center">Bele</th>
                              <th className="px-3 py-2 text-center">Metry</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(preview.data as any[]).filter((d: any) => d.type === 'requirement').map((req: any, i: number) => (
                              <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                                <td className="px-3 py-2 font-mono">{req.articleNumber}</td>
                                <td className="px-3 py-2">{req.profileNumber}</td>
                                <td className="px-3 py-2">{req.colorCode}</td>
                                <td className="px-3 py-2 text-center">{req.calculatedBeams}</td>
                                <td className="px-3 py-2 text-center">{req.calculatedMeters}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(preview.data as any[])?.filter((d: any) => d.type === 'window')?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2">Lista okien i drzwi:</p>
                      <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-center">Lp.</th>
                              <th className="px-3 py-2 text-center">Szerokość</th>
                              <th className="px-3 py-2 text-center">Wysokość</th>
                              <th className="px-3 py-2 text-left">Typ profilu</th>
                              <th className="px-3 py-2 text-center">Ilość</th>
                              <th className="px-3 py-2 text-left">Referencja</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(preview.data as any[]).filter((d: any) => d.type === 'window').map((win: any, i: number) => (
                              <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                                <td className="px-3 py-2 text-center">{win.lp}</td>
                                <td className="px-3 py-2 text-center">{win.szer} mm</td>
                                <td className="px-3 py-2 text-center">{win.wys} mm</td>
                                <td className="px-3 py-2">{win.typProfilu}</td>
                                <td className="px-3 py-2 text-center">{win.ilosc}</td>
                                <td className="px-3 py-2 font-mono">{win.referencja}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {preview.message && (
                    <p className="text-sm text-slate-500">{preview.message}</p>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    {imports?.find((i: Import) => i.id === previewId)?.status === 'pending' && (
                      <Button
                        onClick={() => approveMutation.mutate({ id: previewId, action: 'add_new' })}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Zatwierdź import
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setPreviewId(null)}
                    >
                      Zamknij
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nie można załadować podglądu</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Historia importów */}
        <Card>
          <CardHeader>
            <CardTitle>Historia importów</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : [...completedImports, ...errorImports].length > 0 ? (
              <div className="rounded border overflow-hidden max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Plik</th>
                      <th className="px-4 py-3 text-left">Typ</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-center">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...completedImports, ...errorImports]
                      .sort((a: Import, b: Import) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 20)
                      .map((imp: Import, index: number) => (
                        <tr key={imp.id} className={`border-t hover:bg-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {imp.fileType === 'uzyte_bele' ? (
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="font-medium">{imp.filename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={imp.fileType === 'uzyte_bele' ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}>
                              {imp.fileType === 'uzyte_bele' ? 'CSV' : 'PDF'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(imp.status)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(imp.processedAt || imp.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewId(imp.id)}
                                title="Podgląd"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const message = imp.status === 'completed'
                                    ? 'Czy na pewno chcesz usunąć ten import? Spowoduje to również usunięcie powiązanego zlecenia i wszystkich jego danych!'
                                    : 'Czy na pewno chcesz usunąć ten import z historii?';
                                  if (confirm(message)) {
                                    deleteMutation.mutate(imp.id);
                                    toast({
                                      title: 'Usuwanie...',
                                      description: 'Proszę czekać',
                                      variant: 'info',
                                    });
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                title="Usuń import"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Brak historii importów
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
