import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Ensure sequential test execution to avoid SQLite database file locking conflicts
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
