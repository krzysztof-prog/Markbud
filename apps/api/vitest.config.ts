import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Wyłącz równoległe wykonywanie plików testowych dla stabilności
    // Testy integracyjne współdzielą bazę danych (SQLite dev.db)
    fileParallelism: false,
    // Stała kolejność testów dla reprodukowalności
    sequence: {
      shuffle: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/routes/**',
      ],
    },
  },
});
