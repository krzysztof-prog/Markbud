'use client';

/**
 * VerificationItemsInput - Komponent wklejania treści maila
 *
 * Automatycznie wykrywa:
 * - Datę dostawy (np. "na 15.01" lub "na 15/01")
 * - Numery projektów (np. P12345, A1234)
 */

import React, { useState, useMemo } from 'react';
import { Plus, Mail, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface VerificationItemsInputProps {
  onAddProjects: (data: {
    rawInput: string;
    projects: string[];
    suggestedDate: Date | null;
  }) => void;
  isPending?: boolean;
}

/**
 * Parsuje tekst maila i wykrywa datę dostawy
 * Format: "na DD.MM" lub "na DD/MM"
 */
function parseDeliveryDate(text: string): Date | null {
  // Regex: "na" + spacja + dzień (1-2 cyfry) + separator (. lub /) + miesiąc (1-2 cyfry)
  const dateRegex = /\bna\s+(\d{1,2})[./](\d{1,2})/i;
  const match = text.match(dateRegex);

  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  // Walidacja podstawowa
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  // Używamy bieżącego roku
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, month - 1, day);

  // Sprawdź czy data jest prawidłowa (np. 31.02 da inną datę)
  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null;
  }

  return date;
}

/**
 * Parsuje tekst maila i wykrywa numery projektów
 * Format: litera + 3-5 cyfr (np. P12345, A1234, B123)
 */
function parseProjects(text: string): string[] {
  // Regex: duża litera + 3-5 cyfr
  const projectRegex = /\b[A-Z]\d{3,5}\b/g;
  const matches = text.match(projectRegex);

  if (!matches) return [];

  // Usuń duplikaty i posortuj
  const uniqueProjects = [...new Set(matches)].sort();
  return uniqueProjects;
}

/**
 * Formatuje datę do wyświetlenia (DD.MM.YYYY)
 */
function formatDateDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Formatuje datę do inputa date (YYYY-MM-DD)
 */
function formatDateInput(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

export const VerificationItemsInput: React.FC<VerificationItemsInputProps> = ({
  onAddProjects,
  isPending = false,
}) => {
  const [textareaValue, setTextareaValue] = useState('');
  const [manualDate, setManualDate] = useState<string | null>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Wykrywanie daty i projektów (live preview)
  const detectedDate = useMemo(() => {
    return parseDeliveryDate(textareaValue);
  }, [textareaValue]);

  const detectedProjects = useMemo(() => {
    return parseProjects(textareaValue);
  }, [textareaValue]);

  // Finalna data - manualna ma priorytet
  const finalDate = useMemo(() => {
    if (manualDate) {
      return new Date(manualDate);
    }
    return detectedDate;
  }, [manualDate, detectedDate]);

  // Handler zmiany daty manualnej
  const handleDateChange = (value: string) => {
    setManualDate(value || null);
    setIsEditingDate(false);
  };

  // Handler dodania projektów
  const handleAddProjects = () => {
    if (detectedProjects.length === 0) return;

    onAddProjects({
      rawInput: textareaValue,
      projects: detectedProjects,
      suggestedDate: finalDate,
    });

    // Wyczyść po dodaniu
    setTextareaValue('');
    setManualDate(null);
    setIsEditingDate(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Wklej treść maila
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Textarea na treść maila */}
        <div className="space-y-2">
          <Label htmlFor="mailContent">Treść maila od klienta</Label>
          <Textarea
            id="mailContent"
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            placeholder="Wklej treść maila od klienta...

Przykład:
Dzień dobry,
proszę o przygotowanie okien na 15.01:
P12345
P12346
A1234
B123"
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        {/* Podgląd wykrytych danych */}
        {textareaValue.trim() && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            {/* Wykryta data */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Wykryta data:</span>

              {isEditingDate ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    defaultValue={finalDate ? formatDateInput(finalDate) : ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-8 w-40"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDate(false)}
                  >
                    Anuluj
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium">
                    {finalDate ? formatDateDisplay(finalDate) : 'brak'}
                  </span>
                  {manualDate && detectedDate && (
                    <Badge variant="secondary" className="text-xs">
                      ręcznie
                    </Badge>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setIsEditingDate(true)}
                  >
                    {finalDate ? 'Zmień' : 'Ustaw'}
                  </Button>
                </>
              )}
            </div>

            {/* Wykryte projekty */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Wykryte projekty ({detectedProjects.length}):
                </span>
              </div>

              {detectedProjects.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {detectedProjects.map((project) => (
                    <Badge key={project} variant="outline">
                      {project}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nie wykryto projektów (format: litera + 3-5 cyfr, np. P12345)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Przycisk dodania */}
        <Button
          onClick={handleAddProjects}
          disabled={detectedProjects.length === 0 || isPending}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isPending
            ? 'Dodawanie...'
            : detectedProjects.length > 0
            ? `Dodaj ${detectedProjects.length} projekt${detectedProjects.length === 1 ? '' : detectedProjects.length < 5 ? 'y' : 'ów'}`
            : 'Dodaj projekty'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VerificationItemsInput;
