'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Box, Warehouse } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MagazynPVCPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Magazyn PVC">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do dashboardu
          </Button>
        </Link>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn PVC', icon: <Box className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={<Box className="h-16 w-16" />}
          title="Magazyn PVC"
          description="Ta sekcja jest w trakcie przygotowania. Tutaj będzie można zarządzać materiałami PVC, śledzić stany magazynowe i dodawać zamówienia."
          action={{
            label: 'Dodaj materiał PVC',
            onClick: () => console.log('Dodawanie materiału PVC'),
          }}
          className="min-h-[400px]"
        />
      </div>
    </div>
  );
}
