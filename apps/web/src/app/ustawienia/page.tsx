'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { settingsApi, colorsApi, profilesApi, steelApi, usersApi } from '@/lib/api';
import { getAuthToken } from '@/lib/auth-token';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  GeneralSettingsTab,
  FoldersTab,
  GlassWatchTab,
  PalletTypesTab,
  ColorsTab,
  ProfilesTab,
  OkucLocationsTab,
  ProfileDepthsTab,
  SteelTab,
  DocumentAuthorMappingsTab,
  PalletDialog,
  ColorDialog,
  ProfileDialog,
  SteelDialog,
  DeleteConfirmDialog,
  DocumentAuthorMappingDialog,
} from '@/features/settings/components';
import {
  useUpdateSettings,
  usePalletTypeMutations,
  useColorMutations,
  useProfileMutations,
  useFileWatcher,
  useUserFolderPath,
  useSteelMutations,
  useDocumentAuthorMappingMutations,
} from '@/features/settings/hooks';
import { toast } from '@/hooks/useToast';

// Types
interface PalletType {
  id: number;
  name: string;
  widthMm: number;
  loadWidthMm: number;
}

interface Color {
  id: number;
  code: string;
  name: string;
  type: string;
  hexColor?: string | null;
  isAkrobud?: boolean;
}

interface Profile {
  id: number;
  number: string;
  name: string;
  description?: string | null;
  articleNumber?: string | null;
  isAkrobud?: boolean;
  isLiving?: boolean;
  isBlok?: boolean;
  isVlak?: boolean;
  isCt70?: boolean;
  isFocusing?: boolean;
}

interface Steel {
  id: number;
  number: string;
  articleNumber?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
}

