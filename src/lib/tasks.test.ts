import { buildSampleData } from '@/mocks/sample-data'
import type { Task } from '@/types/domain'
import { defaultFilter, filterTasks, groupTasks, groupTasksByPriority, isOverdue, pickFocusTask, sortTasks } from './tasks'

const today = '2026-10-15'
const mk = (o: Partial<Task>): Task => ({
  id: Math.random().toString(36), user_id: 'u', project_id: null, title: 't', description: '', status: 'todo', priority: 'medium',
  due_date: null, tags: [], position: 0, is_focus: false, completed_at: null, created_at: '2026-10-01T00:00:00Z', updated_at: '', ...o,
})

describe('tasks', () => {
  it('detecta vencidas solo si no están hechas', () => {
    expect(isOverdue(mk({ due_date: '2026-10-14' }), today)).toBe(true)
    expect(isOverdue(mk({ due_date: '2026-10-14', status: 'done' }), today)).toBe(false)
    expect(isOverdue(mk({ due_date: today }), today)).toBe(false)
  })

  it('agrupa por urgencia', () => {
    const g = groupTasks(
      [mk({ due_date: '2026-10-10' }), mk({ due_date: today }), mk({ due_date: '2026-10-20' }), mk({}), mk({ status: 'done' })],
      today,
    )
    expect([g.overdue.length, g.today.length, g.upcoming.length, g.noDate.length, g.done.length]).toEqual([1, 1, 1, 1, 1])
  })

  it('agrupa por prioridad y mantiene las completadas aparte', () => {
    const groups = groupTasksByPriority(sortTasks([mk({ priority: 'low' }), mk({ priority: 'urgent' }), mk({ priority: 'high' }), mk({ priority: 'medium' }), mk({ priority: 'urgent', status: 'done' })], 'priority'))
    expect(Object.values(groups).map(rows => rows.length)).toEqual([1, 1, 1, 1, 1])
  })

  it('filtra por estado, prioridad, fecha y texto', () => {
    const list = [
      mk({ title: 'Comprar pan', priority: 'low', due_date: today }),
      mk({ title: 'Informe', priority: 'high', due_date: '2026-10-18', tags: ['trabajo'] }),
      mk({ title: 'Hecha', status: 'done' }),
    ]
    expect(filterTasks(list, defaultFilter, today)).toHaveLength(2)
    expect(filterTasks(list, { ...defaultFilter, state: 'done' }, today)).toHaveLength(1)
    expect(filterTasks(list, { ...defaultFilter, priority: 'high' }, today)[0].title).toBe('Informe')
    expect(filterTasks(list, { ...defaultFilter, when: 'today' }, today)[0].title).toBe('Comprar pan')
    expect(filterTasks(list, { ...defaultFilter, when: 'week' }, today)).toHaveLength(2)
    expect(filterTasks(list, { ...defaultFilter, search: 'TRABAJO' }, today)).toHaveLength(1)
  })

  it('ordena por fecha (sin fecha al final) y por prioridad', () => {
    const a = mk({ title: 'a', due_date: '2026-10-20', priority: 'low' })
    const b = mk({ title: 'b', due_date: '2026-10-16', priority: 'urgent' })
    const c = mk({ title: 'c', priority: 'high' })
    expect(sortTasks([a, b, c], 'due').map((t) => t.title)).toEqual(['b', 'a', 'c'])
    expect(sortTasks([a, b, c], 'priority').map((t) => t.title)).toEqual(['b', 'c', 'a'])
  })

  it('elige la tarea prioritaria marcada o la más urgente para hoy', () => {
    const flagged = mk({ title: 'flag', is_focus: true })
    const urgent = mk({ title: 'urg', priority: 'urgent', due_date: today })
    expect(pickFocusTask([urgent, flagged], today)?.title).toBe('flag')
    expect(pickFocusTask([urgent, mk({ due_date: today })], today)?.title).toBe('urg')
    expect(pickFocusTask([mk({ due_date: '2026-11-01' })], today)).toBeUndefined()
  })

  it('los datos de ejemplo son coherentes', () => {
    const d = buildSampleData(new Date(2026, 9, 15, 12))
    expect(d.tasks.filter((t) => t.is_focus)).toHaveLength(1)
    expect(d.tasks.every((t) => !t.project_id || d.projects.some((p) => p.id === t.project_id))).toBe(true)
  })
})
