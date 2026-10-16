import { confirmSession, pendingSessions, queueSession } from './pending-sessions'
import type { FocusSessionInput } from '@/types/domain'
const session: FocusSessionInput & { id: string } = { id: 'session', task_id: null, kind: 'focus', started_at: '2026-10-16T10:00:00.000Z', ended_at: '2026-10-16T10:02:00.000Z', duration_seconds: 120, completed: false }
describe('guardados de tiempo pendientes', () => {
  beforeEach(() => localStorage.clear())
  it('retiene un guardado fallido hasta confirmar su éxito', () => {
    const queued = queueSession('owner', session)
    expect(pendingSessions('owner')).toEqual([session])
    expect(pendingSessions('another-owner')).toEqual([])
    confirmSession('owner', queued)
    expect(pendingSessions('owner')).toEqual([])
  })
  it('conserva la versión más reciente mientras termina un guardado anterior', () => {
    const older = queueSession('owner', session)
    const newer = queueSession('owner', { ...session, duration_seconds: 180, ended_at: '2026-10-16T10:03:00.000Z', completed: true })
    confirmSession('owner', older)
    expect(pendingSessions('owner')).toEqual([newer])
    const duplicate = queueSession('owner', session)
    expect(duplicate.duration_seconds).toBe(180)
    expect(duplicate.completed).toBe(true)
    confirmSession('owner', duplicate)
    expect(pendingSessions('owner')).toEqual([])
  })
})
