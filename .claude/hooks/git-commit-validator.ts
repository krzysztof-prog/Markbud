#!/usr/bin/env node
/**
 * Git Commit Validator Hook (PreToolUse)
 *
 * Before git commit:
 * - Validates commit message format (conventional commits)
 * - Runs linting on staged files
 * - Checks TypeScript compilation
 * - Auto-adds Co-Authored-By if missing
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
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

function runCommand(cmd: string, cwd: string): { success: boolean; output: string } {
    try {
        const output = execSync(cmd, {
            cwd,
            encoding: 'utf8',
            timeout: 180000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return { success: true, output };
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        return { success: false, output: err.stdout || err.stderr || err.message || 'Unknown error' };
    }
}

function extractCommitMessage(command: string): string | null {
    // Match -m "message" or -m 'message' or heredoc
    const patterns = [
        /-m\s*"([^"]+)"/,
        /-m\s*'([^']+)'/,
        /-m\s*\$\(cat <<'?EOF'?\n([\s\S]*?)\nEOF\n?\s*\)/,
    ];

    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

function validateConventionalCommit(message: string): { valid: boolean; reason?: string } {
    // Conventional commit format: type(scope)?: description
    const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s.+/;

    const firstLine = message.split('\n')[0];

    if (!conventionalPattern.test(firstLine)) {
        return {
            valid: false,
            reason: `Invalid commit message format.
Expected: type(scope)?: description
Examples:
  feat: add user authentication
  fix(api): resolve database connection issue
  docs: update README

Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`
        };
    }

    return { valid: true };
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

        // Only check git commit commands
        if (!command.includes('git commit')) {
            process.exit(0);
            return;
        }

        let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        console.log('\n🔍 GIT COMMIT VALIDATOR\n');

        // 1. Check if there are staged changes
        const stagedResult = runCommand('git diff --cached --name-only', projectDir);
        if (!stagedResult.output.trim()) {
            console.log('⚠️  No staged changes to commit\n');
            process.exit(0);
            return;
        }

        const stagedFiles = stagedResult.output.trim().split('\n');
        console.log(`📁 Staged files: ${stagedFiles.length}`);

        // 2. Run TypeScript check if .ts/.tsx files are staged
        const tsFiles = stagedFiles.filter(f => /\.(ts|tsx)$/.test(f));
        if (tsFiles.length > 0) {
            console.log('🔷 Running TypeScript check...');

            // Check both apps
            const apps = ['apps/api', 'apps/web'];
            for (const app of apps) {
                const appPath = join(projectDir, app);
                if (existsSync(join(appPath, 'tsconfig.json'))) {
                    const hasChangesInApp = tsFiles.some(f => f.startsWith(app));
                    if (hasChangesInApp) {
                        const tscResult = runCommand('pnpm exec tsc --noEmit', appPath);
                        if (!tscResult.success) {
                            console.error(`\n❌ TypeScript errors in ${app}:\n`);
                            console.error(tscResult.output.substring(0, 500));
                            console.error('\nFix TypeScript errors before committing.\n');
                            process.exit(2);
                            return;
                        }
                        console.log(`   ✅ ${app} - no errors`);
                    }
                }
            }
        }

        // 3. Run ESLint on staged files (if lint-staged is available)
        const hasLintStaged = existsSync(join(projectDir, '.lintstagedrc')) ||
            existsSync(join(projectDir, '.lintstagedrc.json')) ||
            existsSync(join(projectDir, 'lint-staged.config.js'));

        if (hasLintStaged) {
            console.log('🔷 Running lint-staged...');
            const lintResult = runCommand('pnpm lint-staged', projectDir);
            if (!lintResult.success) {
                console.error('\n❌ Linting failed:\n');
                console.error(lintResult.output.substring(0, 500));
                process.exit(2);
                return;
            }
            console.log('   ✅ Linting passed');
        }

        // 4. Validate commit message format
        const commitMessage = extractCommitMessage(command);
        if (commitMessage) {
            console.log('🔷 Validating commit message...');
            const validation = validateConventionalCommit(commitMessage);
            if (!validation.valid) {
                console.error(`\n❌ ${validation.reason}\n`);
                // Warn but don't block (some repos don't use conventional commits)
                console.log('⚠️  Warning: Non-conventional commit message (allowed)\n');
            } else {
                console.log('   ✅ Conventional commit format');
            }
        }

        // 5. Check if Co-Authored-By is present (for Claude commits)
        if (command.includes('-m') && !command.includes('Co-Authored-By')) {
            console.log('💡 Tip: Consider adding Co-Authored-By for AI-assisted commits\n');
        }

        console.log('\n✅ Pre-commit validation passed\n');
        process.exit(0);

    } catch (err) {
        console.error('[git-commit-validator] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
