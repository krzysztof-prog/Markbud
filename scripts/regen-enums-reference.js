#!/usr/bin/env node

// regen-enums-reference.js - Auto-generates ENUMS_REFERENCE.md
//
// Scans the AKROBUD codebase for all enum-like definitions:
//   1. z.enum([...]) in apps/api/src/validators/*.ts
//   2. TypeScript export enum in packages/shared/src/types/*.ts and apps/api/src/**/*.ts
//   3. export const X = {...} as const in packages/shared/src/constants.ts and similar
//   4. Prisma schema comment-based enums on String fields
//
// Output: ENUMS_REFERENCE.md at project root
//
// Usage:
//   node scripts/regen-enums-reference.js

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'ENUMS_REFERENCE.md');

const API_SRC = path.join(ROOT, 'apps', 'api', 'src');
const VALIDATORS_DIR = path.join(API_SRC, 'validators');
const PRISMA_SCHEMA = path.join(ROOT, 'apps', 'api', 'prisma', 'schema.prisma');
const SHARED_SRC = path.join(ROOT, 'packages', 'shared', 'src');
const SHARED_TYPES_DIR = path.join(SHARED_SRC, 'types');
const SHARED_CONSTANTS = path.join(SHARED_SRC, 'constants.ts');

// Skip patterns
const SKIP_DIRS = ['node_modules', 'dist', '.turbo', '__tests__', 'test', '.next'];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Recursively collect .ts files, skipping test and build directories */
function collectFiles(dir, extensions = ['.ts']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      if (entry.name.endsWith('.d.ts')) continue;
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
      results.push(fullPath);
    }
  }
  return results;
}

/** Project-relative path using forward slashes */
function relPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// ENUM ENTRY MODEL
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EnumEntry
 * @property {string} name - Display name (e.g. "UserRole", "ManualStatus")
 * @property {string[]} values - List of enum values
 * @property {string} source - Source type: 'zod' | 'ts-enum' | 'const-object' | 'const-array' | 'type-literal' | 'prisma-comment'
 * @property {string} file - Relative file path
 * @property {number} line - Line number
 * @property {string} [varName] - Variable/schema name in code
 */

// ---------------------------------------------------------------------------
// SCANNER 1: z.enum([...]) in validators
// ---------------------------------------------------------------------------

/**
 * Extract z.enum values from a source string that starts right after "z.enum("
 * Handles multi-line definitions.
 */
