import puppeteer from 'puppeteer';

async function checkConsoleErrors() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleMessages = [];
  const errors = [];
  const requestErrors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });

    if (type === 'error' || type === 'warning') {
      // Skip WebSocket JSHandle errors
      if (!text.includes('WebSocket') || !text.includes('JSHandle')) {
        console.log(`[${type.toUpperCase()}] ${text}`);
        errors.push({ type, text });
      }
    }
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    errors.push({ type: 'pageerror', text: error.message });
  });

  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400) {
      console.log(`[HTTP ${status}] ${url}`);
      requestErrors.push({ status, url });
    }
  });

  try {
    console.log('📄 Testing homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📄 Testing /dostawy page...');
    await page.goto('http://localhost:3000/dostawy', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📄 Testing /magazyn page...');
    await page.goto('http://localhost:3000/magazyn', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📄 Testing /magazyn/profile-na-dostawy page...');
    await page.goto('http://localhost:3000/magazyn/profile-na-dostawy', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n\n=== SUMMARY ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors/Warnings: ${errors.length}`);
    console.log(`Failed HTTP requests: ${requestErrors.length}`);

    if (requestErrors.length > 0) {
      console.log('\n=== FAILED HTTP REQUESTS ===');
      requestErrors.forEach((req, idx) => {
        console.log(`${idx + 1}. [${req.status}] ${req.url}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n=== ERRORS/WARNINGS DETAILS ===');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.type}] ${err.text}`);
      });
    } else {
      console.log('\n✅ No errors or warnings found!');
    }
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors();
