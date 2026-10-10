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
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
});
