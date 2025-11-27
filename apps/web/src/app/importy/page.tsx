'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { importsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { FileUp, Check, X, Eye, Clock, CheckCircle, XCircle, AlertCircle, Upload, Loader2, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from '@/hooks/useToast';

export default function ImportyPage() {
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [csvDragging, setCsvDragging] = useState(false);
  const [pdfDragging, setPdfDragging] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const { data: imports, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsApi.getAll(),
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['import-preview', previewId],
    queryFn: () => importsApi.getPreview(previewId!),
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
    mutationFn: (file: File) => importsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast({
        title: 'Plik przesłany',
        description: 'Plik oczekuje na zatwierdzenie',
        variant: 'success',
      });
    },
    onError: (error: any) => {
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

  // Filtruj importy według typu
  const csvImports = imports?.filter((i: any) => i.fileType === 'uzyte_bele') || [];
  const pdfImports = imports?.filter((i: any) => i.fileType === 'ceny_pdf') || [];

  const pendingCsvImports = csvImports.filter((i: any) => i.status === 'pending');
  const pendingPdfImports = pdfImports.filter((i: any) => i.status === 'pending');

  const completedImports = imports?.filter((i: any) => i.status === 'completed') || [];
  const errorImports = imports?.filter((i: any) => i.status === 'error' || i.status === 'rejected') || [];

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
                    {pendingCsvImports.map((imp: any) => (
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
                    {pendingPdfImports.map((imp: any) => (
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
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-700">Przesyłanie pliku...</p>
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
                      <p className="text-lg font-mono">{preview.orderNumber}</p>
                    </div>
                    {preview.reference && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Referencja</p>
                        <p className="text-lg font-mono">{preview.reference}</p>
                      </div>
                    )}
                    {preview.requirements?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Pozycje materiałów</p>
                        <p className="text-lg">{preview.requirements.length}</p>
                      </div>
                    )}
                    {preview.windows?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-500">Pozycje okien</p>
                        <p className="text-lg">{preview.windows.length}</p>
                      </div>
                    )}
                  </div>

                  {/* Podsumowanie z PDF - wartość i waluta */}
                  {(preview.valueNetto || preview.currency) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {preview.valueNetto?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-green-600">Suma netto</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {preview.valueBrutto?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-green-600">Suma brutto</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {preview.currency === 'EUR' ? '€' : 'PLN'}
                        </p>
                        <p className="text-sm text-green-600">Waluta</p>
                      </div>
                      {preview.dimensions && (
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-700">
                            {preview.dimensions.width} x {preview.dimensions.height}
                          </p>
                          <p className="text-sm text-green-600">Wymiary (mm)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Podsumowanie z CSV */}
                  {(preview.totals?.windows > 0 || preview.totals?.sashes > 0 || preview.totals?.glasses > 0) && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{preview.totals?.windows || 0}</p>
                        <p className="text-sm text-blue-600">Okna/Drzwi</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{preview.totals?.sashes || 0}</p>
                        <p className="text-sm text-blue-600">Skrzydła</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">{preview.totals?.glasses || 0}</p>
                        <p className="text-sm text-blue-600">Szyby</p>
                      </div>
                    </div>
                  )}

                  {preview.requirements?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2">Zapotrzebowanie na materiały:</p>
                      <div className="rounded border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Nr artykułu</th>
                              <th className="px-3 py-2 text-left">Profil</th>
                              <th className="px-3 py-2 text-left">Kolor</th>
                              <th className="px-3 py-2 text-center">Bele</th>
                              <th className="px-3 py-2 text-center">Metry</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.requirements.map((req: any, i: number) => (
                              <tr key={i} className="border-t">
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

                  {preview.windows?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-2">Lista okien i drzwi:</p>
                      <div className="rounded border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
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
                            {preview.windows.map((win: any, i: number) => (
                              <tr key={i} className="border-t">
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
                    {imports?.find((i: any) => i.id === previewId)?.status === 'pending' && (
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
              <div className="rounded border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
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
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 20)
                      .map((imp: any) => (
                        <tr key={imp.id} className="border-t hover:bg-slate-50">
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
