import type { FocusSession, Task } from '@/types/domain'
import { completionRate, focusMinutes, formatHoursCompact, formatMinutes, productivityStreak, todayProductivity, weeklySeries } from './stats'

const now = new Date(2026, 9, 15, 15) // jueves 15 oct 2026, 15:00 local
const at = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString()
const task = (o: Partial<Task>): Task => ({
  id: Math.random().toString(36), user_id: 'u', project_id: null, title: 't', description: '', status: 'todo', priority: 'medium',
  due_date: null, tags: [], position: 0, is_focus: false, completed_at: null, created_at: '', updated_at: '', ...o,
})
const session = (d: number, minutes: number, kind: FocusSession['kind'] = 'focus'): FocusSession => ({
  id: Math.random().toString(36), user_id: 'u', task_id: null, kind, started_at: at(d), ended_at: at(d, 11),
  duration_seconds: minutes * 60, completed: true, created_at: '',
})

describe('stats', () => {
  it('productividad de hoy: hechas hoy / (hechas hoy + pendientes para hoy o vencidas)', () => {
    const tasks = [
      task({ status: 'done', completed_at: at(15) }),
      task({ due_date: '2026-10-15' }),
      task({ due_date: '2026-10-10' }),
      task({ due_date: '2026-10-20' }), // futura: no cuenta
    ]
    expect(todayProductivity(tasks, '2026-10-15')).toBe(33)
    expect(todayProductivity([], '2026-10-15')).toBeNull()
  })

  it('porcentaje de finalización', () => {
    expect(completionRate([task({ status: 'done' }), task({})])).toBe(50)
    expect(completionRate([])).toBe(0)
  })

  it('suma solo minutos de enfoque en el rango', () => {
    const s = [session(13, 25), session(14, 50), session(14, 5, 'short_break')]
    expect(focusMinutes(s)).toBe(75)
    expect(focusMinutes(s, '2026-10-14', '2026-10-14')).toBe(50)
  })

  it('serie semanal empieza en lunes y tiene 7 días', () => {
    const w = weeklySeries([task({ status: 'done', completed_at: at(13) })], [session(15, 25)], now, 1)
    expect(w).toHaveLength(7)
    expect(w[0].date).toBe('2026-10-12')
    expect(w[1].completed).toBe(1)
    expect(w[3].focusMinutes).toBe(25)
  })

  it('racha cuenta días consecutivos hasta hoy o ayer', () => {
    const t = [task({ completed_at: at(12) }), task({ completed_at: at(13) })]
    expect(productivityStreak(t, [session(14, 25)], now)).toBe(3) // 12,13,14 (hoy aún sin actividad)
    expect(productivityStreak(t, [session(15, 25)], now)).toBe(1) // hueco el 14
    expect(productivityStreak([], [], now)).toBe(0)
  })

  it('formatea minutos', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(225)).toBe('3h 45m')
    expect(formatHoursCompact(225)).toBe('3,8h')
  })
})
