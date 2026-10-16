import { newNonce, signState } from '../_lib/crypto.js'
import { isGoogleConfigured, serverEnv } from '../_lib/env.js'
import { buildAuthUrl } from '../_lib/google.js'
import { handle, HttpError, json, requireUser } from '../_lib/http.js'

/** GET /api/google/auth-url → { url } para iniciar el consentimiento de Google */
export const GET = handle(async (req) => {
  if (!isGoogleConfigured()) throw new HttpError(501, 'not_configured', 'Google Calendar no está configurado')
  const user = await requireUser(req)
  const tasks = new URL(req.url).searchParams.get('service') === 'tasks'
  const state = signState({ uid: user.id, nonce: newNonce(), exp: Date.now() + 10 * 60_000, ...(tasks ? { service: 'tasks' as const, tasksReadOnly: new URL(req.url).searchParams.get('mode') === 'readonly' } : {}) }, serverEnv().stateSecret!)
  return json({ url: buildAuthUrl(state, user.email, tasks) })
})
