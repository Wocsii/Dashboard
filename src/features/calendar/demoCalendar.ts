import { buildSampleEvents, sampleCalendars } from '@/mocks/sample-data'
import { repo } from '@/data'
import type { CalendarEvent, CalendarEventInput } from '@/types/domain'
import { eventColors, expandDemoRecurrences } from './model'
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
export function saveDemoEvent(data: CalendarEventInput, previous?: CalendarEvent): CalendarEvent {
  const events = read()
  const calendar = sampleCalendars.find((c) => c.id === data.calendarId)
  if (!calendar || calendar.id === 'cumples') throw new Error('Este calendario es de solo lectura.')
  const id = previous?.id ?? crypto.randomUUID()
  const color = data.colorId === undefined ? previous?.color ?? calendar.color : eventColors.find((c) => c.id && c.id === data.colorId)?.color ?? calendar.color
  const event: CalendarEvent = { ...previous, ...data, id, googleId: id, color, writable: true, attendees: data.attendees?.map((email) => ({ email })) ?? previous?.attendees }
  const next = events.filter((e) => e.id !== id)
  next.push(event)
  write(next)
  return event
}
export function deleteDemoEvent(event: CalendarEvent) {
  if (event.recurringEventId) {
    // Keep an explicit cancelled occurrence so demo edits don't alter the series.
    const overrides = JSON.parse(localStorage.getItem(`${key}.deleted`) ?? '[]') as string[]
    localStorage.setItem(`${key}.deleted`, JSON.stringify([...overrides, event.id]))
  }
  write(read().filter((e) => e.id !== event.id))
}
