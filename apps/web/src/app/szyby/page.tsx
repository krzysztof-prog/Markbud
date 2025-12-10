'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Truck } from 'lucide-react';
import Link from 'next/link';

export default function SzybyMenuPage() {
  const options = [
    {
      title: 'Zamówienia szyb',
      description: 'Zarządzanie zamówieniami szyb (import TXT)',
      href: '/zamowienia-szyb',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Dostawy szyb',
      description: 'Zarządzanie dostawami szyb (import CSV)',
      href: '/dostawy-szyb',
      icon: Truck,
      color: 'green',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
      green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Szyby" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Zarządzanie szybami</h2>
            <p className="text-slate-600">Wybierz sekcję do zarządzania</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Link key={option.href} href={option.href}>
                  <Card className="h-full transition-all hover:shadow-lg cursor-pointer border-2 hover:border-slate-300">
                    <CardHeader>
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2 ${getColorClasses(option.color)}`}
                      >
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
