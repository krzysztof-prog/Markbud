#!/usr/bin/env node
/**
 * No Code Before Decision Guard Hook
 *
 * Blokuje zapis kodu jeśli wykryje że Claude nie zadał pytań o biznes.
 * Wymusza HARD STOP RULE: zatrzymaj się → zapytaj → zaproponuj opcje → czekaj.
 *
 * Używany w: PreToolUse (Write/Edit)
 */

import { readFileSync } from 'fs';

// Pobierz argumenty z tool call
const toolName = process.env.TOOL_NAME || '';
const filePath = process.env.FILE_PATH || '';
const conversationContext = process.env.CONVERSATION_CONTEXT || '';

if (toolName !== 'Edit' && toolName !== 'Write') {
  // Hook tylko dla Edit/Write
  process.exit(0);
}

if (!filePath) {
  console.error('⚠️ Brak FILE_PATH w environment');
  process.exit(0);
}

// Wykryj czy to kod związany z logiką biznesową
const businessLogicFiles = [
  /handlers?\//i,
  /services?\//i,
  /validators?\//i,
  /routes?\//i,
];

const isBusinessLogic = businessLogicFiles.some(pattern =>
  pattern.test(filePath)
);

if (!isBusinessLogic) {
  // Nie dotyczy logiki biznesowej - pozwól
  process.exit(0);
}

// Sprawdź czy w konwersacji było pytanie do użytkownika
const hasQuestion = /\?(?!\s*\/\/)/.test(conversationContext); // Wykryj znak zapytania (nie w komentarzu)
const hasOptions = /(?:Opcja A|Opcja B|wybierasz|które|który)/i.test(conversationContext);
const hasUserConfirmation = /(?:tak|ok|zgoda|dobrze|yes|proceed)/i.test(conversationContext);

// Jeśli NIE było pytania i NIE było potwierdzenia - BLOKUJ
if (!hasQuestion && !hasUserConfirmation) {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🛑 NO CODE BEFORE DECISION - OPERACJA ZABLOKOWANA');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.error(`❌ Próba zapisu do: ${filePath}`);
  console.error('   To plik logiki biznesowej!\n');
  console.error('🚫 HARD STOP RULE:');
  console.error('   Jeżeli zadanie dotyczy logiki biznesowej, Claude MA OBOWIĄZEK:\n');
  console.error('   1. ⏸️  ZATRZYMAĆ SIĘ - nie pisz kodu');
  console.error('   2. ❓ ZADAĆ PYTANIA - co ma się stać?');
  console.error('   3. 🔀 ZAPROPONOWAĆ OPCJE - szybkie vs lepsze');
  console.error('   4. ⏳ CZEKAĆ NA WYBÓR - NIE koduj dopóki użytkownik nie wybierze\n');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('💡 Co powinieneś zrobić:');
  console.error('   - Zapytaj użytkownika: "Jak to ma działać?"');
  console.error('   - Pokaż opcje: "Opcja A vs Opcja B"');
  console.error('   - Poczekaj na odpowiedź\n');
  console.error('📚 Zobacz: CLAUDE.md → HARD STOP RULE\n');

  // Exit code 1 = BLOKUJ operację
  process.exit(1);
}

// Jeśli było pytanie ale NIE było opcji - WARNING (nie blokuj)
if (hasQuestion && !hasOptions && !hasUserConfirmation) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  NO CODE BEFORE DECISION - Przypomnienie');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Zadałeś pytanie, ale nie zaproponowałeś opcji (Opcja A vs B).');
  console.log('Użytkownik może nie wiedzieć jakie są konsekwencje wyboru.\n');
  console.log('💡 Lepiej:');
  console.log('   "Mogę to zrobić na 2 sposoby:');
  console.log('    Opcja A (szybka): [opis + konsekwencje]');
  console.log('    Opcja B (lepsza): [opis + konsekwencje]');
  console.log('    Co wybierasz?"\n');
  console.log('ℹ️  To NIE blokuje - kontynuuję z zapisem\n');
}

// SUCCESS - albo było pytanie, albo nie dotyczy biznesu
process.exit(0);
