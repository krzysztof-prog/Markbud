'use client';

import { useLooseGlasses } from '../hooks/useGlassDeliveries';
import { CategorizedGlassTable } from './CategorizedGlassTable';

export function LooseGlassTable() {
  const { data, isLoading, error } = useLooseGlasses();

  return (
    <CategorizedGlassTable
      data={data}
      isLoading={isLoading}
      error={error}
      emptyTitle="Brak szyb luzem"
      emptyDescription="Szyby luzem pojawia sie po imporcie plikow CSV z odpowiednimi numerami zamowien."
    />
  );
}
