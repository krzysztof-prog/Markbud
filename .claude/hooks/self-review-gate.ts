#!/usr/bin/env node
/**
 * Self-Review Gate Hook
 *
 * Po zapisie kodu wymusza samoocenę Claude:
 * - Czy to odpowiada na oryginalny INTENT?
 * - Czy może być prostsze (YAGNI)?
 * - Czy złamałem jakieś zasady z COMMON_MISTAKES?
 *
 * Używany w: PostToolUse (Write/Edit)
 */

import { readFileSync } from 'fs';

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

// Skip dla plików konfiguracyjnych
const skipFiles = [
  /package\.json$/,
  /tsconfig\.json$/,
  /\.md$/,
  /\.env/,
];

if (skipFiles.some(pattern => pattern.test(filePath))) {
  // Config files - nie wymagają review
  process.exit(0);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 SELF-REVIEW GATE - Checklist');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`Zapisano: ${filePath}\n`);
console.log('⏸️  Przed przejściem dalej - sprawdź:\n');

console.log('1️⃣  INTENT - Czy to odpowiada na zadanie użytkownika?');
console.log('   ❓ Czy to rozwiązuje oryginalny problem?');
console.log('   ❓ Czy user będzie zadowolony z rezultatu?\n');

console.log('2️⃣  YAGNI - Czy nie za-engineerowałem?');
console.log('   ❓ Czy dodałem abstrakcje "na zapas"?');
console.log('   ❓ Czy mogę to zrobić prościej?');
console.log('   ❓ Czy wszystko co dodałem jest TERAZ potrzebne?\n');

console.log('3️⃣  COMMON_MISTAKES - Czy złamałem zasady?');
console.log('   ❓ Money.ts dla kwot? (groszeToPln/plnToGrosze)');
console.log('   ❓ Soft delete zamiast hard delete?');
console.log('   ❓ Disabled button podczas mutacji?');
console.log('   ❓ Confirmation dla destructive actions?');
console.log('   ❓ Import raportuje błędy użytkownikowi?\n');

console.log('4️⃣  ARCHITECTURE - Czy zgodne ze standardami?');
console.log('   ❓ Backend: Route → Handler → Service → Repository?');
console.log('   ❓ Frontend: features/ struktura?');
console.log('   ❓ Walidacja przez Zod?');
console.log('   ❓ No try-catch w handlerach?\n');

console.log('5️⃣  RIPPLE EFFECTS - Czy coś się zepsuje?');
console.log('   ❓ Czy zmieniłem exported API?');
console.log('   ❓ Czy zmieniłem TypeScript types?');
console.log('   ❓ Czy inne pliki używają tego co zmieniłem?\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 Jeśli coś NIE pasuje:');
console.log('   - Popraw TERAZ (zanim użytkownik zobaczy)');
console.log('   - Albo wyjaśnij użytkownikowi dlaczego to OK\n');
console.log('✅ Jeśli wszystko OK - kontynuuj dalej\n');

// SUCCESS - to tylko checklist reminder
process.exit(0);
