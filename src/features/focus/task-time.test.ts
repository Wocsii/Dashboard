import { formatWorkedTime, taskWorkedSeconds } from './task-time'
import type { FocusSessionInput } from '@/types/domain'

const session = (id: string, seconds: number, patch: Partial<FocusSessionInput> = {}): FocusSessionInput => ({ id, task_id: 'task', kind: 'focus', started_at: '2020-01-01T00:00:00Z', ended_at: '2020-01-01T01:00:00Z', duration_seconds: seconds, completed: false, ...patch })
describe('tiempo trabajado por tarea', () => {
  it('suma sesiones antiguas y nuevas y deduplica guardados, pendientes y tramo activo', () => {
    expect(taskWorkedSeconds('task', [session('old', 3600), session('current', 20), session('current', 30), session('break', 600, { kind: 'short_break' }), session('other', 100, { task_id: 'other' })], { id: 'current', taskId: 'task', seconds: 40 })).toBe(3640)
    expect(taskWorkedSeconds('task', [session('current', 50)], { id: 'current', taskId: 'task', seconds: 40 })).toBe(50)
  })
  it('muestra cero y horas, minutos y segundos sin redondear tiempo hacia arriba', () => {
    expect(formatWorkedTime(0)).toBe('0 min 0 s')
    expect(formatWorkedTime(3661)).toBe('1 h 1 min 1 s')
  })
})
