// @vitest-environment node
import { HttpError } from './http'
import { tasksPages, tasksRequest, TASKS_ENABLED, TASKS_SCOPE } from './google-tasks'
import { POST } from './google-tasks-endpoint'

const mocks = vi.hoisted(() => ({ scopes: ['https://www.googleapis.com/auth/tasks', 'dashboard:tasks:enabled'], token: vi.fn(), user: vi.fn() }))
vi.mock('./google.js', () => ({ getAccessToken: mocks.token }))
vi.mock('./http.js', async importOriginal => {
  const original = await importOriginal<typeof import('./http')>()
  return { ...original, requireUser: mocks.user, supabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { scopes: mocks.scopes, status: 'ok' } }) }) }) }) }) }
})
describe('Google Tasks server', () => {
  beforeEach(() => { mocks.scopes = [TASKS_SCOPE, TASKS_ENABLED]; mocks.token.mockResolvedValue('private-token'); mocks.user.mockResolvedValue({ id: 'user' }) })
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
  it('valida los comandos antes de enviar datos a Google', async () => {
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: JSON.stringify({ action: 'save', list: 'list', data: { title: '' } }) }))
    expect(res.status).toBe(400)
  })
  it('exige autenticación para escribir', async () => {
    mocks.user.mockRejectedValueOnce(new HttpError(401, 'unauthorized', 'Sesión no válida'))
    const res = await POST(new Request('http://x/api/google/status?service=tasks', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(401)
  })
})
