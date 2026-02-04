/**
 * HelpPdfService - Generowanie PDF instrukcji obsługi
 *
 * Używa PDFKit z fontami Roboto dla polskich znaków
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Struktura treści PDF (plain text, bez JSX)
 */
interface HelpPdfSection {
  title: string;
  items: string[];
}

interface HelpPdfContent {
  title: string;
  description: string;
  sections: HelpPdfSection[];
}

/**
 * Treści instrukcji dla PDF (plain text)
 * Musi być zsynchronizowane z frontend content
 */
const HELP_PDF_CONTENT: Record<string, HelpPdfContent> = {
  dostawy: {
    title: 'Dostawy - Instrukcja obsługi',
    description: 'Zarządzanie dostawami okien i przypisywanie zleceń do dostaw',
    sections: [
      {
        title: 'Przegląd strony',
        items: [
          'Kalendarz dostaw - pokazuje wszystkie zaplanowane dostawy w widoku miesięcznym',
          'Zielone dni - dni robocze (można planować dostawy)',
          'Szare dni - weekendy i święta',
          'Niebieskie kafelki - zaplanowane dostawy (kliknij aby zobaczyć szczegóły)',
          'Panel zleceń nieprzypisanych - lista zleceń do przypisania (po prawej stronie)',
        ],
      },
      {
        title: 'Jak utworzyć nową dostawę?',
        items: [
          '1. Kliknij w wybrany dzień na kalendarzu (pusty obszar)',
          '2. Otworzy się formularz tworzenia dostawy',
          '3. Wypełnij datę dostawy (domyślnie wybrany dzień)',
          '4. Opcjonalnie dodaj notatki/uwagi',
          '5. Kliknij przycisk "Utwórz dostawę"',
        ],
      },
      {
        title: 'Jak przypisać zlecenie do dostawy?',
        items: [
          'Metoda 1 - Przeciąganie (drag & drop):',
          '  - Znajdź zlecenie w panelu po prawej stronie',
          '  - Chwyć zlecenie (przytrzymaj lewy przycisk myszy)',
          '  - Przeciągnij na wybraną dostawę w kalendarzu',
          '  - Upuść (puść przycisk myszy)',
          '',
          'Metoda 2 - Przez szczegóły dostawy:',
          '  - Kliknij w dostawę na kalendarzu',
          '  - Kliknij przycisk "Dodaj zlecenie"',
          '  - Wybierz zlecenie z listy',
        ],
      },
      {
        title: 'Skutki operacji',
        items: [
          'Usunięcie dostawy - zlecenia wracają do puli nieprzypisanych (soft delete)',
          'Przypisanie zlecenia - zlecenie znika z panelu nieprzypisanych',
          'Zmiana daty dostawy - dostawa przenosi się, zlecenia pozostają przypisane',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Czy mogę przypisać zlecenie do wielu dostaw? - Nie, 1 zlecenie = 1 dostawa',
          'Jak oznaczyć dzień wolny? - Prawy klik na dniu w kalendarzu',
          'Jak zmienić daty wielu dostaw? - Widok listy → zaznacz → "Zmień daty"',
        ],
      },
    ],
  },

  zlecenia: {
    title: 'Zlecenia - Instrukcja obsługi',
    description: 'Przeglądanie i zarządzanie wszystkimi zleceniami w systemie',
    sections: [
      {
        title: 'Przegląd strony',
        items: [
          'Tabela zleceń - główna tabela z możliwością sortowania i filtrowania',
          'Pasek filtrów - wyszukiwarka, filtry statusu, filtr daty, grupowanie',
          'Ustawienia kolumn - zmień widoczność i kolejność kolumn',
          'Kliknięcie w wiersz - otwiera szczegóły zlecenia',
        ],
      },
      {
        title: 'Statusy zleceń',
        items: [
          'Nowe - zlecenie zostało utworzone',
          'W produkcji - zlecenie jest realizowane',
          'Gotowe - zlecenie jest gotowe do wysyłki',
          'Wysłane - zlecenie zostało wysłane',
          'NIE CIĄĆ - zlecenie wstrzymane (ręczny status)',
          'Anulowane - zlecenie anulowane',
        ],
      },
      {
        title: 'Jak wyszukać zlecenie?',
        items: [
          '1. Kliknij w pole wyszukiwania (lupa)',
          '2. Wpisz numer zlecenia, nazwę klienta lub kolor',
          '3. Wyniki filtrują się automatycznie podczas pisania',
          '4. Aby wyczyścić - usuń tekst lub kliknij "X"',
        ],
      },
      {
        title: 'Jak edytować zlecenie w tabeli?',
        items: [
          '1. Kliknij dwukrotnie w komórkę którą chcesz edytować',
          '2. Wprowadź nową wartość',
          '3. Naciśnij Enter aby zapisać lub Escape aby anulować',
          '4. Zmiany zapisują się automatycznie',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Nie mogę znaleźć zlecenia - wyczyść filtry i sprawdź zakres dat',
          'Dlaczego nie mogę edytować pól? - Niektóre pola są tylko do odczytu',
          'Co oznaczają kolory wierszy? - Czerwony=problem, Żółty=wstrzymane, Zielony=gotowe',
        ],
      },
    ],
  },

  'magazyn-akrobud': {
    title: 'Magazyn AKROBUD - Instrukcja obsługi',
    description: 'Zarządzanie stanami magazynowymi profili aluminiowych',
    sections: [
      {
        title: 'Przegląd strony',
        items: [
          'Lista kolorów (panel boczny) - kolory typowe i atypowe',
          'Zakładka Zlecenia - lista zleceń używających wybranego koloru',
          'Zakładka Magazyn - aktualny stan magazynowy (ilości profili)',
          'Zakładka Historia - historia wszystkich operacji na tym kolorze',
        ],
      },
      {
        title: 'Jak sprawdzić stan magazynowy?',
        items: [
          '1. Znajdź kolor na liście po lewej stronie',
          '2. Kliknij w wybrany kolor',
          '3. Przejdź do zakładki "Magazyn"',
          '4. Zobaczysz tabelę z wszystkimi profilami i ich ilościami',
        ],
      },
      {
        title: 'Jak wykonać remanent?',
        items: [
          '1. Kliknij przycisk "Wykonaj remanent"',
          '2. Wprowadź rzeczywiste stany dla każdego profilu',
          '3. System automatycznie obliczy różnice',
          '4. Zatwierdź remanent aby zaktualizować stany',
          'UWAGA: Operacja jest nieodwracalna!',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Czerwona wartość - stan poniżej minimum, zamów materiał',
          'Ujemny stan - wydano więcej niż było, wykonaj remanent',
          'Różnica typowe/atypowe - typowe zawsze na stanie, atypowe na zamówienie',
        ],
      },
    ],
  },

  logistyka: {
    title: 'Logistyka - Instrukcja obsługi',
    description: 'Planowanie dostaw i parsowanie maili od dostawców',
    sections: [
      {
        title: 'Układ strony',
        items: [
          'Lewa kolumna - kalendarz i lista dostaw',
          'Środkowa kolumna - pozycje wybranej dostawy',
          'Prawa kolumna - szczegóły / parser maili',
        ],
      },
      {
        title: 'Jak sparsować mail od dostawcy?',
        items: [
          '1. W prawej kolumnie przejdź do zakładki "Parser"',
          '2. Skopiuj treść maila od dostawcy (Ctrl+C)',
          '3. Wklej treść do pola tekstowego (Ctrl+V)',
          '4. Kliknij przycisk "Parsuj"',
          '5. Sprawdź i ewentualnie popraw rozpoznane dane',
          '6. Kliknij "Zapisz dostawę"',
        ],
      },
      {
        title: 'Obsługiwane formaty maili',
        items: [
          'Schuco',
          'Reynaers',
          'Aluprof',
          'Inne formaty - skontaktuj się z administratorem',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Parser nie rozpoznał pozycji - dodaj ręcznie lub zgłoś format',
          'Sparsowałem dwa razy - system wykryje duplikat i ostrzeże',
          'Dostawa częściowa - oznacz dostarczone pozycje, reszta "Oczekujące"',
        ],
      },
    ],
  },

  'moja-praca': {
    title: 'Moja Praca - Instrukcja obsługi',
    description: 'Osobisty dashboard z zadaniami, konfliktami i przeglądem dnia',
    sections: [
      {
        title: 'Przegląd strony',
        items: [
          'Nagłówek - tytuł i selektor daty (domyślnie dzisiaj)',
          'Karty podsumowania - Konflikty, Zlecenia, Dostawy, Zamówienia szyb',
          'Zakładki - szczegóły dla każdej kategorii',
        ],
      },
      {
        title: 'Co to są konflikty?',
        items: [
          'Konflikty powstają gdy system wykryje rozbieżności podczas importu:',
          '- Zduplikowany numer zlecenia',
          '- Niezgodność danych między systemami',
          '- Brakujące powiązania',
          '- Błędy walidacji danych',
          'Konflikty wymagają ręcznego rozwiązania!',
        ],
      },
      {
        title: 'Jak rozwiązać konflikt?',
        items: [
          '1. Przejdź do zakładki "Konflikty"',
          '2. Kliknij w konflikt na liście',
          '3. Przeczytaj opis konfliktu w modalu',
          '4. Wybierz jedną z opcji rozwiązania',
          '5. Kliknij "Rozwiąż" aby zatwierdzić',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Strona pusta - wybierz inną datę lub sprawdź inne zakładki',
          'Czerwony badge - pilne konflikty wymagające uwagi',
          'Widzę cudze zlecenia - kierownicy widzą wszystkie, operatorzy tylko swoje',
        ],
      },
    ],
  },

  importy: {
    title: 'Importy - Instrukcja obsługi',
    description: 'Import danych z plików zewnętrznych do systemu AKROBUD',
    sections: [
      {
        title: 'Rodzaje importów',
        items: [
          'Ceny - import cennika profili z pliku Excel',
          'Użyte bele - import zużycia materiałów z produkcji',
          'Profile - import nowych profili do bazy danych',
          'Kolory - import nowych kolorów do systemu',
          'Zlecenia - import zleceń z zewnętrznego systemu',
        ],
      },
      {
        title: 'Statusy importu',
        items: [
          'Oczekuje - plik gotowy do importu',
          'W trakcie - import jest przetwarzany',
          'Sukces - import zakończony pomyślnie',
          'Błąd - import zakończył się błędem (zobacz szczegóły)',
          'Częściowy - część rekordów zaimportowana, część z błędami',
        ],
      },
      {
        title: 'Jak ręcznie importować plik?',
        items: [
          '1. Kliknij przycisk "Importuj plik" przy odpowiednim typie importu',
          '2. Wybierz plik z dysku (format Excel .xlsx lub .xls)',
          '3. Poczekaj na zakończenie przetwarzania',
          '4. Sprawdź wynik - liczba zaimportowanych i pominiętych rekordów',
          '5. W razie błędów - pobierz raport błędów',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Jaki format pliku? - System akceptuje Excel (.xlsx, .xls)',
          'Ten sam plik dwukrotnie? - System wykryje duplikaty i zapyta',
          'Częściowy sukces? - Sprawdź szczegóły które wiersze nie przeszły',
          'Można cofnąć import? - Tak, w ciągu 24h kliknij "Cofnij"',
        ],
      },
    ],
  },

  kierownik: {
    title: 'Panel Kierownika - Instrukcja obsługi',
    description: 'Zarządzanie produkcją, zleceniami i pracownikami',
    sections: [
      {
        title: 'Przegląd dashboardu',
        items: [
          'Kalendarz produkcji - widok tygodniowy/miesięczny zleceń',
          'Statystyki - liczba zleceń, wartość, postęp',
          'Alerty - ostrzeżenia wymagające uwagi',
          'Szybkie akcje - najczęściej używane operacje',
        ],
      },
      {
        title: 'Kolory w kalendarzu',
        items: [
          'Zielony - zlecenie ukończone',
          'Niebieski - w produkcji',
          'Żółty - oczekuje na materiały',
          'Czerwony - opóźnione / problem',
          'Szary - zaplanowane',
        ],
      },
      {
        title: 'Jak przypisać zlecenie do dnia?',
        items: [
          '1. Znajdź zlecenie w panelu bocznym (lista nieprzypisanych)',
          '2. Przeciągnij zlecenie na odpowiedni dzień w kalendarzu',
          '3. Lub kliknij zlecenie → "Przypisz" → wybierz datę',
          '4. System sprawdzi dostępność materiałów i pracowników',
          '5. Potwierdź przypisanie',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Dzień przeciążony? - Przesuń część zleceń na inne dni',
          'Brak materiałów? - Sprawdź zakładkę "Materiały", zamów lub przesuń',
          'Jak oznaczyć pilne? - Kliknij zlecenie → Priorytet → "Pilne"',
          'Historia zlecenia? - Kliknij zlecenie → zakładka "Historia"',
        ],
      },
    ],
  },

  operator: {
    title: 'Panel Operatora - Instrukcja obsługi',
    description: 'Wykonywanie zleceń produkcyjnych i raportowanie postępu',
    sections: [
      {
        title: 'Przegląd panelu',
        items: [
          'Moje zlecenia - lista przypisanych zleceń na dziś',
          'W trakcie - aktualnie wykonywane zlecenie',
          'Ukończone - zrealizowane zlecenia z dzisiejszego dnia',
          'Statystyki - podsumowanie wydajności',
        ],
      },
      {
        title: 'Jak rozpocząć zlecenie?',
        items: [
          '1. Znajdź zlecenie na liście "Moje zlecenia"',
          '2. Kliknij przycisk "Rozpocznij" (zielony)',
          '3. System zarejestruje czas startu',
          '4. Zlecenie przejdzie do sekcji "W trakcie"',
        ],
      },
      {
        title: 'Jak zakończyć zlecenie?',
        items: [
          '1. Po ukończeniu produkcji kliknij "Zakończ"',
          '2. Podaj faktyczną ilość wyprodukowanych elementów',
          '3. Jeśli różni się od planowanej - dodaj komentarz',
          '4. Kliknij "Potwierdź zakończenie"',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Złe zlecenie? - Kliknij "Anuluj start" w ciągu 5 minut',
          'Inna ilość? - Podaj faktyczną przy zakończeniu',
          'Brak zleceń? - Skontaktuj się z kierownikiem',
          'Przerwa? - Kliknij "Przerwa" w górnym menu',
        ],
      },
    ],
  },

  weryfikacja: {
    title: 'Weryfikacja Dostaw - Instrukcja obsługi',
    description: 'Sprawdzanie i potwierdzanie zgodności dostaw z zamówieniami',
    sections: [
      {
        title: 'Cel weryfikacji',
        items: [
          'Weryfikacja dostaw służy do sprawdzenia czy dostarczone materiały zgadzają się z zamówieniem',
          'Porównuje ilości, profile i kolory z dokumentem dostawy',
        ],
      },
      {
        title: 'Statusy weryfikacji',
        items: [
          'Do weryfikacji - oczekuje na sprawdzenie',
          'W trakcie - weryfikacja rozpoczęta',
          'Zgodna - dostawa zgodna z zamówieniem',
          'Niezgodność - wykryto różnice',
          'Odrzucona - dostawa zwrócona do dostawcy',
        ],
      },
      {
        title: 'Jak przeprowadzić weryfikację?',
        items: [
          '1. Znajdź dostawę ze statusem "Do weryfikacji"',
          '2. Kliknij "Rozpocznij weryfikację"',
          '3. Weź dokument dostawy (WZ/faktura)',
          '4. Dla każdej pozycji sprawdź fizycznie ilość i jakość',
          '5. Kliknij ✓ jeśli OK, lub ✗ jeśli niezgodność',
          '6. Kliknij "Zakończ weryfikację"',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Dostawa częściowa? - Potwierdź co jest, zgłoś "Brak" dla reszty',
          'Błędny kolor? - Zgłoś niezgodność typu "Błędny kolor"',
          'Uszkodzony materiał? - Zrób zdjęcie, zgłoś niezgodność',
          'Brak dokumentu? - Nie rozpoczynaj bez WZ/faktury',
        ],
      },
    ],
  },

  'kontrola-etykiet': {
    title: 'Kontrola Etykiet - Instrukcja obsługi',
    description: 'Sprawdzanie i weryfikacja etykiet na produktach',
    sections: [
      {
        title: 'Cel kontroli',
        items: [
          'Kontrola etykiet zapewnia że wszystkie produkty są prawidłowo oznakowane przed wysyłką',
          'Sprawdza zgodność etykiet z zamówieniem, czytelność kodów i poprawność danych',
        ],
      },
      {
        title: 'Co sprawdzamy?',
        items: [
          'Numer zlecenia na etykiecie',
          'Nazwa klienta',
          'Typ i kolor profilu',
          'Ilość w paczce',
          'Kod kreskowy (czytelność)',
          'Data produkcji',
        ],
      },
      {
        title: 'Jak przeprowadzić kontrolę?',
        items: [
          '1. Wybierz dostawę z listy "Do kontroli"',
          '2. Kliknij "Rozpocznij kontrolę"',
          '3. Zeskanuj kod kreskowy z etykiety',
          '4. System porówna z danymi w systemie',
          '5. Zielone = zgodne, Czerwone = problem',
          '6. Kliknij "Zakończ kontrolę" gdy wszystkie OK',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Skaner nie działa? - Wpisz kod ręcznie w pole tekstowe',
          'Błędne dane? - Wydrukuj nową etykietę',
          'Uszkodzona etykieta? - Jeśli kod skanuje = OK, inaczej wydrukuj nową',
          'Kilka etykiet? - Właściwa ma kod AKR-',
        ],
      },
    ],
  },

  'magazyn-pvc': {
    title: 'Magazyn PVC - Instrukcja obsługi',
    description: 'Zarządzanie stanami magazynowymi profili PVC',
    sections: [
      {
        title: 'Przegląd magazynu',
        items: [
          'Tabela stanów - aktualne ilości profili w magazynie',
          'Filtry - wyszukiwanie po systemie, profilu, kolorze',
          'Alerty - ostrzeżenia o niskim stanie',
          'Historia - ruchy magazynowe',
        ],
      },
      {
        title: 'Kolory stanów',
        items: [
          'Zielony - stan optymalny',
          'Żółty - stan niski (poniżej minimum)',
          'Czerwony - stan krytyczny / brak',
          'Niebieski - stan powyżej maksimum',
        ],
      },
      {
        title: 'Jak sprawdzić zapotrzebowanie?',
        items: [
          '1. Kliknij "Zapotrzebowanie" w górnym menu',
          '2. System pokaże profile potrzebne na najbliższe zlecenia',
          '3. Kolumna "Brakuje" pokazuje ile trzeba zamówić',
          '4. Kliknij "Generuj zamówienie" aby utworzyć zamówienie',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Ujemny stan? - Wydano więcej niż było, wykonaj remanent',
          'Różnica z fizycznym? - Wykonaj inwentaryzację i korektę',
          'Jak ustawić minimum? - Kliknij profil → "Ustawienia"',
          'Co to "Zarezerwowane"? - Materiał przypisany do zleceń',
        ],
      },
    ],
  },

  'zestawienia-miesieczne': {
    title: 'Zestawienia Miesięczne - Instrukcja obsługi',
    description: 'Raporty i podsumowania produkcji za dany miesiąc',
    sections: [
      {
        title: 'Przegląd zestawień',
        items: [
          'Produkcja - ilość wyprodukowanych elementów',
          'Wartość - suma wartości zleceń',
          'Wydajność - porównanie z planem',
          'Materiały - zużycie profili i innych materiałów',
          'Klienci - zestawienie per klient',
        ],
      },
      {
        title: 'Jak wygenerować raport?',
        items: [
          '1. Wybierz miesiąc z selektora',
          '2. Wybierz typ raportu (Produkcja / Wartość / Materiały)',
          '3. Opcjonalnie ustaw filtry (klient, system, operator)',
          '4. Kliknij "Generuj raport"',
          '5. Poczekaj na przetworzenie danych',
        ],
      },
      {
        title: 'Eksport danych',
        items: [
          'PDF - kliknij "Eksportuj PDF" → wybierz zawartość → "Pobierz"',
          'Excel - kliknij "Eksportuj Excel" → plik .xlsx zostanie pobrany',
          'Porównanie okresów - kliknij "Porównaj" → wybierz dwa okresy',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Niepełne dane? - Sprawdź czy wszystkie zlecenia są zamknięte',
          'Suma nie zgadza się? - Sprawdź filtry i zakres dat',
          'Dane z poprzedniego roku? - Użyj selektora roku',
          'Automatyczne raporty? - Skontaktuj się z administratorem',
        ],
      },
    ],
  },

  szyby: {
    title: 'Szyby - Instrukcja obsługi',
    description: 'Zarządzanie zamówieniami i dostawami szyb',
    sections: [
      {
        title: 'Przegląd modułu',
        items: [
          'Zamówienia - lista zamówień szyb do producentów',
          'Dostawy - śledzenie dostaw szyb',
          'Kategorie - typy szyb i ich parametry',
          'Statystyki - raporty i analizy',
        ],
      },
      {
        title: 'Statusy zamówień',
        items: [
          'Nowe - zamówienie utworzone',
          'Wysłane - wysłane do producenta',
          'W produkcji - producent pracuje',
          'W transporcie - w drodze',
          'Dostarczone - szyby przyjęte',
          'Problem - reklamacja/opóźnienie',
        ],
      },
      {
        title: 'Jak złożyć zamówienie?',
        items: [
          '1. Kliknij "Nowe zamówienie"',
          '2. Wybierz producenta szyb',
          '3. Dodaj pozycje (wymiary, typ, ilość)',
          '4. Sprawdź podsumowanie i cenę',
          '5. Kliknij "Wyślij zamówienie"',
        ],
      },
      {
        title: 'FAQ',
        items: [
          'Czas dostawy? - Standardowo 5-10 dni roboczych',
          'Jak podawać wymiary? - W milimetrach: szerokość x wysokość',
          'Pilne zamówienie? - Zaznacz "Pilne" (dodatkowa opłata)',
          'Szyby na magazynie? - Sprawdź zakładkę "Magazyn szyb"',
        ],
      },
    ],
  },
};

