import type { DAVClient } from 'tsdav'
import { decrypt } from './crypto.js'
import { serverEnv } from './env.js'
import { HttpError, supabaseAdmin } from './http.js'
import { appleClient } from './apple-transport.js'
export function isAppleConfigured() { const env = serverEnv(); return !!(env.supabaseUrl && env.supabaseSecretKey && env.tokenKey) }
export function appleSetupError() { return new HttpError(501, 'not_configured', 'Falta activar la conexión de Apple en el servidor. Consulta la configuración de Apple Calendar.') }
export async function withApple<T>(userId: string, fn: (client: DAVClient, email: string) => Promise<T>): Promise<T> {
  if (!isAppleConfigured()) throw appleSetupError()
  const db = supabaseAdmin()
  const { data, error } = await db.from('apple_connections').select('apple_email, password_encrypted, status').eq('user_id',userId).maybeSingle()
  if (error) { if (error.code === '42P01' || error.code === 'PGRST205') throw appleSetupError(); throw new HttpError(502,'unknown','No se pudo comprobar la conexión con Apple') }
  if (!data) throw new HttpError(409,'not_connected','Conecta tu cuenta de Apple para ver tus calendarios')
  if (data.status !== 'ok') throw new HttpError(409,'needs_reauth','Vuelve a conectar Apple Calendar con una contraseña específica vigente')
  try { return await fn(await appleClient(data.apple_email, decrypt(data.password_encrypted,serverEnv().tokenKey!)),data.apple_email) }
  catch (error) {
    if (error instanceof HttpError) {
      if (error.code === 'needs_reauth') await db.from('apple_connections').update({ status:'needs_reauth' }).eq('user_id',userId)
      throw error
    }
    // Library errors can contain authenticated headers. Never forward or log them.
    throw new HttpError(502,'unknown','No se pudo sincronizar con iCloud. Actualiza el calendario o inténtalo más tarde.')
  }
}
