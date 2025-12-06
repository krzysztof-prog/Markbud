#!/usr/bin/env node
/**
 * Kills all running dev servers (node, tsx) on ports 3000, 4000
 * Usage: node scripts/kill-dev-servers.js
 */

const { execSync } = require('child_process');

console.log('🔍 Szukam procesów dev serverów...');

try {
  if (process.platform === 'win32') {
    // Windows: znajdź procesy node i tsx, zabij je
    try {
      const findNode = 'netstat -ano | findstr ":3000\\|:4000" | findstr LISTENING';
      const output = execSync(findNode, { encoding: 'utf-8' });

      if (output) {
        const pids = new Set();
        output.split('\n').forEach(line => {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            pids.add(match[1]);
          }
        });

        if (pids.size > 0) {
          console.log(`⚠️  Znaleziono ${pids.size} procesów na portach 3000/4000`);
          pids.forEach(pid => {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`   ✅ Zabito proces PID: ${pid}`);
            } catch (e) {
              // Ignoruj błędy (proces już nie istnieje)
            }
          });
        } else {
          console.log('✅ Brak procesów do zabicia');
        }
      }
    } catch (e) {
      // Brak procesów na portach - OK
      console.log('✅ Brak procesów na portach 3000/4000');
    }

    // Dodatkowo zabij wszystkie node/tsx procesy związane z tsx watch
    try {
      execSync('taskkill /F /IM tsx.exe 2>nul', { stdio: 'ignore' });
      console.log('   ✅ Zabito tsx procesy');
    } catch (e) {
      // Ignoruj - brak tsx procesów
    }
  } else {
    // Linux/Mac: znajdź i zabij procesy na portach
    try {
      execSync('lsof -ti:3000,4000 | xargs kill -9', { stdio: 'ignore' });
      console.log('✅ Zabito procesy na portach 3000/4000');
    } catch (e) {
      console.log('✅ Brak procesów do zabicia');
    }
  }

  console.log('✨ Gotowe!');
} catch (error) {
  console.error('❌ Błąd:', error.message);
  process.exit(1);
}
