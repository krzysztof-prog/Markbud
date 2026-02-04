/**
 * Treść instrukcji dla strony Weryfikacja Dostaw
 */

import type { HelpContent } from '../types';

export const weryfikacjaHelpContent: HelpContent = {
  pageId: 'weryfikacja',
  pageTitle: 'Weryfikacja Dostaw - Instrukcja obsługi',
  description: 'Sprawdzanie i potwierdzanie zgodności dostaw z zamówieniami',
  sections: {
    overview: [
      {
        id: 'verification-purpose',
        title: 'Cel weryfikacji',
        content: (
          <p>
            Weryfikacja dostaw służy do sprawdzenia czy dostarczone materiały
            zgadzają się z zamówieniem. Porównuje ilości, profile i kolory
            z dokumentem dostawy.
          </p>
        ),
      },
      {
        id: 'verification-status',
        title: 'Statusy weryfikacji',
        content: (
          <div className="space-y-2">
            <p><strong className="text-gray-600">Do weryfikacji</strong> - oczekuje na sprawdzenie</p>
            <p><strong className="text-blue-600">W trakcie</strong> - weryfikacja rozpoczęta</p>
            <p><strong className="text-green-600">Zgodna</strong> - dostawa zgodna z zamówieniem</p>
            <p><strong className="text-yellow-600">Niezgodność</strong> - wykryto różnice</p>
            <p><strong className="text-red-600">Odrzucona</strong> - dostawa zwrócona do dostawcy</p>
          </div>
        ),
      },
      {
        id: 'verification-list',
        title: 'Lista pozycji do sprawdzenia',
        content: (
          <div className="space-y-2">
            <p>Każda pozycja dostawy wyświetla:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Nazwa profilu / materiału</li>
              <li>Ilość zamówiona vs dostarczona</li>
              <li>Kolor (jeśli dotyczy)</li>
              <li>Status weryfikacji</li>
            </ul>
          </div>
        ),
      },
    ],
    howTo: [
      {
        id: 'start-verification',
        title: 'Rozpoczęcie weryfikacji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź dostawę ze statusem "Do weryfikacji"</li>
            <li>Kliknij "Rozpocznij weryfikację"</li>
            <li>Weź dokument dostawy (WZ/faktura)</li>
            <li>Porównaj każdą pozycję z fizycznym towarem</li>
          </ol>
        ),
      },
      {
        id: 'confirm-item',
        title: 'Potwierdzenie pozycji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Sprawdź fizycznie ilość i jakość materiału</li>
            <li>Jeśli wszystko OK - kliknij zielony przycisk ✓</li>
            <li>Pozycja zmieni status na "Zweryfikowana"</li>
            <li>Przejdź do następnej pozycji</li>
          </ol>
        ),
      },
      {
        id: 'report-discrepancy',
        title: 'Zgłoszenie niezgodności',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij czerwony przycisk ✗ przy pozycji</li>
            <li>Wybierz typ niezgodności (ilość / jakość / brak)</li>
            <li>Podaj szczegóły (ile brakuje, co jest nie tak)</li>
            <li>Opcjonalnie dodaj zdjęcie</li>
            <li>Kliknij "Zapisz niezgodność"</li>
          </ol>
        ),
      },
      {
        id: 'complete-verification',
        title: 'Zakończenie weryfikacji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Sprawdź wszystkie pozycje na liście</li>
            <li>Kliknij "Zakończ weryfikację"</li>
            <li>System podsumuje: ile zgodnych, ile niezgodności</li>
            <li>Podpisz cyfrowo (lub fizycznie na dokumencie)</li>
            <li>Kliknij "Potwierdź i zamknij"</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'confirm-consequence',
        title: 'Potwierdzenie zgodności',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Materiał zostanie dodany do magazynu</li>
              <li>Stan magazynowy wzrośnie o dostarczoną ilość</li>
              <li>Zlecenia oczekujące na materiał zostaną odblokowane</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'discrepancy-consequence',
        title: 'Zgłoszenie niezgodności',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Tylko potwierdzona ilość trafi do magazynu</li>
              <li>Generowana reklamacja do dostawcy</li>
              <li>Kierownik dostanie powiadomienie</li>
              <li>Zamówienie uzupełniające może być utworzone</li>
            </ul>
            <p className="text-orange-600 mt-2">
              ⚠️ Niezgodność może opóźnić zlecenia zależne od tego materiału
            </p>
          </div>
        ),
      },
      {
        id: 'reject-consequence',
        title: 'Odrzucenie dostawy',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Cała dostawa zostanie oznaczona do zwrotu</li>
              <li>Żaden materiał nie trafi do magazynu</li>
              <li>Automatyczna reklamacja do dostawcy</li>
              <li>Zamówienie zastępcze zostanie utworzone</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-partial',
        title: 'Co jeśli dostawa jest częściowa?',
        content: (
          <p>
            Potwierdź tylko te pozycje które są zgodne. Dla brakujących pozycji
            zgłoś niezgodność typu "Brak w dostawie". System automatycznie
            utworzy zamówienie uzupełniające.
          </p>
        ),
      },
      {
        id: 'faq-wrong-color',
        title: 'Dostarczono inny kolor niż zamówiony',
        content: (
          <p>
            Zgłoś niezgodność typu "Błędny kolor". Podaj jaki kolor zamówiono
            i jaki dostarczono. Nie przyjmuj towaru jeśli kolor jest krytyczny
            dla zlecenia.
          </p>
        ),
      },
      {
        id: 'faq-damaged',
        title: 'Materiał jest uszkodzony - co robić?',
        content: (
          <p>
            Zgłoś niezgodność typu "Uszkodzenie". Zrób zdjęcie uszkodzenia.
            Nie przyjmuj uszkodzonego materiału - zostanie zwrócony do dostawcy.
          </p>
        ),
      },
      {
        id: 'faq-no-document',
        title: 'Brak dokumentu dostawy',
        content: (
          <p>
            Nie rozpoczynaj weryfikacji bez dokumentu WZ lub faktury. Skontaktuj
            się z kierowcą lub dostawcą aby uzyskać dokument. W pilnych
            przypadkach skonsultuj z kierownikiem.
          </p>
        ),
      },
    ],
  },
};
