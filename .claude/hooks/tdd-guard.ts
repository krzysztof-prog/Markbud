#!/usr/bin/env node
/**
 * TDD Guard Hook (PreToolUse)
 *
 * Enforces Test-Driven Development:
 * - Blocks implementation code unless there's a failing test
 * - Ensures tests are written before implementation
 * - Can be toggled on/off per session
 *
 * Usage:
 * - Enable: TDD_GUARD=on in session
 * - Disable: TDD_GUARD=off in session (default: off)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface HookInput {
    tool_name: string;
    tool_input: {
        file_path?: string;
        content?: string;
        old_string?: string;
        new_string?: string;
        [key: string]: unknown;
    };
    session_id: string;
}

interface SessionState {
    tddEnabled: boolean;
    lastTestRun?: number;
    lastTestStatus?: 'pass' | 'fail';
}

function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

function getSessionState(projectDir: string, sessionId: string): SessionState {
    const stateDir = join(projectDir, '.claude', '.session-state');
    const statePath = join(stateDir, `tdd-${sessionId}.json`);

    if (existsSync(statePath)) {
        try {
            return JSON.parse(readFileSync(statePath, 'utf-8'));
        } catch {
            // Fallback to default
        }
    }

    return { tddEnabled: false }; // Default: OFF
}

function saveSessionState(projectDir: string, sessionId: string, state: SessionState) {
    const stateDir = join(projectDir, '.claude', '.session-state');
    const statePath = join(stateDir, `tdd-${sessionId}.json`);

    writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function runTests(projectDir: string, filePath: string): { success: boolean; output: string } {
    try {
        // Determine test file path
        const testFile = filePath
            .replace(/\.(ts|tsx|js|jsx)$/, '.test.$1')
            .replace(/\.(ts|tsx)$/, '.test.ts'); // Normalize to .test.ts

        if (!existsSync(join(projectDir, testFile))) {
            return { success: false, output: 'No test file found' };
        }

        // Run Vitest on specific test file
        const output = execSync(`pnpm vitest run ${testFile} --reporter=verbose`, {
            cwd: projectDir,
            encoding: 'utf8',
            timeout: 30000,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return { success: true, output };
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        return { success: false, output: err.stdout || err.stderr || err.message || 'Test execution failed' };
    }
}

function isTestFile(filePath: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);
}

function isImplementationFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath) && !isTestFile(filePath);
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only check Write/Edit tools
        if (!['Write', 'Edit', 'MultiEdit'].includes(data.tool_name)) {
            process.exit(0);
            return;
        }

        const filePath = data.tool_input?.file_path;
        if (!filePath) {
            process.exit(0);
            return;
        }

        let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        const sessionId = data.session_id || 'default';
        const state = getSessionState(projectDir, sessionId);

        // Check if TDD Guard is enabled
        if (!state.tddEnabled) {
            // TDD Guard is off - allow everything
            process.exit(0);
            return;
        }

        // If writing a test file - always allow
        if (isTestFile(filePath)) {
            console.log('\n✅ TDD Guard: Test file - allowed\n');

            // Run tests to update state
            const testResult = runTests(projectDir, filePath);
            state.lastTestRun = Date.now();
            state.lastTestStatus = testResult.success ? 'pass' : 'fail';
            saveSessionState(projectDir, sessionId, state);

            process.exit(0);
            return;
        }

        // If writing implementation file - check for failing tests
        if (isImplementationFile(filePath)) {
            // Check if there's a corresponding test file
            const testFile = filePath.replace(/\.(ts|tsx|js|jsx)$/, '.test.ts');

            if (!existsSync(join(projectDir, testFile))) {
                console.error(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 TDD GUARD: Test file required                            ║
╠══════════════════════════════════════════════════════════════╣
║  Cannot modify implementation without a test file.           ║
║                                                              ║
║  Expected test file: ${testFile.substring(0, 40).padEnd(40)} ║
║                                                              ║
║  Create the test file first with a failing test.            ║
║                                                              ║
║  To disable TDD Guard for this session:                     ║
║  Set TDD_GUARD=off in session state                          ║
╚══════════════════════════════════════════════════════════════╝
`);
                process.exit(2); // Block
                return;
            }

            // Run tests to check if there's a failing test
            console.log('\n🔷 TDD Guard: Running tests...\n');
            const testResult = runTests(projectDir, filePath);

            if (testResult.success) {
                console.error(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 TDD GUARD: No failing test                               ║
╠══════════════════════════════════════════════════════════════╣
║  All tests are passing. Write a failing test first!          ║
║                                                              ║
║  TDD Workflow:                                               ║
║  1. Write a failing test                                     ║
║  2. Implement minimum code to pass the test                  ║
║  3. Refactor                                                 ║
╚══════════════════════════════════════════════════════════════╝
`);
                process.exit(2); // Block
                return;
            }

            // There's a failing test - allow implementation
            console.log('✅ TDD Guard: Failing test found - proceeding with implementation\n');
            state.lastTestRun = Date.now();
            state.lastTestStatus = 'fail';
            saveSessionState(projectDir, sessionId, state);

            process.exit(0);
            return;
        }

        // Other files (config, markdown, etc.) - allow
        process.exit(0);

    } catch (err) {
        console.error('[tdd-guard] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0); // Allow on error
    }
}

main().catch(() => process.exit(0));
