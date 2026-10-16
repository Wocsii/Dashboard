import { statsMessage, statsMessageCategory } from './messages'
const base = { today: '2026-10-16', completed: 0, pending: 0, overdue: 0, completedThisWeek: 0, focusThisWeek: 0, streak: 0 }
describe('mensajes de estadísticas', () => {
  it.each([
    [{}, 'empty'],
    [{ pending: 4 }, 'quiet'],
    [{ pending: 4, overdue: 1 }, 'overdue'],
    [{ completed: 2, completedThisWeek: 2 }, 'cleared'],
    [{ pending: 4, streak: 3 }, 'streak'],
    [{ completed: 10, completedThisWeek: 10, pending: 1 }, 'productive'],
    [{ focusThisWeek: 120 }, 'focused'],
    [{ completed: 1, completedThisWeek: 1, pending: 1, focusThisWeek: 25 }, 'balanced'],
    [{ completed: 1, completedThisWeek: 1, pending: 1 }, 'progress'],
    [{ focusThisWeek: 25 }, 'starting'],
  ])('elige un mensaje acorde con %j', (patch, category) => {
    const s = { ...base, ...patch }
    expect(statsMessageCategory(s)).toBe(category)
    expect(statsMessage(s).length).toBeLessThan(65)
  })
  it('mantiene el mensaje durante el día y ofrece otra variante al día siguiente', () => {
    expect(statsMessage(base)).toBe(statsMessage({ ...base }))
    expect(statsMessage(base)).not.toBe(statsMessage({ ...base, today: '2026-10-17' }))
  })
})
