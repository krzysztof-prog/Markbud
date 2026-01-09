'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

/**
 * Prosty dialog potwierdzenia dla operacji wymagających zgody użytkownika.
 * Używaj tego do prostych potwierdzeń (usuwanie, archiwizowanie).
 * Dla krytycznych operacji (np. usunięcie wielu elementów) użyj DestructiveActionDialog.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  variant = 'destructive',
  isLoading = false
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const Icon = variant === 'destructive' ? Trash2 : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              variant === 'destructive' ? 'bg-red-100' : 'bg-yellow-100'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                variant === 'destructive' ? 'text-red-600' : 'text-yellow-600'
              )} aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={variant}
          >
            {isLoading ? 'Usuwanie...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
