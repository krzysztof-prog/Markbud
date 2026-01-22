'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface DocumentAuthorMapping {
  id: number;
  authorName: string;
  userId: number;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

interface DocumentAuthorMappingsTabProps {
  mappings: DocumentAuthorMapping[] | undefined;
  onAdd: () => void;
  onEdit: (mapping: DocumentAuthorMapping) => void;
  onDelete: (mapping: DocumentAuthorMapping) => void;
}

export function DocumentAuthorMappingsTab({
  mappings,
  onAdd,
  onEdit,
  onDelete,
}: DocumentAuthorMappingsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Mapowanie autorów dokumentów</CardTitle>
          <CardDescription>
            Przypisz autorów z plików CSV do użytkowników systemu
          </CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj mapowanie
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">Autor z CSV</th>
                <th className="px-4 py-3 text-left">Użytkownik</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {mappings?.map((mapping, index: number) => (
                <tr
                  key={mapping.id}
                  className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3 font-medium">{mapping.authorName}</td>
                  <td className="px-4 py-3">{mapping.user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{mapping.user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(mapping)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(mapping)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!mappings || mappings.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Brak mapowań autorów. Dodaj pierwsze mapowanie aby automatycznie
                    przypisywać autorów do zleceń podczas importu.
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
