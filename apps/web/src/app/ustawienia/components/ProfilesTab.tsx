'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Profile {
  id: number;
  number: string;
  name: string;
  description?: string | null;
  articleNumber?: string | null;
}

interface ProfilesTabProps {
  profiles: Profile[] | undefined;
  onAdd: () => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
}

export function ProfilesTab({ profiles, onAdd, onEdit, onDelete }: ProfilesTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Profile PVC</CardTitle>
          <CardDescription>Lista wszystkich profili</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj profil
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Numer</th>
                <th className="px-4 py-3 text-left">Nr artykułu</th>
                <th className="px-4 py-3 text-left">Nazwa</th>
                <th className="px-4 py-3 text-left">Opis</th>
                <th className="px-4 py-3 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((profile, index: number) => (
                <tr
                  key={profile.id}
                  className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3 font-mono font-medium">{profile.number}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{profile.articleNumber || '-'}</td>
                  <td className="px-4 py-3">{profile.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(profile)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(profile)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Brak profili
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
