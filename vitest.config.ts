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
      thresholds: { statements: 40, lines: 40, branches: 58, functions: 60 },
      include: [
        'server/lib/**',
        'src/lib/**',
        'src/hooks/useDialogA11y.ts',
        'src/contexts/AuthContext.tsx',
        'src/components/ui/ConfirmDialog.tsx',
        'src/components/RootErrorBoundary.tsx',
        'src/services/configStorageService.ts',
        'src/services/haAuth.ts'
      ],
    },
  },
});
