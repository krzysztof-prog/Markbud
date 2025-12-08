'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, DollarSign, Package } from 'lucide-react';

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
          <CardDescription>Kurs wymiany EUR na PLN do zestawień</CardDescription>
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
              Próg niskiego stanu magazynu (bele)
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
