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
}

export class SchucoScraper {
  private config: SchucoScraperConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: Partial<SchucoScraperConfig> = {}) {
    this.config = {
      email: process.env.SCHUCO_EMAIL || 'krzysztof@markbud.pl',
      password: process.env.SCHUCO_PASSWORD || 'Markbud2020',
      baseUrl: process.env.SCHUCO_BASE_URL || 'https://connect.schueco.com/',
      headless: process.env.SCHUCO_HEADLESS === 'true' || false,
      downloadPath: process.env.SCHUCO_DOWNLOAD_PATH || path.join(process.cwd(), 'downloads', 'schuco'),
      timeout: 60000,
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
  }

  /**
   * Login to Schuco website
   */
  private async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info('[SchucoScraper] Navigating to login page...');
    await this.page.goto(this.config.baseUrl, {
      waitUntil: 'networkidle2', // Like Python - wait for page to fully load
      timeout: this.config.timeout,
    });

    logger.info('[SchucoScraper] Filling login form...');

    // Wait for username input (ID: username) - based on working Python script
    await this.page.waitForSelector('#username', {
      timeout: this.config.timeout,
    });
    await this.page.type('#username', this.config.email, {
      delay: 50, // Reduced from 100ms to 50ms
    });

    // Wait for password input (ID: password) - based on working Python script
    await this.page.waitForSelector('#password', {
      timeout: this.config.timeout,
    });
    await this.page.type('#password', this.config.password, {
      delay: 50, // Reduced from 100ms to 50ms
    });

    // Find and click submit button
    logger.info('[SchucoScraper] Submitting login form...');
    const submitButton = await this.page.$('button[type="submit"]');
    if (!submitButton) {
      throw new Error('Login submit button not found');
    }

    // Click and wait for navigation - like Python script waits for login
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.config.timeout }),
      submitButton.click(),
    ]);

    // Python: wait.until(EC.invisibility_of_element_located((By.ID, "username")))
    // Wait for login form to disappear (means login successful)
    try {
      await this.page.waitForSelector('#username', { hidden: true, timeout: 10000 });
      logger.info('[SchucoScraper] Login form disappeared - login successful');
    } catch (error) {
      logger.warn('[SchucoScraper] Could not verify login form disappeared, continuing...');
    }

    // Python: time.sleep(2) after login
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('[SchucoScraper] Login completed');

    // Take screenshot for debugging
    if (!this.config.headless) {
      await this.page.screenshot({
        path: path.join(this.config.downloadPath, 'after-login.png'),
      });
    }
  }

  /**
   * Navigate to orders page with date filter (6 months back)
   */
  private async navigateToOrders(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info('[SchucoScraper] Navigating to orders page...');

    // Use the orders URL from working Python script - with default filters
    const ordersUrl = `https://connect.schueco.com/schueco/pl/purchaseOrders/orders?filters=default&sort=code,false&view=default`;

    logger.info(`[SchucoScraper] Orders URL: ${ordersUrl}`);

    await this.page.goto(ordersUrl, {
      waitUntil: 'networkidle2', // Like Python - wait for page to fully load
      timeout: this.config.timeout,
    });

    logger.info('[SchucoScraper] Orders page loaded');

    // Take screenshot for debugging
    if (!this.config.headless) {
      await this.page.screenshot({
        path: path.join(this.config.downloadPath, 'orders-page.png'),
      });
    }
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
        { timeout: 60000 } // 60 seconds for data to load
      );
      logger.info('[SchucoScraper] Loading spinner disappeared');
    } catch (error) {
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
  private async waitForDownload(maxWait = 120000): Promise<void> {
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
      await this.cleanup();
    }
  }

  /**
   * Clean up browser resources with timeout
   */
  private async cleanup(): Promise<void> {
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
        } catch (killError) {
          // Ignore kill errors
        }
      }
      this.browser = null;
      this.page = null;
    }
  }
}
