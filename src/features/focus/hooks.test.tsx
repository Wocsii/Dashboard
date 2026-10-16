import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/render'
import { useLogFocusSession } from './hooks'
import type { FocusSessionInput } from '@/types/domain'
import { pendingSessions } from './pending-sessions'
import { DEMO_USER_ID } from '@/mocks/sample-data'
const session: FocusSessionInput = { id: 'stable-session', task_id: null, kind: 'focus', started_at: '2026-10-16T10:00:00.000Z', ended_at: '2026-10-16T10:02:00.000Z', duration_seconds: 120, completed: false }
function SaveSession() {
  const save = useLogFocusSession()
  return <button onClick={() => save.mutate(session)}>Guardar sesión</button>
}
describe('guardado de sesiones', () => {
  it('reintenta con el mismo identificador sin marcar como guardado antes de tiempo', async () => {
    const { repo } = renderApp(<SaveSession />)
    const original = repo.createFocusSession.bind(repo)
    const save = vi.spyOn(repo, 'createFocusSession').mockRejectedValueOnce(new Error('Sin conexión')).mockImplementation(original)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sesión' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(pendingSessions(DEMO_USER_ID)).toEqual([session])
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2), { timeout: 3000 })
    await waitFor(() => expect(pendingSessions(DEMO_USER_ID)).toEqual([]))
    expect(save.mock.calls.map(([input]) => input.id)).toEqual(['stable-session', 'stable-session'])
    expect((await repo.listFocusSessions('2026-10-16T10:00:00.000Z')).filter(s => s.id === session.id)).toHaveLength(1)
  })
})
