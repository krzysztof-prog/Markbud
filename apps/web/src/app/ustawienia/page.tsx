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
import { Save, Plus, Trash2, Pencil, FolderOpen, Mail, DollarSign, Package, X, FileBox, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderBrowser } from '@/components/ui/folder-browser';
import { useFormValidation } from '@/hooks/useFormValidation';
import { cn } from '@/lib/utils';
import { ProfileDepthsTab } from './ProfileDepthsTab';

interface PalletType {
  id: number;
  name: string;
  lengthMm: number;
  loadDepthMm: number;
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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Validation hooks
  const {
    errors: palletErrors,
    touched: palletTouched,
    validate: validatePalletField,
    validateAll: validatePalletForm,
    touch: touchPalletField,
    reset: resetPalletValidation,
  } = useFormValidation({
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
    lengthMm: [
      { validate: (v: number) => v > 0, message: 'Długość musi być większa od 0' },
    ],
    loadDepthMm: [
      { validate: (v: number) => v > 0, message: 'Szer. załadunku musi być większa od 0' },
    ],
  });

  const {
    errors: colorErrors,
    touched: colorTouched,
    validate: validateColorField,
    validateAll: validateColorForm,
    touch: touchColorField,
    reset: resetColorValidation,
  } = useFormValidation({
    code: [
      { validate: (v: string) => !!v?.trim(), message: 'Kod jest wymagany' },
    ],
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
    hexColor: [
      {
        validate: (v: string) => !v || /^#[0-9A-Fa-f]{6}$/.test(v),
        message: 'Nieprawidłowy format HEX (wymagany: #RRGGBB)'
      },
    ],
  });

