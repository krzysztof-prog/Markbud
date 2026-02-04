/**
 * Instrukcja obsługi - Logistyka
 */

import type { HelpContent } from '../types';

export const logistykaHelp: HelpContent = {
  pageId: 'logistyka',
  pageTitle: 'Logistyka - Instrukcja obsługi',
  description: 'Planowanie dostaw i parsowanie maili od dostawców',

  sections: {
    overview: [
      {
        id: 'layout',
        title: 'Układ strony',
        content: (
          <div>
            <p className="mb-2">
              Strona jest podzielona na 3 kolumny:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Lewa kolumna</strong> - kalendarz i lista dostaw</li>
              <li><strong>Środkowa kolumna</strong> - pozycje wybranej dostawy</li>
              <li><strong>Prawa kolumna</strong> - szczegóły / parser maili</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'calendar',
        title: 'Kalendarz dostaw',
        content: (
          <div>
            <p className="mb-2">
              Kompaktowy kalendarz w lewej kolumnie pokazuje zaplanowane dostawy:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Dni z dostawami są oznaczone kropką</li>
              <li>Kliknij w dzień aby zobaczyć dostawy</li>
              <li>Pod kalendarzem znajduje się lista dostaw na wybrany okres</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'parser',
        title: 'Parser maili',
        content: (
          <div>
            <p className="mb-2">
              Parser automatycznie rozpoznaje pozycje z maili dostawców:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Wklej treść maila od dostawcy</li>
              <li>System rozpozna pozycje (profile, ilości, kolory)</li>
              <li>Możesz edytować rozpoznane dane przed zapisaniem</li>
              <li>Obsługiwane formaty: Schuco, Reynaers i inne</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'items-list',
        title: 'Lista pozycji dostawy',
        content: (
          <div>
            <p className="mb-2">
              Środkowa kolumna pokazuje pozycje wybranej dostawy:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Profil</strong> - numer i nazwa profilu</li>
              <li><strong>Kolor</strong> - kolor profilu</li>
              <li><strong>Ilość</strong> - zamówiona ilość</li>
              <li><strong>Status</strong> - status pozycji (oczekuje, dostarczone)</li>
            </ul>
          </div>
        ),
      },
    ],

    howTo: [
      {
        id: 'parse-mail',
        title: 'Jak sparsować mail od dostawcy?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>W prawej kolumnie przejdź do zakładki &quot;Parser&quot;</li>
            <li>Skopiuj treść maila od dostawcy (Ctrl+C)</li>
            <li>Wklej treść do pola tekstowego (Ctrl+V)</li>
            <li>Kliknij przycisk &quot;Parsuj&quot;</li>
            <li>System rozpozna i wyświetli pozycje</li>
            <li>Sprawdź i ewentualnie popraw rozpoznane dane</li>
            <li>Kliknij &quot;Zapisz dostawę&quot; aby zapisać</li>
          </ol>
        ),
      },
      {
        id: 'edit-parsed',
        title: 'Jak edytować sparsowane pozycje?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Po sparsowaniu maila zobaczysz listę pozycji</li>
            <li>Kliknij w pole które chcesz zmienić</li>
            <li>Wprowadź poprawną wartość</li>
            <li>Użyj przycisku &quot;Usuń&quot; przy pozycji aby ją usunąć</li>
            <li>Użyj &quot;Dodaj pozycję&quot; aby dodać brakującą</li>
          </ol>
        ),
      },
      {
        id: 'select-delivery',
        title: 'Jak wybrać dostawę do podglądu?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>W lewej kolumnie kliknij dzień na kalendarzu</li>
            <li>Pod kalendarzem pojawi się lista dostaw</li>
            <li>Kliknij w wybraną dostawę</li>
            <li>W środkowej kolumnie zobaczysz pozycje</li>
            <li>W prawej kolumnie zobaczysz szczegóły</li>
          </ol>
        ),
      },
      {
        id: 'compare-versions',
        title: 'Jak porównać wersje dostawy?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Wybierz dostawę z listy</li>
            <li>W prawej kolumnie przejdź do zakładki &quot;Historia&quot;</li>
            <li>Zobaczysz listę wszystkich wersji</li>
            <li>Kliknij &quot;Porównaj&quot; aby zobaczyć różnice między wersjami</li>
            <li>Zmiany będą podświetlone kolorami (dodane/usunięte)</li>
          </ol>
        ),
      },
      {
        id: 'create-delivery',
        title: 'Jak ręcznie utworzyć dostawę?',
        content: (
          <ol className="list-decimal pl-4 space-y-2">
            <li>Kliknij przycisk &quot;Nowa dostawa&quot;</li>
            <li>Wybierz datę dostawy</li>
            <li>Wybierz dostawcę z listy</li>
            <li>Dodaj pozycje ręcznie lub sparsuj mail</li>
            <li>Zapisz dostawę</li>
          </ol>
        ),
      },
    ],

    consequences: [
      {
        id: 'save-delivery-effect',
        title: 'Co się stanie po zapisaniu dostawy?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Dostawa pojawi się w kalendarzu na wybraną datę</li>
            <li>Pozycje zostaną dodane do listy oczekujących</li>
            <li>System utworzy powiadomienie dla kierownika</li>
            <li>Po dostarczeniu, stany magazynowe zostaną zaktualizowane</li>
          </ul>
        ),
      },
      {
        id: 'update-delivery-effect',
        title: 'Co się stanie po aktualizacji dostawy?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Nowa wersja zostanie zapisana (poprzednia zachowana w historii)</li>
            <li>Zmiany pozycji zostaną odzwierciedlone</li>
            <li>Jeśli zmieniono datę, dostawa przeniesie się w kalendarzu</li>
            <li>Porównanie wersji będzie dostępne w historii</li>
          </ul>
        ),
      },
      {
        id: 'parse-error-effect',
        title: 'Co jeśli parser nie rozpoznał pozycji?',
        content: (
          <ul className="list-disc pl-4 space-y-1">
            <li>Nierozpoznane fragmenty będą oznaczone na żółto</li>
            <li>Możesz ręcznie dodać brakujące pozycje</li>
            <li>Zgłoś format maila administratorowi aby poprawić parser</li>
            <li>Możesz zapisać częściowo rozpoznaną dostawę i uzupełnić później</li>
          </ul>
        ),
      },
    ],

    faq: [
      {
        id: 'faq-formats',
        title: 'Jakie formaty maili są obsługiwane?',
        content: (
          <div>
            <p className="mb-2">Parser obsługuje maile od następujących dostawców:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Schuco</li>
              <li>Reynaers</li>
              <li>Aluprof</li>
              <li>Inne formaty - skontaktuj się z administratorem</li>
            </ul>
            <p className="mt-2">
              Jeśli Twój format nie jest obsługiwany, wyślij przykładowy mail
              do administratora.
            </p>
          </div>
        ),
      },
      {
        id: 'faq-duplicate',
        title: 'Co jeśli sparsowałem ten sam mail dwukrotnie?',
        content: (
          <p>
            System wykryje duplikat i ostrzeże przed zapisaniem. Możesz wybrać
            czy chcesz utworzyć nową dostawę czy zaktualizować istniejącą.
            Nie martw się - nie utworzysz przypadkowo duplikatu.
          </p>
        ),
      },
      {
        id: 'faq-edit-saved',
        title: 'Czy mogę edytować zapisaną dostawę?',
        content: (
          <p>
            Tak, wybierz dostawę z listy i kliknij &quot;Edytuj&quot;. Zmiany
            zostaną zapisane jako nowa wersja, a poprzednia pozostanie w historii.
            Nie możesz usunąć historycznych wersji.
          </p>
        ),
      },
      {
        id: 'faq-partial',
        title: 'Co jeśli dostawa przyszła tylko częściowo?',
        content: (
          <p>
            Oznacz dostarczone pozycje jako &quot;Dostarczone&quot;, a pozostałe
            zostaw jako &quot;Oczekujące&quot;. System śledzi status każdej pozycji
            osobno. Możesz też podzielić dostawę na części.
          </p>
        ),
      },
    ],
  },
};
