"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  conflictInfo: {
    folderPath: string;
    lockedBy: string;
    lockedAt: Date;
  } | null;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} ${diffInSeconds === 1 ? "sekunda" : diffInSeconds < 5 ? "sekundy" : "sekund"} temu`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minuta" : diffInMinutes < 5 ? "minuty" : "minut"} temu`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "godzina" : diffInHours < 5 ? "godziny" : "godzin"} temu`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ${diffInDays === 1 ? "dzień" : "dni"} temu`;
}

export function ImportConflictModal({
  isOpen,
  onClose,
  onRetry,
  conflictInfo,
}: ImportConflictModalProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      onClose();
    }
  };

  if (!conflictInfo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Konflikt importu
          </DialogTitle>
          <DialogDescription>
            Wybrany folder jest obecnie przetwarzany przez innego użytkownika.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <div className="space-y-2">
              <p className="font-medium">
                Folder <span className="font-mono text-sm">{conflictInfo.folderPath}</span> jest
                obecnie importowany przez: <span className="font-semibold">{conflictInfo.lockedBy}</span>
              </p>
              <p className="text-sm text-amber-700">
                Rozpoczęto: {formatTimeAgo(conflictInfo.lockedAt)}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="rounded-md bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Import tego samego folderu przez wielu użytkowników może prowadzić do duplikacji danych.
            Poczekaj, aż bieżący import zostanie zakończony, lub wybierz inny folder.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="default" onClick={handleRetry}>
            Spróbuj ponownie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