function extractZodEnumValues(lines, startIdx, startCol) {
  // Collect text from the z.enum([ opening to the matching ])
  let text = '';
  let bracketDepth = 0;
  let started = false;

  for (let i = startIdx; i < lines.length; i++) {
    const line = i === startIdx ? lines[i].substring(startCol) : lines[i];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '[') {
        bracketDepth++;
        started = true;
      } else if (ch === ']') {
        bracketDepth--;
        if (started && bracketDepth === 0) {
          // Extract values from accumulated text
          const matches = text.match(/['"]([^'"]+)['"]/g);
          if (matches) {
            return matches.map(m => m.replace(/['"]/g, ''));
          }
          return [];
        }
      }
      if (started) {
        text += ch;
      }
    }
    if (started) text += '\n';
  }
  return [];
}

/**
 * Derive a human-friendly enum name from a Zod schema variable name.
 * e.g. "manualStatusSchema" -> "ManualStatus"
 *      "orderClassSchema"   -> "OrderClass"
 *      "demandStatusSchema" -> "DemandStatus"
 *      "itemFlagSchema"     -> "ItemFlag"
 *      "glassOrderStatusUpdateSchema" -> "GlassOrderStatusUpdate"
 */
function zodVarToName(varName) {
  // Remove "Schema" suffix
  let name = varName.replace(/Schema$/, '');
  // PascalCase
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Scan a .ts file for z.enum([...]) patterns.
 * Returns EnumEntry[].
 *
 * Patterns matched:
 *   export const fooSchema = z.enum([...])
 *   const fooSchema = z.enum([...])
 *   foo: z.enum([...])       (inline in z.object)
 *   status: z.enum([...])    (inline in z.object)
 */
function scanZodEnums(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  const rel = relPath(filePath);

  // Pattern 1: Top-level const (exported or not)
  //   (export )?(const|let) varName = z.enum([
  const topLevelRe = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*z\.enum\s*\(/;

  // Pattern 2: Inline property in z.object
  //   propertyName: z.enum([
  // But also handle: status: z.enum([...]).optional()
  const inlineRe = /^\s+(\w+)\s*:\s*z\.enum\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check top-level
    const topMatch = line.match(topLevelRe);
    if (topMatch) {
      const varName = topMatch[1];
      const col = line.indexOf('z.enum(');
      const values = extractZodEnumValues(lines, i, col + 7);
      if (values.length > 0) {
        entries.push({
          name: zodVarToName(varName),
          values,
          source: 'zod',
          file: rel,
          line: lineNum,
          varName,
        });
      }
      continue;
    }

    // Check inline
    const inlineMatch = line.match(inlineRe);
    if (inlineMatch) {
      const propName = inlineMatch[1];
      const col = line.indexOf('z.enum(');
      if (col === -1) continue;
      const values = extractZodEnumValues(lines, i, col + 7);
      if (values.length > 0) {
        // Derive name from property name (PascalCase)
        const name = propName.charAt(0).toUpperCase() + propName.slice(1);
        entries.push({
          name,
          values,
          source: 'zod',
          file: rel,
          line: lineNum,
          varName: propName + ' (inline)',
        });
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// SCANNER 2: TypeScript export enum
// ---------------------------------------------------------------------------

// Scan a .ts file for "export enum Name { ... }" definitions.
// Extracts string values from KEY = 'value' assignments.
function scanTsEnums(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  const rel = relPath(filePath);

  const enumStartRe = /^export\s+enum\s+(\w+)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(enumStartRe);
    if (!match) continue;

    const enumName = match[1];
    const lineNum = i + 1;
    const values = [];

    // Collect enum members until closing brace
    for (let j = i; j < lines.length; j++) {
      const memberMatch = lines[j].match(/\w+\s*=\s*['"]([^'"]+)['"]/);
      if (memberMatch) {
        values.push(memberMatch[1]);
      }
      if (lines[j].includes('}') && j > i) break;
    }

    if (values.length > 0) {
      entries.push({
        name: enumName,
        values,
        source: 'ts-enum',
        file: rel,
        line: lineNum,
        varName: enumName,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// SCANNER 3: export const X = {...} as const and export const X = [...] as const
// ---------------------------------------------------------------------------

// Scan a .ts file for const-object enums and const-array enums.
//
// Object pattern:
//   export const ORDER_STATUS = { NEW: 'new', IN_PROGRESS: 'in_progress', ... } as const;
//
// Array pattern:
//   export const PALLET_TYPES = ['MALA', 'P2400', ...] as const;
function scanConstEnums(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  const rel = relPath(filePath);

  // Match "export const NAME = {" or "export const NAME = ["
  const constStartRe = /^export\s+const\s+([A-Z_][A-Z_0-9]*)\s*=\s*([{\[])/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(constStartRe);
    if (!match) continue;

    const constName = match[1];
    const opener = match[2];
    const lineNum = i + 1;
    const closer = opener === '{' ? '}' : ']';
    const isObject = opener === '{';

    // Accumulate lines until we find "} as const" or "] as const"
    let block = '';
    let found = false;
    for (let j = i; j < lines.length && j < i + 50; j++) {
      block += lines[j] + '\n';
      if (lines[j].includes(closer) && lines[j].includes('as const')) {
        found = true;
        break;
      }
      // Also handle closing brace on same line without "as const" on that line
      // But "as const" might be on the next line
      if (j > i && lines[j].trimStart().startsWith(closer)) {
        // Check if next line has "as const" or this line does
        if (block.includes('as const')) {
          found = true;
          break;
        }
        if (j + 1 < lines.length && lines[j + 1].includes('as const')) {
          block += lines[j + 1] + '\n';
          found = true;
          break;
        }
      }
    }

    if (!found) continue;
    if (!block.includes('as const')) continue;

    const values = [];

    if (isObject) {
      // Extract string values: KEY: 'value'
      const valueMatches = block.matchAll(/\w+\s*:\s*['"]([^'"]+)['"]/g);
      for (const vm of valueMatches) {
        values.push(vm[1]);
      }
    } else {
      // Extract string values from array: ['value1', 'value2']
      const valueMatches = block.matchAll(/['"]([^'"]+)['"]/g);
      for (const vm of valueMatches) {
        values.push(vm[1]);
      }
    }

    if (values.length > 0) {
      entries.push({
        name: constName,
        values,
        source: isObject ? 'const-object' : 'const-array',
        file: rel,
        line: lineNum,
        varName: constName,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// SCANNER 4: TypeScript type literal unions
// ---------------------------------------------------------------------------

/**
 * Scan for: export type FooBar = 'val1' | 'val2' | 'val3';
 */
function scanTypeLiterals(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  const rel = relPath(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Simple single-line pattern: export type Name = 'a' | 'b' | 'c' ...
    // Avoid matching complex types with { or generic <
    const typeMatch = line.match(/^export\s+type\s+(\w+)\s*=\s*(['"])/);
    if (!typeMatch) continue;

    // Must not have "typeof" - those are derived types, not literal unions
    if (line.includes('typeof')) continue;

    // Collect the full union (may span multiple lines, but usually single)
    let unionText = '';
    for (let j = i; j < lines.length && j < i + 10; j++) {
      unionText += lines[j];
      if (lines[j].includes(';')) break;
    }

    const values = [];
    const litMatches = unionText.matchAll(/['"]([^'"]+)['"]/g);
    for (const m of litMatches) {
      values.push(m[1]);
    }

    if (values.length >= 2) {
      entries.push({
        name: typeMatch[1],
        values,
        source: 'type-literal',
        file: rel,
        line: i + 1,
        varName: typeMatch[1],
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// SCANNER 5: Prisma schema comments
// ---------------------------------------------------------------------------

/**
 * Scan schema.prisma for fields with inline comment enums.
 * Pattern:  fieldName  String  @default("x")  // 'a' | 'b' | 'c'
 * Also:     fieldName  String  @default("x")  // comment: 'a' | 'b' | 'c' | more text
 *
 * We look for comments containing pipe-separated quoted values on String fields.
 */
function scanPrismaEnums(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  const rel = relPath(filePath);

  // Track current model name
  let currentModel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track model
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      continue;
    }
    if (line.match(/^\}/)) {
      currentModel = null;
      continue;
    }

    if (!currentModel) continue;

    // Look for String fields with inline comments containing pipe-separated values
    // Pattern: fieldName String ... // comment with 'val1' | 'val2' | 'val3'
    const commentIdx = line.indexOf('//');
    if (commentIdx === -1) continue;

    const comment = line.substring(commentIdx + 2).trim();

    // Must have at least one pipe
    if (!comment.includes('|')) continue;

    // Extract the field definition part (before comment)
    const defPart = line.substring(0, commentIdx).trim();

    // Must be a String field
    if (!defPart.includes('String')) continue;

    // Extract field name (first word in the trimmed definition, after any whitespace)
    const fieldMatch = defPart.match(/^\s*(\w+)\s+String/);
    if (!fieldMatch) continue;
    const fieldName = fieldMatch[1];

    // Skip relation fields, map fields, etc.
    if (['id', 'createdAt', 'updatedAt', 'deletedAt'].includes(fieldName)) continue;

    // Extract quoted values from comment
    // Match patterns like: 'val1' | 'val2' or "val1" | "val2"
    // Also handle unquoted: val1 | val2
    const values = [];

    // First try quoted values
    const quotedMatches = comment.matchAll(/['"]([^'"]+)['"]/g);
    for (const m of quotedMatches) {
      // Skip values that look like descriptions (contain spaces that are not enum values)
      const val = m[1].trim();
      if (val && !val.includes('  ') && val.length < 40) {
        values.push(val);
      }
    }

    // If we got at least 2 values from quotes and they look like enum values (no long text)
    if (values.length >= 2 && values.every(v => v.length < 30 && /^[\w_.-]+$/.test(v))) {
      // Build a name from model + field
      const name = currentModel + '.' + fieldName;

      entries.push({
        name,
        values,
        source: 'prisma-comment',
        file: rel,
        line: lineNum,
        varName: name,
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// CATEGORIZATION
// ---------------------------------------------------------------------------

/**
 * Categorize an enum entry into: Status, Type, Role, Other.
 * Uses the enum name and its values for heuristics.
 */
function categorize(entry) {
  const lowerName = entry.name.toLowerCase();
  const lowerVar = (entry.varName || '').toLowerCase();

  // Role detection
  if (lowerName.includes('role') || lowerName.includes('permission')) {
    return 'Role';
  }

  // Status detection
  if (
    lowerName.includes('status') ||
    lowerName.includes('state') ||
    lowerVar.includes('status')
  ) {
    return 'Status';
  }

  // Type detection
  if (
    lowerName.includes('type') ||
    lowerName.includes('class') ||
    lowerName.includes('kind') ||
    lowerName.includes('category') ||
    lowerName.includes('unit') ||
    lowerName.includes('severity') ||
    lowerName.includes('priority') ||
    lowerName.includes('currency') ||
    lowerName.includes('flag') ||
    lowerVar.includes('type')
  ) {
    return 'Type';
  }

  // Check if values suggest status
  const statusKeywords = ['pending', 'completed', 'active', 'archived', 'cancelled', 'draft', 'open', 'closed', 'failed', 'blocked'];
  if (entry.values.some(v => statusKeywords.includes(v.toLowerCase()))) {
    return 'Status';
  }

  return 'Other';
}

// ---------------------------------------------------------------------------
// DEDUPLICATION
// ---------------------------------------------------------------------------

/**
 * Deduplicate entries with identical value sets.
 * When the same enum is defined in multiple places (e.g. UserRole in shared + auth.ts),
 * keep all occurrences but group them under a single name with multiple sources.
 */
function deduplicateEntries(entries) {
  const byValuesKey = new Map();

  for (const entry of entries) {
    const key = entry.values.slice().sort().join('|');

    if (byValuesKey.has(key)) {
      const existing = byValuesKey.get(key);
      // If names are similar (same when lowercased), merge sources
      if (existing.name.toLowerCase() === entry.name.toLowerCase() ||
          existing.name.toLowerCase().replace(/[._]/g, '') === entry.name.toLowerCase().replace(/[._]/g, '')) {
        existing.extraSources = existing.extraSources || [];
        existing.extraSources.push({ file: entry.file, line: entry.line, source: entry.source, varName: entry.varName });
      } else {
        // Different names for same values - keep both
        byValuesKey.set(key + '::' + entry.name, entry);
      }
    } else {
      byValuesKey.set(key, entry);
    }
  }

  return Array.from(byValuesKey.values());
}

// ---------------------------------------------------------------------------
// FORMATTING
// ---------------------------------------------------------------------------

// Format values as inline markdown code
function fmtValues(values) {
  return values.map(v => '`' + v + '`').join(', ');
}

/** Format source as file:line */
function fmtSource(entry) {
  let result = '`' + entry.file + ':' + entry.line + '`';
  if (entry.extraSources && entry.extraSources.length > 0) {
    for (const s of entry.extraSources) {
      result += ', `' + s.file + ':' + s.line + '`';
    }
  }
  return result;
}

/** Format source type badge */
function fmtSourceType(entry) {
  const badges = {
    'zod': 'Zod',
    'ts-enum': 'TS enum',
    'const-object': 'const obj',
    'const-array': 'const arr',
    'type-literal': 'type',
    'prisma-comment': 'Prisma',
  };
  let types = [badges[entry.source] || entry.source];
  if (entry.extraSources) {
    for (const s of entry.extraSources) {
      const badge = badges[s.source] || s.source;
      if (!types.includes(badge)) types.push(badge);
    }
  }
  return types.join(', ');
}

// ---------------------------------------------------------------------------
// MARKDOWN GENERATION
// ---------------------------------------------------------------------------

function generateMarkdown(allEntries) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Categorize and sort
  const categorized = { Status: [], Type: [], Role: [], Other: [] };
  for (const entry of allEntries) {
    const cat = categorize(entry);
    categorized[cat].push(entry);
  }

  // Sort within each category alphabetically
  for (const cat of Object.keys(categorized)) {
    categorized[cat].sort((a, b) => a.name.localeCompare(b.name));
  }

  const sections = [];

  // Header
  sections.push('# Enums & Statusy - AKROBUD');
  sections.push('');
  sections.push('> Kompletna dokumentacja wszystkich enumow, statusow i stalych wartosci uzywanych w projekcie.');
  sections.push('> SQLite nie obsluguje enumow natywnie - walidacja odbywa sie na poziomie aplikacji (Zod + TypeScript).');
  sections.push('>');
  sections.push(`> Ostatnia aktualizacja: ${dateStr}`);
  sections.push(`> Wygenerowano automatycznie przez \`node scripts/regen-enums-reference.js\``);
  sections.push('');
  sections.push('---');
  sections.push('');

  // Quick Lookup Table
  sections.push('## Quick Lookup');
  sections.push('');
  sections.push('| Enum/Status | Wartosci | Zrodlo | Lokalizacja |');
  sections.push('|-------------|----------|--------|-------------|');

  for (const entry of allEntries.slice().sort((a, b) => a.name.localeCompare(b.name))) {
    const name = '**' + entry.name + '**';
    const vals = fmtValues(entry.values);
    const srcType = fmtSourceType(entry);
    const loc = fmtSource(entry);
    sections.push(`| ${name} | ${vals} | ${srcType} | ${loc} |`);
  }

  sections.push('');
  sections.push('---');
  sections.push('');

  // Grouped sections
  const categoryTitles = {
    Status: 'Status Enums',
    Type: 'Type / Classification Enums',
    Role: 'Role Enums',
    Other: 'Other Enums',
  };

  const categoryDescriptions = {
    Status: 'Enumy opisujace stan/status encji (zlecenia, dostawy, importy itp.).',
    Type: 'Enumy klasyfikujace typ, rodzaj, kategorie lub priorytet.',
    Role: 'Enumy ról uzytkownikow i uprawnien.',
    Other: 'Pozostale enumy i stale (kolory, profile, flagi itp.).',
  };

  for (const cat of ['Status', 'Type', 'Role', 'Other']) {
    const entries = categorized[cat];
    if (entries.length === 0) continue;

    sections.push(`## ${categoryTitles[cat]}`);
    sections.push('');
    sections.push(`> ${categoryDescriptions[cat]}`);
    sections.push('');

    for (const entry of entries) {
      sections.push(`### ${entry.name}`);
      sections.push('');

      // Values table
      sections.push('| Wartosc | Zrodlo |');
      sections.push('|---------|--------|');
      for (const val of entry.values) {
        sections.push(`| \`${val}\` | |`);
      }
      sections.push('');

      // Source info
      sections.push('**Lokalizacja:** ' + fmtSource(entry));
      sections.push('**Typ definicji:** ' + fmtSourceType(entry));
      if (entry.varName && entry.varName !== entry.name && !entry.varName.includes('(inline)')) {
        sections.push('**Nazwa w kodzie:** `' + entry.varName + '`');
      }
      sections.push('');
      sections.push('---');
      sections.push('');
    }
  }

  // Sources Summary
  sections.push('## Podsumowanie Zrodel');
  sections.push('');

  // Group entries by file
  const byFile = {};
  for (const entry of allEntries) {
    if (!byFile[entry.file]) byFile[entry.file] = [];
    byFile[entry.file].push(entry.name);
    if (entry.extraSources) {
      for (const s of entry.extraSources) {
        if (!byFile[s.file]) byFile[s.file] = [];
        byFile[s.file].push(entry.name);
      }
    }
  }

  sections.push('| Lokalizacja | Enumy |');
  sections.push('|-------------|-------|');
  const sortedFiles = Object.keys(byFile).sort();
  for (const file of sortedFiles) {
    const names = [...new Set(byFile[file])].sort().join(', ');
    sections.push(`| \`${file}\` | ${names} |`);
  }
  sections.push('');

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Scanning codebase for enum definitions...');

  const allEntries = [];

  // -----------------------------------------------------------------------
  // 1. Zod enums in validators
  // -----------------------------------------------------------------------
  console.log('\n  [1/5] Scanning validators for z.enum(...)...');
  const validatorFiles = collectFiles(VALIDATORS_DIR);
  let zodCount = 0;
  for (const file of validatorFiles) {
    const entries = scanZodEnums(file);
    allEntries.push(...entries);
    zodCount += entries.length;
  }
  console.log(`    Found ${zodCount} Zod enums in ${validatorFiles.length} validator files`);

  // -----------------------------------------------------------------------
  // 2. TypeScript export enums
  // -----------------------------------------------------------------------
  console.log('  [2/5] Scanning for TypeScript export enum...');
  const tsEnumFiles = [
    ...collectFiles(SHARED_TYPES_DIR),
    ...collectFiles(API_SRC),
  ];
  let tsEnumCount = 0;
  for (const file of tsEnumFiles) {
    const entries = scanTsEnums(file);
    allEntries.push(...entries);
    tsEnumCount += entries.length;
  }
  console.log(`    Found ${tsEnumCount} TypeScript enums`);

  // -----------------------------------------------------------------------
  // 3. Const object/array enums
  // -----------------------------------------------------------------------
  console.log('  [3/5] Scanning for const object/array enums...');
  const constFiles = [];
  // Shared constants
  if (fs.existsSync(SHARED_CONSTANTS)) {
    constFiles.push(SHARED_CONSTANTS);
  }
  // Also scan shared types for const objects
  constFiles.push(...collectFiles(SHARED_TYPES_DIR));
  // Scan API services and utils for const enums too
  const apiServiceFiles = collectFiles(path.join(API_SRC, 'services'));
  const apiUtilFiles = collectFiles(path.join(API_SRC, 'utils'));
  constFiles.push(...apiServiceFiles, ...apiUtilFiles);

  // Deduplicate file list
  const constFilesUnique = [...new Set(constFiles.map(f => path.resolve(f)))];

  let constCount = 0;
  for (const file of constFilesUnique) {
    const entries = scanConstEnums(file);
    allEntries.push(...entries);
    constCount += entries.length;
  }
  console.log(`    Found ${constCount} const enums`);

  // -----------------------------------------------------------------------
  // 4. Type literal unions
  // -----------------------------------------------------------------------
  console.log('  [4/5] Scanning for type literal unions...');
  const typeLiteralFiles = [
    ...collectFiles(SHARED_TYPES_DIR),
    ...collectFiles(path.join(API_SRC, 'services')),
    ...collectFiles(path.join(API_SRC, 'utils')),
  ];
  const typeLiteralFilesUnique = [...new Set(typeLiteralFiles.map(f => path.resolve(f)))];

  let typeLiteralCount = 0;
  for (const file of typeLiteralFilesUnique) {
    const entries = scanTypeLiterals(file);
    allEntries.push(...entries);
    typeLiteralCount += entries.length;
  }
  console.log(`    Found ${typeLiteralCount} type literal unions`);

  // -----------------------------------------------------------------------
  // 5. Prisma schema comments
  // -----------------------------------------------------------------------
  console.log('  [5/5] Scanning Prisma schema for enum-like comments...');
  const prismaEntries = scanPrismaEnums(PRISMA_SCHEMA);
  allEntries.push(...prismaEntries);
  console.log(`    Found ${prismaEntries.length} Prisma comment enums`);

  // -----------------------------------------------------------------------
  // Deduplicate
  // -----------------------------------------------------------------------
  console.log('\n  Deduplicating...');
  const deduped = deduplicateEntries(allEntries);
  console.log(`    ${allEntries.length} raw entries -> ${deduped.length} unique entries`);

  // -----------------------------------------------------------------------
  // Generate markdown
  // -----------------------------------------------------------------------
  console.log('  Generating ENUMS_REFERENCE.md...');
  const markdown = generateMarkdown(deduped);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  const elapsed = Date.now() - startTime;
  const lineCount = markdown.split('\n').length;

  console.log(`\nENUMS_REFERENCE.md generated successfully!`);
  console.log(`  ${deduped.length} enum definitions`);
  console.log(`  ${lineCount} lines written`);
  console.log(`  Time: ${elapsed}ms`);
}

main();
