import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'

const routes = ['/', '/tareas', '/kanban', '/proyectos', '/notas', '/calendario', '/calendario/visual', '/enfoque', '/estadisticas', '/ajustes']

test('accesibilidad: sin violaciones serias o críticas (axe)', async ({ page }) => {
  const report: Record<string, unknown[]> = {}
  for (const route of routes) {
    await page.goto(route)
    await page.waitForTimeout(600)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    report[route] = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), summary: n.failureSummary })),
    }))
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/axe-report.json', JSON.stringify(report, null, 2))
  const serious = Object.entries(report).flatMap(([r, vs]) =>
    (vs as { id: string; impact: string }[]).filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${r}: ${v.id}`),
  )
  expect(serious).toEqual([])
})
