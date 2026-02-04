/**
 * Instrukcja obsługi - Dostawy
 */

import type { HelpContent } from '../types';

export const dostawyHelp: HelpContent = {
  pageId: 'dostawy',
  pageTitle: 'Dostawy - Instrukcja obsługi',
  description: 'Zarządzanie dostawami okien i przypisywanie zleceń do dostaw',

  sections: {
    overview: [
      {
        id: 'calendar',
        title: 'Kalendarz dostaw',
        content: (
          <div>
            <p className="mb-2">
              Kalendarz pokazuje wszystkie zaplanowane dostawy w widoku miesięcznym.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Zielone dni</strong> - dni robocze (można planować dostawy)</li>
              <li><strong>Szare dni</strong> - weekendy i święta</li>
              <li><strong>Niebieskie kafelki</strong> - zaplanowane dostawy (kliknij aby zobaczyć szczegóły)</li>
              <li><strong>Liczba na kafelku</strong> - ilość zleceń przypisanych do dostawy</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'sidebar',
        title: 'Panel zleceń nieprzypisanych',
        content: (
          <div>
            <p className="mb-2">
              Po prawej stronie znajduje się lista zleceń, które nie są jeszcze przypisane
              do żadnej dostawy.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Zlecenia są posortowane według daty utworzenia</li>
              <li>Możesz przeciągnąć zlecenie na wybraną dostawę w kalendarzu</li>
              <li>Kliknięcie w zlecenie pokazuje jego szczegóły</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'views',
        title: 'Widoki kalendarza',
        content: (
          <div>
            <p className="mb-2">
              Możesz przełączać między różnymi widokami:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Kalendarz</strong> - widok miesięczny z kafelkami dostaw</li>
              <li><strong>Lista</strong> - tabela wszystkich dostaw z filtrami</li>
            </ul>
          </div>
        ),
      },
    ],

    howTo: [
      {
        id: 'create-delivery',
        title: 'Jak utworzyć nową dostawę?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij w wybrany dzień na kalendarzu (pusty obszar)</li>
            <li>Otworzy się formularz tworzenia dostawy</li>
            <li>Wypełnij datę dostawy (domyślnie wybrany dzień)</li>
            <li>Opcjonalnie dodaj notatki/uwagi</li>
            <li>Kliknij przycisk &quot;Utwórz dostawę&quot;</li>
          </ol>
        ),
      },
      {
        id: 'assign-order',
        title: 'Jak przypisać zlecenie do dostawy?',
        content: (
          <div>
            <p className="mb-2"><strong>Metoda 1 - Przeciąganie (drag & drop):</strong></p>
            <ol className="list-decimal pl-4 space-y-1 mb-4">
              <li>Znajdź zlecenie w panelu po prawej stronie</li>
              <li>Chwyć zlecenie (przytrzymaj lewy przycisk myszy)</li>
              <li>Przeciągnij na wybraną dostawę w kalendarzu</li>
              <li>Upuść (puść przycisk myszy)</li>
            </ol>
            <p className="mb-2"><strong>Metoda 2 - Przez szczegóły dostawy:</strong></p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Kliknij w dostawę na kalendarzu</li>
              <li>Kliknij przycisk &quot;Dodaj zlecenie&quot;</li>
              <li>Wybierz zlecenie z listy</li>
              <li>Potwierdź wybór</li>
            </ol>
          </div>
        ),
      },
      {
        id: 'remove-order',
        title: 'Jak usunąć zlecenie z dostawy?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij w dostawę na kalendarzu</li>
            <li>Znajdź zlecenie na liście przypisanych</li>
            <li>Kliknij ikonę &quot;X&quot; lub &quot;Usuń&quot; przy zleceniu</li>
            <li>Zlecenie wróci do puli nieprzypisanych</li>
          </ol>
        ),
      },
      {
        id: 'edit-delivery',
        title: 'Jak zmienić datę dostawy?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij w dostawę na kalendarzu</li>
            <li>W szczegółach dostawy kliknij &quot;Edytuj&quot;</li>
            <li>Zmień datę w formularzu</li>
            <li>Zapisz zmiany</li>
          </ol>
        ),
      },
      {
        id: 'delete-delivery',
        title: 'Jak usunąć dostawę?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij w dostawę na kalendarzu</li>
            <li>Kliknij przycisk &quot;Usuń dostawę&quot;</li>
            <li>Potwierdź usunięcie w dialogu</li>
            <li>Wszystkie przypisane zlecenia wrócą do puli nieprzypisanych</li>
          </ol>
        ),
      },
    ],

    consequences: [
      {
        id: 'delete-delivery-effect',
        title: 'Co się stanie po usunięciu dostawy?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Dostawa zostanie oznaczona jako usunięta (soft delete)</li>
            <li>Wszystkie przypisane zlecenia wrócą do puli &quot;nieprzypisanych&quot;</li>
            <li>Można przywrócić dostawę kontaktując się z administratorem</li>
            <li>Historia zmian zostaje zachowana</li>
          </ul>
        ),
      },
      {
        id: 'assign-order-effect',
        title: 'Co się stanie po przypisaniu zlecenia?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Zlecenie zniknie z panelu &quot;nieprzypisanych&quot;</li>
            <li>Pojawi się na liście zleceń w szczegółach dostawy</li>
            <li>Data dostawy zlecenia zostanie zaktualizowana</li>
            <li>Kierownik otrzyma powiadomienie (jeśli włączone)</li>
          </ul>
        ),
      },
      {
        id: 'change-date-effect',
        title: 'Co się stanie po zmianie daty dostawy?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Dostawa przeniesie się na nowy dzień w kalendarzu</li>
            <li>Wszystkie przypisane zlecenia zachowają przypisanie</li>
            <li>Data dostawy na zleceniach zostanie zaktualizowana automatycznie</li>
          </ul>
        ),
      },
    ],

    faq: [
      {
        id: 'faq-multiple',
        title: 'Czy mogę przypisać zlecenie do wielu dostaw?',
        content: (
          <p>
            Nie, każde zlecenie może być przypisane tylko do jednej dostawy naraz.
            Jeśli chcesz przenieść zlecenie do innej dostawy, najpierw usuń je z obecnej.
          </p>
        ),
      },
      {
        id: 'faq-working-day',
        title: 'Jak oznaczyć dzień jako wolny/roboczy?',
        content: (
          <p>
            Kliknij prawym przyciskiem myszy na dniu w kalendarzu.
            Pojawi się menu kontekstowe gdzie możesz zmienić status dnia.
          </p>
        ),
      },
      {
        id: 'faq-past-delivery',
        title: 'Czy mogę utworzyć dostawę w przeszłości?',
        content: (
          <p>
            Tak, ale system wyświetli ostrzeżenie. Dostawy w przeszłości są oznaczone
            specjalnym kolorem i mogą wymagać dodatkowego potwierdzenia.
          </p>
        ),
      },
      {
        id: 'faq-bulk-edit',
        title: 'Jak zmienić daty wielu dostaw naraz?',
        content: (
          <p>
            Przejdź do widoku listy (przycisk &quot;Lista&quot; nad kalendarzem).
            Zaznacz wybrane dostawy checkboxami i użyj przycisku &quot;Zmień daty&quot;
            aby edytować je hurtowo.
          </p>
        ),
      },
    ],
  },
};
