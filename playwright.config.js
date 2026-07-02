import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  workers: 1,
  retries: 1,
  timeout: 120000,

  preserveOutput: 'failures-only',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  use: {
    baseURL: process.env.TEST_CNQ_BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 60000,
    navigationTimeout: 60000,
  },

  outputDir: 'test-results/',

  projects: [
    {
      name: 'Correntina',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: process.env.TEST_CNQ_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      testMatch: '**/cuponesCNQ.spec.js',
    },
    {
      name: 'Saltena',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: process.env.TEST_SLA_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      testMatch: '**/cuponesSLA.spec.js',
    },
    {
      name: 'Rionegrina',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: process.env.TEST_RN_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      testMatch: '**/cuponesRN.spec.js',
    },
    {
      name: 'Neuquina',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: process.env.TEST_NQN_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      testMatch: '**/cuponesNQN.spec.js',
    },
    {
  name: 'TDF',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    baseURL: process.env.TEST_TDF_BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  testMatch: '**/cuponesTDF.spec.js',
},
    {
      name: 'Saltena-Tombo',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: process.env.TEST_SLA_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // ⬇️ ÚNICO CAMBIO: flags para permitir carga del iframe
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content',
          ],
        },
      },
      testMatch: '**/tomboexSLA.spec.js',
    },
  {
  name: 'Saltena-Quini6',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    baseURL: process.env.TEST_SLA_BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // ⬇️ ÚNICO CAMBIO: flags para permitir carga del iframe
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content',
          ],
        },
  },
  testMatch: '**/quini6SLA.spec.js',
},
  ],
});
