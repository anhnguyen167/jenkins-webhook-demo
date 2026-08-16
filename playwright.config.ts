import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/** The admin portal lives on a different origin from the shop front. */
const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

/** Signed-in browser states produced by tests/auth.setup.ts (gitignored). */
const ADMIN_STATE = 'playwright/.auth/admin.json';
const SHOP_STATE = 'playwright/.auth/shop.json';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* The shared dev environment is slow under load; the defaults (30s test /
   * 5s expect) produce false reds where the page is merely still on 'ロード中…'. */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'https://dev.urry.com/',

    actionTimeout: 30_000,
    navigationTimeout: 60_000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    /* Logs in once and writes playwright/.auth/*.json for the projects below. */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    /* Admin Portal tests — start already signed in as demo@urry.com. */
    {
      name: 'admin',
      testMatch: [
        'promotion-banner-target-audience/**/*.spec.ts',
        'sakaya-product-id-half-width/**/*.spec.ts',
      ],
      /* shop-*.spec.ts verify the shop front — they belong to the shop project. */
      testIgnore: '**/shop-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_BASE,
        storageState: ADMIN_STATE,
      },
      dependencies: ['setup'],
    },

    /* Shop front tests — start already signed in as the Sakaya customer. */
    {
      name: 'shop',
      testMatch: ['shop/**/*.spec.ts', '**/shop-*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: SHOP_STATE,
      },
      dependencies: ['setup'],
    },

    /* Design-token specs log in inline, so they take NO stored state. */
    {
      name: 'tokens',
      testMatch: 'design-tokens/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    /* The original seed specs stay runnable as standalone credential checks. */
    {
      name: 'seeds',
      testMatch: ['seed.spec.ts', 'seed-admin.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
