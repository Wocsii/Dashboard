// @vitest-environment node
import ICAL from 'ical.js'
import type { DAVCalendar } from 'tsdav'
import { describe, expect, it } from 'vitest'
import { appleCalendarInfo, normalizeAppleObject, writeAppleObject } from './apple-ical'
import { appleCalendarId, appleWritable, ownedAppleObject, trustedAppleUrl } from './apple-transport'
import type { CalendarEventInput } from '../../src/types/domain'

const calendar: DAVCalendar = { url:'https://p01-caldav.icloud.com/123/calendars/personal/',displayName:'Mi iCloud', calendarColor:'#bfe6c6FF',projectedProps:{ currentUserPrivilegeSet:{ privilege:[{ read:{} },{ write:{} }] } } }
const info = appleCalendarInfo(calendar,null)
const objectUrl = `${calendar.url}event.ics`
const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//ES\r\n${body}\r\nEND:VCALENDAR\r\n`
const event = (body = '') => `BEGIN:VEVENT\r\nUID:event-one\r\nDTSTART:20261015T080000Z\r\nDTEND:20261015T090000Z\r\nSUMMARY:Mi evento\r\n${body}\r\nEND:VEVENT`
const data: CalendarEventInput = { calendarId:info.id,title:'Nuevo plan',description:'Mis notas',location:'Biblioteca',start:'2026-10-15T10:00:00Z',end:'2026-10-15T11:00:00Z',allDay:false,timeZone:'UTC',attendees:[],category:'Personal' }

