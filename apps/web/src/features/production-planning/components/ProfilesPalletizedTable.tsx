'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/ui/search-input';
import { Loader2 } from 'lucide-react';
import { useProfilesWithPalletized, useUpdateProfilePalletized } from '../hooks';

export function ProfilesPalletizedTable() {
  const { data: profiles, isLoading } = useProfilesWithPalletized();
  const updateMutation = useUpdateProfilePalletized();
  const [search, setSearch] = useState('');

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!search.trim()) return profiles;
    const searchLower = search.toLowerCase();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
    );
  }, [profiles, search]);

  const handleToggle = async (id: number, isPalletized: boolean) => {
    await updateMutation.mutateAsync({ id, isPalletized });
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

  const palletizedCount = profiles?.filter((p) => p.isPalletized).length ?? 0;
  const totalCount = profiles?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile - paletyzowane</CardTitle>
        <CardDescription>
          Oznacz profile które są paletyzowane ({palletizedCount} z {totalCount})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Szukaj profilu..."
          containerClassName="mb-4"
        />

        <div className="rounded border overflow-hidden max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center w-16">Palet.</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Nazwa</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile, index) => (
                <tr
                  key={profile.id}
                  className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-2 text-center">
                    {updateMutation.isPending && updateMutation.variables?.id === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-400" />
                    ) : (
                      <Checkbox
                        checked={profile.isPalletized}
                        onCheckedChange={(checked) => handleToggle(profile.id, !!checked)}
                        disabled={updateMutation.isPending}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono">{profile.code}</td>
                  <td className="px-4 py-2">{profile.name}</td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? 'Brak wyników wyszukiwania' : 'Brak profili'}
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
