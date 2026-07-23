/**
 * PM2 Wrapper - Uruchamia TypeScript przez tsx
 */

import { register } from 'tsx/esm/api';
import { pathToFileURL } from 'node:url';

// Rejestruj tsx dla TypeScript support
register();

// Załaduj główny plik TypeScript
await import(pathToFileURL('./src/index.ts').href);
