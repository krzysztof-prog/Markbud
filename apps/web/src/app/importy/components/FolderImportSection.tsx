'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FolderOpen, Loader2, Eye, Upload, Calendar } from 'lucide-react';

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
  isScanPending: boolean;
  isImportPending: boolean;
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
  isScanPending,
  isImportPending,
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
                  <Button
                    key={folder.path}
                    variant={isSelected ? 'default' : 'outline'}
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => {
                      onFolderPathChange(folder.path);
                      onScanFolder(folder.path);
                    }}
                    disabled={isScanPending}
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
  isImportPending: boolean;
}

function FolderScanResultView({
  result,
  selectedDeliveryNumber,
  onSelectDeliveryNumber,
  onImportFolder,
  isImportPending,
}: FolderScanResultViewProps) {
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
        <Badge variant="outline" className="text-purple-700 border-purple-300">
          {result.csvFiles.length} plikow CSV
        </Badge>
      </div>

      {/* Lista plikow */}
      {result.csvFiles.length > 0 && (
        <div className="rounded border overflow-hidden bg-white max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left">Sciezka / Plik</th>
                <th className="px-3 py-2 text-left">Zlecenie</th>
                <th className="px-3 py-2 text-center">Profile</th>
                <th className="px-3 py-2 text-center">Okna</th>
              </tr>
            </thead>
            <tbody>
              {result.csvFiles.map((file, i) => {
                const isInSubfolder = file.relativePath.includes('\\') || file.relativePath.includes('/');
                return (
                  <tr key={i} className={`border-t hover:bg-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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

      {/* Przycisk importu */}
      {selectedDeliveryNumber && (
        <Button
          onClick={onImportFolder}
          disabled={isImportPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isImportPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importowanie...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importuj {result.csvFiles.length} plikow do dostawy {selectedDeliveryNumber}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
