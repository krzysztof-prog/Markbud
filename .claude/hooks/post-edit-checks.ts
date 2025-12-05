#!/usr/bin/env npx tsx

/**
 * Post-edit hook that:
 * 1. Runs TypeScript check on edited files
 * 2. Counts edits and reminds about commits
 * 3. Scans for security issues
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ToolInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    old_string?: string;
    new_string?: string;
    content?: string;
  };
  session_id?: string;
}

// Read stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  try {
    const toolInfo: ToolInput = JSON.parse(input);
    await processHook(toolInfo);
  } catch (e) {
    // Silent fail - don't break Claude's workflow
    process.exit(0);
  }
});

async function processHook(toolInfo: ToolInput) {
  const { tool_name, tool_input, session_id } = toolInfo;
  const filePath = tool_input?.file_path;

  // Only process Edit/Write tools
  if (!['Edit', 'MultiEdit', 'Write'].includes(tool_name)) {
    process.exit(0);
  }

  // Skip non-code files
  if (!filePath || !isCodeFile(filePath)) {
    process.exit(0);
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const cacheDir = path.join(projectDir, '.claude', 'hooks-cache', session_id || 'default');

  // Ensure cache dir exists
  fs.mkdirSync(cacheDir, { recursive: true });

  const results: string[] = [];

  // 1. Count edits and remind about commits
  const commitReminder = checkCommitReminder(cacheDir, filePath);
  if (commitReminder) {
    results.push(commitReminder);
  }

  // 2. Security scan
  const securityIssues = scanForSecurityIssues(tool_input.new_string || tool_input.content || '');
  if (securityIssues.length > 0) {
    results.push(`⚠️ SECURITY: ${securityIssues.join(', ')}`);
  }

  // 3. TypeScript check (async, don't block)
  const tsErrors = await runTypeCheck(filePath, projectDir);
  if (tsErrors) {
    results.push(tsErrors);
  }

  // Output results if any
  if (results.length > 0) {
    console.log('\n' + results.join('\n'));
  }

  process.exit(0);
}

function isCodeFile(filePath: string): boolean {
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const ext = path.extname(filePath).toLowerCase();
  return codeExtensions.includes(ext);
}

function checkCommitReminder(cacheDir: string, filePath: string): string | null {
  const counterFile = path.join(cacheDir, 'edit-counter.json');

  let data = { count: 0, files: [] as string[], lastReminder: 0 };

  if (fs.existsSync(counterFile)) {
    try {
      data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
    } catch {
      // Reset if corrupted
    }
  }

  data.count++;
  if (!data.files.includes(filePath)) {
    data.files.push(filePath);
  }

  fs.writeFileSync(counterFile, JSON.stringify(data, null, 2));

  // Remind every 5 edits
  if (data.count >= 5 && data.count - data.lastReminder >= 5) {
    data.lastReminder = data.count;
    fs.writeFileSync(counterFile, JSON.stringify(data, null, 2));
    return `💡 COMMIT REMINDER: ${data.count} edits in ${data.files.length} files. Consider: git commit`;
  }

  return null;
}

function scanForSecurityIssues(code: string): string[] {
  const issues: string[] = [];

  // SQL Injection patterns
  if (/\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i.test(code) ||
      /['"].*\+.*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(code)) {
    // Skip if using Prisma (safe)
    if (!code.includes('prisma.')) {
      issues.push('Possible SQL injection - use parameterized queries');
    }
  }

  // XSS patterns
  if (/dangerouslySetInnerHTML/i.test(code)) {
    issues.push('dangerouslySetInnerHTML - ensure content is sanitized');
  }
  if (/innerHTML\s*=/.test(code)) {
    issues.push('innerHTML assignment - XSS risk');
  }

  // Hardcoded secrets
  if (/(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(code)) {
    issues.push('Possible hardcoded secret');
  }

  // eval() usage
  if (/\beval\s*\(/.test(code)) {
    issues.push('eval() usage - security risk');
  }

  // Unvalidated redirects
  if (/(?:window\.location|location\.href)\s*=\s*(?:req|request|params|query)/.test(code)) {
    issues.push('Unvalidated redirect');
  }

  return issues;
}

async function runTypeCheck(filePath: string, projectDir: string): Promise<string | null> {
  // Determine which app the file belongs to
  let tsconfigPath: string | null = null;

  if (filePath.includes('apps/api')) {
    tsconfigPath = path.join(projectDir, 'apps/api/tsconfig.json');
  } else if (filePath.includes('apps/web')) {
    tsconfigPath = path.join(projectDir, 'apps/web/tsconfig.json');
  }

  if (!tsconfigPath || !fs.existsSync(tsconfigPath)) {
    return null;
  }

  try {
    const cwd = path.dirname(tsconfigPath);
    execSync('npx tsc --noEmit 2>&1', {
      cwd,
      encoding: 'utf8',
      timeout: 30000, // 30s timeout
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return null; // No errors
  } catch (error: any) {
    const output = error.stdout || error.message || '';
    const lines = output.split('\n').filter((l: string) => l.includes('error TS'));

    if (lines.length > 0) {
      const errorCount = lines.length;
      const firstError = lines[0].substring(0, 100);
      return `❌ TypeScript: ${errorCount} error(s). First: ${firstError}...`;
    }
    return null;
  }
}
