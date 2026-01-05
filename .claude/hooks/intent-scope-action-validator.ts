#!/usr/bin/env node
/**
 * Intent-Scope-Action Validator Hook
 *
 * Wymusza aby każde zadanie miało jasny:
 * - INTENT: Po co to robimy?
 * - SCOPE: Co dokładnie zmieniamy?
 * - ACTION: Jakie kroki podejmiemy?
 *
 * Używany w: UserPromptSubmit
 */

// Pobierz prompt użytkownika
const userPrompt = process.env.USER_PROMPT || '';

if (!userPrompt) {
  // Brak promptu - pozwól
  process.exit(0);
}

// Triggers - kiedy wymagamy Intent-Scope-Action
const requiresISA = [
  /dodaj|stwórz|utwórz|zaimplementuj/i,
  /zmień|zaktualizuj|popraw|napraw/i,
  /usuń|wyrzuć|skasuj/i,
  /zrefaktoruj|przenieś|reorganizuj/i,
];

const needsValidation = requiresISA.some(pattern => pattern.test(userPrompt));

if (!needsValidation) {
  // Proste pytanie/czytanie - nie wymaga ISA
  process.exit(0);
}

// Sprawdź czy prompt ma strukturę INTENT → SCOPE → ACTION
const hasIntent = /(?:po co|dlaczego|cel|żeby|aby)/i.test(userPrompt);
const hasScope = /(?:w pliku|w komponencie|dla|endpoint|route)/i.test(userPrompt);
const hasAction = /(?:krok|najpierw|potem|następnie)/i.test(userPrompt);

// Jeśli brak struktury - pokaż reminder (WARNING, nie ERROR)
if (!hasIntent || !hasScope || !hasAction) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 INTENT → SCOPE → ACTION REMINDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Dla lepszej jakości implementacji rozważ dodanie:\n');

  if (!hasIntent) {
    console.log('🎯 INTENT (Po co?):');
    console.log('   "Żeby użytkownik mógł..."');
    console.log('   "Bo obecnie..."');
  }

  if (!hasScope) {
    console.log('📦 SCOPE (Co konkretnie?):');
    console.log('   "W komponencie DeliveryCard"');
    console.log('   "Endpoint POST /api/deliveries"');
    console.log('   "W pliku deliveryService.ts"');
  }

  if (!hasAction) {
    console.log('⚡ ACTION (Jak?):');
    console.log('   "1. Dodaj button"');
    console.log('   "2. Stwórz handler"');
    console.log('   "3. Podłącz do API"');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ℹ️  To NIE blokuje operacji - to przypomnienie');
  console.log('   Claude może zadać pytania aby uzupełnić ISA\n');
}

// SUCCESS - to tylko reminder, nie blokujemy
process.exit(0);
