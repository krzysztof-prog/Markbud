'use client';

import { Package, Layers, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassDeliveriesTable } from '@/features/glass/components/GlassDeliveriesTable';
import { LooseGlassTable } from '@/features/glass/components/LooseGlassTable';
import { AluminumGlassTable } from '@/features/glass/components/AluminumGlassTable';
import { AluminumGlassSummary } from '@/features/glass/components/AluminumGlassSummary';
import { ReclamationGlassTable } from '@/features/glass/components/ReclamationGlassTable';

export default function GlassCategoriesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dostarczone szyby</h1>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Standardowe
          </TabsTrigger>
          <TabsTrigger value="loose" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Luzem
          </TabsTrigger>
          <TabsTrigger value="aluminum" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Aluminium
          </TabsTrigger>
          <TabsTrigger value="reclamation" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reklamacyjne
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-6">
          <GlassDeliveriesTable />
        </TabsContent>

        <TabsContent value="loose" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Szyby luzem</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zamowienia z numerem klienta 9-11 cyfr (np. 20251205431HALEX) lub bez standardowego numeru zlecenia
              </p>
            </CardHeader>
            <CardContent>
              <LooseGlassTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aluminum" className="mt-6 space-y-6">
          <AluminumGlassSummary />

          <Card>
            <CardHeader>
              <CardTitle>Szyby aluminiowe - szczegoly</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zamowienia z numerem klienta zawierajacym &quot;AL.&quot;
              </p>
            </CardHeader>
            <CardContent>
              <AluminumGlassTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reclamation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Szyby reklamacyjne</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zamowienia z numerem klienta zawierajacym &quot;R/&quot;
              </p>
            </CardHeader>
            <CardContent>
              <ReclamationGlassTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
