'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';

const NAV_VISIBILITY_KEY = 'nav_visibility';

const NAV_ITEMS = [
  { name: 'Dashboard', category: 'Główne' },
  { name: 'Dashboard Operatora', category: 'Główne' },
  { name: 'Moja Praca', category: 'Główne' },
  { name: 'Panel Kierownika', category: 'Główne' },
  { name: 'Zestawienie miesięczne', category: 'Zestawienia' },
  { name: 'Do sprawdzenia', category: 'Zestawienia' },
  { name: 'Zestawienie zleceń', category: 'Zestawienia' },
  { name: 'Akrobud', category: 'Magazyny' },
  { name: 'Magazyn PVC', category: 'Magazyny' },
  { name: 'Magazyn Stali', category: 'Magazyny' },
  { name: 'Okucia', category: 'Magazyny' },
  { name: 'Dostawy Schuco', category: 'Zewnętrzne' },
  { name: 'Szyby', category: 'Zewnętrzne' },
  { name: 'Importy', category: 'System' },
  { name: 'Admin', category: 'System' },
] as const;

const CATEGORIES = ['Główne', 'Zestawienia', 'Magazyny', 'Zewnętrzne', 'System'] as const;

export function NavigationSettingsTab() {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  useEffect(() => {
    if (settings?.[NAV_VISIBILITY_KEY]) {
      try {
        setVisibility(JSON.parse(settings[NAV_VISIBILITY_KEY]));
      } catch {
        setVisibility({});
      }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (v: Record<string, boolean>) =>
      settingsApi.update({ [NAV_VISIBILITY_KEY]: JSON.stringify(v) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Zapisano ustawienia nawigacji' });
    },
    onError: () => {
      toast({ title: 'Błąd zapisu ustawień', variant: 'destructive' });
    },
  });

  const isVisible = useCallback((name: string) => visibility[name] !== false, [visibility]);

  const toggle = useCallback((name: string) => {
    setVisibility(prev => ({ ...prev, [name]: prev[name] === false }));
  }, []);

  const visibleCount = useMemo(
    () => NAV_ITEMS.filter(i => isVisible(i.name)).length,
    [isVisible]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Widoczność menu bocznego</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Wybierz które pozycje mają być widoczne — {visibleCount}/{NAV_ITEMS.length} aktywnych
          </p>
        </div>
        <Button onClick={() => mutation.mutate(visibility)} disabled={mutation.isPending}>
          {mutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map(category => (
          <div key={category} className="border rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category}
            </h4>
            <div className="space-y-1">
              {NAV_ITEMS.filter(i => i.category === category).map(item => (
                <label
                  key={item.name}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isVisible(item.name)}
                    onChange={() => toggle(item.name)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
