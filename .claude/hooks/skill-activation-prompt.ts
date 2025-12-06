#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

interface PromptTriggers {
    keywords?: string[];
    intentPatterns?: string[];
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: 'critical' | 'high' | 'medium' | 'low';
    promptTriggers?: PromptTriggers;
}

interface SkillRules {
    version: string;
    skills: Record<string, SkillRule>;
}

interface MatchedSkill {
    name: string;
    matchType: 'keyword' | 'intent';
    config: SkillRule;
}

// Fix Windows path issues with Git Bash paths like /c/Users/...
function normalizeWindowsPath(path: string): string {
    // Convert /c/Users/... to C:/Users/...
    if (path.match(/^\/[a-z]\//i)) {
        return path.replace(/^\/([a-z])\//i, '$1:/');
    }
    return path;
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const prompt = data.prompt.toLowerCase();

        // Get project directory with Windows path fix
        let projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
        projectDir = normalizeWindowsPath(projectDir);

        const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');

        let rules: SkillRules;
        try {
            rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
        } catch (err) {
            process.exit(0);
        }

        const matchedSkills: MatchedSkill[] = [];

        for (const [skillName, config] of Object.entries(rules.skills)) {
            const triggers = config.promptTriggers;
            if (!triggers) continue;

            if (triggers.keywords) {
                const keywordMatch = triggers.keywords.some(kw =>
                    prompt.includes(kw.toLowerCase())
                );
                if (keywordMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'keyword', config });
                    continue;
                }
            }

            if (triggers.intentPatterns) {
                const intentMatch = triggers.intentPatterns.some(pattern => {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(prompt);
                });
                if (intentMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'intent', config });
                }
            }
        }

        if (matchedSkills.length > 0) {
            // Sort by priority: critical > high > medium > low
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const sortedSkills = matchedSkills.sort((a, b) =>
                priorityOrder[a.config.priority] - priorityOrder[b.config.priority]
            );

            // Auto-activate critical and high priority skills
            const skillsToActivate = sortedSkills.filter(s =>
                s.config.priority === 'critical' || s.config.priority === 'high'
            );

            if (skillsToActivate.length > 0) {
                let output = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                output += '🎯 AUTO-ACTIVATING SKILLS\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

                skillsToActivate.forEach(skill => {
                    const icon = skill.config.priority === 'critical' ? '⚠️' : '📚';
                    output += `${icon} ${skill.name} (${skill.config.priority})\n`;
                });

                output += '\n📋 INSTRUCTION: Before responding to the user\'s request,\n';
                output += 'you MUST activate the following skill(s):\n\n';

                skillsToActivate.forEach(skill => {
                    output += `   → Use Skill tool: "${skill.name}"\n`;
                });

                output += '\n⚡ This is AUTOMATIC - activate the skill immediately.\n';
                output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
                console.log(output);
            }

            // Suggest medium/low priority skills (don't auto-activate)
            const suggestedSkills = sortedSkills.filter(s =>
                s.config.priority === 'medium' || s.config.priority === 'low'
            );

            if (suggestedSkills.length > 0) {
                let output = '\n💡 OPTIONAL SKILLS (manual activation):\n';
                suggestedSkills.forEach(s => {
                    output += `  → ${s.name} (${s.config.priority})\n`;
                });
                console.log(output);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error in skill-activation-prompt hook:', err);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(0);
});
