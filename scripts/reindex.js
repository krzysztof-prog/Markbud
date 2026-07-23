#!/usr/bin/env node

/**
 * reindex.js - Automatyczne generowanie FUNCTION_INDEX.md
 *
 * Skanuje codebase AKROBUD i regeneruje indeks eksportowanych
 * funkcji, klas, typow, stalych z numerami linii.
 *
 * Uzycie:
 *   node scripts/reindex.js
 *   pnpm reindex
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'FUNCTION_INDEX.md');

const API_SRC = path.join(ROOT, 'apps', 'api', 'src');
const WEB_SRC = path.join(ROOT, 'apps', 'web', 'src');
const PACKAGES_DIR = path.join(ROOT, 'packages');

// Regex patterns for exported symbols
const EXPORT_PATTERNS = [
  // export async function name
  /^export\s+async\s+function\s+(\w+)/,
  // export function name
  /^export\s+function\s+(\w+)/,
  // export const name
  /^export\s+const\s+(\w+)/,
  // export let name
  /^export\s+let\s+(\w+)/,
  // export class name
  /^export\s+class\s+(\w+)/,
  // export default async function name
  /^export\s+default\s+async\s+function\s+(\w+)/,
  // export default function name
  /^export\s+default\s+function\s+(\w+)/,
  // export default class name
  /^export\s+default\s+class\s+(\w+)/,
  // export enum name
  /^export\s+enum\s+(\w+)/,
  // export type name
  /^export\s+type\s+(\w+)/,
  // export interface name
  /^export\s+interface\s+(\w+)/,
  // export { name } (re-exports) - capture first name
  /^export\s+\{\s*(\w+)/,
];

// Pattern to detect class method lines (indented, not static, public by default)
const CLASS_METHOD_PATTERN = /^\s+(?:async\s+)?(\w+)\s*\(/;
const STATIC_METHOD_PATTERN = /^\s+static\s+(?:async\s+)?(\w+)\s*\(/;
const PRIVATE_PREFIX = /^\s+(?:private|protected)\s+/;
const GETTER_SETTER = /^\s+(?:get|set)\s+(\w+)\s*\(/;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Recursively collect all .ts and .tsx files under a directory
 */
function collectFiles(dir, extensions = ['.ts', '.tsx']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, .turbo, tests, __tests__
      if (['node_modules', 'dist', '.turbo', 'tests', '__tests__', 'test', '.next'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      // Skip .d.ts files and test files
      if (entry.name.endsWith('.d.ts')) continue;
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Parse a single file for exports. Returns array of export entries.
 */
function parseExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const exports = [];
  let insideClass = null; // { name, line, methods: [] }
  let braceDepth = 0;
  let classStartBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const lineNum = i + 1;

    // Track brace depth: save depth BEFORE this line, then update
    const depthBeforeThisLine = braceDepth;
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // If we're inside a class, collect methods
    if (insideClass) {
      if (braceDepth <= classStartBraceDepth) {
        // Class ended - deduplicate methods before pushing
        insideClass.methods = [...new Set(insideClass.methods)];
        exports.push(insideClass);
        insideClass = null;
      } else if (depthBeforeThisLine === classStartBraceDepth + 1) {
        // Only consider lines at the first nesting level inside the class body
        // (depth == classStart + 1 means we are inside the class { } but not inside a method body)
        // Skip private/protected, constructors, decorators, comments, empty lines
        if (PRIVATE_PREFIX.test(line)) continue;
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed === '') continue;
        if (trimmed.startsWith('constructor')) continue;
        if (trimmed.startsWith('@')) continue;
        if (trimmed.startsWith('readonly ')) continue;
        // Skip variable declarations inside class body
        if (/^(?:const|let|var|this\.|return|throw|await)\s/.test(trimmed)) continue;
        if (trimmed.startsWith('public ')) {
          // public async method(...) or public method(...)
          const pubMatch = trimmed.match(/^public\s+(?:async\s+)?(\w+)\s*\(/);
          if (pubMatch && pubMatch[1] !== 'constructor') {
            insideClass.methods.push(pubMatch[1]);
          }
          continue;
        }
        if (trimmed.startsWith('static ')) {
          const staticMatch = STATIC_METHOD_PATTERN.exec(line);
          if (staticMatch) {
            insideClass.methods.push(`static ${staticMatch[1]}`);
          }
          continue;
        }
        const getterSetterMatch = GETTER_SETTER.exec(line);
        if (getterSetterMatch) {
          insideClass.methods.push(getterSetterMatch[1]);
          continue;
        }
        const methodMatch = CLASS_METHOD_PATTERN.exec(line);
        if (methodMatch) {
          const name = methodMatch[1];
          // Skip things that look like function calls inside methods, control flow keywords
          if (['if', 'for', 'while', 'switch', 'catch', 'return', 'throw', 'new', 'await', 'try', 'else', 'super', 'parseInt', 'parseFloat', 'Number', 'String', 'Boolean', 'JSON', 'Object', 'Array', 'console', 'Promise', 'Error', 'Map', 'Set', 'Date'].includes(name)) continue;
          // Skip private-by-convention (underscore prefix)
          if (name.startsWith('_')) continue;
          insideClass.methods.push(name);
        }
      }
      // Lines at deeper nesting levels (inside method bodies) are silently skipped
      continue;
    }

    // Check for export patterns
    for (const pattern of EXPORT_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        const name = match[1];
        const kind = detectKind(trimmed);

        if (kind === 'class') {
          insideClass = {
            kind: 'class',
            name,
            line: lineNum,
            methods: [],
            isDefault: trimmed.includes('export default'),
          };
          classStartBraceDepth = depthBeforeThisLine;
        } else {
          exports.push({
            kind,
            name,
            line: lineNum,
            isDefault: trimmed.includes('export default'),
          });
        }
        break; // Only match first pattern per line
      }
    }
  }

  // If file ended while still inside a class
  if (insideClass) {
    insideClass.methods = [...new Set(insideClass.methods)];
    exports.push(insideClass);
  }

  return exports;
}

