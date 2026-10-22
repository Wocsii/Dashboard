import ICAL from 'ical.js'
import type { DAVCalendar, DAVCalendarObject } from 'tsdav'
import type { CalendarEvent, CalendarInfo } from '../../src/types/domain.js'
import { HttpError } from './http.js'
import { appleCalendarId, appleWritable } from './apple-transport.js'

const value = (component: ICAL.Component, name: string) => String(component.getFirstPropertyValue(name) ?? '')
export function appleTimeZone(calendar: DAVCalendar) {
  if (!calendar.timezone) return undefined
  try {
    const component = ICAL.Component.fromString(calendar.timezone)
    const tzid = value(component.name === 'vtimezone' ? component : component.getFirstSubcomponent('vtimezone')!, 'tzid')
    new Intl.DateTimeFormat('en', { timeZone:tzid }).format()
    return tzid
  } catch { return undefined }
}
export function appleCalendarInfo(calendar: DAVCalendar, visibleIds: string[] | null, index = 0): CalendarInfo {
  const id = appleCalendarId(calendar)
  return { id, provider:'apple', summary: typeof calendar.displayName === 'string' ? calendar.displayName : 'Calendario de iCloud', color: /^#[a-f\d]{6}/i.exec(calendar.calendarColor ?? '')?.[0] ?? '#aecdee', primary:index === 0, visible: visibleIds ? visibleIds.includes(id) : true, writable:appleWritable(calendar), timeZone:appleTimeZone(calendar) }
}
function parse(data: unknown) {
  if (typeof data !== 'string' || data.length > 2_000_000) throw new HttpError(502,'unknown','El evento de Apple no tiene un formato compatible')
  try { const root = ICAL.Component.fromString(data); if (root.name !== 'vcalendar') throw new Error(); return root } catch { throw new HttpError(502,'unknown','No se pudo interpretar un evento de Apple Calendar') }
}
function wallTime(iso: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA',{ timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(new Date(iso))
  const get = (name: string) => parts.find((p) => p.type === name)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}
function eventTimeZone(time: ICAL.Time, calendar: CalendarInfo, property?: ICAL.Property | null): string {
  if (time.zone === ICAL.Timezone.utcTimezone) return 'UTC'
  // ical.js treats a TZID without an embedded VTIMEZONE as floating.
  // Read the original parameter before falling back to the collection zone.
  return property?.getFirstParameter('tzid') || (time.zone.tzid !== 'floating' ? time.zone.tzid : calendar.timeZone ?? 'UTC')
}
function timeISO(time: ICAL.Time, calendar: CalendarInfo, property?: ICAL.Property | null) {
  if (time.isDate) return time.toString()
  if (time.zone === ICAL.Timezone.utcTimezone || time.zone.component) return time.toJSDate().toISOString()
  const zone = eventTimeZone(time, calendar, property)
  const target = Date.parse(`${time.toString().replace(/Z$/,'')}Z`)
  let guess = target
  for (let i = 0; i < 4; i++) {
    const delta = target - Date.parse(`${wallTime(new Date(guess).toISOString(),zone)}Z`)
    if (!delta) return new Date(guess).toISOString()
    guess += delta
  }
  throw new HttpError(502,'unknown','No se pudo interpretar la zona horaria de un evento de Apple')
}
const colors: Record<string,string> = { '1':'#a4bdfc','2':'#7ae7bf','3':'#dbadff','4':'#ff887c','5':'#fbd75b','6':'#ffb878','7':'#46d6db' }
export function normalizeAppleObject(object: DAVCalendarObject, calendar: CalendarInfo): CalendarEvent[] {
  const root = parse(object.data)
  return root.getAllSubcomponents('vevent').filter((c) => value(c,'status') !== 'CANCELLED').map((component) => {
    const event = new ICAL.Event(component)
    const recurrence = component.getFirstProperty('recurrence-id')
    const recurrenceId = recurrence?.toICALString()
    const colorId = value(component,'x-dashboard-color-id')
    const alarms = component.getAllSubcomponents('valarm')
    const trigger = alarms.find((a) => value(a,'action') === 'DISPLAY')?.getFirstPropertyValue('trigger')
    const minutes = trigger instanceof ICAL.Duration ? Math.max(0,-trigger.toSeconds()/60) : null
    return {
      id:`apple:${Buffer.from(object.url).toString('base64url')}:${event.uid}:${recurrenceId ?? ''}`,
      provider:'apple', calendarId:calendar.id, appleObjectUrl:object.url, appleUid:event.uid, appleRecurrenceId:recurrenceId,
      title:event.summary || '(Sin título)', start:timeISO(event.startDate,calendar,component.getFirstProperty('dtstart')), end:timeISO(event.endDate,calendar,component.getFirstProperty('dtend') ?? component.getFirstProperty('dtstart')), allDay:event.startDate.isDate,
      description:event.description ?? '', location:event.location ?? '', color:colors[colorId] ?? calendar.color, colorId,
      category:value(component,'x-dashboard-category'), etag:object.etag, writable:calendar.writable,
      recurringEventId:recurrenceId || event.isRecurring() ? event.uid : undefined,
      recurrence:event.isRecurring() ? component.getAllProperties('rrule').map((p) => p.toICALString()) : undefined,
      timeZone:eventTimeZone(event.startDate,calendar,component.getFirstProperty('dtstart')), reminderMinutes:minutes,
      attendees:component.getAllProperties('attendee').map((p) => ({ email:String(p.getFirstValue() ?? '').replace(/^mailto:/i,''), displayName:p.getFirstParameter('cn') || undefined, responseStatus:p.getFirstParameter('partstat')?.toLowerCase() })),
    }
  })
}
