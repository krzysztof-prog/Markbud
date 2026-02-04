import { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { SchucoItemParser, SchucoOrderItemRow } from './schucoItemParser.js';

/**
 * Scraper pozycji zamówień Schüco
 * Wchodzi w szczegóły każdego zamówienia i pobiera CSV z pozycjami
 */
export class SchucoItemScraper {
  private page: Page;
  private downloadPath: string;
  private parser: SchucoItemParser;
  private hasScrolledTable = false; // Flaga - scrolluj tylko raz na sesję

  constructor(page: Page, downloadPath: string) {
    this.page = page;
    this.downloadPath = downloadPath;
    this.parser = new SchucoItemParser();
  }

  /**
   * Pobiera pozycje dla jednego zamówienia
   * @param orderNumber Numer zamówienia Schüco (np. "48/2026/53849")
   * @returns Tablica pozycji zamówienia lub null przy błędzie
   */
  async fetchItemsForOrder(orderNumber: string): Promise<SchucoOrderItemRow[] | null> {
    logger.info(`[SchucoItemScraper] Fetching items for order: ${orderNumber}`);

    try {
      // Krok 1: Znajdź i kliknij w wiersz z zamówieniem
      const clicked = await this.clickOrderRow(orderNumber);
      if (!clicked) {
        logger.warn(`[SchucoItemScraper] Could not click order row: ${orderNumber}`);
        return null;
      }

      // Krok 2: Czekaj na załadowanie szczegółów zamówienia
      await this.waitForOrderDetails();

      // Krok 3: Pobierz CSV z pozycjami (z unikalną nazwą pliku)
      const csvPath = await this.downloadItemsCSV(orderNumber);
      if (!csvPath) {
        logger.warn(`[SchucoItemScraper] Could not download CSV for order: ${orderNumber}`);
        await this.goBackToList();
        return null;
      }

      // Krok 4: Sprawdź czy plik istnieje i ma dane
      if (!fs.existsSync(csvPath)) {
        logger.error(`[SchucoItemScraper] CSV file does not exist: ${csvPath}`);
        await this.goBackToList();
        return null;
      }

      const fileStats = fs.statSync(csvPath);
      logger.info(`[SchucoItemScraper] CSV file size: ${fileStats.size} bytes`);

      if (fileStats.size === 0) {
        logger.error(`[SchucoItemScraper] CSV file is empty (0 bytes): ${csvPath}`);
        await this.goBackToList();
        return null;
      }

      // Parsuj CSV
      const items = await this.parser.parseCSV(csvPath);

      // Krok 5: Usuń plik CSV po parsowaniu
      try {
        fs.unlinkSync(csvPath);
      } catch {
        // Ignoruj błąd usuwania
      }

      // Krok 6: Wróć do listy zamówień
      await this.goBackToList();

      logger.info(`[SchucoItemScraper] Fetched ${items.length} items for order: ${orderNumber}`);
      return items;
    } catch (error) {
      logger.error(`[SchucoItemScraper] Error fetching items for order ${orderNumber}:`, error);

      // Spróbuj wrócić do listy
      try {
        await this.goBackToList();
      } catch {
        // Ignoruj błąd powrotu
      }

      return null;
    }
  }

  /**
   * Scrolluj tabelę w dół aby załadować wszystkie wiersze (lazy loading)
   * Używa Page Down i mouse wheel jako fallback
   */
  private async scrollTableToLoadAllRows(): Promise<void> {
    logger.info(`[SchucoItemScraper] Scrolling table to load all rows...`);

    let previousRowCount = 0;
    let noChangeCount = 0;
    const maxScrollAttempts = 7; // Maksymalnie 7 prób scrollowania
    const maxNoChangeAttempts = 3; // Jeśli 3x z rzędu nie ma nowych wierszy, zakończ

    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      // Policz aktualne wiersze
      const currentRowCount = await this.page.evaluate(() => {
        return document.querySelectorAll('tr, [role="row"]').length;
      });

      logger.info(`[SchucoItemScraper] Scroll attempt ${attempt + 1}: ${currentRowCount} rows`);

      // Sprawdź czy pojawiły się nowe wiersze
      if (currentRowCount === previousRowCount) {
        noChangeCount++;
        if (noChangeCount >= maxNoChangeAttempts) {
          logger.info(`[SchucoItemScraper] No new rows after ${maxNoChangeAttempts} scrolls, stopping`);
          break;
        }
      } else {
        noChangeCount = 0; // Reset jeśli pojawiły się nowe
      }

      previousRowCount = currentRowCount;

      // Metoda 1: Kliknij w tabelę i użyj Page Down (najpewniejsza metoda)
      try {
        // Znajdź tabelę i kliknij w nią aby dać jej focus
        const tableClicked = await this.page.evaluate(() => {
          const table = document.querySelector('table, [role="table"], [class*="table"]');
          if (table) {
            (table as HTMLElement).click();
            return true;
          }
          // Kliknij gdziekolwiek w body żeby dać focus
          document.body.click();
          return false;
        });

        // Użyj Page Down (3 razy dla pewności)
        for (let i = 0; i < 3; i++) {
          await this.page.keyboard.press('PageDown');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        logger.info(`[SchucoItemScraper] Used PageDown (table clicked: ${tableClicked})`);
      } catch (e) {
        logger.warn(`[SchucoItemScraper] PageDown failed, trying mouse wheel`);
      }

      // Metoda 2: Mouse wheel scroll jako fallback
      try {
        await this.page.mouse.wheel({ deltaY: 1000 });
      } catch {
        // Ignoruj
      }

      // Metoda 3: JavaScript scroll jako ostateczność
      await this.page.evaluate(() => {
        // Próba scrollowania różnych kontenerów
        const containers = [
          document.querySelector('.cdk-virtual-scroll-viewport'),
          document.querySelector('[class*="virtual-scroll"]'),
          document.querySelector('[class*="table-wrapper"]'),
          document.querySelector('[class*="table-container"]'),
          document.querySelector('[class*="scroll"]'),
          document.querySelector('tbody'),
          document.querySelector('main'),
          document.documentElement,
        ];

        for (const container of containers) {
          if (container && container.scrollHeight > container.clientHeight) {
            container.scrollTop = container.scrollHeight;
            console.log('Scrolled container:', container.className || container.tagName);
            return;
          }
        }

        // Fallback - scroll całej strony
        window.scrollBy(0, 1000);
      });

      // Czekaj na załadowanie nowych wierszy
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Czekaj aż "Ładowanie danych" zniknie
      try {
        await this.page.waitForFunction(
          () => !document.body.innerText.includes('Ładowanie danych'),
          { timeout: 5000 }
        );
      } catch {
        // Timeout jest OK - może nie było ładowania
      }
    }

    // Scrolluj z powrotem na górę
    logger.info(`[SchucoItemScraper] Scrolling back to top...`);

    // Page Up kilka razy
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('PageUp');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Ctrl+Home dla pewności
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('Home');
    await this.page.keyboard.up('Control');

    await new Promise(resolve => setTimeout(resolve, 500));
    logger.info(`[SchucoItemScraper] Finished scrolling, total rows: ${previousRowCount}`);
  }

  /**
   * Kliknij w wiersz zamówienia w tabeli
   * Strategia:
   * 1. Poczekaj na załadowanie tabeli
   * 2. Scrolluj aby załadować wszystkie wiersze (lazy loading)
   * 3. Spróbuj znaleźć zamówienie bezpośrednio w widocznych wierszach
   * 4. Jeśli nie ma - spróbuj użyć filtra
   * 5. Kliknij strzałkę ">" aby wejść w szczegóły
   */
  private async clickOrderRow(orderNumber: string): Promise<boolean> {
    logger.info(`[SchucoItemScraper] Looking for order row: ${orderNumber}`);

    try {
      // Czekaj aż "Ładowanie danych" zniknie i pojawią się wiersze tabeli
      logger.info(`[SchucoItemScraper] Waiting for table data to load...`);
      await this.page.waitForFunction(
        () => {
          const loadingText = document.body.innerText.includes('Ładowanie danych');
          const hasRows = document.querySelectorAll('tr').length > 2;
          return !loadingText && hasRows;
        },
        { timeout: 30000 }
      );
      logger.info(`[SchucoItemScraper] Table data loaded`);

      // Dodatkowy czas na pełne renderowanie
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Scrolluj tabelę TYLKO RAZ na początku sesji (lazy loading)
      if (!this.hasScrolledTable) {
        await this.scrollTableToLoadAllRows();
        this.hasScrolledTable = true;
      }

      // Najpierw sprawdź czy zamówienie jest widoczne na aktualnej stronie
      let foundInTable = await this.findAndClickOrderInTable(orderNumber);

      if (foundInTable) {
        logger.info(`[SchucoItemScraper] Found order directly in table`);
        return true;
      }

      // Jeśli nie znaleziono - spróbuj użyć filtra
      logger.info(`[SchucoItemScraper] Order not visible, trying filter: ${orderNumber}`);
      const filterApplied = await this.applyOrderNumberFilter(orderNumber);

      if (filterApplied) {
        // Czekaj na przeładowanie tabeli po filtracji
        await this.page.waitForFunction(
          () => {
            const loadingText = document.body.innerText.includes('Ładowanie danych');
            return !loadingText;
          },
          { timeout: 30000 }
        );
        await new Promise(resolve => setTimeout(resolve, 1500));
        logger.info(`[SchucoItemScraper] Filter applied, searching again...`);

        // Spróbuj znaleźć ponownie
        foundInTable = await this.findAndClickOrderInTable(orderNumber);

        if (foundInTable) {
          logger.info(`[SchucoItemScraper] Found order after filtering`);
          return true;
        }
      }

      // Jeśli nadal nie znaleziono - zrób screenshot i zwróć błąd
      logger.warn(`[SchucoItemScraper] Could not find order row: ${orderNumber}`);
      await this.page.screenshot({
        path: path.join(this.downloadPath, 'order-not-found.png'),
      });

      return false;
    } catch (error) {
      logger.error(`[SchucoItemScraper] Error clicking order row:`, error);

      try {
        await this.page.screenshot({
          path: path.join(this.downloadPath, 'click-error.png'),
        });
      } catch {
        // Ignoruj
      }

      return false;
    }
  }

  /**
   * Szukaj zamówienia w tabeli i kliknij strzałkę ">" aby wejść w szczegóły
   */
  private async findAndClickOrderInTable(orderNumber: string): Promise<boolean> {
    // Zrób screenshot przed szukaniem
    await this.page.screenshot({
      path: path.join(this.downloadPath, 'before-click-order.png'),
    });

    const clicked = await this.page.evaluate((orderNum) => {
      console.log('Looking for order in table:', orderNum);

      // Sprawdź czy modal filtrów jest otwarty - jeśli tak, zamknij go
      const modal = document.querySelector('[class*="modal"], [role="dialog"]');
      if (modal && modal.querySelector('*')?.textContent?.includes('Filtr')) {
        console.log('Filter modal is open, looking for close button');
        const closeBtn = modal.querySelector('[class*="close"], button[aria-label*="close"], .fa-times, [class*="dismiss"]');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
          return { success: false, method: 'modal-closed', needsRetry: true };
        }
      }

      // Metoda 1: Szukaj wiersza zawierającego numer zamówienia
      // Tabela ma kolumnę "Nr zamówienia" z linkami
      const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
      console.log('Searching through', rows.length, 'rows');

      for (const row of rows) {
        const rowText = row.textContent || '';

        // Sprawdź czy wiersz zawiera numer zamówienia
        if (rowText.includes(orderNum)) {
          console.log('Found row containing order number');

          // Szukaj strzałki ">" na końcu wiersza (przycisk szczegółów)
          // Na stronie Schüco strzałka jest w ostatniej kolumnie
          const arrow = row.querySelector('cx-icon.fa-chevron-right, [class*="chevron"], [class*="arrow-right"], svg[class*="chevron"], .fa-angle-right, .fa-chevron-right');
          if (arrow) {
            console.log('Found chevron/arrow icon, clicking');
            (arrow as HTMLElement).click();
            return { success: true, method: 'row-chevron' };
          }

          // Alternatywnie - szukaj linku ">" lub ostatniego elementu klikalnego
          const cells = row.querySelectorAll('td, [role="cell"]');
          if (cells.length > 0) {
            const lastCell = cells[cells.length - 1];

            // Szukaj ikony/linku w ostatniej komórce
            const clickable = lastCell.querySelector('a, button, cx-icon, svg, [role="button"], [class*="click"]');
            if (clickable) {
              console.log('Clicking element in last cell:', clickable.tagName);
              (clickable as HTMLElement).click();
              return { success: true, method: 'last-cell-click' };
            }

            // Kliknij całą komórkę
            console.log('Clicking last cell directly');
            (lastCell as HTMLElement).click();
            return { success: true, method: 'last-cell-direct' };
          }

          // Alternatywnie - kliknij link z numerem zamówienia
          const orderLink = row.querySelector('a');
          if (orderLink && (orderLink.textContent || '').includes(orderNum)) {
            console.log('Clicking order number link');
            (orderLink as HTMLElement).click();
            return { success: true, method: 'order-link' };
          }
        }
      }

      // Metoda 2: Szukaj linku z dokładnym numerem zamówienia
      const allLinks = Array.from(document.querySelectorAll('a'));
      for (const link of allLinks) {
        const text = (link.textContent || '').trim();
        if (text === orderNum) {
          console.log('Found exact order link:', text);
          // Znajdź strzałkę w tym samym wierszu
          const row = link.closest('tr, [role="row"]');
          if (row) {
            const arrow = row.querySelector('cx-icon.fa-chevron-right, [class*="chevron-right"], .fa-angle-right');
            if (arrow) {
              (arrow as HTMLElement).click();
              return { success: true, method: 'sibling-arrow' };
            }
          }
          // Kliknij sam link
          (link as HTMLElement).click();
          return { success: true, method: 'exact-link' };
        }
      }

      console.log('Order not found in visible rows');
      return { success: false, method: 'not-found', needsRetry: false };
    }, orderNumber);

    logger.info(`[SchucoItemScraper] Find result: ${JSON.stringify(clicked)}`);

    if (clicked.success) {
      logger.info(`[SchucoItemScraper] Clicked order using method: ${clicked.method}`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.page.screenshot({
        path: path.join(this.downloadPath, 'after-click-order.png'),
      });

      return true;
    }

    // Jeśli modal został zamknięty, spróbuj ponownie
    if ('needsRetry' in clicked && clicked.needsRetry) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.findAndClickOrderInTable(orderNumber);
    }

    return false;
  }

  /**
   * Zastosuj filtr "Nr zamówienia" używając dropdowna (nie input tekstowy)
   * Strona Schüco używa dropdowna z listą numerów zamówień
   */
  private async applyOrderNumberFilter(orderNumber: string): Promise<boolean> {
    try {
      logger.info(`[SchucoItemScraper] Applying filter for order: ${orderNumber}`);

      // Metoda 1: Użyj dropdowna "Nr zamówienia"
      // Kliknij dropdown obok labela "Nr zamówienia" (po prawej stronie "równy")
      const dropdownClicked = await this.page.evaluate((orderNum) => {
        console.log('Looking for Nr zamówienia dropdown for:', orderNum);

        // Znajdź wszystkie elementy z tekstem "Nr zamówienia"
        const labels = Array.from(document.querySelectorAll('*'));

        for (const label of labels) {
          // Sprawdź bezpośredni tekst elementu
          const directText = Array.from(label.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => (n.textContent || '').trim())
            .join('');

          if (directText === 'Nr zamówienia') {
            console.log('Found Nr zamówienia label');

            // Szukaj dropdowna w tym samym wierszu/kontenerze
            let container = label.parentElement;
            for (let i = 0; i < 5 && container; i++) {
              // Szukaj dropdownów/selectów
              const dropdowns = container.querySelectorAll('select, [role="listbox"], [role="combobox"], cx-select, ng-select, .dropdown, [class*="select"], [class*="dropdown"]');
              console.log(`Level ${i}: found ${dropdowns.length} dropdowns`);

              // Szukaj drugiego dropdowna (pierwszy to "równy")
              const dropdownArray = Array.from(dropdowns);
              if (dropdownArray.length >= 2) {
                const orderDropdown = dropdownArray[1] as HTMLElement;
                console.log('Found order number dropdown, clicking');
                orderDropdown.click();
                return { success: true, method: 'dropdown-click', needsSelection: true };
              }

              // Szukaj pustego pola (może być custom dropdown)
              const emptyFields = container.querySelectorAll('[class*="placeholder"], [class*="empty"], input[readonly]');
              for (const field of Array.from(emptyFields)) {
                const fieldText = (field as HTMLElement).textContent?.trim() || '';
                const fieldParentText = field.parentElement?.textContent?.trim() || '';
                // Pomiń pole daty
                if (!fieldText.includes('dat') && !fieldParentText.includes('Data zamówienia')) {
                  console.log('Found empty field, clicking');
                  (field as HTMLElement).click();
                  return { success: true, method: 'empty-field-click', needsSelection: true };
                }
              }

              container = container.parentElement;
            }
          }
        }

        // Metoda 2: Szukaj drugiego dropdowna/selecta w sekcji filtrów
        const filterSection = document.querySelector('[class*="filter"], form, [class*="Filter"]');
        if (filterSection) {
          const allDropdowns = filterSection.querySelectorAll('select, [role="listbox"], cx-select, ng-select');
          console.log('Found dropdowns in filter section:', allDropdowns.length);

          // Zwykle: pierwszy = operator daty, drugi = operator nr zamówienia, trzeci = wartość nr zamówienia
          // Ale układ może się różnić
        }

        console.log('Could not find Nr zamówienia dropdown');
        return { success: false, method: 'not-found', needsSelection: false };
      }, orderNumber);

      logger.info(`[SchucoItemScraper] Dropdown click result: ${JSON.stringify(dropdownClicked)}`);

      if (dropdownClicked.success && dropdownClicked.needsSelection) {
        // Poczekaj na otwarcie dropdowna
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wpisz numer zamówienia aby przefiltrować listę
        await this.page.keyboard.type(orderNumber, { delay: 50 });
        await new Promise(resolve => setTimeout(resolve, 300));

        // Kliknij pierwszą opcję która pasuje
        const optionSelected = await this.page.evaluate((orderNum) => {
          // Szukaj opcji w otwartym dropdownie
          const options = Array.from(document.querySelectorAll('[role="option"], option, li, [class*="option"], [class*="item"]'));
          console.log('Found dropdown options:', options.length);

          for (const opt of options) {
            const text = (opt.textContent || '').trim();
            if (text.includes(orderNum) || text === orderNum) {
              console.log('Selecting option:', text);
              (opt as HTMLElement).click();
              return { success: true, selectedText: text };
            }
          }

          // Jeśli nie ma dopasowania, naciśnij Escape aby zamknąć dropdown
          return { success: false, selectedText: '' };
        }, orderNumber);

        logger.info(`[SchucoItemScraper] Option selection result: ${JSON.stringify(optionSelected)}`);

        if (!optionSelected.success) {
          // Zamknij dropdown przez Escape
          await this.page.keyboard.press('Escape');
          await new Promise(resolve => setTimeout(resolve, 300));
          logger.warn(`[SchucoItemScraper] Order number not found in dropdown options`);
          return false;
        }

        // Poczekaj i kliknij "Zmień filtr"
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Kliknij przycisk "Zmień filtr"
      const buttonClicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button, [role="button"], span'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if (text === 'Zmień filtr' || text.includes('Zmień filtr')) {
            console.log('Clicking "Zmień filtr" button');
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (buttonClicked) {
        logger.info(`[SchucoItemScraper] Clicked "Zmień filtr" button`);
      } else {
        logger.warn(`[SchucoItemScraper] Could not find "Zmień filtr" button`);
      }

      // Poczekaj na przeładowanie tabeli
      await new Promise(resolve => setTimeout(resolve, 2000));

      return dropdownClicked.success || buttonClicked;
    } catch (error) {
      logger.warn(`[SchucoItemScraper] Error applying filter:`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Czekaj na załadowanie szczegółów zamówienia
   */
  private async waitForOrderDetails(): Promise<void> {
    logger.info('[SchucoItemScraper] Waiting for order details to load...');

    try {
      // Czekaj na załadowanie - sprawdź czy pojawił się nagłówek zamówienia
      // Format: "< Zamówienie 136781871 — 48/2026/53849"
      await this.page.waitForFunction(
        () => {
          const text = document.body.innerText;
          // Sprawdź czy jest nagłówek z "Zamówienie" i numerem
          return text.includes('Zamówienie') && text.includes('Pozycje zamówienia');
        },
        { timeout: 30000 }
      );

      // Dodatkowe czekanie na załadowanie danych
      await this.page.waitForFunction(
        () => {
          const loadingText = document.body.innerText.includes('Ładowanie danych');
          return !loadingText;
        },
        { timeout: 60000 }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('[SchucoItemScraper] Order details loaded');
    } catch (error) {
      logger.warn('[SchucoItemScraper] Timeout waiting for order details, continuing anyway...');
    }
  }

  /**
   * Pobierz CSV z pozycjami zamówienia
   * @param orderNumber Numer zamówienia do użycia w nazwie pliku (np. "48/2026/53849")
   */
  private async downloadItemsCSV(orderNumber: string): Promise<string | null> {
    logger.info(`[SchucoItemScraper] Downloading items CSV for order: ${orderNumber}`);

    try {
      // Wyczyść folder z poprzednich plików CSV (tylko stare pliki items_*.csv)
      const files = fs.readdirSync(this.downloadPath);
      files.forEach((file) => {
        if (file.endsWith('.csv')) {
          fs.unlinkSync(path.join(this.downloadPath, file));
        }
      });

      // Znajdź przycisk pobierania CSV (strzałka w dół)
      // Selektor jak w głównym scraperze: cx-icon.fa-arrow-down
      const downloadButton = await this.page.waitForSelector(
        'cx-icon.fa-arrow-down, cx-icon.fas.fa-arrow-down, [class*="download"], button[title*="pobierz"], button[title*="eksport"]',
        { timeout: 15000, visible: true }
      );

      if (!downloadButton) {
        logger.warn('[SchucoItemScraper] Download button not found');
        return null;
      }

      // Przewiń do przycisku
      await this.page.evaluate((element) => {
        element.scrollIntoView({ block: 'center' });
      }, downloadButton);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Kliknij przycisk
      await this.page.evaluate((element) => {
        (element as HTMLElement).click();
      }, downloadButton);

      logger.info('[SchucoItemScraper] Download button clicked');

      // Czekaj na pobranie pliku i zmień nazwę na unikalną
      const csvPath = await this.waitForCSVDownloadAndRename(orderNumber);
      return csvPath;
    } catch (error) {
      logger.error('[SchucoItemScraper] Error downloading items CSV:', error);
      return null;
    }
  }

  /**
   * Czekaj na pobranie pliku CSV i zmień jego nazwę na unikalną
   * @param orderNumber Numer zamówienia (np. "48/2026/53849") - zostanie użyty w nazwie pliku
   */
  private async waitForCSVDownloadAndRename(orderNumber: string, maxWait = 60000): Promise<string | null> {
    const checkInterval = 300;
    let elapsed = 0;

    // Stwórz bezpieczną nazwę pliku z numeru zamówienia (zamień / na _)
    const safeOrderNumber = orderNumber.replace(/\//g, '_');
    const targetFileName = `items_${safeOrderNumber}.csv`;

    while (elapsed < maxWait) {
      const files = fs.readdirSync(this.downloadPath);
      // Szukaj nowego pliku CSV (nie .crdownload i nie items_*.csv - to nasze poprzednie pliki)
      const csvFile = files.find((file) =>
        file.endsWith('.csv') &&
        !file.endsWith('.crdownload') &&
        !file.startsWith('items_') // Ignoruj nasze poprzednie pliki
      );

      if (csvFile) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Czekaj na pełny zapis

        const originalPath = path.join(this.downloadPath, csvFile);
        const targetPath = path.join(this.downloadPath, targetFileName);

        // Zmień nazwę pliku na unikalną
        try {
          // Jeśli plik docelowy istnieje, usuń go
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
          fs.renameSync(originalPath, targetPath);
          logger.info(`[SchucoItemScraper] CSV downloaded and renamed: ${csvFile} -> ${targetFileName}`);
          return targetPath;
        } catch (renameError) {
          logger.warn(`[SchucoItemScraper] Could not rename CSV, using original: ${csvFile}`);
          return originalPath;
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    logger.warn('[SchucoItemScraper] CSV download timeout');
    return null;
  }

  /**
   * Wróć do listy zamówień
   */
  private async goBackToList(): Promise<void> {
    logger.info('[SchucoItemScraper] Going back to orders list...');

    try {
      // Szukaj przycisku "wstecz" (< na screenshocie)
      const backClicked = await this.page.evaluate(() => {
        // Szukaj elementu z "<" lub "wstecz" lub strzałki
        const backSelectors = [
          'a[href*="orders"]',
          'button[class*="back"]',
          '[class*="back-button"]',
          'a:has-text("<")',
          '[aria-label*="back"]',
          '[aria-label*="wstecz"]',
        ];

        for (const selector of backSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              (element as HTMLElement).click();
              return true;
            }
          } catch {
            // Ignoruj błędy selektora
          }
        }

        // Alternatywnie szukaj po tekście
        const allElements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text === '<' || text.includes('Wstecz') || text.includes('wstecz')) {
            (el as HTMLElement).click();
            return true;
          }
        }

        return false;
      });

      if (backClicked) {
        logger.info('[SchucoItemScraper] Back button clicked');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }

      // Jeśli nie znaleziono przycisku, użyj nawigacji przeglądarki
      logger.info('[SchucoItemScraper] Using browser back navigation');
      await this.page.goBack({ waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logger.warn('[SchucoItemScraper] Error going back, navigating to orders page directly');

      // Jako fallback, przejdź bezpośrednio do strony zamówień
      try {
        await this.page.goto(
          'https://connect.schueco.com/schueco/pl/purchaseOrders/orders?filters=default&sort=code,false&view=default',
          { waitUntil: 'networkidle0', timeout: 60000 }
        );
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (navError) {
        logger.error('[SchucoItemScraper] Failed to navigate back:', navError);
      }
    }
  }

  /**
   * Pobierz pozycje dla wielu zamówień
   * @param orderNumbers Lista numerów zamówień
   * @param delayBetweenOrders Opóźnienie między zamówieniami (ms)
   * @param onProgress Callback z postępem
   */
  async fetchItemsForMultipleOrders(
    orderNumbers: string[],
    delayBetweenOrders = 3000,
    onProgress?: (current: number, total: number, orderNumber: string) => void
  ): Promise<Map<string, SchucoOrderItemRow[]>> {
    const results = new Map<string, SchucoOrderItemRow[]>();
    const total = orderNumbers.length;

    logger.info(`[SchucoItemScraper] Starting batch fetch for ${total} orders`);

    for (let i = 0; i < orderNumbers.length; i++) {
      const orderNumber = orderNumbers[i];

      // Raportuj postęp
      if (onProgress) {
        onProgress(i + 1, total, orderNumber);
      }

      logger.info(`[SchucoItemScraper] Processing order ${i + 1}/${total}: ${orderNumber}`);

      const items = await this.fetchItemsForOrder(orderNumber);

      if (items && items.length > 0) {
        results.set(orderNumber, items);
        logger.info(`[SchucoItemScraper] Order ${orderNumber}: ${items.length} items`);
      } else {
        logger.warn(`[SchucoItemScraper] Order ${orderNumber}: no items or error`);
      }

      // Opóźnienie między zamówieniami (rate limiting)
      if (i < orderNumbers.length - 1) {
        logger.info(`[SchucoItemScraper] Waiting ${delayBetweenOrders}ms before next order...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenOrders));
      }
    }

    logger.info(`[SchucoItemScraper] Batch fetch complete: ${results.size}/${total} orders with items`);
    return results;
  }
}
