import { isAppleConfigured } from '../_lib/apple.js'
import { handle, HttpError, json, requireUser, supabaseAdmin } from '../_lib/http.js'
export const GET = handle(async (req) => {
  const user = await requireUser(req)
  if (!isAppleConfigured()) return json({ state:'not_configured' })
  const { data, error } = await supabaseAdmin().from('apple_connections').select('apple_email,status').eq('user_id',user.id).maybeSingle()
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return json({ state:'not_configured' })
    throw new HttpError(502,'unknown','No se pudo comprobar la conexión de Apple')
  }
  if (!data) return json({ state:'disconnected' })
  return json({ state: data.status === 'ok' ? 'connected' : 'needs_reauth', email:data.apple_email, canWrite:true })
})
