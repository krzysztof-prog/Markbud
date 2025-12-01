import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const input = readFileSync(0, 'utf-8');
console.log("INPUT:", input);
const data = JSON.parse(input);
console.log("PROMPT:", data.prompt);

let projectDir = data.cwd || process.cwd();
projectDir = resolve(projectDir);
console.log("PROJECT DIR:", projectDir);

const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
console.log("RULES PATH:", rulesPath);

try {
    const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    console.log("RULES LOADED:", Object.keys(rules.skills));
    console.log("Backend keywords:", rules.skills['backend-dev-guidelines'].promptTriggers.keywords.slice(0, 5));
} catch (err) {
    console.error("ERROR:", err.message);
}
