#!/usr/bin/env node
/**
 * Session Context Loader Hook
 *
 * Automatically loads essential project documentation at the start of each session:
 * - CLAUDE.md - Project context and conventions
 * - README.md - Project overview
 * - docs/guides/anti-patterns.md - Common mistakes to avoid
 *
 * Triggered on: First user prompt in session (checks session state)
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

// Fix Windows path issues with Git Bash paths like /c/Users/...
function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

function getSessionStateFile(projectDir: string, sessionId: string): string {
    return join(projectDir, '.claude', '.session-state', `${sessionId}.json`);
}

function ensureDir(dir: string): void {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

interface SessionState {
    contextLoaded: boolean;
    loadedAt: string;
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        let projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        // Check if we already loaded context for this session
        const stateDir = join(projectDir, '.claude', '.session-state');
        ensureDir(stateDir);

        const stateFile = getSessionStateFile(projectDir, data.session_id);

        if (existsSync(stateFile)) {
            // Context already loaded for this session
            process.exit(0);
        }

        // First prompt in session - load context
        const filesToLoad = [
            { path: 'CLAUDE.md', label: 'Project Context' },
            { path: 'README.md', label: 'Project Overview' },
            { path: 'docs/guides/anti-patterns.md', label: 'Anti-patterns' },
        ];

        let output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        output += '📚 SESSION CONTEXT LOADED\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        let contextContent = '';

        for (const file of filesToLoad) {
            const fullPath = join(projectDir, file.path);
            if (existsSync(fullPath)) {
                const content = readFileSync(fullPath, 'utf-8');
                contextContent += `\n\n--- ${file.label.toUpperCase()} (${file.path}) ---\n\n`;
                contextContent += content;
                output += `✅ ${file.label}: ${file.path}\n`;
            } else {
                output += `⚠️ ${file.label}: NOT FOUND (${file.path})\n`;
            }
        }

        output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        output += '⚡ INSTRUCTIONS FOR CLAUDE:\n';
        output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        output += '1. READ the loaded context above carefully\n';
        output += '2. FOLLOW conventions from CLAUDE.md\n';
        output += '3. AVOID mistakes listed in anti-patterns.md\n';
        output += '4. When you encounter a NEW bug/mistake:\n';
        output += '   → Use documentation-architect agent to update anti-patterns.md\n';
        output += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

        // Add the actual content
        output += contextContent;

        console.log(output);

        // Mark session as initialized
        const state: SessionState = {
            contextLoaded: true,
            loadedAt: new Date().toISOString()
        };
        writeFileSync(stateFile, JSON.stringify(state, null, 2));

        process.exit(0);
    } catch (err) {
        // Log error to stderr for debugging
        console.error('[session-context-loader] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