describe('iCloud calendar objects', () => {
  it.each([
    ['20261016', '2026-10-16T11:00:00.000Z', '2026-10-16T12:00:00.000Z'],
    ['20261216', '2026-12-16T12:00:00.000Z', '2026-12-16T13:00:00.000Z'],
  ])('reads a Madrid 13–14 event without VTIMEZONE on %s', (day, start, end) => {
    const normalized = normalizeAppleObject({ url:objectUrl, data:ics(`BEGIN:VEVENT\r\nUID:local\r\nDTSTART;TZID=Europe/Madrid:${day}T130000\r\nDTEND;TZID=Europe/Madrid:${day}T140000\r\nEND:VEVENT`) }, { ...info,timeZone:'America/New_York' })[0]
    expect(normalized).toMatchObject({ start, end, timeZone:'Europe/Madrid' })
    expect(new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit' }).format(new Date(normalized.start))).toBe('13:00')
  })
  it('keeps UTC events unchanged and uses the calendar zone for truly floating events', () => {
    const utc = normalizeAppleObject({ url:objectUrl,data:ics(event()) }, { ...info,timeZone:'Europe/Madrid' })[0]
    expect(utc).toMatchObject({ start:'2026-10-15T08:00:00.000Z',timeZone:'UTC' })
    const floating = normalizeAppleObject({ url:objectUrl,data:ics(event().replaceAll('Z\r\n','\r\n')) }, { ...info,timeZone:'Europe/Madrid' })[0]
    expect(floating.start).toBe('2026-10-15T06:00:00.000Z')
  })
  it('normalizes names, permissions, all-day dates and provider identifiers', () => {
    expect(appleWritable(calendar)).toBe(true)
    expect(appleWritable({ ...calendar,projectedProps:{ currentUserPrivilegeSet:{ privilege:{ read:{} } } } })).toBe(false)
    expect(info.color).toBe('#bfe6c6')
    expect(info.id).toBe(appleCalendarId(calendar))
    const object = { url:objectUrl,etag:'"v1"',data:ics('BEGIN:VEVENT\r\nUID:birthday\r\nDTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261017\r\nSUMMARY:Dos días\r\nEND:VEVENT') }
    const normalized = normalizeAppleObject(object,info)[0]
    expect(normalized).toMatchObject({ provider:'apple',allDay:true,start:'2026-10-15',end:'2026-10-17',appleObjectUrl:objectUrl,etag:'"v1"' })
  })
  it('serializes text safely and preserves unrelated event properties on update', () => {
    const previous = { url:objectUrl,etag:'old',data:ics(event('X-KEEP-ME:preserved\r\nATTENDEE;PARTSTAT=ACCEPTED:mailto:friend@example.com')) }
    const next = writeAppleObject(calendar,{ ...data,title:'Texto\nATTENDEE:mailto:injection@example.com' },previous,'event-one')
    const root = ICAL.Component.fromString(next.ics)
    expect(root.getAllSubcomponents('vevent')).toHaveLength(1)
    const child = root.getFirstSubcomponent('vevent')!
    expect(child.getFirstPropertyValue('x-keep-me')).toBe('preserved')
    expect(child.getAllProperties('attendee')).toHaveLength(1)
    expect(child.getFirstPropertyValue('summary')).toContain('\nATTENDEE:')
  })
  it('creates a repeating local event with the calendar timezone and preserves its wall time through DST', () => {
    const timezone = 'BEGIN:VTIMEZONE\r\nTZID:Europe/Madrid\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700329T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nDTSTART:19701025T030000\r\nRRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nEND:STANDARD\r\nEND:VTIMEZONE'
    const next = writeAppleObject({ ...calendar,timezone },{ ...data,start:'2026-10-20T07:00:00Z',end:'2026-10-20T08:00:00Z',timeZone:'Europe/Madrid',recurrence:['RRULE:FREQ=WEEKLY'] })
    const root = ICAL.Component.fromString(next.ics)
    expect(root.getFirstSubcomponent('vtimezone')).toBeTruthy()
    const recurring = new ICAL.Event(root.getFirstSubcomponent('vevent')!)
    const iterator = recurring.iterator()
    const first = iterator.next()!, second = iterator.next()!
    expect(first.hour).toBe(9)
    expect(second.hour).toBe(9)
    expect(first.toJSDate().toISOString()).toBe('2026-10-20T07:00:00.000Z')
    expect(second.toJSDate().toISOString()).toBe('2026-10-27T08:00:00.000Z')
  })
  it('edits and cancels one recurring occurrence without deleting its master', () => {
    const previous = { url:objectUrl,etag:'v1',data:ics(event('RRULE:FREQ=WEEKLY\r\nX-KEEP:yes')) }
    const rid = 'RECURRENCE-ID:20261022T080000Z'
    const edited = writeAppleObject(calendar,{ ...data,start:'2026-10-22T10:00:00Z',end:'2026-10-22T11:00:00Z' },previous,'event-one',rid)
    const root = ICAL.Component.fromString(edited.ics)
    const children = root.getAllSubcomponents('vevent')
    expect(children).toHaveLength(2)
    expect(children[0].hasProperty('rrule')).toBe(true)
    expect(children[1].hasProperty('rrule')).toBe(false)
    expect(children[1].getFirstProperty('recurrence-id')?.toICALString()).toBe(rid)
    const cancelled = writeAppleObject(calendar,null,{ ...previous,data:edited.ics },'event-one',rid,true)
    const updated = ICAL.Component.fromString(cancelled.ics).getAllSubcomponents('vevent')
    expect(updated).toHaveLength(2)
    expect(updated[0].hasProperty('rrule')).toBe(true)
    expect(updated[1].getFirstPropertyValue('status')).toBe('CANCELLED')
  })
  it('normalizes server-expanded occurrences individually', () => {
    const expanded = ics(event('RECURRENCE-ID:20261015T080000Z')+'\r\n'+event('RECURRENCE-ID:20261022T080000Z').replace(/DTSTART:20261015/g,'DTSTART:20261022').replace(/DTEND:20261015/g,'DTEND:20261022'))
    const events = normalizeAppleObject({ url:objectUrl,etag:'v1',data:expanded },info)
    expect(events).toHaveLength(2)
    expect(events[0].id).not.toBe(events[1].id)
    expect(events.every((e) => e.recurringEventId === 'event-one')).toBe(true)
  })
  it('does not accept external hosts, credentials, redirects or another calendar resource', () => {
    for (const url of ['http://caldav.icloud.com/a','https://caldav.icloud.com.evil.test/a','https://evil.test/a','https://me:pass@caldav.icloud.com/a','https://caldav.icloud.com:444/a']) expect(() => trustedAppleUrl(url)).toThrow()
    expect(() => trustedAppleUrl(objectUrl)).not.toThrow()
    expect(() => ownedAppleObject(calendar,'https://p01-caldav.icloud.com/other/event.ics')).toThrow()
    expect(() => ownedAppleObject(calendar,`${calendar.url}nested%2fobject.ics`)).toThrow()
    expect(ownedAppleObject(calendar,objectUrl)).toBe(objectUrl)
  })
})
