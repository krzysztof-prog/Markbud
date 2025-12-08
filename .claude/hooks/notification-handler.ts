#!/usr/bin/env node
/**
 * Notification Handler Hook (Notification)
 *
 * Fires when Claude sends a notification:
 * - Permission requests
 * - Input idle >60s
 * - Agent waiting for user
 *
 * Actions:
 * - Desktop notification (Windows/macOS/Linux)
 * - Optional: Webhook to Slack/Discord
 * - Log to file
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface HookInput {
    session_id: string;
    notification: {
        type: string;
        message: string;
        timestamp: string;
    };
}

function normalizeWindowsPath(path: string): string {
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

function sendDesktopNotification(title: string, message: string) {
    try {
        const platform = process.platform;

        if (platform === 'win32') {
            // Windows - PowerShell notification
            const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">${title}</text>
            <text id="2">${message}</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Claude Code").Show($toast)
`.trim();

            execSync(`powershell -Command "${script.replace(/"/g, '\\"')}"`, {
                timeout: 5000,
                stdio: 'ignore'
            });
        } else if (platform === 'darwin') {
            // macOS - osascript
            execSync(`osascript -e 'display notification "${message}" with title "${title}"'`, {
                timeout: 5000,
                stdio: 'ignore'
            });
        } else {
            // Linux - notify-send (requires libnotify)
            execSync(`notify-send "${title}" "${message}"`, {
                timeout: 5000,
                stdio: 'ignore'
            });
        }
    } catch (error) {
        // Silent fail - don't break on notification errors
        console.error('[notification] Desktop notification failed:', error instanceof Error ? error.message : 'Unknown error');
    }
}

function sendWebhook(webhookUrl: string, message: string) {
    try {
        const payload = JSON.stringify({
            text: message,
            username: 'Claude Code',
            icon_emoji: ':robot_face:'
        });

        execSync(`curl -X POST -H "Content-Type: application/json" -d '${payload}' ${webhookUrl}`, {
            timeout: 10000,
            stdio: 'ignore'
        });
    } catch (error) {
        console.error('[notification] Webhook failed:', error instanceof Error ? error.message : 'Unknown error');
    }
}

function logNotification(projectDir: string, notification: HookInput['notification']) {
    const logsDir = join(projectDir, '.claude', 'logs');
    mkdirSync(logsDir, { recursive: true });

    const logFile = join(logsDir, 'notifications.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${notification.type}: ${notification.message}\n`;

    try {
        writeFileSync(logFile, logEntry, { flag: 'a' });
    } catch (error) {
        // Silent fail
    }
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        const notification = data.notification;

        // Log notification
        logNotification(projectDir, notification);

        // Determine notification urgency
        const isUrgent = notification.type === 'permission_request' ||
            notification.message.toLowerCase().includes('waiting') ||
            notification.message.toLowerCase().includes('approval');

        // Send desktop notification for urgent items
        if (isUrgent) {
            const title = notification.type === 'permission_request'
                ? '🔐 Claude Code - Permission Needed'
                : '⏳ Claude Code - Waiting';

            sendDesktopNotification(title, notification.message.substring(0, 100));
        }

        // Optional: Send webhook (configure in environment)
        const webhookUrl = process.env.CLAUDE_WEBHOOK_URL;
        if (webhookUrl && isUrgent) {
            const webhookMessage = `*Claude Code Notification*\n\`\`\`${notification.message}\`\`\``;
            sendWebhook(webhookUrl, webhookMessage);
        }

        // Output to console
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔔 NOTIFICATION: ${notification.type}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(notification.message);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);

    } catch (err) {
        console.error('[notification-handler] Error:', err instanceof Error ? err.message : String(err));
        process.exit(0);
    }
}

main().catch(() => process.exit(0));
