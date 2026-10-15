import { defineConfig, devices } from '@playwright/test'

/**
 * E2E en MODO DEMO (sin Supabase): la app se sirve con las variables de Supabase vacías.
 * Usa el Chrome instalado (channel: 'chrome'); el test de la extensión usa Chromium de Playwright
 * (npx playwright install chromium) porque Chrome estable no permite --load-extension.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_SPOTIFY_CLIENT_ID: '0'.repeat(32) },
  },
  projects: [
    { name: 'desktop', testIgnore: /extension/, use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'extension', testMatch: /extension/ },
  ],
})
