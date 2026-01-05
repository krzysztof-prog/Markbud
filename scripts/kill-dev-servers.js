#!/usr/bin/env node
/**
 * Kills all running dev servers (node, tsx) on ports 3000, 3001, 4000
 * Usage: node scripts/kill-dev-servers.js
 */

const { execSync } = require('child_process');

const PORTS = [3000, 3001, 4000];

console.log('🔍 Szukam procesów dev serverów...');

try {
  if (process.platform === 'win32') {
    // Windows: znajdź procesy na portach i zabij je
    const allPids = new Set();

    PORTS.forEach(port => {
      try {
        // Użyj netstat bez filtra LISTENING - czasem nie działa na wszystkich systemach
        const findNode = `netstat -ano | findstr ":${port}"`;
        const output = execSync(findNode, { encoding: 'utf-8' });

        if (output) {
          output.split('\n').forEach(line => {
            // Szukaj linii z LISTENING i wyciągnij PID (ostatnia liczba)
            if (line.includes('LISTENING')) {
              const match = line.match(/\s+(\d+)\s*$/);
              if (match && match[1] !== '0') {
                allPids.add(match[1]);
              }
            }
          });
        }
      } catch (e) {
        // Port jest wolny
      }
    });

    if (allPids.size > 0) {
      console.log(`⚠️  Znaleziono ${allPids.size} procesów na portach ${PORTS.join('/')}`);
      allPids.forEach(pid => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`   ✅ Zabito proces PID: ${pid}`);
        } catch (e) {
          console.log(`   ⚠️  Nie udało się zabić procesu PID: ${pid}`);
        }
      });
    } else {
      console.log(`✅ Brak procesów na portach ${PORTS.join('/')}`);
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
      execSync('lsof -ti:3000,3001,4000 | xargs kill -9', { stdio: 'ignore' });
      console.log(`✅ Zabito procesy na portach ${PORTS.join('/')}`);
    } catch (e) {
      console.log('✅ Brak procesów do zabicia');
    }
  }

  console.log('✨ Gotowe!');
} catch (error) {
  console.error('❌ Błąd:', error.message);
  process.exit(1);
}
