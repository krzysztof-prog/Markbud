'use client';

/**
 * MailParserForm - Formularz do wklejania i parsowania emaila z awizacją
 *
 * Komponent zawiera duże pole tekstowe do wklejenia treści maila
 * oraz przycisk do parsowania. Po pomyślnym sparsowaniu wywołuje
 * callback onParsed z wynikiem parsowania.
 *
 * Błędy są automatycznie wyświetlane przez hook useParseEmail jako toast.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useParseEmail } from '../hooks';
import type { ParseResult } from '../types';

// ========== Typy Props ==========

interface MailParserFormProps {
  /** Callback wywoływany po pomyślnym sparsowaniu emaila */
  onParsed: (result: ParseResult, rawMailText: string) => void;
  /** Tryb kompaktowy dla panelu bocznego */
  compact?: boolean;
}

// ========== Komponent ==========

/**
 * Formularz do parsowania emaila z listą projektów na dostawę
 *
 * @example
 * <MailParserForm
 *   onParsed={(result) => setPreviewData(result)}
 * />
 */
export function MailParserForm({ onParsed, compact = false }: MailParserFormProps) {
  // Stan lokalny - tekst maila wklejony przez użytkownika
  const [mailText, setMailText] = useState('');

  // Hook do parsowania - obsługuje też toast na sukces/błąd
  const { mutate: parseEmail, isPending } = useParseEmail({
    onSuccess: (result) => {
      // Przekaż wynik parsowania wraz z oryginalnym tekstem maila
      onParsed(result, mailText.trim());
    },
    // Błąd jest automatycznie obsługiwany przez hook (toast)
  });

  /**
   * Obsługa wysłania formularza
   * Wywołuje mutację parsowania jeśli tekst nie jest pusty
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sprawdź czy tekst nie jest pusty
    const trimmedText = mailText.trim();
    if (!trimmedText) {
      return;
    }

    // Wywołaj parsowanie
    parseEmail({ mailText: trimmedText });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pole tekstowe na treść maila */}
      <div className="space-y-2">
        {!compact && (
          <label htmlFor="mailText" className="text-sm font-medium text-foreground">
            Wklej tekst maila
          </label>
        )}
        <Textarea
          id="mailText"
          value={mailText}
          onChange={(e) => setMailText(e.target.value)}
          placeholder="Wklej tutaj treść maila z awizacją dostaw..."
          rows={compact ? 8 : 12}
          className={compact ? 'min-h-[180px] resize-y font-mono text-sm' : 'min-h-[280px] resize-y font-mono text-sm'}
          disabled={isPending}
        />
        {!compact && (
          <p className="text-xs text-muted-foreground">
            Skopiuj całą treść maila z listą projektów i wklej powyżej
          </p>
        )}
      </div>

      {/* Przycisk parsowania */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending || !mailText.trim()}
        >
          {isPending ? 'Parsowanie...' : 'Parsuj'}
        </Button>
      </div>
    </form>
  );
}

export default MailParserForm;