export class HelpPdfService {
  private readonly FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
  private readonly BOLD_FONT = path.join(this.FONT_DIR, 'Roboto-Bold.ttf');
  private readonly REGULAR_FONT = path.join(this.FONT_DIR, 'Roboto-Regular.ttf');

  /**
   * Sprawdź czy istnieje treść dla danej strony
   */
  hasContent(pageId: string): boolean {
    return pageId in HELP_PDF_CONTENT;
  }

  /**
   * Generuj PDF instrukcji dla danej strony
   */
  async generatePdf(pageId: string): Promise<Buffer> {
    const content = HELP_PDF_CONTENT[pageId];
    if (!content) {
      throw new Error(`Brak treści instrukcji dla strony: ${pageId}`);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: true,
          info: {
            Title: content.title,
            Author: 'System AKROBUD',
            Subject: 'Instrukcja obsługi',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Rejestracja fontów
        doc.registerFont('Roboto', this.REGULAR_FONT);
        doc.registerFont('Roboto-Bold', this.BOLD_FONT);

        // Nagłówek
        doc.fontSize(22).font('Roboto-Bold').fillColor('#1e40af').text(content.title, {
          align: 'center',
        });
        doc.moveDown(0.5);

        doc.fontSize(12).font('Roboto').fillColor('#4b5563').text(content.description, {
          align: 'center',
        });
        doc.moveDown(1.5);

        // Linia oddzielająca
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .stroke();
        doc.moveDown(1);

        // Sekcje
        for (const section of content.sections) {
          // Sprawdź czy zmieści się nagłówek sekcji
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
          }

          // Tytuł sekcji
          doc.fontSize(14).font('Roboto-Bold').fillColor('#111827').text(section.title);
          doc.moveDown(0.3);

          // Elementy sekcji
          doc.fontSize(10).font('Roboto').fillColor('#374151');
          for (const item of section.items) {
            // Sprawdź czy zmieści się linia
            if (doc.y > doc.page.height - 80) {
              doc.addPage();
            }

            if (item === '') {
              doc.moveDown(0.3);
            } else if (item.startsWith('  ')) {
              // Wcięcie dla podpunktów
              doc.text(item, { indent: 30 });
            } else {
              doc.text(`• ${item}`, { indent: 15 });
            }
            doc.moveDown(0.15);
          }

          doc.moveDown(0.8);
        }

        // Stopka na każdej stronie
        const pageRange = doc.bufferedPageRange();
        for (let i = 0; i < pageRange.count; i++) {
          doc.switchToPage(pageRange.start + i);

          // Data i numer strony
          const footerY = doc.page.height - 40;
          doc
            .fontSize(8)
            .font('Roboto')
            .fillColor('#9ca3af')
            .text(
              `Strona ${i + 1} z ${pageRange.count}`,
              50,
              footerY,
              { align: 'left', width: 100 }
            )
            .text(
              `Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} | System AKROBUD`,
              150,
              footerY,
              { align: 'right', width: doc.page.width - 200 }
            );
        }

        doc.end();
        logger.info(`Wygenerowano PDF instrukcji dla: ${pageId}`);
      } catch (error) {
        logger.error('Błąd generowania PDF instrukcji:', error);
        reject(error);
      }
    });
  }
}
