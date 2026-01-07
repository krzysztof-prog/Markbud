'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileDepthsApi, type ProfileDepth } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Ruler } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';

export function ProfileDepthsTab() {
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    data: Partial<ProfileDepth> | null;
  }>({
    open: false,
    mode: 'add',
    data: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number;
    name: string;
  } | null>(null);

  // Validation
  const {
    errors,
    touched,
    validate: validateField,
    validateAll: validateForm,
    touch: touchField,
    reset: resetValidation,
  } = useFormValidation({
    profileType: [
      { validate: (v: string) => !!v?.trim(), message: 'Typ profilu jest wymagany' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Typ profilu musi mieć min. 2 znaki' },
    ],
    depthMm: [
      { validate: (v: number) => v > 0, message: 'Głębokość musi być większa od 0' },
      { validate: (v: number) => v <= 1000, message: 'Głębokość nie może być większa niż 1000mm' },
    ],
  });

  // Query
  const { data: profileDepths, isLoading } = useQuery({
    queryKey: ['profile-depths'],
    queryFn: profileDepthsApi.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: profileDepthsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-depths'] });
      setDialog({ open: false, mode: 'add', data: null });
      showSuccessToast('Głębokość profilu została dodana');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas dodawania', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProfileDepth> }) =>
      profileDepthsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-depths'] });
      setDialog({ open: false, mode: 'add', data: null });
      showSuccessToast('Głębokość profilu została zaktualizowana');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas aktualizacji', getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: profileDepthsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-depths'] });
      setDeleteDialog(null);
      showSuccessToast('Głębokość profilu została usunięta');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas usuwania', getErrorMessage(error));
    },
  });

  const handleSave = () => {
    const data = dialog.data;
    if (!data) return;

    const formData = {
      profileType: data.profileType || '',
      depthMm: Number(data.depthMm) || 0,
    };

    if (!validateForm(formData)) {
      Object.keys(formData).forEach((field) => touchField(field as keyof typeof formData));
      return;
    }

    if (dialog.mode === 'add') {
      createMutation.mutate({
        profileType: formData.profileType,
        depthMm: formData.depthMm,
        description: data.description || undefined,
      });
    } else if (data.id) {
      updateMutation.mutate({
        id: data.id,
        data: {
          profileType: formData.profileType,
          depthMm: formData.depthMm,
          description: data.description || undefined,
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteDialog) return;
    deleteMutation.mutate(deleteDialog.id);
  };

  // Spójny wrapper dla loading state - zapobiega layout shift
  if (isLoading) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Głębokości profili
              </CardTitle>
              <CardDescription>
                Zdefiniuj głębokości zajmowane przez różne typy profili na paletach
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Głębokości profili
            </CardTitle>
            <CardDescription>
              Zdefiniuj głębokości zajmowane przez różne typy profili na paletach
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() =>
              setDialog({
                open: true,
                mode: 'add',
                data: { profileType: '', depthMm: 0, description: '' },
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Dodaj głębokość
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Typ profilu</th>
                  <th className="px-4 py-3 text-center">Głębokość (mm)</th>
                  <th className="px-4 py-3 text-left">Opis</th>
                  <th className="px-4 py-3 text-center">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {profileDepths?.map((depth, index: number) => (
                  <tr
                    key={depth.id}
                    className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                  >
                    <td className="px-4 py-3 font-medium font-mono">{depth.profileType}</td>
                    <td className="px-4 py-3 text-center font-semibold">{depth.depthMm} mm</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {depth.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDialog({ open: true, mode: 'edit', data: depth })}
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: depth.id,
                              name: depth.profileType,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!profileDepths || profileDepths.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Brak zdefiniowanych głębokości profili
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Edit/Add */}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ open: false, mode: 'add', data: null });
            resetValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add'
                ? 'Dodaj głębokość profilu'
                : 'Edytuj głębokość profilu'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Typ profilu <span className="text-red-600">*</span>
              </label>
              <Input
                value={dialog.data?.profileType || ''}
                onChange={(e) => {
                  setDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, profileType: e.target.value },
                  }));
                  validateField('profileType', e.target.value);
                }}
                onBlur={() => touchField('profileType')}
                placeholder="np. VLAK, BLOK, szyba"
                className={cn(
                  touched.profileType &&
                    errors.profileType &&
                    'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.profileType && !!errors.profileType}
              />
              {touched.profileType && errors.profileType && (
                <p className="text-sm text-red-600 mt-1">{errors.profileType}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Głębokość (mm) <span className="text-red-600">*</span>
              </label>
              <Input
                type="number"
                value={dialog.data?.depthMm || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, depthMm: value },
                  }));
                  validateField('depthMm', value);
                }}
                onBlur={() => touchField('depthMm')}
                placeholder="95"
                className={cn(
                  touched.depthMm &&
                    errors.depthMm &&
                    'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={touched.depthMm && !!errors.depthMm}
              />
              {touched.depthMm && errors.depthMm && (
                <p className="text-sm text-red-600 mt-1">{errors.depthMm}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Opis (opcjonalny)</label>
              <Input
                value={dialog.data?.description || ''}
                onChange={(e) =>
                  setDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value },
                  }))
                }
                placeholder="np. Profil VLAK aluminiowy"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog({ open: false, mode: 'add', data: null });
                resetValidation();
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Zapisuję...'
                : dialog.mode === 'add'
                ? 'Dodaj'
                : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete confirmation */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Czy na pewno chcesz usunąć głębokość profilu{' '}
            <span className="font-semibold">{deleteDialog?.name}</span>? Tej operacji nie
            można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
