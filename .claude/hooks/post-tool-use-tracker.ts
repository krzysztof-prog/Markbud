#!/usr/bin/env npx tsx

/**
 * Post-tool-use hook that tracks edited files and their repos
 * This runs after Edit, MultiEdit, or Write tools complete successfully
 */

import * as fs from 'fs';
import * as path from 'path';

interface ToolInfo {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
  };
  session_id?: string;
}

// Read stdin
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));

    // Handle case where stdin is empty or not piped
    if (process.stdin.isTTY) {
      resolve('{}');
    }
  });
}

function detectRepo(filePath: string, projectRoot: string): string {
  // Normalize paths for cross-platform compatibility
  const normalizedFile = filePath.replace(/\\/g, '/');
  const normalizedRoot = projectRoot.replace(/\\/g, '/');

  // Remove project root from path
  let relativePath = normalizedFile;
  if (normalizedFile.startsWith(normalizedRoot)) {
    relativePath = normalizedFile.slice(normalizedRoot.length).replace(/^\//, '');
  }

  // Extract first directory component
  const parts = relativePath.split('/');
  const repo = parts[0];

  // Common project directory patterns
  const frontendPatterns = ['frontend', 'client', 'web', 'app', 'ui'];
  const backendPatterns = ['backend', 'server', 'api', 'src', 'services'];
  const dbPatterns = ['database', 'prisma', 'migrations'];
  const monorepoPatterns = ['packages', 'apps'];

  if (frontendPatterns.includes(repo) || backendPatterns.includes(repo) || dbPatterns.includes(repo)) {
    return repo;
  }

  if (monorepoPatterns.includes(repo)) {
    const packageName = parts[1];
    return packageName ? `${repo}/${packageName}` : repo;
  }

  if (repo === 'examples') {
    const example = parts[1];
    return example ? `examples/${example}` : repo;
  }

  // Check if it's a source file in root
  if (!relativePath.includes('/')) {
    return 'root';
  }

  return 'unknown';
}

function getBuildCommand(repo: string, projectRoot: string): string {
  const repoPath = path.join(projectRoot, repo);
  const packageJsonPath = path.join(repoPath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.scripts?.build) {
        // Detect package manager
        if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
          return `cd "${repoPath}" && pnpm build`;
        } else if (fs.existsSync(path.join(repoPath, 'package-lock.json'))) {
          return `cd "${repoPath}" && npm run build`;
        } else if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
          return `cd "${repoPath}" && yarn build`;
        }
        return `cd "${repoPath}" && npm run build`;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Special case for database with Prisma
  if (repo === 'database' || repo.includes('prisma')) {
    const schemaPath1 = path.join(repoPath, 'schema.prisma');
    const schemaPath2 = path.join(repoPath, 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath1) || fs.existsSync(schemaPath2)) {
      return `cd "${repoPath}" && npx prisma generate`;
    }
  }

  return '';
}

function getTscCommand(repo: string, projectRoot: string): string {
  const repoPath = path.join(projectRoot, repo);
  const tsconfigPath = path.join(repoPath, 'tsconfig.json');

  if (fs.existsSync(tsconfigPath)) {
    const appConfigPath = path.join(repoPath, 'tsconfig.app.json');
    if (fs.existsSync(appConfigPath)) {
      return `cd "${repoPath}" && npx tsc --project tsconfig.app.json --noEmit`;
    }
    return `cd "${repoPath}" && npx tsc --noEmit`;
  }

  return '';
}

async function main() {
  try {
    const input = await readStdin();
    const toolInfo: ToolInfo = input.trim() ? JSON.parse(input) : {};

    const toolName = toolInfo.tool_name || '';
    const filePath = toolInfo.tool_input?.file_path || '';
    const sessionId = toolInfo.session_id || 'default';

    // Skip if not an edit tool or no file path
    if (!['Edit', 'MultiEdit', 'Write'].includes(toolName) || !filePath) {
      process.exit(0);
    }

    // Skip markdown files
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      process.exit(0);
    }

    const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const cacheDir = path.join(projectRoot, '.claude', 'tsc-cache', sessionId);

    // Create cache directory
    fs.mkdirSync(cacheDir, { recursive: true });

    // Detect repo
    const repo = detectRepo(filePath, projectRoot);

    // Skip if unknown repo
    if (repo === 'unknown' || !repo) {
      process.exit(0);
    }

    // Log edited file
    const logPath = path.join(cacheDir, 'edited-files.log');
    fs.appendFileSync(logPath, `${Date.now()}:${filePath}:${repo}\n`);

    // Update affected repos list
    const reposPath = path.join(cacheDir, 'affected-repos.txt');
    let existingRepos = '';
    if (fs.existsSync(reposPath)) {
      existingRepos = fs.readFileSync(reposPath, 'utf8');
    }
    if (!existingRepos.split('\n').includes(repo)) {
      fs.appendFileSync(reposPath, `${repo}\n`);
    }

    // Store build commands
    const commandsPath = path.join(cacheDir, 'commands.txt');
    const commands: Set<string> = new Set();

    // Read existing commands
    if (fs.existsSync(commandsPath)) {
      fs.readFileSync(commandsPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .forEach((cmd) => commands.add(cmd));
    }

    const buildCmd = getBuildCommand(repo, projectRoot);
    const tscCmd = getTscCommand(repo, projectRoot);

    if (buildCmd) {
      commands.add(`${repo}:build:${buildCmd}`);
    }
    if (tscCmd) {
      commands.add(`${repo}:tsc:${tscCmd}`);
    }

    // Write unique commands
    fs.writeFileSync(commandsPath, Array.from(commands).join('\n') + '\n');

    process.exit(0);
  } catch (error) {
    // Silent exit on error - don't block the tool
    process.exit(0);
  }
}

main();
