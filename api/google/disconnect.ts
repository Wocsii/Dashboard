import { revoke } from '../_lib/google.js'
import { handle, json, requireUser } from '../_lib/http.js'

/** POST /api/google/disconnect → revoca el token en Google y borra la conexión */
export const POST = handle(async (req) => {
  const user = await requireUser(req)
  await revoke(user.id)
  return json({ ok: true })
})
