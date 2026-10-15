import { buildSampleData } from '@/mocks/sample-data'
import { createDemoRepository } from './demoRepository'

describe('repositorio demo', () => {
  beforeEach(() => localStorage.clear())

  it('crea, edita, completa y borra tareas imitando los triggers de la BD', async () => {
    const repo = createDemoRepository(buildSampleData())
    const t = await repo.createTask({ title: 'Nueva' })
    expect(t.completed_at).toBeNull()
    const done = await repo.updateTask(t.id, { status: 'done' })
    expect(done.completed_at).not.toBeNull()
    const undone = await repo.updateTask(t.id, { status: 'in_progress' })
    expect(undone.completed_at).toBeNull()
    await repo.deleteTask(t.id)
    expect((await repo.listTasks()).some((x) => x.id === t.id)).toBe(false)
  })

  it('persiste en localStorage', async () => {
    const repo = createDemoRepository(buildSampleData())
    await repo.createNote({ title: 'Persistente' })
    const again = createDemoRepository()
    expect((await again.listNotes()).some((n) => n.title === 'Persistente')).toBe(true)
  })

  it('al borrar un proyecto sus tareas quedan sin proyecto', async () => {
    const repo = createDemoRepository(buildSampleData())
    await repo.deleteProject('p-web')
    const tasks = await repo.listTasks()
    expect(tasks.some((t) => t.project_id === 'p-web')).toBe(false)
    expect(tasks.find((t) => t.id === 't1')).toBeDefined()
  })
})
