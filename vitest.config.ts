import path from 'path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so unit tests don't load the PWA/Tailwind build plugins
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // Measure the code that the unit tests are written for: server helpers, services, libs
      // Floor set just under the measured baseline so coverage cannot silently regress (REL-008)
      thresholds: { statements: 35, lines: 35, branches: 55, functions: 55 },
      include: ['server/lib/**', 'src/lib/**', 'src/services/configStorageService.ts', 'src/services/haAuth.ts'],
    },
  },
});
