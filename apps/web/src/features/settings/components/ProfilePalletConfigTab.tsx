'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profilePalletConfigApi, profilesApi, type ProfilePalletConfig } from '@/lib/api';
import {
  Dialog,
  DialogContent,
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
import { Plus, Trash2, Pencil, Package } from 'lucide-react';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';

export function ProfilePalletConfigTab() {
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    data: { id?: number; profileId?: number; beamsPerPallet?: number } | null;
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

  // Queries
  const { data: configs, isLoading } = useQuery({
    queryKey: ['profile-pallet-configs'],
    queryFn: profilePalletConfigApi.getAll,
  });

  const { data: allProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  // Profile bez istniejącego przelicznika (do dropdowna dodawania)
  const availableProfiles = allProfiles?.filter(
    (p) => !configs?.some((c) => c.profileId === p.id)
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: profilePalletConfigApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pallet-configs'] });
      setDialog({ open: false, mode: 'add', data: null });
      showSuccessToast('Przelicznik został dodany');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas dodawania', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { beamsPerPallet: number } }) =>
      profilePalletConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pallet-configs'] });
      setDialog({ open: false, mode: 'add', data: null });
      showSuccessToast('Przelicznik został zaktualizowany');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas aktualizacji', getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: profilePalletConfigApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-pallet-configs'] });
      setDeleteDialog(null);
      showSuccessToast('Przelicznik został usunięty');
    },
    onError: (error) => {
      showErrorToast('Błąd podczas usuwania', getErrorMessage(error));
    },
  });

  const handleSave = () => {
    const data = dialog.data;
    if (!data) return;

    const beamsPerPallet = Number(data.beamsPerPallet) || 0;
    if (beamsPerPallet <= 0) {
      showErrorToast('Błąd walidacji', 'Ilość beli na paletę musi być większa od 0');
      return;
    }

    if (dialog.mode === 'add') {
      if (!data.profileId) {
        showErrorToast('Błąd walidacji', 'Wybierz profil');
        return;
      }
      createMutation.mutate({
        profileId: data.profileId,
        beamsPerPallet,
      });
    } else if (data.id) {
      updateMutation.mutate({
        id: data.id,
        data: { beamsPerPallet },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteDialog) return;
    deleteMutation.mutate(deleteDialog.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Przelicznik palet na bele
            </CardTitle>
            <CardDescription>
              Ile beli danego profilu mieści się w jednej palecie Schuco
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() =>
              setDialog({
                open: true,
                mode: 'add',
                data: { profileId: undefined, beamsPerPallet: undefined },
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Dodaj przelicznik
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Nr profilu</th>
                  <th className="px-4 py-3 text-left">Nazwa</th>
                  <th className="px-4 py-3 text-center">Beli / paleta</th>
                  <th className="px-4 py-3 text-center">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {configs?.map((config, index: number) => (
                  <tr
                    key={config.id}
                    className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                  >
                    <td className="px-4 py-3 font-medium font-mono">
                      {config.profile.number}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {config.profile.name}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {config.beamsPerPallet}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDialog({
                              open: true,
                              mode: 'edit',
                              data: {
                                id: config.id,
                                profileId: config.profileId,
                                beamsPerPallet: config.beamsPerPallet,
                              },
                            })
                          }
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: config.id,
                              name: `${config.profile.number} (${config.profile.name})`,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!configs || configs.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Brak zdefiniowanych przeliczników palet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Add/Edit */}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false, mode: 'add', data: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === 'add'
                ? 'Dodaj przelicznik palety'
                : 'Edytuj przelicznik palety'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dialog.mode === 'add' ? (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Profil <span className="text-red-600">*</span>
                </label>
                <Select
                  value={dialog.data?.profileId?.toString() || ''}
                  onValueChange={(value) =>
                    setDialog((prev) => ({
                      ...prev,
                      data: { ...prev.data, profileId: parseInt(value) },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz profil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id.toString()}>
                        {profile.number} - {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium block mb-1">Profil</label>
                <Input
                  value={
                    configs?.find((c) => c.id === dialog.data?.id)
                      ? `${configs.find((c) => c.id === dialog.data?.id)!.profile.number} - ${configs.find((c) => c.id === dialog.data?.id)!.profile.name}`
                      : ''
                  }
                  disabled
                  className="bg-slate-50"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-1">
                Ilość beli na paletę <span className="text-red-600">*</span>
              </label>
              <Input
                type="number"
                value={dialog.data?.beamsPerPallet || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setDialog((prev) => ({
                    ...prev,
                    data: { ...prev.data, beamsPerPallet: value },
                  }));
                }}
                placeholder="np. 70"
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ open: false, mode: 'add', data: null })}
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
            Czy na pewno chcesz usunąć przelicznik dla profilu{' '}
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
              {deleteMutation.isPending ? 'Usuwanie...' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
