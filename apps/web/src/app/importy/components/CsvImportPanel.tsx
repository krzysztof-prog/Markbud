'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Clock, Eye, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Import } from '@/types';

interface CsvImportPanelProps {
  pendingImports: Import[];
  onFileSelect: (files: FileList | null) => void;
  onPreview: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

export function CsvImportPanel({
  pendingImports,
  onFileSelect,
  onPreview,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
}: CsvImportPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFileSelect(e.dataTransfer.files);
  };

  return (
    <Card className="border-green-200">
      <CardHeader className="bg-green-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <FileSpreadsheet className="h-5 w-5" />
          Import CSV - Uzyte bele
        </CardTitle>
        <CardDescription>
          Pliki CSV z danymi o zuzyciu profili dla zlecen
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Strefa drop CSV */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-green-500 bg-green-50'
              : 'border-green-300 hover:border-green-400 hover:bg-green-50/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files)}
          />
          <FileSpreadsheet className="h-10 w-10 mx-auto text-green-400 mb-3" />
          <p className="text-sm text-green-700 font-medium">
            Przeciagnij plik CSV lub kliknij
          </p>
          <p className="text-xs text-green-500 mt-1">
            Format: *_uzyte_bele.csv
          </p>
        </div>

        {/* Oczekujace importy CSV */}
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Oczekujace ({pendingImports.length})
          </h4>
          {pendingImports.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingImports.map((imp: Import) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{imp.filename}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(imp.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreview(imp.id)}
                      title="Podglad"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onApprove(imp.id)}
                      disabled={isApprovePending}
                      title="Importuj"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onReject(imp.id)}
                      disabled={isRejectPending}
                      title="Odrzuc"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Brak oczekujacych plikow CSV
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
