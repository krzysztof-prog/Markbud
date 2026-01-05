#!/usr/bin/env node
/**
 * Money Validator Hook
 *
 * Sprawdza czy edited files nie zawierają niebezpiecznych operacji na kwotach.
 * Blokuje: parseFloat, toFixed, parseInt na polach wartości pieniężnych.
 *
 * Używany w: PreToolUse (Edit)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Pobierz argumenty z tool call
const toolName = process.env.TOOL_NAME || '';
const filePath = process.env.FILE_PATH || '';

if (toolName !== 'Edit' && toolName !== 'Write') {
  // Hook tylko dla Edit/Write
  process.exit(0);
}

if (!filePath) {
  console.error('⚠️ Brak FILE_PATH w environment');
  process.exit(0);
}

try {
  // Czytaj plik który ma być edytowany
  const content = readFileSync(filePath, 'utf-8');

  // Niebezpieczne patter ny
  const dangerousPatterns = [
    {
      regex: /parseFloat\s*\([^)]*value.*(?:Pln|Eur|Grosze)/gi,
      message: '❌ BŁĄD: Wykryto parseFloat() na polu wartości pieniężnej!',
      fix: 'Użyj: groszeToPln() z money.ts'
    },
    {
      regex: /parseInt\s*\([^)]*value.*(?:Pln|Eur|Grosze)/gi,
      message: '❌ BŁĄD: Wykryto parseInt() na polu wartości pieniężnej!',
      fix: 'Użyj: groszeToPln() z money.ts'
    },
    {
      regex: /\.toFixed\s*\(\s*2\s*\).*value.*(?:Pln|Eur)/gi,
      message: '❌ BŁĄD: Wykryto toFixed() na polu wartości pieniężnej!',
      fix: 'Użyj: formatPln() z money.ts'
    },
    {
      regex: /value.*(?:Pln|Eur|Grosze)\s*\/\s*100/gi,
      message: '❌ BŁĄD: Wykryto dzielenie wartości przez 100!',
      fix: 'Użyj: groszeToPln() z money.ts'
    },
    {
      regex: /value.*(?:Pln|Eur|Grosze)\s*\*\s*100/gi,
      message: '❌ BŁĄD: Wykryto mnożenie wartości przez 100!',
      fix: 'Użyj: plnToGrosze() z money.ts'
    }
  ];

  // Sprawdź każdy pattern
  const errors: string[] = [];
  for (const pattern of dangerousPatterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      errors.push(`${pattern.message}\n   Znaleziono: ${matches[0]}\n   ${pattern.fix}`);
    }
  }

  if (errors.length > 0) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 MONEY VALIDATOR - BŁĄD KRYTYCZNY');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(`Plik: ${filePath}\n`);
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}\n`);
    });
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n📚 Dokumentacja:');
    console.error('   - COMMON_MISTAKES.md → Money operations');
    console.error('   - LESSONS_LEARNED.md → Dashboard x100 błąd');
    console.error('   - apps/api/src/utils/money.ts\n');
    console.error('⛔ Operacja zablokowana!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Exit code 1 = blokuj operację
    process.exit(1);
  }

  // Sukces - brak niebezpiecznych operacji
  console.log(`✅ Money Validator: Plik ${filePath} jest bezpieczny`);
  process.exit(0);

} catch (error) {
  // Jeśli nie można przeczytać pliku (np. nowy plik) - pozwól na operację
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    // Nowy plik - pozwól na stworzenie
    process.exit(0);
  }

  // Inny błąd - loguj ale nie blokuj
  console.warn(`⚠️ Money Validator warning: ${error}`);
  process.exit(0);
}
