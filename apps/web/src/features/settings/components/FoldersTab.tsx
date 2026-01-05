'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderBrowser } from '@/components/ui/folder-browser';
import { cn } from '@/lib/utils';
import {
  Save,
  FolderOpen,
  Mail,
  FileBox,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface FileWatcherStatus {
  running: boolean;
  paths?: {
    importsBasePath?: string;
    importsCenyPath?: string;
    watchFolderUzyteBele?: string;
    watchFolderCeny?: string;
  };
}

interface FoldersTabProps {
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

export function FoldersTab({
  settings,
  hasChanges,
  onSettingChange,
  onSave,
  onSaveAndRestart,
  onRestart,
  fileWatcherStatus,
  isUpdatePending,
  isRestartPending,
}: FoldersTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBox className="h-5 w-5" />
            Foldery importow
          </CardTitle>
          <CardDescription>
            Glowne sciezki do folderow z danymi importow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FolderBrowser
            value={settings.importsBasePath || ''}
            onChange={(path) => onSettingChange('importsBasePath', path)}
            label="Folder importow dostaw (CSV z PROF)"
            placeholder="C:\Dostawy"
            description="Folder zawierajacy podfoldery z datami dostaw (np. 01.12.2025)"
          />
          <FolderBrowser
            value={settings.importsCenyPath || ''}
            onChange={(path) => onSettingChange('importsCenyPath', path)}
            label="Folder importu cen"
            placeholder="C:\Ceny"
            description="Folder z plikami cennikow do importu"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Monitorowane foldery
          </CardTitle>
          <CardDescription>
            Sciezki do folderow, ktore system bedzie skanowac w poszukiwaniu nowych plikow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FolderBrowser
            value={settings.watchFolderUzyteBele || ''}
            onChange={(path) => onSettingChange('watchFolderUzyteBele', path)}
            label='Folder "uzyte bele" (pliki CSV)'
            placeholder="./uzyte bele"
            description="Folder z plikami CSV zawierajacymi dane o uzytych belach"
          />
          <FolderBrowser
            value={settings.watchFolderCeny || ''}
            onChange={(path) => onSettingChange('watchFolderCeny', path)}
            label='Folder "ceny" (pliki PDF)'
            placeholder="./ceny"
            description="Folder z plikami PDF z cenami"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Konfiguracja IMAP
          </CardTitle>
          <CardDescription>
            Ustawienia serwera pocztowego do automatycznego pobierania zalacznikow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Serwer IMAP</label>
              <Input
                type="text"
                value={settings.imapHost || ''}
                onChange={(e) => onSettingChange('imapHost', e.target.value)}
                placeholder="imap.example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Port</label>
              <Input
                type="number"
                value={settings.imapPort || ''}
                onChange={(e) => onSettingChange('imapPort', e.target.value)}
                placeholder="993"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Uzytkownik</label>
            <Input
              type="text"
              value={settings.imapUser || ''}
              onChange={(e) => onSettingChange('imapUser', e.target.value)}
              placeholder="user@example.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Status monitorowania
          </CardTitle>
          <CardDescription>Aktualnie monitorowane sciezki przez File Watcher</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileWatcherStatus?.running ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>File Watcher dziala poprawnie</AlertDescription>
              </Alert>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Folder importow dostaw:</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.importsBasePath || 'nie ustawiono'}
                  </code>
                </p>
                <p>
                  <strong>Folder importu cen:</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.importsCenyPath || 'nie ustawiono'}
                  </code>
                </p>
                <p>
                  <strong>Folder uzyte bele:</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.watchFolderUzyteBele || 'nie ustawiono'}
                  </code>
                </p>
                <p>
                  <strong>Folder ceny (monitorowany):</strong>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {fileWatcherStatus.paths?.watchFolderCeny || 'nie ustawiono'}
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
            <Save className="h-4 w-4 mr-2" />
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
