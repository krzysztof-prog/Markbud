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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DocumentAuthorMapping {
  id?: number;
  authorName: string;
  userId: number;
}

interface User {
  id: number;
  email: string;
  name: string;
}

interface DocumentAuthorMappingDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<DocumentAuthorMapping> | null;
  users: User[] | undefined;
  onOpenChange: (open: boolean) => void;
  onDataChange: (data: Partial<DocumentAuthorMapping>) => void;
  onSave: () => void;
  isPending: boolean;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  onValidateField: (field: 'authorName' | 'userId', value: string | number) => void;
  onTouchField: (field: 'authorName' | 'userId') => void;
}

export function DocumentAuthorMappingDialog({
  open,
  mode,
  data,
  users,
  onOpenChange,
  onDataChange,
  onSave,
  isPending,
  errors,
  touched,
  onValidateField,
  onTouchField,
}: DocumentAuthorMappingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Dodaj mapowanie autora' : 'Edytuj mapowanie autora'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Autor z CSV <span className="text-red-600">*</span>
            </label>
            <Input
              value={data?.authorName || ''}
              onChange={(e) => {
                onDataChange({ ...data, authorName: e.target.value });
                onValidateField('authorName', e.target.value);
              }}
              onBlur={() => onTouchField('authorName')}
              placeholder="np. Wlodek, Arek, Krzysztof"
              className={cn(
                touched.authorName && errors.authorName && 'border-red-500 focus-visible:ring-red-500'
              )}
              aria-invalid={touched.authorName && !!errors.authorName}
            />
            {touched.authorName && errors.authorName && (
              <p className="text-sm text-red-600 mt-1">{errors.authorName}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Nazwa autora jak pojawia się w pliku CSV (np. &quot;Autor dokumentu: Wlodek&quot;)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Użytkownik <span className="text-red-600">*</span>
            </label>
            <Select
              value={data?.userId ? String(data.userId) : undefined}
              onValueChange={(value) => {
                const userId = parseInt(value);
                onDataChange({ ...data, userId });
                onValidateField('userId', userId);
                onTouchField('userId');
              }}
            >
              <SelectTrigger
                className={cn(
                  touched.userId && errors.userId && 'border-red-500 focus-visible:ring-red-500'
                )}
              >
                <SelectValue placeholder="Wybierz użytkownika" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
                {(!users || users.length === 0) && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    Brak dostępnych użytkowników
                  </div>
                )}
              </SelectContent>
            </Select>
            {touched.userId && errors.userId && (
              <p className="text-sm text-red-600 mt-1">{errors.userId}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? 'Zapisuje...' : mode === 'add' ? 'Dodaj' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
