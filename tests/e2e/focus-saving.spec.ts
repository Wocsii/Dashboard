import { expect, test } from '@playwright/test'

test('guarda el enfoque sin hábito al pausar y reanudar sin duplicar sesiones', async ({ page }) => {
  await page.goto('/enfoque')
  await page.getByRole('button', { name: 'Empezar', exact: true }).waitFor()
  await page.clock.install()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.clock.fastForward(65_000)
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await expect.poll(async () => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('mi-espacio:demo-data:v1') ?? '{}')
    return data.focusSessions?.filter((s: { started_at: string }) => Date.parse(s.started_at) > Date.now() - 70_000).map((s: { duration_seconds: number }) => s.duration_seconds)
  })).toEqual([65])
  await expect(page.getByText('Tiempo guardado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.clock.fastForward(60_000)
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await expect.poll(async () => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('mi-espacio:demo-data:v1') ?? '{}')
    return data.focusSessions?.filter((s: { started_at: string }) => Date.parse(s.started_at) > Date.now() - 130_000).map((s: { duration_seconds: number }) => s.duration_seconds)
  })).toEqual([125])
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible()
})
