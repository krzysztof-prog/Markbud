const fs = require('fs');
const pdf = require('./apps/api/node_modules/pdf-parse');

const filepath = process.argv[2] || 'C:\\DEV_DATA\\ceny\\D3088,D3089    15.01  II.pdf';

async function main() {
  console.log(`Parsing: ${filepath}`);

  if (!fs.existsSync(filepath)) {
    console.log('PLIK NIE ISTNIEJE!');
    return;
  }

  const dataBuffer = fs.readFileSync(filepath);
  const data = await pdf(dataBuffer);

  console.log('\n=== RAW TEXT (pierwsze 3000 znaków) ===');
  console.log(data.text.substring(0, 3000));
  console.log('\n=== KONIEC RAW TEXT ===');

  // Pokaż linie z liczbami
  console.log('\n=== LINIE Z LICZBAMI ===');
  const lines = data.text.split('\n');
  lines.forEach((line, i) => {
    if (/\d+[,\.]\d{2}/.test(line)) {
      console.log(`  L${i}: "${line.trim()}"`);
    }
  });

  // Spróbuj każdy wzorzec
  const text = data.text;

  console.log('\n=== TEST WZORCÓW extractSumaNetto ===');

  // Wzorzec 1: Towar
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]d{2})\s+([\d\s]+[,.]\d{2})/i);
  console.log(`1. Towar: ${towarMatch ? towarMatch[1] : 'NIE'}`);

  // Wzorzec 2: EUR Podsumowanie
  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  console.log(`2. EUR Podsumowanie: ${eurPodsumowanieMatch ? eurPodsumowanieMatch[2] : 'NIE'}`);

  // Wzorzec 3: Suma netto VAT brutto
  const sumaEurMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  console.log(`3. Suma EUR: ${sumaEurMatch ? sumaEurMatch[1] : 'NIE'}`);

  // Wzorzec 4: Suma netto
  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  console.log(`4. Suma netto: ${nettoMatch ? nettoMatch[1] : 'NIE'}`);

  // Wzorzec 5: Sklejone
  const sklejoneMatch = text.match(/(\d+[,.]\d{2})[\s\n\r]+(\d+[,.]\d{2})(\d+[,.]\d{2})/);
  console.log(`5. Sklejone: ${sklejoneMatch ? sklejoneMatch[2] : 'NIE'}`);

  // Wzorzec 6: Triple
  const tripleMatch = text.match(/([\d]+[,.][d]{2})\s+([\d]+[,.][d]{2})\s+([\d]+[,.][d]{2})/);
  console.log(`6. Triple: ${tripleMatch ? tripleMatch[1] : 'NIE'}`);

  // Szukaj "Suma" gdziekolwiek
  console.log('\n=== SZUKAM "Suma" / "SUMA" / "netto" / "brutto" ===');
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    if (lower.includes('suma') || lower.includes('netto') || lower.includes('brutto') || lower.includes('razem') || lower.includes('total')) {
      console.log(`  L${i}: "${line.trim()}"`);
    }
  });

  // Szukaj EUR/€
  console.log('\n=== WALUTA ===');
  if (text.includes('€')) console.log('Znaleziono: €');
  if (text.includes('EUR')) console.log('Znaleziono: EUR');
  if (text.includes('PLN')) console.log('Znaleziono: PLN');
  if (text.includes('zł')) console.log('Znaleziono: zł');

  // Szukaj 5-cyfrowego numeru
  console.log('\n=== NUMER ZLECENIA ===');
  const fiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  if (fiveDigit) {
    console.log('5-cyfrowe numery:', fiveDigit.join(', '));
  }
}

main().catch(e => console.error(e));
