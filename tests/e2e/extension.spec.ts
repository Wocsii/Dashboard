import { chromium, expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('la nueva pestaña de la extensión carga el dashboard alojado', async () => {
  execFileSync('node', ['scripts/build-extension.mjs', '--url', 'http://localhost:4173'])
  const ext = join(process.cwd(), 'dist-extension')
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'ext-')), {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  })
  const page = await ctx.newPage()
  await page.goto('chrome://newtab')
  await expect(page).toHaveURL(/^chrome-extension:\/\/ckdphaplpoocdjbopcngoejjegmkkjaa\/newtab\.html/)
  const frame = page.frameLocator('iframe')
  await expect(frame.getByRole('heading', { name: '¡Buenas!' })).toBeVisible({ timeout: 15000 })
  await ctx.close()
})
