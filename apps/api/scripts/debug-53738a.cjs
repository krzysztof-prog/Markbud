/**
 * Debug script dla zamówienia 53738-a
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const ARCHIVE_PATH = 'C:/DEV_DATA/ceny/_archiwum';

async function parsePdf() {
  const filename = 'D3141,D3146    22.01  II.pdf';
  const filepath = path.join(ARCHIVE_PATH, filename);

  if (!fs.existsSync(filepath)) {
    console.log('Plik nie istnieje:', filepath);
    return;
  }

  console.log('Plik znaleziony!');

  const dataBuffer = await fs.promises.readFile(filepath);
  const data = await pdf(dataBuffer);
  const text = data.text;

  console.log('=== TEKST PDF (pierwsze 2000 znakow) ===');
  console.log(text.substring(0, 2000));
  console.log('\n=== SZUKANIE NUMERU ZAMOWIENIA ===');

  // Wzorzec 1: Oferta nr
  const ofertaMatch = text.match(/Oferta\s*nr\s*(\d{5})/i);
  console.log('Oferta nr:', ofertaMatch ? ofertaMatch[1] : null);

  // Wzorzec 2: ZAMOWIENIE
  const zamowienieMatch = text.match(/ZAMÓWIENIE\s*\d+[\s\S]*?(\d{5})/i);
  console.log('ZAMOWIENIE:', zamowienieMatch ? zamowienieMatch[1] : null);

  // Wzorzec 3: 5-cyfrowy numer z zakresu 50000-59999
  const fiveDigitMatches = text.match(/\b(5\d{4})\b/g);
  console.log('5-cyfrowe numery:', fiveDigitMatches);

  // Wzorzec 4: Numer z sufiksem (np. 53738-a)
  const suffixMatch = text.match(/\b(5\d{4}-[a-z])\b/gi);
  console.log('Numery z sufiksem:', suffixMatch);

  // Szukaj EUR i wartosci
  const isEur = text.includes('€') || text.includes('EUR');
  console.log('\nWaluta EUR:', isEur);

  // Wzorzec sumy netto
  const towarMatch = text.match(/Towar\s*([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  console.log('Towar match:', towarMatch ? towarMatch.slice(1) : null);

  const eurPodsumowanieMatch = text.match(/\n(\d[\d ]*[,.]\d{2})\n(\d[\d ]*[,.]\d{2})(\d[\d ]*[,.]\d{2})\n\d+%/);
  console.log('EUR Podsumowanie match:', eurPodsumowanieMatch ? eurPodsumowanieMatch.slice(1) : null);

  const sumaMatch = text.match(/\bSuma\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})\s+([\d\s]+[,.]\d{2})/i);
  console.log('Suma match:', sumaMatch ? sumaMatch.slice(1) : null);
}

parsePdf().catch(console.error);
