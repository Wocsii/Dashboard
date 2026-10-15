import { decrypt, encrypt } from './crypto.js'
import { serverEnv } from './env.js'
import { HttpError, supabaseAdmin } from './http.js'

/** Permisos mínimos: listar calendarios y leer eventos (+ email para mostrar la cuenta conectada) */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
]

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'

export function buildAuthUrl(state: string, loginHint?: string | null): string {
  const env = serverEnv()
  const p = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: env.googleRedirectUri!,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline', // para recibir refresh_token
    prompt: 'consent', // garantiza refresh_token aunque ya se hubiera concedido antes
    include_granted_scopes: 'true',
    state,
  })
  if (loginHint) p.set('login_hint', loginHint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope: string; id_token?: string }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const env = serverEnv()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.googleClientId!, client_secret: env.googleClientSecret!, ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok) {
    const err = new Error(data.error_description ?? data.error ?? `Google token ${res.status}`) as Error & { googleError?: string }
    err.googleError = data.error
    throw err
  }
  return data as unknown as TokenResponse
}

export const exchangeCode = (code: string) =>
  tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: serverEnv().googleRedirectUri! })

/** El id_token viene directamente de Google por TLS: se puede leer sin verificar firma */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).email ?? null
  } catch {
    return null
  }
}

export async function saveConnection(userId: string, t: TokenResponse) {
  const env = serverEnv()
  const db = supabaseAdmin()
  const { data: existing } = await db.from('google_connections').select('refresh_token_encrypted').eq('user_id', userId).maybeSingle()
  const refresh = t.refresh_token ? encrypt(t.refresh_token, env.tokenKey!) : existing?.refresh_token_encrypted
  if (!refresh) throw new HttpError(400, 'bad_request', 'Google no devolvió un refresh token. Vuelve a intentarlo.')
  const { error } = await db.from('google_connections').upsert({
    user_id: userId,
    google_email: emailFromIdToken(t.id_token),
    refresh_token_encrypted: refresh,
    access_token_encrypted: encrypt(t.access_token, env.tokenKey!),
    access_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    scopes: t.scope.split(' '),
    status: 'ok',
    connected_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

type ConnectionRow = {
  refresh_token_encrypted: string
  access_token_encrypted: string | null
  access_token_expires_at: string | null
  status: 'ok' | 'needs_reauth'
}

/** Devuelve un access token válido, renovándolo con el refresh token si hace falta */
export async function getAccessToken(userId: string): Promise<string> {
  const env = serverEnv()
  const db = supabaseAdmin()
  const { data: row } = await db
    .from('google_connections')
    .select('refresh_token_encrypted, access_token_encrypted, access_token_expires_at, status')
    .eq('user_id', userId)
    .maybeSingle<ConnectionRow>()
  if (!row) throw new HttpError(409, 'not_connected', 'Google Calendar no está conectado')
  if (row.status === 'needs_reauth') throw new HttpError(409, 'needs_reauth', 'Hay que volver a conectar Google Calendar')

  const fresh = row.access_token_expires_at && new Date(row.access_token_expires_at).getTime() - Date.now() > 60_000
  if (fresh && row.access_token_encrypted) return decrypt(row.access_token_encrypted, env.tokenKey!)

  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(row.refresh_token_encrypted, env.tokenKey!) })
    await db
      .from('google_connections')
      .update({
        access_token_encrypted: encrypt(t.access_token, env.tokenKey!),
        access_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
    return t.access_token
  } catch (e) {
    if ((e as { googleError?: string }).googleError === 'invalid_grant') {
      await db.from('google_connections').update({ status: 'needs_reauth' }).eq('user_id', userId)
      throw new HttpError(409, 'needs_reauth', 'El acceso a Google Calendar ha caducado o se ha revocado')
    }
    throw e
  }
}

export async function googleGet<T>(userId: string, path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken(userId)
  const url = `${API}${path}${params ? `?${new URLSearchParams(params)}` : ''}`
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    await supabaseAdmin().from('google_connections').update({ access_token_expires_at: null }).eq('user_id', userId)
    throw new HttpError(409, 'needs_reauth', 'Google rechazó el acceso. Vuelve a conectar el calendario.')
  }
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

export async function revoke(userId: string) {
  const env = serverEnv()
  const db = supabaseAdmin()
  const { data } = await db.from('google_connections').select('refresh_token_encrypted').eq('user_id', userId).maybeSingle()
  if (data?.refresh_token_encrypted) {
    const token = decrypt(data.refresh_token_encrypted, env.tokenKey!)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})
  }
  await db.from('google_connections').delete().eq('user_id', userId)
}

// ── Normalización ────────────────────────────────────────────────
export type GCalendarListEntry = { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean; selected?: boolean }
export type GEvent = {
  id: string
  status?: string
  summary?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  location?: string
  hangoutLink?: string
  htmlLink?: string
}

export function normalizeEvent(e: GEvent, calendarId: string, color: string) {
  const allDay = Boolean(e.start.date)
  return {
    id: `${calendarId}:${e.id}`,
    calendarId,
    title: e.summary || '(Sin título)',
    start: (allDay ? e.start.date : e.start.dateTime)!,
    end: (allDay ? e.end.date : e.end.dateTime)!,
    allDay,
    location: e.location,
    meetUrl: e.hangoutLink,
    htmlLink: e.htmlLink,
    color,
  }
}

/** Calendarios del usuario con la marca `visible` según sus ajustes */
export async function listCalendars(userId: string) {
  const [{ items = [] }, { data: settings }] = await Promise.all([
    googleGet<{ items?: GCalendarListEntry[] }>(userId, '/users/me/calendarList', { minAccessRole: 'reader' }),
    supabaseAdmin().from('user_settings').select('visible_calendar_ids').eq('user_id', userId).maybeSingle(),
  ])
  const chosen: string[] | null = settings?.visible_calendar_ids ?? null
  return items.map((c) => ({
    id: c.id,
    summary: c.summaryOverride ?? c.summary,
    color: c.backgroundColor ?? '#8fb8e3',
    primary: Boolean(c.primary),
    // Sin elección propia se respeta la selección de Google Calendar
    visible: chosen ? chosen.includes(c.id) : Boolean(c.selected || c.primary),
  }))
}
