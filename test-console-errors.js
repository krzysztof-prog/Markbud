/**
 * Test Console Errors - sprawdza błędy JavaScript na stronach aplikacji
 * Używa Puppeteer do automatycznego testowania
 */

const puppeteer = require('puppeteer');

const PAGES_TO_TEST = [
  { name: 'Strona główna', url: 'http://localhost:3000' },
  { name: 'Dostawy', url: 'http://localhost:3000/dostawy' },
  { name: 'Magazyn', url: 'http://localhost:3000/magazyn' },
  { name: 'Zlecenia', url: 'http://localhost:3000/zlecenia' },
  { name: 'Importy', url: 'http://localhost:3000/importy' },
  { name: 'Ustawienia', url: 'http://localhost:3000/ustawienia' },
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

function getSeverity(message) {
  const msg = message.toLowerCase();
  if (msg.includes('error') || msg.includes('failed') || msg.includes('cannot')) {
    return 'CRITICAL';
  }
  if (msg.includes('warning') || msg.includes('deprecated')) {
    return 'HIGH';
  }
  if (msg.includes('info')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

async function testPage(page, pageInfo) {
  const errors = [];
  const warnings = [];
  const networkErrors = [];

  // Przechwytuj błędy konsoli
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push({ type: 'console', message: text });
    } else if (type === 'warning') {
      warnings.push({ type: 'console', message: text });
    }
  });

  // Przechwytuj błędy JS
  page.on('pageerror', (error) => {
    errors.push({ type: 'javascript', message: error.message, stack: error.stack });
  });

  // Przechwytuj błędy sieci
  page.on('requestfailed', (request) => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText || 'Unknown error',
    });
  });

  log(COLORS.blue, `\n${'='.repeat(80)}`);
  log(COLORS.bright, `Testing: ${pageInfo.name}`);
  log(COLORS.cyan, `URL: ${pageInfo.url}`);
  log(COLORS.blue, `${'='.repeat(80)}\n`);

  try {
    // Nawiguj do strony z timeout 60s
    await page.goto(pageInfo.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Czekaj dodatkowe 2s na React hydration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Raportuj wyniki
    if (errors.length === 0 && warnings.length === 0 && networkErrors.length === 0) {
      log(COLORS.green, '✅ Brak błędów na stronie!');
    } else {
      // Błędy konsoli
      if (errors.length > 0) {
        log(COLORS.red, `\n❌ Błędy konsoli (${errors.length}):`);
        errors.forEach((err, i) => {
          const severity = getSeverity(err.message);
          const severityColor = severity === 'CRITICAL' ? COLORS.red : severity === 'HIGH' ? COLORS.yellow : COLORS.magenta;
          log(severityColor, `\n  [${i + 1}] [${severity}] ${err.type.toUpperCase()}`);
          console.log(`  ${err.message}`);
          if (err.stack) {
            console.log(`  Stack: ${err.stack.split('\n')[0]}`);
          }
        });
      }

      // Ostrzeżenia
      if (warnings.length > 0) {
        log(COLORS.yellow, `\n⚠️  Ostrzeżenia (${warnings.length}):`);
        warnings.forEach((warn, i) => {
          log(COLORS.yellow, `  [${i + 1}] ${warn.message}`);
        });
      }

      // Błędy sieci
      if (networkErrors.length > 0) {
        log(COLORS.magenta, `\n🌐 Błędy sieci (${networkErrors.length}):`);
        networkErrors.forEach((netErr, i) => {
          console.log(`  [${i + 1}] ${netErr.method} ${netErr.url}`);
          console.log(`      Error: ${netErr.error}`);
        });
      }
    }

    return {
      page: pageInfo.name,
      url: pageInfo.url,
      errors,
      warnings,
      networkErrors,
      status: 'success',
    };
  } catch (error) {
    log(COLORS.red, `\n❌ Błąd ładowania strony: ${error.message}`);
    return {
      page: pageInfo.name,
      url: pageInfo.url,
      errors: [{ type: 'page-load', message: error.message }],
      warnings: [],
      networkErrors: [],
      status: 'failed',
    };
  }
}

async function main() {
  log(COLORS.cyan, '\n' + '='.repeat(80));
  log(COLORS.bright, '🔍 AKROBUD - Test błędów konsoli i sieci');
  log(COLORS.cyan, '='.repeat(80) + '\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  try {
    const page = await browser.newPage();

    // Ustaw viewport
    await page.setViewport({ width: 1920, height: 1080 });

    for (const pageInfo of PAGES_TO_TEST) {
      const result = await testPage(page, pageInfo);
      results.push(result);

      // Pauza między stronami
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Podsumowanie
    log(COLORS.cyan, '\n\n' + '='.repeat(80));
    log(COLORS.bright, '📊 PODSUMOWANIE');
    log(COLORS.cyan, '='.repeat(80) + '\n');

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalNetworkErrors = results.reduce((sum, r) => sum + r.networkErrors.length, 0);

    results.forEach((result) => {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      const errorCount = result.errors.length + result.networkErrors.length;
      const color = errorCount === 0 ? COLORS.green : errorCount < 5 ? COLORS.yellow : COLORS.red;

      log(color, `${statusIcon} ${result.page.padEnd(20)} - Errors: ${errorCount}, Warnings: ${result.warnings.length}`);
    });

    log(COLORS.cyan, '\n' + '-'.repeat(80));
    log(COLORS.bright, `Łączne błędy: ${totalErrors}`);
    log(COLORS.bright, `Łączne ostrzeżenia: ${totalWarnings}`);
    log(COLORS.bright, `Łączne błędy sieci: ${totalNetworkErrors}`);
    log(COLORS.cyan, '-'.repeat(80) + '\n');

    // Rekomendacje
    if (totalErrors > 0 || totalNetworkErrors > 0) {
      log(COLORS.yellow, '💡 REKOMENDACJE:');

      const hasApiErrors = results.some(r =>
        r.networkErrors.some(e => e.url.includes('localhost:4000'))
      );

      if (hasApiErrors) {
        log(COLORS.yellow, '  • Uruchom backend API na porcie 4000');
      }

      const hasCriticalErrors = results.some(r =>
        r.errors.some(e => getSeverity(e.message) === 'CRITICAL')
      );

      if (hasCriticalErrors) {
        log(COLORS.red, '  • Napraw krytyczne błędy JavaScript przed deploymentem');
      }

      log(COLORS.cyan, '');
    } else {
      log(COLORS.green, '✨ Aplikacja działa bez błędów JavaScript!\n');
    }

  } catch (error) {
    log(COLORS.red, `\n❌ Błąd podczas testowania: ${error.message}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
