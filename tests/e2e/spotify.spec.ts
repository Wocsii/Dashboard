import { expect, test } from '@playwright/test'

test('elige una playlist y conserva la selección al recargar', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('dashboard.spotify.content'))
  await page.reload()
  const music = page.getByRole('region', { name: 'Música para concentrarte' })
  await music.getByRole('button', { name: 'Elegir playlist' }).click()
  await music.getByRole('button', { name: /lofi beats/ }).click()
  await expect(music.locator('iframe')).toHaveAttribute('src', /embed\/playlist\/37i9dQZF1DWWQRwui0ExPn/)
  await page.reload()
  await expect(music.locator('iframe')).toHaveAttribute('src', /embed\/playlist\/37i9dQZF1DWWQRwui0ExPn/)
  await music.getByRole('button', { name: 'Elegir playlist' }).click()
  await expect(music.getByRole('button', { name: /lofi beats/ })).toHaveAttribute('aria-pressed', 'true')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(music.getByRole('button', { name: /Deep Focus/ })).toBeVisible()
})
