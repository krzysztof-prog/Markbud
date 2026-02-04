/**
 * Skrypt testowy do debugowania parsera pozycji zamówień Schüco
 */
import { SchucoItemParser } from '../src/services/schuco/schucoItemParser.js';
import path from 'path';

async function main() {
  const parser = new SchucoItemParser();
  const testFile = path.join(process.cwd(), 'downloads/schuco/test_items.csv');

  console.log('Testing parser with file:', testFile);
  console.log('---');

  try {
    const items = await parser.parseCSV(testFile);

    console.log('---');
    console.log(`Parsed ${items.length} items`);

    if (items.length > 0) {
      console.log('\nFirst item:');
      console.log(JSON.stringify(items[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
