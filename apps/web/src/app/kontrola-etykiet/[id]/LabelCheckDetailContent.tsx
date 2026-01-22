/**
 * Kontrola Etykiet - Detail Content
 *
 * Szczegoly sprawdzenia etykiet z tabelą wynikow
 * Wymaga Suspense boundary (zapewnione przez dynamic import w page.tsx)
 */

'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileSpreadsheet, Calendar } from 'lucide-react';
import {
  useLabelCheck,
  useExportLabelCheck,
  LabelCheckSummary,
  LabelCheckResultsTable,
} from '@/features/label-checks';

interface Props {
  id: number;
}

export default function LabelCheckDetailContent({ id }: Props) {
  const { data: labelCheck } = useLabelCheck(id);
  const { download } = useExportLabelCheck(id);

  return (
    <div className="p-6 space-y-6">
      {/* Naglowek */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/kontrola-etykiet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrot
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sprawdzenie #{id}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" />
              Dostawa: {format(new Date(labelCheck.deliveryDate), 'dd.MM.yyyy', { locale: pl })}
              {' | '}
              Sprawdzono: {format(new Date(labelCheck.createdAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={download}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Pobierz Excel
        </Button>
      </div>

      {/* Podsumowanie */}
      <LabelCheckSummary data={labelCheck} />

      {/* Tabela wynikow */}
      <Card>
        <CardHeader>
          <CardTitle>Wyniki sprawdzenia</CardTitle>
        </CardHeader>
        <CardContent>
          <LabelCheckResultsTable results={labelCheck.results} />
        </CardContent>
      </Card>
    </div>
  );
}
