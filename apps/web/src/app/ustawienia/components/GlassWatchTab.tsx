'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderBrowser } from '@/components/ui/folder-browser';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
} from 'lucide-react';

interface FileWatcherStatus {
  running: boolean;
  paths?: {
    watchFolderGlassOrders?: string;
    watchFolderGlassDeliveries?: string;
  };
}

interface GlassWatchTabProps {
  settings: Record<string, string>;
  hasChanges: boolean;
  onSettingChange: (key: string, value: string) => void;
  onSave: () => void;
  onSaveAndRestart: () => void;
  onRestart: () => void;
  fileWatcherStatus: FileWatcherStatus | undefined;
  isUpdatePending: boolean;
  isRestartPending: boolean;
}

export function GlassWatchTab({
  settings,
  hasChanges,
  onSettingChange,
  onSave,
  onSaveAndRestart,
  onRestart,
  fileWatcherStatus,
  isUpdatePending,
  isRestartPending,
}: GlassWatchTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Auto-watch Zamówień Szyb (TXT)
          </CardTitle>
          <CardDescription>
            Folder monitorowany dla nowych plików TXT z zamówieniami szyb
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FolderBrowser
            value={settings.watchFolderGlassOrders || ''}
            onChange={(path) => onSettingChange('watchFolderGlassOrders', path)}
            label="Folder zamówień szyb"
            placeholder="C:\\zamowienia_szyb"
            description="Automatyczny import plików TXT z zamówieniami szyb"
          />
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Logika korekty:</strong> Jeśli nazwa pliku zawiera słowo "korekta",
              system automatycznie usunie poprzednie zamówienie o tym samym numerze i utworzy nowe.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Auto-watch Dostaw Szyb (CSV)
          </CardTitle>
          <CardDescription>
            Folder monitorowany dla nowych plików CSV z dostawami szyb
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FolderBrowser
            value={settings.watchFolderGlassDeliveries || ''}
            onChange={(path) => onSettingChange('watchFolderGlassDeliveries', path)}
            label="Folder dostaw szyb"
            placeholder="C:\\dostawy_szyb"
            description="Automatyczny import plików CSV z dostawami szyb"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Status monitorowania szyb
          </CardTitle>
          <CardDescription>Aktualnie monitorowane ścieżki</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileWatcherStatus?.running ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>File Watcher działa poprawnie</AlertDescription>
              </Alert>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Zamówienia szyb:</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.watchFolderGlassOrders || 'nie ustawiono'}
                  </code>
                </p>
                <p>
                  <strong>Dostawy szyb:</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.watchFolderGlassDeliveries || 'nie ustawiono'}
                  </code>
                </p>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>File Watcher nie jest uruchomiony</AlertDescription>
            </Alert>
          )}
          <Button variant="outline" onClick={onRestart} disabled={isRestartPending}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRestartPending && 'animate-spin')} />
            Restartuj File Watcher
          </Button>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onSave} disabled={isUpdatePending}>
            Zapisz zmiany
          </Button>
          <Button onClick={onSaveAndRestart} disabled={isUpdatePending || isRestartPending}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRestartPending && 'animate-spin')} />
            Zapisz i restartuj watcher
          </Button>
        </div>
      )}
    </div>
  );
}
