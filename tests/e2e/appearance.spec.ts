import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/ajustes')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('modo noche: cambia toda la interfaz, conserva la elección y vuelve al día', async ({ page }) => {
  await page.getByRole('radio', { name: 'Noche', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.locator('header img').first()).toHaveAttribute('src', /avatar-night/)
  await expect(page.locator('.night-moon')).toHaveCSS('opacity', '1')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(page.getByRole('heading', { name: 'Para hoy', exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/mi-espacio-night-desktop.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Título', { exact: true })).toHaveCSS('color', 'rgb(238, 242, 251)')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('link', { name: 'Enfoque', exact: true }).click()
  const hero = page.locator('img[src$="personaje-hero-night.png"]')
  await expect(hero).toBeVisible()
  await expect.poll(() => hero.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await hero.evaluate((element) => {
    const image = element as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, 1, 1).data[3]
  })).toBe(0)
  await page.screenshot({ path: '/tmp/mi-espacio-night-focus.png', animations: 'disabled' })
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('radio', { name: 'Día', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('el horario cruza medianoche y cambia sin recargar', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 16, 20, 59, 58) })
  await page.getByRole('radio', { name: 'Automático', exact: true }).click()
  await page.getByLabel('Activar modo noche a las').fill('21:00')
  await page.getByLabel('Volver al modo día a las').fill('07:00')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.clock.runFor(3000)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.clock.fastForward(10 * 60 * 60 * 1000)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('noche en calendario y móvil sin desbordamiento', async ({ page }) => {
  await page.getByRole('radio', { name: 'Noche', exact: true }).click()
  await page.goto('/calendario/visual')
  await expect(page.getByLabel('Agenda semanal')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Calendario de Google' })).toHaveCSS('background-color', 'rgb(32, 45, 66)')
  await page.screenshot({ path: '/tmp/mi-espacio-night-calendar.png', animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ajustes')
  await expect(page.getByRole('radio', { name: 'Noche', exact: true })).toHaveAttribute('aria-checked', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/mi-espacio-night-mobile.png', animations: 'disabled' })
})


test('los colores nocturnos mantienen la legibilidad en todas las páginas', async ({ page }) => {
  await page.getByRole('radio', { name: 'Noche', exact: true }).click()
  const issues: string[] = []
  for (const route of ['/', '/tareas', '/kanban', '/proyectos', '/notas', '/calendario', '/calendario/visual', '/enfoque', '/estadisticas', '/ajustes']) {
    await page.goto(route)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await page.waitForTimeout(700)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    for (const violation of violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')) {
      issues.push(`${route}: ${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
    }
  }
  expect(issues).toEqual([])
})
