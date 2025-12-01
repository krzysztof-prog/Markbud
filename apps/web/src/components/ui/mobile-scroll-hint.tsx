'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MobileScrollHint() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="md:hidden bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 rounded-r">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          Przesuń tabelę w lewo/prawo, aby zobaczyć więcej kolumn
        </p>
      </div>
    </div>
  );
}
