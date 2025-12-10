'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { FileText, Package, History, ClipboardCheck, Warehouse, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AkrobudMenuPage() {
  const akrobudOptions = [
    {
      title: 'Tabela zleceń',
      description: 'Przegląd zleceń produkcyjnych i zapotrzebowania na profile',
      href: '/magazyn/akrobud/szczegoly?tab=zlecenia',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Stan magazynowy',
      description: 'Aktualny stan magazynu profili i zamówienia',
      href: '/magazyn/akrobud/szczegoly?tab=magazyn',
      icon: Package,
      color: 'green',
    },
    {
      title: 'Historia',
      description: 'Historia zmian stanów magazynowych',
      href: '/magazyn/akrobud/szczegoly?tab=historia',
      icon: History,
      color: 'purple',
    },
    {
      title: 'Remanent',
      description: 'Wykonaj inwentaryzację magazynu',
      href: '/magazyn/akrobud/remanent',
      icon: ClipboardCheck,
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
      green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="AKROBUD">
        <Link href="/magazyn">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do magazynu
          </Button>
        </Link>
      </Header>

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Magazyn', href: '/magazyn' },
            { label: 'AKROBUD', icon: <Warehouse className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Magazyn profili AKROBUD</h2>
            <p className="text-slate-600">Zarządzaj stanem magazynowym, zleceniami i historią profili aluminiowych</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {akrobudOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Link key={option.href} href={option.href}>
                  <Card className="h-full transition-all hover:shadow-lg cursor-pointer border-2 hover:border-slate-300">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2 ${getColorClasses(option.color)}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                      <CardDescription className="text-sm">{option.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Otwórz →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
