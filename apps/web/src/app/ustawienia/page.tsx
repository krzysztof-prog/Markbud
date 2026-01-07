'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { settingsApi, colorsApi, profilesApi } from '@/lib/api';
import { getAuthToken } from '@/lib/auth-token';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  GeneralSettingsTab,
  FoldersTab,
  UserFolderTab,
  GlassWatchTab,
  PalletTypesTab,
  ColorsTab,
  ProfilesTab,
  PalletDialog,
  ColorDialog,
  ProfileDialog,
  DeleteConfirmDialog,
} from '@/features/settings/components';
import {
  useUpdateSettings,
  usePalletTypeMutations,
  useColorMutations,
  useProfileMutations,
  useFileWatcher,
  useUserFolderPath,
} from '@/features/settings/hooks';
import { toast } from '@/hooks/useToast';

// Types
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
  hexColor?: string | null;
}

interface Profile {
  id: number;
  number: string;
  name: string;
  description?: string | null;
  articleNumber?: string | null;
}

type DialogState<T> = {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<T> | null;
};

type DeleteDialogState = {
  open: boolean;
  type: 'pallet' | 'color' | 'profile';
  id: number;
  name: string;
} | null;

export default function UstawieniaPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [userFolderPath, setUserFolderPath] = useState<string>('');
  const [userFolderHasChanges, setUserFolderHasChanges] = useState(false);

  // Dialog states
  const [palletDialog, setPalletDialog] = useState<DialogState<PalletType>>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [colorDialog, setColorDialog] = useState<DialogState<Color>>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [profileDialog, setProfileDialog] = useState<DialogState<Profile>>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
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
    lengthMm: [{ validate: (v: number) => v > 0, message: 'Długość musi być większa od 0' }],
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
    code: [{ validate: (v: string) => !!v?.trim(), message: 'Kod jest wymagany' }],
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
    hexColor: [
      {
        validate: (v: string) => !v || /^#[0-9A-Fa-f]{6}$/.test(v),
        message: 'Nieprawidłowy format HEX (wymagany: #RRGGBB)',
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
    number: [{ validate: (v: string) => !!v?.trim(), message: 'Numer jest wymagany' }],
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
  });

  // Queries
  const { data: initialSettings, isLoading, error: settingsError } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const { data: palletTypes, error: palletTypesError } = useQuery({
    queryKey: ['pallet-types'],
    queryFn: settingsApi.getPalletTypes,
  });

  const { data: colors, error: colorsError } = useQuery({
    queryKey: ['colors'],
    queryFn: () => colorsApi.getAll(),
  });

  const { data: profiles, error: profilesError } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  const { data: fileWatcherStatus, refetch: refetchFileWatcherStatus } = useQuery({
    queryKey: ['file-watcher-status'],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/settings/file-watcher/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return res.json();
    },
  });

  const { data: userFolderData, isLoading: isLoadingUserFolder } = useQuery({
    queryKey: ['user-folder-path'],
    queryFn: settingsApi.getUserFolderPath,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  useEffect(() => {
    if (userFolderData) {
      setUserFolderPath(userFolderData.path || '');
    }
  }, [userFolderData]);

  // Mutations
  const updateSettingsMutation = useUpdateSettings({
    onSuccess: () => setHasChanges(false),
  });

  const { createMutation: createPalletMutation, updateMutation: updatePalletMutation, deleteMutation: deletePalletMutation } =
    usePalletTypeMutations({
      onCreateSuccess: () => {
        setPalletDialog({ open: false, mode: 'add', data: null });
        resetPalletValidation();
      },
      onUpdateSuccess: () => {
        setPalletDialog({ open: false, mode: 'add', data: null });
        resetPalletValidation();
      },
      onDeleteSuccess: () => setDeleteDialog(null),
    });

  const { createMutation: createColorMutation, updateMutation: updateColorMutation, deleteMutation: deleteColorMutation } =
    useColorMutations({
      onCreateSuccess: () => {
        setColorDialog({ open: false, mode: 'add', data: null });
        resetColorValidation();
      },
      onUpdateSuccess: () => {
        setColorDialog({ open: false, mode: 'add', data: null });
        resetColorValidation();
      },
      onDeleteSuccess: () => setDeleteDialog(null),
    });

  const { createMutation: createProfileMutation, updateMutation: updateProfileMutation, deleteMutation: deleteProfileMutation } =
    useProfileMutations({
      onCreateSuccess: () => {
        setProfileDialog({ open: false, mode: 'add', data: null });
        resetProfileValidation();
      },
      onUpdateSuccess: () => {
        setProfileDialog({ open: false, mode: 'add', data: null });
        resetProfileValidation();
      },
      onDeleteSuccess: () => {
        setDeleteDialog(null);
        setDeleteError(null);
      },
      onDeleteError: (error) => {
        setDeleteError(error.message || 'Nie można usunąć profilu');
      },
    });

  const { restartMutation: restartFileWatcherMutation } = useFileWatcher({
    onRestartSuccess: () => refetchFileWatcherStatus(),
  });

  const { updateMutation: updateUserFolderMutation } = useUserFolderPath({
    onUpdateSuccess: () => {
      setUserFolderHasChanges(false);
      toast({
        variant: 'success',
        title: 'Zapisano',
        description: 'Ścieżka folderu użytkownika została zaktualizowana',
      });
    },
  });

  // Handlers
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

  const handleUserFolderPathChange = (path: string) => {
    setUserFolderPath(path);
    setUserFolderHasChanges(true);
  };

  const handleSaveUserFolder = () => {
    updateUserFolderMutation.mutate(userFolderPath);
  };

  // Pallet handlers
  const handleSavePallet = () => {
    const data = palletDialog.data;
    if (!data) return;

    const formData = {
      name: data.name || '',
      lengthMm: Number(data.lengthMm) || 0,
      loadDepthMm: Number(data.loadDepthMm) || 0,
    };

    if (!validatePalletForm(formData)) {
      Object.keys(formData).forEach((field) => touchPalletField(field as keyof typeof formData));
      return;
    }

    if (palletDialog.mode === 'add') {
      createPalletMutation.mutate(formData);
    } else if (data.id) {
      updatePalletMutation.mutate({ id: data.id, data: formData });
    }
  };

  // Color handlers
  const handleSaveColor = () => {
    const data = colorDialog.data;
    if (!data) return;

    const formData = {
      code: data.code || '',
      name: data.name || '',
      hexColor: data.hexColor || '',
    };

    if (!validateColorForm(formData)) {
      Object.keys(formData).forEach((field) => touchColorField(field as keyof typeof formData));
      return;
    }

    const colorData = {
      code: formData.code,
      name: formData.name,
      type: (data.type as 'typical' | 'atypical') || 'typical',
      hexColor: formData.hexColor || undefined,
    };

    if (colorDialog.mode === 'add') {
      createColorMutation.mutate(colorData);
    } else if (data.id) {
      updateColorMutation.mutate({ id: data.id, data: colorData });
    }
  };

  // Profile handlers
  const handleSaveProfile = () => {
    const data = profileDialog.data;
    if (!data) return;

    const formData = {
      number: data.number || '',
      name: data.name || '',
    };

    if (!validateProfileForm(formData)) {
      Object.keys(formData).forEach((field) => touchProfileField(field as keyof typeof formData));
      return;
    }

    const profileData = {
      number: formData.number,
      name: formData.name,
      description: data.description || undefined,
    };

    if (profileDialog.mode === 'add') {
      createProfileMutation.mutate(profileData);
    } else if (data.id) {
      updateProfileMutation.mutate({ id: data.id, data: profileData });
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

  // Spójny wrapper dla loading state - zapobiega layout shift
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Ustawienia" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  // Handle errors from any query
  const hasError = settingsError || palletTypesError || colorsError || profilesError;
  if (hasError) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Ustawienia" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-600 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Błąd wczytywania ustawień</h3>
            <p className="text-sm text-slate-500 mb-4">
              {(settingsError as Error)?.message ||
               (palletTypesError as Error)?.message ||
               (colorsError as Error)?.message ||
               (profilesError as Error)?.message ||
               'Nie udało się pobrać danych'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
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
            <TabsTrigger value="user-folder">Mój folder</TabsTrigger>
            <TabsTrigger value="glass">Auto-watch Szyb</TabsTrigger>
            <TabsTrigger value="pallets">Palety</TabsTrigger>
            <TabsTrigger value="colors">Kolory</TabsTrigger>
            <TabsTrigger value="profiles">Profile PVC</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsTab
              settings={settings}
              hasChanges={hasChanges}
              onSettingChange={handleSettingChange}
              onSave={handleSave}
              isPending={updateSettingsMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="folders">
            <FoldersTab
              settings={settings}
              hasChanges={hasChanges}
              onSettingChange={handleSettingChange}
              onSave={handleSave}
              onSaveAndRestart={handleSaveAndRestartWatcher}
              onRestart={() => restartFileWatcherMutation.mutate()}
              fileWatcherStatus={fileWatcherStatus}
              isUpdatePending={updateSettingsMutation.isPending}
              isRestartPending={restartFileWatcherMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="user-folder">
            <UserFolderTab
              userFolderPath={userFolderPath}
              globalFolderPath={settings.importsBasePath || ''}
              hasChanges={userFolderHasChanges}
              onPathChange={handleUserFolderPathChange}
              onSave={handleSaveUserFolder}
              isPending={updateUserFolderMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="glass">
            <GlassWatchTab
              settings={settings}
              hasChanges={hasChanges}
              onSettingChange={handleSettingChange}
              onSave={handleSave}
              onSaveAndRestart={handleSaveAndRestartWatcher}
              onRestart={() => restartFileWatcherMutation.mutate()}
              fileWatcherStatus={fileWatcherStatus}
              isUpdatePending={updateSettingsMutation.isPending}
              isRestartPending={restartFileWatcherMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="pallets">
            <PalletTypesTab
              palletTypes={palletTypes}
              onAdd={() =>
                setPalletDialog({
                  open: true,
                  mode: 'add',
                  data: { name: '', lengthMm: 0, loadDepthMm: 0 },
                })
              }
              onEdit={(pallet) => setPalletDialog({ open: true, mode: 'edit', data: pallet })}
              onDelete={(pallet) =>
                setDeleteDialog({ open: true, type: 'pallet', id: pallet.id, name: pallet.name })
              }
            />
          </TabsContent>

          <TabsContent value="colors">
            <ColorsTab
              colors={colors}
              onAdd={() =>
                setColorDialog({
                  open: true,
                  mode: 'add',
                  data: { code: '', name: '', type: 'typical', hexColor: '' },
                })
              }
              onEdit={(color) => setColorDialog({ open: true, mode: 'edit', data: color })}
              onDelete={(color) =>
                setDeleteDialog({ open: true, type: 'color', id: color.id, name: color.name })
              }
            />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesTab
              profiles={profiles}
              onAdd={() =>
                setProfileDialog({
                  open: true,
                  mode: 'add',
                  data: { number: '', name: '', description: '' },
                })
              }
              onEdit={(profile) => setProfileDialog({ open: true, mode: 'edit', data: profile })}
              onDelete={(profile) =>
                setDeleteDialog({ open: true, type: 'profile', id: profile.id, name: profile.name })
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <PalletDialog
        open={palletDialog.open}
        mode={palletDialog.mode}
        data={palletDialog.data}
        onOpenChange={(open) => {
          if (!open) {
            setPalletDialog({ open: false, mode: 'add', data: null });
            resetPalletValidation();
          }
        }}
        onDataChange={(data) => setPalletDialog((prev) => ({ ...prev, data }))}
        onSave={handleSavePallet}
        isPending={createPalletMutation.isPending || updatePalletMutation.isPending}
        errors={palletErrors}
        touched={palletTouched}
        onValidateField={validatePalletField}
        onTouchField={touchPalletField}
      />

      <ColorDialog
        open={colorDialog.open}
        mode={colorDialog.mode}
        data={colorDialog.data}
        onOpenChange={(open) => {
          if (!open) {
            setColorDialog({ open: false, mode: 'add', data: null });
            resetColorValidation();
          }
        }}
        onDataChange={(data) => setColorDialog((prev) => ({ ...prev, data }))}
        onSave={handleSaveColor}
        isPending={createColorMutation.isPending || updateColorMutation.isPending}
        errors={colorErrors}
        touched={colorTouched}
        onValidateField={validateColorField}
        onTouchField={touchColorField}
      />

      <ProfileDialog
        open={profileDialog.open}
        mode={profileDialog.mode}
        data={profileDialog.data}
        onOpenChange={(open) => {
          if (!open) {
            setProfileDialog({ open: false, mode: 'add', data: null });
            resetProfileValidation();
          }
        }}
        onDataChange={(data) => setProfileDialog((prev) => ({ ...prev, data }))}
        onSave={handleSaveProfile}
        isPending={createProfileMutation.isPending || updateProfileMutation.isPending}
        errors={profileErrors}
        touched={profileTouched}
        onValidateField={validateProfileField}
        onTouchField={touchProfileField}
      />

      <DeleteConfirmDialog
        open={!!deleteDialog}
        name={deleteDialog?.name || ''}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDelete}
        isPending={
          deletePalletMutation.isPending ||
          deleteColorMutation.isPending ||
          deleteProfileMutation.isPending
        }
      />
    </div>
  );
}
