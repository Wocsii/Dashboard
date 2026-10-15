import { z } from 'zod'
import { encrypt } from '../_lib/crypto.js'
import { readWriteBody } from '../_lib/calendar-write.js'
import { appleClient, appleCollections } from '../_lib/apple-transport.js'
import { appleSetupError, isAppleConfigured } from '../_lib/apple.js'
import { serverEnv } from '../_lib/env.js'
import { handle, HttpError, json, requireUser, supabaseAdmin } from '../_lib/http.js'
const schema = z.object({ email:z.email().max(320), password:z.string().trim().regex(/^[a-z]{4}(?:-[a-z]{4}){3}$/, 'Usa una contraseña específica de Apple con formato xxxx-xxxx-xxxx-xxxx') })
export const POST = handle(async (req) => {
  const user = await requireUser(req)
  if (!isAppleConfigured()) throw appleSetupError()
  const result = schema.safeParse(await readWriteBody(req))
  if (!result.success) throw new HttpError(400,'bad_request',result.error.issues[0]?.message ?? 'Comprueba los datos de Apple')
  const { email,password } = result.data
  try { await appleCollections(await appleClient(email,password)) } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(502,'unknown','No se pudo verificar tu cuenta de iCloud. Comprueba la contraseña específica para esta app.')
  }
  const { error } = await supabaseAdmin().from('apple_connections').upsert({ user_id:user.id, apple_email:email, password_encrypted:encrypt(password,serverEnv().tokenKey!), status:'ok', connected_at:new Date().toISOString() })
  if (error) { if (error.code === '42P01' || error.code === 'PGRST205') throw appleSetupError(); throw new HttpError(502,'unknown','No se pudo guardar la conexión de Apple') }
  return json({ state:'connected', email, canWrite:true })
})

export const DELETE = handle(async (req) => {
  const user = await requireUser(req)
  const { error } = await supabaseAdmin().from('apple_connections').delete().eq('user_id',user.id)
  if (error) throw new HttpError(502,'unknown','No se pudo eliminar la conexión de Apple')
  return json({ disconnected:true })
})
