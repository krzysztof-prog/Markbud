'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Package,
  Warehouse,
  ShoppingCart,
  History,
  AlertCircle,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { useOkucArticles } from '@/features/okuc/hooks/useOkucArticles';

/**
 * Landing page modułu OKUC (DualStock)
 *
 * Pokazuje:
 * - Podstawowe statystyki (liczba artykułów PVC/ALU)
 * - Navigation tabs do różnych sekcji modułu
 * - Tab "Artykuły" jest funkcjonalny (link do /magazyn/okuc/artykuly)
 * - Pozostałe taby mają placeholdery
 */
export default function OkucLandingPage() {
  // Pobierz artykuły PVC i ALU dla statystyk
  const { data: pvcArticles } = useOkucArticles({ usedInPvc: true });
  const { data: aluArticles } = useOkucArticles({ usedInAlu: true });

  // Stats cards - podstawowe statystyki
  const stats = [
    {
      title: 'Artykuły PVC',
      value: pvcArticles?.length ?? '—',
      description: 'Liczba artykułów okuć dla PVC',
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Artykuły ALU',
      value: aluArticles?.length ?? '—',
      description: 'Liczba artykułów okuć dla ALU',
      icon: Settings,
      color: 'green',
    },
    {
      title: 'Aktywne zamówienia',
      value: '—',
      description: 'Zamówienia w trakcie realizacji',
      icon: ShoppingCart,
      color: 'purple',
    },
    {
      title: 'Krytyczne stany',
      value: '—',
      description: 'Artykuły poniżej min. stanu',
      icon: AlertCircle,
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Okucia (DualStock)">
        <Link href="/magazyn">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do magazynu
          </Button>
        </Link>
      </Header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Opis sekcji */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">
              Magazyn okuć okiennych
            </h2>
            <p className="text-slate-600">
              System zarządzania magazynem okuć dla PVC i ALU (DualStock)
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        {stat.title}
                      </CardTitle>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 ${getColorClasses(stat.color)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {stat.value}
                    </div>
                    <p className="text-xs text-slate-500">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabs Navigation */}
          <Tabs defaultValue="articles" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="articles">Artykuły</TabsTrigger>
              <TabsTrigger value="stock">Stan magazynu</TabsTrigger>
              <TabsTrigger value="requirements">Zapotrzebowanie</TabsTrigger>
              <TabsTrigger value="orders">Zamówienia</TabsTrigger>
              <TabsTrigger value="history">Historia</TabsTrigger>
            </TabsList>

            {/* Tab: Artykuły - Link do listy artykułów */}
            <TabsContent value="articles" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border-2 border-blue-200">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Artykuły okuć</CardTitle>
                      <CardDescription>
                        Zarządzaj katalogiem artykułów okuć dla PVC i ALU
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href="/magazyn/okuc/artykuly">
                    <Button className="w-full sm:w-auto">
                      Przejdź do listy artykułów
                      <Package className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Stan magazynu - Placeholder */}
            <TabsContent value="stock" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-300">
                      <Warehouse className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle>Stan magazynu</CardTitle>
                      <CardDescription>
                        Aktualny stan magazynowy artykułów okuć
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="h-5 w-5" />
                    <p>Funkcjonalność w przygotowaniu...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Zapotrzebowanie - Placeholder */}
            <TabsContent value="requirements" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-300">
                      <Package className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle>Zapotrzebowanie</CardTitle>
                      <CardDescription>
                        Zapotrzebowanie na okucia z zleceń produkcyjnych
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="h-5 w-5" />
                    <p>Funkcjonalność w przygotowaniu...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Zamówienia - Placeholder */}
            <TabsContent value="orders" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-300">
                      <ShoppingCart className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle>Zamówienia</CardTitle>
                      <CardDescription>
                        Historia zamówień okuć do dostawców
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="h-5 w-5" />
                    <p>Funkcjonalność w przygotowaniu...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Historia - Placeholder */}
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border-2 border-slate-300">
                      <History className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle>Historia</CardTitle>
                      <CardDescription>
                        Historia zmian stanów magazynowych
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertCircle className="h-5 w-5" />
                    <p>Funkcjonalność w przygotowaniu...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
