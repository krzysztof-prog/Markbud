/**
 * Instrukcja obsługi - Zlecenia
 */

import type { HelpContent } from '../types';

export const zleceniaHelp: HelpContent = {
  pageId: 'zlecenia',
  pageTitle: 'Zlecenia - Instrukcja obsługi',
  description: 'Przeglądanie i zarządzanie wszystkimi zleceniami w systemie',

  sections: {
    overview: [
      {
        id: 'table',
        title: 'Tabela zleceń',
        content: (
          <div>
            <p className="mb-2">
              Główna tabela pokazuje wszystkie zlecenia z możliwością sortowania i filtrowania.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Kliknięcie w nagłówek kolumny</strong> - sortowanie rosnąco/malejąco</li>
              <li><strong>Kliknięcie w wiersz</strong> - otwiera szczegóły zlecenia</li>
              <li><strong>Kolorowe tło wiersza</strong> - oznacza specjalny status zlecenia</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'filters',
        title: 'Pasek filtrów',
        content: (
          <div>
            <p className="mb-2">
              Nad tabelą znajduje się pasek z filtrami i akcjami:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Wyszukiwarka</strong> - szukaj po numerze zlecenia, kliencie, kolorze</li>
              <li><strong>Filtry statusu</strong> - pokaż tylko zlecenia o określonym statusie</li>
              <li><strong>Filtr daty</strong> - zlecenia z określonego zakresu dat</li>
              <li><strong>Grupowanie</strong> - grupuj zlecenia po producencie, statusie lub dacie</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'columns',
        title: 'Ustawienia kolumn',
        content: (
          <div>
            <p className="mb-2">
              Możesz dostosować widoczność i kolejność kolumn:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Kliknij ikonę &quot;Kolumny&quot; w pasku narzędzi</li>
              <li>Zaznacz/odznacz kolumny do wyświetlenia</li>
              <li>Przeciągnij kolumny aby zmienić ich kolejność</li>
              <li>Użyj &quot;Resetuj&quot; aby przywrócić domyślne ustawienia</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'statuses',
        title: 'Statusy zleceń',
        content: (
          <div>
            <p className="mb-2">Zlecenia mogą mieć następujące statusy:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Nowe</strong> - zlecenie zostało utworzone</li>
              <li><strong>W produkcji</strong> - zlecenie jest realizowane</li>
              <li><strong>Gotowe</strong> - zlecenie jest gotowe do wysyłki</li>
              <li><strong>Wysłane</strong> - zlecenie zostało wysłane</li>
              <li><strong>NIE CIĄĆ</strong> - zlecenie wstrzymane (ręczny status)</li>
              <li><strong>Anulowane</strong> - zlecenie anulowane</li>
            </ul>
          </div>
        ),
      },
    ],

    howTo: [
      {
        id: 'search',
        title: 'Jak wyszukać zlecenie?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij w pole wyszukiwania (lupa)</li>
            <li>Wpisz numer zlecenia, nazwę klienta lub kolor</li>
            <li>Wyniki filtrują się automatycznie podczas pisania</li>
            <li>Aby wyczyścić wyszukiwanie, usuń tekst lub kliknij &quot;X&quot;</li>
          </ol>
        ),
      },
      {
        id: 'filter-status',
        title: 'Jak filtrować po statusie?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij rozwijalną listę &quot;Status&quot; w pasku filtrów</li>
            <li>Wybierz jeden lub więcej statusów</li>
            <li>Tabela pokaże tylko zlecenia o wybranych statusach</li>
            <li>Kliknij &quot;Wyczyść filtry&quot; aby pokazać wszystkie</li>
          </ol>
        ),
      },
      {
        id: 'edit-inline',
        title: 'Jak edytować zlecenie w tabeli?',
        content: (
          <div>
            <p className="mb-2">
              Niektóre pola można edytować bezpośrednio w tabeli (edycja inline):
            </p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Kliknij dwukrotnie w komórkę którą chcesz edytować</li>
              <li>Wprowadź nową wartość</li>
              <li>Naciśnij Enter aby zapisać lub Escape aby anulować</li>
              <li>Zmiany zapisują się automatycznie</li>
            </ol>
          </div>
        ),
      },
      {
        id: 'change-manual-status',
        title: 'Jak zmienić ręczny status (NIE CIĄĆ)?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Znajdź zlecenie w tabeli</li>
            <li>Kliknij w kolumnę &quot;Status ręczny&quot;</li>
            <li>Wybierz nowy status z listy rozwijanej</li>
            <li>Zmiana zapisze się automatycznie</li>
          </ol>
        ),
      },
      {
        id: 'export',
        title: 'Jak wyeksportować dane do CSV?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Opcjonalnie: ustaw filtry aby wyeksportować tylko wybrane zlecenia</li>
            <li>Kliknij przycisk &quot;Eksport CSV&quot; w pasku narzędzi</li>
            <li>Plik CSV zostanie pobrany automatycznie</li>
            <li>Otwórz plik w Excelu lub innym arkuszu kalkulacyjnym</li>
          </ol>
        ),
      },
      {
        id: 'group',
        title: 'Jak grupować zlecenia?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij przycisk &quot;Grupuj&quot; w pasku narzędzi</li>
            <li>Wybierz kryterium grupowania (producent, status, data)</li>
            <li>Zlecenia zostaną pogrupowane z nagłówkami sekcji</li>
            <li>Kliknij nagłówek grupy aby zwinąć/rozwinąć</li>
          </ol>
        ),
      },
    ],

    consequences: [
      {
        id: 'status-change-effect',
        title: 'Co się stanie po zmianie statusu ręcznego?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Status zostanie natychmiast zapisany</li>
            <li>Zlecenie może zmienić kolor w tabeli</li>
            <li>Status &quot;NIE CIĄĆ&quot; wstrzymuje produkcję zlecenia</li>
            <li>Status &quot;Anulowane&quot; usuwa zlecenie z aktywnych</li>
            <li>Zmiana jest widoczna dla wszystkich użytkowników</li>
          </ul>
        ),
      },
      {
        id: 'filter-effect',
        title: 'Co się stanie po zastosowaniu filtrów?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Tabela pokaże tylko pasujące zlecenia</li>
            <li>Podsumowanie (suma, średnia) będzie dotyczyło tylko widocznych zleceń</li>
            <li>Eksport CSV wyeksportuje tylko przefiltrowane dane</li>
            <li>Filtry są zapamiętywane do końca sesji</li>
          </ul>
        ),
      },
    ],

    faq: [
      {
        id: 'faq-not-found',
        title: 'Nie mogę znaleźć zlecenia - co robić?',
        content: (
          <div>
            <p className="mb-2">Sprawdź następujące rzeczy:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Wyczyść wszystkie filtry (przycisk &quot;Wyczyść filtry&quot;)</li>
              <li>Sprawdź czy nie masz aktywnego filtra dat</li>
              <li>Upewnij się że wpisujesz poprawny numer zlecenia</li>
              <li>Zlecenie mogło zostać anulowane - sprawdź filtr statusu</li>
            </ol>
          </div>
        ),
      },
      {
        id: 'faq-edit-disabled',
        title: 'Dlaczego nie mogę edytować niektórych pól?',
        content: (
          <p>
            Niektóre pola są tylko do odczytu i nie można ich edytować bezpośrednio.
            Dotyczy to pól importowanych z zewnętrznych systemów (np. numer zlecenia,
            dane klienta). Aby zmienić te dane, skontaktuj się z administratorem.
          </p>
        ),
      },
      {
        id: 'faq-colors',
        title: 'Co oznaczają kolory wierszy?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Czerwony</strong> - zlecenie z problemem lub anulowane</li>
            <li><strong>Żółty</strong> - zlecenie wstrzymane (NIE CIĄĆ)</li>
            <li><strong>Zielony</strong> - zlecenie gotowe do wysyłki</li>
            <li><strong>Szary</strong> - zlecenie wysłane lub zakończone</li>
          </ul>
        ),
      },
      {
        id: 'faq-refresh',
        title: 'Jak odświeżyć dane w tabeli?',
        content: (
          <p>
            Dane odświeżają się automatycznie co kilka sekund. Możesz też kliknąć
            przycisk odświeżania (ikona strzałek) w pasku narzędzi lub nacisnąć F5
            na klawiaturze.
          </p>
        ),
      },
    ],
  },
};
