import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript configuration for all TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // React globals
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-unused-vars': 'off', // Use TypeScript version
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-case-declarations': 'warn', // Allow declarations in case blocks (common pattern)

      // Money safety rules - prevent unsafe operations on monetary fields
      // All monetary values are stored as integers (grosze/cents)
      // Use groszeToPln/centyToEur from utils/money.ts instead
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='parseFloat'][arguments.0.type='MemberExpression'][arguments.0.property.name=/^(valuePln|valueEur|price|cost|amount|total)$/]",
          message:
            '❌ MONEY BUG: Use groszeToPln() or centyToEur() from utils/money.ts instead of parseFloat. Values are stored as integers (grosze/cents).',
        },
        {
          selector:
            "CallExpression[callee.name='parseFloat'][arguments.0.type='CallExpression'][arguments.0.callee.property.name='toString'][arguments.0.callee.object.property.name=/^(valuePln|valueEur|price|cost|amount|total)$/]",
          message:
            '❌ MONEY BUG: Use groszeToPln() or centyToEur() from utils/money.ts instead of parseFloat(...toString()). Values are stored as integers (grosze/cents).',
        },
        {
          selector:
            "CallExpression[callee.property.name='toFixed'][callee.object.property.name=/^(valuePln|valueEur|price|cost|amount|total)$/]",
          message:
            '❌ MONEY BUG: Convert to PLN/EUR first using groszeToPln()/centyToEur(), then use toFixed(). Values are stored as integers (grosze/cents).',
        },
      ],
    },
  },

  // Prettier config (disables conflicting rules)
  prettierConfig,

  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/prisma/**',
      '**/.turbo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
    ],
  },
];
