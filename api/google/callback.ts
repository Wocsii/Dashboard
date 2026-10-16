import { verifyState } from '../_lib/crypto.js'
import { isGoogleConfigured, serverEnv } from '../_lib/env.js'
import { exchangeCode, saveConnection } from '../_lib/google.js'
import { redirect } from '../_lib/http.js'

/** GET /api/google/callback?code&state → guarda tokens cifrados y vuelve a la app */
export async function GET(req: Request): Promise<Response> {
  const env = serverEnv()
  let service = 'calendar'
  const back = (result: string) => redirect(`${env.appUrl}/ajustes?${service}=${result}`)
  if (!isGoogleConfigured()) return back('not_configured')

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = verifyState(url.searchParams.get('state') ?? '', env.stateSecret!)
  if (state?.service === 'tasks') service = 'tasks'
  if (url.searchParams.get('error')) return back('denied')
  if (!code || !state) return back('invalid_state')

  try {
    await saveConnection(state.uid, await exchangeCode(code), state.service === 'tasks')
    return back('connected')
  } catch {
    // El detalle puede incluir respuestas o credenciales de Google.
    console.error('Google callback failed')
    return back('error')
  }
}
