#!/usr/bin/env node
/**
 * Final Validation Hook (Stop)
 *
 * Runs before Claude finishes the session:
 * - Checks if both apps/api and apps/web build successfully
 * - Runs TypeScript compilation check
 * - Warns about uncommitted changes
 * - Verifies no critical TODO items remain
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

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

function runCommand(cmd: string, cwd: string): { success: boolean; output: string } {
    try {
        const output = execSync(cmd, {
            cwd,
            encoding: 'utf8',
            timeout: 120000, // 2 minutes
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return { success: true, output };
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        return { success: false, output: err.stdout || err.stderr || err.message || 'Unknown error' };
    }
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        let projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 FINAL VALIDATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let hasErrors = false;
        const warnings: string[] = [];

        // 1. Check git status
        console.log('📋 Checking git status...');
        const gitStatus = runCommand('git status --short', projectDir);
        if (gitStatus.output.trim()) {
            const lines = gitStatus.output.trim().split('\n');
            const modifiedFiles = lines.filter(l => l.startsWith(' M') || l.startsWith('M'));
            const untrackedFiles = lines.filter(l => l.startsWith('??'));

            if (modifiedFiles.length > 0) {
                warnings.push(`⚠️  ${modifiedFiles.length} modified file(s) not committed`);
            }
            if (untrackedFiles.length > 0) {
                console.log(`   ℹ️  ${untrackedFiles.length} untracked file(s)`);
            }
        } else {
            console.log('   ✅ Working tree clean');
        }

        // 2. TypeScript compilation check
        console.log('\n🔷 Checking TypeScript compilation...');

        const apps = [
            { name: 'API', path: 'apps/api' },
            { name: 'Web', path: 'apps/web' }
        ];

        for (const app of apps) {
            const appPath = join(projectDir, app.path);
            const tsconfigPath = join(appPath, 'tsconfig.json');

            if (existsSync(tsconfigPath)) {
                const tscResult = runCommand('pnpm exec tsc --noEmit', appPath);
                if (!tscResult.success) {
                    const errorCount = (tscResult.output.match(/error TS/g) || []).length;
                    console.log(`   ❌ ${app.name}: ${errorCount} TypeScript error(s)`);
                    console.log(`      First error: ${tscResult.output.split('\n').find(l => l.includes('error TS'))?.substring(0, 80)}...`);
                    hasErrors = true;
                } else {
                    console.log(`   ✅ ${app.name}: No TypeScript errors`);
                }
            }
        }

        // 3. Build check (optional - can be slow)
        // Uncomment if you want to enforce builds before stopping
        /*
        console.log('\n🏗️  Building project...');
        const buildResult = runCommand('pnpm build', projectDir);
        if (!buildResult.success) {
            console.log('   ❌ Build failed');
            hasErrors = true;
        } else {
            console.log('   ✅ Build successful');
        }
        */

        // 4. Check for critical TODOs in changed files
        console.log('\n📝 Checking for critical TODOs...');
        const diffFiles = runCommand('git diff --name-only HEAD', projectDir);
        if (diffFiles.output.trim()) {
            const changedFiles = diffFiles.output.trim().split('\n').filter(f => /\.(ts|tsx|js|jsx)$/.test(f));

            let criticalTodos = 0;
            for (const file of changedFiles.slice(0, 10)) { // Check max 10 files
                const filePath = join(projectDir, file);
                if (existsSync(filePath)) {
                    const content = readFileSync(filePath, 'utf-8');
                    const todos = content.match(/\/\/\s*TODO:?\s*(CRITICAL|FIXME|HACK|XXX)/gi) || [];
                    criticalTodos += todos.length;
                }
            }

            if (criticalTodos > 0) {
                warnings.push(`⚠️  ${criticalTodos} critical TODO(s) in changed files`);
            } else {
                console.log('   ✅ No critical TODOs found');
            }
        }

        // 5. Check for console.log in production code (warning only)
        console.log('\n🔍 Checking for console.log statements...');
        const grepResult = runCommand('git diff --cached -U0 | grep -i "console\\.log" || true', projectDir);
        if (grepResult.output.trim()) {
            const count = grepResult.output.trim().split('\n').length;
            warnings.push(`💡 ${count} console.log statement(s) in staged changes`);
        }

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (hasErrors) {
            console.log('❌ VALIDATION FAILED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\nPlease fix the errors above before proceeding.\n');
            process.exit(2); // Block stopping
        }

        if (warnings.length > 0) {
            console.log('⚠️  WARNINGS');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            warnings.forEach(w => console.log(w));
            console.log('\nConsider addressing these warnings.\n');
        } else {
            console.log('✅ ALL CHECKS PASSED');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }

        process.exit(0); // Allow stopping

    } catch (err) {
        console.error('[final-validation] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0); // Allow on error
    }
}

main().catch(() => process.exit(0));
