'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassDeliveriesTable } from '@/features/glass/components/GlassDeliveriesTable';
import { GlassValidationPanel } from '@/features/glass/components/GlassValidationPanel';
import { useImportGlassDelivery } from '@/features/glass/hooks/useGlassDeliveries';

export default function GlassDeliveriesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const importMutation = useImportGlassDelivery();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    for (const file of files) {
      try {
        await importMutation.mutateAsync(file);
      } catch {
        // Error handled in mutation
      }
    }
    setFiles([]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dostawy szyb</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import dostaw szyb (CSV)
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
                  <p>Przeciagnij pliki CSV lub kliknij, aby wybrac</p>
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
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
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
        </div>
        <div>
          <GlassValidationPanel />
        </div>
      </div>

      <GlassDeliveriesTable />
    </div>
  );
}
