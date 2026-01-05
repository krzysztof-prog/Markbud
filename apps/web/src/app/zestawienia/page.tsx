'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Przekierowanie z /zestawienia do /kierownik
 * Strona zestawień miesięcznych została przeniesiona do Panelu Kierownika
 */
export default function ZestawieniaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/kierownik?tab=monthly-report');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Przekierowywanie do Panelu Kierownika...</p>
      </div>
    </div>
  );
}
