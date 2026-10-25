import type { DAVClient } from 'tsdav'
import { decrypt } from './crypto.js'
import { serverEnv } from './env.js'
import { HttpError, supabaseAdmin } from './http.js'
import { appleClient } from './apple-transport.js'
import { CalendarCache } from './calendar-cache.js'
const clients = new CalendarCache<DAVClient>(30 * 60_000)
export function isAppleConfigured() { const env = serverEnv(); return !!(env.supabaseUrl && env.supabaseSecretKey && env.tokenKey) }
export function appleSetupError() { return new HttpError(501, 'not_configured', 'Falta activar la conexión de Apple en el servidor. Consulta la configuración de Apple Calendar.') }
export async function withApple<T>(userId: string, fn: (client: DAVClient, email: string) => Promise<T>): Promise<T> {
  if (!isAppleConfigured()) throw appleSetupError()
  const db = supabaseAdmin()
  const { data, error } = await db.from('apple_connections').select('apple_email, password_encrypted, status').eq('user_id',userId).maybeSingle()
  if (error) { if (error.code === '42P01' || error.code === 'PGRST205') throw appleSetupError(); throw new HttpError(502,'unknown','No se pudo comprobar la conexión con Apple') }
  if (!data) throw new HttpError(409,'not_connected','Conecta tu cuenta de Apple para ver tus calendarios')
  if (data.status !== 'ok') throw new HttpError(409,'needs_reauth','Vuelve a conectar Apple Calendar con una contraseña específica vigente')
  // The encrypted credential changes on reconnect, so an old client cannot be reused.
  const cacheKey = JSON.stringify([userId, data.apple_email, data.password_encrypted])
  try { return await fn(await clients.get(cacheKey, () => appleClient(data.apple_email, decrypt(data.password_encrypted,serverEnv().tokenKey!))),data.apple_email) }
  catch (error) {
    clients.delete(cacheKey)
    if (error instanceof HttpError) {
      if (error.code === 'needs_reauth') await db.from('apple_connections').update({ status:'needs_reauth' }).eq('user_id',userId)
      throw error
    }
    // Only log a fixed classification and code locations: library errors can
    // contain credentials, event data or authenticated request headers.
    const kind = error instanceof RangeError ? 'range' : error instanceof TypeError ? 'type' : 'library'
    const frames = error instanceof Error ? error.stack?.split('\n').slice(1, 5).map(line => line.match(/\bat ([\w.$<>]+).*?:(\d+):(\d+)\)?$/)?.slice(1)).filter(Boolean) : undefined
    const reason = error instanceof Error && /Invalid time zone/i.test(error.message) ? 'invalid_timezone'
      : error instanceof Error && /Calendar object fetch failed/.test(error.message) ? 'calendar_object_response'
      : error instanceof Error && /Calendar discovery failed/.test(error.message) ? 'calendar_discovery' : 'unknown'
    console.error('Apple Calendar sync failed', { kind, reason, frames })
    throw new HttpError(502,'unknown','No se pudo sincronizar con iCloud. Actualiza el calendario o inténtalo más tarde.')
  }
}
