#!/usr/bin/env node
/**
 * Assumption Disclosure Guard Hook
 *
 * Wymusza aby Claude jawnie deklarował założenia przed zapisem kodu.
 * Blokuje jeśli kod zawiera "magiczne wartości" bez wyjaśnienia.
 *
 * Używany w: PreToolUse (Write/Edit)
 */

import { readFileSync } from 'fs';

// Pobierz argumenty z tool call
const toolName = process.env.TOOL_NAME || '';
const filePath = process.env.FILE_PATH || '';
const newContent = process.env.NEW_CONTENT || '';

if (toolName !== 'Edit' && toolName !== 'Write') {
  // Hook tylko dla Edit/Write
  process.exit(0);
}

if (!filePath || !newContent) {
  console.error('⚠️ Brak FILE_PATH lub NEW_CONTENT w environment');
  process.exit(0);
}

// Niebezpieczne założenia (magic values bez wyjaśnienia)
const dangerousAssumptions = [
  {
    regex: /(?:const|let|var)\s+\w+\s*=\s*(?:100|1000|10000|30|60|3600)\s*;?(?!\s*\/\/)/g,
    type: 'Magic Number',
    message: 'Znaleziono "magiczną liczbę" bez komentarza',
    suggestion: 'Dodaj komentarz: // 100 = maksymalna liczba elementów na stronie'
  },
  {
    regex: /setTimeout\([^,]+,\s*\d+\)(?!\s*\/\/)/g,
    type: 'Timeout bez wyjaśnienia',
    message: 'setTimeout z hardcoded delay bez komentarza',
    suggestion: 'Dodaj komentarz: // 3000ms = czas na response API'
  },
  {
    regex: /\.slice\(\d+,\s*\d+\)(?!\s*\/\/)/g,
    type: 'Slice bez wyjaśnienia',
    message: 'slice() z hardcoded indexes bez komentarza',
    suggestion: 'Dodaj komentarz: // Pierwsze 10 elementów'
  },
  {
    regex: /\b(?:admin|manager|user)\b(?!\s*\/\/)/gi,
    type: 'Hardcoded Role',
    message: 'Hardcoded nazwa roli bez wyjaśnienia',
    suggestion: 'Dodaj komentarz wyjaśniający jaka to rola i dlaczego'
  },
];

const warnings: string[] = [];

// Sprawdź każdy pattern
for (const assumption of dangerousAssumptions) {
  const matches = newContent.match(assumption.regex);
  if (matches && matches.length > 0) {
    warnings.push(
      `⚠️  ${assumption.type}:\n` +
      `   Kod: ${matches[0]}\n` +
      `   Problem: ${assumption.message}\n` +
      `   Rozwiązanie: ${assumption.suggestion}\n`
    );
  }
}

if (warnings.length > 0) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💭 ASSUMPTION DISCLOSURE - Przypomnienie');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Plik: ${filePath}\n`);
  console.log('Znalazłem założenia które warto wyjaśnić:\n');

  warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ℹ️  Dlaczego to ważne:');
  console.log('   - Za 3 miesiące nikt nie będzie pamiętał dlaczego "100"');
  console.log('   - Komentarz wyjaśnia INTENCJĘ, nie implementację');
  console.log('   - Ułatwia maintenance i refactoring\n');
  console.log('💡 To NIE blokuje operacji - to przypomnienie\n');
}

// SUCCESS - to tylko warning, nie blokujemy
process.exit(0);