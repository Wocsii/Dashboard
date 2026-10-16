import { z } from 'zod'
import { isGoogleConfigured } from '../_lib/env.js'
import { handle, HttpError, json, requireUser, supabaseAdmin } from '../_lib/http.js'
import { tasksConnection, tasksPages, tasksRequest, TASKS_ENABLED, TASKS_SCOPE } from '../_lib/google-tasks.js'

const id = z.string().min(1).max(2048)
const data = z.object({ title: z.string().trim().min(1).max(1024), notes: z.string().max(8192), due: z.string().regex(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/).nullable(), status: z.enum(['needsAction', 'completed']) })
const command = z.discriminatedUnion('action', [
  z.object({ action: z.literal('disconnect') }),
  z.object({ action: z.literal('list'), title: z.string().trim().min(1).max(1024) }),
  z.object({ action: z.literal('save'), list: id, task: id.optional(), etag: z.string().optional(), data }),
  z.object({ action: z.literal('delete'), list: id, task: id, etag: z.string().optional() }),
  z.object({ action: z.literal('move'), list: id, task: id, destination: id, previous: id.optional() }),
])
const enc = encodeURIComponent
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  if (!isGoogleConfigured()) return json({ state: 'not_configured' })
  const c = await tasksConnection(user.id)
  const state = !c?.scopes?.includes(TASKS_ENABLED) ? 'disconnected' : c.status !== 'ok' || !c.scopes.includes(TASKS_SCOPE) ? 'needs_reauth' : 'connected'
  if (new URL(req.url).searchParams.get('view') === 'status' || state !== 'connected') return json({ state, email: c?.google_email })
  const lists = await tasksPages<{ id: string; title: string }>(user.id, '/users/@me/lists')
  const columns = await Promise.all(lists.map(async (list) => ({ ...list, tasks: await tasksPages(user.id, `/lists/${enc(list.id)}/tasks?showCompleted=true&showHidden=true&showDeleted=false`) })))
  return json({ columns })
})
export const POST = handle(async (req) => {
  const user = await requireUser(req)
  const parsed = command.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, 'bad_request', 'Revisa los datos de la tarea o lista')
  const c = parsed.data
  if (c.action === 'disconnect') {
    const connection = await tasksConnection(user.id)
    if (connection) {
      const { error } = await supabaseAdmin().from('google_connections').update({ scopes: connection.scopes.filter((s: string) => s !== TASKS_ENABLED) }).eq('user_id', user.id)
      if (error) throw new Error('No se pudo desconectar Google Tasks')
    }
    return json({ ok: true })
  }
  if (c.action === 'list') return json(await tasksRequest(user.id, '/users/@me/lists', 'POST', { title: c.title }))
  const path = `/lists/${enc(c.list)}/tasks`
  if (c.action === 'save') return json(await tasksRequest(user.id, `${path}${c.task ? `/${enc(c.task)}` : ''}`, c.task ? 'PATCH' : 'POST', c.data, c.etag))
  if (c.action === 'delete') { await tasksRequest(user.id, `${path}/${enc(c.task)}`, 'DELETE', undefined, c.etag); return json({ ok: true }) }
  const params = new URLSearchParams({ destinationTasklist: c.destination, ...(c.previous ? { previous: c.previous } : {}) })
  return json(await tasksRequest(user.id, `${path}/${enc(c.task)}/move?${params}`, 'POST'))
})
