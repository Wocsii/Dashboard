import { isDemo, isEmbedded } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { demoCalendars, demoEvents, saveDemoEvent, deleteDemoEvent } from './demoCalendar'
import type { CalendarEvent, CalendarEventInput, CalendarInfo, CalendarStatus } from '@/types/domain'

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
  async status(): Promise<CalendarStatus> {
    if (isDemo) return { state: 'connected', email: 'demo@local', canWrite: true }
    return call('/api/google/status')
  },
  async calendars(): Promise<CalendarInfo[]> {
    if (isDemo) return demoCalendars()
    return (await call<{ calendars: CalendarInfo[] }>('/api/google/calendars')).calendars
  },
  async events(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    if (isDemo) return demoEvents(timeMin, timeMax)
    const q = new URLSearchParams({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
    return (await call<{ events: CalendarEvent[] }>(`/api/google/events?${q}`)).events
  },
  async saveEvent(data: CalendarEventInput, event?: CalendarEvent): Promise<CalendarEvent> {
    if (isDemo) return saveDemoEvent(data, event)
    return (await call<{ event: CalendarEvent }>('/api/google/events-write', { method: event ? 'PATCH' : 'POST', body: JSON.stringify({ data, eventId: event?.googleId, etag: event?.etag }) })).event
  },
  async deleteEvent(event: CalendarEvent, notifyGuests = false): Promise<void> {
    if (isDemo) return deleteDemoEvent(event)
    await call('/api/google/events-write', { method: 'DELETE', body: JSON.stringify({ calendarId: event.calendarId, eventId: event.googleId, etag: event.etag, notifyGuests }) })
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
