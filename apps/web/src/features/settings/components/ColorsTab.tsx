'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Color {
  id: number;
  code: string;
  name: string;
  type: string;
  hexColor?: string | null;
}

interface ColorsTabProps {
  colors: Color[] | undefined;
  onAdd: () => void;
  onEdit: (color: Color) => void;
  onDelete: (color: Color) => void;
}

export function ColorsTab({ colors, onAdd, onEdit, onDelete }: ColorsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Kolory</CardTitle>
          <CardDescription>Lista wszystkich kolorow profili</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj kolor
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Kolor</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Nazwa</th>
                <th className="px-4 py-3 text-left">Typ</th>
                <th className="px-4 py-3 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {colors?.map((color, index: number) => (
                <tr
                  key={color.id}
                  className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color.hexColor || '#ccc' }}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono">{color.code}</td>
                  <td className="px-4 py-3">{color.name}</td>
                  <td className="px-4 py-3">{color.type === 'typical' ? 'Typowy' : 'Nietypowy'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(color)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(color)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!colors || colors.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Brak kolorow
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
