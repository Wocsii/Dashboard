import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('el inicio muestra saludo, productividad y widgets', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '¡Buenas, Demo!' })).toBeVisible()
  await expect(page.getByText('Productividad de hoy')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Para hoy' })).toBeVisible()
  await expect(page.getByText('Proyectos activos')).toBeVisible()
})

test('crear una tarea desde el inicio la guarda y aparece en Tareas tras recargar', async ({ page }) => {
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Título').fill('Comprar flores')
  await dialog.getByLabel('Prioridad').selectOption('urgent')
  await dialog.getByRole('button', { name: 'Crear tarea' }).click()
  await page.getByRole('link', { name: 'Tareas', exact: true }).click()
  await expect(page.getByText('Comprar flores')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Comprar flores')).toBeVisible()
})

test('el Kanban mueve una tarjeta con el teclado y persiste', async ({ page }) => {
  await page.getByRole('link', { name: 'Tablero', exact: true }).click()
  const card = page.getByRole('button', { name: /Llamar al dentista/ })
  await expect(card).toBeVisible()
  await page.waitForLoadState('networkidle')
  await card.focus()
  await expect(card).toBeFocused()
  await page.keyboard.press('Space')
  await page.waitForTimeout(150)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  await page.keyboard.press('Space')
  const progress = page.getByRole('region', { name: /En progreso/ })
  await expect(progress.getByText('Llamar al dentista')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: /En progreso/ }).getByText('Llamar al dentista')).toBeVisible()
})

test('el Kanban mueve una tarjeta arrastrando con el ratón', async ({ page }) => {
  await page.getByRole('link', { name: 'Tablero', exact: true }).click()
  const card = page.getByRole('button', { name: /Comparar vuelos/ })
  const target = page.getByRole('region', { name: /Completada/ })
  const a = (await card.boundingBox())!
  const b = (await target.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 5 })
  await page.mouse.move(b.x + b.width / 2, b.y + 80, { steps: 15 })
  await page.mouse.up()
  await expect(target.getByText('Comparar vuelos')).toBeVisible()
})

test('las notas se autoguardan', async ({ page }) => {
  await page.getByRole('link', { name: 'Notas', exact: true }).click()
  await page.getByLabel('Contenido de la nota').fill('Texto autoguardado')
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible({ timeout: 3000 })
  await page.reload()
  await expect(page.getByLabel('Contenido de la nota')).toHaveValue('Texto autoguardado')
})

test('el Pomodoro arranca, cuenta y se pausa', async ({ page }) => {
  await page.getByRole('link', { name: 'Enfoque', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await page.waitForTimeout(2200)
  await expect(page.getByText(/^24:5\d$/)).toBeVisible()
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
})

for (const width of [1024, 768]) {
  test(`responsive ${width}px: sin scroll horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/tareas', '/kanban', '/proyectos', '/notas', '/enfoque', '/estadisticas']) {
      await page.goto(path)
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => {
        const main = document.getElementById('contenido')!
        return { doc: document.documentElement.scrollWidth > window.innerWidth, main: main.scrollWidth > main.clientWidth }
      })
      expect(overflow, path).toEqual({ doc: false, main: false })
    }
  })
}

test('los filtros de próximos eventos están en Ajustes y el origen de Inicio se conserva por separado', async ({ page }) => {
  await expect(page.getByRole('heading', { name:'Próximos 3 días', exact:true })).toHaveCount(0)
  await expect(page.getByLabel('Calendarios de próximos eventos')).toHaveCount(0)
  await page.getByRole('navigation', { name:'Navegación principal' }).getByRole('link', { name:'Ajustes',exact:true }).click()
  const source = page.getByRole('radiogroup', { name:'Origen de próximos eventos' })
  await source.getByRole('radio', { name:'Apple',exact:true }).click()
  await page.getByRole('link', { name:'Inicio',exact:true }).click()
  await expect(page.getByText(/Conecta o revisa tu cuenta de Apple/)).toBeVisible()
  await page.getByRole('link', { name:'Calendario',exact:true }).click()
  await expect(page.getByRole('radiogroup', { name:'Origen del calendario' }).getByRole('radio', { name:'Google',exact:true })).toHaveAttribute('aria-checked','true')
  await page.getByRole('link', { name:'Inicio',exact:true }).click()
  await page.reload()
  await expect(page.getByText(/Conecta o revisa tu cuenta de Apple/)).toBeVisible()
  await page.getByRole('navigation', { name:'Navegación principal' }).getByRole('link', { name:'Ajustes',exact:true }).click()
  await source.getByRole('radio', { name:'Google',exact:true }).click()
  const filters = page.getByRole('group', { name:'Calendarios y colores que quieres mostrar' })
  await expect(filters.getByRole('checkbox').first()).toBeEnabled()
  const checkboxes = filters.getByRole('checkbox')
  for (let i=0; i < await checkboxes.count(); i++) {
    await expect(checkboxes.nth(i)).toBeEnabled()
    if (await checkboxes.nth(i).isChecked()) {
      await checkboxes.nth(i).click()
      await expect(checkboxes.nth(i)).not.toBeChecked()
    }
  }
  await expect(filters.getByText('Selecciona al menos uno para ver eventos en Inicio.')).toBeVisible()
  await page.getByRole('link', { name:'Inicio',exact:true }).click()
  await expect(page.getByText(/No hay eventos en los próximos 3 días/)).toBeVisible()
})


test('el saludo utiliza el nombre guardado en Ajustes y lo conserva al recargar', async ({ page }) => {
  await page.getByRole('navigation', { name:'Navegación principal' }).getByRole('link', { name:'Ajustes',exact:true }).click()
  await page.getByLabel('Nombre', { exact:true }).fill('Manuela')
  await page.getByLabel('Nombre', { exact:true }).blur()
  await page.getByRole('link', { name:'Inicio',exact:true }).click()
  await expect(page.getByRole('heading', { name:'¡Buenas, Manuela!',exact:true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name:'¡Buenas, Manuela!',exact:true })).toBeVisible()
})
