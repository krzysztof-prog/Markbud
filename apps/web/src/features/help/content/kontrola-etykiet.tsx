/**
 * Treść instrukcji dla strony Kontrola Etykiet
 */

import type { HelpContent } from '../types';

export const kontrolaEtykietHelpContent: HelpContent = {
  pageId: 'kontrola-etykiet',
  pageTitle: 'Kontrola Etykiet - Instrukcja obsługi',
  description: 'Sprawdzanie i weryfikacja etykiet na produktach',
  sections: {
    overview: [
      {
        id: 'label-check-purpose',
        title: 'Cel kontroli etykiet',
        content: (
          <p>
            Kontrola etykiet zapewnia że wszystkie produkty są prawidłowo
            oznakowane przed wysyłką. Sprawdza zgodność etykiet z zamówieniem,
            czytelność kodów i poprawność danych.
          </p>
        ),
      },
      {
        id: 'check-status',
        title: 'Statusy kontroli',
        content: (
          <div className="space-y-2">
            <p><strong className="text-gray-600">Oczekuje</strong> - czeka na kontrolę</p>
            <p><strong className="text-blue-600">W trakcie</strong> - kontrola trwa</p>
            <p><strong className="text-green-600">OK</strong> - etykiety prawidłowe</p>
            <p><strong className="text-yellow-600">Do poprawy</strong> - wykryto błędy</p>
            <p><strong className="text-red-600">Brak etykiet</strong> - wymaga naklejenia</p>
          </div>
        ),
      },
      {
        id: 'check-list',
        title: 'Co sprawdzamy',
        content: (
          <div className="space-y-2">
            <ul className="list-disc list-inside">
              <li>Numer zlecenia na etykiecie</li>
              <li>Nazwa klienta</li>
              <li>Typ i kolor profilu</li>
              <li>Ilość w paczce</li>
              <li>Kod kreskowy (czytelność)</li>
              <li>Data produkcji</li>
            </ul>
          </div>
        ),
      },
    ],
    howTo: [
      {
        id: 'start-check',
        title: 'Rozpoczęcie kontroli',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Wybierz dostawę z listy "Do kontroli"</li>
            <li>Kliknij "Rozpocznij kontrolę"</li>
            <li>System wyświetli listę produktów do sprawdzenia</li>
            <li>Weź fizycznie produkt i sprawdź etykietę</li>
          </ol>
        ),
      },
      {
        id: 'scan-label',
        title: 'Skanowanie etykiety',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Ustaw kursor w polu skanera</li>
            <li>Zeskanuj kod kreskowy z etykiety</li>
            <li>System porówna z danymi w systemie</li>
            <li>Zielone = zgodne, Czerwone = niezgodne</li>
          </ol>
        ),
      },
      {
        id: 'report-issue',
        title: 'Zgłoszenie problemu z etykietą',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Zgłoś problem" przy pozycji</li>
            <li>Wybierz typ problemu:</li>
            <li className="ml-4">- Brak etykiety</li>
            <li className="ml-4">- Błędne dane</li>
            <li className="ml-4">- Nieczytelny kod</li>
            <li className="ml-4">- Uszkodzona etykieta</li>
            <li>Dodaj komentarz jeśli potrzebny</li>
            <li>Kliknij "Zapisz"</li>
          </ol>
        ),
      },
      {
        id: 'print-label',
        title: 'Drukowanie nowej etykiety',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Przy pozycji z problemem kliknij "Drukuj etykietę"</li>
            <li>Sprawdź podgląd etykiety</li>
            <li>Wybierz drukarkę etykiet</li>
            <li>Kliknij "Drukuj"</li>
            <li>Naklej nową etykietę i zeskanuj ponownie</li>
          </ol>
        ),
      },
      {
        id: 'complete-check',
        title: 'Zakończenie kontroli',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Sprawdź wszystkie pozycje na liście</li>
            <li>Upewnij się że wszystkie są "OK"</li>
            <li>Kliknij "Zakończ kontrolę"</li>
            <li>System oznaczy dostawę jako gotową do wysyłki</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'ok-consequence',
        title: 'Etykieta OK',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Pozycja oznaczona jako zweryfikowana</li>
              <li>Produkt gotowy do wysyłki</li>
              <li>Śledzenie przesyłki będzie możliwe</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'issue-consequence',
        title: 'Problem z etykietą',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Pozycja zablokowana do wysyłki</li>
              <li>Powiadomienie dla osoby odpowiedzialnej</li>
              <li>Wymaga naprawy przed kontynuacją</li>
            </ul>
            <p className="text-orange-600 mt-2">
              ⚠️ Dostawa nie zostanie wysłana dopóki wszystkie etykiety nie będą OK
            </p>
          </div>
        ),
      },
      {
        id: 'complete-consequence',
        title: 'Zakończenie kontroli',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Dostawa przechodzi do statusu "Gotowa do wysyłki"</li>
              <li>Kierowca może załadować towar</li>
              <li>Generowany list przewozowy</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-no-scanner',
        title: 'Skaner nie działa - co robić?',
        content: (
          <p>
            Możesz wpisać kod ręcznie w pole tekstowe. Sprawdź też czy skaner
            jest podłączony i czy nie wymaga naładowania. W razie problemów
            technicznych skontaktuj się z IT.
          </p>
        ),
      },
      {
        id: 'faq-wrong-data',
        title: 'Etykieta ma błędne dane - skąd to się wzięło?',
        content: (
          <p>
            Błędne dane mogą wynikać z błędu przy wprowadzaniu zlecenia lub
            zmiany w systemie po wydrukowaniu etykiety. Wydrukuj nową etykietę
            z aktualnymi danymi i naklej na produkcie.
          </p>
        ),
      },
      {
        id: 'faq-damaged-label',
        title: 'Etykieta jest uszkodzona ale czytelna',
        content: (
          <p>
            Jeśli kod kreskowy skanuje się poprawnie i dane są czytelne,
            możesz oznaczyć jako OK. Jeśli masz wątpliwości - wydrukuj nową
            etykietę dla pewności.
          </p>
        ),
      },
      {
        id: 'faq-multiple-labels',
        title: 'Produkt ma kilka etykiet - która jest właściwa?',
        content: (
          <p>
            Właściwa jest etykieta z kodem AKROBUD (zaczyna się od AKR-).
            Inne etykiety (np. producenta) mogą pozostać. W razie wątpliwości
            skonsultuj z kierownikiem.
          </p>
        ),
      },
    ],
  },
};
