import { readLocalColumns, taskColumn } from './local-columns'
import { buildSampleData } from '@/mocks/sample-data'

describe('columnas locales', () => {
  const config = { columns: [{ id: 'custom:review', title: 'En revisión', status: 'todo' as const }], assignments: { t1: 'custom:review' } }
  it('conserva columnas y distribución guardadas y descarta datos no válidos', () => {
    expect(readLocalColumns(JSON.stringify(config))).toEqual(config)
    expect(readLocalColumns('{bad')).toEqual({ columns: [], assignments: {} })
  })
  it('usa la columna personalizada solo mientras coincide el estado de la tarea', () => {
    const task = { ...buildSampleData().tasks[0], id: 't1', status: 'todo' as const }
    expect(taskColumn(task, config)).toBe('custom:review')
    expect(taskColumn({ ...task, status: 'done' }, config)).toBe('done')
    expect(taskColumn({ ...task, id: 'other' }, config)).toBe('todo')
  })
})
