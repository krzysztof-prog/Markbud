'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useImportGlassOrder } from '../hooks/useGlassOrders';
import { GlassOrderConflictModal } from './GlassOrderConflictModal';

interface ConflictDetails {
  existingOrder: {
    id: number;
    glassOrderNumber: string;
    orderDate: Date | string;
    supplier: string;
    status: string;
    itemsCount: number;
  };
  newOrder: {
    glassOrderNumber: string;
    orderDate: Date | string;
    supplier: string;
    itemsCount: number;
  };
}

export function GlassOrderImportSection() {
  const [files, setFiles] = useState<File[]>([]);
  const [conflictFile, setConflictFile] = useState<File | null>(null);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);
  const importMutation = useImportGlassOrder();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    for (const file of files) {
      try {
        await importMutation.mutateAsync({ file, replace: false });
      } catch (error: any) {
        // Check if it's a conflict error (409)
        if (error?.status === 409 && error?.data?.details) {
          setConflictFile(file);
          setConflictDetails(error.data.details);
          return; // Stop processing other files
        }
        // Other errors are handled in mutation
      }
    }
    setFiles([]);
  };

  const handleConflictResolve = async (action: 'cancel' | 'replace' | 'skip') => {
    if (!conflictFile) return;

    if (action === 'replace') {
      try {
        await importMutation.mutateAsync({ file: conflictFile, replace: true });
        // Remove the conflicted file from the list
        setFiles((prev) => prev.filter((f) => f !== conflictFile));
      } catch {
        // Error handled in mutation
      }
    } else if (action === 'skip') {
      // Just remove the file from the list
      setFiles((prev) => prev.filter((f) => f !== conflictFile));
    }
    // For 'cancel', do nothing - user can manually remove the file

    setConflictFile(null);
    setConflictDetails(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import zamowien szyb (TXT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            {isDragActive ? (
              <p>Upusc pliki tutaj...</p>
            ) : (
              <p>Przeciagnij pliki TXT lub kliknij, aby wybrac</p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Pliki do importu ({files.length}):</p>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="w-full mt-2"
              >
                {importMutation.isPending ? 'Importowanie...' : `Importuj ${files.length} plik(ow)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GlassOrderConflictModal
        open={!!conflictDetails}
        onOpenChange={(open) => {
          if (!open) {
            setConflictFile(null);
            setConflictDetails(null);
          }
        }}
        conflict={conflictDetails}
        onResolve={handleConflictResolve}
        isResolving={importMutation.isPending}
      />
    </>
  );
}
