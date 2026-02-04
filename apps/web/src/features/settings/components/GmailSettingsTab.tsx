'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FolderBrowser } from '@/components/ui/folder-browser';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { gmailApi } from '@/lib/api/gmail';
import type { GmailFetchLog } from '@/lib/api/gmail';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Clock,
  Plug,
  FolderOpen,
  History,
  XCircle,
  Save,
} from 'lucide-react';

interface GmailSettingsTabProps {
  settings: Record<string, string>;
  hasChanges: boolean;
  onSettingChange: (key: string, value: string) => void;
  onSave: () => void;
  isUpdatePending: boolean;
}

export function GmailSettingsTab({
  settings,
  hasChanges,
  onSettingChange,
  onSave,
  isUpdatePending,
}: GmailSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pobierz status Gmail
  const { data: status } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: gmailApi.getStatus,
    refetchInterval: 30000, // co 30 sekund
  });

  // Pobierz logi
  const { data: logs } = useQuery({
    queryKey: ['gmail-logs'],
    queryFn: () => gmailApi.getLogs(20),
    refetchInterval: 30000,
  });

  // Reczne pobieranie
  const fetchMutation = useMutation({
    mutationFn: gmailApi.manualFetch,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-logs'] });
      if (result.success) {
        toast({
          title: 'Pobieranie zakonczone',
          description: `Pobrano: ${result.downloaded}, pominieto: ${result.skipped}, razem maili: ${result.totalEmails}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Bledy podczas pobierania',
          description: result.errors.join('; ') || `Pobrano: ${result.downloaded}, bledy: ${result.failed}`,
        });
      }
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Blad',
        description: 'Nie udalo sie pobrac maili',
      });
    },
  });

  // Test polaczenia
  const testMutation = useMutation({
    mutationFn: gmailApi.testConnection,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Polaczenie OK',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Blad polaczenia',
          description: result.message,
        });
      }
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Blad',
        description: 'Nie udalo sie przetestowac polaczenia',
      });
    },
  });

  const isEnabled = settings.gmail_enabled === 'true';

  return (
    <div className="space-y-6">
      {/* Konfiguracja konta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Konfiguracja Gmail IMAP
          </CardTitle>
          <CardDescription>
            Podlacz konto Gmail do automatycznego pobierania CSV z dostawami szyb
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Wlacz pobieranie z Gmail</label>
              <p className="text-xs text-muted-foreground">
                Automatyczne sprawdzanie nowych maili co godzine
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => onSettingChange('gmail_enabled', checked ? 'true' : 'false')}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Adres email</label>
            <Input
              type="email"
              value={settings.gmail_email || ''}
              onChange={(e) => onSettingChange('gmail_email', e.target.value)}
              placeholder="twoj-adres@gmail.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Haslo aplikacji</label>
            <Input
              type="password"
              value={settings.gmail_app_password || ''}
              onChange={(e) => onSettingChange('gmail_app_password', e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wygeneruj w Google Account &rarr; Security &rarr; App Passwords (wymaga 2FA).
              Mozna wpisac ze spacjami lub bez (np. &quot;abcd efgh ijkl mnop&quot; lub &quot;abcdefghijklmnop&quot;).
            </p>
          </div>

          <FolderBrowser
            value={settings.gmail_target_folder || ''}
            onChange={(path) => onSettingChange('gmail_target_folder', path)}
            label="Folder docelowy"
            placeholder="C:\\dostawy_szyb"
            description="Pobrane CSV zostana zapisane w tym folderze. GlassWatcher automatycznie je zaimportuje."
          />
        </CardContent>
      </Card>

      {/* Alert o niezapisanych zmianach */}
      {hasChanges && (
        <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950">
          <Save className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>Masz niezapisane zmiany. Kliknij &quot;Zapisz zmiany&quot; aby ustawienia zostaly zapamietane.</span>
            <Button size="sm" onClick={onSave} disabled={isUpdatePending} className="ml-3 shrink-0">
              {isUpdatePending ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Przyciski akcji */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Akcje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasChanges && (
            <p className="text-sm text-muted-foreground">
              Zapisz zmiany aby moc testowac polaczenie lub pobierac maile.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !settings.gmail_email || !settings.gmail_app_password || hasChanges}
            >
              <Plug className={cn('h-4 w-4 mr-2', testMutation.isPending && 'animate-pulse')} />
              {testMutation.isPending ? 'Testowanie...' : 'Testuj polaczenie'}
            </Button>

            <Button
              onClick={() => fetchMutation.mutate()}
              disabled={fetchMutation.isPending || !isEnabled || hasChanges}
            >
              <Download className={cn('h-4 w-4 mr-2', fetchMutation.isPending && 'animate-bounce')} />
              {fetchMutation.isPending ? 'Pobieranie...' : 'Pobierz teraz'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Scheduler:</span>
            {status?.scheduler?.isRunning ? (
              <Badge variant="default" className="bg-green-600">Aktywny</Badge>
            ) : (
              <Badge variant="secondary">Nieaktywny</Badge>
            )}
            {status?.scheduler?.schedule && (
              <span className="text-xs text-muted-foreground">{status.scheduler.schedule}</span>
            )}
          </div>

          {status?.config && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Email:</span>
              <code className="text-xs bg-muted px-1 rounded">{status.config.email}</code>
              {status.config.enabled ? (
                <Badge variant="default" className="bg-green-600">Wlaczony</Badge>
              ) : (
                <Badge variant="outline">Wylaczony</Badge>
              )}
            </div>
          )}

          {status?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-lg font-bold">{status.stats.total}</div>
                <div className="text-xs text-muted-foreground">Razem</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                <div className="text-lg font-bold text-green-600">{status.stats.downloaded}</div>
                <div className="text-xs text-muted-foreground">Pobrano</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                <div className="text-lg font-bold text-red-600">{status.stats.failed}</div>
                <div className="text-xs text-muted-foreground">Bledy</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xs font-medium">
                  {status.stats.lastFetchAt
                    ? new Date(status.stats.lastFetchAt).toLocaleString('pl-PL')
                    : 'Nigdy'}
                </div>
                <div className="text-xs text-muted-foreground">Ostatnie pobranie</div>
              </div>
            </div>
          )}

          {!status?.config && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Brak konfiguracji. Uzupelnij adres email i haslo aplikacji powyzej.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Historia */}
      {logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historia pobran ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log: GmailFetchLog) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 text-sm border rounded"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {log.status === 'downloaded' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{log.attachmentName || log.subject || 'Brak nazwy'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {log.sender} &middot; {log.createdAt ? new Date(log.createdAt).toLocaleString('pl-PL') : ''}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={log.status === 'downloaded' ? 'default' : 'destructive'}
                    className={cn(
                      'shrink-0 ml-2',
                      log.status === 'downloaded' && 'bg-green-600'
                    )}
                  >
                    {log.status === 'downloaded' ? 'Pobrano' : 'Blad'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Przycisk zapisu zmian */}
      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button onClick={onSave} disabled={isUpdatePending}>
            {isUpdatePending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      )}
    </div>
  );
}
