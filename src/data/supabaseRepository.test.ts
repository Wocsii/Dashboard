import { createSupabaseRepository } from './supabaseRepository'
import type { FocusSessionInput } from '@/types/domain'
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), auth: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ requireSupabase: () => ({ auth: { getSession: mocks.auth }, from: () => ({ upsert: mocks.upsert }) }) }))
const session: FocusSessionInput = { id: 'same-session', task_id: 'deleted-task', kind: 'focus', started_at: '2026-10-16T10:00:00.000Z', ended_at: '2026-10-16T10:50:00.000Z', duration_seconds: 3000, completed: true }
const result = (data: unknown, error: unknown = null) => ({ select: () => ({ single: async () => ({ data, error }) }) })
describe('guardado de tiempo en Supabase', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { session: { user: { id: 'owner' } } } }) })
  it('recupera una sesión pendiente con tarea eliminada sin perder tiempo ni crear otro id', async () => {
    const saved = { ...session, task_id: null, user_id: 'owner' }
    mocks.upsert.mockReturnValueOnce(result(null, { code: '23503', message: 'violates foreign key constraint "focus_sessions_task_id_fkey"' })).mockReturnValueOnce(result(saved))
    expect(await createSupabaseRepository().createFocusSession(session)).toEqual(saved)
    expect(mocks.upsert).toHaveBeenNthCalledWith(1, { ...session, user_id: 'owner' })
    expect(mocks.upsert).toHaveBeenNthCalledWith(2, saved)
  })
  it('no cambia la asociación ante errores de permisos o de otras claves', async () => {
    mocks.upsert.mockReturnValue(result(null, { code: '42501', message: 'permission denied' }))
    await expect(createSupabaseRepository().createFocusSession(session)).rejects.toMatchObject({ code: '42501' })
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
  })
})
