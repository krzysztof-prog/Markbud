/**
 * Kontrola Etykiet - Page Content
 *
 * Lista wszystkich sprawdzen etykiet z historia i akcjami
 * Wymaga Suspense boundary (zapewnione przez dynamic import w page.tsx)
 */

'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, Eye, Trash2 } from 'lucide-react';
import {
  useLabelChecks,
  useDeleteLabelCheck,
  useExportLabelCheck,
} from '@/features/label-checks';
import type { LabelCheckListItem } from '@/features/label-checks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Mapowanie statusu na badge
const STATUS_CONFIG = {
  completed: { label: 'Zakonczone', className: 'bg-green-100 text-green-800' },
  pending: { label: 'W trakcie', className: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'Blad', className: 'bg-red-100 text-red-800' },
} as const;

function LabelCheckRow({
  item,
  onDelete,
  isDeleting,
}: {
  item: LabelCheckListItem;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { download } = useExportLabelCheck(item.id);
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

  return (
    <TableRow>
      <TableCell>
        {format(new Date(item.deliveryDate), 'dd.MM.yyyy', { locale: pl })}
      </TableCell>
      <TableCell>
        {format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-green-600">{item.okCount} OK</span>
        {item.mismatchCount > 0 && (
          <span className="text-red-600 ml-2">{item.mismatchCount} bledow</span>
        )}
        {item.errorCount > 0 && (
          <span className="text-yellow-600 ml-2">{item.errorCount} problemow</span>
        )}
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Link href={`/kontrola-etykiet/${item.id}`}>
          <Button variant="ghost" size="sm" title="Zobacz szczegoly">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={download} title="Pobierz Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDeleting} title="Usun">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunac sprawdzenie?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna. Sprawdzenie zostanie trwale usuniete.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? 'Usuwanie...' : 'Usun'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export default function LabelChecksPageContent() {
  const { data } = useLabelChecks();
  const deleteMutation = useDeleteLabelCheck();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kontrola etykiet</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historia sprawdzen</CardTitle>
        </CardHeader>
        <CardContent>
          {data.data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Brak sprawdzen. Uruchom sprawdzanie z widoku dostawy.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data dostawy</TableHead>
                  <TableHead>Data sprawdzenia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wynik</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((item) => (
                  <LabelCheckRow
                    key={item.id}
                    item={item}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
