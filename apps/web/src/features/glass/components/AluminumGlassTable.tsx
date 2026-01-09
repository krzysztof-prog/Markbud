'use client';

import { useAluminumGlasses } from '../hooks/useGlassDeliveries';
import { CategorizedGlassTable } from './CategorizedGlassTable';

export function AluminumGlassTable() {
  const { data, isLoading, error } = useAluminumGlasses();

  return (
    <CategorizedGlassTable
      data={data}
      isLoading={isLoading}
      error={error}
      emptyTitle="Brak szyb aluminiowych"
      emptyDescription="Szyby aluminiowe pojawia sie po imporcie plikow CSV z numerami zamowien zawierajacymi 'AL.'."
    />
  );
}
