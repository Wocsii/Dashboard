import { isGoogleConfigured } from '../_lib/env.js'
import { handle, json, requireUser, supabaseAdmin } from '../_lib/http.js'

/** GET /api/google/status → { state: not_configured | disconnected | needs_reauth | connected } */
export const GET = handle(async (req) => {
  if (!isGoogleConfigured()) return json({ state: 'not_configured' })
  const user = await requireUser(req)
  const { data } = await supabaseAdmin().from('google_connections').select('status, google_email').eq('user_id', user.id).maybeSingle()
  if (!data) return json({ state: 'disconnected' })
  return json({ state: data.status === 'ok' ? 'connected' : 'needs_reauth', email: data.google_email })
})
