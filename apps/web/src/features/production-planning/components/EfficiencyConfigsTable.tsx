'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { useEfficiencyConfigs, useUpdateEfficiencyConfig } from '../hooks';
import type { EfficiencyConfig } from '../api';

export function EfficiencyConfigsTable() {
  const { data: configs, isLoading } = useEfficiencyConfigs();
  const updateMutation = useUpdateEfficiencyConfig();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    glazingsPerHour: string;
    wingsPerHour: string;
  }>({ glazingsPerHour: '', wingsPerHour: '' });

  const startEdit = (config: EfficiencyConfig) => {
    setEditingId(config.id);
    setEditValues({
      glazingsPerHour: String(config.glazingsPerHour),
      wingsPerHour: String(config.wingsPerHour),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ glazingsPerHour: '', wingsPerHour: '' });
  };

  const saveEdit = async (id: number) => {
    await updateMutation.mutateAsync({
      id,
      data: {
        glazingsPerHour: parseFloat(editValues.glazingsPerHour),
        wingsPerHour: parseFloat(editValues.wingsPerHour),
      },
    });
    setEditingId(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfiguracja wydajności</CardTitle>
        <CardDescription>
          Wydajność produkcji (szkleń/h i skrzydeł/h) dla poszczególnych typów klientów
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Typ klienta</th>
                <th className="px-4 py-3 text-right">Szkleń / h</th>
                <th className="px-4 py-3 text-right">Skrzydeł / h</th>
                <th className="px-4 py-3 text-center w-24">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {configs?.map((config, index) => (
                <tr
                  key={config.id}
                  className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3 font-medium">{config.name}</td>
                  <td className="px-4 py-3 text-right">
                    {editingId === config.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editValues.glazingsPerHour}
                        onChange={(e) => setEditValues((v) => ({ ...v, glazingsPerHour: e.target.value }))}
                        className="w-24 ml-auto text-right"
                      />
                    ) : (
                      <span className="font-mono">{Number(config.glazingsPerHour).toFixed(1)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === config.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editValues.wingsPerHour}
                        onChange={(e) => setEditValues((v) => ({ ...v, wingsPerHour: e.target.value }))}
                        className="w-24 ml-auto text-right"
                      />
                    ) : (
                      <span className="font-mono">{Number(config.wingsPerHour).toFixed(1)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === config.id ? (
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveEdit(config.id)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => startEdit(config)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(!configs || configs.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Brak konfiguracji wydajności
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
