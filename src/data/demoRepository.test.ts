import { buildSampleData } from '@/mocks/sample-data'
import { createDemoRepository } from './demoRepository'

describe('repositorio demo', () => {
  it('saves one exercise check-in per day, persists metrics and cascades project deletion', async () => {
    const repo = createDemoRepository(buildSampleData())
    const project = await repo.createProject({ name:'Fuerza',exercise_config:{ weeklyTarget:3,metrics:[{ id:'weight',target:60 }] } })
    const first = await repo.saveExerciseLog({ project_id:project.id,date:'2026-10-16',status:'exercise',values:{ weight:62 } })
    await repo.saveExerciseLog({ project_id:project.id,date:'2026-10-16',status:'rest',values:{} })
    expect(await repo.listExerciseLogs()).toEqual([expect.objectContaining({ id:first.id,status:'rest',values:{} })])
    const again = createDemoRepository()
    expect((await again.listProjects()).find((p) => p.id === project.id)?.exercise_config?.weeklyTarget).toBe(3)
    expect((await again.listExerciseLogs())[0].status).toBe('rest')
    await repo.deleteProject(project.id)
    expect(await repo.listExerciseLogs()).toEqual([])
  })
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

  it('recupera tareas completas y elimina definitivamente al cumplir 14 días', async () => {
    const data = buildSampleData()
    const repo = createDemoRepository(data)
    const task = await repo.createTask({ title: 'Recuperable', description: 'Detalles', status: 'done', tags: ['personal'] })
    await repo.trashTasks([task.id])
    expect((await repo.listTasks()).some(t => t.id === task.id)).toBe(false)
    expect(await repo.listDeletedTasks()).toContainEqual(expect.objectContaining({ id: task.id, description: 'Detalles', tags: ['personal'] }))
    await repo.restoreTask(task.id)
    expect(await repo.listTasks()).toContainEqual(expect.objectContaining({ id: task.id, status: 'done', deleted_at: null }))
    await repo.deleteTask(task.id)
    data.tasks.find(t => t.id === task.id)!.deleted_at = new Date(Date.now() - 14 * 86400000).toISOString()
    expect(await repo.listDeletedTasks()).toEqual([])
    await expect(repo.restoreTask(task.id)).rejects.toThrow('Tarea no encontrado')
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