  const {
    errors: profileErrors,
    touched: profileTouched,
    validate: validateProfileField,
    validateAll: validateProfileForm,
    touch: touchProfileField,
    reset: resetProfileValidation,
  } = useFormValidation({
    number: [
      { validate: (v: string) => !!v?.trim(), message: 'Numer jest wymagany' },
    ],
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
  });

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
      colorsApi.update(id, data as any),
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
      profilesApi.update(id, data as any),
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
      setDeleteError(null);
    },
    onError: (error: Error) => {
      setDeleteError(error.message || 'Nie można usunąć profilu');
    },
  });

  // File watcher status and restart
  const { data: fileWatcherStatus, refetch: refetchFileWatcherStatus } = useQuery({
    queryKey: ['file-watcher-status'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/settings/file-watcher/status`);
      return res.json();
    },
  });

  const restartFileWatcherMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/settings/file-watcher/restart`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Blad restartu file watchera');
      return res.json();
    },
    onSuccess: () => {
      refetchFileWatcherStatus();
    },
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleSaveAndRestartWatcher = async () => {
    await updateSettingsMutation.mutateAsync(settings);
    restartFileWatcherMutation.mutate();
  };

  // Pallet handlers
  const handleSavePallet = () => {
    const data = palletDialog.data;
    if (!data) return;

    // Validate all fields
    const formData = {
      name: data.name || '',
      lengthMm: Number(data.lengthMm) || 0,
      loadDepthMm: Number(data.loadDepthMm) || 0,
    };

    if (!validatePalletForm(formData)) {
      // Mark all fields as touched to show errors
      Object.keys(formData).forEach((field) => touchPalletField(field as keyof typeof formData));
      return;
    }

    if (palletDialog.mode === 'add') {
      createPalletMutation.mutate({
        name: formData.name,
        lengthMm: formData.lengthMm,
        loadDepthMm: formData.loadDepthMm,
      });
    } else if (data.id) {
      updatePalletMutation.mutate({
        id: data.id,
        data: {
          name: formData.name,
          lengthMm: formData.lengthMm,
          loadDepthMm: formData.loadDepthMm,
        },
      });
    }
  };

  // Color handlers
  const handleSaveColor = () => {
    const data = colorDialog.data;
    if (!data) return;

    // Validate all fields
    const formData = {
      code: data.code || '',
      name: data.name || '',
      hexColor: data.hexColor || '',
    };

    if (!validateColorForm(formData)) {
      // Mark all fields as touched to show errors
      Object.keys(formData).forEach((field) => touchColorField(field as keyof typeof formData));
      return;
    }

    if (colorDialog.mode === 'add') {
      createColorMutation.mutate({
        code: formData.code,
        name: formData.name,
        type: (data.type as 'typical' | 'atypical') || 'typical',
        hexColor: formData.hexColor || undefined,
      });
    } else if (data.id) {
      updateColorMutation.mutate({
        id: data.id,
        data: {
          code: formData.code,
          name: formData.name,
          type: (data.type as 'typical' | 'atypical') || 'typical',
          hexColor: formData.hexColor || undefined,
        },
      });
    }
  };

  // Profile handlers
  const handleSaveProfile = () => {
    const data = profileDialog.data;
    if (!data) return;

    // Validate all fields
    const formData = {
      number: data.number || '',
      name: data.name || '',
    };

    if (!validateProfileForm(formData)) {
      // Mark all fields as touched to show errors
      Object.keys(formData).forEach((field) => touchProfileField(field as keyof typeof formData));
      return;
    }

    if (profileDialog.mode === 'add') {
      createProfileMutation.mutate({
        number: formData.number,
        name: formData.name,
        description: data.description || undefined,
      });
    } else if (data.id) {
      updateProfileMutation.mutate({
        id: data.id,
        data: {
          number: formData.number,
          name: formData.name,
          description: data.description || undefined,
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
                  <FileBox className="h-5 w-5" />
                  Folder importow dostaw
                </CardTitle>
                <CardDescription>
                  Glowna sciezka do folderow z danymi dostaw (CSV z programu PROF)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FolderBrowser
                  value={settings.importsBasePath || ''}
                  onChange={(path) => handleSettingChange('importsBasePath', path)}
                  placeholder="C:\Dostawy"
                  description="Folder zawierajacy podfoldery z datami dostaw (np. 01.12.2025)"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Monitorowane foldery
                </CardTitle>
                <CardDescription>
                  Sciezki do folderow, ktore system bedzie skanowac w poszukiwaniu nowych plikow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FolderBrowser
                  value={settings.watchFolderUzyteBele || ''}
                  onChange={(path) => handleSettingChange('watchFolderUzyteBele', path)}
                  label='Folder "uzyte bele" (pliki CSV)'
                  placeholder="./uzyte bele"
                  description="Folder z plikami CSV zawierajacymi dane o uzytych belach"
                />
                <FolderBrowser
                  value={settings.watchFolderCeny || ''}
                  onChange={(path) => handleSettingChange('watchFolderCeny', path)}
                  label='Folder "ceny" (pliki PDF)'
                  placeholder="./ceny"
                  description="Folder z plikami PDF z cenami"
                />
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

            {/* File Watcher Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Status monitorowania
                </CardTitle>
                <CardDescription>
                  Aktualnie monitorowane sciezki przez File Watcher
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fileWatcherStatus?.running ? (
                  <>
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        File Watcher dziala poprawnie
                      </AlertDescription>
                    </Alert>
                    <div className="text-sm space-y-1">
                      <p><strong>Folder importow:</strong> <code className="text-xs bg-muted px-1 rounded">{fileWatcherStatus.paths?.importsBasePath || 'nie ustawiono'}</code></p>
                      <p><strong>Folder uzyte bele:</strong> <code className="text-xs bg-muted px-1 rounded">{fileWatcherStatus.paths?.watchFolderUzyteBele || 'nie ustawiono'}</code></p>
                      <p><strong>Folder ceny:</strong> <code className="text-xs bg-muted px-1 rounded">{fileWatcherStatus.paths?.watchFolderCeny || 'nie ustawiono'}</code></p>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      File Watcher nie jest uruchomiony
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  onClick={() => restartFileWatcherMutation.mutate()}
                  disabled={restartFileWatcherMutation.isPending}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', restartFileWatcherMutation.isPending && 'animate-spin')} />
                  Restartuj File Watcher
                </Button>
              </CardContent>
            </Card>

            {hasChanges && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz zmiany
                </Button>
                <Button onClick={handleSaveAndRestartWatcher} disabled={updateSettingsMutation.isPending || restartFileWatcherMutation.isPending}>
                  <RefreshCw className={cn('h-4 w-4 mr-2', restartFileWatcherMutation.isPending && 'animate-spin')} />
                  Zapisz i restartuj watcher
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Palety */}
          <TabsContent value="pallets" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Typy palet</CardTitle>
                  <CardDescription>Zdefiniuj rodzaje palet używanych do pakowania</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPalletDialog({ open: true, mode: 'add', data: { name: '', lengthMm: 0, loadDepthMm: 0 } })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj typ
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left">Nazwa</th>
                        <th className="px-4 py-3 text-center">Długość (mm)</th>
                        <th className="px-4 py-3 text-center">Szer. załadunku (mm)</th>
                        <th className="px-4 py-3 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {palletTypes?.map((pallet, index: number) => (
                        <tr key={pallet.id} className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                          <td className="px-4 py-3 font-medium">{pallet.name}</td>
                          <td className="px-4 py-3 text-center">{pallet.lengthMm}</td>
                          <td className="px-4 py-3 text-center">{pallet.loadDepthMm}</td>
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

            {/* Głębokości profili */}
            <ProfileDepthsTab />
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
                      {colors?.map((color, index: number) => (
                        <tr key={color.id} className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
                      {profiles?.map((profile, index: number) => (
                        <tr key={profile.id} className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
      <Dialog
        open={palletDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPalletDialog({ open: false, mode: 'add', data: null });
            resetPalletValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {palletDialog.mode === 'add' ? 'Dodaj typ palety' : 'Edytuj typ palety'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Nazwa <span className="text-red-600">*</span>
              </label>
              <Input
                value={palletDialog.data?.name || ''}
                onChange={(e) => {
                  setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                  validatePalletField('name', e.target.value);
                }}
                onBlur={() => touchPalletField('name')}
                placeholder="np. EUR 120x80"
                className={cn(
                  palletTouched.name && palletErrors.name && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={palletTouched.name && !!palletErrors.name}
                aria-describedby={palletTouched.name && palletErrors.name ? 'pallet-name-error' : undefined}
              />
              {palletTouched.name && palletErrors.name && (
                <p id="pallet-name-error" className="text-sm text-red-600 mt-1">
                  {palletErrors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Długość (mm) <span className="text-red-600">*</span>
                </label>
                <Input
                  type="number"
                  value={palletDialog.data?.lengthMm || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, lengthMm: value } }));
                    validatePalletField('lengthMm', value);
                  }}
                  onBlur={() => touchPalletField('lengthMm')}
                  className={cn(
                    palletTouched.lengthMm && palletErrors.lengthMm && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={palletTouched.lengthMm && !!palletErrors.lengthMm}
                />
                {palletTouched.lengthMm && palletErrors.lengthMm && (
                  <p className="text-sm text-red-600 mt-1">{palletErrors.lengthMm}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Szer. załadunku (mm) <span className="text-red-600">*</span>
                </label>
                <Input
                  type="number"
                  value={palletDialog.data?.loadDepthMm || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setPalletDialog((prev) => ({ ...prev, data: { ...prev.data, loadDepthMm: value } }));
                    validatePalletField('loadDepthMm', value);
                  }}
                  onBlur={() => touchPalletField('loadDepthMm')}
                  className={cn(
                    palletTouched.loadDepthMm && palletErrors.loadDepthMm && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={palletTouched.loadDepthMm && !!palletErrors.loadDepthMm}
                />
                {palletTouched.loadDepthMm && palletErrors.loadDepthMm && (
                  <p className="text-sm text-red-600 mt-1">{palletErrors.loadDepthMm}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPalletDialog({ open: false, mode: 'add', data: null });
                resetPalletValidation();
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSavePallet}
              disabled={createPalletMutation.isPending || updatePalletMutation.isPending}
            >
              {createPalletMutation.isPending || updatePalletMutation.isPending
                ? 'Zapisuję...'
                : palletDialog.mode === 'add'
                ? 'Dodaj'
                : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Kolor */}
      <Dialog
        open={colorDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setColorDialog({ open: false, mode: 'add', data: null });
            resetColorValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {colorDialog.mode === 'add' ? 'Dodaj kolor' : 'Edytuj kolor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Kod <span className="text-red-600">*</span>
                </label>
                <Input
                  value={colorDialog.data?.code || ''}
                  onChange={(e) => {
                    setColorDialog((prev) => ({ ...prev, data: { ...prev.data, code: e.target.value } }));
                    validateColorField('code', e.target.value);
                  }}
                  onBlur={() => touchColorField('code')}
                  placeholder="np. 050"
                  className={cn(
                    colorTouched.code && colorErrors.code && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={colorTouched.code && !!colorErrors.code}
                />
                {colorTouched.code && colorErrors.code && (
                  <p className="text-sm text-red-600 mt-1">{colorErrors.code}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Nazwa <span className="text-red-600">*</span>
                </label>
                <Input
                  value={colorDialog.data?.name || ''}
                  onChange={(e) => {
                    setColorDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                    validateColorField('name', e.target.value);
                  }}
                  onBlur={() => touchColorField('name')}
                  placeholder="np. Kremowy"
                  className={cn(
                    colorTouched.name && colorErrors.name && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={colorTouched.name && !!colorErrors.name}
                />
                {colorTouched.name && colorErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{colorErrors.name}</p>
                )}
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
                  <div className="flex-1">
                    <Input
                      value={colorDialog.data?.hexColor || ''}
                      onChange={(e) => {
                        setColorDialog((prev) => ({ ...prev, data: { ...prev.data, hexColor: e.target.value } }));
                        validateColorField('hexColor', e.target.value);
                      }}
                      onBlur={() => touchColorField('hexColor')}
                      placeholder="#FFFFFF"
                      className={cn(
                        colorTouched.hexColor && colorErrors.hexColor && 'border-red-500 focus-visible:ring-red-500'
                      )}
                      aria-invalid={colorTouched.hexColor && !!colorErrors.hexColor}
                    />
                    {colorTouched.hexColor && colorErrors.hexColor && (
                      <p className="text-sm text-red-600 mt-1">{colorErrors.hexColor}</p>
                    )}
                  </div>
                  <input
                    type="color"
                    value={colorDialog.data?.hexColor || '#FFFFFF'}
                    onChange={(e) => {
                      setColorDialog((prev) => ({ ...prev, data: { ...prev.data, hexColor: e.target.value } }));
                      validateColorField('hexColor', e.target.value);
                    }}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setColorDialog({ open: false, mode: 'add', data: null });
                resetColorValidation();
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSaveColor}
              disabled={createColorMutation.isPending || updateColorMutation.isPending}
            >
              {createColorMutation.isPending || updateColorMutation.isPending
                ? 'Zapisuję...'
                : colorDialog.mode === 'add'
                ? 'Dodaj'
                : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Profil */}
      <Dialog
        open={profileDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setProfileDialog({ open: false, mode: 'add', data: null });
            resetProfileValidation();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileDialog.mode === 'add' ? 'Dodaj profil PVC' : 'Edytuj profil PVC'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Numer <span className="text-red-600">*</span>
                </label>
                <Input
                  value={profileDialog.data?.number || ''}
                  onChange={(e) => {
                    setProfileDialog((prev) => ({ ...prev, data: { ...prev.data, number: e.target.value } }));
                    validateProfileField('number', e.target.value);
                  }}
                  onBlur={() => touchProfileField('number')}
                  placeholder="np. 9016"
                  className={cn(
                    profileTouched.number && profileErrors.number && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={profileTouched.number && !!profileErrors.number}
                />
                {profileTouched.number && profileErrors.number && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.number}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Nazwa <span className="text-red-600">*</span>
                </label>
                <Input
                  value={profileDialog.data?.name || ''}
                  onChange={(e) => {
                    setProfileDialog((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }));
                    validateProfileField('name', e.target.value);
                  }}
                  onBlur={() => touchProfileField('name')}
                  placeholder="np. Rama"
                  className={cn(
                    profileTouched.name && profileErrors.name && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={profileTouched.name && !!profileErrors.name}
                />
                {profileTouched.name && profileErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.name}</p>
                )}
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
            <Button
              variant="outline"
              onClick={() => {
                setProfileDialog({ open: false, mode: 'add', data: null });
                resetProfileValidation();
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
            >
              {createProfileMutation.isPending || updateProfileMutation.isPending
                ? 'Zapisuję...'
                : profileDialog.mode === 'add'
                ? 'Dodaj'
                : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Potwierdzenie usunięcia */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog(null);
          setDeleteError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
          </DialogHeader>
          {deleteError ? (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : (
            <p className="py-4">
              Czy na pewno chcesz usunąć{' '}
              <span className="font-semibold">{deleteDialog?.name}</span>?
              Tej operacji nie można cofnąć.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialog(null);
              setDeleteError(null);
            }}>
              {deleteError ? 'Zamknij' : 'Anuluj'}
            </Button>
            {!deleteError && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deletePalletMutation.isPending || deleteColorMutation.isPending || deleteProfileMutation.isPending}
              >
                Usuń
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
