/**
 * Treść instrukcji dla strony Szyby
 */

import type { HelpContent } from '../types';

export const szybyHelpContent: HelpContent = {
  pageId: 'szyby',
  pageTitle: 'Szyby - Instrukcja obsługi',
  description: 'Zarządzanie zamówieniami i dostawami szyb',
  sections: {
    overview: [
      {
        id: 'glass-overview',
        title: 'Przegląd modułu',
        content: (
          <div className="space-y-2">
            <p><strong>Zamówienia</strong> - lista zamówień szyb do producentów</p>
            <p><strong>Dostawy</strong> - śledzenie dostaw szyb</p>
            <p><strong>Kategorie</strong> - typy szyb i ich parametry</p>
            <p><strong>Statystyki</strong> - raporty i analizy</p>
          </div>
        ),
      },
      {
        id: 'order-status',
        title: 'Statusy zamówień',
        content: (
          <div className="space-y-2">
            <p><strong className="text-gray-600">Nowe</strong> - zamówienie utworzone</p>
            <p><strong className="text-blue-600">Wysłane</strong> - wysłane do producenta</p>
            <p><strong className="text-yellow-600">W produkcji</strong> - producent pracuje</p>
            <p><strong className="text-purple-600">W transporcie</strong> - w drodze</p>
            <p><strong className="text-green-600">Dostarczone</strong> - szyby przyjęte</p>
            <p><strong className="text-red-600">Problem</strong> - reklamacja/opóźnienie</p>
          </div>
        ),
      },
      {
        id: 'glass-types',
        title: 'Typy szyb',
        content: (
          <p>
            System obsługuje różne typy szyb: jednokomorowe, dwukomorowe,
            zespolone, hartowane, ornamentowe. Każdy typ ma określone parametry
            (Ug, grubość, kolor) które wpływają na cenę i termin dostawy.
          </p>
        ),
      },
    ],
    howTo: [
      {
        id: 'create-order',
        title: 'Tworzenie zamówienia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Nowe zamówienie"</li>
            <li>Wybierz producenta szyb</li>
            <li>Dodaj pozycje (wymiary, typ, ilość)</li>
            <li>Sprawdź podsumowanie i cenę</li>
            <li>Kliknij "Wyślij zamówienie"</li>
          </ol>
        ),
      },
      {
        id: 'add-position',
        title: 'Dodawanie pozycji do zamówienia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>W formularzu zamówienia kliknij "Dodaj szybę"</li>
            <li>Podaj wymiary: szerokość x wysokość (mm)</li>
            <li>Wybierz typ szyby z listy</li>
            <li>Podaj ilość sztuk</li>
            <li>Opcjonalnie dodaj uwagi (kształt, otwory)</li>
            <li>Kliknij "Dodaj" - pozycja pojawi się na liście</li>
          </ol>
        ),
      },
      {
        id: 'track-delivery',
        title: 'Śledzenie dostawy',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź zamówienie na liście</li>
            <li>Kliknij aby zobaczyć szczegóły</li>
            <li>Zakładka "Śledzenie" pokazuje aktualny status</li>
            <li>Przewidywana data dostawy jest widoczna na górze</li>
          </ol>
        ),
      },
      {
        id: 'receive-delivery',
        title: 'Przyjęcie dostawy szyb',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Gdy dostawa dotrze - kliknij "Przyjmij dostawę"</li>
            <li>Sprawdź każdą szybę fizycznie</li>
            <li>Oznacz pozycje jako OK lub Uszkodzone</li>
            <li>Dla uszkodzonych - dodaj opis i zdjęcie</li>
            <li>Kliknij "Zakończ przyjęcie"</li>
          </ol>
        ),
      },
      {
        id: 'report-damage',
        title: 'Zgłoszenie reklamacji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Przy uszkodzonej szybie kliknij "Reklamacja"</li>
            <li>Opisz problem (pęknięcie, wymiary, wada)</li>
            <li>Dodaj zdjęcia</li>
            <li>Wybierz czy chcesz wymianę czy zwrot</li>
            <li>Kliknij "Wyślij reklamację"</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'order-sent',
        title: 'Wysłanie zamówienia',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Zamówienie trafi do producenta</li>
              <li>Status zmieni się na "Wysłane"</li>
              <li>Pojawi się przewidywana data dostawy</li>
              <li>Zlecenia oczekujące na te szyby zostaną powiązane</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'delivery-received',
        title: 'Przyjęcie dostawy',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Szyby trafią do magazynu</li>
              <li>Zlecenia oczekujące zostaną odblokowane</li>
              <li>Status zamówienia zmieni się na "Dostarczone"</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'claim-filed',
        title: 'Zgłoszenie reklamacji',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Reklamacja wysłana do producenta</li>
              <li>Uszkodzona szyba oznaczona jako "Do wymiany"</li>
              <li>Zlecenie może być wstrzymane do wymiany</li>
              <li>Automatyczne zamówienie zastępcze (opcjonalnie)</li>
            </ul>
            <p className="text-orange-600 mt-2">
              ⚠️ Reklamacje wydłużają termin realizacji zleceń
            </p>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-lead-time',
        title: 'Jaki jest czas dostawy szyb?',
        content: (
          <p>
            Standardowy czas to 5-10 dni roboczych, zależnie od producenta
            i typu szyby. Szyby specjalne (hartowane, ornamentowe) mogą
            wymagać więcej czasu. System pokazuje szacowany termin przy
            składaniu zamówienia.
          </p>
        ),
      },
      {
        id: 'faq-dimensions',
        title: 'Jak podawać wymiary szyb?',
        content: (
          <p>
            Podawaj wymiary w milimetrach: szerokość x wysokość. Szerokość
            to wymiar poziomy, wysokość to pionowy. W przypadku szyb
            o niestandardowym kształcie dodaj rysunek w uwagach.
          </p>
        ),
      },
      {
        id: 'faq-urgent',
        title: 'Potrzebuję szyby pilnie - co robić?',
        content: (
          <p>
            Przy składaniu zamówienia zaznacz "Pilne". Wiąże się to z
            dodatkową opłatą ale skraca czas dostawy. Skontaktuj się też
            bezpośrednio z producentem aby potwierdzić możliwość ekspresowej
            realizacji.
          </p>
        ),
      },
      {
        id: 'faq-stock',
        title: 'Czy są szyby na magazynie?',
        content: (
          <p>
            Standardowe rozmiary mogą być dostępne od ręki - sprawdź
            zakładkę "Magazyn szyb". Szyby na wymiar zawsze wymagają
            zamówienia u producenta.
          </p>
        ),
      },
    ],
  },
};
