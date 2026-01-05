'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, Box, Lock, Settings } from 'lucide-react';
import Link from 'next/link';

export default function MagazynMenuPage() {
  const magazynOptions = [
    {
      title: 'Magazyn Akrobud',
      description: 'Główny magazyn profili i materiałów',
      href: '/magazyn/akrobud',
      icon: Warehouse,
      color: 'blue',
    },
    {
      title: 'Profile na dostawy',
      description: 'Zarządzanie profilami przeznaczonymi na dostawy',
      href: '/magazyn/profile-na-dostawy',
      icon: Package,
      color: 'green',
    },
    {
      title: 'Magazyn PVC',
      description: 'Magazyn materiałów PVC',
      href: '/magazyn/pvc',
      icon: Box,
      color: 'purple',
    },
    {
      title: 'Okucia',
      description: 'Magazyn okuć okiennych PVC i ALU',
      href: '/magazyn/okuc',
      icon: Settings,
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
      <Header title="Magazyn" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Wybierz magazyn</h2>
            <p className="text-slate-600">Zarządzaj różnymi typami magazynów w systemie</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {magazynOptions.map((option) => {
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
