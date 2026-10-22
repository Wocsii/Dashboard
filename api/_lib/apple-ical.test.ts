// @vitest-environment node
import type { DAVCalendar } from 'tsdav'
import { describe, expect, it } from 'vitest'
import { appleCalendarInfo, normalizeAppleObject } from './apple-ical'
import { appleCalendarId, appleWritable, trustedAppleUrl } from './apple-transport'

const calendar: DAVCalendar = { url:'https://p01-caldav.icloud.com/123/calendars/personal/',displayName:'Mi iCloud', calendarColor:'#bfe6c6FF',projectedProps:{ currentUserPrivilegeSet:{ privilege:[{ read:{} },{ write:{} }] } } }
const info = appleCalendarInfo(calendar,null)
const objectUrl = `${calendar.url}event.ics`
const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//ES\r\n${body}\r\nEND:VCALENDAR\r\n`
const event = (body = '') => `BEGIN:VEVENT\r\nUID:event-one\r\nDTSTART:20261015T080000Z\r\nDTEND:20261015T090000Z\r\nSUMMARY:Mi evento\r\n${body}\r\nEND:VEVENT`

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
  })
})
