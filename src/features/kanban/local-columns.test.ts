import { localDefinitions, removeLocalColumn, readLocalColumns, taskColumn } from './local-columns'
import { buildSampleData } from '@/mocks/sample-data'

describe('columnas locales', () => {
  const config = { columns: [{ id: 'custom:review', title: 'En revisión', status: 'todo' as const }], assignments: { t1: 'custom:review' } }
  it('conserva columnas y distribución guardadas y descarta datos no válidos', () => {
    expect(readLocalColumns(JSON.stringify(config))).toEqual(config)
    expect(readLocalColumns('{bad')).toEqual({ columns: [], assignments: {} })
  })
  it('borra columnas conservando las tareas y asignándolas a una columna existente', () => {
    const task = { ...buildSampleData().tasks[0], id: 't1', status: 'todo' as const }
    const removed = removeLocalColumn(config, 'custom:review')
    expect(removed.assignments).toEqual({})
    expect(taskColumn(task, removed)).toBe('todo')
    const withoutDefault = removeLocalColumn(removed, 'todo')
    expect(localDefinitions(withoutDefault).some(c => c.id === 'todo')).toBe(false)
    expect(localDefinitions(withoutDefault).some(c => c.id === taskColumn(task, withoutDefault))).toBe(true)
    expect(task.status).toBe('todo')
    expect(readLocalColumns(JSON.stringify(withoutDefault))).toEqual(withoutDefault)
  })
  it('usa la columna personalizada solo mientras coincide el estado de la tarea', () => {
    const task = { ...buildSampleData().tasks[0], id: 't1', status: 'todo' as const }
    expect(taskColumn(task, config)).toBe('custom:review')
    expect(taskColumn({ ...task, status: 'done' }, config)).toBe('done')
    expect(taskColumn({ ...task, id: 'other' }, config)).toBe('todo')
  })
})
