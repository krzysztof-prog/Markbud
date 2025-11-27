'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Lock, Warehouse } from 'lucide-react';
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96">
            <Lock className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Magazyn Okuć</h3>
            <p className="text-slate-500 text-center max-w-md">
              Ta sekcja jest w trakcie przygotowania. Tutaj będzie można zarządzać okuciami i akcesoriami.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
