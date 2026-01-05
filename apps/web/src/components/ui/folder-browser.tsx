'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuthToken } from '@/lib/auth-token';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, HardDrive, ChevronLeft, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderItem {
  name: string;
  path: string;
  type: 'drive' | 'folder';
}

interface BrowseFoldersResponse {
  currentPath: string;
  parent: string | null;
  items: FolderItem[];
}

interface FolderBrowserProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function browseFolders(path: string): Promise<BrowseFoldersResponse> {
  const url = path
    ? `${API_URL}/api/settings/browse-folders?path=${encodeURIComponent(path)}`
    : `${API_URL}/api/settings/browse-folders`;

  const token = await getAuthToken();
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Nie udalo sie wczytac folderow');
  }
  return response.json();
}

async function validateFolder(path: string): Promise<{ valid: boolean; error?: string }> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/settings/validate-folder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ path }),
  });
  return response.json();
}

export function FolderBrowser({
  value,
  onChange,
  placeholder = 'Wybierz folder...',
  label,
  description,
}: FolderBrowserProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedPath, setSelectedPath] = useState(value);
  const [manualPath, setManualPath] = useState(value);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Synchronizuj manualPath z zewnetrzna wartoscia (np. po zaladowaniu z API)
  useEffect(() => {
    setManualPath(value);
    // Reset walidacji jesli wartosc sie zmienila z zewnatrz
    if (value) {
      setValidationStatus('checking');
      validateFolder(value).then((result) => {
        setValidationStatus(result.valid ? 'valid' : 'invalid');
      }).catch(() => {
        setValidationStatus('invalid');
      });
    } else {
      setValidationStatus('idle');
    }
  }, [value]);

  // Reset when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setSelectedPath(value);
      setCurrentPath(value || '');
    }
  }, [dialogOpen, value]);

  // Fetch folder contents
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['browse-folders', currentPath],
    queryFn: () => browseFolders(currentPath),
    enabled: dialogOpen,
  });

  // Validate manual path with debounce (tylko dla zmian uzytkownika)
  useEffect(() => {
    // Pomijaj jesli wartosc jest taka sama jak zewnetrzna (juz zwalidowana powyzej)
    if (manualPath === value) return;

    if (!manualPath) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const result = await validateFolder(manualPath);
        setValidationStatus(result.valid ? 'valid' : 'invalid');
      } catch {
        setValidationStatus('invalid');
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [manualPath, value]);

  // Pojedyncze klikniecie - tylko zaznacz folder
  const handleFolderSelect = (item: FolderItem) => {
    setSelectedPath(item.path);
  };

  // Podwojne klikniecie - wejdz do folderu
  const handleFolderNavigate = (item: FolderItem) => {
    if (item.type === 'drive' || item.type === 'folder') {
      setCurrentPath(item.path);
      setSelectedPath(item.path);
    }
  };

  const handleGoUp = () => {
    if (data?.parent) {
      setCurrentPath(data.parent);
    } else {
      setCurrentPath('');
    }
  };

  const handleConfirm = () => {
    onChange(selectedPath);
    setManualPath(selectedPath);
    setDialogOpen(false);
  };

  const handleManualChange = (newPath: string) => {
    setManualPath(newPath);
    onChange(newPath);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium block">{label}</label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={manualPath}
            onChange={(e) => handleManualChange(e.target.value)}
            className={cn(
              'font-mono text-sm pr-8',
              validationStatus === 'valid' && 'border-green-500',
              validationStatus === 'invalid' && 'border-red-500'
            )}
            placeholder={placeholder}
          />
          {validationStatus === 'checking' && (
            <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {validationStatus === 'valid' && (
            <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          title="Przegladaj foldery"
        >
          <Folder className="h-4 w-4" />
        </Button>
      </div>
      {validationStatus === 'invalid' && manualPath && (
        <p className="text-xs text-red-500">Folder nie istnieje lub brak uprawnien</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wybierz folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current path display */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoUp}
                disabled={!data?.parent && !data?.currentPath}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-mono text-sm flex-1 truncate">
                {data?.currentPath || 'Dyski systemu'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>

            {/* Folder list */}
            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-red-500">
                  {error instanceof Error ? error.message : 'Blad ladowania'}
                </div>
              ) : data?.items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Folder jest pusty
                </div>
              ) : (
                <div className="p-2">
                  {data?.items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleFolderSelect(item)}
                      onDoubleClick={() => handleFolderNavigate(item)}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left',
                        selectedPath === item.path && 'bg-accent'
                      )}
                    >
                      {item.type === 'drive' ? (
                        <HardDrive className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Folder className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="truncate">{item.name}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected path */}
            <div className="p-2 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">Wybrany folder:</span>
              <p className="font-mono text-sm truncate">{selectedPath || '(brak)'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedPath}>
              Wybierz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
