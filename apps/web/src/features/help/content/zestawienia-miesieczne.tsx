/**
 * Treść instrukcji dla strony Zestawienia Miesięczne
 */

import type { HelpContent } from '../types';

export const zestawieniaMiesieczneHelpContent: HelpContent = {
  pageId: 'zestawienia-miesieczne',
  pageTitle: 'Zestawienia Miesięczne - Instrukcja obsługi',
  description: 'Raporty i podsumowania produkcji za dany miesiąc',
  sections: {
    overview: [
      {
        id: 'reports-overview',
        title: 'Przegląd zestawień',
        content: (
          <div className="space-y-2">
            <p><strong>Produkcja</strong> - ilość wyprodukowanych elementów</p>
            <p><strong>Wartość</strong> - suma wartości zleceń</p>
            <p><strong>Wydajność</strong> - porównanie z planem</p>
            <p><strong>Materiały</strong> - zużycie profili i innych materiałów</p>
            <p><strong>Klienci</strong> - zestawienie per klient</p>
          </div>
        ),
      },
      {
        id: 'period-selector',
        title: 'Wybór okresu',
        content: (
          <p>
            Użyj selektora w górnej części ekranu aby wybrać miesiąc i rok.
            Możesz też wybrać zakres niestandardowy (np. kwartał) klikając
            "Zakres własny". Dane są aktualizowane automatycznie.
          </p>
        ),
      },
      {
        id: 'charts',
        title: 'Wykresy i wizualizacje',
        content: (
          <div className="space-y-2">
            <p><strong>Wykres słupkowy</strong> - produkcja dzień po dniu</p>
            <p><strong>Wykres kołowy</strong> - podział per klient/system</p>
            <p><strong>Wykres liniowy</strong> - trend w czasie</p>
            <p>Kliknij na element wykresu aby zobaczyć szczegóły.</p>
          </div>
        ),
      },
    ],
    howTo: [
      {
        id: 'generate-report',
        title: 'Generowanie raportu',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Wybierz miesiąc z selektora</li>
            <li>Wybierz typ raportu (Produkcja / Wartość / Materiały)</li>
            <li>Opcjonalnie ustaw filtry (klient, system, operator)</li>
            <li>Kliknij "Generuj raport"</li>
            <li>Poczekaj na przetworzenie danych</li>
          </ol>
        ),
      },
      {
        id: 'export-pdf',
        title: 'Eksport do PDF',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Wygeneruj raport (jak powyżej)</li>
            <li>Kliknij przycisk "Eksportuj PDF"</li>
            <li>Wybierz co ma być zawarte (tabele, wykresy, podsumowanie)</li>
            <li>Kliknij "Pobierz PDF"</li>
          </ol>
        ),
      },
      {
        id: 'export-excel',
        title: 'Eksport do Excel',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Wygeneruj raport</li>
            <li>Kliknij "Eksportuj Excel"</li>
            <li>Plik .xlsx zostanie pobrany</li>
            <li>Otwórz w programie Excel do dalszej analizy</li>
          </ol>
        ),
      },
      {
        id: 'compare-periods',
        title: 'Porównanie okresów',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij "Porównaj" w górnym menu</li>
            <li>Wybierz okres bazowy (np. styczeń 2026)</li>
            <li>Wybierz okres porównawczy (np. styczeń 2025)</li>
            <li>System pokaże różnice procentowe i wartościowe</li>
          </ol>
        ),
      },
      {
        id: 'drill-down',
        title: 'Szczegóły zlecenia',
        content: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Kliknij na wiersz w tabeli raportu</li>
            <li>Lub kliknij na element wykresu</li>
            <li>Otworzy się panel z listą zleceń składających się na tę wartość</li>
            <li>Kliknij na zlecenie aby przejść do jego szczegółów</li>
          </ol>
        ),
      },
    ],
    consequences: [
      {
        id: 'report-generation',
        title: 'Generowanie raportu',
        content: (
          <div className="space-y-2">
            <p><strong>Co się dzieje:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>System agreguje dane z wybranego okresu</li>
              <li>Obliczane są sumy, średnie i trendy</li>
              <li>Raport jest cache'owany dla szybszego dostępu</li>
            </ul>
            <p className="text-blue-600 mt-2">
              💡 Pierwszy raport za dany miesiąc może trwać dłużej
            </p>
          </div>
        ),
      },
      {
        id: 'data-accuracy',
        title: 'Dokładność danych',
        content: (
          <div className="space-y-2">
            <p><strong>Ważne:</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>Dane są aktualne na moment generowania</li>
              <li>Zmiany w zleceniach wpłyną na kolejne raporty</li>
              <li>Archiwalne raporty (PDF) nie zmieniają się</li>
            </ul>
          </div>
        ),
      },
    ],
    faq: [
      {
        id: 'faq-incomplete',
        title: 'Raport pokazuje niepełne dane',
        content: (
          <p>
            Sprawdź czy wszystkie zlecenia z danego miesiąca zostały zamknięte.
            Zlecenia w statusie "W trakcie" mogą nie być uwzględnione w
            niektórych raportach. Skontaktuj się z kierownikiem jeśli brakuje
            konkretnych zleceń.
          </p>
        ),
      },
      {
        id: 'faq-different-totals',
        title: 'Suma nie zgadza się z moimi obliczeniami',
        content: (
          <p>
            System uwzględnia wszystkie zlecenia z danego okresu według daty
            zakończenia (nie daty utworzenia). Sprawdź też czy nie masz
            aktywnych filtrów które ograniczają dane.
          </p>
        ),
      },
      {
        id: 'faq-old-data',
        title: 'Jak zobaczyć raport z poprzedniego roku?',
        content: (
          <p>
            Użyj selektora roku obok wyboru miesiąca. Dane historyczne są
            dostępne od momentu wdrożenia systemu. Starsze dane mogą wymagać
            dłuższego czasu generowania.
          </p>
        ),
      },
      {
        id: 'faq-schedule',
        title: 'Czy można ustawić automatyczne raporty?',
        content: (
          <p>
            Tak, skontaktuj się z administratorem aby ustawić automatyczne
            generowanie raportów (np. na 1. dzień każdego miesiąca). Raporty
            będą wysyłane mailem na wskazane adresy.
          </p>
        ),
      },
    ],
  },
};
