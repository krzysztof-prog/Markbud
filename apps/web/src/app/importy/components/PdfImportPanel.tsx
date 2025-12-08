'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, Eye, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Import } from '@/types';

interface PdfImportPanelProps {
  pendingImports: Import[];
  onFileSelect: (files: FileList | null) => void;
  onPreview: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

export function PdfImportPanel({
  pendingImports,
  onFileSelect,
  onPreview,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
}: PdfImportPanelProps) {
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
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <FileText className="h-5 w-5" />
          Import PDF - Ceny profili
        </CardTitle>
        <CardDescription>
          Pliki PDF z cennikami profili od dostawcow
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Strefa drop PDF */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files)}
          />
          <FileText className="h-10 w-10 mx-auto text-blue-400 mb-3" />
          <p className="text-sm text-blue-700 font-medium">
            Przeciagnij plik PDF lub kliknij
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Format: cenniki profili (*.pdf)
          </p>
        </div>

        {/* Oczekujace importy PDF */}
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Wymagajace uwagi ({pendingImports.length})
          </h4>
          {pendingImports.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingImports.map((imp: Import) => (
                <PendingPdfImportItem
                  key={imp.id}
                  imp={imp}
                  onPreview={onPreview}
                  onApprove={onApprove}
                  onReject={onReject}
                  isApprovePending={isApprovePending}
                  isRejectPending={isRejectPending}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Wszystkie pliki PDF zaimportowane automatycznie
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PendingPdfImportItemProps {
  imp: Import;
  onPreview: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

function PendingPdfImportItem({
  imp,
  onPreview,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
}: PendingPdfImportItemProps) {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = typeof imp.metadata === 'string' ? JSON.parse(imp.metadata) : imp.metadata || {};
  } catch {
    metadata = {};
  }

  const errorType = metadata?.errorType as string | undefined;
  const errorMessage = metadata?.message as string | undefined;

  let errorColor = 'bg-red-50 border-red-200';
  let errorIcon = <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
  let errorLabel = 'Blad';

  if (errorType === 'order_not_found') {
    errorColor = 'bg-red-50 border-red-200';
    errorLabel = 'Zlecenie nie znalezione';
  } else if (errorType === 'duplicate') {
    errorColor = 'bg-amber-50 border-amber-200';
    errorIcon = <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />;
    errorLabel = 'Duplikat';
  } else if (errorType === 'parse_error') {
    errorColor = 'bg-red-50 border-red-200';
    errorLabel = 'Blad parsowania';
  }

  return (
    <div className={`rounded-lg border p-3 ${errorColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {errorIcon}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{imp.filename}</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDate(imp.createdAt)}
            </p>
            {errorMessage && (
              <p className="text-xs text-slate-600 mt-2 font-medium">
                {errorLabel}: {errorMessage}
              </p>
            )}
            {errorType === 'duplicate' && metadata?.existingImportDate ? (
              <p className="text-xs text-slate-500 mt-1">
                Poprzedni import: {formatDate(metadata.existingImportDate as string)}
              </p>
            ) : null}
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
            title="Importuj mimo wszystko"
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
    </div>
  );
}
