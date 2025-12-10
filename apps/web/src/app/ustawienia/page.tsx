'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { settingsApi, colorsApi, profilesApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  GeneralSettingsTab,
  FoldersTab,
  GlassWatchTab,
  PalletTypesTab,
  ColorsTab,
  ProfilesTab,
  PalletDialog,
  ColorDialog,
  ProfileDialog,
  DeleteConfirmDialog,
} from './components';
import {
  useUpdateSettings,
  usePalletTypeMutations,
  useColorMutations,
  useProfileMutations,
  useFileWatcher,
} from './hooks/useSettingsMutations';

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

  const { data: fileWatcherStatus, refetch: refetchFileWatcherStatus } = useQuery({
    queryKey: ['file-watcher-status'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/settings/file-watcher/status`
      );
      return res.json();
    },
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

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
