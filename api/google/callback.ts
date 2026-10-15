import { verifyState } from '../_lib/crypto.js'
import { isGoogleConfigured, serverEnv } from '../_lib/env.js'
import { exchangeCode, saveConnection } from '../_lib/google.js'
import { redirect } from '../_lib/http.js'

/** GET /api/google/callback?code&state → guarda tokens cifrados y vuelve a la app */
export async function GET(req: Request): Promise<Response> {
  const env = serverEnv()
  const back = (result: string) => redirect(`${env.appUrl}/ajustes?calendar=${result}`)
  if (!isGoogleConfigured()) return back('not_configured')

  const url = new URL(req.url)
  if (url.searchParams.get('error')) return back('denied')
  const code = url.searchParams.get('code')
  const state = verifyState(url.searchParams.get('state') ?? '', env.stateSecret!)
  if (!code || !state) return back('invalid_state')

  try {
    await saveConnection(state.uid, await exchangeCode(code))
    return back('connected')
  } catch (e) {
    console.error('Google callback', e)
    return back('error')
  }
}
