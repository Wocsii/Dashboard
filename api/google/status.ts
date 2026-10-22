import { GET as tasksGET, POST as tasksPOST } from '../_lib/google-tasks-endpoint.js'
import { isGoogleConfigured } from '../_lib/env.js'
import { handle, json, requireUser, supabaseAdmin } from '../_lib/http.js'

/** GET /api/google/status → { state: not_configured | disconnected | needs_reauth | connected } */
export const GET = handle(async (req) => {
  if (new URL(req.url).searchParams.get('service') === 'tasks') return tasksGET(req)
  if (!isGoogleConfigured()) return json({ state: 'not_configured' })
  const user = await requireUser(req)
  const { data } = await supabaseAdmin().from('google_connections').select('status, google_email, scopes').eq('user_id', user.id).maybeSingle()
  if (!data) return json({ state: 'disconnected' })
  return json({ state: data.status === 'ok' ? 'connected' : 'needs_reauth', email: data.google_email })
})

export const POST = tasksPOST
