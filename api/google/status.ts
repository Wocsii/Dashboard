import { isGoogleConfigured } from '../_lib/env.js'
import { handle, json, requireUser, supabaseAdmin } from '../_lib/http.js'
import { GOOGLE_WRITE_SCOPE } from '../_lib/google.js'

/** GET /api/google/status → { state: not_configured | disconnected | needs_reauth | connected } */
export const GET = handle(async (req) => {
  if (!isGoogleConfigured()) return json({ state: 'not_configured' })
  const user = await requireUser(req)
  const { data } = await supabaseAdmin().from('google_connections').select('status, google_email, scopes').eq('user_id', user.id).maybeSingle()
  if (!data) return json({ state: 'disconnected' })
  return json({ state: data.status === 'ok' ? 'connected' : 'needs_reauth', email: data.google_email, canWrite: Boolean(data.scopes?.includes(GOOGLE_WRITE_SCOPE) || data.scopes?.includes('https://www.googleapis.com/auth/calendar')) })
})
