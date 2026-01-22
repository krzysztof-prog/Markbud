'use client';

/**
 * LogistykaPageContent - Główny komponent strony logistyki
 *
 * Orkiestruje cały flow parsowania emaili z awizacjami:
 * 1. Widok kalendarza (domyślny) - pokazuje dostawy na najbliższe 2 miesiące
 * 2. Widok parsowania - formularz do wklejenia emaila
 * 3. Widok podglądu - podgląd sparsowanych danych przed zapisem
 *
 * Flow użytkownika:
 * 1. Użytkownik klika "Nowy mail" -> przejście do stanu 'parsing'
 * 2. Wkleja email, klika "Parsuj" -> przy sukcesie przejście do 'preview'
 * 3. Klika "Zapisz" -> zapis przez useSaveMailList -> powrót do 'calendar'
 * 4. Klika "Anuluj" w dowolnym momencie -> powrót do 'calendar'
 */

import { useState, useMemo, useCallback } from 'react';
import { Plus, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { MailParserForm } from './MailParserForm';
import { ParsedMailPreview } from './ParsedMailPreview';
import { LogisticsCalendarView } from './LogisticsCalendarView';

import { useLogisticsCalendar, useSaveMailList } from '../hooks';
import type { ParseResult, SaveMailListInput } from '../types';

// ========== Typy ==========

/**
 * Możliwe stany widoku strony
 */
type ViewState = 'calendar' | 'parsing' | 'preview';

// ========== Stałe ==========

/**
 * Oblicza zakres dat dla kalendarza (2 miesiące do przodu)
 */
function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = now.toISOString().split('T')[0];

  // 2 miesiące do przodu
  const toDate = new Date(now);
  toDate.setMonth(toDate.getMonth() + 2);
  const to = toDate.toISOString().split('T')[0];

  return { from, to };
}

// ========== Główny komponent ==========

/**
 * Główna strona modułu logistyki
 *
 * Zarządza stanem widoku i przepływem danych między komponentami:
 * - MailParserForm (parsowanie emaila)
 * - ParsedMailPreview (podgląd sparsowanych danych)
 * - LogisticsCalendarView (widok kalendarza dostaw)
 */
export function LogistykaPageContent() {
  // Stan widoku
  const [viewState, setViewState] = useState<ViewState>('calendar');

  // Przechowywanie wyniku parsowania do wyświetlenia w preview
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Przechowywanie oryginalnego tekstu maila (do zapisu razem z danymi)
  const [rawMailText, setRawMailText] = useState<string>('');

  // Zakres dat dla kalendarza (2 miesiące od dziś)
  const dateRange = useMemo(() => getDefaultDateRange(), []);

  // Hook do pobierania danych kalendarza
  const {
    data: calendarData,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar,
  } = useLogisticsCalendar(dateRange.from, dateRange.to);

  // Hook do zapisywania listy mailowej
  const { mutate: saveMailList, isPending: isSaving } = useSaveMailList({
    onSuccess: () => {
      // Po sukcesie wracamy do kalendarza
      setViewState('calendar');
      setParseResult(null);
      setRawMailText('');
    },
  });

  // ========== Handlery ==========

  /**
   * Przejście do widoku parsowania
   */
  const handleNewMail = useCallback(() => {
    setViewState('parsing');
    setParseResult(null);
    setRawMailText('');
  }, []);

  /**
   * Obsługa sparsowanego emaila - przejście do preview
   */
  const handleParsed = useCallback((result: ParseResult, mailText: string) => {
    setParseResult(result);
    setRawMailText(mailText);
    setViewState('preview');
  }, []);

  /**
   * Zapisanie wszystkich list mailowych (obsługa wielu dostaw: Klient nr 1, 2...)
   *
   * Zapisuje każdą dostawę sekwencyjnie. Po zapisaniu wszystkich:
   * - Wraca do widoku kalendarza
   * - Czyści stan
   */
  const handleSaveAll = useCallback(
    async (allData: SaveMailListInput[]) => {
      if (allData.length === 0) return;

      // Zapisujemy każdą dostawę sekwencyjnie
      // Używamy Promise.all ale saveMailList jest mutation więc
      // musimy użyć mutateAsync
      try {
        for (const data of allData) {
          await new Promise<void>((resolve, reject) => {
            saveMailList(data, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            });
          });
        }
        // Sukces wszystkich - callback onSuccess z useSaveMailList zajmie się resztą
      } catch {
        // Błąd - toast już pokazany przez useSaveMailList
      }
    },
    [saveMailList]
  );

  /**
   * Anulowanie - powrót do kalendarza
   */
  const handleCancel = useCallback(() => {
    setViewState('calendar');
    setParseResult(null);
    setRawMailText('');
  }, []);

  /**
   * Odświeżenie kalendarza
   */
  const handleRefreshCalendar = useCallback(() => {
    refetchCalendar();
  }, [refetchCalendar]);

  // ========== Renderowanie ==========

  // Tytuł strony zależny od stanu
  const pageTitle = useMemo(() => {
    switch (viewState) {
      case 'parsing':
        return 'Nowa lista z emaila';
      case 'preview':
        return 'Podgląd listy';
      default:
        return 'Logistyka';
    }
  }, [viewState]);

  return (
    <div className="space-y-6">
      {/* Nagłówek strony */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Tytuł z ikoną */}
            <div className="flex items-center gap-3">
              {viewState !== 'calendar' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Wróć
                </Button>
              )}
              <Calendar className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-xl">{pageTitle}</CardTitle>
            </div>

            {/* Przycisk "Nowy mail" - tylko w widoku kalendarza */}
            {viewState === 'calendar' && (
              <Button onClick={handleNewMail}>
                <Plus className="h-4 w-4 mr-2" />
                Nowy mail
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Zawartość główna - zależna od stanu widoku */}
      <div>
        {viewState === 'calendar' && (
          <LogisticsCalendarView
            entries={calendarData?.entries ?? []}
            isLoading={isLoadingCalendar}
            error={calendarError?.message ?? null}
            onRefresh={handleRefreshCalendar}
          />
        )}

        {viewState === 'parsing' && (
          <Card>
            <CardContent className="pt-6">
              <MailParserForm onParsed={handleParsed} />
            </CardContent>
          </Card>
        )}

        {viewState === 'preview' && parseResult && (
          <ParsedMailPreview
            parseResult={parseResult}
            rawMailText={rawMailText}
            onSaveAll={handleSaveAll}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}

export default LogistykaPageContent;
