'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, DollarSign, Package, Archive } from 'lucide-react';

interface GeneralSettingsTabProps {
  settings: Record<string, string>;
  hasChanges: boolean;
  onSettingChange: (key: string, value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function GeneralSettingsTab({
  settings,
  hasChanges,
  onSettingChange,
  onSave,
  isPending,
}: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Kurs walut
          </CardTitle>
          <CardDescription>Kurs wymiany EUR na PLN do zestawien</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">1 EUR =</label>
            <Input
              type="number"
              step="0.01"
              value={settings.eurToPlnRate || ''}
              onChange={(e) => onSettingChange('eurToPlnRate', e.target.value)}
              className="w-32"
            />
            <span className="text-sm">PLN</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Magazyn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Prog niskiego stanu magazynu (bele)
            </label>
            <Input
              type="number"
              value={settings.lowStockThreshold || ''}
              onChange={(e) => onSettingChange('lowStockThreshold', e.target.value)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archiwizacja zleceń
          </CardTitle>
          <CardDescription>
            Automatyczna archiwizacja wyprodukowanych zleceń
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Archiwizuj zlecenia po (dni od wyprodukowania)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={settings.archiveAfterDays || '40'}
                onChange={(e) => onSettingChange('archiveAfterDays', e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">dni</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zlecenia oznaczone jako wyprodukowane będą automatycznie archiwizowane po upływie tej liczby dni.
              Archiwizacja uruchamiana jest codziennie o 2:30 w nocy.
            </p>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isPending}>
            <Save className="h-4 w-4 mr-2" />
            Zapisz zmiany
          </Button>
        </div>
      )}
    </div>
  );
}
