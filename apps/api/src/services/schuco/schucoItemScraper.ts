import { Browser, Page } from 'puppeteer';
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

      // Krok 3: Pobierz CSV z pozycjami
      const csvPath = await this.downloadItemsCSV();
      if (!csvPath) {
        logger.warn(`[SchucoItemScraper] Could not download CSV for order: ${orderNumber}`);
        await this.goBackToList();
        return null;
      }

      // Krok 4: Parsuj CSV
      const items = await this.parser.parseCSV(csvPath);

      // Krok 5: Usuń pobrany plik CSV (cleanup)
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
   * Kliknij w wiersz zamówienia w tabeli
   */
  private async clickOrderRow(orderNumber: string): Promise<boolean> {
    logger.info(`[SchucoItemScraper] Looking for order row: ${orderNumber}`);

    try {
      // Zrób screenshot przed szukaniem
      await this.page.screenshot({
        path: path.join(this.downloadPath, 'before-click-order.png'),
      });
      logger.info(`[SchucoItemScraper] Screenshot saved: before-click-order.png`);

      // Sprawdź aktualny URL
      const currentUrl = this.page.url();
      logger.info(`[SchucoItemScraper] Current URL: ${currentUrl}`);

      // Szukaj wiersza z numerem zamówienia
      // Na stronie Schüco Connect tabela ma linki z numerami zamówień
      const clicked = await this.page.evaluate((orderNum) => {
        console.log('Looking for order:', orderNum);

        // Metoda 1: Szukaj linku z dokładnym tekstem numeru zamówienia
        // Na screenshocie widać że numer zamówienia jest linkiem (np. "48/2026/53849")
        const allLinks = Array.from(document.querySelectorAll('a'));
        console.log('Found all links:', allLinks.length);

        for (const link of allLinks) {
          const text = (link.textContent || '').trim();
          // Szukaj dokładnego dopasowania lub zawierającego numer
          if (text === orderNum || text.includes(orderNum)) {
            console.log('Found order link with text:', text);
            (link as HTMLElement).click();
            return { success: true, method: 'order-link-text' };
          }
        }

        // Metoda 2: Szukaj linku w kolumnie "Nr zamówienia"
        // Szukamy w wierszach tabeli
        const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
        console.log('Found rows:', rows.length);

        for (const row of rows) {
          const rowText = row.textContent || '';
          if (rowText.includes(orderNum)) {
            console.log('Found row with order:', rowText.substring(0, 150));

            // Szukaj linku wewnątrz wiersza
            const links = row.querySelectorAll('a');
            for (const link of Array.from(links)) {
              const linkText = (link.textContent || '').trim();
              if (linkText === orderNum || linkText.includes(orderNum)) {
                console.log('Clicking link in row:', linkText);
                (link as HTMLElement).click();
                return { success: true, method: 'row-link' };
              }
            }

            // Szukaj strzałki ">" na końcu wiersza (przycisk szczegółów)
            const arrow = row.querySelector('[class*="arrow"], [class*="chevron"], svg, cx-icon');
            if (arrow) {
              console.log('Found arrow/icon in row, clicking');
              (arrow as HTMLElement).click();
              return { success: true, method: 'row-arrow' };
            }

            // Kliknij ostatnią komórkę (gdzie jest strzałka ">")
            const cells = row.querySelectorAll('td, [role="cell"]');
            if (cells.length > 0) {
              const lastCell = cells[cells.length - 1];
              const clickableInCell = lastCell.querySelector('a, button, [role="button"]');
              if (clickableInCell) {
                console.log('Clicking element in last cell');
                (clickableInCell as HTMLElement).click();
                return { success: true, method: 'last-cell-element' };
              }
            }
          }
        }

        // Metoda 3: Szukaj przez href zawierający zakodowany numer
        const encodedOrderNum = orderNum.replace(/\//g, '%2F');
        for (const link of allLinks) {
          const href = link.getAttribute('href') || '';
          if (href.includes(encodedOrderNum) || href.includes(orderNum)) {
            console.log('Found order link by href:', href);
            (link as HTMLElement).click();
            return { success: true, method: 'order-link-href' };
          }
        }

        // Metoda 4: Szukaj elementu span/div z tekstem zamówienia i kliknij rodzica
        const textElements = Array.from(document.querySelectorAll('span, div, td'));
        for (const el of textElements) {
          const text = (el.textContent || '').trim();
          if (text === orderNum) {
            console.log('Found exact text match:', el.tagName);
            // Sprawdź czy sam element jest klikalny
            if (el.tagName === 'A' || el.closest('a')) {
              const link = el.tagName === 'A' ? el : el.closest('a');
              (link as HTMLElement).click();
              return { success: true, method: 'text-element-link' };
            }
            // Spróbuj kliknąć element
            (el as HTMLElement).click();
            return { success: true, method: 'text-element-direct' };
          }
        }

        return { success: false, method: 'not-found' };
      }, orderNumber);

      logger.info(`[SchucoItemScraper] Click result: ${JSON.stringify(clicked)}`);

      if (clicked.success) {
        logger.info(`[SchucoItemScraper] Clicked order row using method: ${clicked.method}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Czekaj na nawigację

        // Zrób screenshot po kliknięciu
        await this.page.screenshot({
          path: path.join(this.downloadPath, 'after-click-order.png'),
        });
        logger.info(`[SchucoItemScraper] Screenshot saved: after-click-order.png`);

        return true;
      }

      logger.warn(`[SchucoItemScraper] Could not find order row: ${orderNumber}`);

      // Zrób screenshot dla debugowania
      await this.page.screenshot({
        path: path.join(this.downloadPath, 'order-not-found.png'),
      });

      return false;
    } catch (error) {
      logger.error(`[SchucoItemScraper] Error clicking order row:`, error);

      // Zrób screenshot przy błędzie
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
   */
  private async downloadItemsCSV(): Promise<string | null> {
    logger.info('[SchucoItemScraper] Downloading items CSV...');

    try {
      // Wyczyść folder z poprzednich plików CSV
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

      // Czekaj na pobranie pliku
      const csvPath = await this.waitForCSVDownload();
      return csvPath;
    } catch (error) {
      logger.error('[SchucoItemScraper] Error downloading items CSV:', error);
      return null;
    }
  }

  /**
   * Czekaj na pobranie pliku CSV
   */
  private async waitForCSVDownload(maxWait = 60000): Promise<string | null> {
    const checkInterval = 300;
    let elapsed = 0;

    while (elapsed < maxWait) {
      const files = fs.readdirSync(this.downloadPath);
      const csvFile = files.find((file) => file.endsWith('.csv') && !file.endsWith('.crdownload'));

      if (csvFile) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Czekaj na pełny zapis
        const fullPath = path.join(this.downloadPath, csvFile);
        logger.info(`[SchucoItemScraper] CSV downloaded: ${fullPath}`);
        return fullPath;
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
