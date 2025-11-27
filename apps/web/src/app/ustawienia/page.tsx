'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { settingsApi, colorsApi, profilesApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, Plus, Trash2, Pencil, FolderOpen, Mail, DollarSign, Package, X } from 'lucide-react';

interface PalletType {
  id: number;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
}

interface Color {
  id: number;
  code: string;
  name: string;
  type: string;
  hexColor: string | null;
}

interface Profile {
  id: number;
  number: string;
  name: string;
  description: string | null;
}

export default function UstawieniaPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Dialog states
  const [palletDialog, setPalletDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Partial<PalletType> | null }>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [colorDialog, setColorDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Partial<Color> | null }>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [profileDialog, setProfileDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Partial<Profile> | null }>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'pallet' | 'color' | 'profile'; id: number; name: string } | null>(null);

  // Queries
  const { data: initialSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const { data: palletTypes } = useQuery({
    queryKey: ['pallet-types'],
    queryFn: settingsApi.getPalletTypes,
  });

  const { data: colors } = useQuery({
    queryKey: ['colors'],
    queryFn: () => colorsApi.getAll(),
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Settings mutations
  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
    },
  });

  // Pallet mutations
  const createPalletMutation = useMutation({
    mutationFn: settingsApi.createPalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      setPalletDialog({ open: false, mode: 'add', data: null });
    },
  });

  const updatePalletMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PalletType> }) =>
      settingsApi.updatePalletType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      setPalletDialog({ open: false, mode: 'add', data: null });
    },
  });

  const deletePalletMutation = useMutation({
    mutationFn: settingsApi.deletePalletType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pallet-types'] });
      setDeleteDialog(null);
    },
  });

  // Color mutations
  const createColorMutation = useMutation({
    mutationFn: colorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      setColorDialog({ open: false, mode: 'add', data: null });
    },
  });

  const updateColorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Color> }) =>
      colorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      setColorDialog({ open: false, mode: 'add', data: null });
    },
  });

  const deleteColorMutation = useMutation({
    mutationFn: colorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
      setDeleteDialog(null);
    },
  });

  // Profile mutations
  const createProfileMutation = useMutation({
    mutationFn: profilesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setProfileDialog({ open: false, mode: 'add', data: null });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Profile> }) =>
      profilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setProfileDialog({ open: false, mode: 'add', data: null });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: profilesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setDeleteDialog(null);
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  // Pallet handlers
  const handleSavePallet = () => {
    const data = palletDialog.data;
    if (!data?.name || !data?.lengthMm || !data?.widthMm || !data?.heightMm) return;

    if (palletDialog.mode === 'add') {
      createPalletMutation.mutate({
        name: data.name,
        lengthMm: Number(data.lengthMm),
        widthMm: Number(data.widthMm),
        heightMm: Number(data.heightMm),
        loadWidthMm: Number(data.loadWidthMm) || 0,
      });
    } else if (data.id) {
      updatePalletMutation.mutate({
        id: data.id,
        data: {
          name: data.name,
          lengthMm: Number(data.lengthMm),
          widthMm: Number(data.widthMm),
          heightMm: Number(data.heightMm),
          loadWidthMm: Number(data.loadWidthMm) || 0,
        },
      });
    }
  };

  // Color handlers
  const handleSaveColor = () => {
    const data = colorDialog.data;
    if (!data?.code || !data?.name) return;

    if (colorDialog.mode === 'add') {
      createColorMutation.mutate({
        code: data.code,
        name: data.name,
        type: data.type || 'typical',
        hexColor: data.hexColor || null,
      });
    } else if (data.id) {
      updateColorMutation.mutate({
        id: data.id,
        data: {
          code: data.code,
          name: data.name,
          type: data.type || 'typical',
          hexColor: data.hexColor || null,
        },
      });
    }
  };

  // Profile handlers
  const handleSaveProfile = () => {
    const data = profileDialog.data;
    if (!data?.number || !data?.name) return;

    if (profileDialog.mode === 'add') {
      createProfileMutation.mutate({
        number: data.number,
        name: data.name,
        description: data.description || null,
      });
    } else if (data.id) {
      updateProfileMutation.mutate({
        id: data.id,
        data: {
          number: data.number,
          name: data.name,
          description: data.description || null,
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'pallet') {
      deletePalletMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === 'color') {
      deleteColorMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === 'profile') {
      deleteProfileMutation.mutate(deleteDialog.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Ustawienia" />

      <div className="flex-1 p-6 overflow-auto">
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">Ogólne</TabsTrigger>
            <TabsTrigger value="folders">Foldery</TabsTrigger>
            <TabsTrigger value="pallets">Palety</TabsTrigger>
            <TabsTrigger value="colors">Kolory</TabsTrigger>
            <TabsTrigger value="profiles">Profile PVC</TabsTrigger>
          </TabsList>

          {/* Ogólne */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Kurs walut
                </CardTitle>
                <CardDescription>
                  Kurs wymiany EUR na PLN do zestawień
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">1 EUR =</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.eurToPlnRate || ''}
                    onChange={(e) => handleSettingChange('eurToPlnRate', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm">PLN</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Magazyn
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Próg niskiego stanu magazynu (bele)
                  </label>
                  <Input
                    type="number"
                    value={settings.lowStockThreshold || ''}
                    onChange={(e) => handleSettingChange('lowStockThreshold', e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            {hasChanges && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz zmiany
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Foldery */}
          <TabsContent value="folders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Monitorowane foldery
                </CardTitle>
                <CardDescription>
                  Ścieżki do folderów, które system będzie skanować w poszukiwaniu nowych plików
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Folder "użyte bele" (pliki CSV)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={settings.watchFolderUzyteBele || ''}
                      onChange={(e) => handleSettingChange('watchFolderUzyteBele', e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="./uzyte bele"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Folder "ceny" (pliki PDF)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={settings.watchFolderCeny || ''}
                      onChange={(e) => handleSettingChange('watchFolderCeny', e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="./ceny"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Konfiguracja IMAP
                </CardTitle>
                <CardDescription>
                  Ustawienia serwera pocztowego do automatycznego pobierania załączników
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Serwer IMAP</label>
                    <Input
                      type="text"
                      value={settings.imapHost || ''}
                      onChange={(e) => handleSettingChange('imapHost', e.target.value)}
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Port</label>
                    <Input
                      type="number"
                      value={settings.imapPort || ''}
                      onChange={(e) => handleSettingChange('imapPort', e.target.value)}
                      placeholder="993"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Użytkownik</label>
                  <Input
                    type="text"
                    value={settings.imapUser || ''}
                    onChange={(e) => handleSettingChange('imapUser', e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            {hasChanges && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz zmiany
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Palety */}
          <TabsContent value="pallets">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Typy palet</CardTitle>
                  <CardDescription>Zdefiniuj rodzaje palet używanych do pakowania</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPalletDialog({ open: true, mode: 'add', data: { name: '', lengthMm: 0, widthMm: 0, heightMm: 0, loadWidthMm: 0 } })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj typ
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Nazwa</th>
                        <th className="px-4 py-3 text-center">Długość (mm)</th>
                        <th className="px-4 py-3 text-center">Szerokość (mm)</th>
                        <th className="px-4 py-3 text-center">Wysokość (mm)</th>
                        <th className="px-4 py-3 text-center">Szer. załadunku (mm)</th>
                        <th className="px-4 py-3 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {palletTypes?.map((pallet: PalletType) => (
                        <tr key={pallet.id} className="border-t">
                          <td className="px-4 py-3 font-medium">{pallet.name}</td>
                          <td className="px-4 py-3 text-center">{pallet.lengthMm}</td>
                          <td className="px-4 py-3 text-center">{pallet.widthMm}</td>
                          <td className="px-4 py-3 text-center">{pallet.heightMm}</td>
                          <td className="px-4 py-3 text-center">{pallet.loadWidthMm}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPalletDialog({ open: true, mode: 'edit', data: pallet })}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, type: 'pallet', id: pallet.id, name: pallet.name })}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!palletTypes || palletTypes.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            Brak typów palet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kolory */}
          <TabsContent value="colors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kolory</CardTitle>
                  <CardDescription>Lista wszystkich kolorów profili</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setColorDialog({ open: true, mode: 'add', data: { code: '', name: '', type: 'typical', hexColor: '' } })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj kolor
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Kolor</th>
                        <th className="px-4 py-3 text-left">Kod</th>
                        <th className="px-4 py-3 text-left">Nazwa</th>
                        <th className="px-4 py-3 text-left">Typ</th>
                        <th className="px-4 py-3 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colors?.map((color: Color) => (
                        <tr key={color.id} className="border-t">
                          <td className="px-4 py-3">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: color.hexColor || '#ccc' }}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono">{color.code}</td>
                          <td className="px-4 py-3">{color.name}</td>
                          <td className="px-4 py-3">
                            {color.type === 'typical' ? 'Typowy' : 'Nietypowy'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setColorDialog({ open: true, mode: 'edit', data: color })}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, type: 'color', id: color.id, name: color.name })}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!colors || colors.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Brak kolorów
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile PVC */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile PVC</CardTitle>
                  <CardDescription>Lista wszystkich profili</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setProfileDialog({ open: true, mode: 'add', data: { number: '', name: '', description: '' } })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj profil
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Numer</th>
                        <th className="px-4 py-3 text-left">Nazwa</th>
                        <th className="px-4 py-3 text-left">Opis</th>
                        <th className="px-4 py-3 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles?.map((profile: Profile) => (
                        <tr key={profile.id} className="border-t">
                          <td className="px-4 py-3 font-mono font-medium">{profile.number}</td>
                          <td className="px-4 py-3">{profile.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {profile.description || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setProfileDialog({ open: true, mode: 'edit', data: profile })}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, type: 'profile', id: profile.id, name: profile.name })}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!profiles || profiles.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            Brak profili
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Paleta */}
      <Dialog open={palletDialog.open} onOpenChange={(open) => !open && setPalletDialog({ open: false, mode: 'add', data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {palletDialog.mode === 'add' ? 'Dodaj typ palety' : 'Edytuj typ palety'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nazwa</label>
              <Input
                value={palletDialog.data?.name || ''}
                onChange={(e) => setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                placeholder="np. EUR 120x80"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Długość (mm)</label>
                <Input
                  type="number"
                  value={palletDialog.data?.lengthMm || ''}
                  onChange={(e) => setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, lengthMm: parseInt(e.target.value) || 0 } }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Szerokość (mm)</label>
                <Input
                  type="number"
                  value={palletDialog.data?.widthMm || ''}
                  onChange={(e) => setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, widthMm: parseInt(e.target.value) || 0 } }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Wysokość (mm)</label>
                <Input
                  type="number"
                  value={palletDialog.data?.heightMm || ''}
                  onChange={(e) => setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, heightMm: parseInt(e.target.value) || 0 } }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Szer. załadunku (mm)</label>
                <Input
                  type="number"
                  value={palletDialog.data?.loadWidthMm || ''}
                  onChange={(e) => setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, loadWidthMm: parseInt(e.target.value) || 0 } }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPalletDialog({ open: false, mode: 'add', data: null })}>
              Anuluj
            </Button>
            <Button onClick={handleSavePallet} disabled={createPalletMutation.isPending || updatePalletMutation.isPending}>
              {palletDialog.mode === 'add' ? 'Dodaj' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Kolor */}
      <Dialog open={colorDialog.open} onOpenChange={(open) => !open && setColorDialog({ open: false, mode: 'add', data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {colorDialog.mode === 'add' ? 'Dodaj kolor' : 'Edytuj kolor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Kod</label>
                <Input
                  value={colorDialog.data?.code || ''}
                  onChange={(e) => setColorDialog((prev) => ({ ...prev, data: { ...prev.data, code: e.target.value } }))}
                  placeholder="np. 050"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nazwa</label>
                <Input
                  value={colorDialog.data?.name || ''}
                  onChange={(e) => setColorDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  placeholder="np. Kremowy"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Typ</label>
                <select
                  value={colorDialog.data?.type || 'typical'}
                  onChange={(e) => setColorDialog((prev) => ({ ...prev, data: { ...prev.data, type: e.target.value } }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="typical">Typowy</option>
                  <option value="atypical">Nietypowy</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Kolor (HEX)</label>
                <div className="flex gap-2">
                  <Input
                    value={colorDialog.data?.hexColor || ''}
                    onChange={(e) => setColorDialog((prev) => ({ ...prev, data: { ...prev.data, hexColor: e.target.value } }))}
                    placeholder="#FFFFFF"
                  />
                  <input
                    type="color"
                    value={colorDialog.data?.hexColor || '#FFFFFF'}
                    onChange={(e) => setColorDialog((prev) => ({ ...prev, data: { ...prev.data, hexColor: e.target.value } }))}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColorDialog({ open: false, mode: 'add', data: null })}>
              Anuluj
            </Button>
            <Button onClick={handleSaveColor} disabled={createColorMutation.isPending || updateColorMutation.isPending}>
              {colorDialog.mode === 'add' ? 'Dodaj' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Profil */}
      <Dialog open={profileDialog.open} onOpenChange={(open) => !open && setProfileDialog({ open: false, mode: 'add', data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileDialog.mode === 'add' ? 'Dodaj profil PVC' : 'Edytuj profil PVC'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Numer</label>
                <Input
                  value={profileDialog.data?.number || ''}
                  onChange={(e) => setProfileDialog((prev) => ({ ...prev, data: { ...prev.data, number: e.target.value } }))}
                  placeholder="np. 9016"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nazwa</label>
                <Input
                  value={profileDialog.data?.name || ''}
                  onChange={(e) => setProfileDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  placeholder="np. Rama"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Opis (opcjonalny)</label>
              <Input
                value={profileDialog.data?.description || ''}
                onChange={(e) => setProfileDialog((prev) => ({ ...prev, data: { ...prev.data, description: e.target.value } }))}
                placeholder="np. Profil ramowy okienny"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog({ open: false, mode: 'add', data: null })}>
              Anuluj
            </Button>
            <Button onClick={handleSaveProfile} disabled={createProfileMutation.isPending || updateProfileMutation.isPending}>
              {profileDialog.mode === 'add' ? 'Dodaj' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Potwierdzenie usunięcia */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Czy na pewno chcesz usunąć{' '}
            <span className="font-semibold">{deleteDialog?.name}</span>?
            Tej operacji nie można cofnąć.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePalletMutation.isPending || deleteColorMutation.isPending || deleteProfileMutation.isPending}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
