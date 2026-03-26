import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5202';
const USE_IMPORTED_DATA = process.env.PLAYWRIGHT_USE_IMPORTED_DATA !== 'false';

export default defineConfig({
  testDir: './tests',
  globalSetup: USE_IMPORTED_DATA ? undefined : './tests/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:full',
    env: {
      START_DEV_USE_APPHOSTING: 'true',
      START_DEV_KILL_EMULATORS: 'true',
      START_DEV_USE_EMULATOR_IMPORT: 'true',
      SEED_AUTH: 'false',
      SEED_FIRESTORE: 'false',
      CI: '1',
    },
    url: BASE_URL,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 300 * 1000,
  },
});
