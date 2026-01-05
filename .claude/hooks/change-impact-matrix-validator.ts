#!/usr/bin/env node
/**
 * Change Impact Matrix Validator Hook
 *
 * Wymusza aby Claude pokazał jakie pliki będą dotknięte zmianą PRZED zapisem.
 * Pomaga wychwycić ripple effects i niezamierzone konsekwencje.
 *
 * Używany w: PreToolUse (Write/Edit)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

// Zmiany które mogą mieć ripple effect
const highImpactChanges = [
  {
    pattern: /interface|type\s+\w+\s*=/i,
    area: 'TypeScript Types',
    impact: 'Może wpłynąć na wszystkie pliki używające tego typu'
  },
  {
    pattern: /export\s+(?:const|function|class)\s+\w+/i,
    area: 'Exported API',
    impact: 'Może wpłynąć na wszystkie pliki importujące tę funkcję/klasę'
  },
  {
    pattern: /model\s+\w+\s*\{/i,
    area: 'Prisma Model',
    impact: 'Wpłynie na migracje bazy + wszystkie queries używające tego modelu'
  },
  {
    pattern: /router\.(get|post|put|patch|delete)\(/i,
    area: 'API Endpoint',
    impact: 'Wpłynie na frontend (API client) + dokumentację API'
  },
  {
    pattern: /schema\s*:\s*z\.object\(/i,
    area: 'Zod Schema',
    impact: 'Wpłynie na walidację frontend + backend'
  },
];

try {
  const content = readFileSync(filePath, 'utf-8');
  const warnings: string[] = [];

  // Sprawdź każdy high-impact pattern
  for (const change of highImpactChanges) {
    if (change.pattern.test(content)) {
      warnings.push(
        `📦 ${change.area}\n` +
        `   Impact: ${change.impact}`
      );
    }
  }

  if (warnings.length > 0) {
    // Sprawdź czy Claude wspomniał o wpływie w konwersacji
    const mentionedImpact =
      /(?:wpłynie|wpływ|zmieni|dotknie|affected|impact)/i.test(conversationContext);

    if (!mentionedImpact) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🗺️  CHANGE IMPACT MATRIX - Przypomnienie');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Plik: ${filePath}\n`);
      console.log('Wykryłem zmiany które mogą mieć szeroki wpływ:\n');

      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}\n`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 Zalecam:');
      console.log('   1. Wymień które pliki będą dotknięte');
      console.log('   2. Sprawdź czy wszystkie zależności są aktualne');
      console.log('   3. Rozważ migration guide jeśli to breaking change\n');
      console.log('🔍 Narzędzia do sprawdzenia wpływu:');
      console.log('   - Grep: szukaj importów tego API');
      console.log('   - Glob: znajdź wszystkie pliki używające tego typu');
      console.log('   - Read: sprawdź każdy dotknięty plik\n');
      console.log('ℹ️  To NIE blokuje operacji - to przypomnienie\n');
    }
  }

  // SUCCESS - to tylko reminder
  process.exit(0);

} catch (error) {
  // Jeśli nie można przeczytać pliku (nowy plik) - pozwól
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    process.exit(0);
  }

  // Inny błąd - loguj ale nie blokuj
  console.warn(`⚠️ Change Impact Matrix warning: ${error}`);
  process.exit(0);
}