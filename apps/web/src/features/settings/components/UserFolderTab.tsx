'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderBrowser } from '@/components/ui/folder-browser';
import { cn } from '@/lib/utils';
import { Save, User, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserFolderTabProps {
  userFolderPath: string;
  globalFolderPath: string;
  hasChanges: boolean;
  onPathChange: (path: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function UserFolderTab({
  userFolderPath,
  globalFolderPath,
  hasChanges,
  onPathChange,
  onSave,
  isPending,
}: UserFolderTabProps) {
  const effectivePath = userFolderPath || globalFolderPath;
  const isUsingGlobal = !userFolderPath;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Folder importow (ustawienia uzytkownika)
          </CardTitle>
          <CardDescription>
            Ustaw wlasna sciezke do folderu importow. Jesli nie ustawisz, zostanie uzyta sciezka globalna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUsingGlobal && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Obecnie uzywasz globalnej sciezki:{' '}
                <code className="text-xs bg-muted px-1 rounded">{globalFolderPath || 'nie ustawiono'}</code>
              </AlertDescription>
            </Alert>
          )}
          {!isUsingGlobal && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Uzywasz wlasnej sciezki:{' '}
                <code className="text-xs bg-muted px-1 rounded">{userFolderPath}</code>
              </AlertDescription>
            </Alert>
          )}

          <FolderBrowser
            value={userFolderPath}
            onChange={onPathChange}
            label="Twoj folder importow"
            placeholder={globalFolderPath || 'Wybierz folder lub zostaw puste dla globalnej sciezki'}
            description="Ustaw wlasna sciezke lub zostaw puste, aby uzywac globalnej sciezki z zakladki Foldery"
          />

          <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
            <p>
              <strong>Aktualnie uzywana sciezka:</strong>{' '}
              <code className="text-xs bg-background px-1 rounded">
                {effectivePath || 'nie ustawiono'}
              </code>
            </p>
            <p className="text-xs text-muted-foreground">
              {isUsingGlobal
                ? 'Uzywasz sciezki globalnej. Zmiany w ustawieniach globalnych wplyna na Twoja konfiguracje.'
                : 'Uzywasz wlasnej sciezki. Zmiany w ustawieniach globalnych nie wplyna na Twoja konfiguracje.'
              }
            </p>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <Button onClick={onSave} disabled={isPending}>
                <Save className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
                {isPending ? 'Zapisywanie...' : 'Zapisz ustawienia'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
