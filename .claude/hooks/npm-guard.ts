#!/usr/bin/env node
/**
 * NPM Guard Hook
 *
 * Blokuje użycie npm/yarn w projekcie który używa pnpm.
 * Zapobiega złamaniu workspaces i linków między pakietami.
 *
 * Używany w: PreToolUse (Bash)
 */

// Pobierz komendę z tool call
const command = process.env.BASH_COMMAND || process.argv[2] || '';

if (!command) {
  // Brak komendy - pozwól
  process.exit(0);
}

// Niebezpieczne komendy npm/yarn
const dangerousCommands = [
  {
    pattern: /^npm\s+(install|i|add|update|upgrade|remove|uninstall)/,
    package: 'npm',
    correct: 'pnpm'
  },
  {
    pattern: /^yarn\s+(add|install|upgrade|remove|uninstall)/,
    package: 'yarn',
    correct: 'pnpm'
  },
  {
    pattern: /^npm\s+run\s+/,
    package: 'npm run',
    correct: 'pnpm'
  },
  {
    pattern: /^yarn\s+run\s+/,
    package: 'yarn run',
    correct: 'pnpm'
  }
];

// Sprawdź każdy pattern
for (const cmd of dangerousCommands) {
  if (cmd.pattern.test(command)) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⛔ NPM GUARD - KOMENDA ZABLOKOWANA');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(`❌ BŁĄD: Ten projekt używa pnpm, nie ${cmd.package}!`);
    console.error(`\n🚫 Zabroniona komenda:\n   ${command}`);

    // Zasugeruj poprawną komendę
    const correctedCommand = command.replace(cmd.pattern, cmd.correct);
    console.error(`\n✅ Użyj zamiast:\n   ${correctedCommand}`);

    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('ℹ️  Dlaczego pnpm?');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  - Projekt używa pnpm workspaces');
    console.error('  - npm/yarn złamią linki między pakietami (@markbud/api, @markbud/web)');
    console.error('  - Może spowodować "module not found" errors');
    console.error('\n📚 Dokumentacja:');
    console.error('   - COMMON_MISTAKES.md → Package Manager');
    console.error('   - CLAUDE.md → Komendy\n');

    // Exit code 1 = blokuj operację
    process.exit(1);
  }
}

// Sukces - bezpieczna komenda
process.exit(0);
