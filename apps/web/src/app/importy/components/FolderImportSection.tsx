'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderOpen, Loader2, Upload, Calendar, AlertTriangle, X, Eye, Archive, Trash2 } from 'lucide-react';

interface AvailableFolder {
  path: string;
  name: string;
  date: string | null;
}

interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

interface FolderImportSectionProps {
  availableFolders: { folders: AvailableFolder[]; basePath: string } | undefined;
  folderPath: string;
  onFolderPathChange: (path: string) => void;
  folderScanResult: FolderScanResult | null;
  selectedDeliveryNumber: 'I' | 'II' | 'III' | null;
  onSelectDeliveryNumber: (num: 'I' | 'II' | 'III') => void;
  onScanFolder: (path: string) => void;
  onImportFolder: () => void;
  onCancelScan: () => void;
  isScanPending: boolean;
  isImportPending: boolean;
  onArchiveFolder: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  isArchivePending: boolean;
  isDeletePending: boolean;
}

export function FolderImportSection({
  availableFolders,
  folderPath,
  onFolderPathChange,
  folderScanResult,
  selectedDeliveryNumber,
  onSelectDeliveryNumber,
  onScanFolder,
  onImportFolder,
  onCancelScan,
  isScanPending,
  isImportPending,
  onArchiveFolder,
  onDeleteFolder,
  isArchivePending,
  isDeletePending,
}: FolderImportSectionProps) {
  return (
    <Card className="border-purple-200">
      <CardHeader className="bg-purple-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <FolderOpen className="h-5 w-5" />
          Import z folderu (automatyczny)
        </CardTitle>
        <CardDescription>
          Podaj sciezke do folderu z data w nazwie (DD.MM.YYYY) - wszystkie pliki CSV zostana automatycznie przypisane do dostawy
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Lista dostepnych folderow */}
        {availableFolders && availableFolders.folders.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Dostepne foldery z datami:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableFolders.folders.map((folder) => {
                const isScanning = folderPath === folder.path && isScanPending;
                const isSelected = folderPath === folder.path;

                return (
                  <div
                    key={folder.path}
                    className="flex gap-2 items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 hover:bg-slate-150"
                  >
                    <button
                      onClick={() => {
                        onFolderPathChange(folder.path);
                        onScanFolder(folder.path);
                      }}
                      disabled={isScanPending}
                      className="flex flex-col items-start gap-1 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isScanning ? (
                          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                        ) : (
                          <FolderOpen className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className={`font-medium text-sm ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                          {folder.name}
                        </span>
                      </div>
                      {folder.date && (
                        <span className="text-xs text-slate-500 ml-6">
                          {new Date(folder.date).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                    </button>

                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onArchiveFolder(folder.path)}
                              disabled={isArchivePending || isDeletePending || isScanPending}
                              className="h-8 w-8 hover:bg-slate-200"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Archiwizuj folder</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteFolder(folder.path)}
                              disabled={isArchivePending || isDeletePending || isScanPending}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Usun folder</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded border">
            Brak folderow w {availableFolders?.basePath || 'C:\\Dostawy'}.
            <br />
            Mozesz wpisac sciezke recznie ponizej lub skonfigurowac IMPORTS_BASE_PATH w .env
          </div>
        )}

        {/* Reczne wprowadzenie sciezki */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Lub wpisz sciezke recznie:</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="folderPath"
                type="text"
                placeholder="C:\Dostawy\01.12.2025 lub \\server\share\01.12.2025"
                value={folderPath}
                onChange={(e) => onFolderPathChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && folderPath && !isScanPending) {
                    onScanFolder(folderPath);
                  }
                }}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={() => onScanFolder(folderPath)}
              disabled={!folderPath || isScanPending}
              variant="outline"
            >
              {isScanPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-2">Skanuj</span>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Kliknij folder powyzej lub wpisz sciezke recznie i nacisnij Enter
          </p>
        </div>

        {/* Wyniki skanowania */}
        {folderScanResult && (
          <FolderScanResultView
            result={folderScanResult}
            selectedDeliveryNumber={selectedDeliveryNumber}
            onSelectDeliveryNumber={onSelectDeliveryNumber}
            onImportFolder={onImportFolder}
            onCancelScan={onCancelScan}
            isImportPending={isImportPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface FolderScanResultViewProps {
  result: FolderScanResult;
  selectedDeliveryNumber: 'I' | 'II' | 'III' | null;
  onSelectDeliveryNumber: (num: 'I' | 'II' | 'III') => void;
  onImportFolder: () => void;
  onCancelScan: () => void;
  isImportPending: boolean;
}

function FolderScanResultView({
  result,
  selectedDeliveryNumber,
  onSelectDeliveryNumber,
  onImportFolder,
  onCancelScan,
  isImportPending,
}: FolderScanResultViewProps) {
  const duplicatesCount = result.csvFiles.filter((f) => f.existingDeliveryInfo).length;
  const importableCount = result.csvFiles.length - duplicatesCount;

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
      {/* Info o folderze */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{result.folderName}</p>
          {result.detectedDate && (
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data dostawy: {new Date(result.detectedDate).toLocaleDateString('pl-PL')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-purple-700 border-purple-300">
            {result.csvFiles.length} plikow CSV
          </Badge>
          {duplicatesCount > 0 && (
            <Badge variant="destructive">
              {duplicatesCount} duplikat{duplicatesCount === 1 ? '' : duplicatesCount < 5 ? 'y' : 'ow'}
            </Badge>
          )}
        </div>
      </div>

      {/* Ostrzezenie o duplikatach */}
      {duplicatesCount > 0 && (
        <div className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Wykryto {duplicatesCount} zamowien juz przypisanych do innych dostaw</p>
            <p className="text-xs mt-1">
              Te zamowienia zostana pominiete podczas importu. Do dostawy trafi {importableCount} nowych zamowien.
            </p>
          </div>
        </div>
      )}

      {/* Lista plikow */}
      {result.csvFiles.length > 0 && (
        <TooltipProvider>
          <div className="rounded border overflow-hidden bg-white max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Sciezka / Plik</th>
                  <th className="px-3 py-2 text-left">Zlecenie</th>
                  <th className="px-3 py-2 text-center">Profile</th>
                  <th className="px-3 py-2 text-center">Okna</th>
                  <th className="px-3 py-2 text-center w-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.csvFiles.map((file, i) => {
                  const isInSubfolder = file.relativePath.includes('\\') || file.relativePath.includes('/');
                  const isDuplicate = !!file.existingDeliveryInfo;
                  return (
                    <tr
                      key={i}
                      className={`border-t hover:bg-slate-200 ${isDuplicate ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs">{file.filename}</span>
                          {isInSubfolder && (
                            <span className="text-xs text-slate-500">
                              {file.relativePath.split(/[/\\]/)[0]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 font-medium ${isDuplicate ? 'text-red-700' : ''}`}>
                        {file.orderNumber}
                      </td>
                      <td className="px-3 py-2 text-center">{file.requirementsCount}</td>
                      <td className="px-3 py-2 text-center">{file.windowsCount}</td>
                      <td className="px-3 py-2 text-center">
                        {isDuplicate ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex justify-center">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium text-red-600">Juz przypisane!</p>
                              <p className="text-sm">
                                Dostawa {file.existingDeliveryInfo?.deliveryNumber || '?'} z dnia{' '}
                                {file.existingDeliveryInfo?.deliveryDate
                                  ? new Date(file.existingDeliveryInfo.deliveryDate).toLocaleDateString('pl-PL')
                                  : '?'}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                To zamowienie zostanie pominiete podczas importu
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      )}

      {/* Info o istniejacych dostawach */}
      {result.existingDeliveries.length > 0 && (
        <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
          Istniejace dostawy na te date: {result.existingDeliveries.map(d => d.deliveryNumber || 'bez numeru').join(', ')}
        </div>
      )}

      {/* Wybor numeru dostawy */}
      {result.detectedDate && result.csvFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Wybierz numer dostawy:</p>
          <div className="flex gap-2">
            {(['I', 'II', 'III'] as const).map((num) => {
              const exists = result.existingDeliveries.some(d => d.deliveryNumber === num);
              return (
                <Button
                  key={num}
                  variant={selectedDeliveryNumber === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectDeliveryNumber(num)}
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

      {/* Przyciski akcji */}
      {result.detectedDate && result.csvFiles.length > 0 && (
        <div className="flex gap-2">
          {selectedDeliveryNumber && importableCount > 0 && (
            <Button
              onClick={onImportFolder}
              disabled={isImportPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isImportPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importowanie...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importuj {importableCount} plikow do dostawy {selectedDeliveryNumber}
                  {duplicatesCount > 0 && ` (${duplicatesCount} pominiete)`}
                </>
              )}
            </Button>
          )}
          {selectedDeliveryNumber && importableCount === 0 && (
            <div className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-50 text-red-700 rounded border border-red-200">
              <AlertTriangle className="h-4 w-4" />
              Wszystkie zamowienia juz przypisane - brak plikow do importu
            </div>
          )}
          <Button
            variant="outline"
            onClick={onCancelScan}
            disabled={isImportPending}
            className="text-slate-600"
          >
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
        </div>
      )}
    </div>
  );
}
