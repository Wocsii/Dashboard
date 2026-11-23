import { expect, test } from '@playwright/test'
const book = 'Abrir cuaderno Ideas para el portfolio'
test.beforeEach(async ({ page }) => { await page.goto('/notas'); await page.evaluate(() => localStorage.clear()); await page.reload() })
test('cerrar durante la apertura sin errores', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.getByRole('button', { name: book }).click()
  await page.waitForFunction(() => document.querySelector('.kw-book3d')?.getAttribute('style')?.includes('display: block'))
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Cuadernos', exact: true }).click()
  await expect(page.locator('.kw-notebook-reader')).toHaveCount(0, { timeout: 6000 })
  await expect(page.getByRole('button', { name: book })).toBeVisible()
  expect(errors).toEqual([])
})
test('abrir y cerrar repetido deja el DOM limpio', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: book }).click()
    await expect(page.locator('.kw-notebook-reader[data-ready]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('.kw-leaf3d, .kw-leaf-shadow')).toHaveCount(0)
    await page.getByRole('button', { name: 'Cuadernos', exact: true }).click()
    await expect(page.locator('.kw-notebook-reader')).toHaveCount(0, { timeout: 6000 })
  }
})
test('movimiento reducido y Modo iPad', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: book }).click()
  await expect(page.locator('.kw-notebook-reader[data-ready]')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.kw-cover-hold')).toBeHidden()
  await page.getByRole('button', { name: 'Modo iPad' }).click()
  expect(await page.locator('.kw-editor.kw-fullscreen').boundingBox()).toMatchObject({ x: 0, y: 0, width: 1440, height: 900 })
})
test('varias páginas pasan muchas hojas', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo cuaderno', exact: true }).click()
  await page.getByLabel('¿Qué nombre quieres ponerle?').fill('Multi')
  await page.getByRole('button', { name: 'Crear cuaderno', exact: true }).click()
  await expect(page.locator('.kw-notebook-reader[data-ready]')).toBeVisible({ timeout: 8000 })
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Añadir página', exact: true }).click()
  await page.getByRole('button', { name: 'Cuadernos', exact: true }).click()
  await expect(page.locator('.kw-notebook-reader')).toHaveCount(0, { timeout: 6000 })
  await page.getByRole('button', { name: 'Abrir cuaderno Multi' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.kw-leaf3d').length > 0)
  expect(await page.locator('.kw-leaf3d').count()).toBe(7)
  await expect(page.locator('.kw-notebook-reader[data-ready]')).toBeVisible({ timeout: 12000 })
})
