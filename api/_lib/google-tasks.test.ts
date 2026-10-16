// @vitest-environment node
import { HttpError } from './http'
import { tasksPages, tasksRequest, TASKS_ENABLED, TASKS_SCOPE, TASKS_READONLY } from './google-tasks'
import { POST } from './google-tasks-endpoint'

const mocks = vi.hoisted(() => ({ scopes: ['https://www.googleapis.com/auth/tasks', 'dashboard:tasks:enabled'], token: vi.fn(), update: vi.fn(), user: vi.fn() }))
vi.mock('./google.js', () => ({ getAccessToken: mocks.token }))
vi.mock('./http.js', async importOriginal => {
  const original = await importOriginal<typeof import('./http')>()
  return { ...original, requireUser: mocks.user, supabaseAdmin: () => ({ from: () => ({ update: (row: { scopes: string[] }) => ({ eq: async (_key: string, uid: string) => { mocks.update(row, uid); mocks.scopes = row.scopes; return { error: null } } }), select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { scopes: mocks.scopes, status: 'ok' } }) }) }) }) }) }
})
describe('Google Tasks server', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.scopes = [TASKS_SCOPE, TASKS_ENABLED]; mocks.token.mockResolvedValue('private-token'); mocks.user.mockResolvedValue({ id: 'user' }) })
  afterEach(() => vi.unstubAllGlobals())
  it('no accede a Google si el usuario no ha activado Tasks', async () => {
    mocks.scopes = [TASKS_SCOPE]
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    await expect(tasksRequest('user', '/users/@me/lists')).rejects.toMatchObject({ code: 'not_connected' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('recorre todas las páginas y conserva los parámetros', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ items: [{ id: 'a' }], nextPageToken: 'next token' })).mockResolvedValueOnce(Response.json({ items: [{ id: 'b' }] }))
    vi.stubGlobal('fetch', fetcher)
    expect(await tasksPages('user', '/lists/list/tasks?showHidden=true')).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(fetcher.mock.calls[1][0]).toContain('showHidden=true&maxResults=100&pageToken=next%20token')
  })
  it('usa If-Match y comunica conflictos sin filtrar la respuesta de Google', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret', { status: 412 })); vi.stubGlobal('fetch', fetcher)
    await expect(tasksRequest('user', '/lists/list/tasks/task', 'PATCH', { title: 'Nueva' }, 'version')).rejects.toMatchObject({ code: 'conflict' })
    expect(fetcher.mock.calls[0][1].headers['If-Match']).toBe('version')
  })
  it.each([
    ['SERVICE_DISABLED', 'not_configured'],
    ['accessNotConfigured', 'not_configured'],
    ['ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'needs_permission'],
    ['insufficientPermissions', 'needs_permission'],
    ['other', 'forbidden'],
  ])('distingue el rechazo %s sin mostrar datos privados', async (reason, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { message: 'private response', errors: [{ reason }], details: [{ reason }] } }, { status: 403 })))
    await expect(tasksRequest('user', '/users/@me/lists')).rejects.toMatchObject({ code, message: expect.not.stringContaining('private response') })
  })
  it('valida los comandos antes de enviar datos a Google', async () => {
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: JSON.stringify({ action: 'save', list: 'list', data: { title: '' } }) }))
    expect(res.status).toBe(400)
  })
  it('exige autenticación para escribir', async () => {
    mocks.user.mockRejectedValueOnce(new HttpError(401, 'unauthorized', 'Sesión no válida'))
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(401)
  })
  it.each(['POST', 'PATCH', 'DELETE'])('bloquea %s antes de acceder a Google en solo lectura', async method => {
    mocks.scopes.push(TASKS_READONLY)
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    await expect(tasksRequest('user', '/lists/list/tasks/task', method, { title: 'Cambio' })).rejects.toMatchObject({ code: 'forbidden' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('mantiene la lectura y permite volver a editar conservando la conexión', async () => {
    mocks.scopes.push(TASKS_READONLY)
    const fetcher = vi.fn().mockImplementation(async () => Response.json({ items: [] })); vi.stubGlobal('fetch', fetcher)
    await expect(tasksRequest('user', '/users/@me/lists')).resolves.toEqual({ items: [] })
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: JSON.stringify({ action: 'mode', mode: 'write' }) }))
    expect(res.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ scopes: [TASKS_SCOPE, TASKS_ENABLED] }, 'user')
    await expect(tasksRequest('user', '/users/@me/lists', 'POST', { title: 'Nueva' })).resolves.toEqual({ items: [] })
  })
  it('guarda solo lectura en la cuenta autenticada sin cambiar los permisos de Calendar', async () => {
    mocks.scopes.push('https://www.googleapis.com/auth/calendar.events')
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: JSON.stringify({ action: 'mode', mode: 'readonly' }) }))
    expect(res.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ scopes: [TASKS_SCOPE, TASKS_ENABLED, 'https://www.googleapis.com/auth/calendar.events', TASKS_READONLY] }, 'user')
  })

})
