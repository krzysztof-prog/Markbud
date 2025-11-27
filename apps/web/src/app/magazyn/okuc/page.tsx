'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Lock, Warehouse, Plus } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MagazynOkucPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Magazyn Okuć">
        <Link href="/magazyn">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do menu
          </Button>
        </Link>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn', href: '/magazyn', icon: <Warehouse className="h-4 w-4" /> },
            { label: 'Okucia' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={<Lock className="h-16 w-16" />}
          title="Magazyn Okuć"
          description="Ta sekcja jest w trakcie przygotowania. Tutaj będzie można zarządzać okuciami i akcesoriami, monitorować dostępność oraz składać zamówienia."
          action={{
            label: 'Dodaj okucie',
            onClick: () => console.log('Dodawanie okucia'),
          }}
          className="min-h-[400px]"
        />
      </div>
    </div>
  );
}
