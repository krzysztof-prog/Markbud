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
            Folder importów (ustawienia użytkownika)
          </CardTitle>
          <CardDescription>
            Ustaw własną ścieżkę do folderu importów. Jeśli nie ustawisz, zostanie użyta ścieżka globalna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUsingGlobal && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Obecnie używasz globalnej ścieżki:{' '}
                <code className="text-xs bg-muted px-1 rounded">{globalFolderPath || 'nie ustawiono'}</code>
              </AlertDescription>
            </Alert>
          )}
          {!isUsingGlobal && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Używasz własnej ścieżki:{' '}
                <code className="text-xs bg-muted px-1 rounded">{userFolderPath}</code>
              </AlertDescription>
            </Alert>
          )}

          <FolderBrowser
            value={userFolderPath}
            onChange={onPathChange}
            label="Twój folder importów"
            placeholder={globalFolderPath || 'Wybierz folder lub zostaw puste dla globalnej ścieżki'}
            description="Ustaw własną ścieżkę lub zostaw puste, aby używać globalnej ścieżki z zakładki Foldery"
          />

          <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
            <p>
              <strong>Aktualnie używana ścieżka:</strong>{' '}
              <code className="text-xs bg-background px-1 rounded">
                {effectivePath || 'nie ustawiono'}
              </code>
            </p>
            <p className="text-xs text-muted-foreground">
              {isUsingGlobal
                ? 'Używasz ścieżki globalnej. Zmiany w ustawieniach globalnych wpłyną na Twoją konfigurację.'
                : 'Używasz własnej ścieżki. Zmiany w ustawieniach globalnych nie wpłyną na Twoją konfigurację.'
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
