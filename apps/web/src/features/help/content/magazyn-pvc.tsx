/**
 * Treść instrukcji dla strony Magazyn PVC
 */

import type { HelpContent } from '../types';

export const magazynPvcHelpContent: HelpContent = {
  pageId: 'magazyn-pvc',
  pageTitle: 'Magazyn PVC - Instrukcja obsługi',
  description: 'Zarządzanie stanami magazynowymi profili PVC',
  sections: {
    overview: [
      {
        id: 'pvc-overview',
        title: 'Przegląd magazynu',
        content: (
          <div className="space-y-2">
            <p><strong>Tabela stanów</strong> - aktualne ilości profili w magazynie</p>
            <p><strong>Filtry</strong> - wyszukiwanie po systemie, profilu, kolorze</p>
            <p><strong>Alerty</strong> - ostrzeżenia o niskim stanie</p>
            <p><strong>Historia</strong> - ruchy magazynowe</p>
          </div>
        ),
      },
      {
        id: 'stock-colors',
        title: 'Kolory stanów',
        content: (
          <div className="space-y-2">
            <p><strong className="text-green-600">Zielony</strong> - stan optymalny</p>
            <p><strong className="text-yellow-600">Żółty</strong> - stan niski (poniżej minimum)</p>
            <p><strong className="text-red-600">Czerwony</strong> - stan krytyczny / brak</p>
            <p><strong className="text-blue-600">Niebieski</strong> - stan powyżej maksimum</p>
          </div>
        ),
      },
      {
        id: 'systems',
        title: 'Systemy profili',
        content: (
          <p>
            Profile są pogrupowane według systemów (np. Veka, Schuco, Aluplast).
            Użyj filtrów aby wyświetlić profile z konkretnego systemu.
            Każdy system ma własne minimalne stany magazynowe.
          </p>
        ),
      },
    ],
    howTo: [
      {
        id: 'search-profile',
        title: 'Wyszukiwanie profilu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Wpisz nazwę lub numer profilu w pole wyszukiwania</li>
            <li>Lub wybierz system z rozwijanej listy</li>
            <li>Lub wybierz kolor z filtrów</li>
            <li>Tabela automatycznie się przefiltruje</li>
          </ol>
        ),
      },
      {
        id: 'check-demand',
        title: 'Sprawdzenie zapotrzebowania',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Zapotrzebowanie" w górnym menu</li>
            <li>System pokaże profile potrzebne na najbliższe zlecenia</li>
            <li>Kolumna "Brakuje" pokazuje ile trzeba zamówić</li>
            <li>Kliknij "Generuj zamówienie" aby utworzyć zamówienie do dostawcy</li>
          </ol>
        ),
      },
      {
        id: 'view-history',
        title: 'Sprawdzenie historii profilu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij na wiersz z profilem</li>
            <li>Wybierz zakładkę "Historia"</li>
            <li>Zobacz wszystkie ruchy: przyjęcia, wydania, korekty</li>
            <li>Filtruj po dacie jeśli potrzebujesz konkretnego okresu</li>
          </ol>
        ),
      },
      {
        id: 'export-stock',
        title: 'Eksport stanu magazynu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Ustaw filtry na żądany widok</li>
            <li>Kliknij "Eksportuj" w prawym górnym rogu</li>
            <li>Wybierz format (Excel lub PDF)</li>
            <li>Plik zostanie pobrany</li>
          </ol>
        ),
      },
      {
        id: 'manual-correction',
        title: 'Korekta stanu (tylko uprawnieni)',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij na profil wymagający korekty</li>
            <li>Kliknij "Korekta stanu"</li>
            <li>Podaj nową ilość</li>
            <li>Wybierz powód korekty</li>
            <li>Dodaj komentarz wyjaśniający</li>
            <li>Kliknij "Zapisz korektę"</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'low-stock-consequence',
        title: 'Stan poniżej minimum',
        content: (
          <div className="space-y-2">
            <p><strong>Co się dzieje:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Wiersz podświetlony na żółto</li>
              <li>Alert w panelu kierownika</li>
              <li>Sugestia zamówienia uzupełniającego</li>
              <li>Zlecenia z tym profilem mogą być wstrzymane</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'zero-stock-consequence',
        title: 'Stan zerowy',
        content: (
          <div className="space-y-2">
            <p><strong>Co się dzieje:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Wiersz podświetlony na czerwono</li>
              <li>Blokada zleceń wymagających tego profilu</li>
              <li>Pilne powiadomienie dla kierownika</li>
              <li>Automatyczne zamówienie (jeśli włączone)</li>
            </ul>
            <p className="text-red-600 mt-2">
              ⚠️ Brak profilu wstrzymuje produkcję - reaguj szybko!
            </p>
          </div>
        ),
      },
      {
        id: 'correction-consequence',
        title: 'Korekta stanu',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Nowy stan magazynowy od razu widoczny</li>
              <li>Korekta zapisana w historii (kto, kiedy, powód)</li>
              <li>Wpływa na kalkulację zapotrzebowania</li>
              <li>Może odblokować lub zablokować zlecenia</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-negative',
        title: 'Stan pokazuje wartość ujemną - dlaczego?',
        content: (
          <p>
            Ujemny stan oznacza że wydano więcej niż było na magazynie. Może
            to wynikać z błędu w dokumentach lub opóźnionego przyjęcia dostawy.
            Sprawdź historię i skontaktuj się z kierownikiem aby wyjaśnić
            i wykonać korektę.
          </p>
        ),
      },
      {
        id: 'faq-different-quantity',
        title: 'Stan w systemie różni się od fizycznego',
        content: (
          <p>
            Wykonaj inwentaryzację danego profilu. Jeśli różnica się potwierdzi,
            wykonaj korektę stanu z odpowiednim uzasadnieniem. Zgłoś systematyczne
            rozbieżności kierownikowi.
          </p>
        ),
      },
      {
        id: 'faq-minimum',
        title: 'Jak ustawić minimum dla profilu?',
        content: (
          <p>
            Kliknij na profil → "Ustawienia" → podaj "Stan minimalny". System
            będzie alertować gdy stan spadnie poniżej tej wartości. Ustawienia
            może zmienić tylko kierownik lub admin.
          </p>
        ),
      },
      {
        id: 'faq-reservation',
        title: 'Co oznacza "Zarezerwowane"?',
        content: (
          <p>
            Ilość zarezerwowana to materiał przypisany do konkretnych zleceń
            ale jeszcze nie wydany. "Dostępne" = Stan - Zarezerwowane.
            Nowe zlecenia mogą używać tylko "Dostępne".
          </p>
        ),
      },
    ],
  },
};
