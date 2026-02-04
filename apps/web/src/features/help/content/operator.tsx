/**
 * Treść instrukcji dla strony Operator (Panel Operatora)
 */

import type { HelpContent } from '../types';

export const operatorHelpContent: HelpContent = {
  pageId: 'operator',
  pageTitle: 'Panel Operatora - Instrukcja obsługi',
  description: 'Wykonywanie zleceń produkcyjnych i raportowanie postępu',
  sections: {
    overview: [
      {
        id: 'operator-dashboard',
        title: 'Przegląd panelu',
        content: (
          <div className="space-y-2">
            <p><strong>Moje zlecenia</strong> - lista przypisanych zleceń na dziś</p>
            <p><strong>W trakcie</strong> - aktualnie wykonywane zlecenie</p>
            <p><strong>Ukończone</strong> - zrealizowane zlecenia z dzisiejszego dnia</p>
            <p><strong>Statystyki</strong> - podsumowanie wydajności</p>
          </div>
        ),
      },
      {
        id: 'order-card',
        title: 'Karta zlecenia',
        content: (
          <div className="space-y-2">
            <p><strong>Numer zlecenia</strong> - unikalny identyfikator</p>
            <p><strong>Klient</strong> - nazwa klienta</p>
            <p><strong>Profil</strong> - typ profilu do produkcji</p>
            <p><strong>Ilość</strong> - liczba elementów do wyprodukowania</p>
            <p><strong>Priorytet</strong> - pilność zlecenia (flaga)</p>
            <p><strong>Uwagi</strong> - dodatkowe informacje od kierownika</p>
          </div>
        ),
      },
      {
        id: 'status-colors',
        title: 'Kolory statusów',
        content: (
          <div className="space-y-2">
            <p><strong className="text-gray-600">Szary</strong> - oczekuje na start</p>
            <p><strong className="text-blue-600">Niebieski</strong> - w trakcie produkcji</p>
            <p><strong className="text-yellow-600">Żółty</strong> - wstrzymane (problem)</p>
            <p><strong className="text-green-600">Zielony</strong> - ukończone</p>
          </div>
        ),
      },
    ],
    howTo: [
      {
        id: 'start-order',
        title: 'Rozpoczęcie zlecenia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź zlecenie na liście "Moje zlecenia"</li>
            <li>Kliknij przycisk "Rozpocznij" (zielony)</li>
            <li>System zarejestruje czas startu</li>
            <li>Zlecenie przejdzie do sekcji "W trakcie"</li>
          </ol>
        ),
      },
      {
        id: 'complete-order',
        title: 'Zakończenie zlecenia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Po ukończeniu produkcji kliknij "Zakończ"</li>
            <li>Podaj faktyczną ilość wyprodukowanych elementów</li>
            <li>Jeśli różni się od planowanej - dodaj komentarz</li>
            <li>Kliknij "Potwierdź zakończenie"</li>
          </ol>
        ),
      },
      {
        id: 'report-problem',
        title: 'Zgłoszenie problemu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Zgłoś problem" przy zleceniu</li>
            <li>Wybierz typ problemu (brak materiału, awaria, itp.)</li>
            <li>Opisz problem w polu tekstowym</li>
            <li>Kliknij "Wyślij" - kierownik dostanie powiadomienie</li>
          </ol>
        ),
      },
      {
        id: 'pause-order',
        title: 'Wstrzymanie zlecenia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Wstrzymaj" przy aktywnym zleceniu</li>
            <li>Podaj powód wstrzymania</li>
            <li>Zlecenie zmieni kolor na żółty</li>
            <li>Aby wznowić - kliknij "Wznów"</li>
          </ol>
        ),
      },
      {
        id: 'scan-label',
        title: 'Skanowanie etykiety',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij ikonę skanera lub użyj skrótu Ctrl+S</li>
            <li>Zeskanuj kod kreskowy z etykiety</li>
            <li>System automatycznie znajdzie zlecenie</li>
            <li>Potwierdź że to właściwe zlecenie</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'start-consequence',
        title: 'Rozpoczęcie zlecenia',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Czas startu zostanie zapisany</li>
              <li>Zlecenie zniknie z listy dostępnych</li>
              <li>Kierownik zobaczy że pracujesz nad zleceniem</li>
              <li>Materiały zostaną zarezerwowane</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'complete-consequence',
        title: 'Zakończenie zlecenia',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Czas zakończenia zostanie zapisany</li>
              <li>Zlecenie przejdzie do "Ukończone"</li>
              <li>Statystyki wydajności zostaną zaktualizowane</li>
              <li>Kierownik dostanie powiadomienie</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'problem-consequence',
        title: 'Zgłoszenie problemu',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Kierownik dostanie natychmiastowe powiadomienie</li>
              <li>Zlecenie zostanie oznaczone jako "Problem"</li>
              <li>Czas wstrzymania będzie liczony osobno</li>
            </ul>
            <p className="text-blue-600 mt-2">
              💡 Nie bój się zgłaszać problemów - to pomaga unikać błędów
            </p>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-wrong-order',
        title: 'Rozpocząłem złe zlecenie - co robić?',
        content: (
          <p>
            Kliknij "Anuluj start" w ciągu 5 minut od rozpoczęcia. Po tym
            czasie skontaktuj się z kierownikiem aby cofnął operację.
          </p>
        ),
      },
      {
        id: 'faq-different-quantity',
        title: 'Wyprodukowałem inną ilość niż w zleceniu',
        content: (
          <p>
            Przy zakończeniu zlecenia podaj faktyczną ilość. System automatycznie
            odnotuje różnicę. Dodaj komentarz wyjaśniający przyczynę (np. wadliwy
            materiał, błąd w specyfikacji).
          </p>
        ),
      },
      {
        id: 'faq-no-orders',
        title: 'Nie widzę żadnych zleceń na liście',
        content: (
          <p>
            Oznacza to że nie masz przypisanych zleceń na dzisiejszy dzień.
            Skontaktuj się z kierownikiem lub sprawdź czy jesteś zalogowany
            na właściwe konto.
          </p>
        ),
      },
      {
        id: 'faq-break',
        title: 'Jak oznaczyć przerwę?',
        content: (
          <p>
            Kliknij "Przerwa" w górnym menu. System wstrzyma liczenie czasu
            dla aktywnego zlecenia. Po powrocie kliknij "Wznów pracę".
          </p>
        ),
      },
    ],
  },
};