function detectKind(trimmed) {
  if (/^export\s+(default\s+)?class\s/.test(trimmed)) return 'class';
  if (/^export\s+(default\s+)?async\s+function\s/.test(trimmed)) return 'async function';
  if (/^export\s+(default\s+)?function\s/.test(trimmed)) return 'function';
  if (/^export\s+const\s/.test(trimmed)) return 'const';
  if (/^export\s+let\s/.test(trimmed)) return 'let';
  if (/^export\s+enum\s/.test(trimmed)) return 'enum';
  if (/^export\s+type\s/.test(trimmed)) return 'type';
  if (/^export\s+interface\s/.test(trimmed)) return 'interface';
  if (/^export\s+\{/.test(trimmed)) return 're-export';
  return 'unknown';
}

/**
 * Get relative path from a base dir, using forward slashes
 */
function relPath(filePath, baseDir) {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
}

/**
 * Group files by subdirectory
 */
function groupBySubdir(files, baseDir, subdir) {
  const result = {};
  const prefix = path.join(baseDir, subdir);
  for (const file of files) {
    if (!file.startsWith(prefix)) continue;
    const rel = relPath(file, baseDir);
    result[rel] = parseExports(file);
  }
  return result;
}

/**
 * Format a single export entry for markdown
 */
function formatExport(exp) {
  const prefix = exp.isDefault ? 'export default' : 'export';
  if (exp.kind === 'class') {
    let result = `- L${exp.line}: \`${prefix} class ${exp.name}\``;
    if (exp.methods && exp.methods.length > 0) {
      result += '\n';
      // If many methods, put them on one line comma-separated (matching the original style for compact classes)
      if (exp.methods.length > 6) {
        result += `  - \`${exp.methods.join('`, `')}\``;
      } else {
        for (const method of exp.methods) {
          result += `  - \`${method}()\`\n`;
        }
        result = result.trimEnd();
      }
    }
    return result;
  }
  return `- L${exp.line}: \`${prefix} ${exp.kind === 'async function' ? 'async function' : exp.kind} ${exp.name}\``;
}

/**
 * Format a section of files grouped under a category heading
 */
function formatFileSection(relFilePath, exports) {
  if (!exports || exports.length === 0) return '';

  // Strip the leading directory segment to get just e.g. "handlers/authHandler.ts"
  const displayPath = relFilePath;
  let result = `### ${displayPath}\n`;

  for (const exp of exports) {
    result += formatExport(exp) + '\n';
  }

  return result;
}

// ---------------------------------------------------------------------------
// SECTION GENERATORS
// ---------------------------------------------------------------------------

function generateBackendSection(sectionTitle, subdir, allFiles) {
  const basePath = path.join(API_SRC, subdir);
  const files = allFiles.filter(f => {
    const rel = relPath(f, API_SRC);
    const parts = rel.split('/');
    return parts[0] === subdir;
  });

  if (files.length === 0) return '';

  // Sort files alphabetically
  files.sort((a, b) => relPath(a, API_SRC).localeCompare(relPath(b, API_SRC)));

  let md = `## ${sectionTitle}\n\n`;
  md += `Lokalizacja: \`apps/api/src/${subdir}/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, API_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateBackendRoutesTable(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, API_SRC);
    return rel.startsWith('routes/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, API_SRC).localeCompare(relPath(b, API_SRC)));

  let md = `## Backend - Routes\n\n`;
  md += `Lokalizacja: \`apps/api/src/routes/\`\n\n`;
  md += `| Plik | Linia | Eksport |\n`;
  md += `|------|-------|---------|\n`;

  for (const file of files) {
    const rel = relPath(file, API_SRC);
    const displayPath = rel.replace('routes/', '');
    const exports = parseExports(file);
    for (const exp of exports) {
      const prefix = exp.isDefault ? 'export default' : 'export';
      const kindStr = exp.kind === 'async function' ? 'async function' : exp.kind;
      md += `| \`${displayPath}\` | L${exp.line} | \`${prefix} ${kindStr} ${exp.name}\` |\n`;
    }
  }

  md += '\n';
  return md;
}

function generateFrontendHooksSection(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, WEB_SRC);
    return rel.startsWith('hooks/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, WEB_SRC).localeCompare(relPath(b, WEB_SRC)));

  let md = `## Frontend - Shared Hooks\n\n`;
  md += `Lokalizacja: \`apps/web/src/hooks/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, WEB_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateFrontendLibSection(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, WEB_SRC);
    return rel.startsWith('lib/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, WEB_SRC).localeCompare(relPath(b, WEB_SRC)));

  let md = `## Frontend - Lib / API Client\n\n`;
  md += `Lokalizacja: \`apps/web/src/lib/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, WEB_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateFrontendFeatureApiSection(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, WEB_SRC);
    return rel.startsWith('features/') && rel.includes('/api/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, WEB_SRC).localeCompare(relPath(b, WEB_SRC)));

  let md = `## Frontend - Feature API\n\n`;
  md += `Lokalizacja: \`apps/web/src/features/*/api/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, WEB_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateFrontendComponentsSection(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, WEB_SRC);
    return rel.startsWith('components/ui/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, WEB_SRC).localeCompare(relPath(b, WEB_SRC)));

  let md = `## Frontend - Komponenty UI\n\n`;
  md += `Lokalizacja: \`apps/web/src/components/ui/\`\n\n`;
  md += `| Komponent | Plik | Opis |\n`;
  md += `|-----------|------|------|\n`;

  for (const file of files) {
    const rel = relPath(file, WEB_SRC);
    const fileName = path.basename(file);
    const exports = parseExports(file);

    // Find the main component export - prefer PascalCase named export
    const pascalExport = exports.find(e =>
      ['function', 'async function', 'const', 'class'].includes(e.kind) &&
      /^[A-Z]/.test(e.name)
    );
    const anyExport = exports.find(e => ['function', 'async function', 'const', 'class'].includes(e.kind));

    // Derive PascalCase name from filename as fallback (e.g. alert-dialog.tsx -> AlertDialog)
    const fileBaseName = path.basename(file, path.extname(file));
    const pascalFromFile = fileBaseName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const componentName = pascalExport ? pascalExport.name : (anyExport && /^[A-Z]/.test(anyExport.name) ? anyExport.name : pascalFromFile);

    md += `| ${componentName} | \`${fileName}\` | |\n`;
  }

  md += '\n';
  return md;
}

function generatePackagesSection() {
  const sharedDir = path.join(PACKAGES_DIR, 'shared');
  if (!fs.existsSync(sharedDir)) return '';

  // Collect files - check for src/ subdir or root level .ts files
  let files = [];
  const srcDir = path.join(sharedDir, 'src');
  if (fs.existsSync(srcDir)) {
    files = collectFiles(srcDir);
  }
  // Also check root-level ts files
  const rootFiles = collectFiles(sharedDir, ['.ts', '.tsx']).filter(f => {
    const rel = path.relative(sharedDir, f);
    return !rel.startsWith('src') && !rel.startsWith('node_modules') && !rel.startsWith('dist');
  });
  files.push(...rootFiles);

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, sharedDir).localeCompare(relPath(b, sharedDir)));

  let md = `## Packages - Shared\n\n`;
  md += `Lokalizacja: \`packages/shared/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, sharedDir);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateBackendTypesConfigSection(allFiles) {
  const typeFiles = allFiles.filter(f => {
    const rel = relPath(f, API_SRC);
    return rel.startsWith('types/') || rel.startsWith('config/');
  });

  if (typeFiles.length === 0) return '';

  typeFiles.sort((a, b) => relPath(a, API_SRC).localeCompare(relPath(b, API_SRC)));

  let md = `## Backend - Types & Config\n\n`;

  for (const file of typeFiles) {
    const rel = relPath(file, API_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

function generateBackendValidatorsSection(allFiles) {
  const files = allFiles.filter(f => {
    const rel = relPath(f, API_SRC);
    return rel.startsWith('validators/');
  });

  if (files.length === 0) return '';

  files.sort((a, b) => relPath(a, API_SRC).localeCompare(relPath(b, API_SRC)));

  let md = `## Backend - Validators\n\n`;
  md += `Lokalizacja: \`apps/api/src/validators/\`\n\n`;

  for (const file of files) {
    const rel = relPath(file, API_SRC);
    const exports = parseExports(file);
    if (exports.length === 0) continue;
    md += formatFileSection(rel, exports) + '\n';
  }

  return md;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Scanning codebase...');

  // Collect all files
  const apiFiles = collectFiles(API_SRC);
  const webFiles = collectFiles(WEB_SRC);

  console.log(`  apps/api/src/: ${apiFiles.length} files`);
  console.log(`  apps/web/src/: ${webFiles.length} files`);

  // Build the date string
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Generate each section
  const sections = [];

  // Header
  sections.push(`# AKROBUD - Indeks Funkcji`);
  sections.push(``);
  sections.push(`> Kompletny indeks eksportowanych funkcji, klas, typow i stalych z numerami linii.`);
  sections.push(`> Ostatnia aktualizacja: ${dateStr}`);
  sections.push(`> Wygenerowano automatycznie przez \`pnpm reindex\``);
  sections.push(``);
  sections.push(`---`);
  sections.push(``);

  // TOC
  const tocItems = [
    'Backend - Handlers',
    'Backend - Services',
    'Backend - Repositories',
    'Backend - Routes',
    'Backend - Middleware',
    'Backend - Plugins',
    'Backend - Utils',
    'Backend - Validators',
    'Backend - Types & Config',
    'Frontend - Shared Hooks',
    'Frontend - Lib / API Client',
    'Frontend - Feature API',
    'Frontend - Komponenty UI',
    'Packages - Shared',
  ];

  sections.push(`## Spis tresci`);
  sections.push(``);
  for (let i = 0; i < tocItems.length; i++) {
    const anchor = tocItems[i].toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    sections.push(`${i + 1}. [${tocItems[i]}](#${anchor})`);
  }
  sections.push(``);
  sections.push(`---`);
  sections.push(``);

  // Backend sections
  const handlersSection = generateBackendSection('Backend - Handlers', 'handlers', apiFiles);
  if (handlersSection) sections.push(handlersSection + '---\n');

  const servicesSection = generateBackendSection('Backend - Services', 'services', apiFiles);
  if (servicesSection) sections.push(servicesSection + '---\n');

  const reposSection = generateBackendSection('Backend - Repositories', 'repositories', apiFiles);
  if (reposSection) sections.push(reposSection + '---\n');

  const routesSection = generateBackendRoutesTable(apiFiles);
  if (routesSection) sections.push(routesSection + '---\n');

  const middlewareSection = generateBackendSection('Backend - Middleware', 'middleware', apiFiles);
  if (middlewareSection) sections.push(middlewareSection + '---\n');

  const pluginsSection = generateBackendSection('Backend - Plugins', 'plugins', apiFiles);
  if (pluginsSection) sections.push(pluginsSection + '---\n');

  const utilsSection = generateBackendSection('Backend - Utils', 'utils', apiFiles);
  if (utilsSection) sections.push(utilsSection + '---\n');

  const validatorsSection = generateBackendValidatorsSection(apiFiles);
  if (validatorsSection) sections.push(validatorsSection + '---\n');

  const typesConfigSection = generateBackendTypesConfigSection(apiFiles);
  if (typesConfigSection) sections.push(typesConfigSection + '---\n');

  // Frontend sections
  const hooksSection = generateFrontendHooksSection(webFiles);
  if (hooksSection) sections.push(hooksSection + '---\n');

  const libSection = generateFrontendLibSection(webFiles);
  if (libSection) sections.push(libSection + '---\n');

  const featureApiSection = generateFrontendFeatureApiSection(webFiles);
  if (featureApiSection) sections.push(featureApiSection + '---\n');

  const componentsSection = generateFrontendComponentsSection(webFiles);
  if (componentsSection) sections.push(componentsSection + '---\n');

  // Packages section
  const packagesSection = generatePackagesSection();
  if (packagesSection) sections.push(packagesSection + '---\n');

  // Combine and write
  const output = sections.join('\n');
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const elapsed = Date.now() - startTime;
  const lineCount = output.split('\n').length;
  console.log(`\nFUNCTION_INDEX.md generated successfully!`);
  console.log(`  ${lineCount} lines written`);
  console.log(`  Time: ${elapsed}ms`);
}

main();
