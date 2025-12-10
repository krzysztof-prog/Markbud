'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface PalletType {
  id?: number;
  name: string;
  lengthMm: number;
  loadDepthMm: number;
}

interface Color {
  id?: number;
  code: string;
  name: string;
  type: string;
  hexColor?: string | null;
}

interface Profile {
  id?: number;
  number: string;
  name: string;
  description?: string | null;
  articleNumber?: string | null;
}

// Pallet Dialog
interface PalletDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<PalletType> | null;
  onOpenChange: (open: boolean) => void;
  onDataChange: (data: Partial<PalletType>) => void;
  onSave: () => void;
  isPending: boolean;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  onValidateField: (field: 'name' | 'lengthMm' | 'loadDepthMm', value: string | number) => void;
  onTouchField: (field: 'name' | 'lengthMm' | 'loadDepthMm') => void;
}

export function PalletDialog({
  open,
  mode,
  data,
  onOpenChange,
  onDataChange,
  onSave,
  isPending,
  errors,
  touched,
  onValidateField,
  onTouchField,
}: PalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Dodaj typ palety' : 'Edytuj typ palety'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Nazwa <span className="text-red-600">*</span>
            </label>
            <Input
              value={data?.name || ''}
              onChange={(e) => {
                onDataChange({ ...data, name: e.target.value });
                onValidateField('name', e.target.value);
              }}
              onBlur={() => onTouchField('name')}
              placeholder="np. EUR 120x80"
              className={cn(
                touched.name && errors.name && 'border-red-500 focus-visible:ring-red-500'
              )}
              aria-invalid={touched.name && !!errors.name}
            />
            {touched.name && errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Długość (mm) <span className="text-red-600">*</span>
              </label>
              <Input
                type="number"
                value={data?.lengthMm || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onDataChange({ ...data, lengthMm: value });
                  onValidateField('lengthMm', value);
                }}
                onBlur={() => onTouchField('lengthMm')}
                className={cn(
                  touched.lengthMm && errors.lengthMm && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.lengthMm && !!errors.lengthMm}
              />
              {touched.lengthMm && errors.lengthMm && (
                <p className="text-sm text-red-600 mt-1">{errors.lengthMm}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Szer. załadunku (mm) <span className="text-red-600">*</span>
              </label>
              <Input
                type="number"
                value={data?.loadDepthMm || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onDataChange({ ...data, loadDepthMm: value });
                  onValidateField('loadDepthMm', value);
                }}
                onBlur={() => onTouchField('loadDepthMm')}
                className={cn(
                  touched.loadDepthMm &&
                    errors.loadDepthMm &&
                    'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.loadDepthMm && !!errors.loadDepthMm}
              />
              {touched.loadDepthMm && errors.loadDepthMm && (
                <p className="text-sm text-red-600 mt-1">{errors.loadDepthMm}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? 'Zapisuję...' : mode === 'add' ? 'Dodaj' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Color Dialog
interface ColorDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<Color> | null;
  onOpenChange: (open: boolean) => void;
  onDataChange: (data: Partial<Color>) => void;
  onSave: () => void;
  isPending: boolean;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  onValidateField: (field: 'code' | 'name' | 'hexColor', value: string) => void;
  onTouchField: (field: 'code' | 'name' | 'hexColor') => void;
}

export function ColorDialog({
  open,
  mode,
  data,
  onOpenChange,
  onDataChange,
  onSave,
  isPending,
  errors,
  touched,
  onValidateField,
  onTouchField,
}: ColorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Dodaj kolor' : 'Edytuj kolor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Kod <span className="text-red-600">*</span>
              </label>
              <Input
                value={data?.code || ''}
                onChange={(e) => {
                  onDataChange({ ...data, code: e.target.value });
                  onValidateField('code', e.target.value);
                }}
                onBlur={() => onTouchField('code')}
                placeholder="np. 050"
                className={cn(
                  touched.code && errors.code && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.code && !!errors.code}
              />
              {touched.code && errors.code && (
                <p className="text-sm text-red-600 mt-1">{errors.code}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Nazwa <span className="text-red-600">*</span>
              </label>
              <Input
                value={data?.name || ''}
                onChange={(e) => {
                  onDataChange({ ...data, name: e.target.value });
                  onValidateField('name', e.target.value);
                }}
                onBlur={() => onTouchField('name')}
                placeholder="np. Kremowy"
                className={cn(
                  touched.name && errors.name && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.name && !!errors.name}
              />
              {touched.name && errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Typ</label>
              <select
                value={data?.type || 'typical'}
                onChange={(e) => onDataChange({ ...data, type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="typical">Typowy</option>
                <option value="atypical">Nietypowy</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Kolor (HEX)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={data?.hexColor || ''}
                    onChange={(e) => {
                      onDataChange({ ...data, hexColor: e.target.value });
                      onValidateField('hexColor', e.target.value);
                    }}
                    onBlur={() => onTouchField('hexColor')}
                    placeholder="#FFFFFF"
                    className={cn(
                      touched.hexColor &&
                        errors.hexColor &&
                        'border-red-500 focus-visible:ring-red-500'
                    )}
                    aria-invalid={touched.hexColor && !!errors.hexColor}
                  />
                  {touched.hexColor && errors.hexColor && (
                    <p className="text-sm text-red-600 mt-1">{errors.hexColor}</p>
                  )}
                </div>
                <input
                  type="color"
                  value={data?.hexColor || '#FFFFFF'}
                  onChange={(e) => {
                    onDataChange({ ...data, hexColor: e.target.value });
                    onValidateField('hexColor', e.target.value);
                  }}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? 'Zapisuję...' : mode === 'add' ? 'Dodaj' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Profile Dialog
interface ProfileDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<Profile> | null;
  onOpenChange: (open: boolean) => void;
  onDataChange: (data: Partial<Profile>) => void;
  onSave: () => void;
  isPending: boolean;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  onValidateField: (field: 'number' | 'name', value: string) => void;
  onTouchField: (field: 'number' | 'name') => void;
}

export function ProfileDialog({
  open,
  mode,
  data,
  onOpenChange,
  onDataChange,
  onSave,
  isPending,
  errors,
  touched,
  onValidateField,
  onTouchField,
}: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Dodaj profil PVC' : 'Edytuj profil PVC'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Numer <span className="text-red-600">*</span>
              </label>
              <Input
                value={data?.number || ''}
                onChange={(e) => {
                  onDataChange({ ...data, number: e.target.value });
                  onValidateField('number', e.target.value);
                }}
                onBlur={() => onTouchField('number')}
                placeholder="np. 9016"
                className={cn(
                  touched.number && errors.number && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.number && !!errors.number}
              />
              {touched.number && errors.number && (
                <p className="text-sm text-red-600 mt-1">{errors.number}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Nazwa <span className="text-red-600">*</span>
              </label>
              <Input
                value={data?.name || ''}
                onChange={(e) => {
                  onDataChange({ ...data, name: e.target.value });
                  onValidateField('name', e.target.value);
                }}
                onBlur={() => onTouchField('name')}
                placeholder="np. Rama"
                className={cn(
                  touched.name && errors.name && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.name && !!errors.name}
              />
              {touched.name && errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Numer artykułu (opcjonalny)</label>
            <Input
              value={data?.articleNumber || ''}
              onChange={(e) => onDataChange({ ...data, articleNumber: e.target.value || null })}
              placeholder="np. 123456"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Opis (opcjonalny)</label>
            <Input
              value={data?.description || ''}
              onChange={(e) => onDataChange({ ...data, description: e.target.value || null })}
              placeholder="np. Profil ramowy okienny"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? 'Zapisuję...' : mode === 'add' ? 'Dodaj' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
interface DeleteDialogProps {
  open: boolean;
  name: string;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteConfirmDialog({
  open,
  name,
  error,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź usunięcie</DialogTitle>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <p className="py-4">
            Czy na pewno chcesz usunąć <span className="font-semibold">{name}</span>? Tej operacji
            nie można cofnąć.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {error ? 'Zamknij' : 'Anuluj'}
          </Button>
          {!error && (
            <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
              Usuń
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
