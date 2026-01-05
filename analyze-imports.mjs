import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imports = {
  backend: {},
  frontend: {}
};

function extractImports(filePath, content) {
  const importRegex = /^import\s+(?:{[^}]*}|[\w*]+|\* as \w+|type\s+{[^}]*}|type\s+[\w*]+)\s+from\s+['"]([^'"]+)['"]/gm;
  const matches = [...content.matchAll(importRegex)];

  return matches.map(match => ({
    statement: match[0],
    path: match[1]
  }));
}

function analyzeDirectory(dir, type) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (!file.name.startsWith('.') && file.name !== 'node_modules') {
        analyzeDirectory(fullPath, type);
      }
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const fileImports = extractImports(fullPath, content);

        if (fileImports.length > 0) {
          const relativePath = path.relative(__dirname, fullPath);
          imports[type][relativePath] = fileImports;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
}

// Analyze backend
const backendPath = path.join(__dirname, 'apps', 'api', 'src');
if (fs.existsSync(backendPath)) {
  analyzeDirectory(backendPath, 'backend');
}

// Analyze frontend
const frontendPath = path.join(__dirname, 'apps', 'web', 'src');
if (fs.existsSync(frontendPath)) {
  analyzeDirectory(frontendPath, 'frontend');
}

// Generate report
console.log('='.repeat(80));
console.log('ANALIZA IMPORTÓW W PROJEKCIE AKROBUD');
console.log('='.repeat(80));

console.log('\n📦 BACKEND (apps/api/src)');
console.log('-'.repeat(80));

const backendFiles = Object.keys(imports.backend).sort();
for (const file of backendFiles) {
  console.log(`\n📄 ${file}`);
  const fileImports = imports.backend[file];

  // Grupuj importy
  const external = [];
  const internal = [];

  for (const imp of fileImports) {
    if (imp.path.startsWith('.') || imp.path.startsWith('@/')) {
      internal.push(imp);
    } else {
      external.push(imp);
    }
  }

  if (external.length > 0) {
    console.log('  🌍 External:');
    external.forEach(imp => console.log(`    - ${imp.path}`));
  }

  if (internal.length > 0) {
    console.log('  🏠 Internal:');
    internal.forEach(imp => console.log(`    - ${imp.path}`));
  }
}

console.log('\n\n🎨 FRONTEND (apps/web/src)');
console.log('-'.repeat(80));

const frontendFiles = Object.keys(imports.frontend).sort();
for (const file of frontendFiles.slice(0, 50)) { // Limit do 50 plików
  console.log(`\n📄 ${file}`);
  const fileImports = imports.frontend[file];

  // Grupuj importy
  const external = [];
  const internal = [];

  for (const imp of fileImports) {
    if (imp.path.startsWith('.') || imp.path.startsWith('@/')) {
      internal.push(imp);
    } else {
      external.push(imp);
    }
  }

  if (external.length > 0) {
    console.log('  🌍 External:');
    external.forEach(imp => console.log(`    - ${imp.path}`));
  }

  if (internal.length > 0) {
    console.log('  🏠 Internal:');
    internal.forEach(imp => console.log(`    - ${imp.path}`));
  }
}

if (frontendFiles.length > 50) {
  console.log(`\n... i ${frontendFiles.length - 50} więcej plików`);
}

// Statystyki
console.log('\n\n📊 STATYSTYKI');
console.log('-'.repeat(80));
console.log(`Backend: ${backendFiles.length} plików z importami`);
console.log(`Frontend: ${frontendFiles.length} plików z importami`);

// Najczęściej importowane moduły
const allPaths = [
  ...Object.values(imports.backend).flat(),
  ...Object.values(imports.frontend).flat()
].map(imp => imp.path);

const pathCounts = allPaths.reduce((acc, path) => {
  acc[path] = (acc[path] || 0) + 1;
  return acc;
}, {});

const topImports = Object.entries(pathCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('\n🔝 Top 20 najczęściej importowanych modułów:');
topImports.forEach(([path, count], index) => {
  console.log(`  ${index + 1}. ${path} (${count}x)`);
});

// Zapisz do pliku JSON
const outputPath = path.join(__dirname, 'import-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify({ imports, stats: { backendFiles: backendFiles.length, frontendFiles: frontendFiles.length, topImports } }, null, 2));
console.log(`\n✅ Pełna analiza zapisana do: ${outputPath}`);
