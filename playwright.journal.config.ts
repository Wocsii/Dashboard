import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: /calendar.spec.ts/,
  projects: [
    { name: 'journal-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'journal-ipad', use: { ...devices['iPad (gen 7)'], browserName: 'webkit' } },
  ],
  use: { ...base.use, screenshot: 'only-on-failure' },
})
