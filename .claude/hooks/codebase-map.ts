#!/usr/bin/env node
/**
 * Codebase Map Generator (SessionStart)
 *
 * Generates an intelligent map of the codebase at session start:
 * - Project structure
 * - Key files and their purpose
 * - Dependencies between modules
 * - Recent changes (git)
 * - Database schema overview
 *
 * Reduces token usage by providing structure upfront.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, relative } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
}

function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

function runCommand(cmd: string, cwd: string): string {
    try {
        return execSync(cmd, {
            cwd,
            encoding: 'utf8',
            timeout: 10000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch {
        return '';
    }
}

function getDirectoryStructure(dir: string, maxDepth: number = 2, currentDepth: number = 0, prefix: string = ''): string[] {
    if (currentDepth >= maxDepth) return [];

    const items: string[] = [];

    try {
        const entries = readdirSync(dir, { withFileTypes: true });

        // Filter out node_modules, .git, dist, build
        const filtered = entries.filter(entry => {
            const name = entry.name;
            return !['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo'].includes(name);
        });

        filtered.forEach((entry, index) => {
            const isLast = index === filtered.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            if (entry.isDirectory()) {
                items.push(prefix + connector + entry.name + '/');

                const subPath = join(dir, entry.name);
                const children = getDirectoryStructure(subPath, maxDepth, currentDepth + 1, prefix + childPrefix);
                items.push(...children);
            } else {
                // Only show important files
                if (/\.(json|md|ts|tsx|js|jsx|prisma|env\.example)$/.test(entry.name) ||
                    ['package.json', 'tsconfig.json', 'README.md', '.env.example'].includes(entry.name)) {
                    items.push(prefix + connector + entry.name);
                }
            }
        });
    } catch {
        // Skip on error
    }

    return items;
}

function getPrismaSchema(projectDir: string): string {
    const schemaPath = join(projectDir, 'apps', 'api', 'prisma', 'schema.prisma');

    if (!existsSync(schemaPath)) {
        return '';
    }

    try {
        const schema = readFileSync(schemaPath, 'utf-8');
        const models = schema.match(/model\s+\w+\s*{[^}]+}/g) || [];

        let output = '\n## Database Schema (Prisma)\n\n';
        output += `Models: ${models.length}\n\n`;

        models.slice(0, 10).forEach(model => {
            const modelName = model.match(/model\s+(\w+)/)?.[1];
            const fields = (model.match(/^\s+\w+/gm) || []).length;
            output += `- ${modelName} (${fields} fields)\n`;
        });

        if (models.length > 10) {
            output += `\n... and ${models.length - 10} more models\n`;
        }

        return output;
    } catch {
        return '';
    }
}

function getGitInfo(projectDir: string): string {
    const branch = runCommand('git branch --show-current', projectDir).trim();
    const status = runCommand('git status --short', projectDir).trim();
    const recentCommits = runCommand('git log --oneline -5', projectDir).trim();

    let output = '\n## Git Status\n\n';
    output += `Current branch: ${branch || 'unknown'}\n`;

    if (status) {
        const lines = status.split('\n').length;
        output += `Modified files: ${lines}\n`;
    } else {
        output += 'Working tree clean\n';
    }

    if (recentCommits) {
        output += '\nRecent commits:\n';
        recentCommits.split('\n').slice(0, 3).forEach(line => {
            output += `  ${line}\n`;
        });
    }

    return output;
}

function getPackageInfo(projectDir: string): string {
    const pkgPath = join(projectDir, 'package.json');

    if (!existsSync(pkgPath)) {
        return '';
    }

    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

        let output = '\n## Project Info\n\n';
        output += `Name: ${pkg.name || 'unknown'}\n`;
        output += `Version: ${pkg.version || 'unknown'}\n`;

        if (pkg.workspaces) {
            output += `Workspaces: ${Array.isArray(pkg.workspaces) ? pkg.workspaces.join(', ') : 'yes'}\n`;
        }

        return output;
    } catch {
        return '';
    }
}

function getTechStack(projectDir: string): string {
    let output = '\n## Tech Stack\n\n';

    const apiPkg = join(projectDir, 'apps', 'api', 'package.json');
    const webPkg = join(projectDir, 'apps', 'web', 'package.json');

    if (existsSync(apiPkg)) {
        try {
            const pkg = JSON.parse(readFileSync(apiPkg, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            output += 'Backend (apps/api):\n';
            if (deps.fastify) output += `  - Fastify ${deps.fastify}\n`;
            if (deps['@prisma/client']) output += `  - Prisma ${deps['@prisma/client']}\n`;
            if (deps.zod) output += `  - Zod ${deps.zod}\n`;
            if (deps.vitest) output += `  - Vitest ${deps.vitest}\n`;
        } catch {
            // Skip
        }
    }

    if (existsSync(webPkg)) {
        try {
            const pkg = JSON.parse(readFileSync(webPkg, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            output += '\nFrontend (apps/web):\n';
            if (deps.next) output += `  - Next.js ${deps.next}\n`;
            if (deps.react) output += `  - React ${deps.react}\n`;
            if (deps['@tanstack/react-query']) output += `  - React Query ${deps['@tanstack/react-query']}\n`;
            if (deps.tailwindcss) output += `  - TailwindCSS ${deps.tailwindcss}\n`;
        } catch {
            // Skip
        }
    }

    return output;
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        let projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🗺️  CODEBASE MAP');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Package info
        console.log(getPackageInfo(projectDir));

        // Tech stack
        console.log(getTechStack(projectDir));

        // Git info
        console.log(getGitInfo(projectDir));

        // Database schema
        console.log(getPrismaSchema(projectDir));

        // Directory structure
        console.log('\n## Project Structure\n');
        const structure = getDirectoryStructure(projectDir, 3);
        structure.forEach(line => console.log(line));

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);

    } catch (err) {
        console.error('[codebase-map] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
