import { isDemo, isEmbedded } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { demoCalendars, demoEvents } from './demoCalendar'
import type { CalendarEvent, CalendarInfo, CalendarProvider, CalendarStatus } from '@/types/domain'

export class CalendarApiError extends Error {
  constructor(
    message: string,
    public code: 'not_configured' | 'not_connected' | 'needs_reauth' | 'unauthorized' | 'network' | 'unknown' | 'needs_permission' | 'forbidden' | 'conflict',
  ) {
    super(message)
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers, Authorization: `Bearer ${token ?? ''}` } })
  } catch {
    throw new CalendarApiError('No hay conexión con el servidor', 'network')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new CalendarApiError(body.message ?? `Error ${res.status}`, body.code ?? 'unknown')
  return body as T
}

export const calendarApi = {
  async status(provider: CalendarProvider = 'google', signal?: AbortSignal): Promise<CalendarStatus> {
    if (isDemo) return provider === 'apple' ? { state:'disconnected' } : { state: 'connected', email: 'demo@local', canWrite: true }
    return call(`/api/${provider}/status`, { signal })
  },
  async calendars(provider: CalendarProvider = 'google'): Promise<CalendarInfo[]> {
    if (isDemo) return provider === 'apple' ? [] : demoCalendars()
    return (await call<{ calendars: CalendarInfo[] }>(`/api/${provider}/calendars`)).calendars
  },
  async events(timeMin: Date, timeMax: Date, provider: CalendarProvider = 'google', signal?: AbortSignal): Promise<CalendarEvent[]> {
    if (isDemo) return provider === 'apple' ? [] : demoEvents(timeMin, timeMax)
    const q = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
    return (await call<{ events: CalendarEvent[] }>(`/api/${provider}/events?${q}`, { signal })).events
  },
  /** Abre el consentimiento de Google (en pestaña nueva si estamos dentro de la extensión) */
  async connect() {
    if (isDemo) return
    const { url } = await call<{ url: string }>('/api/google/auth-url')
    if (isEmbedded) window.open(url, '_blank', 'noopener')
    else window.location.assign(url)
  },
  async connectApple(email: string, password: string): Promise<CalendarStatus> {
    if (isDemo) throw new CalendarApiError('Conecta tu sesión del dashboard para vincular una cuenta real de iCloud. La demo no guarda contraseñas.', 'not_configured')
    return call('/api/apple/connection', { method:'POST',body:JSON.stringify({ email,password }) })
  },
  async disconnect(provider: CalendarProvider = 'google') {
    if (isDemo) return
    await call(provider === 'apple' ? '/api/apple/connection' : '/api/google/disconnect', { method:provider === 'apple' ? 'DELETE' : 'POST' })
  },
}
