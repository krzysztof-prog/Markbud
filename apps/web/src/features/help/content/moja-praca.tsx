/**
 * Instrukcja obsługi - Moja Praca
 */

import type { HelpContent } from '../types';

export const mojaPracaHelp: HelpContent = {
  pageId: 'moja-praca',
  pageTitle: 'Moja Praca - Instrukcja obsługi',
  description: 'Osobisty dashboard z zadaniami, konfliktami i przeglądem dnia',

  sections: {
    overview: [
      {
        id: 'header',
        title: 'Nagłówek i wybór daty',
        content: (
          <div>
            <p className="mb-2">
              Na górze strony znajduje się:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Tytuł strony</strong> - &quot;Moja Praca&quot;</li>
              <li><strong>Selektor daty</strong> - kliknij aby wybrać dzień</li>
              <li>Domyślnie pokazuje dzisiejszy dzień</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'summary-cards',
        title: 'Karty podsumowania',
        content: (
          <div>
            <p className="mb-2">
              4 karty pokazują szybkie podsumowanie:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Konflikty</strong> - liczba konfliktów wymagających rozwiązania</li>
              <li><strong>Zlecenia</strong> - liczba Twoich zleceń na wybrany dzień</li>
              <li><strong>Dostawy</strong> - liczba dostaw zaplanowanych na ten dzień</li>
              <li><strong>Zamówienia szyb</strong> - liczba zamówień szyb</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'tabs',
        title: 'Zakładki szczegółów',
        content: (
          <div>
            <p className="mb-2">
              Pod kartami znajdują się 4 zakładki:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Konflikty</strong> - lista konfliktów importu do rozwiązania</li>
              <li><strong>Zlecenia</strong> - Twoje zlecenia na wybrany dzień</li>
              <li><strong>Dostawy</strong> - dostawy zaplanowane na wybrany dzień</li>
              <li><strong>Szyby</strong> - zamówienia szyb na wybrany dzień</li>
            </ul>
            <p className="mt-2">
              Badge z liczbą przy zakładce &quot;Konflikty&quot; pokazuje ile wymaga uwagi.
            </p>
          </div>
        ),
      },
      {
        id: 'conflicts',
        title: 'Co to są konflikty?',
        content: (
          <div>
            <p className="mb-2">
              Konflikty powstają gdy system wykryje rozbieżności podczas importu danych:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Zduplikowany numer zlecenia</li>
              <li>Niezgodność danych między systemami</li>
              <li>Brakujące powiązania (np. nieznany klient)</li>
              <li>Błędy walidacji danych</li>
            </ul>
            <p className="mt-2">
              Konflikty wymagają ręcznego rozwiązania - sprawdź i wybierz poprawną opcję.
            </p>
          </div>
        ),
      },
    ],

    howTo: [
      {
        id: 'change-date',
        title: 'Jak zmienić wyświetlany dzień?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij przycisk z datą w nagłówku strony</li>
            <li>Otworzy się kalendarz (popover)</li>
            <li>Kliknij w wybrany dzień</li>
            <li>Strona odświeży się pokazując dane dla nowej daty</li>
          </ol>
        ),
      },
      {
        id: 'resolve-conflict',
        title: 'Jak rozwiązać konflikt?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Przejdź do zakładki &quot;Konflikty&quot;</li>
            <li>Kliknij w konflikt na liście</li>
            <li>Otworzy się modal ze szczegółami</li>
            <li>Przeczytaj opis konfliktu</li>
            <li>Wybierz jedną z dostępnych opcji rozwiązania</li>
            <li>Kliknij &quot;Rozwiąż&quot; aby zatwierdzić</li>
          </ol>
        ),
      },
      {
        id: 'view-order-details',
        title: 'Jak zobaczyć szczegóły zlecenia?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Przejdź do zakładki &quot;Zlecenia&quot;</li>
            <li>Znajdź zlecenie na liście</li>
            <li>Kliknij w wiersz ze zleceniem</li>
            <li>Otworzy się modal ze wszystkimi szczegółami</li>
          </ol>
        ),
      },
      {
        id: 'check-deliveries',
        title: 'Jak sprawdzić dzisiejsze dostawy?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Upewnij się że wybrana jest dzisiejsza data</li>
            <li>Sprawdź kartę &quot;Dostawy&quot; - liczba pokazuje ile dostaw</li>
            <li>Przejdź do zakładki &quot;Dostawy&quot; po szczegóły</li>
            <li>Lista pokazuje wszystkie dostawy z godzinami i pozycjami</li>
          </ol>
        ),
      },
      {
        id: 'navigate-to-detail',
        title: 'Jak przejść do pełnej strony funkcjonalności?',
        content: (
          <div>
            <p className="mb-2">
              Z &quot;Moja Praca&quot; możesz przejść do szczegółowych widoków:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Kliknij nagłówek karty lub &quot;Zobacz wszystkie&quot;</li>
              <li>Zostaniesz przekierowany do odpowiedniej strony</li>
              <li>Np. kliknięcie &quot;Zlecenia&quot; przeniesie do pełnej tabeli zleceń</li>
            </ul>
          </div>
        ),
      },
    ],

    consequences: [
      {
        id: 'resolve-conflict-effect',
        title: 'Co się stanie po rozwiązaniu konfliktu?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Konflikt zniknie z listy</li>
            <li>Dane zostaną zaktualizowane zgodnie z Twoim wyborem</li>
            <li>Licznik konfliktów na karcie zmniejszy się</li>
            <li>Operacja zostanie zapisana w historii</li>
            <li>Niektóre rozwiązania są nieodwracalne - czytaj opisy uważnie!</li>
          </ul>
        ),
      },
      {
        id: 'ignore-conflict-effect',
        title: 'Co jeśli zignoruję konflikt?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Konflikt pozostanie na liście</li>
            <li>Dane których dotyczy mogą być niekompletne</li>
            <li>Niektóre funkcje mogą nie działać prawidłowo</li>
            <li>Konflikt może się &quot;przedawnić&quot; po kilku dniach</li>
            <li>Zalecamy rozwiązywanie konfliktów jak najszybciej</li>
          </ul>
        ),
      },
    ],

    faq: [
      {
        id: 'faq-empty',
        title: 'Dlaczego strona jest pusta?',
        content: (
          <div>
            <p className="mb-2">Strona może być pusta z kilku powodów:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Wybrana data nie ma żadnych zleceń/dostaw</li>
              <li>Nie masz przypisanych zadań na ten dzień</li>
              <li>Wszystkie konflikty zostały już rozwiązane</li>
            </ul>
            <p className="mt-2">Spróbuj wybrać inną datę lub sprawdź inne zakładki.</p>
          </div>
        ),
      },
      {
        id: 'faq-badge',
        title: 'Co oznacza czerwony badge przy Konfliktach?',
        content: (
          <p>
            Badge pokazuje liczbę konfliktów wymagających Twojej uwagi.
            Czerwony kolor oznacza pilność. Konflikty powinny być rozwiązywane
            jak najszybciej, ponieważ mogą blokować inne operacje w systemie.
          </p>
        ),
      },
      {
        id: 'faq-orders-not-mine',
        title: 'Widzę zlecenia które nie są moje - dlaczego?',
        content: (
          <p>
            Jeśli masz rolę kierownika lub administratora, możesz widzieć zlecenia
            wszystkich pracowników. Operatorzy widzą tylko swoje zlecenia.
            Skontaktuj się z administratorem jeśli uważasz że widzisz błędne dane.
          </p>
        ),
      },
      {
        id: 'faq-realtime',
        title: 'Czy dane odświeżają się automatycznie?',
        content: (
          <p>
            Tak, liczba konfliktów i karty podsumowania odświeżają się automatycznie
            co kilka sekund. Listy w zakładkach odświeżają się przy przełączaniu
            zakładek lub po kliknięciu przycisku odświeżania.
          </p>
        ),
      },
    ],
  },
};
