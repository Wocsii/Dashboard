import { expect, test } from '@playwright/test'

for (const path of ['/tareas', '/kanban']) {
  test(`enfoque desde ${path}: aparece al pasar el cursor y continúa sin límite`, async ({ page }) => {
    await page.goto(path)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    const title = 'Llamar al dentista'
    const button = page.getByRole('button', { name:`Activar enfoque indefinido: ${title}`,exact:true })
    await expect(button).toHaveCSS('opacity','0')
    await page.getByText(title, { exact:true }).hover()
    await expect(button).toHaveCSS('opacity','1')
    await button.click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name:`Detener enfoque: ${title}` })).toHaveAttribute('aria-pressed','true')
    await page.reload()
    await expect(page.getByRole('button', { name:`Detener enfoque: ${title}` })).toHaveAttribute('aria-pressed','true')
    await page.clock.install()
    await page.clock.fastForward(26 * 60_000)
    await page.getByRole('link', { name:'Enfoque',exact:true }).click()
    await expect(page.getByText('Enfoque sin límite · Tiempo transcurrido')).toBeVisible()
    await expect(page.getByText(/^26:0\d$/)).toBeVisible()
    await expect(page.getByRole('combobox', { name:'Tarea en la que te concentras' })).toHaveValue('t6')
    await page.getByRole('button', { name:'Finalizar enfoque',exact:true }).click()
    await expect(page.getByRole('button', { name:'Empezar',exact:true })).toBeVisible()
  })
}
