#!/usr/bin/env node

/**
 * recent-changes.js - Generowanie RECENT_CHANGES.md z historii git
 *
 * Parsuje git log z ostatnich 14 dni, grupuje commity wg modulu
 * na podstawie sciezek zmienionych plikow i generuje raport.
 *
 * Uzycie:
 *   node scripts/recent-changes.js
 *   pnpm recent-changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'RECENT_CHANGES.md');
const SINCE_DAYS = 14;

// Module classification rules - order matters: first match wins
const MODULE_RULES = [
  { pattern: /order/i, module: 'Orders' },
  { pattern: /delivery/i, module: 'Deliveries' },
  { pattern: /warehouse/i, module: 'Warehouse' },
  { pattern: /glass/i, module: 'Glass' },
  { pattern: /import/i, module: 'Imports' },
  { pattern: /schuco/i, module: 'Schuco' },
  { pattern: /okuc/i, module: 'OKUC' },
  { pattern: /timesheet/i, module: 'Timesheets' },
  { pattern: /attendance/i, module: 'Timesheets' },
  { pattern: /pallet/i, module: 'Pallets' },
  { pattern: /logistics/i, module: 'Logistics' },
  { pattern: /production/i, module: 'Production' },
  { pattern: /^prisma\//i, module: 'Database' },
  { pattern: /^packages\/shared\//i, module: 'Shared' },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Detect the best shell to use for git commands.
 * On Windows with UNC paths (e.g. network drives), cmd.exe fails because it
 * does not support UNC as cwd. In that case we fall back to bash (available
 * via Git-for-Windows / MSYS2).
 */
function detectShell() {
  const cwd = process.cwd();
  const isUNC = cwd.startsWith('\\\\') || cwd.startsWith('//');
  return isUNC ? 'bash' : true;
}

const SHELL = detectShell();

/**
 * Execute git command safely, returning stdout or null on failure
 */
function gitExec(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: SHELL,
    });
  } catch (err) {
    return null;
  }
}

/**
 * Check if we are inside a git repository
 */
function isGitRepo() {
  const result = gitExec('git rev-parse --is-inside-work-tree');
  return result !== null && result.trim() === 'true';
}

/**
 * Classify a file path into a module name
 */
function classifyFile(filePath) {
  // Normalize to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Check prisma/ first (exact prefix match)
  if (/^prisma\//i.test(normalized)) {
    return 'Database';
  }

  // Check packages/shared/
  if (/^packages\/shared\//i.test(normalized)) {
    return 'Shared';
  }

  // Apply keyword-based rules first - these contain canonical module names
  for (const rule of MODULE_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.module;
    }
  }

  // Check features/* pattern as fallback - extract feature name
  const featuresMatch = normalized.match(/features\/([^/]+)/);
  if (featuresMatch) {
    // Capitalize the feature name (e.g. "auth" -> "Auth", "production-planning" -> "Production-Planning")
    const featureName = featuresMatch[1]
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
    return featureName;
  }

  return 'Other';
}

/**
 * Parse the output of git log --oneline --name-only
 * Returns array of { hash, message, files: string[] }
 */
function parseGitLog(output) {
  const commits = [];
  const lines = output.split('\n');
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      // Blank line may separate commit from files or commits from each other
      continue;
    }

    // A commit line starts with a short hash (7+ hex chars) followed by a space
    const commitMatch = trimmed.match(/^([0-9a-f]{7,})\s+(.+)$/);
    if (commitMatch) {
      // Save previous commit if any
      if (current) {
        commits.push(current);
      }
      current = {
        hash: commitMatch[1],
        message: commitMatch[2],
        files: [],
      };
    } else if (current) {
      // This is a file path belonging to the current commit
      current.files.push(trimmed);
    }
  }

  // Don't forget the last commit
  if (current) {
    commits.push(current);
  }

  return commits;
}

/**
 * Group commits by module. Each module gets a list of { hash, message, files }
 * A single commit can appear under multiple modules if it touched files from
 * different modules.
 */
function groupByModule(commits) {
  const groups = {};

  for (const commit of commits) {
    // Determine which modules this commit touches
    const modulesInCommit = new Set();

    for (const file of commit.files) {
      const mod = classifyFile(file);
      modulesInCommit.add(mod);
    }

    // If commit has no files (shouldn't normally happen), put it in Other
    if (modulesInCommit.size === 0) {
      modulesInCommit.add('Other');
    }

    for (const mod of modulesInCommit) {
      if (!groups[mod]) {
        groups[mod] = [];
      }
      // Store commit with only the files relevant to this module
      const relevantFiles = commit.files.filter(f => classifyFile(f) === mod);
      groups[mod].push({
        hash: commit.hash,
        message: commit.message,
        files: relevantFiles,
      });
    }
  }

  return groups;
}

/**
 * Build the date string in YYYY-MM-DD format
 */
function dateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// MARKDOWN GENERATION
// ---------------------------------------------------------------------------

