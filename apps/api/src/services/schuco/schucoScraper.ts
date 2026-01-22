import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

interface SchucoScraperConfig {
  email: string;
  password: string;
  baseUrl: string;
  headless: boolean;
  downloadPath: string;
  timeout: number;
  filterDays: number; // Liczba dni wstecz dla filtra daty zamówienia
}

export class SchucoScraper {
  private config: SchucoScraperConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: Partial<SchucoScraperConfig> = {}) {
    // Validate required environment variables
    const schucoEmail = process.env.SCHUCO_EMAIL;
    const schucoPassword = process.env.SCHUCO_PASSWORD;

    if (!schucoEmail || !schucoPassword) {
      throw new Error(
        'SCHUCO_EMAIL and SCHUCO_PASSWORD must be set in environment variables. ' +
        'Please configure these values in your .env file.'
      );
    }

    this.config = {
      email: schucoEmail,
      password: schucoPassword,
      baseUrl: process.env.SCHUCO_BASE_URL || 'https://connect.schueco.com/',
      headless: process.env.SCHUCO_HEADLESS === 'true' || false,
      downloadPath: process.env.SCHUCO_DOWNLOAD_PATH || path.join(process.cwd(), 'downloads', 'schuco'),
      timeout: 120000, // Increased from 60s to 120s - Schuco pages are slow
      filterDays: 90, // Domyślnie 90 dni wstecz
      ...config,
    };

    // Ensure download directory exists
    if (!fs.existsSync(this.config.downloadPath)) {
      fs.mkdirSync(this.config.downloadPath, { recursive: true });
    }
  }

  /**
   * Find Chrome executable path
   */
  private findChromeExecutable(): string | undefined {
    // If CHROME_PATH is set in env, use it
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      logger.info(`[SchucoScraper] Using CHROME_PATH: ${process.env.CHROME_PATH}`);
      return process.env.CHROME_PATH;
    }

    // Common Chrome installation paths on Windows
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    ];

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        logger.info(`[SchucoScraper] Found Chrome at: ${chromePath}`);
        return chromePath;
      }
    }

    // Return undefined to let puppeteer use default behavior
    logger.warn('[SchucoScraper] Chrome not found in standard paths, letting puppeteer decide');
    return undefined;
  }

  /**
   * Initialize browser and page
   */
  private async initializeBrowser(): Promise<void> {
    logger.info('[SchucoScraper] Initializing browser...');

    try {
      // Find Chrome executable
      const chromeExecutablePath = this.findChromeExecutable();

      // Resolve absolute path for download directory
      const absoluteDownloadPath = path.resolve(this.config.downloadPath);
      logger.info(`[SchucoScraper] Download path: ${absoluteDownloadPath}`);

      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--start-maximized',
          '--disable-notifications',
          // Allow downloads
          '--safebrowsing-disable-download-protection',
          '--disable-features=SafeBrowsingEnhancedProtection',
          `--download.default_directory=${absoluteDownloadPath}`,
        ],
      };

      // Add executablePath or channel based on whether Chrome was found
      if (chromeExecutablePath) {
        launchOptions.executablePath = chromeExecutablePath;
      } else {
        // Use 'chrome' channel to let puppeteer find Chrome automatically
        launchOptions.channel = 'chrome';
      }

      this.browser = await puppeteer.launch(launchOptions);

      this.page = await this.browser.newPage();

      // Close the default blank page that Puppeteer creates
      const pages = await this.browser.pages();
      if (pages.length > 1) {
        // Close the first page (default blank), keep our newly created one
        await pages[0].close();
      }

      // Set viewport - like Python: driver.set_window_size() is implicit with --start-maximized
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Configure download behavior using CDP
      const client = await this.page.createCDPSession();

      // Use Browser.setDownloadBehavior for newer Chrome versions
      await client.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: absoluteDownloadPath,
        eventsEnabled: true,
      });

      // Also set Page download behavior as fallback
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: absoluteDownloadPath,
      });

      logger.info(`[SchucoScraper] Browser initialized with download path: ${absoluteDownloadPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('[SchucoScraper] Failed to initialize browser', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Cleanup any partially initialized resources
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (closeError) {
          logger.warn('[SchucoScraper] Error closing browser during cleanup', {
            error: closeError instanceof Error ? closeError.message : String(closeError),
          });
        }
        this.browser = null;
      }
      this.page = null;

      // Throw a more user-friendly error
      throw new Error(
        `Failed to initialize Schuco scraper: ${errorMessage}. ` +
        'Please ensure Chrome/Chromium is installed and accessible. ' +
        'You can set CHROME_PATH environment variable to specify Chrome location.'
      );
    }
  }

  /**
   * Login to Schuco website with retry logic
   */
  private async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[SchucoScraper] Login attempt ${attempt}/${maxRetries}...`);
        await this.performLogin();
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn(`[SchucoScraper] Login attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          logger.info('[SchucoScraper] Waiting 5s before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Reload page for fresh attempt
          try {
            await this.page.goto(this.config.baseUrl, {
              waitUntil: 'domcontentloaded',
              timeout: this.config.timeout,
            });
          } catch {
            logger.warn('[SchucoScraper] Page reload failed, continuing...');
          }
        }
      }
    }

    throw lastError || new Error('Login failed after all retries');
  }

  /**
   * Perform single login attempt
   */
  private async performLogin(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info('[SchucoScraper] Navigating to login page...');
    await this.page.goto(this.config.baseUrl, {
      waitUntil: 'domcontentloaded', // Zmienione z networkidle2 - szybsze i bardziej niezawodne
      timeout: this.config.timeout,
    });

    // Wait for page to be interactive
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('[SchucoScraper] Filling login form...');

    // Wait for username input with visibility check
    const usernameSelector = '#username';
    await this.page.waitForSelector(usernameSelector, {
      timeout: this.config.timeout,
      visible: true,
    });

    // Clear any existing value and type new one
    await this.page.click(usernameSelector, { clickCount: 3 }); // Select all
    await this.page.type(usernameSelector, this.config.email, {
      delay: 30, // Faster typing
    });

    // Small delay between fields
    await new Promise(resolve => setTimeout(resolve, 500));

    // Wait for password input with visibility check
    const passwordSelector = '#password';
    await this.page.waitForSelector(passwordSelector, {
      timeout: this.config.timeout,
      visible: true,
    });

    // Clear any existing value and type new one
    await this.page.click(passwordSelector, { clickCount: 3 }); // Select all
    await this.page.type(passwordSelector, this.config.password, {
      delay: 30, // Faster typing
    });

    // Small delay before submit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find and click submit button
    logger.info('[SchucoScraper] Submitting login form...');

    // Try multiple selectors for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.login-btn',
      '#kc-login',
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await this.page.$(selector);
      if (submitButton) {
        logger.info(`[SchucoScraper] Found submit button with selector: ${selector}`);
        break;
      }
    }

    if (!submitButton) {
      // Take screenshot for debugging
      await this.page.screenshot({
        path: path.join(this.config.downloadPath, 'login-no-submit-button.png'),
      });
      throw new Error('Login submit button not found');
    }

    // Click and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: this.config.timeout }),
      submitButton.click(),
    ]);

    // Wait for login form to disappear (means login successful)
    try {
      await this.page.waitForSelector('#username', { hidden: true, timeout: 15000 });
      logger.info('[SchucoScraper] Login form disappeared - login successful');
    } catch {
      // Check if we're on a different page (login might have succeeded)
      const currentUrl = this.page.url();
      if (currentUrl.includes('purchaseOrders') || currentUrl.includes('dashboard')) {
        logger.info('[SchucoScraper] Redirected to app - login successful');
      } else {
        logger.warn('[SchucoScraper] Could not verify login, current URL: ' + currentUrl);
      }
    }

    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info('[SchucoScraper] Login completed');

    // Take screenshot for debugging
    await this.page.screenshot({
      path: path.join(this.config.downloadPath, 'after-login.png'),
    });
  }

  /**
   * Navigate to orders page with date filter and retry logic
   */
  private async navigateToOrders(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const ordersUrl = `https://connect.schueco.com/schueco/pl/purchaseOrders/orders?filters=default&sort=code,false&view=default`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[SchucoScraper] Navigating to orders page (attempt ${attempt}/${maxRetries})...`);
        logger.info(`[SchucoScraper] Orders URL: ${ordersUrl}`);

        await this.page.goto(ordersUrl, {
          waitUntil: 'domcontentloaded', // Szybsze niż networkidle2
          timeout: this.config.timeout,
        });

        // Czekaj na załadowanie strony SPA - strona Schuco jest dynamiczna
        // Próbuj kilku selektorów które mogą wskazywać że strona się załadowała
        logger.info('[SchucoScraper] Waiting for page content to load (SPA)...');

        try {
          // Czekaj na jakikolwiek element tabeli lub głównego kontenera
          await this.page.waitForSelector('table, [class*="orders"], [class*="table"], .ag-root, .MuiTable', {
            timeout: 30000,
            visible: true,
          });
          logger.info('[SchucoScraper] Found table/orders element');
        } catch {
          // Jeśli nie znaleziono tabeli, poczekaj na ogólne załadowanie
          logger.info('[SchucoScraper] Table not found, waiting additional 5s for SPA to load...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Verify we're on the orders page
        const pageContent = await this.page.content();
        if (pageContent.includes('Zamówienia') || pageContent.includes('purchaseOrders') || pageContent.includes('orders')) {
          logger.info('[SchucoScraper] Orders page loaded successfully');

          // Take screenshot for debugging
          await this.page.screenshot({
            path: path.join(this.config.downloadPath, 'orders-page.png'),
          });

          // Ustaw filtr daty (domyślnie 90 dni wstecz)
          await this.setDateFilter();

          return; // Success
        }

        throw new Error('Orders page content not found');
      } catch (error) {
        logger.warn(`[SchucoScraper] Navigation attempt ${attempt} failed: ${(error as Error).message}`);

        if (attempt < maxRetries) {
          logger.info('[SchucoScraper] Waiting 5s before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Set date filter to limit data and speed up loading
   * Interakcja z filtrem "Data zamówienia" na stronie Schuco
   * Używa wartości filterDays z konfiguracji (domyślnie 90 dni)
   *
   * Struktura filtra na stronie Schuco (custom dropdown, nie natywny select):
   * - Dropdown "w dniu" z opcjami: "w dniu", "pomiędzy", "nie w dniu", "przed", "w dniu lub przed", "po"
   * - Input daty w formacie YYYY-MM-DD
   * - Filtr stosuje się automatycznie po zmianie
   */
  private async setDateFilter(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      const filterDays = this.config.filterDays;
      logger.info(`[SchucoScraper] Setting date filter to last ${filterDays} days...`);

      // Oblicz datę X dni temu
      const filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - filterDays);

      // Format daty - Schuco używa YYYY-MM-DD
      const year = filterDate.getFullYear();
      const month = String(filterDate.getMonth() + 1).padStart(2, '0');
      const day = String(filterDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      logger.info(`[SchucoScraper] Filter date: ${dateStr} (${filterDays} days back)`);

      // Czekaj na załadowanie formularza filtrów
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Pobierz aktualną liczbę pozycji przed filtrowaniem
      const initialCount = await this.getRecordCount();
      logger.info(`[SchucoScraper] Initial record count: ${initialCount}`);

      // KROK 1: Znajdź dropdown "Data zamówienia" i kliknij aby otworzyć
      // Dropdown wyświetla "w dniu" i jest pierwszym dropdownem w sekcji filtrów
      // Szukamy elementu z tekstem "w dniu" który jest klikalny

      logger.info('[SchucoScraper] Looking for date filter dropdown...');

      // Znajdź dropdown z tekstem "w dniu" - to jest custom dropdown
      const dropdownClicked = await this.page.evaluate(() => {
        // Szukaj wszystkich elementów które mogą być dropdownem
        const elements = Array.from(document.querySelectorAll('div, span, button'));
        for (const el of elements) {
          const text = el.textContent?.trim();
          // Dropdown z "w dniu" w sekcji "Data zamówienia"
          if (text === 'w dniu' && el.closest('[class*="filter"], [class*="header"], [class*="column"]')) {
            (el as HTMLElement).click();
            return true;
          }
        }
        // Fallback - szukaj select elementu
        const select = document.querySelector('select');
        if (select) {
          select.click();
          return true;
        }
        return false;
      });

      if (dropdownClicked) {
        logger.info('[SchucoScraper] Clicked dropdown to open options');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // KROK 2: Kliknij opcję "po" z rozwiniętej listy
        const optionClicked = await this.page.evaluate(() => {
          // Szukaj opcji "po" w otwartej liście
          const options = Array.from(document.querySelectorAll('li, div[role="option"], span, div'));
          for (const opt of options) {
            const text = opt.textContent?.trim().toLowerCase();
            if (text === 'po') {
              (opt as HTMLElement).click();
              return 'po';
            }
          }
          // Zwróć dostępne opcje dla debugowania
          const visibleOptions: string[] = [];
          document.querySelectorAll('li, div[role="option"]').forEach(el => {
            const t = el.textContent?.trim();
            if (t && t.length < 30) visibleOptions.push(t);
          });
          return visibleOptions.join(', ') || 'no options found';
        });

        if (optionClicked === 'po') {
          logger.info('[SchucoScraper] Selected option "po" from dropdown');
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          logger.warn(`[SchucoScraper] Could not select "po". Available: ${optionClicked}`);
        }
      } else {
        logger.warn('[SchucoScraper] Could not find/click dropdown');
      }

      // Screenshot po wyborze z dropdown
      await this.page.screenshot({
        path: path.join(this.config.downloadPath, 'after-dropdown-select.png'),
      });

      // KROK 3: Znajdź i wypełnij pole daty
      logger.info('[SchucoScraper] Looking for date input...');

      // Znajdź input daty - szukaj po placeholder lub po położeniu obok dropdown
      const dateInputFound = await this.page.evaluate((dateValue: string) => {
        // Szukaj inputa z placeholderem zawierającym "dat" lub "Wybierz"
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
        for (const input of inputs) {
          const inp = input as HTMLInputElement;
          const placeholder = inp.placeholder?.toLowerCase() || '';
          const value = inp.value || '';

          // Input daty ma placeholder "Wybierz datę..." lub już zawiera datę
          if (placeholder.includes('dat') ||
              placeholder.includes('wybierz') ||
              /^\d{4}-\d{2}-\d{2}$/.test(value) ||
              /^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
            // Wyczyść i wpisz nową datę
            inp.focus();
            inp.select();
            document.execCommand('selectAll');
            document.execCommand('insertText', false, dateValue);
            return true;
          }
        }
        return false;
      }, dateStr);

      if (dateInputFound) {
        logger.info(`[SchucoScraper] Date entered: ${dateStr}`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Wciśnij Enter aby zatwierdzić
        await this.page.keyboard.press('Enter');
        logger.info('[SchucoScraper] Pressed Enter to apply filter');
      } else {
        logger.warn('[SchucoScraper] Date input not found');
      }

      // KROK 4: Czekaj na załadowanie przefiltrowanych danych
      logger.info('[SchucoScraper] Waiting for filtered data to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Czekaj na zniknięcie loadera jeśli jest
      try {
        await this.page.waitForFunction(
          () => !document.body.innerText.includes('Ładowanie danych'),
          { timeout: 60000 }
        );
      } catch {
        logger.info('[SchucoScraper] No loading indicator or timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Sprawdź nową liczbę rekordów
      const filteredCount = await this.getRecordCount();
      logger.info(`[SchucoScraper] Record count after filter: ${initialCount} -> ${filteredCount}`);

      if (filteredCount > 0 && filteredCount < initialCount) {
        logger.info(`[SchucoScraper] Filter applied successfully! Reduced from ${initialCount} to ${filteredCount}`);
      } else if (filteredCount === initialCount) {
        logger.warn('[SchucoScraper] Record count unchanged - filter may not have been applied');
      }

      // Screenshot po ustawieniu filtra
      await this.page.screenshot({
        path: path.join(this.config.downloadPath, 'after-date-filter.png'),
      });

    } catch (error) {
      logger.warn(`[SchucoScraper] Failed to set date filter: ${(error as Error).message}`);
      logger.info('[SchucoScraper] Proceeding without date filter...');

      try {
        await this.page?.screenshot({
          path: path.join(this.config.downloadPath, 'date-filter-error.png'),
        });
      } catch {
        // Ignoruj błąd screenshota
      }
    }
  }

  /**
   * Pobierz aktualną liczbę rekordów z tabeli
   * Na stronie Schuco jest tekst "1734 poz." pokazujący liczbę
   */
  private async getRecordCount(): Promise<number> {
    if (!this.page) return 0;

    try {
      const countText = await this.page.evaluate(() => {
        // Szukaj tekstu z liczbą pozycji, np. "1734 poz."
        const bodyText = document.body.innerText;
        const match = bodyText.match(/(\d+)\s*poz\./);
        return match ? match[1] : null;
      });

      if (countText) {
        const count = parseInt(countText, 10);
        if (!isNaN(count)) {
          return count;
        }
      }
    } catch (error) {
      logger.warn(`[SchucoScraper] Could not get record count: ${(error as Error).message}`);
    }

    return 0;
  }

  /**
   * Download CSV file by clicking the download button
   */
  private async downloadCSV(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info('[SchucoScraper] Looking for download button...');

    // Clear download directory before downloading
    const files = fs.readdirSync(this.config.downloadPath);
    files.forEach((file) => {
      if (file.endsWith('.csv')) {
        fs.unlinkSync(path.join(this.config.downloadPath, file));
      }
    });

    // Step 1: Wait for data to load (the page shows "Ładowanie danych" spinner)
    logger.info('[SchucoScraper] Waiting for data to load...');

    // Take screenshot before waiting for debug
    await this.page.screenshot({
      path: path.join(this.config.downloadPath, 'before-table-wait.png'),
    });

    // Wait for loading spinner to disappear - check if "Ładowanie danych" text is gone
    try {
      await this.page.waitForFunction(
        () => {
          // Check if loading text is present
          const loadingText = document.body.innerText.includes('Ładowanie danych');
          return !loadingText;
        },
        { timeout: 120000 } // Increased to 120 seconds - Schuco data loads very slowly
      );
      logger.info('[SchucoScraper] Loading spinner disappeared');
    } catch {
      logger.warn('[SchucoScraper] Loading wait timed out, checking if data loaded anyway...');
    }

    // Additional wait for table to fully render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take screenshot after data load
    await this.page.screenshot({
      path: path.join(this.config.downloadPath, 'after-data-load.png'),
    });

    logger.info('[SchucoScraper] Data loaded');

    // Step 2: Find download icon - EXACTLY like Python script
    // Python: wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "cx-icon.fa-arrow-down, cx-icon.fas.fa-arrow-down")))
    logger.info('[SchucoScraper] Searching for download icon...');

    const downloadButton = await this.page.waitForSelector(
      'cx-icon.fa-arrow-down, cx-icon.fas.fa-arrow-down',
      {
        timeout: 15000,
        visible: true
      }
    );

    if (!downloadButton) {
      throw new Error('Download button not found');
    }

    logger.info('[SchucoScraper] Download icon found');

    // Step 3: Scroll to element - EXACTLY like Python script
    // Python: driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", download_icon)
    await this.page.evaluate((element) => {
      element.scrollIntoView({ block: 'center' });
    }, downloadButton);

    // Python: time.sleep(0.5)
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.info('[SchucoScraper] Scrolled to download button');

    // Step 4: Click with JavaScript - EXACTLY like Python script
    // Python: driver.execute_script("arguments[0].click();", download_icon)
    await this.page.evaluate((element) => {
      (element as HTMLElement).click();
    }, downloadButton);

    logger.info('[SchucoScraper] Download button clicked');

    // Wait for file to be downloaded
    logger.info('[SchucoScraper] Waiting for CSV file to download...');
    await this.waitForDownload();

    // Find the downloaded CSV file - use absolute path
    const absoluteDownloadPath = path.resolve(this.config.downloadPath);
    const downloadedFiles = fs.readdirSync(absoluteDownloadPath).filter((file) => file.endsWith('.csv'));

    if (downloadedFiles.length === 0) {
      throw new Error('No CSV file was downloaded');
    }

    const csvFilePath = path.join(absoluteDownloadPath, downloadedFiles[0]);
    logger.info(`[SchucoScraper] CSV file downloaded: ${csvFilePath}`);

    return csvFilePath;
  }

  /**
   * Wait for file download to complete
   */
  private async waitForDownload(maxWait = 180000): Promise<void> {
    const checkInterval = 300; // Reduced from 500ms to 300ms - check more frequently
    let elapsed = 0;

    while (elapsed < maxWait) {
      const files = fs.readdirSync(this.config.downloadPath);
      const csvFile = files.find((file) => file.endsWith('.csv') && !file.endsWith('.crdownload'));

      if (csvFile) {
        // Wait a bit to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms to 500ms
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    throw new Error(`Download timeout after ${maxWait}ms`);
  }

  /**
   * Main scraping function
   */
  async scrapeDeliveries(): Promise<string> {
    const startTime = Date.now();

    try {
      logger.info('[SchucoScraper] Starting scrape process...');

      logger.info('[SchucoScraper] Step 1/4: Initializing browser...');
      await this.initializeBrowser();

      logger.info('[SchucoScraper] Step 2/4: Logging in...');
      await this.login();

      logger.info('[SchucoScraper] Step 3/4: Navigating to orders...');
      await this.navigateToOrders();

      logger.info('[SchucoScraper] Step 4/4: Downloading CSV...');
      const csvFilePath = await this.downloadCSV();

      const duration = Date.now() - startTime;
      logger.info(`[SchucoScraper] ✅ Scrape completed successfully in ${duration}ms`);

      return csvFilePath;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[SchucoScraper] ❌ Scrape failed after ${duration}ms:`, error);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Clean up browser resources with timeout
   * Public method to allow external cancellation
   */
  async close(): Promise<void> {
    if (this.browser) {
      logger.info('[SchucoScraper] Closing browser...');
      try {
        // Add timeout to browser.close() to prevent hanging
        await Promise.race([
          this.browser.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser close timeout')), 10000)
          ),
        ]);
        logger.info('[SchucoScraper] Browser closed successfully');
      } catch (error) {
        logger.warn(`[SchucoScraper] Error closing browser (may already be closed): ${error}`);
        // Force kill any remaining processes
        try {
          const browserProcess = this.browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
          }
        } catch {
          // Ignore kill errors
        }
      }
      this.browser = null;
      this.page = null;
    }
  }
}
