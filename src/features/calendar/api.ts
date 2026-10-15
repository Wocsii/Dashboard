import { isDemo, isEmbedded } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { buildSampleEvents, sampleCalendars } from '@/mocks/sample-data'
import type { CalendarEvent, CalendarInfo, CalendarStatus } from '@/types/domain'

export class CalendarApiError extends Error {
  constructor(
    message: string,
    public code: 'not_configured' | 'not_connected' | 'needs_reauth' | 'unauthorized' | 'network' | 'unknown',
  ) {
    super(message)
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token ?? ''}` } })
  } catch {
    throw new CalendarApiError('No hay conexión con el servidor', 'network')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new CalendarApiError(body.message ?? `Error ${res.status}`, body.code ?? 'unknown')
  return body as T
}

export const calendarApi = {
  async status(): Promise<CalendarStatus> {
    if (isDemo) return { state: 'connected', email: 'demo@local' }
    return call('/api/google/status')
  },
  async calendars(): Promise<CalendarInfo[]> {
    if (isDemo) return sampleCalendars
    return (await call<{ calendars: CalendarInfo[] }>('/api/google/calendars')).calendars
  },
  async events(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    if (isDemo) return buildSampleEvents().filter((e) => new Date(e.end) >= timeMin && new Date(e.start) <= timeMax)
    const q = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
    return (await call<{ events: CalendarEvent[] }>(`/api/google/events?${q}`)).events
  },
  /** Abre el consentimiento de Google (en pestaña nueva si estamos dentro de la extensión) */
  async connect() {
    if (isDemo) return
    const { url } = await call<{ url: string }>('/api/google/auth-url')
    if (isEmbedded) window.open(url, '_blank', 'noopener')
    else window.location.assign(url)
  },
  async disconnect() {
    if (isDemo) return
    await call('/api/google/disconnect', { method: 'POST' })
  },
}
