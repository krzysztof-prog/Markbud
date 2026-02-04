/**
 * Treść instrukcji dla strony Importy
 */

import type { HelpContent } from '../types';

export const importyHelpContent: HelpContent = {
  pageId: 'importy',
  pageTitle: 'Importy - Instrukcja obsługi',
  description: 'Import danych z plików zewnętrznych do systemu AKROBUD',
  sections: {
    overview: [
      {
        id: 'import-types',
        title: 'Rodzaje importów',
        content: (
          <div className="space-y-2">
            <p><strong>Ceny</strong> - import cennika profili z pliku Excel</p>
            <p><strong>Użyte bele</strong> - import zużycia materiałów z produkcji</p>
            <p><strong>Profile</strong> - import nowych profili do bazy danych</p>
            <p><strong>Kolory</strong> - import nowych kolorów do systemu</p>
            <p><strong>Zlecenia</strong> - import zleceń z zewnętrznego systemu</p>
          </div>
        ),
      },
      {
        id: 'import-status',
        title: 'Statusy importu',
        content: (
          <div className="space-y-2">
            <p><strong>Oczekuje</strong> - plik gotowy do importu</p>
            <p><strong>W trakcie</strong> - import jest przetwarzany</p>
            <p><strong>Sukces</strong> - import zakończony pomyślnie</p>
            <p><strong>Błąd</strong> - import zakończył się błędem (zobacz szczegóły)</p>
            <p><strong>Częściowy</strong> - część rekordów zaimportowana, część z błędami</p>
          </div>
        ),
      },
      {
        id: 'auto-import',
        title: 'Automatyczny import',
        content: (
          <p>
            System automatycznie monitoruje foldery sieciowe i importuje nowe pliki.
            Pliki są przetwarzane w kolejności ich pojawienia się. Po zakończeniu
            importu plik jest przenoszony do folderu archiwum.
          </p>
        ),
      },
    ],
    howTo: [
      {
        id: 'manual-import',
        title: 'Ręczny import pliku',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij przycisk "Importuj plik" przy odpowiednim typie importu</li>
            <li>Wybierz plik z dysku (format Excel .xlsx lub .xls)</li>
            <li>Poczekaj na zakończenie przetwarzania</li>
            <li>Sprawdź wynik - liczba zaimportowanych i pominiętych rekordów</li>
            <li>W razie błędów - pobierz raport błędów</li>
          </ol>
        ),
      },
      {
        id: 'check-errors',
        title: 'Sprawdzenie błędów importu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź import ze statusem "Błąd" lub "Częściowy"</li>
            <li>Kliknij przycisk "Szczegóły"</li>
            <li>Przejrzyj listę błędów z numerami wierszy</li>
            <li>Popraw plik źródłowy i zaimportuj ponownie</li>
          </ol>
        ),
      },
      {
        id: 'retry-import',
        title: 'Ponowienie importu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź nieudany import na liście</li>
            <li>Kliknij "Ponów" aby spróbować ponownie</li>
            <li>Lub kliknij "Usuń" i zaimportuj poprawiony plik</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'import-prices',
        title: 'Import cen',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Ceny profili zostaną zaktualizowane</li>
              <li>Nowe profile zostaną dodane do bazy</li>
              <li>Stare ceny zachowane w historii</li>
            </ul>
            <p className="text-orange-600 mt-2">
              ⚠️ Import cen wpływa na wyceny zleceń. Upewnij się że plik jest aktualny.
            </p>
          </div>
        ),
      },
      {
        id: 'import-uzyte-bele',
        title: 'Import użytych beli',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Stan magazynu zostanie zaktualizowany</li>
              <li>Zużycie przypisane do zleceń</li>
              <li>Generowane ostrzeżenia o niskim stanie</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'import-orders',
        title: 'Import zleceń',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Nowe zlecenia pojawią się w systemie</li>
              <li>Zlecenia z tym samym numerem zostaną zaktualizowane</li>
              <li>Powiadomienia dla odpowiednich użytkowników</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-format',
        title: 'Jaki format pliku jest wymagany?',
        content: (
          <p>
            System akceptuje pliki Excel (.xlsx, .xls). Każdy typ importu ma
            określony format kolumn - sprawdź przykładowy plik lub dokumentację.
          </p>
        ),
      },
      {
        id: 'faq-duplicate',
        title: 'Co się stanie jeśli zaimportuję ten sam plik dwukrotnie?',
        content: (
          <p>
            System wykryje duplikaty na podstawie nazwy pliku i daty. Zostaniesz
            zapytany czy chcesz kontynuować. Istniejące rekordy zostaną zaktualizowane,
            nie zduplikowane.
          </p>
        ),
      },
      {
        id: 'faq-partial',
        title: 'Co oznacza "Częściowy sukces"?',
        content: (
          <p>
            Część rekordów została zaimportowana pomyślnie, ale niektóre wiersze
            zawierały błędy. Sprawdź szczegóły importu aby zobaczyć które wiersze
            nie zostały przetworzone i dlaczego.
          </p>
        ),
      },
      {
        id: 'faq-rollback',
        title: 'Czy można cofnąć import?',
        content: (
          <p>
            Tak, w ciągu 24 godzin od importu możesz kliknąć "Cofnij" przy
            danym imporcie. Po tym czasie dane są archiwizowane i cofnięcie
            wymaga kontaktu z administratorem.
          </p>
        ),
      },
    ],
  },
};
