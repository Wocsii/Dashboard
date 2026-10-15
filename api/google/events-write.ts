import { randomUUID } from 'node:crypto'
import { parseEventInput, readWriteBody } from '../_lib/calendar-write.js'
import { googleGet, googleRequest, listCalendars, normalizeEvent, requireCalendarWrite, type GEvent } from '../_lib/google.js'
import { handle, HttpError, json, requireUser } from '../_lib/http.js'

async function writableCalendar(userId: string, calendarId: string) {
  await requireCalendarWrite(userId)
  const calendar = (await listCalendars(userId)).find((c) => c.id === calendarId)
  if (!calendar?.writable) throw new HttpError(403, 'forbidden', 'Este calendario es de solo lectura. Elige uno que puedas editar.')
  return calendar
}

async function save(req: Request, editing: boolean) {
  const user = await requireUser(req)
  const raw = await readWriteBody(req)
  const data = parseEventInput(raw.data)
  const calendar = await writableCalendar(user.id, data.calendarId)
  const eventId = editing ? String(raw.eventId ?? '') : ''
  if (editing && (!eventId || eventId.length > 1024)) throw new HttpError(400, 'bad_request', 'Falta el identificador del evento')
  const path = `/calendars/${encodeURIComponent(data.calendarId)}/events${editing ? `/${encodeURIComponent(eventId)}` : ''}`
  const previous = editing ? await googleGet<GEvent>(user.id, path) : undefined
  if (editing && typeof raw.etag === 'string' && raw.etag !== previous?.etag) throw new HttpError(409, 'conflict', 'El evento ha cambiado en Google. Actualiza el calendario antes de guardar.')
  // An expanded recurrence is edited as a single occurrence, never the whole series.
  if (previous?.recurringEventId && data.recurrence !== undefined) throw new HttpError(400, 'bad_request', 'Modifica la repetición de toda la serie desde Google Calendar.')
  const body: Record<string, unknown> = {
    summary: data.title, description: data.description, location: data.location,
    start: data.allDay ? { date: data.start, dateTime: null, timeZone: null } : { date: null, dateTime: data.start, timeZone: data.timeZone },
    end: data.allDay ? { date: data.end, dateTime: null, timeZone: null } : { date: null, dateTime: data.end, timeZone: data.timeZone },
  }
  if (data.attendees !== undefined) {
    body.attendees = [...new Set(data.attendees)].map((email) => previous?.attendees?.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? { email })
  }
  if (data.recurrence !== undefined) body.recurrence = data.recurrence
  if (data.colorId !== undefined) body.colorId = data.colorId || null
  if (data.category !== undefined) body.extendedProperties = { private: { ...previous?.extendedProperties?.private, dashboardCategory: data.category } }
  if (data.useDefaultReminder) body.reminders = { useDefault: true }
  else if (data.reminderMinutes !== undefined) body.reminders = { useDefault: false, overrides: data.reminderMinutes === null ? [] : [{ method: 'popup', minutes: data.reminderMinutes }] }
  if (data.createMeet && !previous?.hangoutLink) body.conferenceData = { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
  const event = await googleRequest<GEvent>(user.id, path, {
    sendUpdates: data.notifyGuests ? 'all' : 'none',
    ...(data.createMeet ? { conferenceDataVersion: '1' } : {}),
  }, { method: editing ? 'PATCH' : 'POST', headers: previous?.etag ? { 'if-match': previous.etag } : {}, body: JSON.stringify(body) })
  return json({ event: { ...normalizeEvent(event, calendar.id, calendar.color), writable: true } }, editing ? 200 : 201)
}

export const POST = handle((req) => save(req, false))
export const PATCH = handle((req) => save(req, true))
export const DELETE = handle(async (req) => {
  const user = await requireUser(req)
  const raw = await readWriteBody(req)
  const calendarId = typeof raw.calendarId === 'string' ? raw.calendarId : ''
  const eventId = typeof raw.eventId === 'string' ? raw.eventId : ''
  if (!calendarId || !eventId || calendarId.length > 1024 || eventId.length > 1024) throw new HttpError(400, 'bad_request', 'Evento no válido')
  await writableCalendar(user.id, calendarId)
  await googleRequest(user.id, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { sendUpdates: raw.notifyGuests === true ? 'all' : 'none' }, { method: 'DELETE', headers: typeof raw.etag === 'string' ? { 'if-match': raw.etag } : {} })
  return json({ deleted: true })
})
