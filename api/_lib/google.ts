import { decrypt, encrypt } from './crypto.js'
import { serverEnv } from './env.js'
import { HttpError, supabaseAdmin } from './http.js'
import { CalendarCache } from './calendar-cache.js'

export const GOOGLE_WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
/** Lista de calendarios y lectura/escritura de eventos; no modifica permisos de calendarios. */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  GOOGLE_WRITE_SCOPE,
]

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'

export function buildAuthUrl(state: string, loginHint?: string | null, tasks = false): string {
  const env = serverEnv()
  const p = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: env.googleRedirectUri!,
    response_type: 'code',
    scope: (tasks ? [...GOOGLE_SCOPES, 'https://www.googleapis.com/auth/tasks'] : GOOGLE_SCOPES).join(' '),
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
    const err = new Error(`Google token request failed (${res.status})`) as Error & { googleError?: string }
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

export async function saveConnection(userId: string, t: TokenResponse, tasks = false, tasksReadOnly = false) {
  const env = serverEnv()
  const db = supabaseAdmin()
  const { data: existing } = await db.from('google_connections').select('refresh_token_encrypted, scopes').eq('user_id', userId).maybeSingle()
  const refresh = t.refresh_token ? encrypt(t.refresh_token, env.tokenKey!) : existing?.refresh_token_encrypted
  if (!refresh) throw new HttpError(400, 'bad_request', 'Google no devolvió un refresh token. Vuelve a intentarlo.')
  const { error } = await db.from('google_connections').upsert({
    user_id: userId,
    google_email: emailFromIdToken(t.id_token),
    refresh_token_encrypted: refresh,
    access_token_encrypted: encrypt(t.access_token, env.tokenKey!),
    access_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    scopes: [...t.scope.split(' '), ...(tasks || existing?.scopes?.includes('dashboard:tasks:enabled') ? ['dashboard:tasks:enabled'] : []), ...((tasks ? tasksReadOnly : existing?.scopes?.includes('dashboard:tasks:readonly')) ? ['dashboard:tasks:readonly'] : [])],
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

export async function googleRequest<T>(userId: string, path: string, params?: Record<string, string>, init?: RequestInit): Promise<T> {
  const token = await getAccessToken(userId)
  const url = `${API}${path}${params ? `?${new URLSearchParams(params)}` : ''}`
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers } })
  if (res.status === 401) {
    await supabaseAdmin().from('google_connections').update({ access_token_expires_at: null }).eq('user_id', userId)
    throw new HttpError(409, 'needs_reauth', 'Google rechazó el acceso. Vuelve a conectar el calendario.')
  }
  if (res.status === 400) throw new HttpError(400, 'bad_request', 'Google no aceptó los datos del evento. Revisa las fechas, los invitados o la videollamada.')
  if (res.status === 429) throw new HttpError(429, 'unknown', 'Google necesita una pausa. Espera un momento y vuelve a intentarlo.')
  if (res.status === 403) throw new HttpError(403, 'forbidden', 'Google no permite acceder a este calendario o modificar este evento. Comprueba sus permisos.')
  if (res.status === 404 || res.status === 410) throw new HttpError(409, 'conflict', 'Este evento ya no está disponible. Actualiza el calendario.')
  if (res.status === 412) throw new HttpError(409, 'conflict', 'El evento ha cambiado en Google. Actualiza el calendario antes de guardar.')
  if (!res.ok) throw new Error(`Google Calendar request failed (${res.status})`)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const googleGet = <T>(userId: string, path: string, params?: Record<string, string>) => googleRequest<T>(userId, path, params)

export async function requireCalendarWrite(userId: string) {
  const { data, error } = await supabaseAdmin().from('google_connections').select('scopes').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('No se pudieron comprobar los permisos de Google')
  if (!data) throw new HttpError(409, 'not_connected', 'Google Calendar no está conectado')
  if (!data.scopes?.includes(GOOGLE_WRITE_SCOPE) && !data.scopes?.includes('https://www.googleapis.com/auth/calendar')) {
    throw new HttpError(403, 'needs_permission', 'Vuelve a conectar Google Calendar para autorizar la creación y edición de eventos.')
  }
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
export type GCalendarListEntry = { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean; selected?: boolean; accessRole?: string; timeZone?: string }
export type GEvent = {
  id: string
  status?: string
  summary?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  location?: string
  hangoutLink?: string
  htmlLink?: string
  etag?: string
  description?: string
  attendees?: { email: string; displayName?: string; responseStatus?: string; organizer?: boolean; self?: boolean }[]
  recurrence?: string[]
  recurringEventId?: string
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] }
  colorId?: string
  extendedProperties?: { private?: Record<string, string> }
}

const EVENT_COLORS: Record<string, string> = { '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c', '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed', '10': '#51b749', '11': '#dc2127' }

export function normalizeEvent(e: GEvent, calendarId: string, color: string) {
  const allDay = Boolean(e.start.date)
  return {
    id: `${calendarId}:${e.id}`,
    googleId: e.id,
    calendarId,
    title: e.summary || '(Sin título)',
    start: (allDay ? e.start.date : e.start.dateTime)!,
    end: (allDay ? e.end.date : e.end.dateTime)!,
    allDay,
    location: e.location,
    meetUrl: e.hangoutLink,
    htmlLink: e.htmlLink,
    color: (e.colorId && EVENT_COLORS[e.colorId]) || color,
    description: e.description,
    attendees: e.attendees,
    recurrence: e.recurrence,
    recurringEventId: e.recurringEventId,
    reminderMinutes: (!e.reminders || e.reminders.useDefault) ? undefined : e.reminders?.overrides?.[0]?.minutes ?? null,
    timeZone: e.start.timeZone,
    colorId: e.colorId,
    category: e.extendedProperties?.private?.dashboardCategory,
    etag: e.etag,
  }
}

/** Calendarios del usuario con la marca `visible` según sus ajustes */
export async function listCalendars(userId: string) {
  const [items, { data: settings }] = await Promise.all([
    allCalendars(userId),
    supabaseAdmin().from('user_settings').select('visible_calendar_ids').eq('user_id', userId).maybeSingle(),
  ])
  const chosen: string[] | null = settings?.visible_calendar_ids ?? null
  return items.map((c) => ({
    id: c.id,
    summary: c.summaryOverride ?? c.summary,
    color: c.backgroundColor ?? '#8fb8e3',
    primary: Boolean(c.primary),
    writable: c.accessRole === 'owner' || c.accessRole === 'writer',
    timeZone: c.timeZone,
    // Sin elección propia se respeta la selección de Google Calendar
    visible: chosen ? chosen.includes(c.id) : Boolean(c.selected || c.primary),
  }))
}

const calendarLists = new CalendarCache<GCalendarListEntry[]>(60_000)
async function allCalendars(userId: string) {
  // Check the connection even on cache hits; disconnect/reconnect must take effect.
  const token = await getAccessToken(userId)
  return calendarLists.get(JSON.stringify([userId, token]), () => loadCalendars(userId))
}

async function loadCalendars(userId: string) {
  const result: GCalendarListEntry[] = []
  let pageToken: string | undefined
  do {
    const page = await googleGet<{ items?: GCalendarListEntry[]; nextPageToken?: string }>(userId, '/users/me/calendarList', { minAccessRole: 'reader', maxResults: '250', ...(pageToken ? { pageToken } : {}) })
    result.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return result
}
