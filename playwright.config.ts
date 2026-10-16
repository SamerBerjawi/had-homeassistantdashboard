import { defineConfig } from '@playwright/test';

const PORT = 3100;
const DATA_DIR = process.env.QA_DATA_DIR || '/private/tmp/claude-501/-Users-samerberjawi-Documents-had-homeassistantdashboard/ba5625f8-d8a9-4665-a9a8-6df3025ba234/scratchpad/qa-data';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '/private/tmp/claude-501/-Users-samerberjawi-Documents-had-homeassistantdashboard/ba5625f8-d8a9-4665-a9a8-6df3025ba234/scratchpad/pw-results.json' }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'npx tsx server.ts',
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', HASS_URL: 'http://127.0.0.1:9', ALLOW_MOCK_TOKENS: 'true' },
  },
});