function generateMarkdown(commits, groups) {
  const now = new Date();
  const lines = [];

  // Collect stats
  const totalCommits = commits.length;
  const allFiles = new Set();
  for (const commit of commits) {
    for (const file of commit.files) {
      allFiles.add(file);
    }
  }
  const totalFiles = allFiles.size;
  const moduleNames = Object.keys(groups).sort();
  const activeModules = moduleNames.length;

  // Header
  lines.push(`# AKROBUD - Ostatnie zmiany`);
  lines.push(``);
  lines.push(`> Automatycznie wygenerowano z historii git (ostatnie ${SINCE_DAYS} dni)`);
  lines.push(`> Data: ${dateStr(now)}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Stats section
  lines.push(`## Statystyki`);
  lines.push(``);
  lines.push(`| Metryka | Wartosc |`);
  lines.push(`|---------|---------|`);
  lines.push(`| Commitow | ${totalCommits} |`);
  lines.push(`| Zmienionych plikow | ${totalFiles} |`);
  lines.push(`| Aktywnych modulow | ${activeModules} |`);
  lines.push(`| Okres | ostatnie ${SINCE_DAYS} dni |`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Table of contents
  lines.push(`## Spis tresci`);
  lines.push(``);
  for (let i = 0; i < moduleNames.length; i++) {
    const anchor = moduleNames[i].toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    lines.push(`${i + 1}. [${moduleNames[i]}](#${anchor})`);
  }
  lines.push(`${moduleNames.length + 1}. [Chronologiczna lista commitow](#chronologiczna-lista-commitow)`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Grouped changes
  lines.push(`## Zmiany wg modulow`);
  lines.push(``);

  for (const mod of moduleNames) {
    const entries = groups[mod];
    lines.push(`### ${mod}`);
    lines.push(``);
    lines.push(`**${entries.length} commit${entries.length === 1 ? '' : 'ow'}**`);
    lines.push(``);

    for (const entry of entries) {
      lines.push(`- \`${entry.hash}\` ${entry.message}`);
      for (const file of entry.files) {
        lines.push(`  - ${file}`);
      }
    }

    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // Chronological commit table
  lines.push(`## Chronologiczna lista commitow`);
  lines.push(``);
  lines.push(`| Hash | Opis | Plikow | Moduly |`);
  lines.push(`|------|------|--------|--------|`);

  for (const commit of commits) {
    // Determine modules for this commit
    const modulesInCommit = new Set();
    for (const file of commit.files) {
      modulesInCommit.add(classifyFile(file));
    }
    if (modulesInCommit.size === 0) {
      modulesInCommit.add('Other');
    }
    const moduleList = [...modulesInCommit].sort().join(', ');

    // Escape pipe characters in the commit message
    const safeMessage = commit.message.replace(/\|/g, '\\|');

    lines.push(`| \`${commit.hash}\` | ${safeMessage} | ${commit.files.length} | ${moduleList} |`);
  }

  lines.push(``);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Generowanie RECENT_CHANGES.md...');

  // Check if we're in a git repo
  if (!isGitRepo()) {
    console.error('Blad: Biezacy katalog nie jest repozytorium git.');
    process.exit(1);
  }

  // Run git log
  const gitOutput = gitExec(`git log --oneline --since="${SINCE_DAYS} days ago" --name-only`);

  if (gitOutput === null) {
    console.error('Blad: Nie udalo sie wykonac polecenia git log.');
    process.exit(1);
  }

  // Parse the output
  const commits = parseGitLog(gitOutput);

  if (commits.length === 0) {
    console.log(`Brak commitow w ostatnich ${SINCE_DAYS} dniach.`);

    // Write a minimal file indicating no changes
    const now = new Date();
    const minimal = [
      `# AKROBUD - Ostatnie zmiany`,
      ``,
      `> Automatycznie wygenerowano z historii git (ostatnie ${SINCE_DAYS} dni)`,
      `> Data: ${dateStr(now)}`,
      ``,
      `---`,
      ``,
      `Brak commitow w ostatnich ${SINCE_DAYS} dniach.`,
      ``,
    ].join('\n');

    fs.writeFileSync(OUTPUT_FILE, minimal, 'utf-8');
    console.log(`RECENT_CHANGES.md zapisano (brak zmian).`);
    return;
  }

  console.log(`  Znaleziono ${commits.length} commitow`);

  // Group by module
  const groups = groupByModule(commits);
  const moduleNames = Object.keys(groups).sort();

  console.log(`  Aktywne moduly: ${moduleNames.join(', ')}`);

  // Generate markdown
  const output = generateMarkdown(commits, groups);

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const elapsed = Date.now() - startTime;
  const lineCount = output.split('\n').length;

  console.log(`\nRECENT_CHANGES.md wygenerowano pomyslnie!`);
  console.log(`  ${lineCount} linii`);
  console.log(`  Czas: ${elapsed}ms`);
}

main();
