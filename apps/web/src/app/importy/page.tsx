'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { importsApi } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { Import } from '@/types';

import {
  FolderImportSection,
  CsvImportPanel,
  PdfImportPanel,
  ImportPreviewCard,
  ImportHistoryTable,
  UploadStatus,
} from './components';
import {
  useUploadMutation,
  useImportActionMutations,
  useFolderImportMutations,
  useFolderManagementMutations,
} from './hooks/useImportMutations';
import { ImportConflictModal } from '@/components/imports/ImportConflictModal';

// Types for folder scan result
interface FolderScanResult {
  folderName: string;
  detectedDate: string | null;
  csvFiles: Array<{
    filename: string;
    relativePath: string;
    orderNumber: string;
    requirementsCount: number;
    windowsCount: number;
    existingDeliveryInfo?: {
      deliveryId: number;
      deliveryNumber: string | null;
      deliveryDate: string;
    };
  }>;
  existingDeliveries: Array<{
    id: number;
    deliveryNumber: string | null;
  }>;
}

export default function ImportyPage() {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Folder import state
  const [folderPath, setFolderPath] = useState('');
  const [selectedDeliveryNumber, setSelectedDeliveryNumber] = useState<'I' | 'II' | 'III' | null>(null);
  const [folderScanResult, setFolderScanResult] = useState<FolderScanResult | null>(null);

  // Conflict modal state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    folderPath: string;
    lockedBy: string;
    lockedAt: Date;
  } | null>(null);

  // Queries
  const { data: imports, isLoading, error } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsApi.getAll(),
  });

  const { data: availableFolders } = useQuery({
    queryKey: ['available-folders'],
    queryFn: () => importsApi.listFolders(),
    refetchInterval: 30000,
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['import-preview', previewId],
    queryFn: () => importsApi.getPreview(previewId!),
    enabled: !!previewId,
  });

  // Mutations
  const uploadMutation = useUploadMutation({
    onProgress: (progress) => {
      if (typeof progress === 'number') {
        setUploadProgress(progress);
      }
    },
    onSuccess: () => {
      setTimeout(() => setUploadProgress(0), 1000);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const { approveMutation, rejectMutation, deleteMutation, bulkActionMutation } = useImportActionMutations({
    onApproveSuccess: () => setPreviewId(null),
    onRejectSuccess: () => setPreviewId(null),
  });

  const { scanFolderMutation, importFolderMutation } = useFolderImportMutations({
    onScanSuccess: (data) => setFolderScanResult(data),
    onScanError: () => setFolderScanResult(null),
    onImportSuccess: () => {
      setFolderPath('');
      setFolderScanResult(null);
      setSelectedDeliveryNumber(null);
    },
    onImportConflict: (conflict) => {
      setConflictInfo(conflict);
      setConflictModalOpen(true);
    },
  });

  const { archiveFolderMutation, deleteFolderMutation } = useFolderManagementMutations();

  // Filter imports by type - with error handling
  const csvImports = imports?.filter((i: Import) => i.fileType === 'uzyte_bele') || [];
  const pdfImports = imports?.filter((i: Import) => i.fileType === 'ceny_pdf') || [];

  const pendingCsvImports = csvImports.filter((i: Import) => i.status === 'pending');

  // For PDF: show only files with errors (status=pending + autoImportError in metadata)
  const pendingPdfImports = pdfImports.filter((i: Import) => {
    if (i.status !== 'pending') return false;
    try {
      const metadata = typeof i.metadata === 'string' ? JSON.parse(i.metadata) : i.metadata;
      return metadata?.autoImportError === true;
    } catch {
      return false;
    }
  });

  const completedImports = imports?.filter((i: Import) => i.status === 'completed') || [];
  const errorImports = imports?.filter((i: Import) => i.status === 'error' || i.status === 'rejected') || [];
  const historyImports = [...completedImports, ...errorImports];

  // Handlers
  const handleCsvFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv') {
        toast({
          title: 'Nieprawidlowy format',
          description: `Plik "${file.name}" nie jest plikiem CSV!`,
          variant: 'destructive',
        });
        continue;
      }
      uploadMutation.mutate(file);
    }
  };

  const handlePdfFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        toast({
          title: 'Nieprawidlowy format',
          description: `Plik "${file.name}" nie jest plikiem PDF!`,
          variant: 'destructive',
        });
        continue;
      }
      uploadMutation.mutate(file);
    }
  };

  const handleFolderPathChange = (path: string) => {
    setFolderPath(path);
    setFolderScanResult(null);
  };

  const handleDeleteImport = (imp: Import) => {
    const message = imp.status === 'completed'
      ? 'Czy na pewno chcesz usunac ten import? Spowoduje to rowniez usuniecie powiazanego zlecenia i wszystkich jego danych!'
      : 'Czy na pewno chcesz usunac ten import z historii?';
    if (confirm(message)) {
      deleteMutation.mutate(imp.id);
      toast({
        title: 'Usuwanie...',
        description: 'Prosze czekac',
        variant: 'info',
      });
    }
  };

  const handleImportFolder = () => {
    if (selectedDeliveryNumber) {
      importFolderMutation.mutate({
        path: folderPath,
        deliveryNumber: selectedDeliveryNumber,
      });
    }
  };

  const handleCancelScan = () => {
    setFolderPath('');
    setFolderScanResult(null);
    setSelectedDeliveryNumber(null);
  };

  const handleRetryImport = () => {
    setConflictModalOpen(false);
    // Retry the import with same parameters
    if (folderPath && selectedDeliveryNumber) {
      importFolderMutation.mutate({
        path: folderPath,
        deliveryNumber: selectedDeliveryNumber,
      });
    }
  };

  const handleCloseConflictModal = () => {
    setConflictModalOpen(false);
    setConflictInfo(null);
  };

  const handleArchiveFolder = (path: string) => {
    if (confirm('Czy na pewno chcesz zarchiwizowac ten folder? Zostanie przeniesiony do podkatalogu "archiwum".')) {
      archiveFolderMutation.mutate(path);
    }
  };

  const handleDeleteFolder = (path: string) => {
    if (confirm('Czy na pewno chcesz TRWALE USUNAC ten folder? Ta operacja jest nieodwracalna!')) {
      deleteFolderMutation.mutate(path);
    }
  };

  // Show error state if query failed
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Importy plikow" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-600 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Błąd wczytywania importów</h3>
            <p className="text-sm text-slate-500 mb-4">
              {(error as Error)?.message || 'Nie udało się pobrać listy importów'}
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
      <Header title="Importy plikow" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Folder import section */}
        <FolderImportSection
          availableFolders={availableFolders}
          folderPath={folderPath}
          onFolderPathChange={handleFolderPathChange}
          folderScanResult={folderScanResult}
          selectedDeliveryNumber={selectedDeliveryNumber}
          onSelectDeliveryNumber={setSelectedDeliveryNumber}
          onScanFolder={(path) => scanFolderMutation.mutate(path)}
          onImportFolder={handleImportFolder}
          onCancelScan={handleCancelScan}
          isScanPending={scanFolderMutation.isPending}
          isImportPending={importFolderMutation.isPending}
          onArchiveFolder={handleArchiveFolder}
          onDeleteFolder={handleDeleteFolder}
          isArchivePending={archiveFolderMutation.isPending}
          isDeletePending={deleteFolderMutation.isPending}
        />

        {/* Two panels side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CsvImportPanel
            pendingImports={pendingCsvImports}
            onFileSelect={handleCsvFileSelect}
            onPreview={setPreviewId}
            onApprove={(id) => approveMutation.mutate({ id, action: 'add_new' })}
            onReject={(id) => rejectMutation.mutate(id)}
            isApprovePending={approveMutation.isPending}
            isRejectPending={rejectMutation.isPending}
          />

          <PdfImportPanel
            pendingImports={pendingPdfImports}
            onFileSelect={handlePdfFileSelect}
            onPreview={setPreviewId}
            onApprove={(id) => approveMutation.mutate({ id, action: 'add_new' })}
            onReject={(id) => rejectMutation.mutate(id)}
            onBulkApprove={(ids) => bulkActionMutation.mutate({ ids, action: 'approve' })}
            isApprovePending={approveMutation.isPending}
            isRejectPending={rejectMutation.isPending}
            isBulkPending={bulkActionMutation.isPending}
          />
        </div>

        {/* Upload status */}
        <UploadStatus
          isPending={uploadMutation.isPending}
          isError={uploadMutation.isError}
          errorMessage={(uploadMutation.error as Error)?.message}
          progress={uploadProgress}
        />

        {/* Preview card */}
        <ImportPreviewCard
          preview={preview || null}
          isLoading={previewLoading}
          isPending={approveMutation.isPending}
          isRejectPending={rejectMutation.isPending}
          onApprove={(resolution) => {
            if (previewId !== null) {
              approveMutation.mutate({ id: previewId, action: 'add_new', resolution });
            }
          }}
          onReject={(id) => rejectMutation.mutate(id)}
          open={!!previewId}
          onOpenChange={(open) => !open && setPreviewId(null)}
        />

        {/* Import history */}
        <ImportHistoryTable
          imports={historyImports}
          isLoading={isLoading}
          onPreview={setPreviewId}
          onDelete={handleDeleteImport}
          isDeletePending={deleteMutation.isPending}
        />
      </div>

      {/* Conflict Modal */}
      <ImportConflictModal
        isOpen={conflictModalOpen}
        onClose={handleCloseConflictModal}
        onRetry={handleRetryImport}
        conflictInfo={conflictInfo}
      />
    </div>
  );
}
