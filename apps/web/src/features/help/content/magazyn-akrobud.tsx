/**
 * Instrukcja obsługi - Magazyn AKROBUD
 */

import type { HelpContent } from '../types';

export const magazynAkrobudHelp: HelpContent = {
  pageId: 'magazyn-akrobud',
  pageTitle: 'Magazyn AKROBUD - Instrukcja obsługi',
  description: 'Zarządzanie stanami magazynowymi profili aluminiowych',

  sections: {
    overview: [
      {
        id: 'sidebar',
        title: 'Lista kolorów (panel boczny)',
        content: (
          <div>
            <p className="mb-2">
              Po lewej stronie znajduje się lista wszystkich kolorów profili:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Kolory typowe</strong> - najczęściej używane, standardowe kolory</li>
              <li><strong>Kolory atypowe</strong> - kolory specjalne, nietypowe</li>
              <li>Kliknij w kolor aby zobaczyć jego stany i zlecenia</li>
              <li>Aktywny kolor jest podświetlony</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'tabs',
        title: 'Zakładki główne',
        content: (
          <div>
            <p className="mb-2">
              Po wybraniu koloru dostępne są 3 zakładki:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Zlecenia</strong> - lista zleceń używających tego koloru</li>
              <li><strong>Magazyn</strong> - aktualny stan magazynowy (ilości profili)</li>
              <li><strong>Historia</strong> - historia wszystkich operacji na tym kolorze</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'stock-table',
        title: 'Tabela stanów magazynowych',
        content: (
          <div>
            <p className="mb-2">
              W zakładce &quot;Magazyn&quot; widzisz aktualne stany:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Profil</strong> - nazwa/numer profilu</li>
              <li><strong>Rozmiar</strong> - wymiary profilu</li>
              <li><strong>Ilość</strong> - aktualna ilość na stanie</li>
              <li><strong>Jednostka</strong> - metry bieżące (mb) lub sztuki</li>
              <li>Czerwona wartość oznacza niski stan</li>
            </ul>
          </div>
        ),
      },
    ],

    howTo: [
      {
        id: 'check-stock',
        title: 'Jak sprawdzić stan magazynowy koloru?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Znajdź kolor na liście po lewej stronie</li>
            <li>Kliknij w wybrany kolor</li>
            <li>Przejdź do zakładki &quot;Magazyn&quot;</li>
            <li>Zobaczysz tabelę z wszystkimi profilami i ich ilościami</li>
          </ol>
        ),
      },
      {
        id: 'check-orders',
        title: 'Jak zobaczyć zlecenia dla koloru?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Wybierz kolor z listy po lewej</li>
            <li>Przejdź do zakładki &quot;Zlecenia&quot;</li>
            <li>Zobaczysz listę wszystkich zleceń używających tego koloru</li>
            <li>Kliknij w zlecenie aby zobaczyć szczegóły</li>
          </ol>
        ),
      },
      {
        id: 'check-history',
        title: 'Jak sprawdzić historię zmian?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Wybierz kolor z listy</li>
            <li>Przejdź do zakładki &quot;Historia&quot;</li>
            <li>Zobaczysz chronologiczną listę wszystkich operacji</li>
            <li>Każdy wpis zawiera datę, typ operacji i ilość</li>
          </ol>
        ),
      },
      {
        id: 'remanent',
        title: 'Jak wykonać remanent (inwentaryzację)?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij przycisk &quot;Wykonaj remanent&quot; w górnej części strony</li>
            <li>Zostaniesz przekierowany do formularza remanentu</li>
            <li>Wprowadź rzeczywiste stany dla każdego profilu</li>
            <li>System automatycznie obliczy różnice</li>
            <li>Zatwierdź remanent aby zaktualizować stany</li>
          </ol>
        ),
      },
      {
        id: 'search-color',
        title: 'Jak szybko znaleźć kolor?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Użyj pola wyszukiwania nad listą kolorów</li>
            <li>Wpisz nazwę lub kod koloru</li>
            <li>Lista przefiltruje się automatycznie</li>
            <li>Kliknij w znaleziony kolor</li>
          </ol>
        ),
      },
    ],

    consequences: [
      {
        id: 'remanent-effect',
        title: 'Co się stanie po zatwierdzeniu remanentu?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Stany magazynowe zostaną zaktualizowane do wprowadzonych wartości</li>
            <li>Różnice (nadwyżki/braki) zostaną zapisane w historii</li>
            <li>Zostanie utworzony wpis &quot;Korekta remanentowa&quot; w historii</li>
            <li>Data ostatniego remanentu zostanie zaktualizowana</li>
            <li>Operacja jest nieodwracalna - zachowaj ostrożność!</li>
          </ul>
        ),
      },
      {
        id: 'order-effect',
        title: 'Jak zlecenia wpływają na stany?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Nowe zlecenie rezerwuje materiał (planowane zużycie)</li>
            <li>Rozpoczęcie produkcji zmniejsza stan magazynowy</li>
            <li>Anulowanie zlecenia zwalnia rezerwację</li>
            <li>Wszystkie zmiany są zapisywane w historii</li>
          </ul>
        ),
      },
    ],

    faq: [
      {
        id: 'faq-low-stock',
        title: 'Co oznacza czerwona wartość w stanie?',
        content: (
          <p>
            Czerwona wartość oznacza że stan magazynowy jest poniżej minimalnego
            poziomu bezpieczeństwa. Należy rozważyć zamówienie materiału u dostawcy.
            Próg ostrzeżenia można ustawić w ustawieniach systemu.
          </p>
        ),
      },
      {
        id: 'faq-negative',
        title: 'Dlaczego stan jest ujemny?',
        content: (
          <p>
            Ujemny stan może oznaczać że wydano więcej materiału niż było na stanie
            (np. pominięto przyjęcie dostawy). Wykonaj remanent aby skorygować stan
            lub sprawdź czy wszystkie dostawy zostały prawidłowo zarejestrowane.
          </p>
        ),
      },
      {
        id: 'faq-difference',
        title: 'Czym różni się kolor typowy od atypowego?',
        content: (
          <div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Typowe</strong> - standardowe kolory, zawsze na stanie, krótki czas realizacji</li>
              <li><strong>Atypowe</strong> - kolory specjalne, zamawiane na zlecenie, dłuższy czas realizacji</li>
            </ul>
            <p className="mt-2">
              Podział wpływa na planowanie produkcji i zamówienia materiałów.
            </p>
          </div>
        ),
      },
      {
        id: 'faq-history-delete',
        title: 'Czy mogę usunąć wpis z historii?',
        content: (
          <p>
            Nie, historia jest niemodyfikowalna ze względów bezpieczeństwa i audytu.
            Jeśli wpis jest błędny, wykonaj operację korygującą (np. remanent)
            która doda nowy wpis z prawidłowymi wartościami.
          </p>
        ),
      },
    ],
  },
};
