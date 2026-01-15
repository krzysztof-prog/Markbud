'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { UpdateAtypicalInput } from '../types';

interface AtypicalSectionProps {
  atypicalWindows: number;
  atypicalUnits: number;
  atypicalSashes: number;
  atypicalValuePln: number; // w groszach
  atypicalNotes: string | null;
  canEdit: boolean;
  onUpdate: (data: UpdateAtypicalInput) => void;
  isPending?: boolean;
}

export const AtypicalSection: React.FC<AtypicalSectionProps> = ({
  atypicalWindows,
  atypicalUnits,
  atypicalSashes,
  atypicalValuePln,
  atypicalNotes,
  canEdit,
  onUpdate,
  isPending = false,
}) => {
  // Bezpieczne wartości domyślne (obsługa undefined/NaN)
  const safeWindows = Number.isFinite(atypicalWindows) ? atypicalWindows : 0;
  const safeUnits = Number.isFinite(atypicalUnits) ? atypicalUnits : 0;
  const safeSashes = Number.isFinite(atypicalSashes) ? atypicalSashes : 0;
  const safeValuePln = Number.isFinite(atypicalValuePln) ? atypicalValuePln : 0;

  // Lokalny stan formularza
  const [windows, setWindows] = useState(safeWindows);
  const [units, setUnits] = useState(safeUnits);
  const [sashes, setSashes] = useState(safeSashes);
  // Wyświetlamy w PLN (dzielimy przez 100)
  const [valuePln, setValuePln] = useState(safeValuePln / 100);
  const [notes, setNotes] = useState(atypicalNotes || '');

  // Synchronizuj z propsami gdy się zmienią (np. po odświeżeniu)
  useEffect(() => {
    const newWindows = Number.isFinite(atypicalWindows) ? atypicalWindows : 0;
    const newUnits = Number.isFinite(atypicalUnits) ? atypicalUnits : 0;
    const newSashes = Number.isFinite(atypicalSashes) ? atypicalSashes : 0;
    const newValuePln = Number.isFinite(atypicalValuePln) ? atypicalValuePln : 0;

    setWindows(newWindows);
    setUnits(newUnits);
    setSashes(newSashes);
    setValuePln(newValuePln / 100);
    setNotes(atypicalNotes || '');
  }, [atypicalWindows, atypicalUnits, atypicalSashes, atypicalValuePln, atypicalNotes]);

  // Sprawdź czy coś się zmieniło (użyj bezpiecznych wartości)
  const hasChanges =
    windows !== safeWindows ||
    units !== safeUnits ||
    sashes !== safeSashes ||
    Math.round(valuePln * 100) !== safeValuePln ||
    notes !== (atypicalNotes || '');

  const handleSave = () => {
    onUpdate({
      atypicalWindows: windows,
      atypicalUnits: units,
      atypicalSashes: sashes,
      // Konwertujemy z powrotem na grosze
      atypicalValuePln: Math.round(valuePln * 100),
      atypicalNotes: notes || null,
    });
  };

  const handleReset = () => {
    setWindows(safeWindows);
    setUnits(safeUnits);
    setSashes(safeSashes);
    setValuePln(safeValuePln / 100);
    setNotes(atypicalNotes || '');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Nietypówki (korekty globalne)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Okna */}
          <div className="space-y-1">
            <Label htmlFor="atypical-windows" className="text-sm text-muted-foreground">
              Okna
            </Label>
            <Input
              id="atypical-windows"
              type="number"
              value={windows}
              onChange={(e) => setWindows(parseInt(e.target.value, 10) || 0)}
              disabled={!canEdit || isPending}
              className="h-9"
            />
          </div>

          {/* Jednostki */}
          <div className="space-y-1">
            <Label htmlFor="atypical-units" className="text-sm text-muted-foreground">
              Jednostki
            </Label>
            <Input
              id="atypical-units"
              type="number"
              value={units}
              onChange={(e) => setUnits(parseInt(e.target.value, 10) || 0)}
              disabled={!canEdit || isPending}
              className="h-9"
            />
          </div>

          {/* Skrzydła */}
          <div className="space-y-1">
            <Label htmlFor="atypical-sashes" className="text-sm text-muted-foreground">
              Skrzydła
            </Label>
            <Input
              id="atypical-sashes"
              type="number"
              value={sashes}
              onChange={(e) => setSashes(parseInt(e.target.value, 10) || 0)}
              disabled={!canEdit || isPending}
              className="h-9"
            />
          </div>

          {/* Wartość PLN */}
          <div className="space-y-1">
            <Label htmlFor="atypical-value" className="text-sm text-muted-foreground">
              Wartość PLN
            </Label>
            <Input
              id="atypical-value"
              type="number"
              step="0.01"
              value={valuePln}
              onChange={(e) => setValuePln(parseFloat(e.target.value) || 0)}
              disabled={!canEdit || isPending}
              className="h-9"
            />
          </div>
        </div>

        {/* Notatki */}
        <div className="space-y-1 mb-4">
          <Label htmlFor="atypical-notes" className="text-sm text-muted-foreground">
            Notatki / Uzasadnienie
          </Label>
          <Textarea
            id="atypical-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit || isPending}
            placeholder="Opcjonalny opis korekt..."
            rows={2}
          />
        </div>

        {/* Przyciski akcji */}
        {canEdit && hasChanges && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isPending} size="sm">
              Anuluj
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AtypicalSection;
