'use client';

import { GlassOrderImportSection } from '@/features/glass/components/GlassOrderImportSection';
import { GlassOrdersTable } from '@/features/glass/components/GlassOrdersTable';
import { GlassValidationPanel } from '@/features/glass/components/GlassValidationPanel';

export default function GlassOrdersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Zamowienia szyb</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassOrderImportSection />
        </div>
        <div>
          <GlassValidationPanel />
        </div>
      </div>

      <GlassOrdersTable />
    </div>
  );
}
