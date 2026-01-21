'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import { Loader2 } from 'lucide-react';
import { useColorsWithTypical, useUpdateColorTypical } from '../hooks';

export function ColorsTypicalTable() {
  const { data: colors, isLoading } = useColorsWithTypical();
  const updateMutation = useUpdateColorTypical();
  const [search, setSearch] = useState('');

  const filteredColors = useMemo(() => {
    if (!colors) return [];
    if (!search.trim()) return colors;
    const searchLower = search.toLowerCase();
    return colors.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.code.toLowerCase().includes(searchLower)
    );
  }, [colors, search]);

  const handleToggle = async (id: number, isTypical: boolean) => {
    await updateMutation.mutateAsync({ id, isTypical });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const typicalCount = colors?.filter((c) => c.isTypical).length ?? 0;
  const totalCount = colors?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kolory - typowe/nietypowe</CardTitle>
        <CardDescription>
          Oznacz kolory jako typowe lub nietypowe ({typicalCount} typowych z {totalCount})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Szukaj koloru..."
          containerClassName="mb-4"
        />

        <div className="rounded border overflow-hidden max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center w-16">Typowy</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Nazwa</th>
              </tr>
            </thead>
            <tbody>
              {filteredColors.map((color, index) => (
                <tr
                  key={color.id}
                  className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-2 text-center">
                    {updateMutation.isPending && updateMutation.variables?.id === color.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-400" />
                    ) : (
                      <Checkbox
                        checked={color.isTypical}
                        onCheckedChange={(checked) => handleToggle(color.id, !!checked)}
                        disabled={updateMutation.isPending}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono">{color.code}</td>
                  <td className="px-4 py-2">{color.name}</td>
                </tr>
              ))}
              {filteredColors.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? 'Brak wyników wyszukiwania' : 'Brak kolorów'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
