import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontPath = path.join(__dirname, 'src', 'assets', 'fonts', 'Roboto-Regular.ttf');
console.log('Font path:', fontPath);
console.log('Font exists:', fs.existsSync(fontPath));

if (fs.existsSync(fontPath)) {
  const buffer = fs.readFileSync(fontPath);
  console.log('Font file size:', buffer.length, 'bytes');
  console.log('First 20 bytes (hex):', buffer.subarray(0, 20).toString('hex'));
  console.log('First 20 bytes (ascii):', buffer.subarray(0, 20).toString('ascii'));

  // Check for TTF magic number (00 01 00 00) or TrueType Collection ('ttcf')
  const header = buffer.subarray(0, 4);
  const headerHex = header.toString('hex');
  console.log('Header (hex):', headerHex);

  if (headerHex === '00010000' || headerHex === '74746366') {
    console.log('✅ Valid TTF/TTC font file');
  } else {
    console.log('❌ Not a valid TTF font file - unexpected header');
  }
}
