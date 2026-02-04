/**
 * Treść instrukcji dla strony Kierownik (Panel Kierownika)
 */

import type { HelpContent } from '../types';

export const kierownikHelpContent: HelpContent = {
  pageId: 'kierownik',
  pageTitle: 'Panel Kierownika - Instrukcja obsługi',
  description: 'Zarządzanie produkcją, zleceniami i pracownikami',
  sections: {
    overview: [
      {
        id: 'dashboard-overview',
        title: 'Przegląd dashboardu',
        content: (
          <div className="space-y-2">
            <p><strong>Kalendarz produkcji</strong> - widok tygodniowy/miesięczny zleceń</p>
            <p><strong>Statystyki</strong> - liczba zleceń, wartość, postęp</p>
            <p><strong>Alerty</strong> - ostrzeżenia wymagające uwagi</p>
            <p><strong>Szybkie akcje</strong> - najczęściej używane operacje</p>
          </div>
        ),
      },
      {
        id: 'calendar-colors',
        title: 'Kolory w kalendarzu',
        content: (
          <div className="space-y-2">
            <p><strong className="text-green-600">Zielony</strong> - zlecenie ukończone</p>
            <p><strong className="text-blue-600">Niebieski</strong> - w produkcji</p>
            <p><strong className="text-yellow-600">Żółty</strong> - oczekuje na materiały</p>
            <p><strong className="text-red-600">Czerwony</strong> - opóźnione / problem</p>
            <p><strong className="text-gray-600">Szary</strong> - zaplanowane</p>
          </div>
        ),
      },
      {
        id: 'alerts-section',
        title: 'Sekcja alertów',
        content: (
          <p>
            W górnej części ekranu wyświetlają się alerty wymagające uwagi:
            brakujące materiały, opóźnione dostawy, konflikty w harmonogramie.
            Kliknij alert aby przejść do szczegółów problemu.
          </p>
        ),
      },
    ],
    howTo: [
      {
        id: 'assign-orders',
        title: 'Przypisanie zleceń do dnia produkcji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Znajdź zlecenie w panelu bocznym (lista nieprzypisanych)</li>
            <li>Przeciągnij zlecenie na odpowiedni dzień w kalendarzu</li>
            <li>Lub kliknij zlecenie → "Przypisz" → wybierz datę</li>
            <li>System sprawdzi dostępność materiałów i pracowników</li>
            <li>Potwierdź przypisanie</li>
          </ol>
        ),
      },
      {
        id: 'change-priority',
        title: 'Zmiana priorytetu zlecenia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij na zlecenie w kalendarzu</li>
            <li>W oknie szczegółów kliknij "Priorytet"</li>
            <li>Wybierz nowy priorytet (Niski / Normalny / Wysoki / Pilne)</li>
            <li>Zapisz zmiany</li>
          </ol>
        ),
      },
      {
        id: 'view-worker-load',
        title: 'Sprawdzenie obciążenia pracowników',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Przejdź do widoku "Obciążenie" (górne menu)</li>
            <li>Wybierz zakres dat</li>
            <li>Zobacz wykres obciążenia każdego pracownika</li>
            <li>Czerwone pola = przekroczone możliwości</li>
          </ol>
        ),
      },
      {
        id: 'export-report',
        title: 'Eksport raportu produkcji',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Raporty" w górnym menu</li>
            <li>Wybierz typ raportu (dzienny / tygodniowy / miesięczny)</li>
            <li>Ustaw zakres dat</li>
            <li>Kliknij "Generuj PDF" lub "Eksportuj Excel"</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'assign-consequence',
        title: 'Przypisanie zlecenia do dnia',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Zlecenie pojawi się w harmonogramie produkcji</li>
              <li>Pracownicy zobaczą zlecenie na swoich listach</li>
              <li>System zarezerwuje potrzebne materiały</li>
              <li>Klient może dostać powiadomienie o terminie</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'priority-consequence',
        title: 'Zmiana priorytetu',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Zlecenie przesunie się w kolejce produkcji</li>
              <li>Wysoki priorytet = pierwsze w kolejce</li>
              <li>Może wpłynąć na terminy innych zleceń</li>
            </ul>
            <p className="text-orange-600 mt-2">
              ⚠️ Zmiana priorytetu może opóźnić inne zlecenia
            </p>
          </div>
        ),
      },
      {
        id: 'reschedule-consequence',
        title: 'Przesunięcie terminu',
        content: (
          <div className="space-y-2">
            <p><strong>Co się zmieni:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Nowy termin zostanie zapisany</li>
              <li>Poprzedni termin zachowany w historii</li>
              <li>Powiadomienie dla klienta (jeśli włączone)</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-overload',
        title: 'Co robić gdy dzień jest przeciążony?',
        content: (
          <p>
            Przesuń część zleceń na inne dni lub zmień priorytety. System
            pokazuje czerwonym kolorem dni z przekroczonym obciążeniem.
            Możesz też zwiększyć dostępność pracowników na dany dzień.
          </p>
        ),
      },
      {
        id: 'faq-missing-materials',
        title: 'Zlecenie pokazuje brak materiałów - co robić?',
        content: (
          <p>
            Sprawdź w zakładce "Materiały" czego brakuje. Możesz: 1) Zamówić
            brakujące materiały, 2) Przesunąć zlecenie na dzień po dostawie,
            3) Użyć zamienników (jeśli dostępne).
          </p>
        ),
      },
      {
        id: 'faq-urgent',
        title: 'Jak oznaczyć zlecenie jako pilne?',
        content: (
          <p>
            Kliknij na zlecenie → Priorytet → "Pilne". Zlecenie zostanie
            oznaczone czerwoną flagą i przesunięte na początek kolejki.
            Pracownicy dostaną powiadomienie o pilnym zleceniu.
          </p>
        ),
      },
      {
        id: 'faq-history',
        title: 'Gdzie znajdę historię zmian zlecenia?',
        content: (
          <p>
            Kliknij na zlecenie → zakładka "Historia". Zobaczysz wszystkie
            zmiany: kto, kiedy i co zmienił. Możesz też przywrócić poprzedni
            stan (w ciągu 24h).
          </p>
        ),
      },
    ],
  },
};
