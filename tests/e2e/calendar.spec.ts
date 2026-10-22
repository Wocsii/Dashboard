import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/calendario')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('calendario conserva la lista y sus rangos sin accesos al calendario visual', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Calendario', exact: true })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Rango', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Café con Lucía', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir Google Calendar' })).toBeVisible()
  await expect(page.locator('a[href*="/calendario/"]')).toHaveCount(0)
  await page.getByRole('radio', { name: 'Hoy', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Hoy', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Próximos 30 días', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Café con Lucía', exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Evento', exact: true })).toHaveCount(0)
})

test('seleccionar Apple muestra su conexión sin mezclar los eventos de Google', async ({ page }) => {
  await expect(page.getByRole('radiogroup', { name: 'Rango', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Apple', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Conecta tu Calendario de Apple' })).toBeVisible()
  await expect(page.getByText('Café con Lucía', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir Apple Calendar' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Apple', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Google', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Café con Lucía', exact: true })).toBeVisible()
})
