'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DestructiveActionType = 'delete' | 'archive' | 'override' | 'finalize';

interface AffectedItem {
  id: string;
  label: string;
}

interface DestructiveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  consequences: string[];
  actionType: DestructiveActionType;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  affectedItems?: AffectedItem[];
  previewData?: React.ReactNode;
  isLoading?: boolean;
}

const ACTION_CONFIG = {
  delete: {
    icon: XCircle,
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-100',
    iconClass: 'text-red-600'
  },
  archive: {
    icon: AlertTriangle,
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    borderClass: 'border-orange-200',
    bgClass: 'bg-orange-100',
    iconClass: 'text-orange-600'
  },
  override: {
    icon: AlertTriangle,
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    borderClass: 'border-yellow-200',
    bgClass: 'bg-yellow-100',
    iconClass: 'text-yellow-600'
  },
  finalize: {
    icon: AlertTriangle,
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-100',
    iconClass: 'text-blue-600'
  }
} as const;

export const DestructiveActionDialog: React.FC<DestructiveActionDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  actionType,
  confirmText,
  onConfirm,
  affectedItems,
  previewData,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const config = ACTION_CONFIG[actionType];
  const Icon = config.icon;
  const isConfirmValid = inputValue === confirmText;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    await onConfirm();
    setInputValue('');
  };

  const handleCancel = () => {
    setInputValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto max-sm:min-h-screen max-sm:rounded-none">
        {/* Header with warning icon */}
        <DialogHeader className={cn('border-b pb-4', config.borderClass)}>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-full', config.bgClass)}>
              <Icon className={cn('h-6 w-6', config.iconClass)} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <DialogTitle id="destructive-dialog-title" className="text-xl">{title}</DialogTitle>
              <DialogDescription id="destructive-dialog-description" className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Consequences */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <p className="font-semibold mb-2">Konsekwencje tej akcji:</p>
              <ul className="space-y-1" role="list">
                {consequences.map((consequence, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Affected items */}
          {affectedItems && affectedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Dotknięte elementy ({affectedItems.length}):
              </Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-1" role="list">
                {affectedItems.map((item) => (
                  <div key={item.id} className="text-sm text-slate-700">
                    • {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview data */}
          {previewData && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Podgląd zmian:</Label>
              <div className="border rounded-md p-4 bg-slate-50">
                {previewData}
              </div>
            </div>
          )}

          {/* Text confirmation */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-input" className="text-sm">
              Aby potwierdzić, wpisz: <code className="bg-slate-100 px-2 py-1 rounded font-mono">{confirmText}</code>
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              className={cn(
                'font-mono',
                inputValue && !isConfirmValid && 'border-red-500'
              )}
              autoComplete="off"
              aria-invalid={inputValue !== '' && !isConfirmValid}
              aria-describedby={inputValue && !isConfirmValid ? 'confirm-error' : undefined}
            />
            {inputValue && !isConfirmValid && (
              <p id="confirm-error" className="text-sm text-red-600" role="alert">Tekst nie pasuje</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
            className={config.buttonClass}
          >
            {isLoading ? 'Wykonuję...' : `Potwierdź ${actionType === 'delete' ? 'usunięcie' : actionType === 'archive' ? 'archiwizację' : actionType === 'override' ? 'nadpisanie' : 'finalizację'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DestructiveActionDialog;
