'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  FileText,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Import } from '@/types';

interface ImportHistoryTableProps {
  imports: Import[];
  isLoading: boolean;
  onPreview: (id: number) => void;
  onDelete: (imp: Import) => void;
  isDeletePending: boolean;
}

export function ImportHistoryTable({
  imports,
  isLoading,
  onPreview,
  onDelete,
  isDeletePending,
}: ImportHistoryTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Oczekuje</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Przetwarzanie</Badge>;
      case 'completed':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Zakonczony</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Blad</Badge>;
      case 'rejected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Odrzucony</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia importow</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : imports.length > 0 ? (
          <div className="rounded border overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Plik</th>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-center">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {imports
                  .sort((a: Import, b: Import) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 20)
                  .map((imp: Import, index: number) => (
                    <tr key={imp.id} className={`border-t hover:bg-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {imp.fileType === 'uzyte_bele' ? (
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="font-medium">{imp.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={imp.fileType === 'uzyte_bele' ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}>
                          {imp.fileType === 'uzyte_bele' ? 'CSV' : 'PDF'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(imp.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(imp.processedAt || imp.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPreview(imp.id)}
                            title="Podglad"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(imp)}
                            disabled={isDeletePending}
                            title="Usun import"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak historii importow
          </p>
        )}
      </CardContent>
    </Card>
  );
}
