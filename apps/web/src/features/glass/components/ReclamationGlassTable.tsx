'use client';

import { useReclamationGlasses } from '../hooks/useGlassDeliveries';
import { CategorizedGlassTable } from './CategorizedGlassTable';

export function ReclamationGlassTable() {
  const { data, isLoading, error } = useReclamationGlasses();

  return (
    <CategorizedGlassTable
      data={data}
      isLoading={isLoading}
      error={error}
      emptyTitle="Brak szyb reklamacyjnych"
      emptyDescription="Szyby reklamacyjne pojawia sie po imporcie plikow CSV z numerami zamowien zawierajacymi 'R/'."
    />
  );
}
