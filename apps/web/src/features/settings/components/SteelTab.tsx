'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Steel {
  id: number;
  number: string;
  articleNumber?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
}

interface SteelTabProps {
  steels: Steel[] | undefined;
  onAdd: () => void;
  onEdit: (steel: Steel) => void;
  onDelete: (steel: Steel) => void;
}

export function SteelTab({ steels, onAdd, onEdit, onDelete }: SteelTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Stal (wzmocnienia)</CardTitle>
          <CardDescription>
            Lista wzmocnień stalowych - rozpoznawane automatycznie podczas importu CSV
            (numery artykułów zaczynające się od 201 lub 202)
          </CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj stal
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
              {steels?.map((steel, index: number) => (
                <tr
                  key={steel.id}
                  className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3 font-mono font-medium">{steel.number}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{steel.articleNumber || '-'}</td>
                  <td className="px-4 py-3">{steel.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{steel.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(steel)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(steel)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!steels || steels.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Brak stali
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
