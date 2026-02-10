/**
 * Test parsowania PDF z ceną
 * Użycie: node scripts/test-pdf-parse.cjs "ścieżka/do/pliku.pdf"
 */

const fs = require('fs');
const pdf = require('pdf-parse');

async function testParsePdf(filepath) {
  console.log('=== Test parsowania PDF ===');
  console.log('Plik:', filepath);
  console.log('');

  const dataBuffer = await fs.promises.readFile(filepath);
  const data = await pdf(dataBuffer);
  const text = data.text;

  console.log('=== RAW TEXT (pierwsze 2000 znaków) ===');
  console.log(text.substring(0, 2000));
  console.log('...');
  console.log('');

  // Test extractAkrobudOrderNumber
  console.log('=== TESTY WYCIĄGANIA NUMERU ZLECENIA ===');

  // Strategia 1: Po "SUMA:"
  const sumaMatch = text.match(/SUMA:.*?(\d{5})/s);
  console.log('1. SUMA: match:', sumaMatch ? sumaMatch[1] : 'NIE');

  // Strategia 2: 5 cyfr + ZAMÓWIENIE
  const beforeZamMatch = text.match(/(\d{5})\s*ZAMÓWIENIE/);
  console.log('2. przed-ZAMÓWIENIE match:', beforeZamMatch ? beforeZamMatch[1] : 'NIE');

  // Strategia 4: 5-cyfrowy na osobnej linii
  const lines = text.split('\n');
  let standaloneFound = null;
  for (const line of lines.slice(0, 40)) {
    const match = line.match(/^\s*(\d{5})\s*$/);
    if (match) {
      standaloneFound = match[1];
      break;
    }
  }
  console.log('3. Standalone linia:', standaloneFound || 'NIE');

  // Strategia 5: Generic 5-digit (zakres 40000-99999)
  const allFiveDigit = text.match(/(?<!\d)(\d{5})(?!\d)/g);
  console.log('4. Wszystkie 5-cyfrowe:', allFiveDigit ? allFiveDigit.slice(0, 10) : 'NIE');
  if (allFiveDigit) {
    const inRange = allFiveDigit.filter(n => parseInt(n) >= 40000 && parseInt(n) <= 99999);
    console.log('   W zakresie 40k-99k:', inRange);
  }

  // Strategia z nazwy pliku
  const filename = filepath.split(/[\\/]/).pop() || '';
  console.log('5. Nazwa pliku:', filename);
  const zamMatch = filename.match(/ZAM\s+(\d{5})/i);
  console.log('   ZAM match:', zamMatch ? zamMatch[1] : 'NIE');
  const fiveDigitMatch = filename.match(/(?<!\d)(\d{5})(?!\d)/);
  console.log('   5-digit w nazwie:', fiveDigitMatch ? fiveDigitMatch[1] : 'NIE');

  // Test SUMY
  console.log('');
  console.log('=== TEST WYCIĄGANIA WARTOŚCI ===');

  // Netto
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  console.log('1. Towar match (netto):', towarMatch ? towarMatch[1] : 'NIE');

  const nettoMatch = text.match(/suma\s*netto[:\s]*([\d\s,.]+)/i);
  console.log('2. suma netto match:', nettoMatch ? nettoMatch[1] : 'NIE');

  // Test referencji
  console.log('');
  console.log('=== TEST REFERENCJI ===');
  const referenceMatch = text.match(/Nr Referencyjny\s*([A-Z]\d+)/i) ||
                        text.match(/Referencja\s*([A-Z]\d+)/i) ||
                        text.match(/\b([A-Z]\d{4})\b/);
  console.log('Reference match:', referenceMatch ? referenceMatch[1] : 'NIE');

  // Szukaj wzorca z zamówienia Schuco
  console.log('');
  console.log('=== DODATKOWE WZORCE ===');
  const zamowienieSchuco = text.match(/ZAMÓWIENIE\s+(\d+)/);
  console.log('ZAMÓWIENIE numer:', zamowienieSchuco ? zamowienieSchuco[1] : 'NIE');

  // Szukaj numeru 53627 bezpośrednio
  const has53627 = text.includes('53627');
  console.log('Czy zawiera 53627:', has53627);
  if (has53627) {
    // Pokaż kontekst
    const idx = text.indexOf('53627');
    console.log('Kontekst 53627:', text.substring(Math.max(0, idx - 50), idx + 50));
  }
}

const filepath = process.argv[2];
if (!filepath) {
  console.log('Użycie: node scripts/test-pdf-parse.cjs "ścieżka/do/pliku.pdf"');
  process.exit(1);
}

testParsePdf(filepath).catch(console.error);
