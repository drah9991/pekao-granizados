import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load staging environment variables for E2E tests
dotenv.config({ path: '.env.staging' });

export default defineConfig({
  testDir: './e2e',
  // La prueba de arranque levanta su propio build: playwright.smoke.config.ts.
  testIgnore: '**/smoke/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer commented out - assumes dev server is already running
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
