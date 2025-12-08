#!/usr/bin/env node
/**
 * pnpm Enforcer Hook (PreToolUse)
 *
 * Converts npm commands to pnpm in a pnpm monorepo project.
 * Prevents lockfile corruption from mixing package managers.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HookInput {
    tool_name: string;
    tool_input: {
        command?: string;
        [key: string]: unknown;
    };
    session_id: string;
}

function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only check Bash tool
        if (data.tool_name !== 'Bash') {
            process.exit(0);
            return;
        }

        const command = data.tool_input?.command || '';

        let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        // Check if this is a pnpm project
        const hasPnpmLock = existsSync(join(projectDir, 'pnpm-lock.yaml'));
        const hasPnpmWorkspace = existsSync(join(projectDir, 'pnpm-workspace.yaml'));

        if (!hasPnpmLock && !hasPnpmWorkspace) {
            // Not a pnpm project, allow anything
            process.exit(0);
            return;
        }

        // Detect npm commands that should be pnpm
        const npmPatterns = [
            /^npm\s+install\b/,
            /^npm\s+i\b/,
            /^npm\s+add\b/,
            /^npm\s+run\b/,
            /^npm\s+start\b/,
            /^npm\s+test\b/,
            /^npm\s+build\b/,
            /^npm\s+ci\b/,
            /^npm\s+exec\b/,
            /^npm\s+uninstall\b/,
            /^npm\s+remove\b/,
            /^npm\s+rm\b/,
        ];

        const isNpmCommand = npmPatterns.some(pattern => pattern.test(command.trim()));

        if (isNpmCommand) {
            // Convert npm to pnpm
            let pnpmCommand = command
                .replace(/^npm\s+install\b/, 'pnpm install')
                .replace(/^npm\s+i\b/, 'pnpm install')
                .replace(/^npm\s+add\b/, 'pnpm add')
                .replace(/^npm\s+run\b/, 'pnpm')
                .replace(/^npm\s+start\b/, 'pnpm start')
                .replace(/^npm\s+test\b/, 'pnpm test')
                .replace(/^npm\s+build\b/, 'pnpm build')
                .replace(/^npm\s+ci\b/, 'pnpm install --frozen-lockfile')
                .replace(/^npm\s+exec\b/, 'pnpm exec')
                .replace(/^npm\s+uninstall\b/, 'pnpm remove')
                .replace(/^npm\s+remove\b/, 'pnpm remove')
                .replace(/^npm\s+rm\b/, 'pnpm remove');

            console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📦 pnpm ENFORCER                                            ║
╠══════════════════════════════════════════════════════════════╣
║  This is a pnpm monorepo project.                            ║
║  Converted: npm → pnpm                                       ║
║                                                              ║
║  Original: ${command.substring(0, 40).padEnd(40)}   ║
║  Using:    ${pnpmCommand.substring(0, 40).padEnd(40)}   ║
╚══════════════════════════════════════════════════════════════╝
`);

            // Output modified command (v2.0.10+ feature)
            const hookOutput = {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'allow',
                    updatedInput: {
                        command: pnpmCommand
                    }
                }
            };

            console.log(JSON.stringify(hookOutput));
            process.exit(0);
            return;
        }

        // Detect yarn commands
        if (/^yarn\b/.test(command.trim())) {
            console.error(`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  YARN DETECTED IN PNPM PROJECT                           ║
╠══════════════════════════════════════════════════════════════╣
║  This project uses pnpm. Please use pnpm commands:           ║
║                                                              ║
║  yarn install  → pnpm install                                ║
║  yarn add      → pnpm add                                    ║
║  yarn remove   → pnpm remove                                 ║
╚══════════════════════════════════════════════════════════════╝
`);
            // Block yarn (exit 2)
            process.exit(2);
            return;
        }

        // Allow other commands
        process.exit(0);

    } catch (err) {
        console.error('[pnpm-enforcer] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0);
    }
}

main().catch(() => process.exit(0));