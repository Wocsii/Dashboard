import { buildSampleEvents, sampleCalendars } from '@/mocks/sample-data'
import { repo } from '@/data'
import type { CalendarEvent } from '@/types/domain'
import { expandDemoRecurrences } from './model'
const key = 'mi-espacio.calendar.events.v1'
function read(): CalendarEvent[] {
  const saved = localStorage.getItem(key)
  if (saved) { try { return JSON.parse(saved) as CalendarEvent[] } catch { /* Rebuild demo data. */ } }
  const events = buildSampleEvents().map((e) => ({ ...e, googleId: e.id, writable: e.calendarId !== 'cumples' }))
  write(events)
  return events
}
function write(events: CalendarEvent[]) { localStorage.setItem(key, JSON.stringify(events)) }
export async function demoCalendars() {
  const { visible_calendar_ids: visible } = await repo().getSettings()
  return sampleCalendars.map((c) => ({ ...c, writable: c.id !== 'cumples', timeZone: 'Europe/Madrid', visible: visible ? visible.includes(c.id) : c.visible }))
}
export async function demoEvents(min: Date, max: Date) {
  const calendars = (await demoCalendars()).filter((c) => c.visible)
  const deleted = JSON.parse(localStorage.getItem(`${key}.deleted`) ?? '[]') as string[]
  const events = Array.from(new Map(expandDemoRecurrences(read(), min, max).map((e) => [e.id, e])).values())
  return events.filter((e) => !deleted.includes(e.id) && calendars.some((c) => c.id === e.calendarId) && new Date(e.end) > min && new Date(e.start) < max)
}
