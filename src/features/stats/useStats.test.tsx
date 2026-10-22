import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setRepository } from '@/data'
import { createDemoRepository } from '@/data/demoRepository'
import { buildSampleData } from '@/mocks/sample-data'
import { tasksKey } from '../tasks/hooks'
import { useStats } from './useStats'

function setup() {
  const data = buildSampleData()
  const template = data.tasks[0]
  const completedAt = new Date().toISOString()
  data.tasks = [
    { ...template, id: 'done', status: 'done', completed_at: completedAt },
    { ...template, id: 'pending', status: 'todo' },
    { ...template, id: 'deleted-done', status: 'done', completed_at: completedAt, deleted_at: completedAt },
    { ...template, id: 'deleted-pending', status: 'todo', deleted_at: completedAt },
    { ...template, id: 'deleted-habit', status: 'done', completed_at: completedAt, deleted_at: completedAt, tags: ['habit-session'] },
    { ...template, id: 'deleted-google', status: 'done', completed_at: completedAt, deleted_at: completedAt, tags: ['google-tasks-focus:example'] },
  ]
  const repo = createDemoRepository(data)
  setRepository(repo)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { repo, client, wrapper }
}

afterEach(() => setRepository(null))

it('suma las terminadas eliminadas al total y las gráficas, sin incluir pendientes borradas ni tareas internas', async () => {
  const { repo, client, wrapper } = setup()
  const { result } = renderHook(() => useStats({ includeDeletedCompleted: true }), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.completed).toBe(2)
  expect(result.current.pending).toBe(1)
  expect(result.current.completionRate).toBe(67)
  expect(result.current.completedThisWeek).toBe(2)
  expect(result.current.completedBars.reduce((sum, bar) => sum + bar.value, 0)).toBe(2)
  expect(result.current.weeksBars.at(-1)?.value).toBe(2)

  await act(async () => {
    await repo.deleteTask('done')
    await client.invalidateQueries({ queryKey: tasksKey })
  })
  await waitFor(() => expect(client.isFetching()).toBe(0))
  expect(result.current.completed).toBe(2)
  expect(result.current.completedThisWeek).toBe(2)

  await act(async () => {
    await repo.restoreTask('deleted-done')
    await client.invalidateQueries({ queryKey: tasksKey })
  })
  await waitFor(() => expect(client.isFetching()).toBe(0))
  expect(result.current.completed).toBe(2)
  expect(result.current.completedThisWeek).toBe(2)
})

it('mantiene las métricas de Inicio sin cambios', async () => {
  const { repo, wrapper } = setup()
  const listDeletedTasks = vi.spyOn(repo, 'listDeletedTasks')
  const { result } = renderHook(() => useStats(), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.completed).toBe(1)
  expect(result.current.pending).toBe(1)
  expect(result.current.completionRate).toBe(50)
  expect(listDeletedTasks).not.toHaveBeenCalled()
})
