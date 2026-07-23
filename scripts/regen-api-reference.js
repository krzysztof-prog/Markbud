#!/usr/bin/env node

/**
 * regen-api-reference.js - Auto-generates API_REFERENCE.md
 *
 * Scans the Fastify API codebase to extract route registrations, HTTP methods,
 * paths, schema descriptions, JSDoc comments, and validator schemas, then
 * produces a comprehensive API reference document.
 *
 * Usage:
 *   node scripts/regen-api-reference.js
 *   pnpm regen-api-reference
 *
 * Node.js built-in modules only - no external dependencies.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'API_REFERENCE.md');
const API_SRC = path.join(ROOT, 'apps', 'api', 'src');
const INDEX_FILE = path.join(API_SRC, 'index.ts');
const ROUTES_DIR = path.join(API_SRC, 'routes');
const VALIDATORS_DIR = path.join(API_SRC, 'validators');

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Recursively collect files matching given extensions under a directory.
 */
function collectFiles(dir, extensions = ['.ts']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.turbo', '__tests__', 'test'].includes(entry.name)) continue;
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      if (entry.name.endsWith('.d.ts')) continue;
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Read file content as UTF-8 string.
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Normalise path separators to forward slashes.
 */
function normSlash(p) {
  return p.replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// STEP 1 - Parse index.ts for route registrations with prefixes
// ---------------------------------------------------------------------------

/**
 * Returns an array of { varName, prefix } from index.ts
 *   e.g. { varName: 'orderRoutes', prefix: '/api/orders' }
 *
 * Also handles inline routes defined directly in index.ts (fastify.get/post etc.)
 */
function parseIndexRegistrations() {
  const content = readFile(INDEX_FILE);
  const lines = content.split('\n');
  const registrations = [];

  // Match: fastify.register(XXX, { prefix: '/api/...' })
  // Handles: await fastify.register(orderRoutes, { prefix: '/api/orders' });
  // Also handles: await fastify.register(schucoRoutes, { prefix: '/api/schuco' });
  const registerRe = /fastify\.register\(\s*(\w+)\s*,\s*\{\s*prefix:\s*['"`]([^'"`]+)['"`]\s*\}/g;

  let match;
  while ((match = registerRe.exec(content)) !== null) {
    registrations.push({
      varName: match[1],
      prefix: match[2],
    });
  }

  // Also detect inline routes defined directly in index.ts
  // e.g. fastify.get('/api/health', { schema: { ... } }, async () => { ... })
  const inlineRouteRe = /fastify\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const inlineRoutes = [];

  let inlineMatch;
  while ((inlineMatch = inlineRouteRe.exec(content)) !== null) {
    const method = inlineMatch[1].toUpperCase();
    const fullPath = inlineMatch[2];

    // Try to extract schema.description from surrounding context
    const matchStart = inlineMatch.index;
    const blockEnd = content.indexOf('\n});', matchStart);
    const block = blockEnd > -1 ? content.substring(matchStart, blockEnd + 4) : content.substring(matchStart, matchStart + 1000);

    let description = '';
    const descRe = /description:\s*['"`]([^'"`]+)['"`]/;
    const descMatch = block.match(descRe);
    if (descMatch) {
      description = descMatch[1];
    }

    let tags = [];
    const tagsRe = /tags:\s*\[([^\]]*)\]/;
    const tagsMatch = block.match(tagsRe);
    if (tagsMatch) {
      tags = tagsMatch[1].replace(/['"` ]/g, '').split(',').filter(Boolean);
    }

    inlineRoutes.push({ method, path: fullPath, description, tags, source: 'index.ts' });
  }

  return { registrations, inlineRoutes };
}

// ---------------------------------------------------------------------------
// STEP 2 - Parse route files for HTTP method calls
// ---------------------------------------------------------------------------

/**
 * Finds the route file on disk for a given import variable name.
 * Handles: import { colorRoutes } from './routes/colors.js'
 * We search the index.ts imports to map varName -> file path.
 */
function buildImportMap() {
  const content = readFile(INDEX_FILE);
  const importMap = {};

  // Match import statements:
  //   import { colorRoutes } from './routes/colors.js';
  //   import userRoutes from './routes/users.js';
  //   import { okucRoutes } from './routes/okuc.js';
  const importRe = /import\s+(?:\{?\s*(\w+)\s*\}?|(\w+))\s+from\s+['"`]\.\/routes\/([^'"`]+)['"`]/g;

  let match;
  while ((match = importRe.exec(content)) !== null) {
    const varName = match[1] || match[2];
    let filePath = match[3];
    // Normalise: remove .js extension, resolve .ts
    filePath = filePath.replace(/\.js$/, '');
    const fullPath = path.join(ROUTES_DIR, filePath + '.ts');
    importMap[varName] = fullPath;
  }

  return importMap;
}

/**
 * Parse a single route file to extract endpoint definitions.
 *
 * Returns array of:
 *   { method, path, description, tags, jsDocComment, hasPreHandler }
 *
 * Handles both patterns:
 *   - FastifyPluginAsync: export const xxxRoutes: FastifyPluginAsync = async (fastify) => { ... }
 *   - Function-based: export default async function xxxRoutes(fastify: FastifyInstance) { ... }
 *
 * Regex detects: fastify.(get|post|put|patch|delete)('/path', ...)
 * Supports: single quotes, double quotes, template literals, path parameters like /:id
 */
function parseRouteFile(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const content = readFile(filePath);
  const lines = content.split('\n');
  const routes = [];

  // Match: fastify.(get|post|put|patch|delete)<...>('/path', ...)
  // Allow optional TypeScript generic parameter after method name: <{ Params: ... }>
  const routeRe = /fastify\.(get|post|put|patch|delete)\s*(?:<[^>]*(?:<[^>]*>[^>]*)*>)?\s*\(\s*['"`]([^'"`]+)['"`]/g;

  let routeMatch;
  while ((routeMatch = routeRe.exec(content)) !== null) {
    const method = routeMatch[1].toUpperCase();
    const routePath = routeMatch[2];
    const matchIndex = routeMatch.index;

    // Find the matching line number
    const precedingContent = content.substring(0, matchIndex);
    const lineNum = precedingContent.split('\n').length;

    // Extract schema.description if present
    // Look forward from this match to find the schema block
    let description = '';
    let tags = [];

    // Find the extent of this route's options block
    // We look for the schema: { ... } within this route definition
    const afterMatch = content.substring(matchIndex);
    const schemaBlockEnd = findBalancedEnd(afterMatch, '(', ')');
    const routeBlock = schemaBlockEnd > -1 ? afterMatch.substring(0, schemaBlockEnd) : afterMatch.substring(0, 2000);

    // Extract description
    const descRe = /description:\s*['"`]([^'"`]+)['"`]/;
    const descMatch = routeBlock.match(descRe);
    if (descMatch) {
      description = descMatch[1];
    }

    // Extract tags
    const tagsRe = /tags:\s*\[([^\]]*)\]/;
    const tagsMatch = routeBlock.match(tagsRe);
    if (tagsMatch) {
      tags = tagsMatch[1].replace(/['"`\s]/g, '').split(',').filter(Boolean);
    }

    // If no description from schema, try JSDoc comment above
    if (!description) {
      description = extractJSDocAboveLine(lines, lineNum - 1);
    }

    routes.push({
      method,
      path: routePath,
      description,
      tags,
      line: lineNum,
    });
  }

  return routes;
}

/**
 * Find the end position of a balanced pair of brackets starting from the first opener.
 */
function findBalancedEnd(str, opener, closer) {
  let depth = 0;
  let started = false;
  for (let i = 0; i < str.length && i < 5000; i++) {
    if (str[i] === opener) {
      depth++;
      started = true;
    } else if (str[i] === closer) {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Check if a comment text is actually a useful endpoint description
 * (not a section header, not a code-level comment, etc.).
 */
function isUsefulDescription(text) {
  if (!text || text.length < 4) return false;
  // Skip section dividers: ====, ----
  if (/^[=\-]{3,}/.test(text)) return false;
  // Skip generic section headers about delegation or routing
  if (/\broutes?\b.*\bdelegate\b/i.test(text)) return false;
  if (/\bdelegate\s+to\s+handler/i.test(text)) return false;
  if (/\brequire\s+auth/i.test(text)) return false;
  // Skip section header patterns: "Xxx routes", "Core xxx routes", etc.
  if (/^(?:routes?|core|item|order|file|protocol|complete|bulk)\s+.*routes?\s*[-:]?/i.test(text)) return false;
  if (/routes?\s*[-:]\s*(?:only|all|delegate)/i.test(text)) return false;
  // Skip "Routes - description" pattern where description says "delegate" or "require"
  if (/^[\w\s]+routes?\s*-\s*/i.test(text) && (/delegate|require|handler/i.test(text))) return false;
  // Skip comments that are about auth/routing structure, not endpoint behavior
  if (/^(require|all|only)\s+(auth|routes|authentication)/i.test(text)) return false;
  if (/^SECURITY:/i.test(text)) return false;
  // Skip "PUT settings" style auto-descriptions that snuck through (just method+noun)
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\w+$/i.test(text)) return false;
  // Skip TODO, eslint, etc.
  if (/^(eslint|TODO|FIXME|HACK|NOTE:|TEMP|DISABLED)/i.test(text)) return false;
  return true;
}

/**
 * Extract JSDoc or inline comment from lines above a given line index.
 * Looks for patterns like:
 *   // GET /api/orders - description text
 *   /** description text * /
 *
 * Only returns text that looks like a genuine endpoint description.
 */
function extractJSDocAboveLine(lines, lineIdx) {
  // Search upward from the line just above the route definition
  for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 5); i--) {
    const trimmed = lines[i].trim();

    // Single-line comment: // GET /api/orders - description
    // or: // description
    if (trimmed.startsWith('//')) {
      const commentText = trimmed.replace(/^\/\/\s*/, '');
      // If it looks like "METHOD /path - Description", extract the description part
      const methodPathDesc = commentText.match(/^(?:GET|POST|PUT|PATCH|DELETE)\s+\S+\s*[-:]\s*(.+)/i);
      if (methodPathDesc) {
        const desc = methodPathDesc[1].trim();
        if (isUsefulDescription(desc)) return desc;
      }
      // Otherwise check if it's a general description
      if (isUsefulDescription(commentText)) {
        return commentText;
      }
    }

    // JSDoc single-line: /** description */
    const jsdocSingle = trimmed.match(/^\/\*\*\s*(.+?)\s*\*\/$/);
    if (jsdocSingle) {
      const desc = jsdocSingle[1];
      if (isUsefulDescription(desc)) return desc;
    }

    // JSDoc multi-line: look for * description
    if (trimmed.startsWith('*') && !trimmed.startsWith('*/') && !trimmed.startsWith('* @')) {
      const text = trimmed.replace(/^\*\s*/, '');
      if (isUsefulDescription(text)) return text;
    }

    // Stop searching if we hit a non-comment line (code line)
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('*/') && !trimmed.startsWith('@')) {
      break;
    }
  }
  return '';
}

/**
 * Parse a "parent" route file that registers sub-route plugins.
 * e.g. okuc.ts registers okucArticleRoutes with prefix '/articles'
 *
 * Returns array of { varName, subPrefix }
 */
function parseSubRegistrations(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = readFile(filePath);
  const subs = [];

  const registerRe = /fastify\.register\(\s*(\w+)\s*,\s*\{\s*prefix:\s*['"`]([^'"`]+)['"`]\s*\}/g;
  let match;
  while ((match = registerRe.exec(content)) !== null) {
    subs.push({ varName: match[1], subPrefix: match[2] });
  }
  return subs;
}

/**
 * Resolve sub-route file imports from a parent route file.
 * Returns a map: varName -> absolute file path
 */
function resolveSubRouteImports(parentFilePath) {
  const content = readFile(parentFilePath);
  const dir = path.dirname(parentFilePath);
  const importMap = {};

  // Match: import { okucArticleRoutes } from './okuc/articles.js';
  const importRe = /import\s+\{?\s*(\w+)\s*\}?\s+from\s+['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    const varName = match[1];
    let importPath = match[2];
    // Only resolve relative imports
    if (!importPath.startsWith('.')) continue;
    importPath = importPath.replace(/\.js$/, '') + '.ts';
    const resolved = path.resolve(dir, importPath);
    importMap[varName] = resolved;
  }
  return importMap;
}

// ---------------------------------------------------------------------------
// STEP 3 - Parse validators for Zod schema names
// ---------------------------------------------------------------------------

/**
 * Scan a validator file for exported Zod schema names.
 * Returns array of { name, line }
 */
function parseValidatorSchemas(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = readFile(filePath);
  const lines = content.split('\n');
  const schemas = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Match: export const createOrderSchema = z.object({
    // Also: export const orderNumberSchema = z.string()...
    const schemaMatch = trimmed.match(/^export\s+const\s+(\w+Schema)\b/);
    if (schemaMatch) {
      schemas.push({ name: schemaMatch[1], line: i + 1 });
    }
    // Match exported types: export type CreateOrderInput = z.infer<...>
    const typeMatch = trimmed.match(/^export\s+type\s+(\w+)\s*=\s*z\.infer/);
    if (typeMatch) {
      schemas.push({ name: typeMatch[1], line: i + 1 });
    }
  }
  return schemas;
}

/**
 * Build a map of validator file name (without extension) -> schemas
 */
function buildValidatorMap() {
  const validatorMap = {};
  const files = collectFiles(VALIDATORS_DIR);
  for (const file of files) {
    const baseName = path.basename(file, '.ts');
    const schemas = parseValidatorSchemas(file);
    if (schemas.length > 0) {
      validatorMap[baseName] = {
        file: normSlash(path.relative(API_SRC, file)),
        schemas,
      };
    }
  }
  return validatorMap;
}

// ---------------------------------------------------------------------------
// STEP 4 - Assemble all route data into structured modules
// ---------------------------------------------------------------------------

/**
 * Derive a human-readable module name from a route prefix.
 *   /api/orders -> Orders
 *   /api/currency-config -> Currency Config
 *   /api/glass-orders -> Glass Orders
 */
function prefixToModuleName(prefix) {
  const segment = prefix.replace(/^\/api\//, '');
  return segment
    .split(/[-/]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Generate a short description from the route path + method if none exists.
 */
function autoDescription(method, routePath, moduleName) {
  if (routePath === '/' || routePath === '') {
    switch (method) {
      case 'GET': return `List ${moduleName.toLowerCase()}`;
      case 'POST': return `Create ${moduleName.toLowerCase()}`;
      default: return `${method} ${moduleName.toLowerCase()}`;
    }
  }

  if (routePath === '/:id') {
    switch (method) {
      case 'GET': return `Get by ID`;
      case 'PUT': return `Update by ID`;
      case 'PATCH': return `Partial update`;
      case 'DELETE': return `Delete by ID`;
      default: return `${method} by ID`;
    }
  }

  // Remove parameter segments (like :id, :colorId) for readable description
  // but keep action segments (like /archive, /approve, /pdf)
  const segments = routePath.replace(/^\//, '').split('/').filter(Boolean);
  const meaningful = [];
  for (const seg of segments) {
    if (seg.startsWith(':')) continue; // skip path parameters
    // Convert kebab-case to Title Case
    const words = seg.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    meaningful.push(words);
  }

  if (meaningful.length === 0) {
    // Path is purely params like /:id/:otherId
    switch (method) {
      case 'GET': return `Get by ID`;
      case 'PUT': return `Update by ID`;
      case 'PATCH': return `Partial update by ID`;
      case 'DELETE': return `Delete by ID`;
      case 'POST': return `Create`;
      default: return method;
    }
  }

  const label = meaningful.join(' ');

  // For single-word action segments, add method context
  if (meaningful.length === 1) {
    const action = meaningful[0].toLowerCase();
    switch (method) {
      case 'GET': return `Get ${action}`;
      case 'POST': return `${label}`;
      case 'PUT': return `Update ${action}`;
      case 'PATCH': return `Update ${action}`;
      case 'DELETE': return `Delete ${action}`;
      default: return label;
    }
  }

  return label;
}

/**
 * Try to guess the validator file for a given module name.
 * e.g. "orders" -> "order", "colors" -> "color", "currency-config" -> "currencyConfig"
 */
function guessValidatorKey(prefix) {
  const segment = prefix.replace(/^\/api\//, '').replace(/\//g, '-');

  // Known mappings (plural route -> singular validator, or kebab -> camel)
  const mappings = {
    'orders': 'order',
    'colors': 'color',
    'deliveries': 'delivery',
    'profiles': 'profile',
    'imports': 'import',
    'settings': 'settings',
    'warehouse': 'warehouse',
    'warehouse-orders': 'warehouse-orders',
    'pallets': 'pallet',
    'pallet-stock': 'pallet-stock',
    'currency-config': 'currencyConfig',
    'timesheets': 'timesheets',
    'steel': 'steel',
    'schuco': 'schuco',
    'auth': 'auth',
    'users': 'auth', // users may use auth validator
    'dashboard': 'dashboard',
    'glass-orders': 'glass',
    'glass-deliveries': 'glass',
    'glass-validations': 'glass',
    'working-days': 'common',
    'production-reports': 'production-reports',
    'production-planning': 'productionPlanning',
    'label-checks': 'label-check',
    'bug-reports': 'bugReport',
    'okuc': 'okuc',
    'akrobud-verification': 'akrobud-verification',
    'moja-praca': 'moja-praca',
    'logistics': 'logistics',
    'profile-depths': 'profileDepth',
    'profile-pallet-configs': 'profilePalletConfig',
    'cleanup/pending-prices': 'common',
    'private-colors': 'color',
    'monthly-reports': 'common',
    'attendance': 'common',
    'pvc-warehouse': 'common',
    'health': 'common',
    'help': 'common',
    'gmail': 'common',
  };

  return mappings[segment] || segment;
}

/**
 * Determine the handler file for a given route prefix.
 * Convention: /api/orders -> handlers/orderHandler.ts
 */
function guessHandlerFile(prefix) {
  const segment = prefix.replace(/^\/api\//, '').split('/')[0];
  // kebab-case -> camelCase + "Handler"
  const camel = segment
    .split('-')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
  return `handlers/${camel}Handler.ts`;
}

/**
 * Main assembly: gather all modules with their routes, validators, etc.
 */
function assembleModules() {
  const { registrations, inlineRoutes } = parseIndexRegistrations();
  const importMap = buildImportMap();
  const validatorMap = buildValidatorMap();

  const modules = [];

  for (const reg of registrations) {
    const { varName, prefix } = reg;
    const routeFilePath = importMap[varName];
    if (!routeFilePath) {
      console.warn(`  Warning: Could not resolve import for ${varName}`);
      continue;
    }

    const moduleName = prefixToModuleName(prefix);
    const routeFileRel = normSlash(path.relative(API_SRC, routeFilePath));

    // Check if this route file registers sub-routes (like okuc.ts)
    const subRegistrations = parseSubRegistrations(routeFilePath);
    const allRoutes = [];

    if (subRegistrations.length > 0) {
      // This is a parent router - collect routes from sub-files
      const subImportMap = resolveSubRouteImports(routeFilePath);

      // Also parse the parent file itself for any direct routes (like /health)
      const parentRoutes = parseRouteFile(routeFilePath);
      for (const r of parentRoutes) {
        allRoutes.push({
          method: r.method,
          path: prefix + r.path,
          description: r.description || autoDescription(r.method, r.path, moduleName),
          tags: r.tags,
        });
      }

      for (const sub of subRegistrations) {
        const subFilePath = subImportMap[sub.varName];
        if (!subFilePath || !fs.existsSync(subFilePath)) {
          console.warn(`  Warning: Could not resolve sub-route file for ${sub.varName}`);
          continue;
        }
        const subRoutes = parseRouteFile(subFilePath);
        for (const r of subRoutes) {
          const fullPath = prefix + sub.subPrefix + (r.path === '/' ? '' : r.path);
          allRoutes.push({
            method: r.method,
            path: fullPath,
            description: r.description || autoDescription(r.method, r.path, prefixToModuleName(sub.subPrefix)),
            tags: r.tags,
          });
        }
      }
    } else {
      // Simple route file - parse directly
      const routes = parseRouteFile(routeFilePath);
      for (const r of routes) {
        const fullPath = prefix + (r.path === '/' ? '' : r.path);
        allRoutes.push({
          method: r.method,
          path: fullPath,
          description: r.description || autoDescription(r.method, r.path, moduleName),
          tags: r.tags,
        });
      }
    }

    // Validator info
    const validatorKey = guessValidatorKey(prefix);
    const validator = validatorMap[validatorKey] || null;

    modules.push({
      name: moduleName,
      prefix,
      routeFile: routeFileRel,
      handlerFile: guessHandlerFile(prefix),
      validator,
      routes: allRoutes,
    });
  }

  // Add inline routes from index.ts (health, ready, etc.) as a pseudo-module
  if (inlineRoutes.length > 0) {
    // Group inline routes by their first path segment after /api/
    const grouped = {};
    for (const r of inlineRoutes) {
      // Check if this route's path is already claimed by a registered module
      const claimed = modules.some(m => r.path.startsWith(m.prefix + '/') || r.path === m.prefix);
      if (claimed) continue;

      const key = 'Inline';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }

    for (const [key, routes] of Object.entries(grouped)) {
      // These inline routes may overlap with registered module paths (e.g. /api/health)
      // Only add routes that are not already covered
      const filteredRoutes = routes.filter(r => {
        return !modules.some(m =>
          m.routes.some(mr => mr.method === r.method && mr.path === r.path)
        );
      });

      if (filteredRoutes.length > 0) {
        modules.push({
          name: key,
          prefix: '',
          routeFile: 'index.ts',
          handlerFile: 'index.ts',
          validator: null,
          routes: filteredRoutes.map(r => ({
            method: r.method,
            path: r.path,
            description: r.description || '',
            tags: r.tags || [],
          })),
        });
      }
    }
  }

  return { modules, validatorMap };
}

// ---------------------------------------------------------------------------
// STEP 5 - Generate Markdown
// ---------------------------------------------------------------------------

function generateMarkdown(modules, validatorMap) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const lines = [];

  // Header
  lines.push('# API Reference - AKROBUD');
  lines.push('');
  lines.push('> Comprehensive reference for all REST API endpoints.');
  lines.push('> Base URL: `http://localhost:5000` (prod) / `http://localhost:3001` (dev)');
  lines.push(`> Last updated: ${dateStr}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // -----------------------------------------------------------------------
  // Quick Lookup Table
  // -----------------------------------------------------------------------
  lines.push('## Quick Lookup Table');
  lines.push('');
  lines.push('| Method | Endpoint | Description |');
  lines.push('|--------|----------|-------------|');

  for (const mod of modules) {
    if (mod.name === 'Inline') continue; // inline routes get appended at end
    lines.push(`| **${mod.name}** | | |`);
    for (const route of mod.routes) {
      lines.push(`| ${route.method} | \`${route.path}\` | ${route.description} |`);
    }
  }

  // Inline routes at the end
  const inlineMod = modules.find(m => m.name === 'Inline');
  if (inlineMod) {
    lines.push(`| **Inline (index.ts)** | | |`);
    for (const route of inlineMod.routes) {
      lines.push(`| ${route.method} | \`${route.path}\` | ${route.description} |`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // -----------------------------------------------------------------------
  // Detailed sections per module
  // -----------------------------------------------------------------------
  lines.push('## Detailed Endpoints');
  lines.push('');

  for (const mod of modules) {
    if (mod.name === 'Inline') continue;

    lines.push(`### ${mod.name}`);
    lines.push('');

    // File references
    const refParts = [`**Route file:** \`${mod.routeFile}\``];
    if (mod.handlerFile && mod.handlerFile !== 'index.ts') {
      refParts.push(`**Handler:** \`${mod.handlerFile}\``);
    }
    if (mod.validator) {
      refParts.push(`**Validator:** \`${mod.validator.file}\``);
    }
    lines.push(refParts.join(' | '));
    lines.push('');

    // Each route endpoint
    for (const route of mod.routes) {
      lines.push(`#### ${route.method} ${route.path}`);
      lines.push(`- **Description:** ${route.description}`);
      if (route.tags && route.tags.length > 0) {
        lines.push(`- **Tags:** ${route.tags.join(', ')}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // -----------------------------------------------------------------------
  // Validators reference
  // -----------------------------------------------------------------------
  lines.push('## Validators');
  lines.push('');
  lines.push('> Zod validation schemas used across the API.');
  lines.push('');

  const validatorKeys = Object.keys(validatorMap).sort();
  for (const key of validatorKeys) {
    const val = validatorMap[key];
    lines.push(`### ${val.file}`);
    lines.push('');
    const schemaNames = val.schemas.filter(s => s.name.endsWith('Schema'));
    const typeNames = val.schemas.filter(s => !s.name.endsWith('Schema'));
    if (schemaNames.length > 0) {
      lines.push('**Schemas:**');
      for (const s of schemaNames) {
        lines.push(`- \`${s.name}\` (L${s.line})`);
      }
      lines.push('');
    }
    if (typeNames.length > 0) {
      lines.push('**Types:**');
      for (const t of typeNames) {
        lines.push(`- \`${t.name}\` (L${t.line})`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();

  console.log('Scanning API codebase for route definitions...');
  console.log(`  Index file: ${normSlash(path.relative(ROOT, INDEX_FILE))}`);
  console.log(`  Routes dir: ${normSlash(path.relative(ROOT, ROUTES_DIR))}`);
  console.log(`  Validators dir: ${normSlash(path.relative(ROOT, VALIDATORS_DIR))}`);
  console.log('');

  const { modules, validatorMap } = assembleModules();

  let totalRoutes = 0;
  for (const mod of modules) {
    console.log(`  ${mod.name}: ${mod.routes.length} endpoints (${mod.prefix || 'inline'})`);
    totalRoutes += mod.routes.length;
  }
  console.log('');
  console.log(`  Total modules: ${modules.length}`);
  console.log(`  Total endpoints: ${totalRoutes}`);
  console.log(`  Total validators: ${Object.keys(validatorMap).length} files`);

  const markdown = generateMarkdown(modules, validatorMap);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  const elapsed = Date.now() - startTime;
  const lineCount = markdown.split('\n').length;

  console.log('');
  console.log(`API_REFERENCE.md generated successfully!`);
  console.log(`  ${lineCount} lines written`);
  console.log(`  Time: ${elapsed}ms`);
}

main();
