#!/usr/bin/env node
/**
 * Prisma Safety Guard Hook (PreToolUse)
 *
 * Blocks dangerous Prisma commands that can cause data loss:
 * - prisma migrate reset
 * - prisma db push (overwrites without migration)
 * - prisma migrate dev --force
 *
 * Auto-backups SQLite before migrations
 */

import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';

interface HookInput {
    tool_name: string;
    tool_input: {
        command?: string;
        [key: string]: unknown;
    };
    session_id: string;
}

interface HookOutput {
    decision: 'allow' | 'block' | 'ask';
    reason?: string;
}

function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

function backupDatabase(projectDir: string): string | null {
    const dbPath = join(projectDir, 'apps', 'api', 'prisma', 'dev.db');

    if (!existsSync(dbPath)) {
        return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(dirname(dbPath), `dev.db.backup-${timestamp}`);

    try {
        copyFileSync(dbPath, backupPath);
        return backupPath;
    } catch {
        return null;
    }
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only check Bash tool
        if (data.tool_name !== 'Bash') {
            outputDecision({ decision: 'allow' });
            return;
        }

        const command = data.tool_input?.command || '';
        const commandLower = command.toLowerCase();

        let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        // === BLOCKED COMMANDS ===

        // 1. prisma migrate reset - ALWAYS BLOCK
        if (commandLower.includes('prisma') && commandLower.includes('migrate') && commandLower.includes('reset')) {
            outputDecision({
                decision: 'block',
                reason: `
╔══════════════════════════════════════════════════════════════╗
║  🚫 BLOCKED: prisma migrate reset                            ║
╠══════════════════════════════════════════════════════════════╣
║  This command DELETES ALL DATA in the database!              ║
║                                                              ║
║  If you need to reset:                                       ║
║  1. Backup: cp prisma/dev.db prisma/dev.db.backup            ║
║  2. Run manually outside Claude Code                         ║
║                                                              ║
║  For development, use: pnpm db:migrate                       ║
╚══════════════════════════════════════════════════════════════╝
`
            });
            return;
        }

        // 2. prisma db push - ALWAYS BLOCK (overwrites schema without migration)
        if (commandLower.includes('prisma') && commandLower.includes('db') && commandLower.includes('push')) {
            outputDecision({
                decision: 'block',
                reason: `
╔══════════════════════════════════════════════════════════════╗
║  🚫 BLOCKED: prisma db push                                  ║
╠══════════════════════════════════════════════════════════════╣
║  This command can CAUSE DATA LOSS!                           ║
║  It overwrites the database schema without creating          ║
║  a migration file.                                           ║
║                                                              ║
║  Use instead: pnpm db:migrate                                ║
║  This creates proper migration files.                        ║
╚══════════════════════════════════════════════════════════════╝
`
            });
            return;
        }

        // 3. prisma migrate dev --force - BLOCK
        if (commandLower.includes('prisma') && commandLower.includes('migrate') &&
            commandLower.includes('dev') && commandLower.includes('--force')) {
            outputDecision({
                decision: 'block',
                reason: `
╔══════════════════════════════════════════════════════════════╗
║  🚫 BLOCKED: prisma migrate dev --force                      ║
╠══════════════════════════════════════════════════════════════╣
║  --force flag can reset the database!                        ║
║                                                              ║
║  Use instead: pnpm db:migrate (without --force)              ║
╚══════════════════════════════════════════════════════════════╝
`
            });
            return;
        }

        // === WARNED COMMANDS (allow but backup first) ===

        // prisma migrate dev - Allow but backup first
        if (commandLower.includes('prisma') && commandLower.includes('migrate') && commandLower.includes('dev')) {
            const backupPath = backupDatabase(projectDir);

            let message = '\n⚠️  PRISMA MIGRATION\n';
            if (backupPath) {
                message += `✅ Auto-backup created: ${backupPath}\n`;
            } else {
                message += '⚠️  Could not create backup (database may not exist yet)\n';
            }
            message += 'Proceeding with migration...\n';

            console.log(message);
            outputDecision({ decision: 'allow' });
            return;
        }

        // prisma migrate deploy - Production command, warn
        if (commandLower.includes('prisma') && commandLower.includes('migrate') && commandLower.includes('deploy')) {
            console.log('\n⚠️  Running prisma migrate deploy (production migrations)\n');
            outputDecision({ decision: 'allow' });
            return;
        }

        // Default: allow
        outputDecision({ decision: 'allow' });

    } catch (err) {
        // On error, allow (don't break workflow)
        console.error('[prisma-safety-guard] Error:', err instanceof Error ? err.message : String(err));
        outputDecision({ decision: 'allow' });
    }
}

function outputDecision(output: HookOutput) {
    if (output.reason) {
        console.error(output.reason);
    }

    // Exit code 2 = block, 0 = allow
    process.exit(output.decision === 'block' ? 2 : 0);
}

main().catch(() => process.exit(0));
