'use client';

/**
 * VerificationItemsInput - Komponent wprowadzania numerów zleceń
 *
 * Obsługuje dwa tryby:
 * - textarea: wklejanie listy numerów
 * - single: dodawanie pojedynczo
 */

import React, { useState } from 'react';
import { Plus, Trash2, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AddItemsData, DuplicateItem } from '@/types';

interface VerificationItemsInputProps {
  onAddItems: (data: AddItemsData) => void;
  isPending?: boolean;
  existingItems?: Array<{ orderNumberInput: string; position: number }>;
}

export const VerificationItemsInput: React.FC<VerificationItemsInputProps> = ({
  onAddItems,
  isPending = false,
  existingItems = [],
}) => {
  const [inputMode, setInputMode] = useState<'textarea' | 'single'>('textarea');
  const [textareaValue, setTextareaValue] = useState('');
  const [singleValue, setSingleValue] = useState('');
  const [previewItems, setPreviewItems] = useState<string[]>([]);

  // Parsowanie textarea do podglądu
  const parseTextarea = (text: string): string[] => {
    if (!text.trim()) return [];

    return text
      .split(/[\n\r,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // Aktualizacja podglądu przy zmianie textarea
  const handleTextareaChange = (value: string) => {
    setTextareaValue(value);
    setPreviewItems(parseTextarea(value));
  };

  // Dodaj z textarea
  const handleAddFromTextarea = () => {
    const items = parseTextarea(textareaValue);
    if (items.length === 0) return;

    onAddItems({
      items: items.map((orderNumber) => ({ orderNumber })),
      inputMode: 'textarea',
    });

    // Wyczyść po dodaniu
    setTextareaValue('');
    setPreviewItems([]);
  };

  // Dodaj pojedynczy
  const handleAddSingle = () => {
    const orderNumber = singleValue.trim();
    if (!orderNumber) return;

    onAddItems({
      items: [{ orderNumber }],
      inputMode: 'single',
    });

    // Wyczyść po dodaniu
    setSingleValue('');
  };

  // Wykryj duplikaty w podglądzie
  const findDuplicatesInPreview = (): DuplicateItem[] => {
    const counts = new Map<string, number[]>();

    previewItems.forEach((item, index) => {
      if (!counts.has(item)) {
        counts.set(item, []);
      }
      counts.get(item)!.push(index + 1);
    });

    const duplicates: DuplicateItem[] = [];
    counts.forEach((positions, orderNumber) => {
      if (positions.length > 1) {
        duplicates.push({ orderNumber, positions });
      }
    });

    return duplicates;
  };

  // Wykryj konflikty z istniejącymi
  const findConflictsWithExisting = (): string[] => {
    const existingNumbers = new Set(existingItems.map((i) => i.orderNumberInput));
    return previewItems.filter((item) => existingNumbers.has(item));
  };

  const duplicates = findDuplicatesInPreview();
  const conflicts = findConflictsWithExisting();

  return (
    <div className="space-y-4">
      {/* Wybór trybu wprowadzania */}
      <div className="space-y-2">
        <Label>Sposób wprowadzania</Label>
        <RadioGroup
          value={inputMode}
          onValueChange={(v: string) => setInputMode(v as 'textarea' | 'single')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="textarea" id="textarea" />
            <Label htmlFor="textarea" className="cursor-pointer flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Wklej listę
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="cursor-pointer flex items-center gap-1">
              <List className="h-4 w-4" />
              Dodawaj pojedynczo
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Tryb textarea */}
      {inputMode === 'textarea' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="orderNumbers">
              Numery zleceń (każdy w nowej linii lub oddzielone przecinkiem)
            </Label>
            <Textarea
              id="orderNumbers"
              value={textareaValue}
              onChange={(e) => handleTextareaChange(e.target.value)}
              placeholder={`52341
52342-a
52343
...`}
              rows={8}
              className="font-mono"
            />
          </div>

          {/* Podgląd */}
          {previewItems.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Rozpoznano: {previewItems.length} zleceń
                  </span>
                  {duplicates.length > 0 && (
                    <Badge variant="destructive">
                      {duplicates.length} duplikatów
                    </Badge>
                  )}
                  {conflicts.length > 0 && (
                    <Badge variant="secondary">
                      {conflicts.length} już na liście
                    </Badge>
                  )}
                </div>

                {/* Lista duplikatów */}
                {duplicates.length > 0 && (
                  <div className="text-sm text-destructive mb-2">
                    Duplikaty: {duplicates.map((d) => d.orderNumber).join(', ')}
                  </div>
                )}

                {/* Lista konfliktów */}
                {conflicts.length > 0 && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Już na liście: {conflicts.join(', ')}
                  </div>
                )}

                {/* Podgląd pierwszych 10 */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewItems.slice(0, 10).map((item, index) => (
                    <Badge
                      key={index}
                      variant={
                        conflicts.includes(item)
                          ? 'secondary'
                          : duplicates.some((d) => d.orderNumber === item)
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {item}
                    </Badge>
                  ))}
                  {previewItems.length > 10 && (
                    <Badge variant="outline">+{previewItems.length - 10} więcej</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleAddFromTextarea}
            disabled={previewItems.length === 0 || isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isPending ? 'Dodawanie...' : `Dodaj ${previewItems.length} zleceń`}
          </Button>
        </div>
      )}

      {/* Tryb pojedynczy */}
      {inputMode === 'single' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={singleValue}
              onChange={(e) => setSingleValue(e.target.value)}
              placeholder="Numer zlecenia (np. 52341)"
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSingle();
                }
              }}
            />
            <Button
              onClick={handleAddSingle}
              disabled={!singleValue.trim() || isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Wpisz numer zlecenia i naciśnij Enter lub kliknij przycisk +
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificationItemsInput;
