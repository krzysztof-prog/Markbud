import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LabelStatusBadge } from './LabelStatusBadge';
import type { LabelCheckResult } from '../types';
import { format } from 'date-fns';

interface Props {
  results: LabelCheckResult[];
}

export function LabelCheckResultsTable({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">Brak wynikow do wyswietlenia</div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nr zlecenia</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Oczekiwana data</TableHead>
          <TableHead>Wykryta data</TableHead>
          <TableHead>Wykryty tekst</TableHead>
          <TableHead>Blad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => (
          <TableRow key={result.id}>
            <TableCell className="font-medium">{result.orderNumber}</TableCell>
            <TableCell>
              <LabelStatusBadge status={result.status} />
            </TableCell>
            <TableCell>{format(new Date(result.expectedDate), 'dd.MM.yyyy')}</TableCell>
            <TableCell>
              {result.detectedDate ? format(new Date(result.detectedDate), 'dd.MM.yyyy') : '-'}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">{result.detectedText || '-'}</TableCell>
            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
              {result.errorMessage || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
