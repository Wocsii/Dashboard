import ICAL from 'ical.js'
import { randomUUID } from 'node:crypto'
import type { DAVCalendar, DAVCalendarObject } from 'tsdav'
import type { CalendarEvent, CalendarEventInput, CalendarInfo } from '../../src/types/domain.js'
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
function timeISO(time: ICAL.Time, calendar: CalendarInfo) {
  if (time.isDate) return time.toString()
  if (time.zone === ICAL.Timezone.utcTimezone || time.zone.component) return time.toJSDate().toISOString()
  const zone = calendar.timeZone ?? 'UTC'
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
      title:event.summary || '(Sin título)', start:timeISO(event.startDate,calendar), end:timeISO(event.endDate,calendar), allDay:event.startDate.isDate,
      description:event.description ?? '', location:event.location ?? '', color:colors[colorId] ?? calendar.color, colorId,
      category:value(component,'x-dashboard-category'), etag:object.etag, writable:calendar.writable,
      recurringEventId:recurrenceId || event.isRecurring() ? event.uid : undefined,
      recurrence:event.isRecurring() ? component.getAllProperties('rrule').map((p) => p.toICALString()) : undefined,
      timeZone:calendar.timeZone ?? (event.startDate.zone.tzid === 'floating' ? 'UTC' : event.startDate.zone.tzid), reminderMinutes:minutes,
      attendees:component.getAllProperties('attendee').map((p) => ({ email:String(p.getFirstValue() ?? '').replace(/^mailto:/i,''), displayName:p.getFirstParameter('cn') || undefined, responseStatus:p.getFirstParameter('partstat')?.toLowerCase() })),
    }
  })
}
function setTime(component: ICAL.Component, name: string, time: ICAL.Time) {
  component.removeAllProperties(name)
  const property = component.addPropertyWithValue(name,time)
  if (!time.isDate && time.zone !== ICAL.Timezone.utcTimezone && time.zone.tzid !== 'floating') property.setParameter('tzid',time.zone.tzid)
}
function collectionTimeZone(root: ICAL.Component, calendar: DAVCalendar, zone: string) {
  if (zone === 'UTC' || zone === 'Etc/UTC') return ICAL.Timezone.utcTimezone
  if (!root.getTimeZoneByID(zone) && calendar.timezone) {
    const original = ICAL.Component.fromString(calendar.timezone)
    const component = original.name === 'vtimezone' ? original : original.getFirstSubcomponent('vtimezone')
    if (component && value(component,'tzid') === zone) root.addSubcomponent(new ICAL.Component(structuredClone(component.toJSON())))
  }
  const result = root.getTimeZoneByID(zone)
  if (!result) throw new HttpError(400,'bad_request','Para crear esta repetición, usa la zona horaria del calendario de iCloud o créala desde Apple Calendar.')
  return result
}
function exception(root: ICAL.Component, uid: string, recurrenceId?: string) {
  const components = root.getAllSubcomponents('vevent').filter((c) => value(c,'uid') === uid)
  const master = components.find((c) => !c.hasProperty('recurrence-id'))
  if (!master) throw new HttpError(409,'conflict','El evento original ya no está disponible en iCloud')
  if (!recurrenceId) {
    if (new ICAL.Event(master).isRecurring()) throw new HttpError(400,'bad_request','Abre una aparición concreta de la serie para editarla')
    return master
  }
  let property: ICAL.Property
  try { property = ICAL.Property.fromString(recurrenceId); property.parent = master } catch { throw new HttpError(400,'bad_request','Aparición de evento no válida') }
  const rid = property.getFirstValue()
  if (property.name !== 'recurrence-id' || !(rid instanceof ICAL.Time)) throw new HttpError(400,'bad_request','Aparición de evento no válida')
  const masterEvent = new ICAL.Event(master)
  const existing = components.find((c) => {
    const candidate = c.getFirstPropertyValue('recurrence-id')
    return candidate instanceof ICAL.Time && candidate.compare(rid) === 0
  })
  if (existing) return existing
  const component = new ICAL.Component(structuredClone(master.toJSON()))
  for (const name of ['rrule','rdate','exdate','recurrence-id']) component.removeAllProperties(name)
  const canonical = rid.convertToZone(masterEvent.startDate.zone)
  setTime(component,'recurrence-id',canonical)
  setTime(component,'dtstart',canonical.clone())
  const end = canonical.clone(); end.addDuration(masterEvent.duration)
  setTime(component,'dtend',end)
  root.addSubcomponent(component)
  return component
}
export function writeAppleObject(calendar: DAVCalendar, data: CalendarEventInput | null, previous?: DAVCalendarObject, uid?: string, recurrenceId?: string, deleting = false): { ics:string; uid:string } {
  const root = previous ? parse(previous.data) : new ICAL.Component('vcalendar')
  if (!previous) { root.updatePropertyWithValue('version','2.0'); root.updatePropertyWithValue('prodid','-//Mi espacio//Calendario//ES') }
  const eventUid = uid ?? randomUUID()
  const component = previous ? exception(root,eventUid,recurrenceId) : new ICAL.Component('vevent')
  if (!previous) { root.addSubcomponent(component); component.updatePropertyWithValue('uid',eventUid) }
  if (deleting) component.updatePropertyWithValue('status','CANCELLED')
  else if (data) {
    if (data.createMeet) throw new HttpError(400,'bad_request','Google Meet solo está disponible para los calendarios de Google')
    if (data.attendees?.length) throw new HttpError(400,'bad_request','Gestiona las invitaciones de este evento desde Apple Calendar')
    component.updatePropertyWithValue('summary',data.title)
    component.updatePropertyWithValue('description',data.description)
    component.updatePropertyWithValue('location',data.location)
    component.removeAllProperties('duration')
    let start = data.allDay ? ICAL.Time.fromDateString(data.start) : ICAL.Time.fromJSDate(new Date(data.start),true)
    let end = data.allDay ? ICAL.Time.fromDateString(data.end) : ICAL.Time.fromJSDate(new Date(data.end),true)
    // Keep a recurring series in its local zone, so its wall time survives DST changes.
    if (!data.allDay && !previous && data.recurrence?.length) {
      const zone = collectionTimeZone(root,calendar,data.timeZone)
      start = start.convertToZone(zone); end = end.convertToZone(zone)
    }
    setTime(component,'dtstart',start); setTime(component,'dtend',end)
    if (data.recurrence !== undefined && !previous) { component.removeAllProperties('rrule'); for (const rule of data.recurrence) component.addProperty(ICAL.Property.fromString(rule)) }
    if (data.category !== undefined) component.updatePropertyWithValue('x-dashboard-category',data.category)
    if (data.colorId !== undefined) component.updatePropertyWithValue('x-dashboard-color-id',data.colorId)
    if (data.reminderMinutes !== undefined || data.useDefaultReminder) {
      component.removeAllSubcomponents('valarm')
      if (data.reminderMinutes !== null && data.reminderMinutes !== undefined) {
        const alarm = new ICAL.Component('valarm')
        alarm.updatePropertyWithValue('action','DISPLAY'); alarm.updatePropertyWithValue('description',data.title)
        alarm.updatePropertyWithValue('trigger',ICAL.Duration.fromSeconds(-data.reminderMinutes * 60)); component.addSubcomponent(alarm)
      }
    }
  }
  component.updatePropertyWithValue('sequence',Number(component.getFirstPropertyValue('sequence') ?? 0)+1)
  component.updatePropertyWithValue('dtstamp',ICAL.Time.fromJSDate(new Date(),true))
  component.updatePropertyWithValue('last-modified',ICAL.Time.fromJSDate(new Date(),true))
  return { ics:root.toString(), uid:eventUid }
}
