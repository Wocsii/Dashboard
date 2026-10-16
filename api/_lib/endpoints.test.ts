// @vitest-environment node
import { randomBytes } from 'node:crypto'
import { buildAuthUrl } from './google'
import { signState } from './crypto'
import { GET as callback } from '../google/callback'
import { GET as status } from '../google/status'
import { GET as authUrl } from '../google/auth-url'

const configured = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'test',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:5173/api/google/callback',
  TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  OAUTH_STATE_SECRET: 'state-secret',
  APP_URL: 'http://localhost:5173',
}

describe('endpoints de Google Calendar', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('sin configuración responden "not_configured"', async () => {
    for (const k of Object.keys(configured)) delete process.env[k]
    const res = await status(new Request('http://x/api/google/status'))
    expect(await res.json()).toEqual({ state: 'not_configured' })
    const res2 = await authUrl(new Request('http://x/api/google/auth-url'))
    expect(res2.status).toBe(501)
    expect((await res2.json()).code).toBe('not_configured')
  })

  it('auth-url exige sesión', async () => {
    Object.assign(process.env, configured)
    const res = await authUrl(new Request('http://x/api/google/auth-url'))
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('unauthorized')
  })

  it('el callback rechaza un state falso o caducado y vuelve a Ajustes', async () => {
    Object.assign(process.env, configured)
    const forged = signState({ uid: 'u', nonce: 'n', exp: Date.now() + 60_000 }, 'otro-secreto')
    const res = await callback(new Request(`http://x/api/google/callback?code=abc&state=${forged}`))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost:5173/ajustes?calendar=invalid_state')
  })

  it('el callback informa si cancelas el permiso', async () => {
    Object.assign(process.env, configured)
    const res = await callback(new Request('http://x/api/google/callback?error=access_denied'))
    expect(res.headers.get('location')).toBe('http://localhost:5173/ajustes?calendar=denied')
  })
  it('solicita el permiso de Tasks únicamente al conectar Tasks', () => {
    Object.assign(process.env, configured)
    expect(new URL(buildAuthUrl('state')).searchParams.get('scope')).not.toContain('/auth/tasks')
    expect(new URL(buildAuthUrl('state', null, true)).searchParams.get('scope')).toContain('/auth/tasks')
  })
  it('vuelve al panel de Tasks cuando se cancela su consentimiento', async () => {
    Object.assign(process.env, configured)
    const state = signState({ uid: 'u', nonce: 'n', exp: Date.now() + 60000, service: 'tasks' }, configured.OAUTH_STATE_SECRET)
    const res = await callback(new Request(`http://x/api/google/callback?error=access_denied&state=${state}`))
    expect(res.headers.get('location')).toBe('http://localhost:5173/ajustes?tasks=denied')
  })

})
