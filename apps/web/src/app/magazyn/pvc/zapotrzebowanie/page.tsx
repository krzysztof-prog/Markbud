/**
 * Magazyn PVC - Zapotrzebowanie Page
 *
 * Strona dedykowana dla widoku zapotrzebowania na profile
 */

import React, { Suspense } from 'react';
import { PvcZapotrzebowanieContent } from './PvcZapotrzebowanieContent';

// Loading skeleton dla strony
function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="h-16 bg-slate-200" />
      <div className="px-6 pt-4">
        <div className="h-6 w-48 bg-slate-200 rounded" />
      </div>
      <div className="px-6 pt-4">
        <div className="h-12 bg-slate-200 rounded" />
      </div>
      <div className="flex flex-1 overflow-hidden mt-4">
        <div className="flex-1 px-6 pb-6">
          <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
          <div className="h-96 bg-slate-200 rounded" />
        </div>
        <div className="w-64 bg-slate-200" />
      </div>
    </div>
  );
}

export default function PvcZapotrzebowaniePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PvcZapotrzebowanieContent />
    </Suspense>
  );
}