interface DocumentAuthorMapping {
  id: number;
  authorName: string;
  userId: number;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

type DialogState<T> = {
  open: boolean;
  mode: 'add' | 'edit';
  data: Partial<T> | null;
};

type DeleteDialogState = {
  open: boolean;
  type: 'pallet' | 'color' | 'profile' | 'steel' | 'documentAuthorMapping';
  id: number;
  name: string;
} | null;

export default function UstawieniaPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [userFolderPath, setUserFolderPath] = useState<string>('');
  const [_userFolderHasChanges, setUserFolderHasChanges] = useState(false);

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
  const [steelDialog, setSteelDialog] = useState<DialogState<Steel>>({
    open: false,
    mode: 'add',
    data: null,
  });
  const [documentAuthorMappingDialog, setDocumentAuthorMappingDialog] = useState<DialogState<DocumentAuthorMapping>>({
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
    widthMm: [{ validate: (v: number) => v > 0, message: 'Długość musi być większa od 0' }],
    loadWidthMm: [
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

  const {
    errors: steelErrors,
    touched: steelTouched,
    validate: validateSteelField,
    validateAll: validateSteelForm,
    touch: touchSteelField,
    reset: resetSteelValidation,
  } = useFormValidation({
    number: [{ validate: (v: string) => !!v?.trim(), message: 'Numer jest wymagany' }],
    name: [
      { validate: (v: string) => !!v?.trim(), message: 'Nazwa jest wymagana' },
      { validate: (v: string) => v?.trim().length >= 2, message: 'Nazwa musi mieć min. 2 znaki' },
    ],
  });

  const {
    errors: documentAuthorMappingErrors,
    touched: documentAuthorMappingTouched,
    validate: validateDocumentAuthorMappingField,
    validateAll: validateDocumentAuthorMappingForm,
    touch: touchDocumentAuthorMappingField,
    reset: resetDocumentAuthorMappingValidation,
  } = useFormValidation({
    authorName: [{ validate: (v: string) => !!v?.trim(), message: 'Nazwa autora jest wymagana' }],
    userId: [{ validate: (v: number) => v > 0, message: 'Użytkownik jest wymagany' }],
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

  const { data: steels, error: steelsError } = useQuery({
    queryKey: ['steels'],
    queryFn: steelApi.getAll,
  });

  const { data: documentAuthorMappings, error: documentAuthorMappingsError } = useQuery({
    queryKey: ['document-author-mappings'],
    queryFn: settingsApi.getDocumentAuthorMappings,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
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

  const { data: userFolderData, isLoading: _isLoadingUserFolder } = useQuery({
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

  const { createMutation: createSteelMutation, updateMutation: updateSteelMutation, deleteMutation: deleteSteelMutation } =
    useSteelMutations({
      onCreateSuccess: () => {
        setSteelDialog({ open: false, mode: 'add', data: null });
        resetSteelValidation();
      },
      onUpdateSuccess: () => {
        setSteelDialog({ open: false, mode: 'add', data: null });
        resetSteelValidation();
      },
      onDeleteSuccess: () => setDeleteDialog(null),
    });

  const { createMutation: createDocumentAuthorMappingMutation, updateMutation: updateDocumentAuthorMappingMutation, deleteMutation: deleteDocumentAuthorMappingMutation } =
    useDocumentAuthorMappingMutations({
      onCreateSuccess: () => {
        setDocumentAuthorMappingDialog({ open: false, mode: 'add', data: null });
        resetDocumentAuthorMappingValidation();
      },
      onUpdateSuccess: () => {
        setDocumentAuthorMappingDialog({ open: false, mode: 'add', data: null });
        resetDocumentAuthorMappingValidation();
      },
      onDeleteSuccess: () => setDeleteDialog(null),
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

  const _handleUserFolderPathChange = (path: string) => {
    setUserFolderPath(path);
    setUserFolderHasChanges(true);
  };

  const _handleSaveUserFolder = () => {
    updateUserFolderMutation.mutate(userFolderPath);
  };

  // Pallet handlers
  const handleSavePallet = () => {
    const data = palletDialog.data;
    if (!data) return;

    const formData = {
      name: data.name || '',
      widthMm: Number(data.widthMm) || 0,
      loadWidthMm: Number(data.loadWidthMm) || 0,
    };

    if (!validatePalletForm(formData)) {
      Object.keys(formData).forEach((field) => touchPalletField(field as keyof typeof formData));
      return;
    }

    if (palletDialog.mode === 'add') {
      createPalletMutation.mutate({
        ...formData,
        lengthMm: 6000,
        heightMm: 2000,
      });
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
      isAkrobud: data.isAkrobud ?? false,
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

  // Handler do aktualizacji checkboxa Akrobud
  const handleToggleAkrobud = (profile: Profile, isAkrobud: boolean) => {
    updateProfileMutation.mutate({ id: profile.id, data: { isAkrobud } });
  };

  // Handler do aktualizacji dowolnego pola profilu (inline edycja)
  const handleUpdateProfile = (profile: Profile, data: Partial<Profile>) => {
    updateProfileMutation.mutate({ id: profile.id, data });
  };

  // Steel handlers
  const handleSaveSteel = () => {
    const data = steelDialog.data;
    if (!data) return;

    const formData = {
      number: data.number || '',
      name: data.name || '',
    };

    if (!validateSteelForm(formData)) {
      Object.keys(formData).forEach((field) => touchSteelField(field as keyof typeof formData));
      return;
    }

    const steelData = {
      number: formData.number,
      name: formData.name,
      articleNumber: data.articleNumber || undefined,
      description: data.description || undefined,
      sortOrder: data.sortOrder || 0,
    };

    if (steelDialog.mode === 'add') {
      createSteelMutation.mutate(steelData);
    } else if (data.id) {
      updateSteelMutation.mutate({ id: data.id, data: steelData });
    }
  };

  // Document Author Mapping handlers
  const handleSaveDocumentAuthorMapping = () => {
    const data = documentAuthorMappingDialog.data;
    if (!data) return;

    const formData = {
      authorName: data.authorName || '',
      userId: data.userId || 0,
    };

    if (!validateDocumentAuthorMappingForm(formData)) {
      Object.keys(formData).forEach((field) => touchDocumentAuthorMappingField(field as keyof typeof formData));
      return;
    }

    if (documentAuthorMappingDialog.mode === 'add') {
      createDocumentAuthorMappingMutation.mutate(formData);
    } else if (data.id) {
      updateDocumentAuthorMappingMutation.mutate({ id: data.id, data: formData });
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
    } else if (deleteDialog.type === 'steel') {
      deleteSteelMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === 'documentAuthorMapping') {
      deleteDocumentAuthorMappingMutation.mutate(deleteDialog.id);
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
  const hasError = settingsError || palletTypesError || colorsError || profilesError || steelsError || documentAuthorMappingsError;
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
               (steelsError as Error)?.message ||
               (documentAuthorMappingsError as Error)?.message ||
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
            <TabsTrigger value="general">Ogolne</TabsTrigger>
            <TabsTrigger value="folders">Foldery</TabsTrigger>
            <TabsTrigger value="glass">Auto-watch Szyb</TabsTrigger>
            <TabsTrigger value="pallets">Palety</TabsTrigger>
            <TabsTrigger value="colors">Kolory</TabsTrigger>
            <TabsTrigger value="profiles">Profile PVC</TabsTrigger>
            <TabsTrigger value="steel">Stal</TabsTrigger>
            <TabsTrigger value="profile-depths">Głębokości</TabsTrigger>
            <TabsTrigger value="document-author-mappings">Autorzy</TabsTrigger>
            <TabsTrigger value="okuc-locations">Magazyny OKUC</TabsTrigger>
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
                  data: { name: '', widthMm: 0, loadWidthMm: 0 },
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
              onToggleAkrobud={handleToggleAkrobud}
              onUpdateProfile={handleUpdateProfile}
            />
          </TabsContent>

          <TabsContent value="steel">
            <SteelTab
              steels={steels}
              onAdd={() =>
                setSteelDialog({
                  open: true,
                  mode: 'add',
                  data: { number: '', name: '', description: '', sortOrder: 0 },
                })
              }
              onEdit={(steel) => setSteelDialog({ open: true, mode: 'edit', data: steel })}
              onDelete={(steel) =>
                setDeleteDialog({ open: true, type: 'steel', id: steel.id, name: steel.name })
              }
            />
          </TabsContent>

          <TabsContent value="profile-depths">
            <ProfileDepthsTab />
          </TabsContent>

          <TabsContent value="document-author-mappings">
            <DocumentAuthorMappingsTab
              mappings={documentAuthorMappings}
              onAdd={() =>
                setDocumentAuthorMappingDialog({
                  open: true,
                  mode: 'add',
                  data: { authorName: '', userId: 0 } as Partial<DocumentAuthorMapping>,
                })
              }
              onEdit={(mapping) => setDocumentAuthorMappingDialog({ open: true, mode: 'edit', data: mapping })}
              onDelete={(mapping) =>
                setDeleteDialog({ open: true, type: 'documentAuthorMapping', id: mapping.id, name: mapping.authorName })
              }
            />
          </TabsContent>

          <TabsContent value="okuc-locations">
            <OkucLocationsTab />
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

      <SteelDialog
        open={steelDialog.open}
        mode={steelDialog.mode}
        data={steelDialog.data}
        onOpenChange={(open) => {
          if (!open) {
            setSteelDialog({ open: false, mode: 'add', data: null });
            resetSteelValidation();
          }
        }}
        onDataChange={(data) => setSteelDialog((prev) => ({ ...prev, data }))}
        onSave={handleSaveSteel}
        isPending={createSteelMutation.isPending || updateSteelMutation.isPending}
        errors={steelErrors}
        touched={steelTouched}
        onValidateField={validateSteelField}
        onTouchField={touchSteelField}
      />

      <DocumentAuthorMappingDialog
        open={documentAuthorMappingDialog.open}
        mode={documentAuthorMappingDialog.mode}
        data={documentAuthorMappingDialog.data}
        users={users}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentAuthorMappingDialog({ open: false, mode: 'add', data: null });
            resetDocumentAuthorMappingValidation();
          }
        }}
        onDataChange={(data) => setDocumentAuthorMappingDialog((prev) => ({ ...prev, data }))}
        onSave={handleSaveDocumentAuthorMapping}
        isPending={createDocumentAuthorMappingMutation.isPending || updateDocumentAuthorMappingMutation.isPending}
        errors={documentAuthorMappingErrors}
        touched={documentAuthorMappingTouched}
        onValidateField={validateDocumentAuthorMappingField}
        onTouchField={touchDocumentAuthorMappingField}
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
          deleteProfileMutation.isPending ||
          deleteSteelMutation.isPending ||
          deleteDocumentAuthorMappingMutation.isPending
        }
      />
    </div>
  );
}
