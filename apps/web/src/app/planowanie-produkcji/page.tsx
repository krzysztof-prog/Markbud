'use client';

import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EfficiencyConfigsTable,
  ProfilesPalletizedTable,
  ColorsTypicalTable,
} from '@/features/production-planning';

export default function PlanowanieProdukcjiPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Planowanie produkcji" />
      <main className="container mx-auto p-6">

        <Tabs defaultValue="efficiency" className="space-y-4">
          <TabsList>
            <TabsTrigger value="efficiency">Wydajność</TabsTrigger>
            <TabsTrigger value="profiles">Profile</TabsTrigger>
            <TabsTrigger value="colors">Kolory</TabsTrigger>
          </TabsList>

          <TabsContent value="efficiency">
            <EfficiencyConfigsTable />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesPalletizedTable />
          </TabsContent>

          <TabsContent value="colors">
            <ColorsTypicalTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
