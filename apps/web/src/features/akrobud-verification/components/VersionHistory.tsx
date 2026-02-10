'use client';

/**
 * VersionHistory - Historia wersji listy weryfikacyjnej z mozliwoscia porownania
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { GitCompare, Check, Clock, FileCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VersionData {
  id: number;
  version: number;
  createdAt: string;
  itemsCount: number;
  status: string;
}

interface VersionHistoryProps {
  listId: number;
  currentVersion: number;
  versions: VersionData[];
  onSelectVersion: (versionId: number) => void;
  onCompareVersions: (oldVersionId: number, newVersionId: number) => void;
  isLoading?: boolean;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  listId: _listId,
  currentVersion,
  versions,
  onSelectVersion,
  onCompareVersions,
  isLoading = false,
}) => {
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [selectedOldVersion, setSelectedOldVersion] = useState<string>('');
  const [selectedNewVersion, setSelectedNewVersion] = useState<string>('');

  // Pobiera ikone statusu
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'applied':
        return <FileCheck className="h-4 w-4 text-blue-600" />;
      case 'draft':
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Pobiera badge statusu
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Zweryfikowana
          </Badge>
        );
      case 'applied':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            Zastosowana
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="secondary">
            Szkic
          </Badge>
        );
    }
  };

  // Formatuje date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: pl });
    } catch {
      return dateString;
    }
  };

  // Obsluga porownania wersji
  const handleCompare = () => {
    if (selectedOldVersion && selectedNewVersion) {
      onCompareVersions(parseInt(selectedOldVersion), parseInt(selectedNewVersion));
      setIsCompareDialogOpen(false);
      setSelectedOldVersion('');
      setSelectedNewVersion('');
    }
  };

  // Otwiera dialog porownania
  const openCompareDialog = () => {
    // Domyslnie wybierz dwie najnowsze wersje jesli sa dostepne
    if (versions.length >= 2) {
      const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
      setSelectedNewVersion(sortedVersions[0].id.toString());
      setSelectedOldVersion(sortedVersions[1].id.toString());
    }
    setIsCompareDialogOpen(true);
  };

  // Sprawdza czy porownanie jest mozliwe (min. 2 wersje)
  const canCompare = versions.length >= 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia wersji
          </CardTitle>
          {canCompare && (
            <Button
              variant="outline"
              size="sm"
              onClick={openCompareDialog}
              disabled={isLoading}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Porownaj
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak historii wersji. Utworz pierwsza wersje.
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="relative">
              {/* Linia timeline */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {/* Lista wersji */}
              <div className="space-y-4">
                {[...versions]
                  .sort((a, b) => b.version - a.version)
                  .map((version) => {
                    const isCurrentVersion = version.version === currentVersion;

                    return (
                      <div
                        key={version.id}
                        className={cn(
                          'relative pl-10 pr-2 py-3 rounded-lg cursor-pointer transition-colors',
                          isCurrentVersion
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => onSelectVersion(version.id)}
                      >
                        {/* Kropka na timeline */}
                        <div
                          className={cn(
                            'absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 bg-background',
                            isCurrentVersion
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          )}
                        />

                        {/* Zawartosc wersji */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                v{version.version}
                              </span>
                              {isCurrentVersion && (
                                <Badge variant="outline" className="text-xs">
                                  Aktualna
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {formatDate(version.createdAt)}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground">
                                {version.itemsCount}{' '}
                                {version.itemsCount === 1
                                  ? 'projekt'
                                  : version.itemsCount < 5
                                  ? 'projekty'
                                  : 'projektow'}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {getStatusIcon(version.status)}
                            {getStatusBadge(version.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Dialog porownania wersji */}
      <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Porownaj wersje</DialogTitle>
            <DialogDescription>
              Wybierz dwie wersje do porownania. Zobaczysz roznice miedzy nimi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Starsza wersja */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Starsza wersja (bazowa)</label>
              <Select
                value={selectedOldVersion}
                onValueChange={setSelectedOldVersion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz wersje..." />
                </SelectTrigger>
                <SelectContent>
                  {versions
                    .filter(
                      (v) =>
                        selectedNewVersion === '' ||
                        v.id.toString() !== selectedNewVersion
                    )
                    .sort((a, b) => b.version - a.version)
                    .map((version) => (
                      <SelectItem key={version.id} value={version.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>v{version.version}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatDate(version.createdAt)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nowsza wersja */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nowsza wersja (porownywana)</label>
              <Select
                value={selectedNewVersion}
                onValueChange={setSelectedNewVersion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz wersje..." />
                </SelectTrigger>
                <SelectContent>
                  {versions
                    .filter(
                      (v) =>
                        selectedOldVersion === '' ||
                        v.id.toString() !== selectedOldVersion
                    )
                    .sort((a, b) => b.version - a.version)
                    .map((version) => (
                      <SelectItem key={version.id} value={version.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>v{version.version}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatDate(version.createdAt)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompareDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleCompare}
              disabled={!selectedOldVersion || !selectedNewVersion}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Porownaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VersionHistory;
