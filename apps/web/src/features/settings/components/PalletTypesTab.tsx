'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ProfileDepthsTab } from './ProfileDepthsTab';
import { ProfilePalletConfigTab } from './ProfilePalletConfigTab';

interface PalletType {
  id: number;
  name: string;
  widthMm: number;
  loadWidthMm: number;
}

interface PalletTypesTabProps {
  palletTypes: PalletType[] | undefined;
  onAdd: () => void;
  onEdit: (pallet: PalletType) => void;
  onDelete: (pallet: PalletType) => void;
}

export function PalletTypesTab({
  palletTypes,
  onAdd,
  onEdit,
  onDelete,
}: PalletTypesTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Typy palet</CardTitle>
            <CardDescription>Zdefiniuj rodzaje palet uzywanych do pakowania</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj typ
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Nazwa</th>
                  <th className="px-4 py-3 text-center">Dlugosc (mm)</th>
                  <th className="px-4 py-3 text-center">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {palletTypes?.map((pallet, index: number) => (
                  <tr
                    key={pallet.id}
                    className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                  >
                    <td className="px-4 py-3 font-medium">{pallet.name}</td>
                    <td className="px-4 py-3 text-center">{pallet.widthMm}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(pallet)}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(pallet)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!palletTypes || palletTypes.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Brak typow palet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProfileDepthsTab />
      <ProfilePalletConfigTab />
    </div>
  );
}
